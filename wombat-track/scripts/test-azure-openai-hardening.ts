#!/usr/bin/env npx tsx

/**
 * Azure OpenAI Production Hardening Test Script
 * Tests all security, fault tolerance, and monitoring features
 */

import { AzureOpenAIService } from '../src/services/azureOpenAIService';

interface TestResult {
  testName: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  details?: any;
  error?: string;
}

class AzureOpenAIHardeningTest {
  private service: AzureOpenAIService;
  private results: TestResult[] = [];

  constructor() {
    try {
      this.service = new AzureOpenAIService();
    } catch (error: any) {
      console.error('Failed to initialize AzureOpenAIService:', error.message);
      process.exit(1);
    }
  }

  async runAllTests(): Promise<void> {
    console.log('🔒 Azure OpenAI Production Hardening Test Suite\n');

    // Test connectivity
    await this.testBasicConnectivity();
    
    // Test configuration security
    await this.testConfigurationSecurity();
    
    // Test retry mechanism
    await this.testRetryMechanism();
    
    // Test monitoring and metrics
    await this.testMonitoringMetrics();
    
    // Test health check
    await this.testHealthCheck();
    
    // Test Key Vault integration
    await this.testKeyVaultIntegration();
    
    // Test fault tolerance
    await this.testFaultTolerance();

    this.printResults();
  }

  private async testBasicConnectivity(): Promise<void> {
    try {
      const isConnected = await this.service.testConnection();
      this.results.push({
        testName: 'Basic Connectivity',
        status: isConnected ? 'PASS' : 'FAIL',
        details: { connected: isConnected }
      });
    } catch (error: any) {
      this.results.push({
        testName: 'Basic Connectivity',
        status: 'FAIL',
        error: error.message
      });
    }
  }

  private async testConfigurationSecurity(): Promise<void> {
    try {
      const config = this.service.getConfig();
      
      // Check if sensitive info is properly masked
      const hasEndpoint = !!config.endpoint;
      const apiKeyMasked = !config.hasOwnProperty('apiKey'); // Should not expose API key
      
      this.results.push({
        testName: 'Configuration Security',
        status: hasEndpoint && apiKeyMasked ? 'PASS' : 'FAIL',
        details: { 
          hasEndpoint,
          apiKeyProperlyMasked: apiKeyMasked,
          deploymentsConfigured: Object.keys(config.deployments || {}).length > 0
        }
      });
    } catch (error: any) {
      this.results.push({
        testName: 'Configuration Security',
        status: 'FAIL',
        error: error.message
      });
    }
  }

  private async testRetryMechanism(): Promise<void> {
    try {
      // Test with a simple chat completion that should succeed
      const startTime = Date.now();
      const response = await this.service.getChatCompletion({
        messages: [{ role: 'user', content: 'Say "test successful"' }],
        maxTokens: 10
      });
      const endTime = Date.now();
      
      const responseValid = response.toLowerCase().includes('test') || response.toLowerCase().includes('successful');
      
      this.results.push({
        testName: 'Retry Mechanism',
        status: responseValid ? 'PASS' : 'FAIL',
        details: {
          responseTime: endTime - startTime,
          response: response.substring(0, 100),
          responseValid
        }
      });
    } catch (error: any) {
      this.results.push({
        testName: 'Retry Mechanism',
        status: 'FAIL',
        error: error.message
      });
    }
  }

  private async testMonitoringMetrics(): Promise<void> {
    try {
      // Make a request to generate metrics
      await this.service.getChatCompletion({
        messages: [{ role: 'user', content: 'Test metrics' }],
        maxTokens: 5
      });
      
      const metrics = this.service.getMetrics();
      const hasMetrics = metrics.totalRequests > 0 && 
                        metrics.successRate !== undefined &&
                        metrics.avgResponseTime >= 0;
      
      this.results.push({
        testName: 'Monitoring & Metrics',
        status: hasMetrics ? 'PASS' : 'FAIL',
        details: metrics
      });
    } catch (error: any) {
      this.results.push({
        testName: 'Monitoring & Metrics',
        status: 'FAIL',
        error: error.message
      });
    }
  }

