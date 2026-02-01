#!/bin/bash
# ============================================
# Satcom Workforce - Production Deploy Script
# ============================================
# Usage: ./scripts/deploy.sh [--skip-migrate] [--skip-build]

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

SKIP_MIGRATE=false
SKIP_BUILD=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-migrate) SKIP_MIGRATE=true; shift ;;
        --skip-build)   SKIP_BUILD=true; shift ;;
        -h|--help)
            echo "Usage: $(basename "$0") [--skip-migrate] [--skip-build]"
            exit 0
            ;;
        *) echo -e "${RED}Unknown option: $1${NC}"; exit 1 ;;
    esac
done

log_info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $1"; }

# Trap errors
trap 'log_error "Deploy failed on line $LINENO"; exit 1' ERR

echo "=========================================="
echo "  Satcom Workforce - Production Deploy"
echo "=========================================="
echo ""

# -----------------------------------------------------------
# Step 1: Validate required environment variables
# -----------------------------------------------------------
log_info "Validating environment variables..."

REQUIRED_VARS=(
    "DATABASE_URL"
    "JWT_SECRET"
    "JWT_REFRESH_SECRET"
)

missing=0
for var in "${REQUIRED_VARS[@]}"; do
    if [[ -z "${!var:-}" ]]; then
        log_error "Missing required env var: $var"
        missing=1
    fi
done

if [[ $missing -eq 1 ]]; then
    log_error "Set missing variables in .env or export them before running this script."
    exit 1
fi
log_success "All required environment variables are set."

# -----------------------------------------------------------
# Step 2: Run database migrations
# -----------------------------------------------------------
if [[ "$SKIP_MIGRATE" == false ]]; then
    log_info "Running database migrations..."
    "${SCRIPT_DIR}/db-migrate.sh"
    log_success "Database migrations complete."
else
    log_warn "Skipping database migrations (--skip-migrate)."
fi

# -----------------------------------------------------------
# Step 3: Build and start containers
# -----------------------------------------------------------
if [[ "$SKIP_BUILD" == false ]]; then
    log_info "Building Docker images..."
    cd "$PROJECT_ROOT"
    docker compose -f docker-compose.prod.yml build
    log_success "Docker images built."
else
    log_warn "Skipping build (--skip-build)."
fi

log_info "Starting containers..."
cd "$PROJECT_ROOT"
docker compose -f docker-compose.prod.yml up -d

log_success "Containers started."

# -----------------------------------------------------------
# Step 4: Health check
# -----------------------------------------------------------
log_info "Waiting for services to start (30s)..."
sleep 30

API_URL="http://localhost:3003/health"
WEB_URL="http://localhost:3000"

check_health() {
    local name=$1
    local url=$2
    local status
    status=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")
    if [[ "$status" == "200" ]]; then
        log_success "$name is healthy (HTTP $status)"
        return 0
    else
        log_error "$name health check failed (HTTP $status)"
        return 1
    fi
}

healthy=true
check_health "API" "$API_URL"  || healthy=false
check_health "Web" "$WEB_URL"  || healthy=false

echo ""
if [[ "$healthy" == true ]]; then
    log_success "Deployment completed successfully!"
    echo ""
    echo "  API: http://localhost:3003"
    echo "  Web: http://localhost:3000"
    echo "  Nginx: http://localhost:80"
    echo ""
else
    log_error "Some services failed health checks. Check logs with:"
    echo "  docker compose -f docker-compose.prod.yml logs"
    exit 1
fi
