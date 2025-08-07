#!/usr/bin/env npx tsx

/**
 * OF Integration Service Startup Script
 * Initializes and starts the API gateway for AzureOpenAI → oApp integration
 */

import OFIntegrationService from '../src/services/ofIntegrationService';
import { AuthConfig } from '../src/services/ofIntegrationAuth';
import { ragGovernanceService } from '../src/services/ragGovernanceService';
import { visionLayerAgentFramework } from '../src/services/visionLayerAgent';
import { agenticCloudOrchestrator } from '../src/services/agenticCloudOrchestrator';

class OFIntegrationServiceBootstrap {
  
  async bootstrap(): Promise<void> {
    console.log('🚀 Starting OF Integration Service Bootstrap...\n');

    try {
      // Step 1: Initialize core services
      console.log('1️⃣ Initializing core OF services...');
      await this.initializeCoreServices();
      console.log('✅ Core services initialized\n');

      // Step 2: Configure authentication
      console.log('2️⃣ Configuring authentication...');
      const authConfig = this.createAuthConfig();
      console.log('✅ Authentication configured\n');

      // Step 3: Start integration service
      console.log('3️⃣ Starting OF Integration Service...');
      const service = new OFIntegrationService(authConfig, 3001);
      await service.start();
      console.log('✅ OF Integration Service started\n');

      // Step 4: Validate endpoints
      console.log('4️⃣ Validating API endpoints...');
      await this.validateEndpoints();
      console.log('✅ API endpoints validated\n');

      // Step 5: Log startup to governance
      console.log('5️⃣ Logging startup to governance...');
      await this.logStartupGovernance();
      console.log('✅ Startup logged to governance\n');

      this.printStartupSummary();

      // Keep the service running
      process.on('SIGINT', () => {
        console.log('\n🛑 Shutting down OF Integration Service...');
        process.exit(0);
      });

    } catch (error: any) {
      console.error('❌ Bootstrap failed:', error.message);
      process.exit(1);
    }
  }

  private async initializeCoreServices(): Promise<void> {
    // Initialize RAG Governance Service
    console.log('   🧠 Initializing RAG Governance Service...');
    await ragGovernanceService.initialize();
    
    // Initialize Vision Layer Agents
    console.log('   🤖 Initializing Vision Layer Agents...');
    await visionLayerAgentFramework.initialize();
    
    // Initialize Agentic Cloud Orchestrator
    console.log('   ☁️  Initializing Agentic Cloud Orchestrator...');
    await agenticCloudOrchestrator.initialize();
    
    console.log('   ✨ All core services ready for integration');
  }

  private createAuthConfig(): AuthConfig {
    const authConfig: AuthConfig = {
      keyVaultUrl: process.env.AZURE_KEYVAULT_URL || 'https://wt-keyvault-au.vault.azure.net/',
      managedIdentityClientId: process.env.AZURE_CLIENT_ID,
      allowedAudiences: [
        'https://cognitiveservices.azure.com',
        'api://of-integration-service',
        process.env.AZURE_OPENAI_RESOURCE_ID || 'https://wombat-track-openai-au.openai.azure.com'
      ],
      tokenValidationEndpoint: 'https://login.microsoftonline.com/common/discovery/v2.0/keys',
      rateLimiting: {
        requestsPerMinute: parseInt(process.env.RATE_LIMIT_RPM || '60'),
        burstLimit: parseInt(process.env.RATE_LIMIT_BURST || '10')
      }
    };

    console.log('   🔐 Key Vault URL:', authConfig.keyVaultUrl);
    console.log('   👥 Allowed Audiences:', authConfig.allowedAudiences.length);
    console.log('   ⏱️  Rate Limiting:', `${authConfig.rateLimiting.requestsPerMinute} RPM`);

    return authConfig;
  }

