# 开发者指南

> 面向后续维护者与功能扩展者的技术参考。

---

## 1. 本地开发环境搭建

### 1.1 后端（FastAPI）

**前置条件**：Python 3.11、PostgreSQL 15（含 pgvector 扩展）、Docker（可选）

#### 方式 A：纯本地启动

```bash
cd transcript_maximizer

# 1. 创建虚拟环境
python -m venv venv
source venv/bin/activate

# 2. 安装依赖
pip install -r requirements.txt

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env：
#   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/transcript_maximizer
#   OPENAI_API_KEY=sk-...

# 4. 启动 PostgreSQL（如未安装，可用 Docker 临时启动）
docker run -d --name pg-dev \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=transcript_maximizer \
  -p 5432:5432 \
  ankane/pgvector:latest

# 5. 执行数据库迁移
alembic upgrade head

# 6. 启动服务
uvicorn app.main:app --reload --port 8000
```

服务启动后：
- API 根地址：`http://localhost:8000`
- Swagger UI：`http://localhost:8000/docs`
- ReDoc：`http://localhost:8000/redoc`

#### 方式 B：Docker Compose（推荐）

```bash
cd transcript_maximizer
export OPENAI_API_KEY="sk-..."
docker-compose up --build
```

此方式会自动拉起 PostgreSQL + pgvector 容器，且后端代码通过 volume 挂载，修改后自动热重载。

### 1.2 前端（React + Vite）

**前置条件**：Node.js 20+、npm 或 pnpm

```bash
cd frontend

# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.example .env.local
# 编辑 .env.local：
#   VITE_API_BASE_URL=http://localhost:8000

# 3. 启动开发服务器
npm run dev
```

开发服务器默认运行在 `http://localhost:5173`，代理配置在 `vite.config.ts` 中。

### 1.3 前端对接真实后端

当前 `src/lib/api.ts` 使用内存 mock 数据。切换为真实 API 的步骤：
1. 将 `apiClient` 中的 mock 实现替换为 `axios` 实例
2. 确保 `VITE_API_BASE_URL` 指向运行中的后端地址
3. 统一响应拦截器处理 `StandardResponse` 格式：`response.data.data`

---

## 2. 如何运行测试

### 2.1 后端测试（pytest）

```bash
cd transcript_maximizer

# 运行全部测试
pytest

# 运行指定模块
pytest tests/test_transcripts.py
pytest tests/test_pipelines.py
pytest tests/test_content.py

# 带覆盖率报告
pytest --cov=app --cov-report=term-missing
```

当前测试集共 **17 条用例**，覆盖：
- 录音稿 CRUD（上传/列表/详情/更新/删除）
- 三个 AI Pipeline（社媒/Skill/课程）的 mock 调用链路
- Skill 去重合并的完整闭环验证
- 内容管理接口（社媒列表/Skill 筛选/课程详情）

覆盖率：**78%**

### 2.2 测试配置说明

`pytest.ini` 关键项：

```ini
[pytest]
asyncio_mode = auto
testpaths = tests
```

测试使用 `sqlite` + 内存模式作为测试数据库（`tests/conftest.py` 中配置），无需真实 PostgreSQL 即可运行。

### 2.3 前端测试（jest）

```bash
cd frontend

# 运行全部测试
npm run test

# 运行一次（CI 模式）
npm run test -- --run

# 带覆盖率
npm run test -- --coverage
```

> 当前前端项目尚未编写 UI 测试，建议在后续迭代中为关键页面（上传、Pipeline 触发）补充 `React Testing Library` 用例。

---

## 3. AI Pipeline 的 Prompt 调优指南

系统三条工作流的核心质量取决于 LLM System Prompt 的设计。Prompt 文件位于后端 `app/services/` 目录下。

### 3.1 社媒生成 Pipeline

**文件**：`app/services/pipeline_social_media.py`

涉及两个 Prompt：

| Prompt 常量 | 作用 | 调优方向 |
|-------------|------|----------|
| `SYSTEM_PROMPT_INSIGHT` | 从录音中提取高价值洞察 | 调整评分标准（当前 ≥3 分保留）、增加/删除关注的知识点类别 |
| `SYSTEM_PROMPT_XIAOHONGSHU` | 基于洞察生成小红书草稿 | 修改语气风格（更专业 / 更活泼）、调整标签数量、增加平台适配（如抖音/公众号） |

