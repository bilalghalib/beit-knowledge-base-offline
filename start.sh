#!/bin/bash

# BEIT Offline Knowledge Base - Startup Script
# This script starts the Chroma vector database server

echo "🚀 Starting BEIT Offline Knowledge Base..."
echo ""

# Check if Chroma is installed
if ! command -v chroma &> /dev/null; then
    echo "❌ ERROR: Chroma is not installed"
    echo "Please install Chroma first: pip install chromadb"
    exit 1
fi

# Check if Ollama is running
if ! curl -s http://localhost:11434/api/version > /dev/null 2>&1; then
    echo "⚠️  WARNING: Ollama is not running"
    echo "   The knowledge base needs Ollama for embeddings"
    echo "   Please start Ollama or install it from: https://ollama.ai"
    echo ""
fi

# Check if chroma is already running
if lsof -i:8000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "⚠️  Chroma is already running on port 8000"
    echo "   Use ./stop.sh to stop it first, or use ./query.sh to search"
    exit 0
fi

# Start Chroma server in background
echo "📊 Starting Chroma vector database..."
nohup chroma run --path ./chroma-storage > chroma.log 2>&1 &
CHROMA_PID=$!

# Wait for Chroma to be ready
echo "   Waiting for Chroma to start..."
for i in {1..10}; do
    if curl -s http://localhost:8000/api/v2/heartbeat > /dev/null 2>&1; then
        echo "   ✅ Chroma started successfully (PID: $CHROMA_PID)"
        echo ""
        echo "🎉 Knowledge base is ready!"
        echo ""
        echo "Next steps:"
        echo "  • Test search: ./query.sh \"What hands-on activities worked best?\""
        echo "  • View logs: tail -f chroma.log"
        echo "  • Stop server: ./stop.sh"
        echo ""
        exit 0
    fi
    sleep 1
done

echo "❌ ERROR: Chroma failed to start"
echo "   Check logs: tail chroma.log"
exit 1
