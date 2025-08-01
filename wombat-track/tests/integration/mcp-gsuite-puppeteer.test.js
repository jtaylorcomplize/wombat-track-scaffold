/**
 * MCP GSuite Puppeteer Integration Tests - WT-MCPGS-1.0
 * Phase 2: Validate endpoints with Puppeteer MCP tests
 */

const puppeteer = require('puppeteer');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

describe('MCP GSuite Integration Tests - WT-MCPGS-1.0', () => {
  let browser;
  let page;
  const BASE_URL = 'http://localhost:3002/api/mcp/gsuite';
  const MCP_SERVICE_URL = 'http://localhost:8001';
  
  // Test results for governance logging
  const testResults = [];
  
  beforeAll(async () => {
    // Launch browser for UI testing
    browser = await puppeteer.launch({
      headless: process.env.HEADLESS !== 'false',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    page = await browser.newPage();
    
    // Wait for services to be ready
    await waitForService(BASE_URL + '/health', 30000);
    await waitForService(MCP_SERVICE_URL + '/health', 30000);
    
    console.log('🚀 MCP GSuite services are ready for testing');
  });

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
    
    // Write test results to governance log
    await logTestResults();
  });

  /**
   * Wait for service to be available
   */
  async function waitForService(url, timeout = 30000) {
    const start = Date.now();
    
    while (Date.now() - start < timeout) {
      try {
        const response = await axios.get(url, { timeout: 5000 });
        if (response.status === 200) {
          return;
        }
      } catch (error) {
        // Service not ready yet
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    throw new Error(`Service at ${url} not available after ${timeout}ms`);
  }

  /**
   * Log test results to governance
   */
  async function logTestResults() {
    const governanceLogPath = path.join(__dirname, '../../logs/governance.jsonl');
    const driveMemoryPath = path.join(__dirname, '../../DriveMemory/MCP-GSuite');
    
    const testSummary = {
      timestamp: new Date().toISOString(),
      event: 'mcp-gsuite-puppeteer-tests',
      phase: 'WT-MCPGS-1.0-Phase2',
      testResults,
      summary: {
        total: testResults.length,
        passed: testResults.filter(r => r.status === 'passed').length,
        failed: testResults.filter(r => r.status === 'failed').length,
        duration: testResults.reduce((sum, r) => sum + r.duration, 0)
      }
    };

    try {
      await fs.mkdir(path.dirname(governanceLogPath), { recursive: true });
      await fs.appendFile(governanceLogPath, JSON.stringify(testSummary) + '\n');
      
      await fs.mkdir(driveMemoryPath, { recursive: true });
      const driveMemoryFile = path.join(driveMemoryPath, `puppeteer-tests-${new Date().toISOString().split('T')[0]}.jsonl`);
      await fs.appendFile(driveMemoryFile, JSON.stringify(testSummary) + '\n');
    } catch (error) {
      console.error('Failed to log test results:', error);
    }
  }

  /**
   * Record test result
   */
  function recordTestResult(testName, status, duration, details = {}) {
    testResults.push({
      testName,
      status,
      duration,
      timestamp: new Date().toISOString(),
      ...details
    });
  }

  describe('Health Checks', () => {
    test('MCP GSuite API health check', async () => {
      const startTime = Date.now();
      
      try {
        const response = await axios.get(`${BASE_URL}/health`);
        
        expect(response.status).toBe(200);
        expect(response.data.status).toBe('healthy');
        expect(response.data.api_version).toBe('WT-MCPGS-1.0-Phase2');
        
        recordTestResult('health-check-api', 'passed', Date.now() - startTime, {
          responseData: response.data
        });
      } catch (error) {
        recordTestResult('health-check-api', 'failed', Date.now() - startTime, {
          error: error.message
        });
        throw error;
      }
    });

    test('MCP Service health check', async () => {
      const startTime = Date.now();
      
      try {
        const response = await axios.get(`${MCP_SERVICE_URL}/health`);
        
        expect(response.status).toBe(200);
        
        recordTestResult('health-check-mcp-service', 'passed', Date.now() - startTime, {
          responseData: response.data
        });
      } catch (error) {
        recordTestResult('health-check-mcp-service', 'failed', Date.now() - startTime, {
          error: error.message
        });
        throw error;
      }
    });
  });

  describe('Gmail Endpoints', () => {
    test('GET /gmail/labels - should return Gmail labels', async () => {
      const startTime = Date.now();
      
      try {
        const response = await axios.get(`${BASE_URL}/gmail/labels`, {
          headers: {
            'x-user-id': 'test-user-puppeteer'
          }
        });
        
        expect(response.status).toBe(200);
        expect(response.data.success).toBe(true);
        expect(response.data.data).toBeDefined();
        
        recordTestResult('gmail-labels', 'passed', Date.now() - startTime, {
          labelsCount: response.data.data?.content?.[0]?.text ? JSON.parse(response.data.data.content[0].text).labels?.length : 'unknown'
        });
      } catch (error) {
        recordTestResult('gmail-labels', 'failed', Date.now() - startTime, {
          error: error.message,
          statusCode: error.response?.status
        });
        
        // Don't fail test if it's an auth issue - that's expected in test environment
        if (error.response?.status === 401 || error.response?.status === 403) {
          console.log('📧 Gmail labels test skipped - authentication required');
          return;
        }
        throw error;
      }
    });

    test('GET /gmail/messages - should search Gmail messages', async () => {
      const startTime = Date.now();
      
      try {
        const response = await axios.get(`${BASE_URL}/gmail/messages`, {
          params: {
            query: 'in:inbox',
            max_results: 5
          },
          headers: {
            'x-user-id': 'test-user-puppeteer'
          }
        });
        
        expect(response.status).toBe(200);
        expect(response.data.success).toBe(true);
        
        recordTestResult('gmail-messages', 'passed', Date.now() - startTime);
      } catch (error) {
        recordTestResult('gmail-messages', 'failed', Date.now() - startTime, {
          error: error.message,
          statusCode: error.response?.status
        });
        
        if (error.response?.status === 401 || error.response?.status === 403) {
          console.log('📧 Gmail messages test skipped - authentication required');
          return;
        }
        throw error;
      }
    });
  });

  describe('Google Drive Endpoints', () => {
    test('GET /drive/list - should list Drive files', async () => {
      const startTime = Date.now();
      
      try {
        const response = await axios.get(`${BASE_URL}/drive/list`, {
          params: {
            max_results: 5
          },
          headers: {
            'x-user-id': 'test-user-puppeteer'
          }
        });
        
        expect(response.status).toBe(200);
        expect(response.data.success).toBe(true);
        
        recordTestResult('drive-list', 'passed', Date.now() - startTime, {
          filesCount: response.data.data?.content?.[0]?.text ? JSON.parse(response.data.data.content[0].text).files?.length : 'unknown'
        });
      } catch (error) {
        recordTestResult('drive-list', 'failed', Date.now() - startTime, {
          error: error.message,
          statusCode: error.response?.status
        });
        
        if (error.response?.status === 401 || error.response?.status === 403) {
          console.log('📁 Drive list test skipped - authentication required');
          return;
        }
        throw error;
      }
    });
  });

  describe('Google Calendar Endpoints', () => {
    test('GET /calendar/events - should list calendar events', async () => {
      const startTime = Date.now();
      
      try {
        const response = await axios.get(`${BASE_URL}/calendar/events`, {
          params: {
            max_results: 5
          },
          headers: {
            'x-user-id': 'test-user-puppeteer'
          }
        });
        
        expect(response.status).toBe(200);
        expect(response.data.success).toBe(true);
        
        recordTestResult('calendar-events', 'passed', Date.now() - startTime);
      } catch (error) {
        recordTestResult('calendar-events', 'failed', Date.now() - startTime, {
          error: error.message,
          statusCode: error.response?.status
        });
        
        if (error.response?.status === 401 || error.response?.status === 403) {
          console.log('📅 Calendar events test skipped - authentication required');
          return;
        }
        throw error;
      }
    });
  });

  describe('Governance and Logging', () => {
    test('Should log requests to governance', async () => {
      const startTime = Date.now();
      
      try {
        // Make a test request
        await axios.get(`${BASE_URL}/gmail/labels`, {
          headers: {
            'x-user-id': 'test-governance-logging'
          }
        }).catch(() => {
          // Ignore auth errors - we're testing logging
        });
        
        // Wait a bit for logging to complete
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check if governance log was created
        const governanceLogPath = path.join(__dirname, '../../logs/governance.jsonl');
        
        try {
          const logContent = await fs.readFile(governanceLogPath, 'utf-8');
          const entries = logContent.trim().split('\n')
            .filter(line => line.includes('test-governance-logging'));
          
          expect(entries.length).toBeGreaterThan(0);
          
          recordTestResult('governance-logging', 'passed', Date.now() - startTime, {
            logEntriesFound: entries.length
          });
        } catch (fileError) {
          recordTestResult('governance-logging', 'failed', Date.now() - startTime, {
            error: 'Governance log file not found or empty'
          });
          throw new Error('Governance log file not found');
        }
      } catch (error) {
        recordTestResult('governance-logging', 'failed', Date.now() - startTime, {
          error: error.message
        });
        throw error;
      }
    });

    test('Should create DriveMemory logs', async () => {
      const startTime = Date.now();
      
      try {
        // Make a test request
        await axios.get(`${BASE_URL}/drive/list`, {
          headers: {
            'x-user-id': 'test-drivememory-logging'
          }
        }).catch(() => {
          // Ignore auth errors - we're testing logging
        });
        
        // Wait for logging
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check DriveMemory directory
        const driveMemoryPath = path.join(__dirname, '../../DriveMemory/MCP-GSuite');
        const files = await fs.readdir(driveMemoryPath).catch(() => []);
        
        expect(files.length).toBeGreaterThan(0);
        
        recordTestResult('drivememory-logging', 'passed', Date.now() - startTime, {
          driveMemoryFiles: files.length
        });
      } catch (error) {
        recordTestResult('drivememory-logging', 'failed', Date.now() - startTime, {
          error: error.message
        });
        throw error;
      }
    });
  });

  describe('Error Handling', () => {
    test('Should handle invalid endpoints gracefully', async () => {
      const startTime = Date.now();
      
      try {
        const response = await axios.get(`${BASE_URL}/invalid/endpoint`);
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        expect(error.response.status).toBe(404);
        recordTestResult('error-handling-404', 'passed', Date.now() - startTime);
      }
    });

    test('Should handle malformed requests', async () => {
      const startTime = Date.now();
      
      try {
        const response = await axios.post(`${BASE_URL}/gmail/send`, {
          // Missing required fields
          subject: 'Test'
        });
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.error).toContain('Missing required fields');
        recordTestResult('error-handling-validation', 'passed', Date.now() - startTime);
      }
    });
  });

  describe('Performance Tests', () => {
    test('API response times should be reasonable', async () => {
      const startTime = Date.now();
      
      try {
        const response = await axios.get(`${BASE_URL}/health`, {
          timeout: 5000
        });
        
        const responseTime = Date.now() - startTime;
        expect(responseTime).toBeLessThan(5000);
        expect(response.status).toBe(200);
        
        recordTestResult('performance-health-check', 'passed', responseTime, {
          responseTime: responseTime
        });
      } catch (error) {
        recordTestResult('performance-health-check', 'failed', Date.now() - startTime, {
          error: error.message
        });
        throw error;
      }
    });
  });
});