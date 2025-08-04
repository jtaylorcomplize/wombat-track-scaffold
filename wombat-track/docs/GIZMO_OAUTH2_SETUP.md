# Gizmo OAuth2 Setup Guide

This guide provides step-by-step instructions for configuring OAuth2 authentication for Gizmo AI agent integration in the Wombat Track system.

## Overview

The Gizmo integration uses OAuth2 with client credentials flow for secure agent-to-agent communication. This allows the Wombat Track AI agents to authenticate with Gizmo services and submit memory anchors, audit reports, and side quest detections.

## Prerequisites

1. Access to Gizmo administration panel
2. Wombat Track system running with agent implementations
3. Valid Gizmo API endpoints and credentials

## Step 1: Configure Gizmo OAuth2 Client

### 1.1 Create OAuth2 Client in Gizmo

1. Log into your Gizmo administration panel
2. Navigate to **API Management** → **OAuth2 Clients**
3. Click **Create New Client**
4. Fill in the following details:

```
Client Name: WombatTrack-AI-Agents
Client Type: Confidential
Grant Types: client_credentials
Scopes: memory:read,memory:write,agent:execute,governance:read,governance:write,project:read
Description: OAuth2 client for Wombat Track AI agent integration
```

5. Click **Create Client**
6. **Important**: Copy the generated `Client ID` and `Client Secret` - you'll need these for step 2

### 1.2 Configure Client Scopes

Ensure your OAuth2 client has the following scopes enabled:

- `memory:read` - Read access to Gizmo memory system
- `memory:write` - Write access for memory anchors
- `agent:execute` - Permission to execute agent operations
- `governance:read` - Read governance and audit data
- `governance:write` - Write governance logs and audit reports
- `project:read` - Read project information

## Step 2: Configure Environment Variables

### 2.1 Create Gizmo Configuration File

Create or update your `.env` file with the following Gizmo OAuth2 configuration:

```bash
# Gizmo OAuth2 Configuration
GIZMO_CLIENT_ID=your_client_id_here
GIZMO_CLIENT_SECRET=your_client_secret_here
GIZMO_TOKEN_ENDPOINT=https://your-gizmo-instance.com/oauth2/token
GIZMO_AUTH_ENDPOINT=https://your-gizmo-instance.com/oauth2/authorize
GIZMO_REVOKE_ENDPOINT=https://your-gizmo-instance.com/oauth2/revoke
GIZMO_MEMORY_ENDPOINT=https://your-gizmo-instance.com/api/memory
GIZMO_AGENT_SCOPES=memory:read,memory:write,agent:execute,governance:read,governance:write,project:read

# Optional: Advanced Configuration
GIZMO_AUTO_REFRESH=true
GIZMO_REFRESH_THRESHOLD=300
GIZMO_REQUEST_TIMEOUT=10000
GIZMO_RETRY_ATTEMPTS=3
```

### 2.2 Update Your Environment

Replace the placeholder values:

1. `your_client_id_here` - Replace with the Client ID from step 1.1
2. `your_client_secret_here` - Replace with the Client Secret from step 1.1
3. `https://your-gizmo-instance.com` - Replace with your actual Gizmo instance URL

## Step 3: Configure oApp Secrets Manager

### 3.1 Access oApp Secrets Manager

1. Navigate to your oApp administration interface
2. Go to **Settings** → **Secrets Manager**
3. Click **Add New Secret Group**

### 3.2 Create Gizmo Secrets Group

Create a new secret group named `gizmo-oauth2` with the following secrets:

```
Secret Group: gizmo-oauth2
├── client_id: [Your Gizmo Client ID]
├── client_secret: [Your Gizmo Client Secret]
├── token_endpoint: https://your-gizmo-instance.com/oauth2/token
├── auth_endpoint: https://your-gizmo-instance.com/oauth2/authorize
├── revoke_endpoint: https://your-gizmo-instance.com/oauth2/revoke
├── memory_endpoint: https://your-gizmo-instance.com/api/memory
└── scopes: memory:read,memory:write,agent:execute,governance:read,governance:write,project:read
```

### 3.3 Configure Access Permissions

Set the following access permissions for the `gizmo-oauth2` secret group:

- **Services**: `wombat-track-agents`, `memory-anchor-agent`, `auto-audit-agent`, `side-quest-detector`
- **Environments**: `development`, `staging`, `production`
- **Access Level**: `read-only`

## Step 4: Initialize Agent Authentication

### 4.1 Update Agent Configuration

Create or update `src/config/gizmo-config.ts`:

```typescript
import { createGizmoAuthService, GizmoAgentRoles } from '../services/gizmo-auth';
import type { GizmoAgentCredentials } from '../services/gizmo-auth';

// Load credentials from environment or oApp secrets
const credentials: GizmoAgentCredentials = {
  clientId: process.env.GIZMO_CLIENT_ID || '',
  clientSecret: process.env.GIZMO_CLIENT_SECRET || '',
  scopes: GizmoAgentRoles.MEMORY_AGENT, // or customize based on agent
  tokenEndpoint: process.env.GIZMO_TOKEN_ENDPOINT || '',
  authEndpoint: process.env.GIZMO_AUTH_ENDPOINT || '',
  revokeEndpoint: process.env.GIZMO_REVOKE_ENDPOINT
};

// Create and export Gizmo auth service
export const gizmoAuthService = createGizmoAuthService(credentials, {
  autoRefresh: process.env.GIZMO_AUTO_REFRESH === 'true',
  refreshThreshold: parseInt(process.env.GIZMO_REFRESH_THRESHOLD || '300'),
  timeout: parseInt(process.env.GIZMO_REQUEST_TIMEOUT || '10000'),
  retryAttempts: parseInt(process.env.GIZMO_RETRY_ATTEMPTS || '3')
});
```

