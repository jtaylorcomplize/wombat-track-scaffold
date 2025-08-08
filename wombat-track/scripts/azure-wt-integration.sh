#!/bin/bash

# Azure + Wombat Track Integration Script
# Step 3 - Enable runtime triggers and CI/CD dispatch

set -e

# Configuration
RESOURCE_GROUP="of-8-6-cloud-rg"
LOCATION="australiaeast"
CONTAINER_NAME="orbis-trigger-dispatch"
CONTAINER_IMAGE="node:18-alpine"
STORAGE_ACCOUNT="orbisof86storage"

echo "🔗 Step 3: Integration to Wombat Track / Orbis"

# 1. Create trigger dispatch script
echo "Creating trigger dispatch script..."
cat > /tmp/trigger-dispatch.js << 'EOF'
const https = require('https');
const { DefaultAzureCredential } = require('@azure/identity');

// GitHub dispatch configuration
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_OWNER = 'orbis-platform';
const GITHUB_REPO = 'wombat-track';
const WORKFLOW_FILE = 'claude-dispatch.yml';

// Azure AD token validation
async function validateAADToken(token) {
  const credential = new DefaultAzureCredential();
  try {
    // Validate token with Azure AD
    return true; // Simplified for now
  } catch (error) {
    console.error('Token validation failed:', error);
    return false;
  }
}

// Trigger GitHub workflow dispatch
async function triggerWorkflow(payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      ref: 'main',
      inputs: {
        task: payload.task,
        context: payload.context,
        requestId: payload.requestId
      }
    });

    const options = {
      hostname: 'api.github.com',
      path: `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/workflows/${WORKFLOW_FILE}/dispatches`,
      method: 'POST',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Orbis-Trigger-Service',
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 204) {
          resolve({ success: true, message: 'Workflow triggered' });
        } else {
          reject(new Error(`GitHub API error: ${res.statusCode} - ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Log to governance
async function logToGovernance(entry) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    entryType: 'CloudTrigger',
    summary: entry.summary,
    requestId: entry.requestId,
    status: entry.status,
    artifacts: entry.artifacts || []
  };
  
  console.log('GOVERNANCE_LOG:', JSON.stringify(logEntry));
  // TODO: Write to Azure Blob Storage
  return logEntry;
}

// Main HTTP server
const http = require('http');
const server = http.createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/trigger') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        // Validate AAD token
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          res.writeHead(401);
          res.end('Unauthorized');
          return;
        }

        const token = authHeader.substring(7);
        const isValid = await validateAADToken(token);
        if (!isValid) {
          res.writeHead(403);
          res.end('Forbidden');
          return;
        }

        // Parse payload
        const payload = JSON.parse(body);
        
        // Trigger GitHub workflow
        const result = await triggerWorkflow(payload);
        
        // Log to governance
        await logToGovernance({
          summary: `Triggered Claude dispatch: ${payload.task}`,
          requestId: payload.requestId,
          status: 'success',
          artifacts: ['github-workflow-dispatch']
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (error) {
        console.error('Error:', error);
        await logToGovernance({
          summary: `Failed to trigger dispatch: ${error.message}`,
          requestId: payload?.requestId,
          status: 'error'
        });
        res.writeHead(500);
        res.end('Internal Server Error');
      }
    });
  } else if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200);
    res.end('OK');
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Trigger dispatch service running on port ${PORT}`);
});
EOF

# 2. Create Dockerfile
echo "Creating Dockerfile..."
cat > /tmp/Dockerfile << 'EOF'
FROM node:18-alpine
WORKDIR /app
COPY trigger-dispatch.js .
RUN npm init -y && npm install @azure/identity
EXPOSE 8080
CMD ["node", "trigger-dispatch.js"]
EOF

# 3. Build and push container image
echo "Building container image..."
# Note: This requires Azure Container Registry to be set up
ACR_NAME="orbisof86acr"

# Create ACR if not exists
az acr create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$ACR_NAME" \
  --sku Basic \
  --location "$LOCATION" 2>/dev/null || true

# Build and push image
az acr build \
  --registry "$ACR_NAME" \
  --image trigger-dispatch:latest \
  --file /tmp/Dockerfile \
  /tmp

# 4. Deploy container instance
echo "Deploying container instance..."
az container create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$CONTAINER_NAME" \
  --image "$ACR_NAME.azurecr.io/trigger-dispatch:latest" \
  --cpu 0.5 \
  --memory 0.5 \
  --restart-policy Always \
  --ports 8080 \
  --dns-name-label "orbis-trigger-${RANDOM}" \
  --environment-variables \
    GITHUB_TOKEN="$GITHUB_TOKEN" \
    AZURE_CLIENT_ID="$CLIENT_ID" \
    AZURE_TENANT_ID="$TENANT_ID" \
  --secure-environment-variables \
    AZURE_CLIENT_SECRET="$CLIENT_SECRET" \
  --assign-identity

# Get container FQDN
CONTAINER_FQDN=$(az container show \
  --resource-group "$RESOURCE_GROUP" \
  --name "$CONTAINER_NAME" \
  --query ipAddress.fqdn -o tsv)

echo "✅ Step 3: Wombat Track integration complete!"
echo ""
echo "Container deployed at: https://$CONTAINER_FQDN"
echo "Endpoints:"
echo "  - POST /trigger - Dispatch Claude workflow"
echo "  - GET /health - Health check"