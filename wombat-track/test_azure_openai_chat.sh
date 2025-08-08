#!/bin/bash

# ==========================
# Azure OpenAI CLI Test Script
# Author: Orbis / Phase 9.0
# Purpose: Test "Zoi/Zoe" chat from Linux CLI
# ==========================

# ---- TEST PROMPT ----
TEST_PROMPT="Hello Zoe, this is a test from Linux CLI."

echo "🔹 Sending test chat completion request to Azure OpenAI..."
echo "🔹 Endpoint: $AZURE_OPENAI_ENDPOINT"
echo "🔹 Deployment: $AZURE_OPENAI_DEPLOYMENT"

# ---- CURL REQUEST ----
curl -s -X POST \
"$AZURE_OPENAI_ENDPOINT/openai/deployments/$AZURE_OPENAI_DEPLOYMENT/chat/completions?api-version=$AZURE_OPENAI_API_VERSION" \
-H "Content-Type: application/json" \
-H "api-key: $AZURE_OPENAI_KEY" \
-d "{
  \"messages\": [
    {\"role\":\"system\",\"content\":\"You are Zoi (Zoe), an AI assistant.\"},
    {\"role\":\"user\",\"content\":\"$TEST_PROMPT\"}
  ],
  \"max_tokens\": 100,
  \"temperature\": 0.7
}" | jq .
