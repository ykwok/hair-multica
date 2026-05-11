# =============================================================================
# Frontend Dockerfile — React SPA
# Multi-stage build (build + nginx serve), target image < 50 MB
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Build
# -----------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package.json package-lock.json* ./
RUN npm ci --silent

# Copy source and build
COPY . .
RUN npm run build

# -----------------------------------------------------------------------------
# Stage 2: Runtime (nginx)
# -----------------------------------------------------------------------------
FROM nginx:alpine-slim AS runtime

# Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from builder
COPY --from=builder --chown=appuser:appgroup /app/dist /usr/share/nginx/html

# Switch to non-root user
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:3000/ || exit 1

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
