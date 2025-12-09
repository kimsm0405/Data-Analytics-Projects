import datetime
import psycopg2.extras
from flask import jsonify, render_template, request

# 로컬 모듈 import
from database import get_db_connection 
# ✅ [수정] etl 모듈에서 get_google_movie_news 함수도 가져옵니다.
from etl import check_and_run_etl, get_google_movie_news

# 'app' 객체를 받아 라우트를 등록하는 함수
def register_routes(app):

    # --- 1. 기존 박스오피스 페이지/API ---
    
    @app.route('/')
    def home():
        """기본 루트 URL 접속 시 'index.html'을 보여줍니다."""
        yesterday = datetime.date.today() - datetime.timedelta(days=1)
        check_and_run_etl(yesterday) # '어제' 날짜로 ETL 실행
        return render_template('index.html') 

    @app.route('/api/boxoffice')
    def get_box_office():
        """/api/boxoffice API (기본값: 가장 최신 날짜)"""
        conn = None
        try:
            conn = get_db_connection()
            cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
            
            cur.execute("SELECT MAX(target_dt) FROM daily_box_office;")
            latest_date = cur.fetchone()[0]
            
            if not latest_date:
                return jsonify({"error": "데이터가 없습니다."}), 404
            
            query = """
            SELECT d.rank, d.audi_cnt, d.audi_acc, m.movie_nm, m.poster_url, m.tmdb_rating, m.overview, m.movie_cd
            FROM daily_box_office AS d
            JOIN movies AS m ON d.movie_cd = m.movie_cd
            WHERE d.target_dt = %s
            ORDER BY d.rank ASC;
            """
            cur.execute(query, (latest_date,))
            box_office_data = [dict(row) for row in cur.fetchall()] 
            
            return jsonify({
                "target_dt": latest_date.strftime("%Y-%m-%d"),
                "movies": box_office_data
            })
        except Exception as e:
            print(f"❌ [오류] /api/boxoffice 처리 중 오류 발생: {e}")
            return jsonify({"error": "서버 내부 오류"}), 500
        finally:
            if conn: conn.close()

    @app.route('/api/boxoffice/<string:date_str>')
    def get_box_office_by_date(date_str):
        """/api/boxoffice/YYYY-MM-DD API"""
        conn = None
        try:
            target_date = datetime.datetime.strptime(date_str, "%Y-%m-%d").date()
            check_and_run_etl(target_date) # 해당 날짜로 ETL 실행

            conn = get_db_connection()
            cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
            
            query = """
            SELECT d.rank, d.audi_cnt, d.audi_acc, m.movie_nm, m.poster_url, m.tmdb_rating, m.overview, m.movie_cd
            FROM daily_box_office AS d
            JOIN movies AS m ON d.movie_cd = m.movie_cd
            WHERE d.target_dt = %s
            ORDER BY d.rank ASC;
            """
            cur.execute(query, (target_date,))
            box_office_data = [dict(row) for row in cur.fetchall()]
            
            if not box_office_data:
                 return jsonify({"error": f"{date_str} 날짜의 데이터가 없습니다."}), 404

            return jsonify({
                "target_dt": target_date.strftime("%Y-%m-%d"),
                "movies": box_office_data
            })
        except ValueError:
            return jsonify({"error": "잘못된 날짜 형식입니다. (YYYY-MM-DD 필요)"}), 400
        except Exception as e:
            print(f"❌ [오류] /api/boxoffice/{date_str} 처리 중 오류 발생: {e}")
            return jsonify({"error": "서버 내부 오류"}), 500
        finally:
            if conn: conn.close()
            
    # --- ✅ [신규 추가] 뉴스 데이터 API ---
    @app.route('/api/news')
    def api_news():
        """크롤링된 뉴스 데이터를 JSON으로 반환합니다."""
        news_data = get_google_movie_news()
        return jsonify(news_data)


    # ----------------------------------------
    # 2. 리뷰(Reviews) API (CRUD)
    # ----------------------------------------

    @app.route('/api/reviews/<string:movie_cd>', methods=['GET'])
    def get_reviews(movie_cd):
        conn = None
        try:
            conn = get_db_connection()
            cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
            query = "SELECT review_id, content, rating, author, created_at FROM reviews WHERE movie_cd = %s ORDER BY created_at DESC;"
            cur.execute(query, (movie_cd,))
            reviews = [dict(row) for row in cur.fetchall()]
            return jsonify(reviews)
        except Exception as e:
            print(f"❌ [오류] /api/reviews/{movie_cd} (GET) 처리 중 오류 발생: {e}")
            return jsonify({"error": "서버 내부 오류"}), 500
        finally:
            if conn: conn.close()

    @app.route('/api/reviews', methods=['POST'])
    def create_review():
        data = request.get_json()
        movie_cd = data.get('movie_cd')
        content = data.get('content')
        rating = data.get('rating')
        author = data.get('author')

        if not movie_cd or not content:
            return jsonify({"error": "movie_cd와 content는 필수입니다."}), 400

        conn = None
        try:
            conn = get_db_connection()
            cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
            query = """
            INSERT INTO reviews (movie_cd, content, rating, author)
            VALUES (%s, %s, %s, %s)
            RETURNING review_id, content, rating, author, created_at; 
            """
            cur.execute(query, (movie_cd, content, rating, author))
            new_review = cur.fetchone()
            conn.commit()
            return jsonify(dict(new_review)), 201
        except Exception as e:
            print(f"❌ [오류] /api/reviews (POST) 처리 중 오류 발생: {e}")
            if conn: conn.rollback()
            return jsonify({"error": "서버 내부 오류"}), 500
        finally:
            if conn: conn.close()

    @app.route('/api/reviews/<int:review_id>', methods=['PUT'])
    def update_review(review_id):
        data = request.get_json()
        content = data.get('content')
        rating = data.get('rating')

        if not content:
            return jsonify({"error": "content는 필수입니다."}), 400

        conn = None
        try:
            conn = get_db_connection()
            cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
            query = """
            UPDATE reviews SET content = %s, rating = %s 
            WHERE review_id = %s
            RETURNING review_id, content, rating, author, created_at;
            """
            cur.execute(query, (content, rating, review_id))
            updated_review = cur.fetchone()
            
            if updated_review is None:
                return jsonify({"error": "해당 리뷰를 찾을 수 없습니다."}), 404
            
            conn.commit()
            return jsonify(dict(updated_review))
        except Exception as e:
            print(f"❌ [오류] /api/reviews/{review_id} (PUT) 처리 중 오류 발생: {e}")
            if conn: conn.rollback()
            return jsonify({"error": "서버 내부 오류"}), 500
        finally:
            if conn: conn.close()

    @app.route('/api/reviews/<int:review_id>', methods=['DELETE'])
    def delete_review(review_id):
        conn = None
        try:
            conn = get_db_connection()
            cur = conn.cursor()
            query = "DELETE FROM reviews WHERE review_id = %s;"
            cur.execute(query, (review_id,))
            
            if cur.rowcount == 0:
                return jsonify({"error": "해당 리뷰를 찾을 수 없습니다."}), 404
                
            conn.commit()
            return jsonify({"message": "리뷰가 성공적으로 삭제되었습니다."}) 
        except Exception as e:
            print(f"❌ [오류] /api/reviews/{review_id} (DELETE) 처리 중 오류 발생: {e}")
            if conn: conn.rollback()
            return jsonify({"error": "서버 내부 오류"}), 500
        finally:
            if conn: conn.close()