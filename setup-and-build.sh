#!/bin/bash

###############################################################################
# BEIT Knowledge Base - Complete Setup and Build Script
#
# This script automates the entire build process:
# 1. Checks prerequisites
# 2. Installs dependencies
# 3. Pre-computes embeddings (OpenAI or Ollama)
# 4. Downloads ONNX model
# 5. Builds Electron installer
#
# Usage:
#   ./setup-and-build.sh
#   ./setup-and-build.sh --openai-key sk-your-key
#   ./setup-and-build.sh --use-ollama
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PLATFORM="$(uname -s)"
OPENAI_KEY=""
USE_OLLAMA=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --openai-key)
      OPENAI_KEY="$2"
      shift 2
      ;;
    --use-ollama)
      USE_OLLAMA=true
      shift
      ;;
    --help)
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --openai-key KEY    Use OpenAI for embeddings (recommended, ~\$0.10)"
      echo "  --use-ollama        Use Ollama for embeddings (free, slower)"
      echo "  --help              Show this help message"
      echo ""
      echo "Examples:"
      echo "  $0 --openai-key sk-abc123"
      echo "  $0 --use-ollama"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

###############################################################################
# Helper Functions
###############################################################################

print_header() {
  echo -e "\n${BLUE}================================${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}================================${NC}\n"
}

print_success() {
  echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
  echo -e "${RED}❌ $1${NC}"
}

print_warning() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
  echo -e "${BLUE}ℹ️  $1${NC}"
}

check_command() {
  if command -v "$1" &> /dev/null; then
    print_success "$1 is installed"
    return 0
  else
    print_error "$1 is not installed"
    return 1
  fi
}

###############################################################################
# Main Script
###############################################################################

clear
echo -e "${GREEN}"
cat << "EOF"
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   BEIT Knowledge Base - Complete Setup & Build Script       ║
║                                                              ║
║   This will build a 120MB offline desktop app with:         ║
║   • Zero dependencies for end users                         ║
║   • Pre-computed embeddings (OpenAI or Ollama)              ║
║   • Bundled ONNX model for offline search                   ║
║   • Pure JavaScript vector search                           ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}\n"

###############################################################################
# Step 1: Check Prerequisites
###############################################################################

print_header "Step 1: Checking Prerequisites"

ALL_GOOD=true

# Check Node.js
if check_command "node"; then
  NODE_VERSION=$(node --version)
  print_info "Node.js version: $NODE_VERSION"
else
  print_error "Node.js is required. Install from: https://nodejs.org"
  ALL_GOOD=false
fi

# Check npm
if check_command "npm"; then
  NPM_VERSION=$(npm --version)
  print_info "npm version: $NPM_VERSION"
else
  print_error "npm is required (comes with Node.js)"
  ALL_GOOD=false
fi

# Check git (optional but recommended)
if check_command "git"; then
  GIT_VERSION=$(git --version)
  print_info "Git version: $GIT_VERSION"
fi

if [ "$ALL_GOOD" = false ]; then
  print_error "Please install missing prerequisites and try again"
  exit 1
fi

print_success "All prerequisites satisfied!"

###############################################################################
# Step 2: Install Dependencies
###############################################################################

print_header "Step 2: Installing Dependencies"

print_info "Running npm install..."
npm install

if [ $? -eq 0 ]; then
  print_success "Dependencies installed successfully"
else
  print_error "Failed to install dependencies"
  exit 1
fi

###############################################################################
# Step 3: Decide on Embedding Method
###############################################################################

print_header "Step 3: Pre-Computing Embeddings"

# If neither option specified, ask user
if [ -z "$OPENAI_KEY" ] && [ "$USE_OLLAMA" = false ]; then
  echo "Choose embedding method:"
  echo ""
  echo "  1) OpenAI (Recommended)"
  echo "     - Best quality"
  echo "     - Cost: ~\$0.10 (one-time)"
  echo "     - Time: ~2 minutes"
  echo ""
  echo "  2) Ollama (Free)"
  echo "     - Very good quality"
  echo "     - Cost: FREE"
  echo "     - Time: ~10 minutes"
  echo "     - Requires: Ollama installed and running"
  echo ""
  read -p "Enter choice (1 or 2): " CHOICE

  case $CHOICE in
    1)
      read -p "Enter your OpenAI API key: " OPENAI_KEY
      if [ -z "$OPENAI_KEY" ]; then
        print_error "OpenAI API key is required"
        print_info "Get one from: https://platform.openai.com/api-keys"
        exit 1
      fi
      ;;
    2)
      USE_OLLAMA=true
      ;;
    *)
      print_error "Invalid choice. Please run the script again."
      exit 1
      ;;
  esac
fi

# Pre-compute embeddings based on choice
if [ -n "$OPENAI_KEY" ]; then
  print_info "Pre-computing embeddings with OpenAI..."
  print_info "This will cost approximately \$0.10"
  print_info "Processing 425+ insights, curriculum, and metadata..."

  export OPENAI_API_KEY="$OPENAI_KEY"
  npm run precompute-embeddings:openai

  if [ $? -eq 0 ]; then
    print_success "Embeddings pre-computed with OpenAI"
  else
    print_error "Failed to pre-compute embeddings with OpenAI"
    print_info "Check your API key and try again"
    exit 1
  fi

