import requests
import urllib.parse
from bs4 import BeautifulSoup
import config       # config.py (설정값)
from database import get_db_connection  # database.py (DB 연결)
from tmdbv3api import TMDb, Movie

# --- TMDb API 설정 ---
tmdb = TMDb()
tmdb.api_key = config.TMDB_API_KEY
tmdb.language = 'ko-KR'
movie_api = Movie()

def get_tmdb_info(movie_title):
    """TMDb에서 영화 정보를 가져옵니다."""
    try:
        search_results = movie_api.search(movie_title)
        if search_results:
            top_result = search_results[0]
            poster_url = f"{config.TMDB_IMAGE_BASE_URL}{top_result.poster_path}" if top_result.poster_path else None
            rating = top_result.vote_average
            overview = top_result.overview if top_result.overview else None
            tmdb_id = top_result.id
            return poster_url, rating, overview, tmdb_id
    except Exception as e:
        print(f"  ❌ [TMDb 오류] '{movie_title}' 검색 중 오류: {e}")
    return None, None, None, None

def check_and_run_etl(target_date):
    """
    DB에 'target_date'의 데이터가 있는지 확인하고,
    없으면 ETL을 실행(데이터 갱신)합니다.
    (datetime.date 객체를 인자로 받음)
    """
    print(f"--- 💡 [스마트 서버] '{target_date}' 날짜 데이터 신선도 체크 ---")
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute("SELECT 1 FROM daily_box_office WHERE target_dt = %s LIMIT 1;", (target_date,))
        
        if cur.fetchone():
            print(f"✅ [스마트 서버] '{target_date}' 데이터가 이미 DB에 있습니다. ETL을 건너뜁니다.")
            return

        print(f"⚠️ [스마트 서버] '{target_date}' 데이터가 없습니다. ETL을 시작합니다...")
        
        kofic_url = f"http://www.kobis.or.kr/kobisopenapi/webservice/rest/boxoffice/searchDailyBoxOfficeList.json?key={config.KOFIC_API_KEY}&targetDt={target_date.strftime('%Y%m%d')}"
        response = requests.get(kofic_url)
        data = response.json()
        
        if 'boxOfficeResult' not in data or not data['boxOfficeResult']['dailyBoxOfficeList']:
             print(f"ℹ️ [스마트 서버] KOFIC에 '{target_date}' 날짜의 데이터가 없습니다.")
             return

        movie_list = data['boxOfficeResult']['dailyBoxOfficeList']

        for movie in movie_list:
            movie_cd = movie['movieCd']
            movie_nm = movie['movieNm']

            cur.execute("SELECT movie_cd FROM movies WHERE movie_cd = %s;", (movie_cd,))
            if cur.fetchone() is None:
                poster, rating, overview, tmdb_id = get_tmdb_info(movie_nm)
                sql_insert_movie = "INSERT INTO movies (movie_cd, movie_nm, poster_url, tmdb_rating, overview, tmdb_id) VALUES (%s, %s, %s, %s, %s, %s) ON CONFLICT (movie_cd) DO NOTHING;"
                cur.execute(sql_insert_movie, (movie_cd, movie_nm, poster, rating, overview, tmdb_id))

            sql_insert_daily = "INSERT INTO daily_box_office (target_dt, rank, movie_cd, audi_cnt, audi_acc) VALUES (%s, %s, %s, %s, %s);"
            cur.execute(sql_insert_daily, (
                target_date, movie['rank'], movie_cd, movie['audiCnt'], movie['audiAcc']
            ))
        
        conn.commit()
        print(f"✅ [스마트 서버] '{target_date}' ETL 완료. DB가 갱신되었습니다.")

    except Exception as e:
        print(f"❌ [스마트 서버] ETL 실행 중 오류: {e}")
        if conn: conn.rollback()
    finally:
        if conn: conn.close()

# --- ✅ [신규 추가] 구글 영화 뉴스 크롤링 함수 ---
def get_google_movie_news():
    """구글 뉴스 RSS를 통해 최신 영화 뉴스를 가져옵니다."""
    keyword = "영화"
    encoded_keyword = urllib.parse.quote(keyword)
    # hl=ko: 한국어, gl=KR: 한국 지역, ceid=KR:ko
    url = f"https://news.google.com/rss/search?q={encoded_keyword}&hl=ko&gl=KR&ceid=KR:ko"
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=3)
        soup = BeautifulSoup(response.content, "xml")
        items = soup.find_all("item")
        
        news_list = []
        # 최신 5개만 가져오기
        for item in items[:5]:
            # 날짜 포맷 정리 (예: Mon, 08 Dec 2025... -> 2025-12-08)
            pub_date = item.pubDate.text if item.pubDate else ""
            
            news_list.append({
                'title': item.title.text,
                'link': item.link.text,
                'date': pub_date,
                'source': item.source.text if item.source else "Google News"
            })
        return news_list
        
    except Exception as e:
        print(f"❌ [뉴스 크롤링 오류]: {e}")
        return []