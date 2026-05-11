#!/bin/sh
# =============================================================================
# Backend Entrypoint — Runs DB migrations then starts the application
# =============================================================================

set -e

echo "========================================"
echo "🚀  Audio Profit Backend Entrypoint"
echo "========================================"

# Wait for PostgreSQL to be ready
echo "⏳  Waiting for PostgreSQL at ${POSTGRES_HOST:-postgres}:${POSTGRES_PORT:-5432}..."
python -c "
import socket, time, sys
host = '${POSTGRES_HOST:-postgres}'
port = int('${POSTGRES_PORT:-5432}')
for i in range(30):
    try:
        s = socket.create_connection((host, port), timeout=1)
        s.close()
        print('✅  PostgreSQL is ready')
        sys.exit(0)
    except Exception:
        time.sleep(1)
print('❌  PostgreSQL did not become ready in time')
sys.exit(1)
"

# Run Alembic migrations
echo "🔄  Running database migrations..."
alembic upgrade head

# Optional: run seed data (if seed script exists)
if [ -f "app/seed.py" ]; then
    echo "🌱  Seeding database..."
    python app/seed.py
fi

echo "✅  Database ready — starting application"
exec "$@"
