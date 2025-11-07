#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CHROMA_PID=""

function stop_services() {
  if [[ -n "${CHROMA_PID}" && -d "/proc/${CHROMA_PID}" ]]; then
    echo "🛑 Stopping local Chroma server (pid ${CHROMA_PID})"
    kill "${CHROMA_PID}" >/dev/null 2>&1 || true
  fi
}
trap stop_services EXIT

echo "🚀 BEIT Knowledge Base – Local Stack"
echo "-----------------------------------"

if ! command -v ollama >/dev/null 2>&1; then
  echo "❌ Ollama is not installed. Get it from https://ollama.ai"
  exit 1
fi

if ! pgrep -f "ollama serve" >/dev/null 2>&1; then
  echo "⚙️  Starting Ollama daemon..."
  ollama serve >/dev/null 2>&1 &
  sleep 2
fi

echo "✅ Ollama running (models: nomic-embed-text, llama3:8b recommended)"

if ! python3 -c "import chromadb" >/dev/null 2>&1; then
  echo "❌ chromadb Python package not found. Install via: pip install chromadb"
  exit 1
fi

echo "⚙️  Starting Chroma server..."
chroma run \
  --path "${SCRIPT_DIR}/chroma-storage" \
  >/tmp/beit-chroma.log 2>&1 &
CHROMA_PID=$!
sleep 2
echo "✅ Chroma running (http://localhost:8000)"

cd "${SCRIPT_DIR}"

if [[ ! -d "node_modules" ]]; then
  echo "📦 Installing npm dependencies..."
  npm install
fi

echo "📚 Seeding Chroma collections from ./data..."
npm run seed

echo "🌐 Starting Next.js dev server (http://localhost:3000)..."
npm run dev
