#!/bin/bash
# Deploy admin + backend to HF Space: Tataaicoltd/tools
# Usage: ./deploy_hf.sh [commit message]

set -e

MSG=${1:-"deploy: update admin + backend"}

echo "Deploying to HF Space: Tataaicoltd/tools"
echo "Message: $MSG"
echo ""

hf upload Tataaicoltd/tools . . \
    --repo-type space \
    --exclude ".env" \
    --exclude ".git/**" \
    --exclude "ai/**" \
    --exclude "Dataset/**" \
    --exclude "archives/**" \
    --exclude "**/.venv/**" \
    --exclude "**/__pycache__/**" \
    --exclude "**/*.pyc" \
    --exclude "*.sh" \
    --commit-message "$MSG"

echo ""
echo "Done: https://huggingface.co/spaces/Tataaicoltd/tools"
