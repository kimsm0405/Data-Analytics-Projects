from flask import Flask
from routes import register_routes  # ⬅️ 방금 만든 routes.py를 가져옵니다.

# --- 1. Flask 서버 설정 ---
app = Flask(__name__)
app.config['JSON_AS_ASCII'] = False

# --- 2. 라우트 등록 ---
# routes.py 에 정의된 모든 API 엔드포인트를 앱에 등록합니다.
register_routes(app)

# --- 3. 서버 실행 ---
if __name__ == '__main__':
    app.run(debug=True, port=5001)