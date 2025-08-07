#!/bin/bash

# Azure OpenAI Deployment Script
# Step 8 - Deploy Azure OpenAI in Australia East

set -e

# Configuration
RESOURCE_GROUP="of-8-6-cloud-rg"
LOCATION="australiaeast"
OPENAI_NAME="orbis-of86-openai"
DEPLOYMENT_NAME="of-8-6-gpt4o"
MODEL_NAME="gpt-4o"
KEY_VAULT_NAME="OrbisKeyVaultOF86"

echo "🤖 Step 8: Deploying Azure OpenAI"
echo "=================================="

# 1. Create Azure OpenAI resource
echo "Creating Azure OpenAI resource..."
az cognitiveservices account create \
  --name "$OPENAI_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --kind "OpenAI" \
  --sku "S0" \
  --location "$LOCATION" \
  --custom-domain "$OPENAI_NAME" \
  --tags "environment=production" "project=orbis-of86"

# 2. Get OpenAI endpoint and keys
echo "Retrieving OpenAI credentials..."
OPENAI_ENDPOINT=$(az cognitiveservices account show \
  --name "$OPENAI_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query properties.endpoint -o tsv)

OPENAI_KEY=$(az cognitiveservices account keys list \
  --name "$OPENAI_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query key1 -o tsv)

# 3. Store credentials in Key Vault
echo "Storing OpenAI credentials in Key Vault..."
az keyvault secret set \
  --vault-name "$KEY_VAULT_NAME" \
  --name "openai-endpoint" \
  --value "$OPENAI_ENDPOINT"

az keyvault secret set \
  --vault-name "$KEY_VAULT_NAME" \
  --name "openai-key" \
  --value "$OPENAI_KEY"

# 4. Create GPT-4o deployment
echo "Creating GPT-4o deployment..."
az cognitiveservices account deployment create \
  --name "$OPENAI_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --deployment-name "$DEPLOYMENT_NAME" \
  --model-name "$MODEL_NAME" \
  --model-version "2024-05-13" \
  --model-format "OpenAI" \
  --sku-capacity 10 \
  --sku-name "Standard"

# 5. Configure network access
echo "Configuring network security..."
az cognitiveservices account network-rule add \
  --name "$OPENAI_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --ip-address $(curl -s https://api.ipify.org)

# Allow Container Apps
az cognitiveservices account update \
  --name "$OPENAI_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --custom-domain "$OPENAI_NAME" \
  --bypass "AzureServices"

# 6. Create OpenAI configuration file
echo "Creating OpenAI configuration..."
cat > config/azure-openai-config.json << EOF
{
  "endpoint": "$OPENAI_ENDPOINT",
  "deploymentName": "$DEPLOYMENT_NAME",
  "apiVersion": "2024-02-15-preview",
  "model": "$MODEL_NAME",
  "maxTokens": 4096,
  "temperature": 0.7,
  "region": "$LOCATION",
  "features": {
    "functions": true,
    "visionSupport": true,
    "jsonMode": true
  }
}
EOF

# 7. Update orchestrator to use OpenAI
echo "Creating OpenAI integration service..."
cat > /tmp/openai-integration.js << 'EOF'
const { OpenAIClient, AzureKeyCredential } = require('@azure/openai');
const { DefaultAzureCredential } = require('@azure/identity');

class OpenAIOrchestrationService {
  constructor(config) {
    this.endpoint = config.endpoint;
    this.deploymentName = config.deploymentName;
    this.client = new OpenAIClient(
      this.endpoint,
      new DefaultAzureCredential()
    );
  }

  async processGovernanceEntry(entry) {
    const prompt = `
      Analyze this governance log entry and suggest next actions:
      ${JSON.stringify(entry, null, 2)}
      
      Provide:
      1. Risk assessment
      2. Recommended next steps
      3. Automation opportunities
    `;

    const response = await this.client.getChatCompletions(
      this.deploymentName,
      [
        { role: 'system', content: 'You are an orchestration assistant for the Orbis platform.' },
        { role: 'user', content: prompt }
      ],
      {
        maxTokens: 1000,
        temperature: 0.3
      }
    );

    return response.choices[0].message.content;
  }

  async generatePhaseStep(phaseId, context) {
    const prompt = `
      Generate a phase step for phase ${phaseId}:
      Context: ${JSON.stringify(context)}
      
      Output format:
      {
        "stepName": "...",
        "description": "...",
        "tasks": [...],
        "estimatedDuration": "..."
      }
    `;

    const response = await this.client.getChatCompletions(
      this.deploymentName,
      [
        { role: 'system', content: 'Generate structured phase steps in JSON format.' },
        { role: 'user', content: prompt }
      ],
      {
        responseFormat: { type: 'json_object' }
      }
    );

    return JSON.parse(response.choices[0].message.content);
  }

  async analyzeMemoryAnchors(anchors) {
    const prompt = `
      Analyze these memory anchors and identify patterns:
      ${JSON.stringify(anchors, null, 2)}
      
      Provide insights on:
      1. Completion trends
      2. Risk patterns
      3. Optimization opportunities
    `;

    const response = await this.client.getChatCompletions(
      this.deploymentName,
      [
        { role: 'system', content: 'You are a data analyst for governance patterns.' },
        { role: 'user', content: prompt }
      ]
    );

    return response.choices[0].message.content;
  }
}

module.exports = OpenAIOrchestrationService;
EOF

# 8. Link to orchestration container
echo "Updating orchestration container with OpenAI..."
az containerapp update \
  --name "orbis-orchestrator" \
  --resource-group "$RESOURCE_GROUP" \
  --set-env-vars \
    OPENAI_ENDPOINT="$OPENAI_ENDPOINT" \
    OPENAI_DEPLOYMENT="$DEPLOYMENT_NAME" \
    OPENAI_ENABLED="true"

# 9. Create test script
echo "Creating OpenAI test script..."
cat > scripts/test-openai.sh << 'EOFTEST'
#!/bin/bash
# Test Azure OpenAI integration

ENDPOINT=$(az keyvault secret show --vault-name OrbisKeyVaultOF86 --name openai-endpoint --query value -o tsv)
KEY=$(az keyvault secret show --vault-name OrbisKeyVaultOF86 --name openai-key --query value -o tsv)

curl -X POST "$ENDPOINT/openai/deployments/of-8-6-gpt4o/chat/completions?api-version=2024-02-15-preview" \
  -H "Content-Type: application/json" \
  -H "api-key: $KEY" \
  -d '{
    "messages": [
      {"role": "system", "content": "You are an Azure OpenAI test."},
      {"role": "user", "content": "Confirm deployment status."}
    ],
    "max_tokens": 100
  }'
EOFTEST

chmod +x scripts/test-openai.sh

# 10. Create governance log entry
echo "Creating governance log entry..."
cat >> logs/governance.jsonl << EOF
{"timestamp":"$(date -u +%Y-%m-%dT%H:%M:%SZ)","entryType":"AI","summary":"Azure OpenAI deployed with GPT-4o model","phaseId":"OF-8.6","artifacts":["OpenAI:$OPENAI_NAME","Deployment:$DEPLOYMENT_NAME","Model:$MODEL_NAME"],"riskLevel":"Low","memoryAnchor":"of-8.6-openai-live-$(date +%Y%m%d)","aiConfig":{"endpoint":"$OPENAI_ENDPOINT","model":"$MODEL_NAME","region":"$LOCATION"}}
EOF

echo "✅ Step 8: Azure OpenAI deployed!"
echo ""
echo "OpenAI Details:"
echo "- Resource: $OPENAI_NAME"
echo "- Endpoint: $OPENAI_ENDPOINT"
echo "- Deployment: $DEPLOYMENT_NAME"
echo "- Model: $MODEL_NAME"
echo "- Region: $LOCATION"
echo ""
echo "Test with: bash scripts/test-openai.sh"