#!/bin/bash

# BEIT Offline Knowledge Base - Query Script
# Simple command-line interface for searching the knowledge base

if [ -z "$1" ]; then
    echo "Usage: ./query.sh \"your search query\""
    echo ""
    echo "Examples:"
    echo "  ./query.sh \"What hands-on activities worked best?\""
    echo "  ./query.sh \"What are the main barriers to job placement?\""
    echo "  ./query.sh \"How should we balance theory vs practice?\""
    exit 1
fi

QUERY="$1"

# Check if Chroma is running
if ! curl -s http://localhost:8000/api/v2/heartbeat > /dev/null 2>&1; then
    echo "❌ ERROR: Chroma is not running"
    echo "   Start it first: ./start.sh"
    exit 1
fi

echo "🔍 Searching for: \"$QUERY\""
echo ""

# Run the query using Node.js
node scripts/offline/query.js "$QUERY"
