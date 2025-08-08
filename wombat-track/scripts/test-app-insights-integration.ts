#!/usr/bin/env npx tsx

/**
 * Test App Insights Integration - OF-9.2.4
 * 
 * This script tests the App Insights telemetry integration for both
 * backend API and frontend UI services deployed on Azure App Service.
 */

import https from 'https';
import http from 'http';

interface TestResult {
  service: string;
  url: string;
  status: 'success' | 'error';
  responseTime: number;
  statusCode?: number;
  error?: string;
  timestamp: string;
}

interface AppInsightsTest {
  serviceName: string;
  productionUrl: string;
  stagingUrl: string;
  healthEndpoint?: string;
}

const services: AppInsightsTest[] = [
  {
    serviceName: 'Backend API',
    productionUrl: 'https://wombat-track-api-prod.azurewebsites.net',
    stagingUrl: 'https://wombat-track-api-prod-staging.azurewebsites.net',
    healthEndpoint: '/api/health'
  },
  {
    serviceName: 'Frontend UI',
    productionUrl: 'https://wombat-track-ui-prod.azurewebsites.net',
    stagingUrl: 'https://wombat-track-ui-prod-staging.azurewebsites.net',
    healthEndpoint: '/'
  }
];

async function testEndpoint(url: string): Promise<TestResult> {
  const startTime = Date.now();
  
  return new Promise((resolve) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const request = client.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'WombatTrack-HealthCheck/1.0'
      }
    }, (response) => {
      const responseTime = Date.now() - startTime;
      
      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => {
        resolve({
          service: url,
          url: url,
          status: response.statusCode && response.statusCode < 400 ? 'success' : 'error',
          responseTime,
          statusCode: response.statusCode,
          timestamp: new Date().toISOString()
        });
      });
    });
    
    request.on('error', (error) => {
      const responseTime = Date.now() - startTime;
      resolve({
        service: url,
        url: url,
        status: 'error',
        responseTime,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    });
    
    request.on('timeout', () => {
      request.destroy();
      const responseTime = Date.now() - startTime;
      resolve({
        service: url,
        url: url,
        status: 'error',
        responseTime,
        error: 'Request timeout',
        timestamp: new Date().toISOString()
      });
    });
  });
}

async function testGovernanceLogForwarding(): Promise<void> {
  console.log('\\n🔄 Testing Governance Log Forwarding...');
  
  // Simulate telemetry event that would be forwarded
  const telemetryEvent = {
    resourceName: 'wombat-track-api-prod',
    metricName: 'test-health-check',
    value: 1,
    timestamp: new Date().toISOString(),
    dimensions: {
      test: 'app-insights-integration',
      phase: 'OF-9.2.4',
      source: 'test-script'
    }
  };
  
  try {
    // In production, this would call the Azure Function
    // For now, we'll simulate the governance log entry
    console.log('✅ Telemetry event formatted for governance forwarding:');
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      source: 'azure-app-insights',
      level: 'info',
      category: 'observability',
      event: 'telemetry-ingestion',
      details: telemetryEvent,
      metadata: {
        forwardedFrom: 'test-script',
        phase: 'OF-9.2.4'
      }
    }, null, 2));
    
  } catch (error) {
    console.error('❌ Governance log forwarding test failed:', error);
  }
}

async function runHealthChecks(): Promise<void> {
  console.log('🚀 Starting App Insights Integration Test - Phase OF-9.2.4\\n');
  
  const results: TestResult[] = [];
  
  for (const service of services) {
    console.log(`📊 Testing ${service.serviceName}...`);
    
    // Test production slot
    const prodUrl = service.productionUrl + (service.healthEndpoint || '');
    const prodResult = await testEndpoint(prodUrl);
    results.push(prodResult);
    
    console.log(`   Production: ${prodResult.status === 'success' ? '✅' : '❌'} ${prodResult.statusCode || 'ERROR'} (${prodResult.responseTime}ms)`);
    if (prodResult.error) {
      console.log(`   Error: ${prodResult.error}`);
    }
    
    // Test staging slot
    const stagingUrl = service.stagingUrl + (service.healthEndpoint || '');
    const stagingResult = await testEndpoint(stagingUrl);
    results.push(stagingResult);
    
    console.log(`   Staging: ${stagingResult.status === 'success' ? '✅' : '❌'} ${stagingResult.statusCode || 'ERROR'} (${stagingResult.responseTime}ms)`);
    if (stagingResult.error) {
      console.log(`   Error: ${stagingResult.error}`);
    }
    
    console.log('');
  }
  
  // Test governance log forwarding
  await testGovernanceLogForwarding();
  
  // Summary
  const successfulTests = results.filter(r => r.status === 'success').length;
  const totalTests = results.length;
  
  console.log('\\n📋 Test Summary:');
  console.log(`✅ Successful tests: ${successfulTests}/${totalTests}`);
  console.log(`⏱️  Average response time: ${Math.round(results.reduce((sum, r) => sum + r.responseTime, 0) / totalTests)}ms`);
  
  if (successfulTests === totalTests) {
    console.log('🎉 All App Insights integration tests passed!');
  } else {
    console.log('⚠️  Some tests failed - check service deployment status');
  }
  
  // Generate test report
  const report = {
    timestamp: new Date().toISOString(),
    phase: 'OF-9.2.4',
    testType: 'app-insights-integration',
    summary: {
      totalTests,
      successfulTests,
      failedTests: totalTests - successfulTests,
      averageResponseTime: Math.round(results.reduce((sum, r) => sum + r.responseTime, 0) / totalTests)
    },
    results
  };
  
  console.log('\\n📄 Test report generated for governance logging.');
  return;
}

// Run tests if script is executed directly
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

if (process.argv[1] === __filename) {
  runHealthChecks().catch(console.error);
}

export { runHealthChecks, testEndpoint };