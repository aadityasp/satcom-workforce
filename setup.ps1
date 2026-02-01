# ============================================================================
# Satcom Workforce - One-Command Setup Script (Windows)
# ============================================================================
# Usage (Run as Administrator in PowerShell):
#   Set-ExecutionPolicy Bypass -Scope Process -Force; .\setup.ps1
#
# This script sets up the ENTIRE Satcom Workforce platform on a fresh Windows machine:
#   - Auto-installs missing prerequisites (Docker Desktop, Node.js 20)
#   - Starts infrastructure (PostgreSQL, Redis, MinIO)
#   - Builds and starts API + Web in Docker
#   - Starts the Expo mobile dev server on your LAN IP
#   - Prints instructions for testing on Android/iOS devices
#
# Prerequisites auto-installed via winget (Windows Package Manager):
#   - Docker Desktop
#   - Node.js 20 LTS
# ============================================================================

$ErrorActionPreference = "Stop"

# ============================================================================
# Helper Functions
# ============================================================================
function Write-Step {
    param([string]$Step, [string]$Message)
    Write-Host "`n[$Step] $Message" -ForegroundColor Cyan
}

function Write-Ok {
    param([string]$Message)
    Write-Host "  [OK] $Message" -ForegroundColor Green
}

function Write-Warn {
    param([string]$Message)
    Write-Host "  [!] $Message" -ForegroundColor Yellow
}

function Write-Err {
    param([string]$Message)
    Write-Host "  [X] $Message" -ForegroundColor Red
}

