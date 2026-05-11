# 发型宇宙

> AI 换发型与造型点评应用。上传照片，AI 一键分析脸型、推荐发型、生成换发效果图，并由 AI 造型师给出多维度专业点评。

---

## 核心功能

| 功能 | 说明 |
|---|---|
| **上传照片** | 支持相机拍照或相册选择，自动裁剪为适合换发的正面照 |
| **脸型分析** | 基于多模态 LLM 分析脸型（椭圆/圆/方/心/长/菱形），输出额头/颧骨/下颌/脸长等维度数据 |
| **发型库浏览** | 内置 30+ 款精选发型，支持按性别、长度、风格、场景、脸型适配度筛选与关键词搜索 |
| **AI 换发型** | 选择发型或输入自定义描述，异步生成高清换发效果图（支持 preview / hd 两种模式） |
| **AI 造型师点评** | 三种人格可选（温柔闺蜜 / 毒舌造型师 / 知识型博主），六维评分 + 雷达图 + 造型建议 |
| **分享长图** | 一键生成精美分享卡片，保存至相册或直接分享给好友 |

---

## 技术栈

### 后端
- **Python 3.10+** + **FastAPI** — 异步 API 框架
- **SQLAlchemy 2.0** — ORM（默认 SQLite，可切换 PostgreSQL）
- **Pydantic v2** — 请求/响应校验
- **httpx** — 异步 HTTP 客户端（调用 LLM / 图像生成服务）
- **python-multipart** — 文件上传处理

### 前端
- **Next.js 16** + **React 19** + **TypeScript**
- **Tailwind CSS v4** — 原子化样式
- **Zustand** — 客户端状态管理（持久化）
- **react-easy-crop** — 图片裁剪
- **html-to-image** — 分享卡片生成
- **Lucide React** — 图标库

### AI 服务
- **OpenAI-compatible API** — 文本/图像/多模态生成（GPT-4o / DALL-E-3）
- **fal.ai** — SDXL + InstantID 高质量换发（`fal-ai/instant-id`）
- **DashScope（通义千问）** — 多模态视觉理解（Qwen2-VL）
- **阿里云（通义万相）** — 中文图像生成
- **VolcEngine（豆包）** — 图像生成
- **Mock Provider** — 无 API Key 时的开发 fallback

---

## 快速开始

### 前置条件
- Python 3.10+
- Node.js 20+ + pnpm

### 1. 克隆仓库

```bash
git clone <repo-url>
cd hair-multica
```

### 2. 启动后端

```bash
# 创建虚拟环境
python -m venv venv
source venv/bin/activate

# 安装依赖
pip install -e ".[dev]"

# 配置环境变量（可选，默认使用 Mock Provider）
cp .env.example .env
# 编辑 .env，填入 LLM_API_KEY 等

# 启动服务
uvicorn app.main:app --reload --port 8000
```

服务启动后：
- API 根地址：`http://localhost:8000`
- Swagger UI：`http://localhost:8000/docs`
- 健康检查：`http://localhost:8000/api/health`

### 3. 启动前端

```bash
cd frontend  # 或项目根目录（monorepo 结构）
pnpm install
pnpm dev
```

前端开发服务器默认运行在 `http://localhost:3000`。

---

## 项目结构