### 4.2 Initialize Authentication in Main Application

Update your main application initialization (e.g., `src/main.ts` or `src/App.tsx`):

```typescript
import { gizmoAuthService } from './config/gizmo-config';
import { agentMonitoringService } from './services/AgentMonitoringService';

// Initialize Gizmo authentication
async function initializeGizmoAuth() {
  try {
    await gizmoAuthService.initialize();
    console.log('✅ Gizmo OAuth2 authentication initialized successfully');
    
    // Set up monitoring
    agentMonitoringService.setGizmoAuth(gizmoAuthService);
    
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize Gizmo OAuth2:', error);
    return false;
  }
}

// Call during app startup
initializeGizmoAuth();
```

## Step 5: Test Authentication

### 5.1 Test OAuth2 Flow

Create a test script to verify the OAuth2 setup:

```typescript
// scripts/test-gizmo-auth.ts
import { gizmoAuthService } from '../src/config/gizmo-config';

async function testGizmoAuth() {
  try {
    console.log('🔄 Testing Gizmo OAuth2 authentication...');
    
    // Initialize auth service
    await gizmoAuthService.initialize();
    
    // Check authentication status
    const isAuthenticated = gizmoAuthService.isAuthenticated();
    console.log('✅ Authentication status:', isAuthenticated);
    
    // Get token info
    const tokenInfo = gizmoAuthService.getTokenInfo();
    console.log('📋 Token info:', tokenInfo);
    
    // Test user info endpoint (if available)
    if (isAuthenticated) {
      try {
        const userInfo = await gizmoAuthService.getUserInfo();
        console.log('👤 User info:', userInfo);
      } catch (error) {
        console.log('ℹ️  User info endpoint not available or not accessible');
      }
    }
    
    console.log('✅ Gizmo OAuth2 test completed successfully');
    
  } catch (error) {
    console.error('❌ Gizmo OAuth2 test failed:', error);
    process.exit(1);
  }
}

testGizmoAuth();
```

Run the test:

```bash
npx tsx scripts/test-gizmo-auth.ts
```

### 5.2 Verify Agent Integration

Test each agent's Gizmo integration:

```bash
# Test Memory Anchor Agent
curl -X POST http://localhost:3000/api/agents/memory-anchor/test-submission

# Test Auto-Audit Agent  
curl -X POST http://localhost:3000/api/agents/auto-audit/test-report

# Test Side Quest Detector
curl -X POST http://localhost:3000/api/agents/side-quest/test-detection
```

## Step 6: Monitor Authentication Status

### 6.1 Check Agent Monitoring Dashboard

1. Navigate to **Admin** → **Agent Monitoring**
2. Verify all agents show "Active" status
3. Check for any authentication-related alerts
4. Review the Gizmo authentication status in the system health panel

### 6.2 Review Logs

Check the application logs for OAuth2 events:

```bash
# Check for successful authentication
grep "Gizmo OAuth2" logs/application.log

# Check for token refresh events
grep "token-refreshed" logs/application.log

# Check for authentication errors
grep "auth-error" logs/application.log
```

## Troubleshooting

### Common Issues

1. **Invalid Client Credentials**
   - Verify `GIZMO_CLIENT_ID` and `GIZMO_CLIENT_SECRET` are correct
   - Check that the OAuth2 client is enabled in Gizmo

2. **Scope Permissions Error**
   - Ensure all required scopes are enabled for your OAuth2 client
   - Verify the client has appropriate permissions in Gizmo

3. **Network/Endpoint Issues**
   - Confirm Gizmo endpoints are accessible from your network
   - Check firewall and proxy configurations

4. **Token Refresh Failures**
   - Verify the `GIZMO_REVOKE_ENDPOINT` is correct
   - Check token expiration settings in Gizmo

### Debug Mode

Enable debug logging by setting:

```bash
GIZMO_DEBUG=true
LOG_LEVEL=debug
```

### Support

For additional support:

1. Check the Gizmo documentation for OAuth2 configuration
2. Review the Wombat Track agent monitoring dashboard for specific error details
3. Contact your Gizmo administrator for client configuration issues

## Security Considerations

1. **Secret Management**: Store OAuth2 credentials securely using oApp Secrets Manager
2. **Network Security**: Use HTTPS for all Gizmo endpoints
3. **Token Rotation**: Enable automatic token refresh and monitor expiration
4. **Audit Logging**: All OAuth2 events are logged for security auditing
5. **Least Privilege**: Only assign necessary scopes to the OAuth2 client

## Next Steps

After successful OAuth2 setup:

1. Configure agent-specific settings in the Admin panel
2. Set up monitoring alerts for authentication failures  
3. Review and adjust token refresh intervals based on usage patterns
4. Implement custom Gizmo integration endpoints as needed
5. Set up automated testing for OAuth2 flow validation

---

**Note**: This setup guide assumes Gizmo version 2.0+ with OAuth2 support. For older versions or custom Gizmo deployments, consult your Gizmo documentation for specific configuration requirements.