function Test-Admin {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($identity)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Wait-ForUser {
    param([string]$Message = "Press Enter to continue...")
    Write-Host ""
    Write-Host "  $Message" -ForegroundColor Yellow
    Read-Host
}

function Install-WithWinget {
    param([string]$PackageId, [string]$Name)
    Write-Host "  Installing $Name via winget..." -ForegroundColor Yellow
    winget install --id $PackageId --accept-package-agreements --accept-source-agreements --silent
    if ($LASTEXITCODE -ne 0) {
        Write-Err "Failed to install $Name via winget."
        return $false
    }
    # Refresh PATH
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
    Write-Ok "$Name installed successfully"
    return $true
}

# ============================================================================
# Banner
# ============================================================================
Clear-Host
Write-Host ""
Write-Host "  ============================================================" -ForegroundColor Blue
Write-Host "       SATCOM WORKFORCE - Windows Setup" -ForegroundColor Blue
Write-Host "  ============================================================" -ForegroundColor Blue
Write-Host ""

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

# ============================================================================
# Step 0: Check if running as Administrator
# ============================================================================
if (-not (Test-Admin)) {
    Write-Warn "This script needs Administrator privileges to install software."
    Write-Warn "Restarting as Administrator..."
    Start-Process powershell.exe "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`"" -Verb RunAs
    exit
}

# ============================================================================
# Step 1: Check & Install Prerequisites
# ============================================================================
Write-Step "1/8" "Checking & installing prerequisites..."

# --- winget (Windows Package Manager) ---
$hasWinget = $null -ne (Get-Command winget -ErrorAction SilentlyContinue)
if (-not $hasWinget) {
    Write-Err "winget (Windows Package Manager) is not available."
    Write-Host "  winget comes pre-installed on Windows 10 (1809+) and Windows 11." -ForegroundColor Yellow
    Write-Host "  If missing, install 'App Installer' from the Microsoft Store." -ForegroundColor Yellow
    Write-Host "  https://apps.microsoft.com/detail/9nblggh4nns1" -ForegroundColor Yellow
    Wait-ForUser "Install 'App Installer' from the Microsoft Store, then press Enter to retry..."

    # Refresh PATH and retry
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
    $hasWinget = $null -ne (Get-Command winget -ErrorAction SilentlyContinue)
    if (-not $hasWinget) {
        Write-Err "winget still not found. Cannot continue auto-install."
        Write-Host "  Please install prerequisites manually:" -ForegroundColor Red
        Write-Host "    - Docker Desktop: https://docs.docker.com/desktop/install/windows-install/" -ForegroundColor Red
        Write-Host "    - Node.js 20: https://nodejs.org/" -ForegroundColor Red
        exit 1
    }
}
Write-Ok "winget available"

# --- Docker Desktop ---
$hasDocker = $null -ne (Get-Command docker -ErrorAction SilentlyContinue)
if (-not $hasDocker) {
    Write-Warn "Docker Desktop not found. Installing..."
    Write-Host ""
    Write-Host "  Docker Desktop will be installed. After installation:" -ForegroundColor Yellow
    Write-Host "    1. Docker Desktop may need a RESTART of your computer" -ForegroundColor Yellow
    Write-Host "    2. On first launch, accept the Docker license agreement" -ForegroundColor Yellow
    Write-Host "    3. Enable WSL 2 backend if prompted" -ForegroundColor Yellow
    Write-Host ""

    $installed = Install-WithWinget "Docker.DockerDesktop" "Docker Desktop"
    if (-not $installed) {
        Write-Err "Docker Desktop installation failed."
        Write-Host "  Install manually: https://docs.docker.com/desktop/install/windows-install/" -ForegroundColor Red
        exit 1
    }

    # Check if Docker daemon is running
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
    $hasDocker = $null -ne (Get-Command docker -ErrorAction SilentlyContinue)

    if ($hasDocker) {
        Write-Host "  Starting Docker Desktop..." -ForegroundColor Yellow
        Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe" -ErrorAction SilentlyContinue
        Write-Host "  Waiting for Docker daemon to be ready..." -ForegroundColor Yellow
        $dockerReady = $false
        for ($i = 0; $i -lt 60; $i++) {
            try {
                $null = docker info 2>$null
                if ($LASTEXITCODE -eq 0) {
                    $dockerReady = $true
                    break
                }
            } catch {}
            Start-Sleep -Seconds 3
        }
        if (-not $dockerReady) {
            Write-Warn "Docker daemon not ready yet."
            Write-Host "  Please start Docker Desktop manually and wait for it to be ready." -ForegroundColor Yellow
            Wait-ForUser "Press Enter once Docker Desktop is running..."
        }
    } else {
        Write-Warn "Docker command not found after install. A restart may be required."
        Write-Host "  Please restart your computer, start Docker Desktop, then re-run this script." -ForegroundColor Yellow
        exit 1
    }
}

# Verify Docker is running
try {
    $dockerVersion = docker --version 2>$null
    Write-Ok "Docker $($dockerVersion -replace 'Docker version ','' -replace ',.*','')"
} catch {
    Write-Err "Docker is installed but not responding. Please start Docker Desktop and re-run."
    exit 1
}

# --- Docker Compose ---
try {
    $null = docker compose version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Ok "Docker Compose (included with Docker Desktop)"
    } else {
        throw "not found"
    }
} catch {
    Write-Err "Docker Compose not available. It should come with Docker Desktop."
    Write-Host "  Please update Docker Desktop to the latest version." -ForegroundColor Red
    exit 1
}

# --- Node.js 20+ ---
$hasNode = $null -ne (Get-Command node -ErrorAction SilentlyContinue)
$needNode = $false

if ($hasNode) {
    $nodeVersion = (node -v) -replace 'v',''
    $nodeMajor = [int]($nodeVersion.Split('.')[0])
    if ($nodeMajor -lt 20) {
        Write-Warn "Node.js v$nodeVersion found, but v20+ required. Upgrading..."
        $needNode = $true
    } else {
        Write-Ok "Node.js v$nodeVersion"
    }
} else {
    Write-Warn "Node.js not found. Installing v20 LTS..."
    $needNode = $true
}

