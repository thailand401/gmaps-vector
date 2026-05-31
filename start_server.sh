#!/bin/bash

# Start the FastAPI server with auto-reload

set -e

# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Change to backend directory
cd "$SCRIPT_DIR/backend"

echo "🚀 Starting FastAPI server..."
echo "📍 Port: 4000"
echo "🔄 Auto-reload: Enabled"
echo "📄 API Docs: http://localhost:4000/docs"
echo ""

# Activate virtual environment if it exists
if [ -f "$SCRIPT_DIR/backend/venv/bin/activate" ]; then
    source "$SCRIPT_DIR/backend/venv/bin/activate"
fi

# Start the server with auto-reload
python3 -m uvicorn main:app --host 0.0.0.0 --port 4000 --reload

