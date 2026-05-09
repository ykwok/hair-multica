# 发型宇宙 (Hair Multica) 部署指南

本项目包含基于 Next.js 的前端 H5 和基于 FastAPI 的后端 API。本文档说明如何在生产环境中部署这些组件。

## 1. 架构概览

- **前端**: Next.js (SSG/SSR)，推荐部署至 **Vercel**。
- **后端**: FastAPI + SQLite，部署于 **Docker 容器**。
- **持久化**: 
  - 数据库：SQLite (`/app/data/hair_multica.db`)
  - 上传存储：本地目录 (`/app/uploads`)
- **CI/CD**: GitHub Actions (后端) + Vercel Git Integration (前端)。

---

## 2. 前端部署 (Vercel)

### 步骤
1. 在 Vercel 中导入 GitHub 仓库。
2. 选择 `hair-multica` 目录。
3. 配置环境变量：
   - `NEXT_PUBLIC_API_BASE_URL`: 后端 API 的公网地址 (例如 `https://api.hair-multica.com/api`)。
4. 点击 Deploy。

### HTTPS 要求
Vercel 自动提供 HTTPS。由于 H5 调用相机和相册 API 必须在安全上下文 (HTTPS) 下运行，请确保使用 HTTPS 域名。

---

## 3. 后端部署 (Docker + VM)

推荐在拥有持久化磁盘的虚拟机（如 Google Compute Engine, Aliyun ECS）上运行。

### 环境准备
- 安装 Docker 和 Docker Compose。
- 配置域名并获取 SSL 证书（推荐使用 Caddy 或 Nginx + Let's Encrypt）。

### 部署流程
1. 克隆代码。
2. 创建 `.env.production` 文件（参考 `.env.production.example`）。
3. 运行构建并启动：
   ```bash
   docker-compose up -d --build
   ```

### 环境变量说明
- `DATABASE_URL`: `sqlite:///./data/hair_multica.db` (必须保留 `./data` 前缀以实现挂载持久化)。
- `STORAGE_LOCAL_PATH`: `./uploads`。
- `STORAGE_BASE_URL`: 访问上传图片的公网 URL 基地址。
- `CORS_ORIGINS`: 允许的前端域名列表，例如 `["https://hair-multica.vercel.app"]`。

---

## 4. CI/CD 配置

### 后端自动部署 (GitHub Actions)
在 GitHub 仓库设置中添加以下 Secrets：
- `SSH_HOST`: 服务器 IP 或域名。
- `SSH_USERNAME`: 登录用户名。
- `SSH_PRIVATE_KEY`: 用于连接服务器的私钥。

每当代码 push 到 `main` 分支时，`.github/workflows/deploy-backend.yml` 将自动执行：
1. 连接到服务器。
2. 更新代码。
3. 重启容器。

---

## 5. 健康检查与回滚

### 健康检查
访问 `https://<your-api-domain>/api/health`。返回 `{"status": "ok"}` 表示服务正常。

### 回滚方案
1. **前端**: 在 Vercel 控制台选择之前的 Deployment 进行 "Rollback"。
2. **后端**: 
   ```bash
   # 查看镜像历史
   docker images
   # 切换回旧镜像
   docker-compose stop
   # 修改 docker-compose.yml 镜像标签或通过 git checkout 历史版本后重启
   docker-compose up -d
   ```
