import psycopg2
import psycopg2.extras
import config  # ⬅️ 방금 만든 config.py의 정보를 사용합니다.

def get_db_connection():
    """PostgreSQL DB 연결 객체를 반환합니다."""
    conn = psycopg2.connect(
        dbname=config.DB_NAME,
        user=config.DB_USER,
        password=config.DB_PASS,
        host=config.DB_HOST,
        port=config.DB_PORT
    )
    return conn