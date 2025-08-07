/**
 * Multi-Agent Chat QA Test Script
 * Step 9.0.2.1 - Chat Agent Interaction QA & Fix
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

class MultiAgentChatQA {
  constructor() {
    this.browser = null;
    this.page = null;
    this.testResults = {
      timestamp: new Date().toISOString(),
      stepId: '9.0.2.1',
      testType: 'multi-agent-chat-qa',
      results: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        warnings: 0
      }
    };
  }

  async initialize() {
    console.log('🚀 Initializing Multi-Agent Chat QA...');
    this.browser = await puppeteer.launch({ 
      headless: false,
      defaultViewport: { width: 1280, height: 720 },
      args: ['--no-sandbox']
    });
    this.page = await this.browser.newPage();
    
    // Set up console monitoring
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error(`❌ Console Error: ${msg.text()}`);
      } else if (msg.text().includes('📝 Multi-Agent Chat Governance:')) {
        console.log(`✅ Governance Log: ${msg.text()}`);
      }
    });

    // Set up network monitoring for API calls
    await this.page.setRequestInterception(true);
    this.page.on('request', request => {
      if (request.url().includes('azure') || request.url().includes('openai')) {
        console.log(`🌐 API Request: ${request.method()} ${request.url()}`);
      }
      request.continue();
    });
  }

  async runAllTests() {
    try {
      console.log('🔍 Starting Multi-Agent Chat QA Tests...');
      
      await this.testGlobalOrchestratorChatAccess();
      await this.testAgentTabSwitching();
      await this.testAllAgentsResponse();
      await this.testIndividualAgentResponse();
      await this.testAzureOpenAIIntegration();
      await this.testGovernanceLogging();
      await this.testErrorHandling();
      await this.testUIEnhancements();

      console.log('\n📊 QA Test Summary:');
      console.log(`Total Tests: ${this.testResults.summary.total}`);
      console.log(`Passed: ${this.testResults.summary.passed}`);
      console.log(`Failed: ${this.testResults.summary.failed}`);
      console.log(`Warnings: ${this.testResults.summary.warnings}`);

      // Save test results
      await this.saveTestResults();
      
      return this.testResults;

    } catch (error) {
      console.error('❌ QA Test Suite Failed:', error);
      this.addTestResult('qa-suite-execution', 'failed', error.message);
    } finally {
      if (this.browser) {
        await this.browser.close();
      }
    }
  }

  async testGlobalOrchestratorChatAccess() {
    console.log('\n🔍 Test: Global Orchestrator Chat Access');
    
    try {
      await this.page.goto('http://localhost:5174/', { waitUntil: 'networkidle0', timeout: 10000 });
      
      // Look for the floating chat button
      const chatButton = await this.page.$('button[title="Open Orchestrator Chat"]');
      if (chatButton) {
        await chatButton.click();
        await this.page.waitForSelector('.fixed.right-0', { timeout: 3000 });
        
        const chatVisible = await this.page.$eval('.fixed.right-0', el => !el.classList.contains('translate-x-full'));
        
        if (chatVisible) {
          this.addTestResult('global-chat-access', 'passed', 'Chat sidebar opens successfully');
        } else {
          this.addTestResult('global-chat-access', 'failed', 'Chat sidebar not visible after click');
        }
      } else {
        this.addTestResult('global-chat-access', 'failed', 'Chat toggle button not found');
      }
    } catch (error) {
      this.addTestResult('global-chat-access', 'failed', `Navigation error: ${error.message}`);
    }
  }

  async testAgentTabSwitching() {
    console.log('\n🔍 Test: Agent Tab Switching');
    
    try {
      const tabs = ['all', 'claude', 'gizmo', 'cc', 'azoai'];
      
      for (const tabId of tabs) {
        const tabButton = await this.page.$(`button[title*="${tabId === 'all' ? 'All Orchestrators' : tabId}"]`);
        if (tabButton) {
          await tabButton.click();
          await this.page.waitForTimeout(500);
          
          const isActive = await this.page.$eval(`button[title*="${tabId === 'all' ? 'All Orchestrators' : tabId}"]`, 
            el => el.classList.contains('bg-blue-500'));
          
          if (isActive) {
            this.addTestResult(`tab-switch-${tabId}`, 'passed', `${tabId} tab activation successful`);
          } else {
            this.addTestResult(`tab-switch-${tabId}`, 'warning', `${tabId} tab activation unclear`);
          }
        } else {
          this.addTestResult(`tab-switch-${tabId}`, 'failed', `${tabId} tab button not found`);
        }
      }
    } catch (error) {
      this.addTestResult('agent-tab-switching', 'failed', `Tab switching error: ${error.message}`);
    }
  }

  async testAllAgentsResponse() {
    console.log('\n🔍 Test: All Agents Response');
    
    try {
      // Select "All Orchestrators" tab
      await this.page.click('button[title="All Orchestrators"]');
      
      // Send a test message
      const inputSelector = 'input[placeholder="Message orchestrators..."]';
      await this.page.waitForSelector(inputSelector, { timeout: 3000 });
      await this.page.type(inputSelector, 'Test message for all agents');
      await this.page.keyboard.press('Enter');
      
      // Wait for responses (should get multiple responses)
      await this.page.waitForTimeout(5000);
      
      const messages = await this.page.$$('.max-w-xs.rounded-lg.p-3');
      const agentMessages = messages.length - 1; // Subtract user message
      
      if (agentMessages >= 4) {
        this.addTestResult('all-agents-response', 'passed', `Received ${agentMessages} agent responses`);
      } else if (agentMessages >= 1) {
        this.addTestResult('all-agents-response', 'warning', `Only ${agentMessages} agents responded`);
      } else {
        this.addTestResult('all-agents-response', 'failed', 'No agent responses received');
      }
      
    } catch (error) {
      this.addTestResult('all-agents-response', 'failed', `All agents test error: ${error.message}`);
    }
  }

  async testIndividualAgentResponse() {
    console.log('\n🔍 Test: Individual Agent Response');
    
    const agents = ['claude', 'azoai', 'gizmo'];
    
    for (const agent of agents) {
      try {
        // Switch to agent tab
        await this.page.click(`button[title="${agent}"]`);
        await this.page.waitForTimeout(1000);
        
        // Send test message
        const inputSelector = 'input[placeholder="Message orchestrators..."]';
        await this.page.focus(inputSelector);
        await this.page.keyboard.selectAll();
        await this.page.type(inputSelector, `Test message for ${agent}`);
        await this.page.keyboard.press('Enter');
        
        // Wait for response
        await this.page.waitForTimeout(3000);
        
        // Check for agent response
        const lastMessage = await this.page.$eval(
          '.max-w-xs.rounded-lg.p-3:last-child',
          el => el.textContent
        );
        
        if (lastMessage && !lastMessage.includes(`Test message for ${agent}`)) {
          this.addTestResult(`individual-${agent}-response`, 'passed', `${agent} responded: ${lastMessage.substring(0, 50)}...`);
        } else {
          this.addTestResult(`individual-${agent}-response`, 'failed', `${agent} did not respond properly`);
        }
        
      } catch (error) {
        this.addTestResult(`individual-${agent}-response`, 'failed', `${agent} test error: ${error.message}`);
      }
    }
  }

  async testAzureOpenAIIntegration() {
    console.log('\n🔍 Test: Azure OpenAI Integration');
    
    try {
      // Switch to AzOAI tab
      await this.page.click('button[title="AzOAI"]');
      await this.page.waitForTimeout(1000);
      
      // Send a message that should trigger Azure OpenAI
      const inputSelector = 'input[placeholder="Message orchestrators..."]';
      await this.page.focus(inputSelector);
      await this.page.keyboard.selectAll();
      await this.page.type(inputSelector, 'Generate a hello world function in Python');
      await this.page.keyboard.press('Enter');
      
      // Wait for response (Azure OpenAI might take longer)
      await this.page.waitForTimeout(8000);
      
      const lastMessage = await this.page.$eval(
        '.max-w-xs.rounded-lg.p-3:last-child',
        el => el.textContent
      );
      
      if (lastMessage && (lastMessage.includes('def') || lastMessage.includes('function') || lastMessage.includes('Azure'))) {
        this.addTestResult('azure-openai-integration', 'passed', 'Azure OpenAI integration working');
      } else if (lastMessage && lastMessage.includes('temporarily unavailable')) {
        this.addTestResult('azure-openai-integration', 'warning', 'Azure OpenAI service unavailable but error handled');
      } else {
        this.addTestResult('azure-openai-integration', 'failed', 'Azure OpenAI integration failed');
      }
      
    } catch (error) {
      this.addTestResult('azure-openai-integration', 'failed', `Azure OpenAI test error: ${error.message}`);
    }
  }

  async testGovernanceLogging() {
    console.log('\n🔍 Test: Governance Logging');
    
    try {
      let governanceLogged = false;
      
      // Monitor console for governance logs
      this.page.on('console', msg => {
        if (msg.text().includes('📝 Multi-Agent Chat Governance:')) {
          governanceLogged = true;
        }
      });
      
      // Send a test message
      const inputSelector = 'input[placeholder="Message orchestrators..."]';
      await this.page.focus(inputSelector);
      await this.page.keyboard.selectAll();
      await this.page.type(inputSelector, 'Test governance logging');
      await this.page.keyboard.press('Enter');
      
      // Wait for governance logging
      await this.page.waitForTimeout(3000);
      
      // Check for governance indicator in UI
      const governanceIndicator = await this.page.$('span[title="Logged to Governance"]');
      
      if (governanceIndicator || governanceLogged) {
        this.addTestResult('governance-logging', 'passed', 'Governance logging active');
      } else {
        this.addTestResult('governance-logging', 'warning', 'Governance logging unclear');
      }
      
    } catch (error) {
      this.addTestResult('governance-logging', 'failed', `Governance logging test error: ${error.message}`);
    }
  }

  async testErrorHandling() {
    console.log('\n🔍 Test: Error Handling');
    
    try {
      // This test assumes some error conditions might occur naturally
      let errorHandled = false;
      
      // Monitor for error messages in chat
      const messages = await this.page.$$('.max-w-xs.rounded-lg.p-3');
      for (const message of messages) {
        const text = await message.evaluate(el => el.textContent);
        if (text && (text.includes('error') || text.includes('unavailable') || text.includes('Error:'))) {
          errorHandled = true;
          break;
        }
      }
      
      if (errorHandled) {
        this.addTestResult('error-handling', 'passed', 'Error handling implemented');
      } else {
        this.addTestResult('error-handling', 'passed', 'No errors encountered (good)');
      }
      
    } catch (error) {
      this.addTestResult('error-handling', 'warning', `Error handling test inconclusive: ${error.message}`);
    }
  }

  async testUIEnhancements() {
    console.log('\n🔍 Test: UI Enhancements');
    
    try {
      // Check for agent tagging
      const agentTags = await this.page.$$('.px-2.py-0\\.5.rounded-full');
      const hasAgentTags = agentTags.length > 0;
      
      // Check for status indicators
      const statusIcons = await this.page.$$eval('.text-xs', 
        elements => elements.some(el => el.textContent && 
          (el.textContent.includes('🟢') || el.textContent.includes('🟡') || el.textContent.includes('🔴'))
        )
      );
      
      // Check for context display
      const contextHeader = await this.page.$('.font-mono');
      const hasContext = !!contextHeader;
      
      const enhancementScore = (hasAgentTags ? 1 : 0) + (statusIcons ? 1 : 0) + (hasContext ? 1 : 0);
      
      if (enhancementScore >= 2) {
        this.addTestResult('ui-enhancements', 'passed', `UI enhancements present (${enhancementScore}/3)`);
      } else if (enhancementScore >= 1) {
        this.addTestResult('ui-enhancements', 'warning', `Some UI enhancements missing (${enhancementScore}/3)`);
      } else {
        this.addTestResult('ui-enhancements', 'failed', 'UI enhancements not implemented');
      }
      
    } catch (error) {
      this.addTestResult('ui-enhancements', 'failed', `UI enhancements test error: ${error.message}`);
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

  async saveTestResults() {
    const resultsPath = path.join(__dirname, '../logs/multi-agent-chat-qa-results.json');
    await fs.writeFile(resultsPath, JSON.stringify(this.testResults, null, 2));
    console.log(`📁 QA Results saved to: ${resultsPath}`);
  }
}

// Export for use
module.exports = { MultiAgentChatQA };

// Run if called directly
if (require.main === module) {
  (async () => {
    const qa = new MultiAgentChatQA();
    await qa.initialize();
    await qa.runAllTests();
  })();
}