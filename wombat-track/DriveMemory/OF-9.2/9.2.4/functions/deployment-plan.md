# GovernanceLog Forwarder Function App - Deployment Plan

## Overview
The GovernanceLog Forwarder is an Azure Function that receives telemetry data from App Insights and forwards it to the Wombat Track governance logging API at `/api/admin/governance_logs`.

## Architecture
- **Trigger**: HTTP POST endpoint
- **Input**: App Insights telemetry webhook data
- **Processing**: Transform telemetry to governance log format
- **Output**: Forward to main governance API

## Function Configuration
- **Runtime**: Node.js 18+
- **Authorization Level**: Function key required
- **Timeout**: 5 minutes
- **Memory**: 128MB

## Environment Variables
```bash
GOVERNANCE_API_URL=https://wombat-track-api-prod.azurewebsites.net
FUNCTIONS_WORKER_RUNTIME=node
```

## Deployment Commands
```bash
# Create storage account (if not exists)
az storage account create \
  --name wtgovernancestorage \
  --resource-group of-8-6-cloud-rg \
  --location australiaeast \
  --sku Standard_LRS

# Create Function App
az functionapp create \
  --resource-group of-8-6-cloud-rg \
  --consumption-plan-location australiaeast \
  --runtime node \
  --functions-version 4 \
  --name wt-governancelog-forwarder \
  --storage-account wtgovernancestorage

# Configure environment variables
az functionapp config appsettings set \
  --name wt-governancelog-forwarder \
  --resource-group of-8-6-cloud-rg \
  --settings GOVERNANCE_API_URL=https://wombat-track-api-prod.azurewebsites.net

# Deploy function code (after creating ZIP package)
az functionapp deployment source config-zip \
  --name wt-governancelog-forwarder \
  --resource-group of-8-6-cloud-rg \
  --src governance-forwarder.zip
```

## Webhook Configuration
Configure App Insights to send telemetry to:
- **URL**: `https://wt-governancelog-forwarder.azurewebsites.net/api/governance-forwarder`
- **Method**: POST
- **Headers**: Function key authentication

## Testing
- **Test Endpoint**: `/api/testForward`
- **Health Check**: Function responds with 200 OK
- **Integration**: Verify governance logs appear in admin dashboard

## Data Flow
1. App Insights generates telemetry event
2. Webhook triggers Function App
3. Function transforms telemetry to governance format
4. Function forwards to `/api/admin/governance_logs`
5. Governance entry appears in Orbis Dashboard

## Monitoring
- Function App execution logs in Azure portal
- App Insights integration for function performance
- Governance log verification in admin dashboard