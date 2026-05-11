# 开发者指南

> 面向后续维护者与功能扩展者的技术参考。

---

## 1. 本地开发环境搭建

### 1.1 后端（FastAPI）

**前置条件**：Python 3.10+

```bash
# 1. 创建虚拟环境
python -m venv venv
source venv/bin/activate

# 2. 安装依赖（含开发依赖）
pip install -e ".[dev]"

# 3. 配置环境变量（可选，默认 Mock Provider）
cp .env.example .env
# 编辑 .env：
#   LLM_PROVIDER=mock
#   LLM_API_KEY=sk-...          # 使用真实 LLM 时必填
#   DATABASE_URL=sqlite:///./data/hair_multica.db

# 4. 启动服务
uvicorn app.main:app --reload --port 8000
```

服务启动后：
- API 根地址：`http://localhost:8000`
- Swagger UI：`http://localhost:8000/docs`
- 健康检查：`http://localhost:8000/api/health`

#### 数据库说明

默认使用 **SQLite**（`sqlite:///./data/hair_multica.db`），无需额外安装。如需切换至 PostgreSQL：

```bash
# .env
DATABASE_URL=postgresql://user:password@localhost:5432/hair_multica
```

> 注意：本项目**未使用 Alembic**。数据库表结构由 `app/main.py` 中的 `Base.metadata.create_all(bind=engine)` 在启动时自动创建。如需迁移工具，可参考下方「添加 Alembic 迁移」扩展指南。

### 1.2 前端（Next.js）

**前置条件**：Node.js 20+、pnpm

```bash
# 1. 安装依赖
pnpm install

# 2. 配置环境变量
cp .env.example .env.local
# 编辑 .env.local：
#   NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1

# 3. 启动开发服务器
pnpm dev
```

前端开发服务器默认运行在 `http://localhost:3000`。

### 1.3 项目结构速览

```
app/                    # 后端 FastAPI
├── main.py             # 应用入口（路由注册、中间件、静态文件挂载）
├── config.py           # Pydantic Settings（.env 加载）
├── models.py           # SQLAlchemy ORM（7 个实体）
├── schemas.py          # Pydantic 请求/响应模型
├── database.py         # 引擎、Session、Base
├── middleware/         # 全局错误处理中间件
├── routers/            # API 路由（7 个模块）
└── services/           # 业务服务（LLM / Storage / TaskManager）

src/                    # 前端 Next.js App Router
├── app/                # 页面路由（page.tsx / layout.tsx）
├── components/         # React 组件（UI / 业务 / 布局）
└── lib/                # 工具函数、状态管理、API 封装

tests/                  # pytest 测试
├── conftest.py         # fixtures（内存 SQLite + Mock Provider）
└── test_*.py           # 各模块测试用例
```

---

## 2. 如何运行测试

### 2.1 后端测试（pytest）

```bash
# 运行全部测试
pytest

# 运行指定模块
pytest tests/test_upload.py
pytest tests/test_face.py
pytest tests/test_hairstyles.py
pytest tests/test_generate.py
pytest tests/test_comment.py
pytest tests/test_health.py

# 带详细输出
pytest -v

# 带覆盖率（需安装 pytest-cov）
pytest --cov=app --cov-report=term-missing
```

当前测试集共 **18 条用例**，覆盖：
- 图片上传（成功 / 非法类型 / 超大文件）
- 脸型分析（上传后分析、缓存返回）
- 发型库列表（分页、分类筛选、长度筛选、场景筛选、脸型适配、关键词搜索、组合筛选）
- AI 换发与任务轮询（创建任务、preview 模式、图片不存在、任务不存在）
- AI 点评（基础点评、三种人格、指定发型 ID、图片不存在）
- 健康检查

### 2.2 测试配置说明

`tests/conftest.py` 关键配置：

```python
os.environ["DATABASE_URL"] = "sqlite:///:memory:"   # 内存数据库
os.environ["STORAGE_LOCAL_PATH"] = tempfile.mkdtemp()  # 临时上传目录
os.environ["STORAGE_BASE_URL"] = "http://localhost:8000/uploads"
os.environ["LLM_PROVIDER"] = "mock"                  # Mock LLM，无需 API Key
```