**示例：增加抖音风格适配**

在 `SYSTEM_PROMPT_XIAOHONGSHU` 中追加：
```python
"""
- 如指定 platform="douyin"，标题需控制在 20 字以内，节奏更快，多用反问句和悬念。
"""
```

然后在 `schemas.py` 的 `PipelineSocialMediaInput` 中增加 `platform` 字段，并在路由层透传。

### 3.2 Skill 提取 Pipeline

**文件**：`app/services/pipeline_skills.py`

**Prompt 常量**：`SYSTEM_PROMPT_SKILLS`

调优方向：
- **视角扩展**：当前仅 `interviewer` / `candidate`，可新增 `hr`、`mentor` 等视角
- **范式修改**：当前为 `[场景]-[动作]-[预期结果]`，可扩展为 `[场景]-[动作]-[预期结果]-[常见错误]`
- **泛化规则**：在 Prompt 中追加更多需去除的隐私信息类型（如学校名、项目名）

**去重阈值调整**：

在 `run_skills_pipeline` 中修改 `threshold`：
```python
similar_ids = await find_similar_skill_entries(db, skill.id, threshold=0.90)  # 更严格
```

### 3.3 课程生成 Pipeline

**文件**：`app/services/pipeline_course.py`

涉及两个 Prompt：

| Prompt 常量 | 作用 | 调优方向 |
|-------------|------|----------|
| `SYSTEM_PROMPT_OUTLINE` | 基于聚类主题生成课程大纲 | 调整课时数量（当前 8–10 节）、增加受众细分（如「文科生专场」）、修改递进关系要求 |
| `SYSTEM_PROMPT_LESSON_CONTENT` | 基于大纲生成逐字讲义 | 调整口语化程度、增加案例数量要求、追加「课堂互动环节」输出 |

**聚类参数调整**：

在 `_cluster_fragments()` 中：
```python
n_clusters = min(max(3, len(fragments) // 5), 10, len(fragments))
# 可修改为按主题密度自适应，如：
# n_clusters = min(max(5, len(fragments) // 8), 12, len(fragments))
```

### 3.4 Prompt 调优的验证流程

1. **修改 Prompt 文本**
2. **更新 mock 测试数据**（`tests/test_pipelines.py` 中的 `mock_insight`、`mock_drafts`、`mock_skills`、`mock_outline` 等），确保与 Prompt 要求的 JSON Schema 一致
3. **运行测试**：`pytest tests/test_pipelines.py`
4. **手动端到端验证**：启动服务后，通过 Swagger UI 或前端触发真实 Pipeline，检查输出质量
5. **记录版本**：建议将 Prompt 的变更记录到 `docs/CHANGELOG.md`，标注修改日期、修改人、效果评估

> **注意**：Prompt 调整后务必同步更新 mock 测试，否则会导致测试失败（mock 返回的 JSON key 与实际 Prompt 要求的不匹配）。

---

## 4. 数据库迁移操作（Alembic）

### 4.1 常用命令

```bash
cd transcript_maximizer

# 升级到最新版本
alembic upgrade head

# 降级一个版本
alembic downgrade -1

# 查看当前版本
alembic current

# 查看历史版本
alembic history --verbose

# 生成新迁移脚本（修改 models.py 后执行）
alembic revision --autogenerate -m "新增 xxx 表"
```

### 4.2 新增实体时的标准流程

1. 在 `app/models.py` 中定义新的 SQLAlchemy Model
2. 在 `app/schemas.py` 中定义对应的 Pydantic Schema
3. 生成迁移脚本：`alembic revision --autogenerate -m "新增 xxx 表"`
4. 检查生成的迁移脚本（`alembic/versions/xxx_新增_xxx_表.py`），确认 `upgrade()` 和 `downgrade()` 正确
5. 执行迁移：`alembic upgrade head`
6. 在 `app/routers/` 中新增路由或在现有路由中暴露新实体的 CRUD 接口
7. 补充 pytest 用例

### 4.3 pgvector 向量字段注意事项

