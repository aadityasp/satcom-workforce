@echo off
:: ============================================================================
:: Satcom Workforce - Windows Installer (Double-Click to Run)
:: ============================================================================
:: This batch file launches the PowerShell setup script with proper permissions.
:: Just double-click this file - it handles everything automatically.
:: ============================================================================

title Satcom Workforce - Setup

echo.
echo   ============================================================
echo        SATCOM WORKFORCE - Windows Installer
echo   ============================================================
echo.
echo   This will install and set up the entire Satcom Workforce
echo   platform on your machine, including:
echo.
echo     - Docker Desktop  (if not installed)
echo     - Node.js 20      (if not installed)
echo     - PostgreSQL, Redis, MinIO (via Docker)
echo     - API Server       (http://localhost:3003)
echo     - Web App          (http://localhost:3000)
echo     - Mobile Dev Server (Expo on your LAN IP)
echo.
echo   ============================================================
echo.

:: Check if running as admin
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo   [!] Administrator privileges required. Requesting elevation...
    echo.
    powershell -Command "Start-Process cmd -ArgumentList '/c cd /d \"%~dp0\" && \"%~f0\"' -Verb RunAs"
    exit /b
)

echo   [OK] Running as Administrator
echo.

:: Change to script directory
cd /d "%~dp0"

:: Check if setup.ps1 exists
if not exist "setup.ps1" (
    echo   [ERROR] setup.ps1 not found in current directory.
    echo   Make sure setup.bat and setup.ps1 are in the project root folder.
    echo.
    pause
    exit /b 1
)

echo   Starting setup...
echo.

:: Run PowerShell script with bypass
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup.ps1"

if %errorlevel% neq 0 (
    echo.
    echo   [!] Setup encountered an error. Check the output above.
    echo.
)

pause