测试使用内存 SQLite，每次测试函数独立创建/销毁表结构，互不干扰。

### 2.3 前端代码检查

```bash
# ESLint
pnpm lint
pnpm lint:fix

# Prettier
pnpm format
pnpm format:check

# TypeScript 类型检查
pnpm type-check
```

> 当前前端项目尚未编写 UI 测试，建议在后续迭代中为关键交互（上传裁剪、生成轮询、分享卡片）补充 Playwright 或 React Testing Library 用例。

---

## 3. LLM Provider 配置与 Prompt 调优

### 3.1 支持的 LLM Provider

在 `.env` 中通过 `LLM_PROVIDER` 切换：

| Provider | `LLM_PROVIDER` 值 | 适用场景 | 配置项 |
|----------|-------------------|----------|--------|
| Mock | `mock` | 开发测试，无 API Key | 无需配置 |
| OpenAI / OpenAI-Compatible | `openai` / `openai_compatible` | 通用文本/图像/多模态 | `LLM_API_KEY`, `LLM_BASE_URL`, `LLM_TEXT_MODEL`, `LLM_VISION_MODEL`, `LLM_IMAGE_MODEL` |
| fal.ai | `falai` | SDXL + InstantID 高质量换发 | `FAL_API_KEY`, `FAL_MODEL_ID`, `FAL_PREVIEW_MODEL_ID` |
| 阿里云（通义万相） | `aliyun` | 中文图像生成 | `ALIYUN_API_KEY`, `ALIYUN_BASE_URL`, `ALIYUN_IMAGE_MODEL`, `ALIYUN_TEXT_MODEL` |
| 火山引擎（豆包） | `volcengine` | 图像生成 | `VOLCENGINE_API_KEY`, `VOLCENGINE_BASE_URL`, `VOLCENGINE_IMAGE_MODEL`, `VOLCENGINE_TEXT_MODEL` |
| DashScope | `dashscope` | Qwen2-VL 多模态 | `LLM_API_KEY`（复用） |

### 3.2 配置示例

```bash
# .env — 使用 OpenAI
LLM_PROVIDER=openai
LLM_API_KEY=sk-...
LLM_BASE_URL=https://api.openai.com/v1
LLM_TEXT_MODEL=gpt-4o
LLM_VISION_MODEL=gpt-4o
LLM_IMAGE_MODEL=dall-e-3

# .env — 使用 fal.ai 换发（推荐）
LLM_PROVIDER=falai
FAL_API_KEY=...
FAL_MODEL_ID=fal-ai/instant-id
FAL_PREVIEW_MODEL_ID=fal-ai/fast-sdxl
FAL_TIMEOUT_SECONDS=120

# .env — 使用阿里云
LLM_PROVIDER=aliyun
ALIYUN_API_KEY=sk-...
ALIYUN_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
ALIYUN_IMAGE_MODEL=wanx-v1
ALIYUN_TEXT_MODEL=qwen-vl-max
```

### 3.3 Prompt 调优

#### 脸型分析 Prompt

**文件**：`app/routers/face.py`

```python
ANALYSIS_PROMPT = (
    "请分析这张人脸照片，返回严格的 JSON 格式结果..."
)
```

调优方向：
- 增加/删除分析的面部维度（如增加「眉毛形状」「鼻梁高度」）
- 修改输出 JSON 的字段结构
- 调整 `max_tokens` 限制

**注意**：修改 JSON 输出结构后，需同步更新 `app/schemas.py` 中的 `FaceAnalysisOut` 和 `tests/test_face.py` 中的断言。

#### AI 点评 Prompt

**文件**：`app/routers/comment.py`

涉及三个 System Prompt：

| 人格 | Prompt Key | 调优方向 |
|------|-----------|----------|
| 温柔闺蜜 | `warm_bestie` | 调整亲切称呼、emoji 使用频率、建议语气 |
| 毒舌造型师 | `sassy_stylist` | 调整犀利程度、幽默风格、吐槽边界 |
| 知识型博主 | `knowledge_blogger` | 调整专业深度、引用来源、术语密度 |

