@echo off
REM BEIT Offline Knowledge Base - Startup Script (Windows)
REM This script starts the Chroma vector database server

echo.
echo Starting BEIT Offline Knowledge Base...
echo.

REM Check if Chroma is installed
where chroma >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Chroma is not installed
    echo Please install Chroma first: pip install chromadb
    pause
    exit /b 1
)

REM Check if Ollama is running
curl -s http://localhost:11434/api/version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo WARNING: Ollama is not running
    echo The knowledge base needs Ollama for embeddings
    echo Please start Ollama or install it from: https://ollama.ai
    echo.
)

REM Check if Chroma is already running
netstat -an | find "8000" | find "LISTENING" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo WARNING: Chroma is already running on port 8000
    echo Use stop.bat to stop it first, or use query.bat to search
    pause
    exit /b 0
)

REM Start Chroma server in background
echo Starting Chroma vector database...
start /B chroma run --path ./chroma-storage > chroma.log 2>&1

REM Wait for Chroma to be ready
echo Waiting for Chroma to start...
timeout /t 3 /nobreak >nul

REM Test if Chroma is responding
curl -s http://localhost:8000/api/v2/heartbeat >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo.
    echo Knowledge base is ready!
    echo.
    echo Next steps:
    echo   - Test search: query.bat "What hands-on activities worked best?"
    echo   - View logs: type chroma.log
    echo   - Stop server: stop.bat
    echo.
) else (
    echo ERROR: Chroma failed to start
    echo Check logs: type chroma.log
    pause
    exit /b 1
)
