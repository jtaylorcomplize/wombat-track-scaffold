#!/bin/bash

# Proper Azure OpenAI Deployment for Zoi Integration
# This script sets up the Azure OpenAI service properly

echo "🚀 Azure OpenAI Deployment for Zoi Agent"
echo "========================================"

# Check if Azure CLI is installed and logged in
if ! az account show > /dev/null 2>&1; then
    echo "❌ Azure CLI not logged in. Please run 'az login' first"
    exit 1
fi

# Set environment variables (these should be in your environment or secrets)
export AZURE_SUBSCRIPTION_ID=${AZURE_SUBSCRIPTION_ID:-"6a59d7ff-a5d9-415e-a8e8-7248265c482c"}
export AZURE_TENANT_ID=${AZURE_TENANT_ID:-"d8fa654c-757e-410b-9799-38cd2762653c"}
export AZURE_RESOURCE_GROUP=${AZURE_RESOURCE_GROUP:-"of-8-6-cloud-rg"}
export AZURE_LOCATION=${AZURE_LOCATION:-"Australia East"}

echo "🔧 Configuration:"
echo "   Subscription: $AZURE_SUBSCRIPTION_ID"
echo "   Resource Group: $AZURE_RESOURCE_GROUP"
echo "   Location: $AZURE_LOCATION"

# Create Azure OpenAI Service
echo ""
echo "1️⃣ Creating Azure OpenAI Service..."

OPENAI_SERVICE_NAME="wombat-track-openai-$(date +%s)"

az cognitiveservices account create \
  --resource-group $AZURE_RESOURCE_GROUP \
  --name $OPENAI_SERVICE_NAME \
  --location "$AZURE_LOCATION" \
  --kind OpenAI \
  --sku S0 \
  --subscription $AZURE_SUBSCRIPTION_ID \
  --yes

if [ $? -eq 0 ]; then
    echo "✅ Azure OpenAI service created: $OPENAI_SERVICE_NAME"
else
    echo "❌ Failed to create Azure OpenAI service"
    exit 1
fi

# Deploy GPT-4o model
echo ""
echo "2️⃣ Deploying GPT-4o model..."

az cognitiveservices account deployment create \
  --resource-group $AZURE_RESOURCE_GROUP \
  --name $OPENAI_SERVICE_NAME \
  --deployment-name "gpt-4o-2024-11-20" \
  --model-name "gpt-4o" \
  --model-version "2024-11-20" \
  --model-format OpenAI \
  --sku-capacity 150 \
  --sku-name "Standard"

echo "✅ GPT-4o model deployed"

# Get endpoint and key
echo ""
echo "3️⃣ Getting service credentials..."

AZURE_OPENAI_ENDPOINT=$(az cognitiveservices account show \
  --resource-group $AZURE_RESOURCE_GROUP \
  --name $OPENAI_SERVICE_NAME \
  --query "properties.endpoint" -o tsv)

AZURE_OPENAI_KEY=$(az cognitiveservices account keys list \
  --resource-group $AZURE_RESOURCE_GROUP \
  --name $OPENAI_SERVICE_NAME \
  --query "key1" -o tsv)

echo "✅ Service endpoint: $AZURE_OPENAI_ENDPOINT"
echo "✅ API key retrieved (length: ${#AZURE_OPENAI_KEY})"

# Create environment file
echo ""
echo "4️⃣ Creating environment configuration..."

cat > .env.azure << EOF
# Azure OpenAI Configuration for Zoi
AZURE_OPENAI_ENDPOINT=$AZURE_OPENAI_ENDPOINT
AZURE_OPENAI_KEY=$AZURE_OPENAI_KEY
AZURE_OPENAI_API_VERSION=2024-02-01
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o-2024-11-20

# Azure Authentication
AZURE_SUBSCRIPTION_ID=$AZURE_SUBSCRIPTION_ID
AZURE_TENANT_ID=$AZURE_TENANT_ID
AZURE_RESOURCE_GROUP=$AZURE_RESOURCE_GROUP

# Service Configuration
AZURE_OPENAI_SERVICE_NAME=$OPENAI_SERVICE_NAME
EOF

echo "✅ Environment file created: .env.azure"

# Test the connection
echo ""
echo "5️⃣ Testing Azure OpenAI connection..."

# Create test script
cat > test-azure-connection.js << 'EOF'
const OpenAI = require('openai');
require('dotenv').config({ path: '.env.azure' });

const client = new OpenAI({
  apiKey: process.env.AZURE_OPENAI_KEY,
  baseURL: `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT_NAME}`,
  defaultQuery: { 'api-version': process.env.AZURE_OPENAI_API_VERSION },
  defaultHeaders: {
    'api-key': process.env.AZURE_OPENAI_KEY,
  },
});

async function testConnection() {
  try {
    console.log('🧪 Testing connection to Azure OpenAI...');
    
    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are Zoi, an autonomous coding agent. Respond briefly to confirm you are connected.'
        },
        {
          role: 'user',
          content: 'Hello Zoi, are you connected to Azure OpenAI?'
        }
      ],
      max_tokens: 100,
      temperature: 0.7
    });

    console.log('✅ Connection successful!');
    console.log('🤖 Zoi responds:', response.choices[0].message.content);
    
    return true;
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    return false;
  }
}

testConnection().then(success => {
  process.exit(success ? 0 : 1);
});
EOF

# Run the test
if npm list openai > /dev/null 2>&1; then
    node test-azure-connection.js
    TEST_RESULT=$?
else
    echo "📦 Installing OpenAI package..."
    npm install openai
    node test-azure-connection.js
    TEST_RESULT=$?
fi

# Cleanup test file
rm -f test-azure-connection.js

if [ $TEST_RESULT -eq 0 ]; then
    echo ""
    echo "🎉 Azure OpenAI Setup Complete!"
    echo ""
    echo "Next steps:"
    echo "1. Source the environment: source .env.azure"
    echo "2. Update Zoi configuration to use real Azure OpenAI"
    echo "3. Remove the complex execution framework (it was a workaround)"
    echo ""
    echo "Zoi can now use real AI instead of mock responses! 🤖✨"
else
    echo ""
    echo "❌ Setup completed but connection test failed"
    echo "Check the environment variables and try again"
fi