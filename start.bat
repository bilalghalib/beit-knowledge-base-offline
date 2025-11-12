@echo off
REM BEIT Offline Knowledge Base - Legacy Startup Script
REM ChromaDB is no longer required. Search now runs inside the Next.js server.

echo.
echo This script previously launched the standalone Chroma server.
echo The app now uses pre-computed JSON files and in-memory vector search.
echo.
echo Next steps:
echo   - Ensure ./data contains the *_embedded.json (or *_embedded_1024.json) files
echo   - Optional: install Ollama from https://ollama.ai for local AI answers
echo   - Start the app with: npm run dev
echo     or build the desktop installer: npm run electron:build
echo.
echo Tip: Use start-local.sh on macOS/Linux for a dev workflow that also checks Ollama.
echo.
pause
