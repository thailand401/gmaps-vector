#!/bin/bash

# Kill the FastAPI server running on port 6000

echo "🛑 Stopping FastAPI server..."

# Find and kill process on port 4000
if lsof -Pi :4000 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    # macOS/Linux: Kill the process using port 4000
    PID=$(lsof -Pi :4000 -sTCP:LISTEN -t)
    echo "Found process on port 4000 (PID: $PID)"
    kill -9 $PID 2>/dev/null || true
    echo "✅ Server stopped successfully"
else
    echo "⚠️  No server running on port 4000"
fi

# Also try to kill any uvicorn processes as backup
UVICORN_PID=$(pgrep -f "uvicorn.*4000" 2>/dev/null || true)
if [ ! -z "$UVICORN_PID" ]; then
    echo "Also killing uvicorn process: $UVICORN_PID"
    kill -9 $UVICORN_PID 2>/dev/null || true
fi

echo "Done!"