**六维评分调整**：

在 `_SCORE_DIMENSIONS` 列表中增删维度：

```python
_SCORE_DIMENSIONS = [
    ("face_match", "脸型适配度", "..."),
    ("hair_quality", "发质匹配度", "..."),
    # 新增维度
    ("color_match", "发色适配度", "评估该发色对用户肤色的适配性"),
]
```

修改后需同步更新：
- `app/schemas.py` 中的 `Scores` 模型
- `src/lib/store.ts` 中的 `RadarScores` 类型
- `tests/test_comment.py` 中的 mock 数据

#### 换发生成 Prompt

**文件**：`app/services/task_manager.py`

```python
prompt = "基于用户上传的照片，生成一张 AI 换发型后的效果图。..."
```

调优方向：
- 修改保留面部特征的约束强度
- 增加风格描述（如 "studio lighting, realistic photography"）
- 针对特定 Provider 调整 Prompt（fal.ai 的 InstantID 对 Prompt 格式较敏感）

### 3.4 Prompt 调优的验证流程

1. **修改 Prompt 文本**
2. **更新 mock 测试数据**（`tests/` 中对应模块的 mock 返回值）
3. **运行测试**：`pytest tests/test_xxx.py`
4. **手动端到端验证**：启动服务后，通过 Swagger UI 或前端触发真实调用
5. **记录版本**：建议将 Prompt 变更记录到版本控制提交信息中

---

## 4. 数据库操作

### 4.1 当前机制（无 Alembic）

本项目使用 SQLAlchemy 的 `Base.metadata.create_all()` 在应用启动时自动建表。适合快速迭代，但不支持增量迁移。

**自动建表逻辑**（`app/main.py`）：

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    create_tables()  # Base.metadata.create_all(bind=engine)
    yield
```

### 4.2 手动管理数据库

```bash
# 查看表结构（SQLite）
sqlite3 ./data/hair_multica.db ".schema"

# 清空数据（开发调试）
rm ./data/hair_multica.db
# 重启服务后自动重建表

# 查看数据
sqlite3 ./data/hair_multica.db "SELECT id, name, category FROM hairstyles LIMIT 5;"
```

### 4.3 添加 Alembic 迁移（扩展）

如需正式迁移管理，可按以下步骤添加 Alembic：

```bash
# 1. 安装
pip install alembic

# 2. 初始化
alembic init alembic

# 3. 配置 alembic.ini 和 alembic/env.py，指向 app.database.engine

# 4. 生成初始迁移
alembic revision --autogenerate -m "init"

# 5. 后续修改 models.py 后
alembic revision --autogenerate -m "add xxx"
alembic upgrade head
```

---

## 5. 添加新功能扩展指南

### 5.1 后端扩展：新增 API 接口

以「新增发色推荐接口」为例：

#### 步骤 1：定义数据模型

在 `app/models.py` 中追加：

```python
class HairColor(Base):
    __tablename__ = "hair_colors"

    id = Column(String(36), primary_key=True, default=_uuid)
    name = Column(String(128), nullable=False)
    hex_code = Column(String(7), nullable=False)
    skin_tone_match = Column(Text, nullable=True)  # JSON
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
```

#### 步骤 2：定义 Schema

在 `app/schemas.py` 中追加：

```python
class HairColorOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    hex_code: str
    skin_tone_match: list[str] | None = None
    created_at: datetime
```

#### 步骤 3：实现路由

新建 `app/routers/hair_color.py`：

```python
from fastapi import APIRouter
from app.schemas import HairColorOut, success_response

router = APIRouter(prefix="/api/v1", tags=["Hair Colors"])

@router.get("/hair-colors")
async def list_hair_colors() -> dict:
    # 实现查询逻辑
    return success_response(data=[])
```

#### 步骤 4：注册路由

在 `app/main.py` 中导入并注册：

```python
from app.routers import hair_color
app.include_router(hair_color.router)
```

#### 步骤 5：补充测试

新建 `tests/test_hair_color.py`：

```python
def test_list_hair_colors(client):
    response = client.get("/api/v1/hair-colors")
    assert response.status_code == 200
