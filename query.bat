@echo off
REM BEIT Offline Knowledge Base - Query Script (Windows)
REM Simple command-line interface for searching the knowledge base

if "%~1"=="" (
    echo Usage: query.bat "your search query"
    echo.
    echo Examples:
    echo   query.bat "What hands-on activities worked best?"
    echo   query.bat "What are the main barriers to job placement?"
    echo   query.bat "How should we balance theory vs practice?"
    pause
    exit /b 1
)

REM Check if Chroma is running
curl -s http://localhost:8000/api/v2/heartbeat >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Chroma is not running
    echo Start it first: start.bat
    pause
    exit /b 1
)

echo.
echo Searching for: "%~1"
echo.

REM Run the query using Node.js
node scripts/offline/query.js "%~1"
echo.
pause
