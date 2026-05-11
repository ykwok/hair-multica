#!/bin/bash
# =============================================================================
# init-db.sh — One-time database initialization helper
# Usage: ./scripts/init-db.sh
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_ROOT/.env"

echo "========================================"
echo "🗄️  Database Initialization"
echo "========================================"

# Check .env exists
if [ ! -f "$ENV_FILE" ]; then
    echo "❌  .env file not found at $ENV_FILE"
    echo "   Please copy .env.example to .env and configure your secrets."
    exit 1
fi

# Source environment
export $(grep -v '^#' "$ENV_FILE" | xargs)

# Ensure Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌  Docker is not running. Please start Docker first."
    exit 1
fi

echo "📦  Starting PostgreSQL and Qdrant..."
docker-compose up -d postgres qdrant

echo "⏳  Waiting for services to be healthy..."
sleep 5

echo "🔄  Running Alembic migrations in backend container..."
docker-compose run --rm backend alembic upgrade head

echo "✅  Database initialized successfully!"
echo ""
echo "Next steps:"
echo "  docker-compose up -d   # Start all services"
echo "  docker-compose logs -f # Watch logs"
