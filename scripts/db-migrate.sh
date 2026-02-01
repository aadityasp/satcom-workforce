#!/bin/bash
# ============================================
# Satcom Workforce - Database Migration Script
# ============================================
# Runs Prisma migrations in production mode.
#
# Usage:
#   ./scripts/db-migrate.sh [command]
#
# Commands:
#   deploy   Deploy pending migrations (default)
#   status   Show migration status
#   reset    Reset database (DANGEROUS - requires --force)

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
API_DIR="${PROJECT_ROOT}/apps/api"

COMMAND="${1:-deploy}"
FORCE=false
[[ "${2:-}" == "--force" ]] && FORCE=true

log_info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[OK]${NC} $1"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $1"; }

trap 'log_error "Migration failed on line $LINENO"; exit 1' ERR

# -----------------------------------------------------------
# Validate prerequisites
# -----------------------------------------------------------
if [[ ! -d "$API_DIR/prisma" ]]; then
    log_error "Prisma directory not found at $API_DIR/prisma"
    exit 1
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
    # Try loading from .env file in api dir
    if [[ -f "$API_DIR/.env" ]]; then
        log_info "Loading DATABASE_URL from apps/api/.env"
        set -a
        source "$API_DIR/.env"
        set +a
    fi

    if [[ -z "${DATABASE_URL:-}" ]]; then
        log_error "DATABASE_URL is not set. Export it or create apps/api/.env"
        exit 1
    fi
fi

# -----------------------------------------------------------
# Execute command
# -----------------------------------------------------------
cd "$API_DIR"

case "$COMMAND" in
    deploy)
        log_info "Generating Prisma client..."
        npx prisma generate

        log_info "Deploying pending migrations..."
        npx prisma migrate deploy

        log_success "Migrations deployed successfully."
        ;;

    status)
        log_info "Checking migration status..."
        npx prisma migrate status
        ;;

    reset)
        if [[ "$FORCE" != true ]]; then
            log_error "Database reset requires --force flag. This will DROP ALL DATA."
            exit 1
        fi
        log_info "Resetting database (all data will be lost)..."
        npx prisma migrate reset --force
        log_success "Database reset complete."
        ;;

    *)
        log_error "Unknown command: $COMMAND"
        echo "Usage: $(basename "$0") [deploy|status|reset]"
        exit 1
        ;;
esac