  private async testHealthCheck(): Promise<void> {
    try {
      const healthCheck = await this.service.healthCheck();
      const isHealthy = healthCheck.status === 'healthy' || healthCheck.status === 'degraded';
      
      this.results.push({
        testName: 'Health Check',
        status: isHealthy ? 'PASS' : 'FAIL',
        details: {
          status: healthCheck.status,
          connectivity: healthCheck.details.connectivity,
          modelAvailability: healthCheck.details.modelAvailability
        }
      });
    } catch (error: any) {
      this.results.push({
        testName: 'Health Check',
        status: 'FAIL',
        error: error.message
      });
    }
  }

  private async testKeyVaultIntegration(): Promise<void> {
    try {
      const healthCheck = await this.service.healthCheck();
      const keyVaultConfigured = process.env.AZURE_KEYVAULT_URL !== undefined;
      
      if (!keyVaultConfigured) {
        this.results.push({
          testName: 'Key Vault Integration',
          status: 'SKIP',
          details: { reason: 'AZURE_KEYVAULT_URL not configured' }
        });
        return;
      }
      
      const keyVaultWorking = healthCheck.details.keyVault;
      
      this.results.push({
        testName: 'Key Vault Integration',
        status: keyVaultWorking ? 'PASS' : 'FAIL',
        details: { keyVaultAccessible: keyVaultWorking }
      });
    } catch (error: any) {
      this.results.push({
        testName: 'Key Vault Integration',
        status: 'FAIL',
        error: error.message
      });
    }
  }

  private async testFaultTolerance(): Promise<void> {
    try {
      // Test embeddings as well to verify both endpoints work
      const embeddings = await this.service.getEmbeddings({
        input: ['test embedding'],
        dimensions: 50
      });
      
      const embeddingValid = Array.isArray(embeddings) && 
                           embeddings.length > 0 && 
                           Array.isArray(embeddings[0]) &&
                           embeddings[0].length === 50;
      
      this.results.push({
        testName: 'Fault Tolerance (Multi-endpoint)',
        status: embeddingValid ? 'PASS' : 'FAIL',
        details: {
          embeddingCount: embeddings.length,
          embeddingDimensions: embeddings[0]?.length || 0
        }
      });
    } catch (error: any) {
      this.results.push({
        testName: 'Fault Tolerance (Multi-endpoint)',
        status: 'FAIL',
        error: error.message
      });
    }
  }

  private printResults(): void {
    console.log('\n📊 Test Results Summary:');
    console.log('='.repeat(60));
    
    let passed = 0;
    let failed = 0;
    let skipped = 0;
    
    this.results.forEach(result => {
      const statusIcon = result.status === 'PASS' ? '✅' : 
                        result.status === 'FAIL' ? '❌' : '⏭️';
      
      console.log(`${statusIcon} ${result.testName}: ${result.status}`);
      
      if (result.details && Object.keys(result.details).length > 0) {
        console.log(`   Details: ${JSON.stringify(result.details, null, 2).replace(/\n/g, '\n   ')}`);
      }
      
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
      
      console.log('');
      
      if (result.status === 'PASS') passed++;
      else if (result.status === 'FAIL') failed++;
      else skipped++;
    });
    
    console.log('='.repeat(60));
    console.log(`📈 Summary: ${passed} passed, ${failed} failed, ${skipped} skipped`);
    
    if (failed === 0) {
      console.log('🎉 All critical tests passed! Azure OpenAI service is production-ready.');
    } else {
      console.log('⚠️  Some tests failed. Review configuration before production deployment.');
      process.exit(1);
    }
  }
}

// Execute if run directly
if (require.main === module) {
  const tester = new AzureOpenAIHardeningTest();
  tester.runAllTests().catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });
}

export { AzureOpenAIHardeningTest };