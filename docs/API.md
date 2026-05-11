# API 使用文档

> 基于后端 OpenAPI/Swagger 输出整理。启动服务后亦可访问交互式文档：`http://localhost:8000/docs`

---

## 概述

- **Base URL**: `http://localhost:8000/api/v1`
- **统一响应格式** (`StandardResponse`):

```json
{
  "success": true,
  "data": { ... },
  "meta": null,
  "error": null
}
```

- **分页响应格式** (`PaginatedResponse`):

```json
{
  "items": [ ... ],
  "page": 1,
  "per_page": 20,
  "total": 100,
  "has_more": true
}
```

- **认证说明**：当前版本为内部管理后台使用，未启用独立认证中间件。生产环境建议在 `app/main.py` 中追加 OAuth2 / JWT 依赖。

---

## 接口清单

| # | 方法 | 路径 | 说明 |
|---|------|------|------|
| 1 | `POST` | `/api/v1/transcripts` | 上传录音文字稿 |
| 2 | `GET` | `/api/v1/transcripts` | 录音稿列表（分页/搜索/状态筛选） |
| 3 | `GET` | `/api/v1/transcripts/{id}` | 录音稿详情 |
| 4 | `PATCH` | `/api/v1/transcripts/{id}` | 更新录音稿标题 |
| 5 | `DELETE` | `/api/v1/transcripts/{id}` | 删除录音稿 |
| 6 | `POST` | `/api/v1/pipeline/social-media` | 工作流 1：生成社交媒体草稿 |
| 7 | `POST` | `/api/v1/pipeline/skills` | 工作流 3：提取 Skill 并去重 |
| 8 | `POST` | `/api/v1/pipeline/course` | 工作流 2：生成体系化课程 |
| 9 | `GET` | `/api/v1/social-media` | 社交媒体内容列表 |
| 10 | `GET` | `/api/v1/skills` | Skill 库列表（支持语义搜索） |
| 11 | `GET` | `/api/v1/courses` | 课程列表 |
| 12 | `GET` | `/api/v1/courses/{id}` | 课程详情（含课时结构） |

---

## 1. 录音稿管理

### `POST /api/v1/transcripts`

上传录音文字稿（支持 TXT / Markdown，最大 20MB）。

#### 请求参数

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `title` | `string` (Form) | ✅ | 标题，1–255 字符 |
| `file` | `file` (Form) | ✅ | 文件，仅接受 `.txt` / `.md` / `.markdown`，UTF-8 编码 |

#### cURL 示例

```bash
curl -X POST "http://localhost:8000/api/v1/transcripts" \
  -F "title=第3期辅导录音" \
  -F "file=@/path/to/transcript.txt"
```

#### 响应示例（200 OK）

```json
{
  "success": true,
  "data": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "title": "第3期辅导录音",
    "filename": "transcript.txt",
    "file_size": 15360,
    "word_count": 3200,
    "status": "pending",
    "mime_type": "text/plain",
    "raw_text": "...",
    "processed_text": null,
    "error_message": null,
    "created_at": "2026-05-11T10:00:00Z",
    "updated_at": "2026-05-11T10:00:00Z"
  }
}
```

#### 错误码

| 状态码 | 说明 |
|--------|------|
| `400` | 文件编码错误（非 UTF-8） |
| `413` | 文件大小超过 20MB 限制 |
| `415` | 文件格式不支持 |
| `422` | 文件内容为空 |

---

### `GET /api/v1/transcripts`

分页查询录音稿列表，支持搜索与状态筛选。

#### 请求参数（Query）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `q` | `string` | ❌ | 搜索关键词（匹配标题与原文） |
| `status` | `string` | ❌ | 状态筛选：`pending` / `processing` / `completed` / `failed` |
| `page` | `integer` | ❌ | 页码，默认 1，≥1 |
| `per_page` | `integer` | ❌ | 每页条数，默认 20，范围 1–100 |

#### cURL 示例

```bash
curl "http://localhost:8000/api/v1/transcripts?q=简历&status=completed&page=1&per_page=10"
```

