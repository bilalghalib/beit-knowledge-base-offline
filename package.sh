#!/bin/bash

# BEIT Offline Knowledge Base - Packaging Script
# Creates a distributable archive for deployment

echo "📦 Creating deployment package..."
echo ""

# Set output filename with timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
OUTPUT_FILE="beit-knowledge-base-offline_${TIMESTAMP}.tar.gz"
OUTPUT_PATH="../${OUTPUT_FILE}"

# Check if chroma-storage exists
if [ ! -d "chroma-storage" ]; then
    echo "❌ ERROR: chroma-storage directory not found"
    echo "   Please run './start.sh' and seed the database first"
    exit 1
fi

# Check if data directory exists
if [ ! -d "data" ]; then
    echo "❌ ERROR: data directory not found"
    echo "   The source data files are missing"
    exit 1
fi

echo "📋 Including in package:"
echo "   ✓ Chroma vector database (chroma-storage/)"
echo "   ✓ Source data files (data/)"
echo "   ✓ Scripts (start.sh, stop.sh, query.sh, seed.js)"
echo "   ✓ Documentation (DEPLOYMENT.md, package.json, etc.)"
echo ""

# Create archive excluding unnecessary files
tar -czf "$OUTPUT_PATH" \
    --exclude='node_modules' \
    --exclude='.next' \
    --exclude='.git' \
    --exclude='*.log' \
    --exclude='.DS_Store' \
    --exclude='.env' \
    --exclude='.vercel' \
    -C .. \
    "$(basename "$(pwd)")"

if [ $? -eq 0 ]; then
    SIZE=$(du -h "$OUTPUT_PATH" | cut -f1)
    echo "✅ Package created successfully!"
    echo ""
    echo "   File: $OUTPUT_FILE"
    echo "   Size: $SIZE"
    echo "   Location: $(cd .. && pwd)/$OUTPUT_FILE"
    echo ""
    echo "Next steps:"
    echo "  1. Copy this file to the deployment machine"
    echo "  2. Extract: tar -xzf $OUTPUT_FILE"
    echo "  3. Follow instructions in DEPLOYMENT.md"
else
    echo "❌ ERROR: Failed to create package"
    exit 1
fi
