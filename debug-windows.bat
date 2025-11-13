@echo off
echo ========================================
echo BEIT Knowledge Base - Debug Log
echo ========================================
echo.
echo Starting app with logging enabled...
echo Log will be saved to: debug-log.txt
echo.
echo Please leave this window open while testing the app.
echo Press Ctrl+C to stop logging.
echo.
echo ========================================
echo.

cd /d "%~dp0"
"BEIT Knowledge Base.exe" > debug-log.txt 2>&1

echo.
echo ========================================
echo App closed. Log saved to debug-log.txt
echo Please send this file to the developer.
echo ========================================
pause