#### 响应示例

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "title": "第3期辅导录音",
        "filename": "transcript.txt",
        "file_size": 15360,
        "word_count": 3200,
        "status": "completed",
        "created_at": "2026-05-11T10:00:00Z",
        "updated_at": "2026-05-11T10:30:00Z"
      }
    ],
    "page": 1,
    "per_page": 10,
    "total": 1,
    "has_more": false
  }
}
```

---

### `GET /api/v1/transcripts/{transcript_id}`

获取单篇录音稿详情。

#### 路径参数

| 字段 | 类型 | 说明 |
|------|------|------|
| `transcript_id` | `UUID` | 录音稿唯一标识 |

#### 响应示例

```json
{
  "success": true,
  "data": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "title": "第3期辅导录音",
    "filename": "transcript.txt",
    "file_size": 15360,
    "mime_type": "text/plain",
    "raw_text": "原始录音转写文本...",
    "processed_text": "清洗后的文本...",
    "word_count": 3200,
    "status": "completed",
    "error_message": null,
    "created_at": "2026-05-11T10:00:00Z",
    "updated_at": "2026-05-11T10:30:00Z"
  }
}
```

#### 错误码

| 状态码 | 说明 |
|--------|------|
| `404` | 录音稿不存在 |

---

### `PATCH /api/v1/transcripts/{transcript_id}`

更新录音稿标题。

#### 请求体（JSON）

```json
{
  "title": "修改后的标题"
}
```

#### 响应示例

```json
{
  "success": true,
  "data": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "title": "修改后的标题",
    "status": "completed",
    "created_at": "2026-05-11T10:00:00Z",
    "updated_at": "2026-05-11T11:00:00Z"
  }
}
```

---

### `DELETE /api/v1/transcripts/{transcript_id}`

删除录音稿及其关联内容（社媒草稿、Skill 条目、内容片段级联删除）。

#### 响应示例

```json
{
  "success": true,
  "data": {
    "deleted": true
  }
}
```

---

## 2. AI Pipeline

### `POST /api/v1/pipeline/social-media`

工作流 1：基于单篇录音稿生成 3–5 条小红书风格社交媒体草稿。

#### 请求体（JSON）

```json
{
  "transcript_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

#### cURL 示例

```bash
curl -X POST "http://localhost:8000/api/v1/pipeline/social-media" \
  -H "Content-Type: application/json" \
  -d '{"transcript_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"}'
```

#### 处理流程
1. 文本预处理（清洗语气词、时间戳、滑动窗口切片）
2. LLM 洞察提取（按 1–5 分评分，仅保留 ≥3 分）
3. 存储 `ContentFragment` 并生成 embedding
4. LLM 生成小红书草稿（标题 + 正文 + 配图建议 + 标签）
5. 存储 `SocialMediaContent`，更新录音稿状态为 `completed`

#### 响应示例（200 OK）

```json
{
  "success": true,
  "data": {
    "drafts": [
      {
        "title": "简历这么写，HR 一眼记住你🔥",
        "body": "应届生最容易踩的 3 个坑：...",
        "image_suggestions": ["对比图：好简历 vs 差简历", "STAR 法则示意图"],
        "tags": ["应届生", "简历技巧", "求职干货"],
        "score": 4.5
      }
    ]
  }
}
```

#### 错误码

| 状态码 | 说明 |
|--------|------|
| `404` | 录音稿不存在 |
| `409` | 该录音稿正在处理中 |
| `422` | 有效信息不足，无法生成社交媒体内容 |
| `500` | LLM 处理失败 |

---

### `POST /api/v1/pipeline/skills`

工作流 3：从录音稿中双视角提取 Skill，自动向量去重合并。

#### 请求体（JSON）

```json
{
  "transcript_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

#### cURL 示例

```bash
curl -X POST "http://localhost:8000/api/v1/pipeline/skills" \
  -H "Content-Type: application/json" \
  -d '{"transcript_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"}'
```

#### 处理流程
1. 文本预处理与切片
2. LLM 双视角 Skill 提取（`interviewer` / `candidate`）
3. 每条 Skill 遵循 `[场景]-[动作]-[预期结果]` 范式，去除个人隐私信息
4. 生成 embedding，相似度 >0.85 时自动合并字段并删除重复项
5. `metadata_json.merged_from` 记录合并溯源

#### 响应示例

```json
{
  "success": true,
  "data": {
    "skills": [
      {
        "perspective": "candidate",
        "scenario": "自我介绍",
        "action": "准备 1 分钟版本和 3 分钟版本",
        "expected_result": "让面试官快速了解核心优势"
      },
      {
        "perspective": "interviewer",
        "scenario": "评估项目经验",
        "action": "追问候选人在项目中的具体职责与量化成果",
        "expected_result": "区分参与者与主导者"
      }
    ],
    "merged_count": 2
  }
}
```

#### 错误码

| 状态码 | 说明 |
|--------|------|
| `404` | 录音稿不存在 |
| `409` | 该录音稿正在处理中 |
| `422` | 有效信息不足 |
| `500` | 处理失败 |

---

### `POST /api/v1/pipeline/course`

工作流 2：基于历史高质量内容片段生成体系化课程（支持自动触发）。

#### 请求体（JSON）

```json
{
  "topic_tag": "面试",
  "auto_trigger": false
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `topic_tag` | `string` | ❌ | 主题过滤标签，匹配 `ContentFragment.category` |
| `auto_trigger` | `boolean` | ❌ | 为 `true` 时校验累计字数是否 ≥50,000，不足则拒绝 |

#### cURL 示例

```bash
curl -X POST "http://localhost:8000/api/v1/pipeline/course" \
  -H "Content-Type: application/json" \
  -d '{"topic_tag": "面试", "auto_trigger": false}'
```

#### 处理流程
1. 收集 `score >= 3` 的 `ContentFragment`（可按 `topic_tag` 过滤）
2. `TfidfVectorizer` + `KMeans` 聚类（自适应簇数：3–10）
3. 按聚类主题生成课程大纲（8–10 节课）
4. 轮询映射课时到聚类，逐课生成详细讲义
5. 存储 `CourseModule` + `CourseLesson`，记录冲突与聚类数到 `metadata_json`

#### 响应示例

```json
{
  "success": true,
  "data": {
    "course_id": "b2c3d4e5-f6a7-8901-bcde-f23456789012",
    "title": "应届生面试通关课",
    "total_lessons": 3,
    "lessons": [
      {
        "id": "c3d4e5f6-a7b8-9012-cdef-345678901234",
        "lesson_number": 1,
        "title": "简历撰写",
        "outline": "如何写出好简历",
        "content": "讲义内容..."
      }
    ]
  }
}
```

#### 错误码

| 状态码 | 说明 |
|--------|------|
| `422` | 累计内容不足 50000 字（`auto_trigger=true`）/ 没有足够的高质量片段 |
| `500` | 课程生成失败 |

---

## 3. 内容管理

### `GET /api/v1/social-media`

社交媒体内容列表，支持全文搜索。

#### 请求参数（Query）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `q` | `string` | ❌ | 搜索关键词（匹配标题与正文） |
| `page` | `integer` | ❌ | 页码，默认 1 |
| `per_page` | `integer` | ❌ | 每页条数，默认 20 |

#### 响应示例

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "d4e5f6a7-b8c9-0123-def4-567890123456",
        "transcript_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "platform": "xiaohongshu",
        "title": "简历这么写，HR 一眼记住你🔥",
        "body": "应届生最容易踩的 3 个坑：...",
        "image_suggestions": ["对比图"],
        "tags": ["应届生", "简历技巧"],
        "score": 4.5,
        "is_published": false,
        "created_at": "2026-05-11T10:30:00Z"
      }
    ],
    "page": 1,
    "per_page": 20,
    "total": 1,
    "has_more": false
  }
}
```

---

### `GET /api/v1/skills`

Skill 库列表，支持按视角筛选与语义搜索。

#### 请求参数（Query）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `perspective` | `string` | ❌ | 视角筛选：`interviewer` / `candidate` |
| `q` | `string` | ❌ | 语义搜索查询（通过 embedding 相似度匹配） |
| `page` | `integer` | ❌ | 页码，默认 1 |
| `per_page` | `integer` | ❌ | 每页条数，默认 20 |

> 当提供 `q` 时，系统使用 `text-embedding-3-small` 生成查询向量，通过 pgvector 的 `<=>` 操作符进行相似度搜索，阈值 ≥0.85。

#### cURL 示例（语义搜索）

```bash
curl "http://localhost:8000/api/v1/skills?q=自我介绍&perspective=candidate&per_page=5"
```

#### 响应示例

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "e5f6a7b8-c9d0-1234-ef56-789012345678",
        "transcript_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "perspective": "candidate",
        "scenario": "自我介绍",
        "action": "准备 1 分钟版本和 3 分钟版本",
        "expected_result": "让面试官快速了解核心优势",
        "generalized": true,
        "similarity_group_id": null,
        "created_at": "2026-05-11T10:30:00Z"
      }
    ],
    "page": 1,
    "per_page": 5,
    "total": 1,
    "has_more": false
  }
}
```

