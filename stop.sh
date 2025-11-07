#!/bin/bash

# BEIT Offline Knowledge Base - Shutdown Script
# This script stops the Chroma vector database server

echo "🛑 Stopping BEIT Offline Knowledge Base..."

# Find and kill chroma process
if pgrep -f "chroma run" > /dev/null; then
    pkill -f "chroma run"
    echo "   ✅ Chroma server stopped"
else
    echo "   ℹ️  Chroma server was not running"
fi

# Check if port is still in use
if lsof -i:8000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "   ⚠️  Port 8000 still in use, forcefully killing..."
    PID=$(lsof -i:8000 -sTCP:LISTEN -t)
    kill -9 $PID 2>/dev/null
    echo "   ✅ Forced shutdown complete"
fi

echo ""
echo "Knowledge base stopped. Use ./start.sh to restart."
