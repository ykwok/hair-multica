# 录音文字收益最大化系统 — 部署与运维文档

## 目录

1. [本地开发启动](#本地开发启动)
2. [生产环境部署](#生产环境部署)
3. [环境变量清单](#环境变量清单)
4. [健康检查验证](#健康检查验证)
5. [回滚方案](#回滚方案)
6. [故障排查](#故障排查)

---

## 本地开发启动

### 前置条件

- [Docker Engine](https://docs.docker.com/engine/install/) 24.0+
- [Docker Compose](https://docs.docker.com/compose/install/) v2.20+
- 至少 4 GB 可用内存

### 步骤

#### 1. 克隆仓库并进入项目目录

```bash
git clone <repo-url>
cd audio-profit-system
```

#### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env，填入真实的 API Key 和数据库密码
```

#### 3. 一键启动全部服务

```bash
# 生产模式（推荐用于本地验证）
docker-compose up --build

# 开发模式（支持热重载、源码挂载）
docker-compose -f docker-compose.yml -f docker-compose.override.yml up --build
```

首次启动时，`entrypoint.sh` 会自动：
1. 等待 PostgreSQL 就绪
2. 执行 `alembic upgrade head` 完成数据库迁移
3. （可选）运行种子数据脚本
4. 启动 FastAPI 应用

#### 4. 验证服务

| 服务 | 地址 | 说明 |
|------|------|------|
| 前端 | http://localhost:3000 | React SPA |
| 后端 API | http://localhost:8000 | FastAPI + 自动文档 |
| API 文档 | http://localhost:8000/docs | Swagger UI |
| PostgreSQL | localhost:5432 | 仅在 Docker 外部暴露 |
| Qdrant | http://localhost:6333 | 向量数据库 Dashboard |

#### 5. 停止服务

```bash
# 优雅停止
docker-compose down

# 完全清理（包括数据卷）
docker-compose down -v
```

---

## 生产环境部署

### 方案 A: Google Cloud Run（推荐）

适合无服务器、自动扩缩容场景。

```bash
# 1. 构建并推送镜像到 Artifact Registry
gcloud builds submit --tag gcr.io/PROJECT_ID/audio-profit-backend:latest ./backend
gcloud builds submit --tag gcr.io/PROJECT_ID/audio-profit-frontend:latest ./frontend

# 2. 部署后端
gcloud run deploy audio-profit-backend \
  --image gcr.io/PROJECT_ID/audio-profit-backend:latest \
  --platform managed \
  --region asia-east1 \
  --port 8000 \
  --set-env-vars DATABASE_URL="${DATABASE_URL}" \
  --set-env-vars SECRET_KEY="${SECRET_KEY}" \
  --set-env-vars OPENAI_API_KEY="${OPENAI_API_KEY}" \
  --allow-unauthenticated

# 3. 部署前端
gcloud run deploy audio-profit-frontend \
  --image gcr.io/PROJECT_ID/audio-profit-frontend:latest \
  --platform managed \
  --region asia-east1 \
  --port 3000 \
  --set-env-vars VITE_API_BASE_URL="https://audio-profit-backend-xxx.run.app" \
  --allow-unauthenticated
```

**注意**: Cloud Run 需搭配 [Cloud SQL](https://cloud.google.com/sql/docs/postgres/connect-run) 使用 PostgreSQL，或使用 [Cloud SQL Proxy](https://cloud.google.com/sql/docs/postgres/sql-proxy)。

### 方案 B: VPS / 独立服务器

适合固定成本、完全可控场景。

```bash
# 1. 服务器准备（Ubuntu 22.04 LTS）
sudo apt update && sudo apt install -y docker.io docker-compose-plugin nginx certbot

# 2. 拉取代码并配置
git clone <repo-url>
cd audio-profit-system
cp .env.example .env
# 编辑 .env，填入生产配置

# 3. 启动
docker-compose -f docker-compose.yml up -d

# 4. 配置 Nginx 反向代理 + SSL
sudo certbot --nginx -d your-domain.com
```

Nginx 示例配置：

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api/ {
        proxy_pass http://localhost:8000/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 方案 C: Kubernetes（大规模生产）

适合高可用、多副本、自动扩缩容场景。

```bash
# 使用项目中的 K8s manifest（如已提供）
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/secrets.yaml   # 通过 kubectl create secret 管理凭证
kubectl apply -f k8s/postgres.yaml
kubectl apply -f k8s/qdrant.yaml
kubectl apply -f k8s/backend.yaml
kubectl apply -f k8s/frontend.yaml
kubectl apply -f k8s/ingress.yaml
```

**关键生产配置**:
- 使用 Kubernetes Secrets 或外部密钥管理（AWS Secrets Manager / Vault）
- 配置 HPA（Horizontal Pod Autoscaler）
- 使用 PodDisruptionBudget 保证可用性
- 配置 NetworkPolicy 限制服务间通信

---

## 环境变量清单

| 变量名 | 必填 | 默认值 | 说明 |
|--------|------|--------|------|
| `APP_ENV` | 否 | `production` | 运行环境: `development` / `production` / `test` |
| `LOG_LEVEL` | 否 | `INFO` | 日志级别: `DEBUG` / `INFO` / `WARNING` / `ERROR` |
| `SECRET_KEY` | ✅ | — | 应用密钥（用于 JWT / Session 签名） |
| `POSTGRES_USER` | 否 | `appuser` | PostgreSQL 用户名 |
| `POSTGRES_PASSWORD` | ✅ | — | PostgreSQL 密码 |
| `POSTGRES_DB` | 否 | `audioprofit` | PostgreSQL 数据库名 |
| `DATABASE_URL` | ✅ | — | SQLAlchemy 数据库连接串 |
| `QDRANT_HOST` | 否 | `qdrant` | Qdrant 服务主机名 |
| `QDRANT_PORT` | 否 | `6333` | Qdrant 服务端口 |
| `QDRANT_COLLECTION` | 否 | `audio_chunks` | Qdrant 集合名 |
| `OPENAI_API_KEY` | ✅ | — | OpenAI API 密钥 |
| `OPENAI_MODEL` | 否 | `gpt-4o-mini` | 使用的 OpenAI 模型 |
| `NODE_ENV` | 否 | `production` | Node.js 运行环境 |
| `VITE_API_BASE_URL` | 否 | `http://localhost:8000` | 前端调用后端的基地址 |

---

## 健康检查验证

### 后端 Health Check

```bash
curl -s http://localhost:8000/health | jq .
```

期望响应：

```json
{
  "status": "healthy",
  "database": "connected",
  "qdrant": "connected",
  "timestamp": "2026-05-11T10:00:00Z"
}
```

### 前端 Health Check

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/
# 期望返回 200
```

### Docker 容器 Health Check

```bash
# 查看所有服务健康状态
docker-compose ps

# 查看具体容器健康检查日志
docker inspect --format='{{.State.Health.Status}}' audio-profit-backend
docker inspect --format='{{.State.Health.Status}}' audio-profit-frontend
```

### 全部服务一键验证

```bash
./scripts/health-check.sh
```

---

## 回滚方案

### 策略 1: Docker Compose 回滚（VPS / 本地）

```bash
# 1. 查看历史镜像
docker images | grep audio-profit

# 2. 修改 docker-compose.yml 使用旧镜像标签，或直接指定镜像 ID
#    编辑 docker-compose.yml:
#    backend:
#      image: audio-profit-backend:<previous-tag>

# 3. 重新部署（不停机）
docker-compose up -d

# 4. 验证回滚
curl http://localhost:8000/health
```

### 策略 2: Git + Docker 标签回滚

```bash
# 回滚到上一个已知稳定的 Git 标签
git checkout v1.2.3
docker-compose up --build -d
```

### 策略 3: Cloud Run 回滚

```bash
# 查看修订版本
gcloud run revisions list --service audio-profit-backend

# 回滚到指定修订
gcloud run services update-traffic audio-profit-backend \
  --to-revisions REVISION_NAME=100 \
  --region asia-east1
```

### 策略 4: 数据库回滚

```bash
# 回退 Alembic 迁移（慎用！建议先备份）
docker-compose exec backend alembic downgrade -1

# 或回退到指定版本
docker-compose exec backend alembic downgrade <revision-hash>
```

**数据库回滚前必做**:

```bash
# 备份当前数据库
docker-compose exec postgres pg_dump -U appuser audioprofit > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 紧急回滚清单

| 步骤 | 操作 | 预计耗时 |
|------|------|----------|
| 1 | 备份当前数据库 | 1–5 min |
| 2 | 切回上一个稳定镜像/版本 | 30 sec |
| 3 | 执行数据库降级（如 schema 变更） | 1–3 min |
| 4 | 验证 health check | 30 sec |
| 5 | 监控错误率和响应时间 | 5 min |

---

## 激活 CI 流水线

> 当前 CI 工作流文件以 `.github/ci.yml.disabled` 形式入库，**尚未激活**。原因如下：
>
> GitHub OAuth App 的授权 token 缺少 `workflow` scope，导致 agent 无法直接创建或修改 `.github/workflows/` 目录下的文件。这是 GitHub 的安全限制，防止未授权应用篡改仓库的 Actions 工作流。

### 手动激活步骤

```bash
# 1. 将 disabled 文件重命名为正式工作流路径
mv .github/ci.yml.disabled .github/workflows/ci.yml

# 2. 提交并推送
git add .github/workflows/ci.yml
git commit -m "ci: activate GitHub Actions workflow"
git push origin <your-branch>
```

推送后，进入 GitHub 仓库页面的 **Actions** 标签页即可看到流水线已启用。

### 由 Multica agent 自动推送（推荐）

如需 DevOpsAgent 或其他 agent 后续能直接维护 `.github/workflows/` 下的文件，请 workspace owner 执行以下操作：

1. 打开 GitHub 仓库所属 Organization / User 的 **Settings → Developer settings → OAuth Apps**
2. 找到当前 Multica workspace 使用的 OAuth App
3. 在 **Permissions** 中增加 `workflow` scope（或勾选 "Update GitHub Action workflows"）
4. 保存后，agent 即可正常推送 workflow 文件

> **注意**：增加 `workflow` scope 后，agent 将具备修改仓库 Actions 的权限。建议仅对受信任的 workspace 开启，并配合分支保护规则使用。

---

## 故障排查

### 服务无法启动

```bash
# 查看日志
docker-compose logs -f <service-name>

# 常见原因
# - .env 中必填变量未填写 → 检查 .env.example 对比
# - 端口被占用 → 修改 docker-compose.yml 端口映射
# - 内存不足 → docker system prune -a
```

### 数据库连接失败

```bash
# 检查 PostgreSQL 是否健康
docker-compose exec postgres pg_isready -U appuser

# 检查后端环境变量中的 DATABASE_URL 是否正确
```

### 镜像体积过大

```bash
# 分析镜像层
docker history audio-profit-backend:latest

# 清理构建缓存
docker builder prune -f
```

---

## 相关文件

| 文件 | 说明 |
|------|------|
| `docker-compose.yml` | 生产编排配置 |
| `docker-compose.override.yml` | 开发模式覆盖配置 |
| `.env.example` | 环境变量模板 |
| `backend/Dockerfile` | 后端多阶段构建 |
| `frontend/Dockerfile` | 前端多阶段构建 |
| `.github/ci.yml.disabled` | CI/CD 流水线（需重命名为 `.github/workflows/ci.yml` 激活） |
| `scripts/entrypoint.sh` | 后端启动入口（含自动迁移） |
| `scripts/init-db.sh` | 数据库初始化脚本 |