---

### `GET /api/v1/courses`

课程列表，支持按标题搜索。

#### 请求参数（Query）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `q` | `string` | ❌ | 搜索关键词（匹配课程标题） |
| `page` | `integer` | ❌ | 页码，默认 1 |
| `per_page` | `integer` | ❌ | 每页条数，默认 20 |

#### 响应示例

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "b2c3d4e5-f6a7-8901-bcde-f23456789012",
        "title": "应届生面试通关课",
        "description": "系统化的求职培训",
        "total_lessons": 3,
        "status": "completed",
        "created_at": "2026-05-11T11:00:00Z",
        "updated_at": "2026-05-11T11:00:00Z"
      }
    ],
    "page": 1,
    "per_page": 20,
    "total": 1,
    "has_more": false
  }
}
```

---

### `GET /api/v1/courses/{course_id}`

课程详情，包含多级课时结构。

#### 响应示例

```json
{
  "success": true,
  "data": {
    "id": "b2c3d4e5-f6a7-8901-bcde-f23456789012",
    "title": "应届生面试通关课",
    "description": "系统化的求职培训",
    "total_lessons": 3,
    "status": "completed",
    "created_at": "2026-05-11T11:00:00Z",
    "updated_at": "2026-05-11T11:00:00Z",
    "lessons": [
      {
        "id": "c3d4e5f6-a7b8-9012-cdef-345678901234",
        "lesson_number": 1,
        "title": "简历撰写",
        "outline": "如何写出好简历",
        "content": "讲义内容..."
      },
      {
        "id": "d4e5f6a7-b8c9-0123-def4-567890123456",
        "lesson_number": 2,
        "title": "面试准备",
        "outline": "常见面试题",
        "content": "讲义内容..."
      }
    ]
  }
}
```

#### 错误码

| 状态码 | 说明 |
|--------|------|
| `404` | 课程不存在 |

---

## 4. 健康检查

### `GET /health`

服务存活探测。

#### 响应示例

```json
{
  "status": "ok",
  "version": "1.0.0"
}
```
