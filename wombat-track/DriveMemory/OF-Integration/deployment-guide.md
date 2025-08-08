# OF Integration Service - Deployment Guide

## Overview

The OF Integration Service provides a secure API gateway enabling AzureOpenAI direct access to the Orbis Forge (oApp) implementation. This service implements multi-agent visibility, cross-checking capabilities, and audit-based context to prevent hallucinations in AI workflows.

## Architecture

```
AzureOpenAI Service 
        ↓ [Bearer Token Auth]
OF Integration Service (Azure App Service)
        ↓ [Internal APIs]
oApp Components (RAG, Agents, Orchestration)
        ↓ [Audit Trail]
Governance Logs & DriveMemory
```

## Deployment Status

**Status**: ✅ **READY FOR PRODUCTION DEPLOYMENT**  
**Last Updated**: 2025-08-06  
**Version**: 1.0.0  

### Core Components Status

| Component | Status | Notes |
|-----------|---------|--------|
| Authentication Service | ✅ Ready | Azure Managed Identity + Key Vault |
| API Gateway (6 endpoints) | ✅ Ready | Full CRUD operations implemented |
| RAG Integration | ✅ Ready | Semantic search across governance logs |
| Vision Layer Agents | ✅ Ready | 5 specialized AI agents deployed |
| Orchestration Workflows | ✅ Ready | 3 workflow types available |
| Security Hardening | ✅ Ready | CORS, HTTPS, rate limiting, audit logging |
| Documentation | ✅ Ready | OpenAPI 3.0.3 specification complete |

## Deployment Instructions

### Prerequisites

1. **Azure Resources Required**:
   - Azure App Service (Standard S1 or higher)
   - Azure Key Vault with access policies
   - Azure OpenAI Service instance
   - Application Insights (optional but recommended)

2. **Access Requirements**:
   - Azure CLI installed and authenticated
   - Subscription Contributor access
   - Key Vault Secrets User role

### Step-by-Step Deployment

#### 1. Environment Setup

```bash
# Set Azure environment variables
export AZURE_SUBSCRIPTION_ID="your-subscription-id"
export AZURE_RESOURCE_GROUP="wombat-track-au-rg"
export AZURE_KEYVAULT_URL="https://wt-keyvault-au.vault.azure.net/"

# Login to Azure
az login
az account set --subscription $AZURE_SUBSCRIPTION_ID
```

#### 2. Execute Deployment Script

```bash
# Make deployment script executable
chmod +x scripts/deploy-azure-app-service.sh

# Run deployment
./scripts/deploy-azure-app-service.sh
```

The deployment script will automatically:
- Create App Service Plan and Web App
- Enable System-Assigned Managed Identity
- Configure Key Vault access policies
- Set all required app settings
- Deploy application package
- Configure HTTPS, CORS, and health checks

#### 3. Post-Deployment Verification

```bash
# Verify service health
curl https://of-integration-service.azurewebsites.net/health

# Check API documentation
curl https://of-integration-service.azurewebsites.net/api-docs

# Monitor deployment logs
az webapp log tail --name of-integration-service --resource-group wombat-track-au-rg
```

## API Endpoints

### Core Integration Endpoints

| Method | Endpoint | Purpose | Auth Required |
|--------|----------|---------|---------------|
| GET | `/health` | Service health status | No |
| GET | `/api-docs` | API documentation | No |
| GET | `/api/governance/query` | Query governance logs | Yes |
| POST | `/api/governance/append` | Add governance entries | Yes |
| POST | `/api/memory/query` | Execute RAG queries | Yes |
| POST | `/api/agent/execute` | Run Vision Layer Agents | Yes |
| POST | `/api/orchestration/simulate` | Trigger workflows | Yes |
| POST | `/api/telemetry/log` | Log telemetry data | Yes |

### Authentication

All API endpoints (except `/health` and `/api-docs`) require Azure AD Bearer token authentication:

