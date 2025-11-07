@echo off
REM BEIT Offline Knowledge Base - Shutdown Script (Windows)
REM This script stops the Chroma vector database server

echo.
echo Stopping BEIT Offline Knowledge Base...
echo.

REM Find and kill chroma process
taskkill /F /IM python.exe /FI "WINDOWTITLE eq chroma*" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo Chroma server stopped
) else (
    echo Chroma server was not running
)

REM Also try to kill by port
for /f "tokens=5" %%a in ('netstat -ano ^| find ":8000" ^| find "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
    echo Stopped process on port 8000
)

echo.
echo Knowledge base stopped. Use start.bat to restart.
echo.
pause
