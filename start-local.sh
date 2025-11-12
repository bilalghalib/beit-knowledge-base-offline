#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

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

cd "${SCRIPT_DIR}"

if [[ ! -d "node_modules" ]]; then
  echo "📦 Installing npm dependencies..."
  npm install
fi

echo "🌐 Starting Next.js dev server (http://localhost:3000)..."
npm run dev
