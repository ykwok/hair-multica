# API 使用文档

> 基于后端 OpenAPI/Swagger 输出整理。启动服务后亦可访问交互式文档：`http://localhost:8000/docs`

---

## 概述

- **Base URL**: `http://localhost:8000/api/v1`
- **统一响应格式** (`APIResponse`):

```json
{
  "success": true,
  "data": { ... },
  "meta": { "page": 1, "per_page": 20, "total": 100 },
  "error": null
}
```

错误响应：

```json
{
  "success": false,
  "data": null,
  "meta": null,
  "error": {
    "code": "NOT_FOUND",
    "message": "Image not found",
    "details": {}
  }
}
```

- **认证说明**：当前版本使用 `openid` 作为用户标识，未启用独立认证中间件。生产环境建议在 `app/main.py` 中追加 OAuth2 / JWT 依赖。

---

## 接口清单

| # | 方法 | 路径 | 说明 |
|---|------|------|------|
| 1 | `POST` | `/api/v1/upload` | 上传用户照片 |
| 2 | `POST` | `/api/v1/analyze-face` | 脸型分析 |
| 3 | `GET` | `/api/v1/hairstyles` | 发型库列表（支持筛选与搜索） |
| 4 | `POST` | `/api/v1/generate-hairstyle` | AI 换发型（异步任务） |
| 5 | `GET` | `/api/v1/tasks/{task_id}` | 查询异步任务状态与结果 |
| 6 | `POST` | `/api/v1/ai-comment` | AI 造型师点评 |
| 7 | `GET` | `/api/health` | 健康检查 |

---

## 1. 图片上传

### `POST /api/v1/upload`

上传用户照片，支持 JPEG、PNG、WebP、GIF 格式，最大 10MB。

#### 请求参数

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `file` | `file` (Form) | ✅ | 图片文件，仅接受 `image/jpeg`、`image/png`、`image/webp`、`image/gif` |

#### cURL 示例

```bash
curl -X POST "http://localhost:8000/api/v1/upload" \
  -F "file=@/path/to/photo.jpg"
```

#### 响应示例（200 OK）

```json
{
  "success": true,
  "data": {
    "image_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "url": "http://localhost:8000/uploads/2026/05/11/abc123.jpg"
  },
  "meta": null,
  "error": null
}
```

#### 错误码

| 状态码 | 说明 |
|--------|------|
| `400` | 文件类型不支持 |
| `413` | 文件大小超过 10MB 限制 |

---

## 2. 脸型分析

### `POST /api/v1/analyze-face`

基于多模态 LLM 分析上传照片中的人脸特征，返回脸型与面部尺寸数据。同一图片多次调用会返回缓存结果。

#### 请求体（JSON）

```json
{
  "image_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

#### cURL 示例

```bash
curl -X POST "http://localhost:8000/api/v1/analyze-face" \
  -H "Content-Type: application/json" \
  -d '{"image_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"}'
```

#### 处理流程
1. 校验图片是否存在
2. 检查是否已有分析结果，有则直接返回缓存
3. 下载图片字节，调用 LLM Vision 模型进行分析
4. 解析 JSON 结果，存储 `FaceAnalysis` 记录
5. 返回脸型数据

#### 响应示例

```json
{
  "success": true,
  "data": {
    "id": "f1a2b3c4-d5e6-7890-abcd-ef1234567890",
    "image_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "face_shape": "oval",
    "forehead_width": 14.2,
    "cheekbone_width": 13.8,
    "jawline_width": 11.5,
    "face_length": 19.0,
    "features": {
      "skin_tone": "medium",
      "eye_shape": "almond"
    }
  },
  "meta": null,
  "error": null
}
```

#### 脸型枚举值

| 值 | 说明 |
|----|------|
| `oval` | 椭圆脸 |
| `round` | 圆脸 |
| `square` | 方脸 |
| `heart` | 心形脸 |
| `long` | 长脸 |
| `diamond` | 菱形脸 |

#### 错误码

| 状态码 | 说明 |
|--------|------|
| `404` | 图片不存在 |

---

## 3. 发型库

### `GET /api/v1/hairstyles`

分页查询发型库，支持多维度筛选与关键词搜索。首次调用会自动将 30+ 款种子数据写入数据库。

#### 请求参数（Query）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `category` | `string` | ❌ | 性别：`male` / `female` / `unisex` |
| `style` | `string` | ❌ | 风格：`straight` / `curly` / `braid` / `dye` |
| `length` | `string` | ❌ | 长度：`short` / `medium` / `long` |
| `scene` | `string` | ❌ | 场景：`daily` / `work` / `date` / `party` |
| `face_type` | `string` | ❌ | 脸型适配：`oval` / `round` / `square` / `heart` / `long` / `diamond` |
| `keyword` | `string` | ❌ | 关键词搜索（匹配名称、描述、标签） |
| `page` | `integer` | ❌ | 页码，默认 1，≥1 |
| `per_page` | `integer` | ❌ | 每页条数，默认 20，范围 1–100 |

#### cURL 示例

```bash
# 筛选男性短发
curl "http://localhost:8000/api/v1/hairstyles?category=male&length=short&page=1&per_page=10"

