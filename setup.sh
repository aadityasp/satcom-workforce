#!/usr/bin/env bash
# ============================================================================
# Satcom Workforce - One-Command Setup Script (macOS / Linux)
# ============================================================================
# Usage:  chmod +x setup.sh && ./setup.sh
#
# This script sets up the ENTIRE Satcom Workforce platform on a fresh machine:
#   - Auto-installs missing prerequisites (Docker, Node.js 20, npm)
#   - Starts infrastructure (PostgreSQL, Redis, MinIO)
#   - Builds and starts API + Web in Docker
#   - Seeds the database with demo data
#   - Starts the Expo mobile dev server on your LAN IP
#   - Prints instructions for testing on Android/iOS devices
#
# Supported platforms: macOS (Intel/Apple Silicon), Ubuntu/Debian, Fedora/RHEL
# For Windows: use setup.ps1 instead
# ============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"

echo ""
echo -e "${BLUE}${BOLD}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}${BOLD}║           SATCOM WORKFORCE - SETUP SCRIPT                    ║${NC}"
echo -e "${BLUE}${BOLD}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Detect OS
OS="unknown"
if [[ "$OSTYPE" == "darwin"* ]]; then
    OS="macos"
elif [[ -f /etc/debian_version ]]; then
    OS="debian"
elif [[ -f /etc/redhat-release ]] || [[ -f /etc/fedora-release ]]; then
    OS="redhat"
elif [[ -f /etc/os-release ]]; then
    . /etc/os-release
    case "$ID" in
        ubuntu|debian|pop|mint) OS="debian" ;;
        fedora|rhel|centos|rocky|alma) OS="redhat" ;;
        arch|manjaro) OS="arch" ;;
        *) OS="linux-other" ;;
    esac
fi
echo -e "  Detected OS: ${BOLD}${OS}${NC}"

# ============================================================================
# Helper: Install a package if missing
# ============================================================================
install_package() {
    local name="$1"
    echo -e "  ${YELLOW}Installing ${name}...${NC}"
    case "$OS" in
        macos)
            if ! command -v brew &> /dev/null; then
                echo -e "  ${YELLOW}Installing Homebrew first...${NC}"
                /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
                # Add brew to PATH for Apple Silicon
                if [[ -f /opt/homebrew/bin/brew ]]; then
                    eval "$(/opt/homebrew/bin/brew shellenv)"
                fi
            fi
            brew install "$name"
            ;;
        debian)
            sudo apt-get update -qq
            sudo apt-get install -y -qq "$name"
            ;;
        redhat)
            sudo dnf install -y "$name" 2>/dev/null || sudo yum install -y "$name"
            ;;
        arch)
            sudo pacman -Sy --noconfirm "$name"
            ;;
        *)
            echo -e "  ${RED}Cannot auto-install on this OS. Please install ${name} manually.${NC}"
            exit 1
            ;;
    esac
}

# ============================================================================
# Step 1: Install Prerequisites
# ============================================================================
echo -e "${CYAN}[1/8] Checking & installing prerequisites...${NC}"

# --- Docker ---
if ! command -v docker &> /dev/null; then
    echo -e "  ${YELLOW}Docker not found. Installing...${NC}"
    case "$OS" in
        macos)
            if ! command -v brew &> /dev/null; then
                echo -e "  ${YELLOW}Installing Homebrew first...${NC}"
                /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
                if [[ -f /opt/homebrew/bin/brew ]]; then
                    eval "$(/opt/homebrew/bin/brew shellenv)"
                fi
            fi
            brew install --cask docker
            echo -e "  ${YELLOW}Opening Docker Desktop - please wait for it to start...${NC}"
            open -a Docker
            echo -e "  ${YELLOW}Waiting for Docker daemon to be ready (this may take a minute)...${NC}"
            for i in $(seq 1 60); do
                if docker info &>/dev/null; then
                    break
                fi
                sleep 3
            done
            if ! docker info &>/dev/null; then
                echo -e "  ${RED}Docker daemon not ready. Please start Docker Desktop manually and re-run this script.${NC}"
                exit 1
            fi
            ;;
        debian)
            # Install Docker via official script
            curl -fsSL https://get.docker.com | sudo sh
            sudo usermod -aG docker "$USER"
            sudo systemctl enable docker
            sudo systemctl start docker
            echo -e "  ${YELLOW}NOTE: You were added to the docker group. If permission errors occur, log out and back in.${NC}"
            ;;
        redhat)
            sudo dnf install -y dnf-plugins-core 2>/dev/null || true
            curl -fsSL https://get.docker.com | sudo sh
            sudo usermod -aG docker "$USER"
            sudo systemctl enable docker
            sudo systemctl start docker
            ;;
        arch)
            sudo pacman -Sy --noconfirm docker docker-compose
            sudo systemctl enable docker
            sudo systemctl start docker
            sudo usermod -aG docker "$USER"
            ;;
        *)
            echo -e "  ${RED}Cannot auto-install Docker on this OS.${NC}"
            echo "  Install Docker: https://docs.docker.com/get-docker/"
            exit 1
            ;;
    esac
