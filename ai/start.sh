#!/bin/bash
cd "$(dirname "$0")"

PYTHON=$(command -v python3.12 || command -v python3 || command -v python)
if [ -z "$PYTHON" ]; then
    echo "❌ python3.12 not found."
    exit 1
fi

# Create venv with Python 3.12 if not exists
if [ ! -f ".venv/bin/python" ]; then
    echo "🔧 Creating virtual environment (Python 3.12)…"
    $PYTHON -m venv .venv
fi

VENV_PIP=".venv/bin/pip"
VENV_PY=".venv/bin/python"

echo "📦 Installing dependencies…"
# onnxruntime arm64 macOS only has ≤1.19.2 — install first, then vieneu --no-deps
$VENV_PIP install -q onnxruntime==1.19.2
$VENV_PIP install -q vieneu --no-deps
$VENV_PIP install -q fastapi "uvicorn[standard]" python-multipart \
    huggingface_hub sea-g2p llama-cpp-python \
    soundfile soxr "tokenizers>=0.20" perth

echo "🚀 Starting VieNeu TTS service on port 4020…"
$VENV_PY main.py
