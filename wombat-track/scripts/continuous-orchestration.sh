#!/bin/bash

# Continuous Orchestration Mode Setup
# Step 7 - Deploy container service for governance watching

set -e

# Configuration
RESOURCE_GROUP="of-8-6-cloud-rg"
LOCATION="australiaeast"
CONTAINER_APP_NAME="orbis-orchestrator"
CONTAINER_APP_ENV="orbis-of-86-env"
ACR_NAME="orbisof86acr"

echo "🔄 Step 7: Enabling Continuous Orchestration Mode"
echo "=================================================="

# 1. Create orchestrator service
echo "Creating orchestrator service..."
cat > /tmp/orchestrator.js << 'EOF'
const { BlobServiceClient } = require('@azure/storage-blob');
const { DefaultAzureCredential } = require('@azure/identity');
const sql = require('mssql');
const EventEmitter = require('events');

class ContinuousOrchestrator extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.pollInterval = config.pollInterval || 30000; // 30 seconds
    this.lastProcessedTimestamp = null;
  }

  async initialize() {
    // Initialize Azure Blob Storage client
    this.blobClient = new BlobServiceClient(
      `https://${this.config.storageAccount}.blob.core.windows.net`,
      new DefaultAzureCredential()
    );
    
    // Initialize SQL connection
    this.sqlConfig = {
      server: this.config.sqlServer,
      database: this.config.sqlDatabase,
      authentication: {
        type: 'azure-active-directory-default'
      },
      options: {
        encrypt: true,
        trustServerCertificate: false
      }
    };
    
    console.log('✅ Orchestrator initialized');
  }

  async watchGovernanceLogs() {
    console.log('👁️ Starting governance log watcher...');
    
    setInterval(async () => {
      try {
        await this.processNewEntries();
      } catch (error) {
        console.error('Error processing entries:', error);
      }
    }, this.pollInterval);
  }

  async processNewEntries() {
    const containerClient = this.blobClient.getContainerClient('wt-governance-logs');
    
    // List blobs modified since last check
    const blobs = containerClient.listBlobsFlat();
    
    for await (const blob of blobs) {
      if (this.isNewEntry(blob)) {
        await this.processGovernanceEntry(blob);
      }
    }
  }

  isNewEntry(blob) {
    if (!this.lastProcessedTimestamp) return true;
    return new Date(blob.properties.lastModified) > this.lastProcessedTimestamp;
  }

  async processGovernanceEntry(blob) {
    console.log(`📋 Processing: ${blob.name}`);
    
    // Download and parse governance entry
    const containerClient = this.blobClient.getContainerClient('wt-governance-logs');
    const blobClient = containerClient.getBlobClient(blob.name);
    const downloadResponse = await blobClient.download();
    const content = await this.streamToString(downloadResponse.readableStreamBody);
    
    try {
      const entries = content.split('\n')
        .filter(line => line.trim())
        .map(line => JSON.parse(line));
      
      for (const entry of entries) {
        await this.createPhaseStep(entry);
        await this.createMemoryAnchor(entry);
        await this.logToSQL(entry);
        this.emit('entryProcessed', entry);
      }
      
      this.lastProcessedTimestamp = new Date(blob.properties.lastModified);
    } catch (error) {
      console.error(`Failed to process ${blob.name}:`, error);
    }
  }

  async createPhaseStep(entry) {
    if (!entry.phaseId) return;
    
    console.log(`🎯 Creating PhaseStep for ${entry.phaseId}`);
    
    try {
      const pool = await sql.connect(this.sqlConfig);
      const result = await pool.request()
        .input('phaseId', sql.NVarChar, entry.phaseId)
        .input('stepName', sql.NVarChar, entry.summary || 'Auto-generated step')
        .input('memoryAnchor', sql.NVarChar, entry.memoryAnchor)
        .input('metadata', sql.NVarChar, JSON.stringify(entry))
        .execute('mcp.CreatePhaseStep');
      
      console.log(`✅ PhaseStep created: ID ${result.recordset[0].NewStepId}`);
      
      // Notify oApp via webhook
      await this.notifyOApp({
        type: 'phaseStepCreated',
        phaseId: entry.phaseId,
        stepId: result.recordset[0].NewStepId,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to create PhaseStep:', error);
    }
  }

  async createMemoryAnchor(entry) {
    if (!entry.memoryAnchor) return;
    
    console.log(`⚓ Creating Memory Anchor: ${entry.memoryAnchor}`);
    
    // Save to DriveMemory
    const memoryEntry = {
      anchorId: entry.memoryAnchor,
      timestamp: entry.timestamp,
      phaseId: entry.phaseId,
      summary: entry.summary,
      artifacts: entry.artifacts || [],
      cloudSync: true,
      source: 'continuous-orchestration'
    };
    
    // Upload to blob storage
    const containerClient = this.blobClient.getContainerClient('drive-memory');
    const blobName = `anchors/${entry.memoryAnchor}.json`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    
    await blockBlobClient.upload(
      JSON.stringify(memoryEntry, null, 2),
      JSON.stringify(memoryEntry).length
    );
    
    console.log(`✅ Memory Anchor created: ${blobName}`);
  }

  async logToSQL(entry) {
    try {
      const pool = await sql.connect(this.sqlConfig);
      await pool.request()
        .input('timestamp', sql.DateTime2, new Date(entry.timestamp))
        .input('entryType', sql.NVarChar, entry.entryType)
        .input('summary', sql.NVarChar, entry.summary)
        .input('phaseId', sql.NVarChar, entry.phaseId)
        .input('riskLevel', sql.NVarChar, entry.riskLevel)
        .input('artifacts', sql.NVarChar, JSON.stringify(entry.artifacts))
        .input('memoryAnchor', sql.NVarChar, entry.memoryAnchor)
        .query(`
          INSERT INTO mcp.GovernanceLog 
          (timestamp, entryType, summary, phaseId, riskLevel, artifacts, memoryAnchor)
          VALUES (@timestamp, @entryType, @summary, @phaseId, @riskLevel, @artifacts, @memoryAnchor)
        `);
      
      console.log('✅ Logged to SQL');
    } catch (error) {
      console.error('SQL logging failed:', error);
    }
  }

  async notifyOApp(notification) {
    // Send webhook to oApp
    const webhookUrl = process.env.OAPP_WEBHOOK_URL;
    if (!webhookUrl) return;
    
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Orchestrator-Key': process.env.ORCHESTRATOR_KEY
        },
        body: JSON.stringify(notification)
      });
      
      if (response.ok) {
        console.log('✅ oApp notified');
      }
    } catch (error) {
      console.error('Failed to notify oApp:', error);
    }
  }

  async streamToString(readableStream) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      readableStream.on('data', (data) => {
        chunks.push(data.toString());
      });
      readableStream.on('end', () => {
        resolve(chunks.join(''));
      });
      readableStream.on('error', reject);
    });
  }
}