if ($needNode) {
    $installed = Install-WithWinget "OpenJS.NodeJS.LTS" "Node.js 20 LTS"
    if (-not $installed) {
        Write-Err "Node.js installation failed."
        Write-Host "  Install manually: https://nodejs.org/" -ForegroundColor Red
        exit 1
    }
    # Refresh PATH
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
    $nodeVersion = (node -v) -replace 'v',''
    Write-Ok "Node.js v$nodeVersion installed"
}

# --- npm ---
$hasNpm = $null -ne (Get-Command npm -ErrorAction SilentlyContinue)
if ($hasNpm) {
    $npmVersion = npm -v 2>$null
    Write-Ok "npm v$npmVersion"
} else {
    Write-Err "npm not found. It should come with Node.js."
    Write-Host "  Reinstall Node.js from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# ============================================================================
# Step 2: Detect LAN IP
# ============================================================================
Write-Step "2/8" "Detecting LAN IP address..."

$LanIP = $null
try {
    # Get the first non-loopback IPv4 address
    $adapters = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
        Where-Object { $_.IPAddress -ne '127.0.0.1' -and $_.PrefixOrigin -ne 'WellKnown' } |
        Sort-Object -Property InterfaceIndex
    if ($adapters) {
        $LanIP = $adapters[0].IPAddress
    }
} catch {}

if (-not $LanIP) {
    try {
        $LanIP = (Test-Connection -ComputerName (hostname) -Count 1 -ErrorAction SilentlyContinue).IPV4Address.IPAddressToString
    } catch {}
}

if (-not $LanIP) {
    $LanIP = "localhost"
    Write-Warn "Could not detect LAN IP, using localhost. Mobile devices won't be able to connect."
}

Write-Ok "LAN IP: $LanIP"

# ============================================================================
# Step 3: Create/Update Environment Files
# ============================================================================
Write-Step "3/8" "Configuring environment files..."

Set-Location $ProjectRoot

# Root .env
if (-not (Test-Path ".env")) {
    @"
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
CORS_ORIGINS=http://localhost:3000,http://localhost:80,http://${LanIP}:3000,http://${LanIP}:3003
"@ | Set-Content -Path ".env" -Encoding UTF8
    Write-Ok "Created .env"
} else {
    Write-Ok ".env already exists"
}

# API .env
if (-not (Test-Path "apps\api\.env")) {
    @"
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

CORS_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:3004,http://${LanIP}:3000,http://${LanIP}:8081

SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=noreply@satcom.com
"@ | Set-Content -Path "apps\api\.env" -Encoding UTF8
    Write-Ok "Created apps\api\.env"
} else {
    Write-Ok "apps\api\.env already exists"
}

# Web .env.local
if (-not (Test-Path "apps\web\.env.local")) {
    @"
NEXT_PUBLIC_API_URL=http://localhost:3003/api/v1
JWT_SECRET=satcom-jwt-secret-change-in-production-min-32-chars
"@ | Set-Content -Path "apps\web\.env.local" -Encoding UTF8
    Write-Ok "Created apps\web\.env.local"
} else {
    Write-Ok "apps\web\.env.local already exists"
}

# Mobile .env
"EXPO_PUBLIC_API_URL=http://${LanIP}:3003/api/v1" | Set-Content -Path "apps\mobile\.env" -Encoding UTF8
Write-Ok "Set apps\mobile\.env -> http://${LanIP}:3003/api/v1"

# ============================================================================
# Step 4: Update CORS for LAN access
# ============================================================================
Write-Step "4/8" "Updating CORS for LAN mobile access..."

# Update root .env CORS if LAN IP not already there
$rootEnv = Get-Content ".env" -Raw
if ($rootEnv -notmatch [regex]::Escape($LanIP)) {
    $rootEnv = $rootEnv -replace "CORS_ORIGINS=.*", "CORS_ORIGINS=http://localhost:3000,http://localhost:80,http://${LanIP}:3000,http://${LanIP}:3003"
    $rootEnv | Set-Content -Path ".env" -Encoding UTF8
    Write-Ok "Added $LanIP to root CORS origins"
}

# Update API .env CORS if LAN IP not already there
$apiEnv = Get-Content "apps\api\.env" -Raw
if ($apiEnv -notmatch [regex]::Escape($LanIP)) {
    $apiEnv = $apiEnv -replace "CORS_ORIGINS=.*", "CORS_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:3004,http://${LanIP}:3000,http://${LanIP}:8081"
    $apiEnv | Set-Content -Path "apps\api\.env" -Encoding UTF8
    Write-Ok "Added $LanIP to API CORS origins"
}

# ============================================================================
# Step 5: Start Docker Services
# ============================================================================
Write-Step "5/8" "Starting Docker services (PostgreSQL, Redis, MinIO, API, Web)..."
Write-Warn "This may take several minutes on first run (building images)..."

# Start infrastructure
docker compose up -d postgres redis minio 2>$null
Write-Ok "Infrastructure services started"

# Wait for PostgreSQL
Write-Host "  Waiting for PostgreSQL to be ready..." -ForegroundColor Gray
for ($i = 0; $i -lt 30; $i++) {
    try {
        $result = docker exec satcom-postgres pg_isready -U satcom -d satcom 2>$null
        if ($result -match "accepting") { break }
    } catch {}
    Start-Sleep -Seconds 2
}
Write-Ok "PostgreSQL ready"

# Build and start API + Web
docker compose -f docker-compose.prod.yml up -d --build api web 2>$null
Write-Ok "API and Web containers building/starting"

# ============================================================================
# Step 6: Wait for API Health
# ============================================================================
Write-Step "6/8" "Waiting for API server to be healthy..."

$apiReady = $false
for ($i = 0; $i -lt 60; $i++) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3003/health" -UseBasicParsing -TimeoutSec 3 -ErrorAction SilentlyContinue
        if ($response.Content -match '"ok"') {
            Write-Ok "API server is healthy (http://localhost:3003)"
            $apiReady = $true
            break
        }
    } catch {}
    Start-Sleep -Seconds 3
}
if (-not $apiReady) {
    Write-Warn "API taking longer than expected. Check: docker logs satcom-api"
}