fi
echo -e "  ${GREEN}✓${NC} Docker $(docker --version 2>/dev/null | sed 's/.*version \([0-9][0-9.]*\).*/\1/' )"

# --- Docker Compose ---
if docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
    echo -e "  ${GREEN}✓${NC} Docker Compose $(docker compose version --short 2>/dev/null || echo 'v2')"
elif command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
    echo -e "  ${GREEN}✓${NC} docker-compose (legacy)"
else
    echo -e "  ${YELLOW}Docker Compose not found. Installing plugin...${NC}"
    case "$OS" in
        macos)
            # Docker Desktop includes Compose; if missing, reinstall
            brew install docker-compose
            ;;
        debian|redhat)
            sudo mkdir -p /usr/local/lib/docker/cli-plugins
            COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep '"tag_name"' | head -1 | cut -d'"' -f4)
            COMPOSE_VERSION=${COMPOSE_VERSION:-v2.24.0}
            ARCH=$(uname -m)
            sudo curl -SL "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-linux-${ARCH}" -o /usr/local/lib/docker/cli-plugins/docker-compose
            sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
            ;;
    esac
    if docker compose version &> /dev/null; then
        COMPOSE_CMD="docker compose"
        echo -e "  ${GREEN}✓${NC} Docker Compose installed"
    else
        echo -e "  ${RED}Failed to install Docker Compose. Please install manually.${NC}"
        exit 1
    fi
fi

# --- Node.js 20+ ---
NEED_NODE=false
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v | tr -d 'v' | cut -d. -f1)
    if [ "$NODE_VERSION" -lt 20 ]; then
        echo -e "  ${YELLOW}Node.js $(node -v) found, but v20+ required. Upgrading...${NC}"
        NEED_NODE=true
    else
        echo -e "  ${GREEN}✓${NC} Node.js $(node -v)"
    fi
else
    echo -e "  ${YELLOW}Node.js not found. Installing v20...${NC}"
    NEED_NODE=true
fi

if [ "$NEED_NODE" = true ]; then
    case "$OS" in
        macos)
            brew install node@20
            brew link --overwrite node@20 2>/dev/null || true
            ;;
        debian)
            # NodeSource setup for Node 20
            if ! command -v curl &> /dev/null; then
                sudo apt-get update -qq && sudo apt-get install -y -qq curl
            fi
            curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
            sudo apt-get install -y -qq nodejs
            ;;
        redhat)
            curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
            sudo dnf install -y nodejs 2>/dev/null || sudo yum install -y nodejs
            ;;
        arch)
            sudo pacman -Sy --noconfirm nodejs npm
            ;;
        *)
            echo -e "  ${RED}Cannot auto-install Node.js. Please install Node 20+: https://nodejs.org/${NC}"
            exit 1
            ;;
    esac
    echo -e "  ${GREEN}✓${NC} Node.js $(node -v) installed"
fi

# --- npm (comes with Node, but verify) ---
if command -v npm &> /dev/null; then
    echo -e "  ${GREEN}✓${NC} npm $(npm -v)"
else
    echo -e "  ${RED}npm not found even after Node install. Please check your Node.js installation.${NC}"
    exit 1
fi

# --- curl (needed for health checks) ---
if ! command -v curl &> /dev/null; then
    install_package curl
fi

# ============================================================================
# Step 2: Detect LAN IP
# ============================================================================
echo ""
echo -e "${CYAN}[2/8] Detecting LAN IP address...${NC}"

LAN_IP=""
# macOS
if [[ "$OS" == "macos" ]]; then
    LAN_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "")
fi
# Linux
if [ -z "$LAN_IP" ]; then
    LAN_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "")
fi
# Fallback
if [ -z "$LAN_IP" ]; then
    LAN_IP=$(ip route get 1.1.1.1 2>/dev/null | awk '{for(i=1;i<=NF;i++) if($i=="src") print $(i+1)}' || echo "")
