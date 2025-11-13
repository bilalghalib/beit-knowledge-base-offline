#!/bin/bash

# Kill any existing instances
killall "BEIT Knowledge Base" 2>/dev/null
sleep 2

# Clean up ports
lsof -ti:3335 | xargs kill -9 2>/dev/null

# Set log file
LOG_FILE="$(pwd)/app-debug-$(date +%Y%m%d-%H%M%S).log"

echo "Starting BEIT Knowledge Base with logging..."
echo "Log file: $LOG_FILE"
echo ""
echo "The app window will open. Leave this terminal open to see logs."
echo "Press Ctrl+C to stop logging."
echo ""
echo "----------------------------------------"

# Run the app and capture all output
"$(pwd)/dist/mac-arm64/BEIT Knowledge Base.app/Contents/MacOS/BEIT Knowledge Base" 2>&1 | tee "$LOG_FILE"