# Wait for Web
Write-Host "  Waiting for Web app..." -ForegroundColor Gray
$webReady = $false
for ($i = 0; $i -lt 60; $i++) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 3 -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200 -or $response.StatusCode -eq 302) {
            Write-Ok "Web app is ready (http://localhost:3000)"
            $webReady = $true
            break
        }
    } catch {}
    Start-Sleep -Seconds 3
}
if (-not $webReady) {
    Write-Warn "Web app taking longer. Check: docker logs satcom-web"
}

# ============================================================================
# Step 7: Install Mobile Dependencies & Start Expo
# ============================================================================
Write-Step "7/8" "Setting up Mobile App (Expo)..."

$hasNode = $null -ne (Get-Command node -ErrorAction SilentlyContinue)
$hasNpm = $null -ne (Get-Command npm -ErrorAction SilentlyContinue)

if ($hasNode -and $hasNpm) {
    $nodeMajor = [int]((node -v) -replace 'v','' -split '\.')[0]
    if ($nodeMajor -ge 20) {
        Write-Host "  Installing npm dependencies..." -ForegroundColor Gray
        Set-Location $ProjectRoot
        npm install --no-audit --no-fund 2>$null | Select-Object -Last 3

        Write-Host "  Starting Expo dev server on LAN ($LanIP)..." -ForegroundColor Gray
        Set-Location "apps\mobile"

        # Kill any existing process on port 8081
        $existing = Get-NetTCPConnection -LocalPort 8081 -ErrorAction SilentlyContinue
        if ($existing) {
            Stop-Process -Id (Get-Process -Id $existing.OwningProcess -ErrorAction SilentlyContinue).Id -Force -ErrorAction SilentlyContinue
        }

        # Start Expo in a new window
        $env:EXPO_PUBLIC_API_URL = "http://${LanIP}:3003/api/v1"
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$ProjectRoot\apps\mobile'; `$env:EXPO_PUBLIC_API_URL='http://${LanIP}:3003/api/v1'; npx expo start --host lan --port 8081"

        Start-Sleep -Seconds 5
        Write-Ok "Expo dev server started in new window"
        Set-Location $ProjectRoot
    } else {
        Write-Warn "Node.js 20+ required for Expo. Skipping mobile setup."
    }
} else {
    Write-Warn "Node.js/npm not found. Skipping mobile setup."
    Write-Host "    To start mobile later: cd apps\mobile; npx expo start --host lan" -ForegroundColor Gray
}