elif [ "$USE_OLLAMA" = true ]; then
  print_info "Pre-computing embeddings with Ollama..."
  print_warning "Make sure Ollama is running: ollama serve"
  print_warning "Make sure model is downloaded: ollama pull nomic-embed-text"

  # Check if Ollama is running
  if curl -s http://localhost:11434/api/version > /dev/null 2>&1; then
    print_success "Ollama is running"
  else
    print_error "Ollama is not running"
    print_info "Start Ollama with: ollama serve"
    print_info "Download model with: ollama pull nomic-embed-text"
    exit 1
  fi

  npm run precompute-embeddings

  if [ $? -eq 0 ]; then
    print_success "Embeddings pre-computed with Ollama"
  else
    print_error "Failed to pre-compute embeddings with Ollama"
    exit 1
  fi
fi

# Verify embeddings were created
if [ -f "data/insights_embedded.json" ] && \
   [ -f "data/curriculum_embedded.json" ] && \
   [ -f "data/metadata_embedded.json" ]; then
  print_success "All embedding files created successfully"

  # Show file sizes
  INSIGHTS_SIZE=$(du -h data/insights_embedded.json | cut -f1)
  CURRICULUM_SIZE=$(du -h data/curriculum_embedded.json | cut -f1)
  METADATA_SIZE=$(du -h data/metadata_embedded.json | cut -f1)

  print_info "insights_embedded.json: $INSIGHTS_SIZE"
  print_info "curriculum_embedded.json: $CURRICULUM_SIZE"
  print_info "metadata_embedded.json: $METADATA_SIZE"
else
  print_error "Embedding files were not created"
  exit 1
fi

###############################################################################
# Step 4: Download ONNX Model
###############################################################################

print_header "Step 4: Downloading ONNX Model"

# Check if model already exists
if [ -f "models/embedding-model.onnx" ]; then
  MODEL_SIZE=$(du -h models/embedding-model.onnx | cut -f1)
  print_warning "ONNX model already exists ($MODEL_SIZE)"
  read -p "Re-download? (y/N): " REDOWNLOAD

  if [[ "$REDOWNLOAD" =~ ^[Yy]$ ]]; then
    rm -f models/embedding-model.onnx
    npm run download-onnx-model
  else
    print_info "Using existing ONNX model"
  fi
else
  print_info "Downloading ONNX model (~25MB)..."
  npm run download-onnx-model

  if [ $? -eq 0 ]; then
    print_success "ONNX model downloaded successfully"
  else
    print_error "Failed to download ONNX model"
    print_info "You can download manually from:"
    print_info "https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2"
    exit 1
  fi
fi

# Verify model exists
if [ -f "models/embedding-model.onnx" ]; then
  MODEL_SIZE=$(du -h models/embedding-model.onnx | cut -f1)
  print_success "ONNX model ready ($MODEL_SIZE)"
else
  print_error "ONNX model not found"
  exit 1
fi

###############################################################################
# Step 5: Build Next.js Application
###############################################################################

print_header "Step 5: Building Next.js Application"

print_info "Building production Next.js app..."
npm run build

if [ $? -eq 0 ]; then
  print_success "Next.js build completed"
else
  print_error "Next.js build failed"
  exit 1
fi

###############################################################################
# Step 6: Build Electron Installer
###############################################################################

print_header "Step 6: Building Electron Installer"

# Determine platform
case "$PLATFORM" in
  Darwin)
    print_info "Building for macOS..."
    PLATFORM_NAME="mac"
    ;;
  Linux)
    print_warning "Building on Linux for Windows target..."
    PLATFORM_NAME="win"
    ;;
  MINGW*|MSYS*|CYGWIN*)
    print_info "Building for Windows..."
    PLATFORM_NAME="win"
    ;;
  *)
    print_warning "Unknown platform: $PLATFORM"
    print_info "Defaulting to Windows build..."
    PLATFORM_NAME="win"
    ;;
esac

print_info "Running electron-builder for $PLATFORM_NAME..."
npx electron-builder --$PLATFORM_NAME

if [ $? -eq 0 ]; then
  print_success "Electron installer built successfully!"
else
  print_error "Electron build failed"
  exit 1
fi

###############################################################################
# Step 7: Summary
###############################################################################

print_header "Build Complete! 🎉"

echo -e "${GREEN}Your offline desktop app is ready!${NC}\n"

# Find the installer
if [ -d "dist" ]; then
  echo -e "${BLUE}Installer location:${NC}"
  ls -lh dist/*.exe dist/*.dmg dist/*.zip 2>/dev/null | awk '{print "  " $9 " (" $5 ")"}'
  echo ""
fi

echo -e "${BLUE}What was built:${NC}"
echo "  ✅ Pre-computed embeddings (~35MB)"
echo "  ✅ ONNX model bundled (~25MB)"
echo "  ✅ Pure JavaScript vector search"
echo "  ✅ Electron desktop application"
echo "  ✅ Complete offline functionality"
echo ""

echo -e "${BLUE}User experience:${NC}"
echo "  1. User downloads installer (~120MB)"
echo "  2. User double-clicks to install"
echo "  3. User opens app and searches immediately"
echo "  4. No setup, no internet, no dependencies!"
echo ""

echo -e "${BLUE}Next steps:${NC}"
echo "  • Test the installer on a clean machine"
echo "  • Verify it works completely offline"
echo "  • Distribute to your users!"
echo ""

if [ -n "$OPENAI_KEY" ]; then
  echo -e "${YELLOW}Total cost: ~\$0.10 (OpenAI embeddings)${NC}"
else
  echo -e "${GREEN}Total cost: \$0 (used Ollama)${NC}"
fi

echo ""
print_success "Build process completed successfully!"
echo ""
