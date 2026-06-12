#!/bin/bash
# Deploy backend-only to HF Space: Tataaicoltd/api
# Usage: ./deploy_api.sh [commit message]

set -e

MSG=${1:-"deploy: update backend API"}
SPACE="Tataaicoltd/api"

echo "Deploying backend to HF Space: $SPACE"
echo "Message: $MSG"
echo ""

# Create a staging directory with the exact HF Space structure
STAGING=$(mktemp -d)
trap "rm -rf $STAGING" EXIT

# Build staging: Dockerfile.api → Dockerfile, backend/ as-is
cp Dockerfile.api "$STAGING/Dockerfile"
cp -r backend/ "$STAGING/backend/"

# Upload the staging dir to the HF Space root
hf upload $SPACE "$STAGING/" . \
    --repo-type space \
    --exclude "**/__pycache__/**" \
    --exclude "**/*.pyc" \
    --commit-message "$MSG"

echo ""
echo "Done: https://huggingface.co/spaces/$SPACE"