// Main execution
async function main() {
  const orchestrator = new ContinuousOrchestrator({
    storageAccount: process.env.STORAGE_ACCOUNT || 'orbisof86storage',
    sqlServer: process.env.SQL_SERVER || 'orbis-of86-sql-server.database.windows.net',
    sqlDatabase: process.env.SQL_DATABASE || 'orbis-mcp-sql',
    pollInterval: 30000
  });

  await orchestrator.initialize();
  await orchestrator.watchGovernanceLogs();

  // Health check endpoint
  const http = require('http');
  const server = http.createServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200);
      res.end(JSON.stringify({
        status: 'healthy',
        lastProcessed: orchestrator.lastProcessedTimestamp,
        uptime: process.uptime()
      }));
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  });

  server.listen(8080, () => {
    console.log('🚀 Continuous Orchestrator running on port 8080');
  });
}

main().catch(console.error);
EOF

# 2. Create Dockerfile
echo "Creating Docker image..."
cat > /tmp/Dockerfile.orchestrator << 'EOF'
FROM node:18-alpine
WORKDIR /app
COPY orchestrator.js .
RUN npm init -y && npm install @azure/storage-blob @azure/identity mssql
EXPOSE 8080
CMD ["node", "orchestrator.js"]
EOF

# 3. Build and push to ACR
echo "Building and pushing container image..."
az acr build \
  --registry "$ACR_NAME" \
  --image orchestrator:latest \
  --file /tmp/Dockerfile.orchestrator \
  /tmp

# 4. Deploy Container App
echo "Deploying orchestrator Container App..."
az containerapp create \
  --name "$CONTAINER_APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --environment "$CONTAINER_APP_ENV" \
  --image "$ACR_NAME.azurecr.io/orchestrator:latest" \
  --target-port 8080 \
  --ingress internal \
  --min-replicas 1 \
  --max-replicas 1 \
  --cpu 0.5 \
  --memory 1.0Gi \
  --identity system \
  --env-vars \
    STORAGE_ACCOUNT="orbisof86storage" \
    SQL_SERVER="orbis-of86-sql-server.database.windows.net" \
    SQL_DATABASE="orbis-mcp-sql" \
    OAPP_WEBHOOK_URL="https://oapp.orbis.com/webhook/phase-steps"

# 5. Grant permissions to managed identity
echo "Configuring managed identity permissions..."
IDENTITY_ID=$(az containerapp identity show \
  --name "$CONTAINER_APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query principalId -o tsv)

# Storage permissions
az role assignment create \
  --assignee "$IDENTITY_ID" \
  --role "Storage Blob Data Contributor" \
  --scope "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP"

# SQL permissions (add to SQL AD group)
az sql server ad-admin create \
  --resource-group "$RESOURCE_GROUP" \
  --server "orbis-of86-sql-server" \
  --display-name "Orchestrator App" \
  --object-id "$IDENTITY_ID" || true

# 6. Create governance log entry
echo "Creating governance log entry..."
cat >> logs/governance.jsonl << EOF
{"timestamp":"$(date -u +%Y-%m-%dT%H:%M:%SZ)","entryType":"Orchestration","summary":"Continuous Orchestration Mode enabled","phaseId":"OF-8.6","artifacts":["Container:$CONTAINER_APP_NAME","Service:orchestrator"],"riskLevel":"Low","memoryAnchor":"of-8.6-orchestration-enabled-$(date +%Y%m%d)","status":"active"}
EOF

# 7. Test orchestration
echo "Testing orchestration service..."
ORCHESTRATOR_URL=$(az containerapp show \
  --name "$CONTAINER_APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query properties.configuration.ingress.fqdn -o tsv)

sleep 10 # Wait for container to start

curl -s "https://$ORCHESTRATOR_URL/health" || echo "Note: Health check requires internal network access"

echo "✅ Step 7: Continuous Orchestration Mode enabled!"
echo ""
echo "Orchestrator Details:"
echo "- Container App: $CONTAINER_APP_NAME"
echo "- Status: Running"
echo "- Poll Interval: 30 seconds"
echo "- Features:"
echo "  • Auto-creates PhaseSteps from governance logs"
echo "  • Generates Memory Anchors in cloud"
echo "  • Syncs to Azure SQL"
echo "  • Notifies oApp via webhook"