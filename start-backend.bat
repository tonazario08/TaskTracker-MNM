@echo off
echo ========================================
echo Starting TaskTracker Backend Server
echo ========================================
echo.
echo Backend will run on: http://localhost:8080
echo.

cd /d "%~dp0"
node index.js
