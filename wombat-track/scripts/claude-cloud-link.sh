#!/bin/bash

# Claude Enterprise Cloud Link Script
# Step 9 - Configure Claude relay endpoint and GitHub Actions integration

set -e

# Configuration
RESOURCE_GROUP="of-8-6-cloud-rg"
LOCATION="australiaeast"
RELAY_APP_NAME="claude-relay-service"
CONTAINER_APP_ENV="orbis-of-86-env"
KEY_VAULT_NAME="OrbisKeyVaultOF86"

echo "🔗 Step 9: Linking Claude Enterprise to Cloud"
echo "============================================="

# 1. Create Claude relay service
echo "Creating Claude relay service..."
cat > /tmp/claude-relay.js << 'EOF'
const express = require('express');
const { DefaultAzureCredential } = require('@azure/identity');
const { SecretClient } = require('@azure/keyvault-secrets');
const sql = require('mssql');

class ClaudeRelayService {
  constructor() {
    this.app = express();
    this.app.use(express.json());
    this.setupRoutes();
  }

  async initialize() {
    // Get secrets from Key Vault
    const credential = new DefaultAzureCredential();
    const vaultUrl = `https://${process.env.KEY_VAULT_NAME}.vault.azure.net`;
    this.secretClient = new SecretClient(vaultUrl, credential);
    
    // Get GitHub token for dispatching
    const githubTokenSecret = await this.secretClient.getSecret('github-token');
    this.githubToken = githubTokenSecret.value;
    
    // Initialize SQL connection
    this.sqlConfig = {
      server: process.env.SQL_SERVER,
      database: process.env.SQL_DATABASE,
      authentication: {
        type: 'azure-active-directory-default'
      },
      options: {
        encrypt: true
      }
    };
  }