# 关键词搜索
curl "http://localhost:8000/api/v1/hairstyles?keyword=清爽"

# 按脸型适配筛选
curl "http://localhost:8000/api/v1/hairstyles?face_type=oval"
```

#### 响应示例

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "hs-001",
        "name": "清爽短发",
        "category": "male",
        "style": "straight",
        "length": "short",
        "scene": "work",
        "description": "干净利落，适合职场与日常，凸显面部轮廓。",
        "cover_image_url": "https://images.unsplash.com/photo-xxx?w=400",
        "thumbnail_url": "https://images.unsplash.com/photo-xxx?w=200",
        "tags": ["职场", "清爽", "易打理"],
        "face_type_suitability": ["oval", "square", "diamond"],
        "prompt_for_generation": "A man with a clean short haircut...",
        "sort_order": 1,
        "created_at": "2026-05-11T10:00:00Z",
        "updated_at": "2026-05-11T10:00:00Z"
      }
    ],
    "total": 32
  },
  "meta": {
    "page": 1,
    "per_page": 10,
    "total": 32
  },
  "error": null
}
```

---

## 4. AI 换发型

### `POST /api/v1/generate-hairstyle`

提交 AI 换发型异步任务。支持选择发型库中的发型，或输入自定义描述。任务创建后立即返回 `task_id`，需通过任务查询接口轮询结果。

#### 请求体（JSON）

```json
{
  "image_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "hairstyle_id": "hs-001",
  "custom_prompt": "Give me a cool undercut",
  "mode": "hd"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `image_id` | `string` | ✅ | 用户上传的照片 ID |
| `hairstyle_id` | `string` | ❌ | 发型库中的发型 ID（与 `custom_prompt` 二选一或同时提供） |
| `custom_prompt` | `string` | ❌ | 自定义发型描述（英文效果更佳） |
| `mode` | `string` | ❌ | 生成模式：`preview`（快速预览）/ `hd`（高清，默认） |

#### cURL 示例

```bash
# 使用发型库中的发型
curl -X POST "http://localhost:8000/api/v1/generate-hairstyle" \
  -H "Content-Type: application/json" \
  -d '{
    "image_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "hairstyle_id": "hs-001",
    "mode": "hd"
  }'

# 自定义描述
curl -X POST "http://localhost:8000/api/v1/generate-hairstyle" \
  -H "Content-Type: application/json" \
  -d '{
    "image_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "custom_prompt": "Short bob with bangs",
    "mode": "preview"
  }'