```
.
├── app/                           # 后端（FastAPI）
│   ├── main.py                    # FastAPI 应用入口
│   ├── config.py                  # Pydantic Settings 配置
│   ├── models.py                  # SQLAlchemy 数据模型（7 个实体）
│   ├── schemas.py                 # Pydantic 请求/响应模型
│   ├── database.py                # 数据库连接与会话管理（SQLite / PostgreSQL）
│   ├── middleware/
│   │   └── error_handler.py       # 全局异常处理中间件
│   ├── routers/
│   │   ├── upload.py              # POST /api/v1/upload — 图片上传
│   │   ├── face.py                # POST /api/v1/analyze-face — 脸型分析
│   │   ├── hairstyle.py           # GET /api/v1/hairstyles — 发型库列表
│   │   ├── hairstyle_generate.py  # POST /api/v1/generate-hairstyle — AI 换发型
│   │   ├── tasks.py               # GET /api/v1/tasks/{id} — 异步任务状态查询
│   │   ├── comment.py             # POST /api/v1/ai-comment — AI 造型师点评
│   │   └── health.py              # GET /api/health — 健康检查
│   └── services/
│       ├── llm.py                 # LLM Provider 抽象层（OpenAI / fal.ai / 阿里云 / 豆包 / DashScope / Mock）
│       ├── storage.py             # 存储 Provider 抽象层（Local / S3）
│       └── task_manager.py        # 异步任务管理器（AI 换发后台执行）
│
├── src/                           # 前端（Next.js App Router）
│   ├── app/
│   │   ├── page.tsx               # 首页（热门发型 + 用户作品 + 功能入口）
│   │   ├── layout.tsx             # 根布局（Toaster、全局样式）
│   │   ├── upload/page.tsx        # 上传照片（拍照/相册/裁剪）
│   │   ├── generate/page.tsx      # 选择发型（发型库/自定义描述/生成）
│   │   ├── result/page.tsx        # 生成结果（对比滑块/雷达图/点评）
│   │   ├── share/page.tsx         # 分享长图（卡片生成/保存/分享）
│   │   └── profile/page.tsx       # 个人中心（生成记录/收藏）
│   ├── components/
│   │   ├── layout/mobile-layout.tsx   # 移动端布局壳
│   │   ├── comparison-slider.tsx      # 前后对比滑块组件
│   │   ├── radar-chart.tsx            # 六维雷达图组件
│   │   └── ui/                        # 基础 UI 组件（Button/Card/Badge/Input/Avatar/Skeleton 等）
│   └── lib/
│       ├── store.ts               # Zustand 全局状态
│       ├── utils.ts               # Tailwind 工具函数（cn）
│       └── api/
│           ├── client.ts          # API 请求封装（fetch + 轮询）
│           └── types.ts           # TypeScript 类型定义
│
├── tests/                         # pytest 测试集（18 条用例）
│   ├── conftest.py                # 测试 fixtures（内存 SQLite + Mock Provider）
│   ├── test_upload.py             # 上传接口测试
│   ├── test_face.py               # 脸型分析测试
│   ├── test_hairstyles.py         # 发型库列表测试
│   ├── test_generate.py           # AI 换发与任务轮询测试
│   ├── test_comment.py            # AI 点评测试
│   └── test_health.py             # 健康检查测试
│
├── pyproject.toml                 # Python 项目配置（依赖 / ruff / mypy / pytest）
├── package.json                   # Node.js 项目配置
├── next.config.ts                 # Next.js 配置
├── pnpm-workspace.yaml            # pnpm workspace 配置
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
- 标注相关的功能模块（上传 / 脸型分析 / 换发 / 点评 / 分享）

### 提交 Pull Request
1. 从 `main` 分支创建功能分支：`git checkout -b feat/your-feature`
2. 遵循现有代码风格（后端：ruff / mypy；前端：eslint / prettier）
3. 确保测试通过：`pytest`（后端）、`pnpm lint`（前端）
4. 提交信息格式：`类型(范围): 描述`
   - 示例：`feat(frontend): 新增分享至朋友圈功能`
5. 在 PR 描述中关联相关 Issue，并简要说明改动范围

### 代码规范
- **后端**：类型注解必须完整；异步函数统一使用 `async/await`；数据库操作使用 SQLAlchemy Session
- **前端**：组件使用函数式写法 + Hooks；API 调用统一封装在 `src/lib/api/client.ts`
- **LLM Prompt 调优**：修改 Prompt 后需在 `tests/` 中补充或更新 mock 用例

---

## 相关文档

| 文档 | 说明 |
|---|---|
| [docs/API.md](./docs/API.md) | 全部后端接口的详细说明、请求/响应示例与错误码 |
| [docs/USER_GUIDE.md](./docs/USER_GUIDE.md) | 面向最终用户的操作手册与 FAQ |
| [docs/DEVELOPER.md](./docs/DEVELOPER.md) | 本地开发环境搭建、测试运行、LLM Provider 扩展、数据库迁移与扩展指南 |

---

## 许可证

MIT License
