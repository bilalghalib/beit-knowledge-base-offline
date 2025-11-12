#!/bin/bash

# BEIT Offline Knowledge Base - Legacy Startup Script
# ChromaDB is no longer required; search now runs in-memory inside Next.js.

echo "⚠️  This script used to start the standalone Chroma server."
echo "    The app now uses pre-computed JSON + JavaScript vector search."
echo ""
echo "Next steps:"
echo "  • Ensure embeddings exist in ./data (*_embedded.json or *_embedded_1024.json)"
echo "  • (Optional) Start Ollama if you want local AI answers: https://ollama.ai"
echo "  • Run the app with: npm run dev   # for development"
echo "    or build the desktop bundle:    npm run electron:build"
echo ""
echo "Tip: Use ./start-local.sh for a full dev loop (Ollama + Next.js)."
