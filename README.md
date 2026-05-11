# 录音文字收益最大化系统

> 将 1 对 1 课程辅导的录音文字内容转化为社交媒体素材、体系化课程与可复用 Skill 能力库，实现内容收益最大化。

---

## 核心功能

系统围绕三大 AI 工作流设计，输入为每次上传的录音文字文件，输出覆盖内容运营、知识沉淀与课程生产：

| 工作流 | 说明 | 产出 |
|---|---|---|
| **单次内容 → 社交媒体内容** | 从单篇录音稿中筛选高价值洞察，生成 3–5 条小红书风格草稿 | 标题、正文、配图建议、标签 |
| **累计内容 → 体系化课程** | 当累计 processed word count 超过 50,000 字后，按主题聚类生成 8–10 节课 | 课程大纲、逐字讲义、课时结构 |
| **深度提炼 → 可复用 Skill 库** | 从录音中提炼面试官视角与候选人视角的 Skill，自动去重合并 | `[场景]-[动作]-[预期结果]` 范式条目 |

---

## 技术栈

### 后端
- **Python 3.11** + **FastAPI** — 高性能异步 API 框架
- **PostgreSQL** + **pgvector** — 关系型数据库与向量扩展
- **SQLAlchemy** + **Alembic** — ORM 与数据库迁移
- **OpenAI** (`gpt-4o` / `text-embedding-3-small`) — LLM 与 Embedding
- **scikit-learn** (`KMeans` + `TfidfVectorizer`) — 课程主题聚类

### 前端
- **React 18** + **TypeScript** + **Vite**
- **Tailwind CSS v4** — 原子化样式
- **TanStack Query** — 服务端状态管理
- **React Router** — 客户端路由

### 部署与运维
- **Docker** + **docker-compose** — 容器化与本地编排
- **GitHub Actions** — CI/CD 流水线（lint / test / build / security scan）
- **Nginx** — 前端静态资源服务与反向代理

---

## 快速开始

### 前置条件
- Docker Engine 24.0+
- Docker Compose v2.20+
- 至少 4 GB 可用内存

### 1. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env，填入 OPENAI_API_KEY 与数据库密码
```

### 2. 一键启动全部服务

```bash
docker-compose up --build
```

首次启动时，后端容器会自动等待 PostgreSQL 就绪，执行 `alembic upgrade head` 完成数据库迁移，然后启动 FastAPI 应用。

### 3. 验证服务

| 服务 | 地址 |
|---|---|
| 前端管理界面 | http://localhost:3000 |
| 后端 API | http://localhost:8000 |
| API 文档 (Swagger UI) | http://localhost:8000/docs |
| 健康检查 | http://localhost:8000/health |

### 4. 停止服务

```bash
docker-compose down -v   # -v 会同时清理数据卷，慎用
```

> 更详细的部署、回滚与故障排查说明请参考 [DEPLOYMENT.md](./DEPLOYMENT.md)。

---

## 项目结构

```
.
├── transcript_maximizer/          # 后端服务（FastAPI）
│   ├── app/
│   │   ├── main.py                # FastAPI 应用入口
│   │   ├── config.py              # Pydantic Settings 配置
│   │   ├── models.py              # SQLAlchemy 数据模型（5 核心实体）
│   │   ├── schemas.py             # Pydantic 请求/响应模型
│   │   ├── database.py            # 数据库连接与会话管理
│   │   ├── routers/
│   │   │   ├── transcripts.py     # 录音稿 CRUD + 上传
│   │   │   ├── pipelines.py       # 3 条 AI Pipeline 接口
│   │   │   └── content.py         # 社媒/Skill/课程查询接口
│   │   └── services/
│   │       ├── llm_client.py      # OpenAI 封装（重试/Token 记录/JSON 模式）
│   │       ├── text_preprocessing.py  # 文本清洗与滑动窗口切片
│   │       ├── vector_store.py    # pgvector 向量存储与相似度搜索
│   │       ├── pipeline_social_media.py  # 工作流 1：社媒内容生成
│   │       ├── pipeline_skills.py        # 工作流 3：Skill 提取与去重
│   │       └── pipeline_course.py        # 工作流 2：课程生成（K-Means 聚类）
│   ├── alembic/
│   │   └── versions/001_initial.py  # 初始数据库迁移
│   ├── tests/                     # pytest 测试集（17 条用例，覆盖率 78%）
│   ├── requirements.txt
│   ├── Dockerfile
│   └── docker-compose.yml         # 后端独立编排（含 pgvector）
│
├── frontend/                      # 前端管理界面（React + Vite）
│   ├── src/
│   │   ├── lib/api.ts             # API 调用封装（当前 mock 层）
│   │   ├── lib/types.ts           # TypeScript 类型定义
│   │   └── ...                    # 页面组件（Upload / Transcripts / SocialMedia / Skills / Courses）
│   ├── package.json
│   ├── Dockerfile
│   └── nginx.conf
│
├── scripts/
│   ├── entrypoint.sh              # 后端容器入口（等待 PG + 迁移 + 启动）
│   ├── init-db.sh                 # 数据库初始化辅助
│   └── health-check.sh            # 一键服务健康验证
│
├── docker-compose.yml             # 生产编排（4 服务：backend / frontend / postgres / qdrant）
├── docker-compose.override.yml    # 开发模式覆盖（热重载、源码挂载）
├── .env.example                   # 环境变量模板
├── .github/ci.yml.disabled        # CI/CD 流水线（需重命名激活）
├── DEPLOYMENT.md                  # 部署与运维文档
├── docs/
│   ├── API.md                     # API 接口文档
│   ├── USER_GUIDE.md              # 用户操作手册
│   └── DEVELOPER.md               # 开发者指南
└── README.md                      # 本文件
```

---

## 贡献指南

### 提交 Issue
- 使用中文描述问题，关键术语保留英文
- 提供复现步骤、期望行为与实际行为
- 标注相关的工作流或页面模块

### 提交 Pull Request
1. 从 `main` 分支创建功能分支：`git checkout -b feat/your-feature`
2. 遵循现有代码风格（后端：black / ruff；前端：eslint / prettier）
3. 确保测试通过：`pytest`（后端）、`npm run test`（前端）
4. 提交信息使用中文或英文，格式：`类型(范围): 描述`
   - 示例：`feat(pipeline): 支持自定义小红书模板风格`
5. 在 PR 描述中关联相关 Issue，并简要说明改动范围

### 代码规范
- **后端**：类型注解必须完整；异步函数统一使用 `async/await`；数据库操作使用 SQLAlchemy Session
- **前端**：组件使用函数式写法 + Hooks；API 调用统一封装在 `src/lib/api.ts`
- **Prompt 调优**：修改 LLM System Prompt 后需在 `tests/` 中补充或更新 mock 用例，确保 Pipeline 可测试

---

## 相关文档

| 文档 | 说明 |
|---|---|
| [docs/API.md](./docs/API.md) | 全部后端接口的详细说明、请求/响应示例与错误码 |
| [docs/USER_GUIDE.md](./docs/USER_GUIDE.md) | 面向运营/教研人员的操作手册与 FAQ |
| [docs/DEVELOPER.md](./docs/DEVELOPER.md) | 本地开发环境搭建、测试运行、Prompt 调优、数据库迁移与扩展指南 |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | 本地/生产部署步骤、环境变量清单、回滚方案与故障排查 |

---

## 许可证

MIT License