fi
if [ -z "$LAN_IP" ]; then
    LAN_IP=$(ifconfig 2>/dev/null | grep 'inet ' | grep -v '127.0.0.1' | head -1 | awk '{print $2}')
fi
if [ -z "$LAN_IP" ] || [ "$LAN_IP" = "" ]; then
    LAN_IP="localhost"
    echo -e "  ${YELLOW}Could not detect LAN IP, falling back to localhost.${NC}"
    echo -e "  ${YELLOW}Mobile devices on the same WiFi will NOT be able to connect.${NC}"
    echo -e "  ${YELLOW}To fix: set LAN_IP manually before running, e.g.: LAN_IP=192.168.1.100 ./setup.sh${NC}"
fi

# Validate LAN_IP looks like an IP or is localhost
if [[ "$LAN_IP" != "localhost" ]] && ! echo "$LAN_IP" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$'; then
    echo -e "  ${YELLOW}Detected LAN_IP '${LAN_IP}' doesn't look like a valid IPv4 address, falling back to localhost.${NC}"
    LAN_IP="localhost"
fi

echo -e "  ${GREEN}✓${NC} LAN IP: ${BOLD}${LAN_IP}${NC}"

# ============================================================================
# Step 3: Create/Update Environment Files
# ============================================================================
echo ""
echo -e "${CYAN}[3/8] Configuring environment files...${NC}"

cd "$PROJECT_ROOT"

# Root .env (for Docker Compose)
if [ ! -f .env ]; then
cat > .env << 'ENVEOF'
# Docker Compose Environment
POSTGRES_USER=satcom
POSTGRES_PASSWORD=satcom_local_2024
POSTGRES_DB=satcom

JWT_SECRET=local-dev-jwt-secret-not-for-production-use
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=local-dev-refresh-secret-not-for-production-use
JWT_REFRESH_EXPIRES_IN=7d

MINIO_ROOT_USER=satcom_minio
MINIO_ROOT_PASSWORD=minio_local_2024
MINIO_BUCKET=satcom-uploads

SMTP_HOST=localhost
SMTP_PORT=587
SMTP_USER=test
SMTP_PASS=test
SMTP_FROM=noreply@localhost

NEXT_PUBLIC_API_URL=http://localhost:3003/api/v1
NEXT_PUBLIC_WS_URL=ws://localhost:3003

BACKUP_RETENTION_DAYS=7
CORS_ORIGINS=http://localhost:3000,http://localhost:80
ENVEOF
echo -e "  ${GREEN}✓${NC} Created .env"
else
echo -e "  ${GREEN}✓${NC} .env already exists"
fi

# API .env
if [ ! -f apps/api/.env ]; then
cat > apps/api/.env << 'ENVEOF'
NODE_ENV=development
PORT=3003

DATABASE_URL=postgresql://satcom:satcom_dev_password@localhost:5432/satcom_workforce

JWT_SECRET=satcom-jwt-secret-change-in-production-min-32-chars
JWT_REFRESH_SECRET=satcom-refresh-secret-change-in-production-min-32
JWT_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=satcom_minio
MINIO_SECRET_KEY=satcom_minio_secret
MINIO_BUCKET=satcom-uploads
MINIO_USE_SSL=false

CORS_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:3004

SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=noreply@satcom.com
ENVEOF
echo -e "  ${GREEN}✓${NC} Created apps/api/.env"
else
echo -e "  ${GREEN}✓${NC} apps/api/.env already exists"
fi

# Web .env.local
if [ ! -f apps/web/.env.local ]; then
cat > apps/web/.env.local << 'ENVEOF'
NEXT_PUBLIC_API_URL=http://localhost:3003/api/v1
JWT_SECRET=satcom-jwt-secret-change-in-production-min-32-chars
ENVEOF
echo -e "  ${GREEN}✓${NC} Created apps/web/.env.local"
else
echo -e "  ${GREEN}✓${NC} apps/web/.env.local already exists"
fi

# Mobile .env - set to LAN IP so physical devices can connect
echo "EXPO_PUBLIC_API_URL=http://${LAN_IP}:3003/api/v1" > apps/mobile/.env
echo -e "  ${GREEN}✓${NC} Set apps/mobile/.env -> http://${LAN_IP}:3003/api/v1"

# ============================================================================
# Step 4: Update API CORS for LAN access
# ============================================================================
echo ""
echo -e "${CYAN}[4/8] Updating CORS for LAN mobile access...${NC}"