```

#### 步骤 6：重启服务

```bash
uvicorn app.main:app --reload
```

> 由于使用 `create_all()` 自动建表，新增模型会在重启时自动创建对应表。如使用已有数据库文件，需先删除 `.db` 文件或手动添加表。

### 5.2 前端扩展：新增页面

以「新增发色推荐页」为例：

#### 步骤 1：创建页面

新建 `src/app/hair-colors/page.tsx`：

```tsx
"use client";
import { MobileLayout } from "@/components/layout/mobile-layout";

export default function HairColorsPage() {
  return (
    <MobileLayout>
      <div className="p-4">
        <h1 className="text-xl font-bold">发色推荐</h1>
      </div>
    </MobileLayout>
  );
}
```

#### 步骤 2：添加 API 类型

在 `src/lib/api/types.ts` 中追加：

```typescript
export interface HairColor {
  id: string;
  name: string;
  hex_code: string;
}
```

#### 步骤 3：调用 API

```typescript
import { api } from "@/lib/api/client";
const colors = await api.get<HairColor[]>("/hair-colors");
```

#### 步骤 4：添加导航入口

在需要的位置（如首页或底部导航）添加链接：

```tsx
import Link from "next/link";
<Link href="/hair-colors">发色推荐</Link>
```

### 5.3 添加新的 LLM Provider

以「新增某国产大模型 Provider」为例：

#### 步骤 1：实现 Provider 类

在 `app/services/llm.py` 中继承 `LLMProvider`：

```python
class NewProvider(LLMProvider):
    def __init__(self, api_key: str, base_url: str, ...) -> None:
        self.api_key = api_key
        ...

    async def generate_image(self, prompt: str, image_data: bytes | None = None, **kwargs: Any) -> str:
        # 实现图像生成
        ...

    async def generate_text(self, prompt: str, **kwargs: Any) -> str:
        # 实现文本生成
        ...

    async def analyze_image(self, image_data: bytes, prompt: str, **kwargs: Any) -> str:
        # 实现图像分析
        ...

    async def generate_text_with_images(self, prompt: str, images: list[bytes | str], **kwargs: Any) -> str:
        # 实现多模态生成
        ...
```

#### 步骤 2：注册到工厂函数

在 `get_llm_provider()` 中追加：

```python
if provider == "newprovider":
    return NewProvider(
        api_key=settings.llm_api_key,
        base_url=settings.llm_base_url,
        ...
    )
```

#### 步骤 3：添加配置项

在 `app/config.py` 的 `Settings` 中追加：

```python
newprovider_api_key: str = ""
newprovider_base_url: str = ""
```

#### 步骤 4：更新环境变量文档

在 `.env.example` 和本文档中补充新 Provider 的配置说明。

---

## 6. 常用调试技巧

### 查看后端日志

```bash
# 本地启动
uvicorn app.main:app --reload --log-level debug

# 查看请求日志（已内置于 app/main.py）
# 每条请求会自动输出：METHOD PATH - STATUS - DURATION
```

### 直接调用 API 测试

```bash
# 上传图片
curl -X POST "http://localhost:8000/api/v1/upload" -F "file=@photo.jpg"

# 脸型分析
curl -X POST "http://localhost:8000/api/v1/analyze-face" \
  -H "Content-Type: application/json" \
  -d '{"image_id": "xxx"}'

# 查询任务
curl "http://localhost:8000/api/v1/tasks/xxx"
```

### 检查数据库内容

```bash
# SQLite
sqlite3 ./data/hair_multica.db "SELECT id, status, task_type FROM generation_tasks ORDER BY created_at DESC LIMIT 5;"

# 查看图片记录
sqlite3 ./data/hair_multica.db "SELECT id, original_filename, storage_url FROM images ORDER BY created_at DESC LIMIT 5;"
```

### 检查本地上传文件

```bash
ls -la ./uploads/$(date +%Y/%m/%d)
```

### 切换 Mock Provider 快速测试

无需配置任何 API Key，将 `.env` 中 `LLM_PROVIDER=mock`，所有 LLM 调用会返回预设的模拟数据，适合前端联调和接口测试。