```bash
# Example API call with authentication
curl -X POST https://of-integration-service.azurewebsites.net/api/memory/query \
  -H "Authorization: Bearer <azure-ad-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What is the current status of Phase 8.8?",
    "scope": "combined",
    "priority": "medium"
  }'
```

## Security Configuration

### Managed Identity

The service uses System-Assigned Managed Identity for:
- Key Vault secret access
- Inter-service authentication
- Audit trail generation

### Network Security

- **HTTPS Only**: All traffic encrypted in transit
- **CORS Policy**: Restricted to Azure OpenAI endpoints
- **Rate Limiting**: 60 requests/minute per client
- **IP Restrictions**: Azure service endpoints only

### Audit & Compliance

- **Complete Audit Trail**: All API calls logged to `logs/governance.jsonl`
- **Telemetry Storage**: Daily logs in `DriveMemory/OF-Integration/telemetry/`
- **Access Logs**: Admin endpoints for governance reporting
- **Error Tracking**: Application Insights integration

## Integration with AzureOpenAI

### Step 1: Configure AzureOpenAI Client

Update your AzureOpenAI client configuration to use Bearer token authentication:

```python
# Python example
import openai
from azure.identity import DefaultAzureCredential

credential = DefaultAzureCredential()
token = credential.get_token("https://cognitiveservices.azure.com/.default")

openai.api_key = token.token
openai.api_base = "https://of-integration-service.azurewebsites.net"
openai.api_type = "azure"
```

### Step 2: Test Integration

```bash
# Test governance query
curl -X GET "https://of-integration-service.azurewebsites.net/api/governance/query?projectId=OF-SDLC-IMP2&limit=10" \
  -H "Authorization: Bearer $AZURE_TOKEN"

# Test RAG query
curl -X POST "https://of-integration-service.azurewebsites.net/api/memory/query" \
  -H "Authorization: Bearer $AZURE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Summarize the latest project milestones",
    "scope": "combined",
    "priority": "high"
  }'
```

## Monitoring & Maintenance

### Health Monitoring

```bash
# Check service health
curl https://of-integration-service.azurewebsites.net/health

# Get detailed system status (requires admin permissions)
curl -X GET https://of-integration-service.azurewebsites.net/api/admin/system-status \
  -H "Authorization: Bearer $ADMIN_AZURE_TOKEN"
```

### Log Analysis

```bash
# View recent governance entries
tail -n 20 logs/governance.jsonl

# Check telemetry logs
ls -la DriveMemory/OF-Integration/telemetry/

# Monitor application logs
az webapp log tail --name of-integration-service --resource-group wombat-track-au-rg
```

### Performance Metrics

The service includes built-in metrics tracking:
- Request count and response times
- Memory usage and uptime
- Component health status
- Error rates and failure modes

## Troubleshooting

### Common Issues

1. **Authentication Failures**
   - Verify Managed Identity is enabled
   - Check Key Vault access policies
   - Ensure Bearer token is valid

2. **CORS Errors**
   - Verify allowed origins in app settings
   - Check request headers match CORS policy

3. **Rate Limiting**
   - Default: 60 requests/minute per client
   - Adjust `RATE_LIMIT_RPM` app setting if needed

4. **Service Unavailable**
   - Check health endpoint: `/health`
   - Review application logs in Azure Portal
   - Verify all dependencies are running

### Support Contacts

- **Technical Issues**: Review application logs and health endpoints
- **Security Concerns**: Check audit logs in governance.jsonl
- **Integration Support**: Reference OpenAPI documentation at `/api-docs`

## Next Steps

1. **Production Deployment**: Execute deployment script in production environment
2. **AzureOpenAI Configuration**: Update client applications to use Bearer tokens
3. **Monitoring Setup**: Configure Application Insights dashboards
4. **Security Review**: Conduct security assessment of deployed service
5. **Performance Testing**: Load test all API endpoints
6. **Documentation**: Train team on API usage and monitoring procedures

---

**Deployment Package Complete**: All deliverables ready for production deployment with full audit trail and governance compliance.