# 发型宇宙 (Hair Multica)

AI 换发型与造型点评产品。

## 项目结构

```
├── backend/          # FastAPI 后端服务
│   ├── app/          # 应用代码
│   ├── tests/        # 单元测试
│   └── README.md     # 后端说明
├── frontend/         # Next.js 前端（待开发）
└── README.md         # 本文件
```

## 后端快速开始

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Swagger 文档: http://localhost:8000/docs

## 前端快速开始

```bash
cd frontend
npm install
npm run dev
```

访问: http://localhost:3000