# Add LAN IP to CORS in .env
if ! grep -q "$LAN_IP" .env 2>/dev/null; then
    if [[ "$OS" == "macos" ]]; then
        sed -i '' "s|CORS_ORIGINS=.*|CORS_ORIGINS=http://localhost:3000,http://localhost:80,http://${LAN_IP}:3000,http://${LAN_IP}:3003|" .env
    else
        sed -i "s|CORS_ORIGINS=.*|CORS_ORIGINS=http://localhost:3000,http://localhost:80,http://${LAN_IP}:3000,http://${LAN_IP}:3003|" .env
    fi
    echo -e "  ${GREEN}✓${NC} Added ${LAN_IP} to CORS origins"
fi

# Also update API .env
if ! grep -q "$LAN_IP" apps/api/.env 2>/dev/null; then
    if [[ "$OS" == "macos" ]]; then
        sed -i '' "s|CORS_ORIGINS=.*|CORS_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:3004,http://${LAN_IP}:3000,http://${LAN_IP}:8081|" apps/api/.env
    else
        sed -i "s|CORS_ORIGINS=.*|CORS_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:3004,http://${LAN_IP}:3000,http://${LAN_IP}:8081|" apps/api/.env
    fi
    echo -e "  ${GREEN}✓${NC} Added ${LAN_IP} to API CORS origins"
fi

# ============================================================================
# Step 5: Start Infrastructure + Build & Start API/Web
# ============================================================================
echo ""
echo -e "${CYAN}[5/8] Starting Docker services (PostgreSQL, Redis, MinIO, API, Web)...${NC}"
echo -e "  ${YELLOW}This may take several minutes on first run (building images)...${NC}"

# Start infrastructure first
$COMPOSE_CMD up -d postgres redis minio 2>&1 | grep -E '(Creating|Starting|Created|Started|Running)' || true
echo -e "  ${GREEN}✓${NC} Infrastructure services started"

# Wait for postgres
echo -e "  Waiting for PostgreSQL to be ready..."
for i in $(seq 1 30); do
    if docker exec satcom-postgres pg_isready -U satcom -d satcom 2>/dev/null | grep -q "accepting"; then
        break
    fi
    sleep 2
done
echo -e "  ${GREEN}✓${NC} PostgreSQL ready"

# Build and start API + Web
$COMPOSE_CMD -f docker-compose.prod.yml up -d --build api web 2>&1 | tail -5
echo -e "  ${GREEN}✓${NC} API and Web containers building/starting"

# ============================================================================
# Step 6: Wait for API health
# ============================================================================
echo ""
echo -e "${CYAN}[6/8] Waiting for API server to be healthy...${NC}"

for i in $(seq 1 60); do
    if curl -s http://localhost:3003/health 2>/dev/null | grep -q '"ok"'; then
        echo -e "  ${GREEN}✓${NC} API server is healthy (http://localhost:3003)"
        break
    fi
    if [ $i -eq 60 ]; then
        echo -e "  ${YELLOW}⚠${NC} API taking longer than expected. Check: docker logs satcom-api"
    fi
    sleep 3
done

# Wait for Web
echo -e "  Waiting for Web app..."
for i in $(seq 1 60); do
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null | grep -qE "200|302"; then
        echo -e "  ${GREEN}✓${NC} Web app is ready (http://localhost:3000)"
        break
    fi
    if [ $i -eq 60 ]; then
        echo -e "  ${YELLOW}⚠${NC} Web app taking longer. Check: docker logs satcom-web"
    fi
    sleep 3
done

# ============================================================================
# Step 7: Install Mobile Dependencies & Start Expo
# ============================================================================
echo ""
echo -e "${CYAN}[7/8] Setting up Mobile App (Expo)...${NC}"

if command -v node &> /dev/null && command -v npm &> /dev/null; then
    NODE_VERSION=$(node -v | tr -d 'v' | cut -d. -f1)
    if [ "$NODE_VERSION" -ge 20 ]; then
        # Install dependencies
        echo -e "  Installing npm dependencies..."
        cd "$PROJECT_ROOT"
        npm install --no-audit --no-fund 2>&1 | tail -3

        # Start Expo on LAN
        echo -e "  Starting Expo dev server on LAN (${LAN_IP})..."
        cd apps/mobile

        # Kill any existing Expo process on 8081
        lsof -ti:8081 2>/dev/null | xargs kill -9 2>/dev/null || true

        # Start Expo in background with lan mode
        EXPO_PUBLIC_API_URL="http://${LAN_IP}:3003/api/v1" npx expo start --host lan --port 8081 &
        EXPO_PID=$!
        echo $EXPO_PID > /tmp/satcom-expo.pid

        sleep 5
        echo -e "  ${GREEN}✓${NC} Expo dev server started (PID: $EXPO_PID)"
        cd "$PROJECT_ROOT"
    else
        echo -e "  ${YELLOW}⚠${NC} Node.js 20+ required for Expo. Skipping mobile setup."
    fi