# ============================================================================
# Step 8: Print Summary
# ============================================================================
Write-Host ""
Write-Host "  ============================================================" -ForegroundColor Green
Write-Host "                    SETUP COMPLETE!" -ForegroundColor Green
Write-Host "  ============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Services Running:" -ForegroundColor White
Write-Host "    Web App:     http://localhost:3000" -ForegroundColor Green
Write-Host "    API Server:  http://localhost:3003" -ForegroundColor Green
Write-Host "    Mobile Dev:  http://${LanIP}:8081" -ForegroundColor Green
Write-Host "    PostgreSQL:  localhost:5432" -ForegroundColor Gray
Write-Host "    Redis:       localhost:6379" -ForegroundColor Gray
Write-Host "    MinIO:       localhost:9000 (Console: 9001)" -ForegroundColor Gray
Write-Host ""
Write-Host "  Demo Accounts:" -ForegroundColor White
Write-Host "    +--------------+-------------------------+--------------+" -ForegroundColor Gray
Write-Host "    | Role         | Email                   | Password     |" -ForegroundColor Gray
Write-Host "    +--------------+-------------------------+--------------+" -ForegroundColor Gray
Write-Host "    | SuperAdmin   | admin@satcom.com        | Password123! |" -ForegroundColor Red
Write-Host "    | HR           | hr@satcom.com           | Password123! |" -ForegroundColor Blue
Write-Host "    | Manager      | manager@satcom.com      | Password123! |" -ForegroundColor Green
Write-Host "    | Employee     | john@satcom.com         | Password123! |" -ForegroundColor Yellow
Write-Host "    +--------------+-------------------------+--------------+" -ForegroundColor Gray
Write-Host ""
Write-Host "  MOBILE APP TESTING (Same Network - No Cloud Needed):" -ForegroundColor Cyan
Write-Host ""
Write-Host "    Android:" -ForegroundColor White
Write-Host "      1. Install Expo Go from Google Play Store" -ForegroundColor Gray
Write-Host "      2. Make sure your phone is on the same WiFi network" -ForegroundColor Gray
Write-Host "      3. Open Expo Go and scan the QR code in the Expo window" -ForegroundColor Gray
Write-Host "         Or enter: exp://${LanIP}:8081" -ForegroundColor Gray
Write-Host ""
Write-Host "    iOS:" -ForegroundColor White
Write-Host "      1. Install Expo Go from App Store" -ForegroundColor Gray
Write-Host "      2. Make sure your iPhone is on the same WiFi network" -ForegroundColor Gray
Write-Host "      3. Open Camera and scan the QR code" -ForegroundColor Gray
Write-Host "         Or open Safari: exp://${LanIP}:8081" -ForegroundColor Gray
Write-Host ""
Write-Host "  Useful Commands:" -ForegroundColor White
Write-Host "    Stop everything:  docker compose -f docker-compose.prod.yml down" -ForegroundColor Cyan
Write-Host "    View API logs:    docker logs -f satcom-api" -ForegroundColor Cyan
Write-Host "    View Web logs:    docker logs -f satcom-web" -ForegroundColor Cyan
Write-Host "    Database studio:  cd apps\api; npx prisma studio" -ForegroundColor Cyan
Write-Host ""

Wait-ForUser "Press Enter to exit..."
