@echo off
title Gan Downloader
cd /d "%~dp0"
echo ===================================================
echo             Starting Gan Downloader
echo ===================================================
echo.

:: Wait 4 seconds for the server to initiate, then open Chrome to localhost:3000
start /b cmd /c "timeout /t 4 >nul && start chrome http://localhost:3000"

:: Start the servers
npm run dev:all
pause
