@echo off
echo ========================================
echo Starting TaskTracker Frontend Server
echo ========================================
echo.
echo Frontend will run on: http://localhost:3000
echo.

cd /d "%~dp0\frontend"
node server.js
