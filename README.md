# 发型宇宙 Backend API

发型宇宙产品的后端 API 服务，基于 Python + FastAPI 构建，提供 AI 换发型和 AI 点评功能。

## 技术栈

- **框架**: FastAPI + Uvicorn
- **数据库**: SQLAlchemy + SQLite（MVP 阶段，可迁移至 PostgreSQL）
- **ORM**: SQLAlchemy 2.0
- **校验**: Pydantic v2
- **配置**: Pydantic-Settings
- **测试**: pytest

## 快速开始

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# 启动开发服务器
uvicorn app.main:app --reload
```

服务将在 `http://localhost:8000` 启动，Swagger 文档访问 `/docs`。

## 环境变量

复制 `.env.example` 为 `.env` 并配置：

| 变量 | 说明 | 默认值 |
|---|---|---|
| `DATABASE_URL` | 数据库连接地址 | `sqlite:///./data/hair_multica.db` |
| `STORAGE_PROVIDER` | 存储提供商（local/s3） | `local` |
| `STORAGE_LOCAL_PATH` | 本地存储路径 | `./uploads` |
| `LLM_PROVIDER` | LLM 提供商（openai/mock） | `openai` |
| `LLM_API_KEY` | LLM API 密钥 | - |
| `LLM_BASE_URL` | LLM 基础 URL | - |

## API 端点

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/health` | 健康检查 |
| POST | `/api/v1/upload` | 照片上传 |
| POST | `/api/v1/analyze-face` | 脸型分析 |
| POST | `/api/v1/generate-hairstyle` | AI 换发型 |
| POST | `/api/v1/ai-comment` | AI 造型师点评 |
| GET | `/api/v1/hairstyles` | 发型库列表 |

## 测试

```bash
pytest tests/ -v
```

## 项目结构

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py          # FastAPI 应用入口
│   ├── config.py        # 配置管理
│   ├── database.py      # 数据库引擎与 Session
│   ├── models.py        # SQLAlchemy ORM 模型
│   ├── schemas.py       # Pydantic 请求/响应模型
│   ├── routers/         # API 路由
│   ├── services/        # 业务抽象层（Storage / LLM）
│   └── middleware/      # 中间件
├── tests/               # 单元测试
├── pyproject.toml
└── requirements.txt
```
