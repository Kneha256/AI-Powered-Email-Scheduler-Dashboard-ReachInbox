@echo off
echo Starting ReachInbox Email Scheduler...
echo.

echo Starting Backend Server...
start "Backend Server" cmd /k "cd backend && npm run dev"
timeout /t 3 /nobreak > nul

echo Starting Worker...
start "Worker" cmd /k "cd backend && npm run worker"
timeout /t 3 /nobreak > nul

echo Starting Frontend...
start "Frontend" cmd /k "cd frontend && npm start"

echo.
echo All services started!
echo - Backend: http://localhost:5000
echo - Frontend: http://localhost:3000
echo.
echo Press any key to exit (services will keep running)
pause > nul