- 生产环境使用 `pgvector` 的 `VECTOR(dim)` 类型（dim=1536，对应 `text-embedding-3-small`）
- 测试环境（SQLite）使用 `models.py` 中自定义的 `Vector` fallback 类型，以 JSON 字符串形式存储
- 迁移脚本中，向量字段在 Alembic 里声明为 `sa.Text`，实际由 `pgvector` 扩展处理

---

## 5. 添加新工作流的扩展指南

若需新增第 4 条 AI Pipeline（例如：生成面试题库、产出图文长文），按以下步骤扩展：

### 5.1 后端扩展

#### 步骤 1：实现 Pipeline 服务

在 `app/services/` 下新建文件，例如 `pipeline_interview_questions.py`：

```python
from sqlalchemy.orm import Session
from app.models import RecordingTranscript, ProcessingStatus
from app.services.llm_client import chat_completion_json

SYSTEM_PROMPT = """你是一位面试题库专家..."""

async def run_interview_questions_pipeline(db: Session, transcript: RecordingTranscript):
    # 1. 预处理
    # 2. LLM 调用
    # 3. 结果存储
    # 4. 状态更新
    pass
```

#### 步骤 2：定义请求/响应 Schema

在 `app/schemas.py` 中追加：

```python
class PipelineInterviewQuestionsInput(BaseModel):
    transcript_id: uuid.UUID

class InterviewQuestionItem(BaseModel):
    question: str
    answer_reference: str
    difficulty: str

class InterviewQuestionsResult(BaseModel):
    questions: List[InterviewQuestionItem]
```

#### 步骤 3：注册路由

在 `app/routers/pipelines.py` 中追加：

```python
from app.services.pipeline_interview_questions import run_interview_questions_pipeline
from app.schemas import PipelineInterviewQuestionsInput, InterviewQuestionsResult

@router.post("/interview-questions", response_model=StandardResponse)
async def pipeline_interview_questions(payload: PipelineInterviewQuestionsInput, db: Session = Depends(get_db)):
    # 参照现有 pipeline 路由实现异常处理与状态校验
    ...
```

#### 步骤 4：补充测试

在 `tests/test_pipelines.py` 中追加 mock 测试用例，验证 JSON 解析、状态流转、数据落库。

### 5.2 前端扩展

#### 步骤 1：新增 API 封装

在 `src/lib/api.ts` 中追加：

```typescript
export async function generateInterviewQuestions(transcriptId: string) {
  // 当前 mock 实现
  // 后端就绪后替换为真实 fetch/axios 调用
}
```

#### 步骤 2：新增页面或弹窗

根据功能复杂度选择：
- 简单结果展示：在 **录音稿详情页** 新增按钮 + 弹窗
- 独立管理模块：参照 `SocialMedia.tsx` / `Skills.tsx` 新建页面组件，并在 `Layout.tsx` 侧边栏注册路由

#### 步骤 3：更新类型定义

在 `src/lib/types.ts` 中追加新实体的 TypeScript interface。

### 5.3 部署扩展

- 若新 Pipeline 依赖额外的 Python 包，更新 `transcript_maximizer/requirements.txt`
- 若需要新增环境变量，同步更新：
  - `app/config.py`
  - `.env.example`
  - `DEPLOYMENT.md` 中的环境变量清单表
- 若需要新增数据表，执行 Alembic 迁移流程（见第 4 节）

---

## 6. 常用调试技巧

### 查看后端日志

```bash
# Docker 模式
docker-compose logs -f backend

# 本地模式
uvicorn app.main:app --reload --log-level debug
```

### 直接调用 API 测试 Pipeline

```bash
# 先上传一篇录音稿，拿到 transcript_id
curl -X POST "http://localhost:8000/api/v1/pipeline/social-media" \
  -H "Content-Type: application/json" \
  -d '{"transcript_id": "<uuid>"}' | jq .
```

### 检查数据库内容

```bash
docker-compose exec postgres psql -U appuser -d audioprofit -c "SELECT id, title, status FROM recording_transcripts ORDER BY created_at DESC LIMIT 5;"
```

### 检查向量相似度

```bash
docker-compose exec postgres psql -U appuser -d audioprofit -c "SELECT id, scenario, 1 - (embedding <=> (SELECT embedding FROM skill_entries LIMIT 1)) AS similarity FROM skill_entries LIMIT 5;"
```