```

#### 处理流程
1. 校验图片是否存在
2. 如提供 `hairstyle_id`，读取发型名称与生成 Prompt
3. 构建完整生成 Prompt（保留用户面部特征 + 更换发型）
4. 创建 `GenerationTask` 记录（状态 `pending`）
5. 启动后台异步任务，调用 LLM Provider 生成图像
6. 下载生成结果并存储到本地/S3
7. 创建 `GenerateResult` 记录，更新任务状态为 `success`

#### 响应示例

```json
{
  "success": true,
  "data": {
    "task_id": "t1a2b3c4-d5e6-7890-abcd-ef1234567890",
    "status": "pending"
  },
  "meta": null,
  "error": null
}
```

#### 错误码

| 状态码 | 说明 |
|--------|------|
| `404` | 图片不存在 |

---

## 5. 任务状态查询

### `GET /api/v1/tasks/{task_id}`

查询异步任务的当前状态与结果。前端应轮询此接口直至任务到达终态（`success` 或 `failed`）。

#### 路径参数

| 字段 | 类型 | 说明 |
|------|------|------|
| `task_id` | `string` | 任务唯一标识 |

#### cURL 示例

```bash
curl "http://localhost:8000/api/v1/tasks/t1a2b3c4-d5e6-7890-abcd-ef1234567890"
```

#### 响应示例 — 处理中

```json
{
  "success": true,
  "data": {
    "task_id": "t1a2b3c4-d5e6-7890-abcd-ef1234567890",
    "task_type": "generate",
    "status": "running",
    "result_id": null,
    "result_url": null,
    "error_message": null,
    "created_at": "2026-05-11T10:00:00Z",
    "updated_at": "2026-05-11T10:00:05Z"
  },
  "meta": null,
  "error": null
}
```

#### 响应示例 — 成功

```json
{
  "success": true,
  "data": {
    "task_id": "t1a2b3c4-d5e6-7890-abcd-ef1234567890",
    "task_type": "generate",
    "status": "success",
    "result": {
      "id": "r1a2b3c4-d5e6-7890-abcd-ef1234567890",
      "image_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "hairstyle_id": "hs-001",
      "custom_prompt": null,
      "result_image_url": "http://localhost:8000/uploads/2026/05/11/generated_t1a2b3c4.png",
      "status": "success",
      "created_at": "2026-05-11T10:00:10Z"
    },
    "result_url": "http://localhost:8000/uploads/2026/05/11/generated_t1a2b3c4.png",
    "error_message": null,
    "created_at": "2026-05-11T10:00:00Z",
    "updated_at": "2026-05-11T10:00:10Z"
  },
  "meta": null,
  "error": null
}
```

#### 响应示例 — 失败

```json
{
  "success": true,
  "data": {
    "task_id": "t1a2b3c4-d5e6-7890-abcd-ef1234567890",
    "task_type": "generate",
    "status": "failed",
    "result": null,
    "result_url": null,
    "error_message": "fal.ai job timed out after 120s",
    "created_at": "2026-05-11T10:00:00Z",
    "updated_at": "2026-05-11T10:02:00Z"
  },
  "meta": null,
  "error": null
}
```

#### 错误码

| 状态码 | 说明 |
|--------|------|
| `404` | 任务不存在 |

---

## 6. AI 造型师点评

### `POST /api/v1/ai-comment`

基于用户原图与目标发型，生成多维度造型点评。支持三种人格风格，输出六维评分、雷达图数据、亮点与小贴士。

#### 请求体（JSON）

```json
{
  "image_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "hairstyle_id": "hs-001",
  "hairstyle_info": "清爽短发",
  "personality_type": "warm_bestie"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `image_id` | `string` | ✅ | 用户上传的照片 ID |
| `hairstyle_id` | `string` | ❌ | 发型库中的发型 ID |
| `hairstyle_info` | `string` | ❌ | 发型名称或描述（用于点评上下文） |
| `personality_type` | `string` | ❌ | 人格风格：`warm_bestie`（温柔闺蜜，默认）/ `sassy_stylist`（毒舌造型师）/ `knowledge_blogger`（知识型博主） |

#### cURL 示例

```bash
# 温柔闺蜜风格
curl -X POST "http://localhost:8000/api/v1/ai-comment" \
  -H "Content-Type: application/json" \
  -d '{
    "image_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "hairstyle_id": "hs-001",
    "hairstyle_info": "清爽短发",
    "personality_type": "warm_bestie"
  }'

# 毒舌造型师风格
curl -X POST "http://localhost:8000/api/v1/ai-comment" \
  -H "Content-Type: application/json" \
  -d '{
    "image_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "hairstyle_info": "羊毛卷",
    "personality_type": "sassy_stylist"
  }'
```

#### 处理流程
1. 校验图片是否存在
2. 读取该图片的脸型分析结果（如有）
3. 如提供 `hairstyle_id`，读取发型名称与参考图
4. 根据 `personality_type` 选择对应的 System Prompt
5. 构建多模态输入（用户原图 + 目标发型参考图 + 文本 Prompt）
6. 调用 LLM Vision 模型生成点评 JSON
7. 解析六维评分，计算综合评分（1–10 分均值）
8. 存储 `AIComment` 记录并返回

#### 响应示例

```json
{
  "success": true,
  "data": {
    "id": "c1a2b3c4-d5e6-7890-abcd-ef1234567890",
    "image_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "hairstyle_id": "hs-001",
    "personality": "warm_bestie",
    "comment_text": "亲爱的，这款清爽短发真的超适合你！你的鹅蛋脸配上这种利落的发型，整个人都显得精神又干练...",
    "scores": {
      "face_match": 9,
      "hair_quality": 8,
      "style": 9,
      "emotion": 8,
      "knowledge": 7,
      "humor": 6
    },
    "rating": 8,
    "highlights": ["超显脸小", "温柔感满满"],
    "tip": "记得用护发精油保持光泽感哦~",
    "tags": ["职场", "清爽"],
    "created_at": "2026-05-11T10:00:00Z"
  },
  "meta": null,
  "error": null
}
```

#### 六维评分说明

| 维度 | 说明 |
|------|------|
| `face_match` | 脸型适配度（1–10） |
| `hair_quality` | 发质匹配度（1–10） |
| `style` | 风格气质匹配度（1–10） |
| `emotion` | 情绪价值（1–10） |
| `knowledge` | 专业冷知识（1–10） |
| `humor` | 幽默互动（1–10） |

#### 错误码

| 状态码 | 说明 |
|--------|------|
| `404` | 图片不存在 |

---

## 7. 健康检查

### `GET /api/health`

服务存活探测。

#### 响应示例

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "service": "hair-multica-backend"
  },
  "meta": null,
  "error": null
}
```

---

## 前端 API 客户端封装

前端使用 `src/lib/api/client.ts` 统一封装 HTTP 请求，核心方法：

```typescript
import { api } from "@/lib/api/client";

// GET 请求
const hairstyles = await api.get<HairstyleListResponse>("/hairstyles", {
  params: { category: "male", page: 1, per_page: 10 }
});

// POST 请求
const task = await api.post<GenerateTaskResponse>("/generate-hairstyle", {
  image_id: "xxx",
  hairstyle_id: "hs-001",
  mode: "hd",
});

// 轮询任务状态
const result = await api.poll<TaskStatus>(`/tasks/${task.task_id}`, {
  interval: 2000,      // 每 2 秒查询一次
  maxAttempts: 120,    // 最多 120 次（4 分钟）
  isComplete: (data) => data.status === "success" || data.status === "failed",
});
```