else
    echo -e "  ${YELLOW}⚠${NC} Node.js/npm not found. Skipping mobile setup."
    echo "    To start mobile later: cd apps/mobile && npx expo start --host lan"
fi

# ============================================================================
# Step 8: Print Summary
# ============================================================================
echo ""
echo -e "${GREEN}${BOLD}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}${BOLD}║              SETUP COMPLETE!                                 ║${NC}"
echo -e "${GREEN}${BOLD}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BOLD}Services Running:${NC}"
echo -e "  ${GREEN}●${NC} Web App:     ${BOLD}http://localhost:3000${NC}"
echo -e "  ${GREEN}●${NC} API Server:  ${BOLD}http://localhost:3003${NC}"
echo -e "  ${GREEN}●${NC} Mobile Dev:  ${BOLD}http://${LAN_IP}:8081${NC}"
echo -e "  ${GREEN}●${NC} PostgreSQL:  localhost:5432"
echo -e "  ${GREEN}●${NC} Redis:       localhost:6379"
echo -e "  ${GREEN}●${NC} MinIO:       localhost:9000 (Console: 9001)"
echo ""
echo -e "${BOLD}Demo Accounts:${NC}"
echo -e "  ┌──────────────┬─────────────────────────┬──────────────┐"
echo -e "  │ Role         │ Email                   │ Password     │"
echo -e "  ├──────────────┼─────────────────────────┼──────────────┤"
echo -e "  │ ${RED}SuperAdmin${NC}   │ admin@satcom.com        │ Password123! │"
echo -e "  │ ${BLUE}HR${NC}           │ hr@satcom.com           │ Password123! │"
echo -e "  │ ${GREEN}Manager${NC}      │ manager@satcom.com      │ Password123! │"
echo -e "  │ ${YELLOW}Employee${NC}     │ john@satcom.com         │ Password123! │"
echo -e "  └──────────────┴─────────────────────────┴──────────────┘"
echo ""
echo -e "${BOLD}${CYAN}MOBILE APP TESTING (Same Network - No Cloud Needed):${NC}"
echo ""
echo -e "  ${BOLD}Android:${NC}"
echo -e "    1. Install ${BOLD}Expo Go${NC} from Google Play Store"
echo -e "    2. Make sure your phone is on the ${BOLD}same WiFi network${NC}"
echo -e "    3. Open Expo Go and scan the QR code shown in terminal"
echo -e "       Or enter manually: ${BOLD}exp://${LAN_IP}:8081${NC}"
echo ""
echo -e "  ${BOLD}iOS:${NC}"
echo -e "    1. Install ${BOLD}Expo Go${NC} from App Store"
echo -e "    2. Make sure your iPhone is on the ${BOLD}same WiFi network${NC}"
echo -e "    3. Open your iPhone Camera and scan the QR code"
echo -e "       Or open Safari: ${BOLD}exp://${LAN_IP}:8081${NC}"
echo ""
echo -e "  ${BOLD}iOS Simulator:${NC}"
echo -e "    Press ${BOLD}i${NC} in the Expo terminal to open in iOS Simulator"
echo ""
echo -e "  ${BOLD}Android Emulator:${NC}"
echo -e "    Press ${BOLD}a${NC} in the Expo terminal to open in Android Emulator"
echo ""
echo -e "${BOLD}Useful Commands:${NC}"
echo -e "  Stop everything:   ${CYAN}docker compose -f docker-compose.prod.yml down${NC}"
echo -e "  View API logs:     ${CYAN}docker logs -f satcom-api${NC}"
echo -e "  View Web logs:     ${CYAN}docker logs -f satcom-web${NC}"
echo -e "  Stop mobile:       ${CYAN}kill \$(cat /tmp/satcom-expo.pid)${NC}"
echo -e "  Restart mobile:    ${CYAN}cd apps/mobile && npx expo start --host lan${NC}"
echo -e "  Database studio:   ${CYAN}cd apps/api && npx prisma studio${NC}"
echo ""