  setupRoutes() {
    // Claude task dispatch endpoint
    this.app.post('/claude/dispatch', async (req, res) => {
      try {
        const { task, context, priority } = req.body;
        
        // Create task ID
        const taskId = `claude-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Log to SQL
        await this.logClaudeTask(taskId, task, context);
        
        // Dispatch to GitHub Actions
        const result = await this.dispatchToGitHub(taskId, task, context, priority);
        
        // Create memory anchor
        await this.createMemoryAnchor(taskId, task, result);
        
        res.json({
          success: true,
          taskId,
          status: 'dispatched',
          githubRun: result.runId
        });
      } catch (error) {
        console.error('Dispatch error:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Claude completion webhook
    this.app.post('/claude/complete', async (req, res) => {
      try {
        const { taskId, result, prUrl } = req.body;
        
        // Update task status
        await this.updateTaskStatus(taskId, 'completed', result);
        
        // Create phase step
        await this.createPhaseStepFromResult(taskId, result);
        
        // Log to governance
        await this.logGovernanceEntry({
          entryType: 'ClaudeTask',
          summary: `Claude task ${taskId} completed`,
          artifacts: [prUrl],
          memoryAnchor: `claude-complete-${taskId}`
        });
        
        res.json({ success: true });
      } catch (error) {
        console.error('Completion error:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        service: 'claude-relay',
        timestamp: new Date().toISOString()
      });
    });
  }

  async dispatchToGitHub(taskId, task, context, priority) {
    const octokit = require('@octokit/rest');
    const github = new octokit.Octokit({
      auth: this.githubToken
    });

    const response = await github.actions.createWorkflowDispatch({
      owner: 'orbis-platform',
      repo: 'wombat-track',
      workflow_id: 'claude-dispatch.yml',
      ref: 'main',
      inputs: {
        task,
        context: JSON.stringify(context),
        requestId: taskId,
        priority: priority || 'normal'
      }
    });

    // Get run ID
    const runs = await github.actions.listWorkflowRuns({
      owner: 'orbis-platform',
      repo: 'wombat-track',
      workflow_id: 'claude-dispatch.yml',
      per_page: 1
    });

    return {
      runId: runs.data.workflow_runs[0]?.id,
      url: runs.data.workflow_runs[0]?.html_url
    };
  }

  async logClaudeTask(taskId, task, context) {
    const pool = await sql.connect(this.sqlConfig);
    await pool.request()
      .input('eventType', sql.NVarChar, 'ClaudeTaskDispatched')
      .input('source', sql.NVarChar, 'claude-relay')
      .input('payload', sql.NVarChar, JSON.stringify({ taskId, task, context }))
      .query(`
        INSERT INTO mcp.Events (eventType, source, payload)
        VALUES (@eventType, @source, @payload)
      `);
  }

  async updateTaskStatus(taskId, status, result) {
    const pool = await sql.connect(this.sqlConfig);
    await pool.request()
      .input('eventType', sql.NVarChar, 'ClaudeTaskCompleted')
      .input('source', sql.NVarChar, 'claude-relay')
      .input('payload', sql.NVarChar, JSON.stringify({ taskId, status, result }))
      .query(`
        INSERT INTO mcp.Events (eventType, source, payload)
        VALUES (@eventType, @source, @payload)
      `);
  }

  async createMemoryAnchor(taskId, task, githubResult) {
    const anchor = {
      anchorId: `claude-task-${taskId}`,
      timestamp: new Date().toISOString(),
      type: 'ClaudeTask',
      task,
      githubRun: githubResult.runId,
      status: 'dispatched'
    };

    // Store in blob storage
    const { BlobServiceClient } = require('@azure/storage-blob');
    const blobClient = BlobServiceClient.fromConnectionString(
      process.env.STORAGE_CONNECTION_STRING
    );
    
    const containerClient = blobClient.getContainerClient('drive-memory');
    const blobName = `claude-tasks/${taskId}.json`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    
    await blockBlobClient.upload(
      JSON.stringify(anchor, null, 2),
      JSON.stringify(anchor).length
    );
  }

  async createPhaseStepFromResult(taskId, result) {
    if (!result.phaseId) return;
    
    const pool = await sql.connect(this.sqlConfig);
    await pool.request()
      .input('phaseId', sql.NVarChar, result.phaseId)
      .input('stepName', sql.NVarChar, `Claude: ${result.summary}`)
      .input('memoryAnchor', sql.NVarChar, `claude-complete-${taskId}`)
      .input('metadata', sql.NVarChar, JSON.stringify(result))
      .execute('mcp.CreatePhaseStep');
  }

  async logGovernanceEntry(entry) {
    const pool = await sql.connect(this.sqlConfig);
    await pool.request()
      .input('entryType', sql.NVarChar, entry.entryType)
      .input('summary', sql.NVarChar, entry.summary)
      .input('phaseId', sql.NVarChar, 'OF-8.6')
      .input('riskLevel', sql.NVarChar, 'Low')
      .input('artifacts', sql.NVarChar, JSON.stringify(entry.artifacts))
      .input('memoryAnchor', sql.NVarChar, entry.memoryAnchor)
      .query(`
        INSERT INTO mcp.GovernanceLog 
        (entryType, summary, phaseId, riskLevel, artifacts, memoryAnchor)
        VALUES (@entryType, @summary, @phaseId, @riskLevel, @artifacts, @memoryAnchor)
      `);
  }

  start() {
    const port = process.env.PORT || 8080;
    this.app.listen(port, () => {
      console.log(`🚀 Claude Relay Service running on port ${port}`);
    });
  }
}

// Main
async function main() {
  const service = new ClaudeRelayService();
  await service.initialize();
  service.start();
}

main().catch(console.error);
EOF

# 2. Create package.json
cat > /tmp/package.json << 'EOF'
{
  "name": "claude-relay-service",
  "version": "1.0.0",
  "main": "claude-relay.js",
  "dependencies": {
    "express": "^4.18.0",
    "@azure/identity": "^3.0.0",
    "@azure/keyvault-secrets": "^4.7.0",
    "@azure/storage-blob": "^12.0.0",
    "mssql": "^10.0.0",
    "@octokit/rest": "^20.0.0"
  }
}
EOF

# 3. Create Dockerfile
cat > /tmp/Dockerfile.claude << 'EOF'
FROM node:18-alpine
WORKDIR /app
COPY package.json claude-relay.js ./
RUN npm install
EXPOSE 8080
CMD ["node", "claude-relay.js"]
EOF

# 4. Build and deploy
echo "Building Claude relay container..."
ACR_NAME="orbisof86acr"

az acr build \
  --registry "$ACR_NAME" \
  --image claude-relay:latest \
  --file /tmp/Dockerfile.claude \
  /tmp

# 5. Deploy Container App
echo "Deploying Claude relay Container App..."
az containerapp create \
  --name "$RELAY_APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --environment "$CONTAINER_APP_ENV" \
  --image "$ACR_NAME.azurecr.io/claude-relay:latest" \
  --target-port 8080 \
  --ingress external \
  --min-replicas 1 \
  --max-replicas 3 \
  --cpu 0.5 \
  --memory 1.0Gi \
  --identity system \
  --env-vars \
    KEY_VAULT_NAME="$KEY_VAULT_NAME" \
    SQL_SERVER="orbis-of86-sql-server.database.windows.net" \
    SQL_DATABASE="orbis-mcp-sql"

# 6. Update GitHub Actions
echo "Updating GitHub Actions workflow..."
cat > .github/workflows/claude-cloud-integration.yml << 'EOF'
name: Claude Cloud Integration

on:
  repository_dispatch:
    types: [claude-task]
  workflow_dispatch:
    inputs:
      task:
        description: 'Claude task to execute'
        required: true
      context:
        description: 'Task context'
        required: false

jobs:
  claude-orchestration:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout
        uses: actions/checkout@v3
      
      - name: Notify Azure Orchestrator
        run: |
          RELAY_URL="${{ secrets.CLAUDE_RELAY_URL }}"
          curl -X POST "$RELAY_URL/claude/dispatch" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer ${{ secrets.ORCHESTRATOR_TOKEN }}" \
            -d '{
              "task": "${{ github.event.inputs.task || github.event.client_payload.task }}",
              "context": ${{ toJson(github.event.inputs.context || github.event.client_payload.context) }},
              "priority": "high"
            }'
      
      - name: Execute Claude task
        id: claude
        run: |
          # Claude task execution logic here
          echo "Executing Claude task..."
          
      - name: Log Memory Anchor
        if: success()
        run: |
          TASK_ID="${{ steps.claude.outputs.taskId }}"
          cat >> DriveMemory/claude-tasks.jsonl << EOF
          {"timestamp":"$(date -u +%Y-%m-%dT%H:%M:%SZ)","taskId":"$TASK_ID","task":"${{ github.event.inputs.task }}","status":"completed","phaseId":"OF-8.6"}
          EOF
          
      - name: Notify completion
        if: always()
        run: |
          curl -X POST "${{ secrets.CLAUDE_RELAY_URL }}/claude/complete" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer ${{ secrets.ORCHESTRATOR_TOKEN }}" \
            -d '{
              "taskId": "${{ steps.claude.outputs.taskId }}",
              "result": {
                "status": "${{ job.status }}",
                "phaseId": "OF-8.6",
                "summary": "Task completed"
              },
              "prUrl": "${{ github.event.pull_request.html_url }}"
            }'
EOF

# 7. Create governance log entry
echo "Creating governance log entry..."
cat >> logs/governance.jsonl << EOF
{"timestamp":"$(date -u +%Y-%m-%dT%H:%M:%SZ)","entryType":"Integration","summary":"Claude Enterprise linked to Azure cloud orchestration","phaseId":"OF-8.6","artifacts":["Service:$RELAY_APP_NAME","Workflow:claude-cloud-integration.yml"],"riskLevel":"Low","memoryAnchor":"of-8.6-claude-cloud-linked-$(date +%Y%m%d)","integration":{"type":"claude-azure","status":"active","endpoints":["dispatch","complete"]}}
EOF

echo "✅ Step 9: Claude Enterprise linked to cloud!"
echo ""
echo "Claude Integration Details:"
echo "- Relay Service: $RELAY_APP_NAME"
echo "- Endpoints:"
echo "  • POST /claude/dispatch - Dispatch tasks"
echo "  • POST /claude/complete - Task completion"
echo "- GitHub Actions: claude-cloud-integration.yml"
echo "- Auto-logs Memory Anchors"
echo "- Creates PhaseSteps on completion"