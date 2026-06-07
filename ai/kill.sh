#!/bin/bash
PID=$(lsof -ti :4020)
if [ -n "$PID" ]; then
    kill -9 $PID && echo "✅ AI service (port 4020) stopped"
else
    echo "ℹ️  AI service not running"
fi
