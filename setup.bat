@echo off
echo ========================================
echo ReachInbox Email Scheduler - Setup
echo ========================================
echo.

echo [1/5] Starting Docker services...
docker-compose up -d
if %errorlevel% neq 0 (
    echo ERROR: Docker failed to start. Make sure Docker is installed and running.
    pause
    exit /b 1
)
echo Waiting for services to initialize...
timeout /t 10 /nobreak > nul
echo.

echo [2/5] Installing backend dependencies...
cd backend
if not exist .env (
    echo Creating .env file...
    copy .env.example .env
    echo.
    echo IMPORTANT: Edit backend\.env and add your Google OAuth credentials!
    echo Get them from: https://console.cloud.google.com/
    echo.
)
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Backend npm install failed
    cd ..
    pause
    exit /b 1
)
cd ..
echo.

echo [3/5] Installing frontend dependencies...
cd frontend
if not exist .env (
    echo Creating .env file...
    copy .env.example .env
)
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Frontend npm install failed
    cd ..
    pause
    exit /b 1
)
cd ..
echo.

echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Edit backend\.env and add Google OAuth credentials
echo 2. Run: start-all.bat
echo.
echo Or manually:
echo - Terminal 1: cd backend ^&^& npm run dev
echo - Terminal 2: cd backend ^&^& npm run worker
echo - Terminal 3: cd frontend ^&^& npm start
echo.
pause
