#!/bin/bash

# Kill the Admin Dashboard HTTP server running on port 8080

echo "🛑 Stopping Admin Dashboard..."

# Find and kill process on port 4040
if lsof -Pi :4040 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    # macOS/Linux: Kill the process using port 4040
    PID=$(lsof -Pi :4040 -sTCP:LISTEN -t)
    echo "Found process on port 4040 (PID: $PID)"
    kill -9 $PID 2>/dev/null || true
    echo "✅ Admin Dashboard stopped successfully"
else
    echo "⚠️  No dashboard running on port 4040"
fi

# Also try to kill any Python HTTP server processes as backup
PYTHON_PID=$(pgrep -f "http.server.*4040" 2>/dev/null || true)
if [ ! -z "$PYTHON_PID" ]; then
    echo "Also killing Python http.server process: $PYTHON_PID"
    kill -9 $PYTHON_PID 2>/dev/null || true
fi

echo "Done!"
