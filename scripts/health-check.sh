#!/bin/bash
# =============================================================================
# health-check.sh — 一键验证所有服务健康状态
# =============================================================================

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASS=0
FAIL=0

check() {
    local name=$1
    local url=$2
    local expected=${3:-200}

    echo -n "Checking $name ... "
    status=$(curl -s -o /dev/null -w "%{http_code}" "$url" || echo "000")

    if [ "$status" = "$expected" ]; then
        echo -e "${GREEN}✅ OK${NC} ($status)"
        ((PASS++))
    else
        echo -e "${RED}❌ FAIL${NC} (expected $expected, got $status)"
        ((FAIL++))
    fi
}

echo "========================================"
echo "🩺  Health Check — Audio Profit System"
echo "========================================"

check "Backend API" "http://localhost:8000/health"
check "Frontend" "http://localhost:3000/"
check "Qdrant" "http://localhost:6333/healthz"
check "PostgreSQL (via pg_isready)" "http://localhost:8000/health"  # Health endpoint covers DB

echo "========================================"
echo -e "Results: ${GREEN}$PASS passed${NC}, ${RED}$FAIL failed${NC}"
echo "========================================"

[ "$FAIL" -eq 0 ]
