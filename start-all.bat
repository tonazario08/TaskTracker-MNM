@echo off
echo ========================================
echo Starting TaskTracker Application
echo ========================================
echo.
echo Starting Backend on http://localhost:8080
echo Starting Frontend on http://localhost:3000
echo.
echo Press Ctrl+C to stop all servers
echo.

cd /d "%~dp0"

:: Start backend in new window
start "TaskTracker Backend" cmd /k "node index.js"

:: Wait 2 seconds for backend to start
timeout /t 2 /nobreak >nul

:: Start frontend in new window
start "TaskTracker Frontend" cmd /k "cd frontend && node server.js"

echo.
echo ========================================
echo Both servers are starting...
echo ========================================
echo.
echo Backend: http://localhost:8080
echo Frontend: http://localhost:3000
echo.
echo Login: http://localhost:3000/login
echo Register: http://localhost:3000/register
echo.
echo Close this window or press any key to exit
pause >nul
