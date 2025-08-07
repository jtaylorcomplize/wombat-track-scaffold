#!/usr/bin/env npx tsx

/**
 * Local OF Integration Service - Simplified for immediate OpenAI integration
 * Runs locally without Azure dependencies for rapid testing
 */

import OFIntegrationService from '../src/services/ofIntegrationService';
import { AuthConfig } from '../src/services/ofIntegrationAuth';

class LocalOFIntegrationService {
  
  async start(): Promise<void> {
    console.log('🚀 Starting Local OF Integration Service...\n');

    try {
      // Create simplified auth config for local testing
      const authConfig: AuthConfig = {
        keyVaultUrl: 'local://dev-mode', // Local mode
        managedIdentityClientId: undefined,
        allowedAudiences: [
          'https://cognitiveservices.azure.com',
          'local://dev-testing',
          'http://localhost:3001'
        ],
        tokenValidationEndpoint: 'local://dev-mode',
        rateLimiting: {
          requestsPerMinute: 100,
          burstLimit: 20
        }
      };

      console.log('✅ Local auth configuration created');
      
      // Start integration service
      const service = new OFIntegrationService(authConfig, 3001);
      
      // Override auth middleware for local testing
      this.setupLocalAuth(service);
      
      await service.start();
      
      console.log('\n' + '='.repeat(60));
      console.log('🎉 LOCAL OF INTEGRATION SERVICE READY');
      console.log('='.repeat(60));
      console.log('');
      console.log('🌐 Base URL: http://localhost:3001');
      console.log('💚 Health Check: http://localhost:3001/health');
      console.log('📖 API Docs: http://localhost:3001/api-docs');
      console.log('');
      console.log('🔓 Authentication: DISABLED for local testing');
      console.log('📡 All endpoints accessible without tokens');
      console.log('');
      console.log('🧪 Test Commands:');
      console.log('curl http://localhost:3001/health');
      console.log('curl http://localhost:3001/api/governance/query?projectId=OF-SDLC-IMP2');
      console.log('curl -X POST http://localhost:3001/api/memory/query -H "Content-Type: application/json" -d \'{"query":"What is the project status?","scope":"combined","priority":"medium"}\'');
      console.log('');
      console.log('🛑 Stop with Ctrl+C');
      console.log('='.repeat(60));

      // Keep running
      process.on('SIGINT', () => {
        console.log('\n🛑 Shutting down Local OF Integration Service...');
        process.exit(0);
      });

    } catch (error: any) {
      console.error('❌ Failed to start local service:', error.message);
      process.exit(1);
    }
  }

  private setupLocalAuth(service: OFIntegrationService): void {
    const app = service.getApp();
    
    // Override the auth middleware for local testing
    app.use('/api', (req: any, res, next) => {
      // Mock authenticated user for local testing
      req.user = {
        clientId: 'local-dev-client',
        identity: 'development-user',
        roles: ['Integration.User', 'Integration.Admin']
      };
      req.requestId = req.requestId || `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      console.log(`🔓 Local Auth: ${req.method} ${req.path} - Request ID: ${req.requestId}`);
      next();
    });
  }
}

// Start the service
if (require.main === module) {
  const service = new LocalOFIntegrationService();
  service.start().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { LocalOFIntegrationService };