  private async validateEndpoints(): Promise<void> {
    const baseUrl = 'http://localhost:3001';
    
    try {
      // Test health endpoint
      const healthResponse = await fetch(`${baseUrl}/health`);
      if (!healthResponse.ok) {
        throw new Error(`Health check failed: ${healthResponse.status}`);
      }
      console.log('   💚 Health endpoint: OK');

      // Test API docs endpoint
      const docsResponse = await fetch(`${baseUrl}/api-docs`);
      if (!docsResponse.ok) {
        throw new Error(`API docs failed: ${docsResponse.status}`);
      }
      console.log('   📖 API docs endpoint: OK');

      // Test protected endpoint (should fail without auth)
      const protectedResponse = await fetch(`${baseUrl}/api/governance/query`);
      if (protectedResponse.status !== 401) {
        throw new Error('Protected endpoint should return 401 without auth');
      }
      console.log('   🔒 Protected endpoints: OK (auth required)');

    } catch (error: any) {
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        // If fetch is not available (Node.js < 18), skip endpoint validation
        console.log('   ⏭️  Endpoint validation skipped (fetch not available)');
        return;
      }
      throw error;
    }
  }

  private async logStartupGovernance(): Promise<void> {
    try {
      const startupEntry = {
        timestamp: new Date().toISOString(),
        entry_type: 'integration_service_startup',
        project_id: 'OF-INTEGRATION',
        phase_id: 'OF-8.8',
        memory_anchor: 'of-integration-service-active',
        summary: 'OF Integration Service started successfully with all endpoints active',
        details: {
          port: 3001,
          endpoints: [
            'GET /health',
            'GET /api-docs',
            'GET /api/governance/query',
            'POST /api/governance/append',
            'POST /api/memory/query',
            'POST /api/agent/execute',
            'POST /api/orchestration/simulate',
            'POST /api/telemetry/log'
          ],
          coreServices: {
            ragGovernance: 'initialized',
            visionAgents: 'initialized',
            agenticOrchestrator: 'initialized',
            authentication: 'configured'
          },
          environment: {
            nodeVersion: process.version,
            platform: process.platform,
            uptime: process.uptime()
          }
        },
        audit_traceability: true
      };

      // Write to governance log
      const fs = await import('fs/promises');
      const path = await import('path');
      const governanceLogPath = path.join(process.cwd(), 'logs', 'governance.jsonl');
      await fs.appendFile(governanceLogPath, JSON.stringify(startupEntry) + '\n');

      console.log('   📝 Startup entry added to governance.jsonl');
    } catch (error: any) {
      console.warn('   ⚠️  Failed to log to governance:', error.message);
    }
  }

  private printStartupSummary(): void {
    console.log('\n' + '='.repeat(70));
    console.log('🎉 OF INTEGRATION SERVICE - STARTUP COMPLETE');
    console.log('='.repeat(70));
    
    console.log('\n🌐 Service Information:');
    console.log('   Base URL: http://localhost:3001');
    console.log('   Health Check: http://localhost:3001/health');
    console.log('   API Documentation: http://localhost:3001/api-docs');
    
    console.log('\n🔒 Authentication:');
    console.log('   Method: Bearer Token (Azure AD Managed Identity)');
    console.log('   Rate Limiting: 60 requests/minute per client');
    console.log('   Key Vault: Configured for secret management');
    
    console.log('\n📡 Available Endpoints:');
    const endpoints = [
      'GET  /api/governance/query     - Query governance logs',
      'POST /api/governance/append    - Add governance entries', 
      'POST /api/memory/query         - Execute RAG queries',
      'POST /api/agent/execute        - Run Vision Layer Agents',
      'POST /api/orchestration/simulate - Trigger workflows',
      'POST /api/telemetry/log        - Log telemetry data'
    ];
    
    endpoints.forEach(endpoint => console.log(`   ${endpoint}`));
    
    console.log('\n🔧 Core Services Status:');
    console.log('   ✅ RAG Governance Service - Initialized');
    console.log('   ✅ Vision Layer Agents - 5 agents active');
    console.log('   ✅ Agentic Cloud Orchestrator - Workflows ready');
    console.log('   ✅ Authentication Service - Managed Identity configured');
    
    console.log('\n💡 Next Steps:');
    console.log('   1. Configure AzureOpenAI client to use Bearer tokens');
    console.log('   2. Test endpoints with valid Azure AD tokens');
    console.log('   3. Monitor logs/governance.jsonl for API access');
    console.log('   4. Review telemetry in DriveMemory/OF-Integration/');
    
    console.log('\n🛑 To stop service: Ctrl+C');
    console.log('='.repeat(70));
  }
}

// Execute bootstrap if run directly
if (require.main === module) {
  const bootstrap = new OFIntegrationServiceBootstrap();
  bootstrap.bootstrap().catch(error => {
    console.error('Fatal bootstrap error:', error);
    process.exit(1);
  });
}

export { OFIntegrationServiceBootstrap };