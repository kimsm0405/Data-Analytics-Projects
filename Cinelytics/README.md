# 🎬 영화 데이터 분석 및 커뮤니티 플랫폼 "Cinelytics"

박스오피스 데이터 자동화 파이프라인과 실시간 뉴스 크롤링을 결합하여, 영화 트렌드를 한눈에 파악할 수 있는 통합 웹 서비스입니다.

## ✨ 주요 기능
* **스마트 ETL:** API 호출 비용 절감을 위해 로컬 DB 검증 후 필요한 데이터만 선별적 수집
* **데이터 시각화:** Chart.js를 활용하여 일별 관객 수 추이를 직관적인 막대그래프로 시각화
* **실시간 뉴스:** Google News RSS 크롤링을 통해 최신 영화계 소식을 실시간으로 제공
* **리뷰 시스템 (CRUD):** 영화 상세 정보 조회 및 사용자 리뷰 작성/수정/삭제 기능 완벽 구현
* **직관적 UI/UX:** Zoom-in 모달 애니메이션, 반응형 카드 레이아웃, 통일된 컬러 테마 적용

## 💻 핵심 기술
* **Backend:** Python Flask
* **Data Processing:** Beautiful Soup 4, lxml, Requests
* **Database:** PostgreSQL
* **Frontend:** HTML, CSS, JavaScript (ES6+), Chart.js

## 🔧 실행 방법

**1. 환경 설정 (Configuration)**

config.py 파일에 API 키와 데이터베이스 접속 정보를 설정해야 합니다.

```Python
# config.py
KOFIC_API_KEY = "발급받은_KOFIC_키"
TMDB_API_KEY = "발급받은_TMDB_키"
DB_NAME = "cinelytics_db"
DB_USER = "postgres"
# ... (기타 DB 설정)
```

**2. 라이브러리 설치**

필요한 Python 라이브러리를 설치합니다. (XML 파싱을 위한 lxml 필수)

```Bash
pip install flask psycopg2 requests beautifulsoup4 lxml tmdbv3api
```

**3. 서버 실행**

Flask 웹 서버를 실행합니다.

```Bash
python cinelytics.py
# 실행 후 브라우저에서 http://127.0.0.1:5001 접속
```
