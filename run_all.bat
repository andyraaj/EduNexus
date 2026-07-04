@echo off
echo ========================================
echo   Starting EduNexus ERP Application
echo ========================================
echo.

echo [1/2] Starting Backend Server with nodemon (port 5000)...
start "EduNexus Backend" cmd /k "cd /d %~dp0 && npm run dev"

echo [2/2] Starting Frontend Dev Server (port 5173)...
start "EduNexus Frontend" cmd /k "cd /d %~dp0client && npm run dev"

echo.
echo Both servers are starting in separate windows.
echo   Backend:  http://localhost:5000
echo   Frontend: http://localhost:5173
echo ========================================
