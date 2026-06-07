#!/bin/bash

# Start the Admin Dashboard HTTP server

set -e

# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Change to admin directory
cd "$SCRIPT_DIR/admin"

echo "🚀 Starting Admin Dashboard..."
echo "📍 Port: 4040"
echo "📄 URL: http://localhost:4040"
echo "🔗 API: http://localhost:4000/api"
echo ""

# Start the HTTP server
python -m http.server 4040
