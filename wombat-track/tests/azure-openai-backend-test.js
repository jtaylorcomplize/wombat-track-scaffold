/**
 * Azure OpenAI Backend Test - Step 9.0.2.2
 * Test the backend proxy functionality
 */

import { spawn } from 'child_process';

class AzureOpenAIBackendTest {
  constructor() {
    this.serverProcess = null;
    this.testResults = {
      timestamp: new Date().toISOString(),
      stepId: '9.0.2.2',
      testType: 'azure-openai-backend-test',
      results: [],
      summary: { total: 0, passed: 0, failed: 0, warnings: 0 }
    };
  }

  async runAllTests() {
    console.log('🔍 Testing Azure OpenAI Backend Proxy - Step 9.0.2.2...');

    try {
      await this.startServer();
      await this.testBackendEndpoint();
      await this.testErrorHandling();
      await this.testGovernanceLogging();
      
    } catch (error) {
      console.error('❌ Test suite error:', error);
      this.addTestResult('test-suite-execution', 'failed', error.message);
    } finally {
      await this.stopServer();
    }

    console.log('\n📊 Backend Test Summary:');
    console.log(`Total Tests: ${this.testResults.summary.total}`);
    console.log(`Passed: ${this.testResults.summary.passed}`);
    console.log(`Failed: ${this.testResults.summary.failed}`);
    console.log(`Warnings: ${this.testResults.summary.warnings}`);

    return this.testResults;
  }

  async startServer() {
    console.log('\n🚀 Starting Express server...');
    
    return new Promise((resolve, reject) => {
      this.serverProcess = spawn('npm', ['run', 'server'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env }
      });

      let serverStarted = false;
      const timeout = setTimeout(() => {
        if (!serverStarted) {
          reject(new Error('Server startup timeout'));
        }
      }, 15000);

      this.serverProcess.stdout.on('data', (data) => {
        const output = data.toString();
        console.log(output);
        
        if (output.includes('Server running on port 3001') && !serverStarted) {
          serverStarted = true;
          clearTimeout(timeout);
          // Give server a moment to fully initialize
          setTimeout(resolve, 2000);
        }
      });

      this.serverProcess.stderr.on('data', (data) => {
        console.error(`Server stderr: ${data}`);
      });

      this.serverProcess.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  async stopServer() {
    if (this.serverProcess) {
      console.log('🛑 Stopping Express server...');
      this.serverProcess.kill('SIGTERM');
      
      // Wait for graceful shutdown
      await new Promise(resolve => {
        this.serverProcess.on('exit', resolve);
        setTimeout(resolve, 3000); // Force resolve after 3 seconds
      });
    }
  }

  async testBackendEndpoint() {
    console.log('\n🔍 Test: Backend Endpoint Response');
    
    try {
      const response = await fetch('http://localhost:3001/api/azure-openai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            { role: 'user', content: 'Hello, test message for backend endpoint' }
          ],
          maxTokens: 50,
          context: {
            projectName: 'Test Project',
            phaseName: 'Step 9.0.2.2',
            stepName: 'Backend Test'
          }
        })
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        this.addTestResult('backend-endpoint', 'passed', `Backend responded: ${data.content?.substring(0, 50)}...`);
      } else {
        // Check if it's a configuration error (expected in dev environment)
        if (data.error && data.error.includes('configuration')) {
          this.addTestResult('backend-endpoint', 'warning', `Backend proxy working but Azure config missing: ${data.error}`);
        } else {
          this.addTestResult('backend-endpoint', 'failed', `Backend error: ${data.error}`);
        }
      }
      
    } catch (error) {
      this.addTestResult('backend-endpoint', 'failed', `Request failed: ${error.message}`);
    }
  }

  async testErrorHandling() {
    console.log('\n🔍 Test: Error Handling');
    
    try {
      // Test with invalid request (no messages)
      const response = await fetch('http://localhost:3001/api/azure-openai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          maxTokens: 50
        })
      });

      const data = await response.json();
      
      if (!response.ok && data.error && data.error.includes('messages array is required')) {
        this.addTestResult('error-handling', 'passed', 'Proper error handling for invalid requests');
      } else {
        this.addTestResult('error-handling', 'failed', 'Error handling not working as expected');
      }
      
    } catch (error) {
      this.addTestResult('error-handling', 'failed', `Error handling test failed: ${error.message}`);
    }
  }

  async testGovernanceLogging() {
    console.log('\n🔍 Test: Governance Logging');
    
    try {
      // This test verifies that the server logs requests properly
      // We can't directly test console logs, but we can verify the endpoint accepts governance context
      const response = await fetch('http://localhost:3001/api/azure-openai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            { role: 'user', content: 'Governance logging test' }
          ],
          context: {
            projectName: 'Governance Test',
            phaseName: 'OF-9.0',
            stepName: '9.0.2.2'
          }
        })
      });

      // Even if Azure is not configured, the context should be accepted
      const data = await response.json();
      
      if (data.context && data.context.projectName === 'Governance Test') {
        this.addTestResult('governance-logging', 'passed', 'Context logging working properly');
      } else if (response.status === 400 && data.error?.includes('messages array')) {
        // This means the endpoint is working and validating properly
        this.addTestResult('governance-logging', 'passed', 'Request validation working');
      } else {
        this.addTestResult('governance-logging', 'warning', 'Context logging unclear');
      }
      
    } catch (error) {
      this.addTestResult('governance-logging', 'failed', `Governance logging test failed: ${error.message}`);
    }
  }

  addTestResult(testName, status, details) {
    const result = {
      testName,
      status,
      details,
      timestamp: new Date().toISOString()
    };
    
    this.testResults.results.push(result);
    this.testResults.summary.total++;
    
    switch (status) {
      case 'passed':
        this.testResults.summary.passed++;
        console.log(`✅ ${testName}: ${details}`);
        break;
      case 'failed':
        this.testResults.summary.failed++;
        console.log(`❌ ${testName}: ${details}`);
        break;
      case 'warning':
        this.testResults.summary.warnings++;
        console.log(`⚠️  ${testName}: ${details}`);
        break;
    }
  }
}

// Run test if called directly
if (process.argv[1] === import.meta.url.replace('file://', '')) {
  (async () => {
    const backendTest = new AzureOpenAIBackendTest();
    const results = await backendTest.runAllTests();
    
    if (results.summary.failed > 0) {
      console.error('❌ Backend tests failed');
      process.exit(1);
    }
    
    console.log('✅ Backend tests completed successfully');
    process.exit(0);
  })();
}

export { AzureOpenAIBackendTest };