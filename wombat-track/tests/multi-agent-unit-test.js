/**
 * Multi-Agent Chat Unit Tests
 * Step 9.0.2.1 - Unit testing of chat agent interactions
 */

import { multiAgentGovernance } from '../src/services/multiAgentGovernance.ts';

class MultiAgentUnitTest {
  constructor() {
    this.testResults = {
      timestamp: new Date().toISOString(),
      stepId: '9.0.2.1',
      testType: 'multi-agent-unit-test',
      results: [],
      summary: { total: 0, passed: 0, failed: 0, warnings: 0 }
    };
  }

  async runAllTests() {
    console.log('🔍 Running Multi-Agent Unit Tests...');

    await this.testGovernanceService();
    await this.testChatInteractionLogging();
    await this.testConversationIdGeneration();
    await this.testEventBuffering();
    await this.testGovernanceSummary();

    console.log('\n📊 Unit Test Summary:');
    console.log(`Total Tests: ${this.testResults.summary.total}`);
    console.log(`Passed: ${this.testResults.summary.passed}`);
    console.log(`Failed: ${this.testResults.summary.failed}`);
    console.log(`Warnings: ${this.testResults.summary.warnings}`);

    return this.testResults;
  }

  async testGovernanceService() {
    console.log('\n🔍 Test: Governance Service Initialization');
    
    try {
      const conversationId = multiAgentGovernance.generateConversationId();
      
      if (conversationId && conversationId.includes('conv-9.0.2')) {
        this.addTestResult('governance-service-init', 'passed', 'Governance service accessible');
      } else {
        this.addTestResult('governance-service-init', 'failed', 'Governance service not properly initialized');
      }
    } catch (error) {
      this.addTestResult('governance-service-init', 'failed', `Governance service error: ${error.message}`);
    }
  }

  async testChatInteractionLogging() {
    console.log('\n🔍 Test: Chat Interaction Logging');
    
    try {
      multiAgentGovernance.clearEvents(); // Clear for clean test
      
      const testInteraction = {
        userMessage: {
          content: 'Test message',
          timestamp: new Date(),
          context: {
            projectId: 'test-project',
            projectName: 'Test Project',
            phaseId: 'test-phase',
            phaseName: 'Test Phase',
            stepId: 'test-step',
            stepName: 'Test Step'
          }
        },
        agentResponse: {
          agentId: 'claude',
          agentName: 'Claude',
          content: 'Test response',
          timestamp: new Date()
        },
        governanceMetadata: {
          projectId: 'test-project',
          phaseId: 'test-phase',
          stepId: 'test-step',
          conversationId: multiAgentGovernance.generateConversationId()
        }
      };

      await multiAgentGovernance.logChatInteraction(testInteraction);
      
      const events = multiAgentGovernance.getEvents();
      const chatEvents = events.filter(e => e.eventType === 'agent_chat');
      
      if (chatEvents.length > 0) {
        this.addTestResult('chat-interaction-logging', 'passed', `Chat interaction logged (${chatEvents.length} events)`);
      } else {
        this.addTestResult('chat-interaction-logging', 'failed', 'Chat interaction not logged');
      }
      
    } catch (error) {
      this.addTestResult('chat-interaction-logging', 'failed', `Chat logging error: ${error.message}`);
    }
  }

  async testConversationIdGeneration() {
    console.log('\n🔍 Test: Conversation ID Generation');
    
    try {
      const id1 = multiAgentGovernance.generateConversationId();
      const id2 = multiAgentGovernance.generateConversationId();
      
      if (id1 !== id2 && id1.includes('conv-9.0.2') && id2.includes('conv-9.0.2')) {
        this.addTestResult('conversation-id-generation', 'passed', 'Unique conversation IDs generated');
      } else {
        this.addTestResult('conversation-id-generation', 'failed', 'Conversation ID generation issue');
      }
    } catch (error) {
      this.addTestResult('conversation-id-generation', 'failed', `Conversation ID error: ${error.message}`);
    }
  }

  async testEventBuffering() {
    console.log('\n🔍 Test: Event Buffering');
    
    try {
      multiAgentGovernance.clearEvents();
      
      // Generate multiple events
      for (let i = 0; i < 3; i++) {
        const testInteraction = {
          userMessage: {
            content: `Test message ${i}`,
            timestamp: new Date(),
            context: { projectId: 'test', projectName: 'Test', phaseId: 'test', phaseName: 'Test', stepId: 'test', stepName: 'Test' }
          },
          agentResponse: {
            agentId: 'cc',
            agentName: 'Claude Code',
            content: `Test response ${i}`,
            timestamp: new Date()
          },
          governanceMetadata: {
            projectId: 'test',
            phaseId: 'test', 
            stepId: 'test',
            conversationId: multiAgentGovernance.generateConversationId()
          }
        };

        await multiAgentGovernance.logChatInteraction(testInteraction);
      }
      
      const events = multiAgentGovernance.getEvents();
      
      if (events.length >= 3) {
        this.addTestResult('event-buffering', 'passed', `Event buffer working (${events.length} events stored)`);
      } else {
        this.addTestResult('event-buffering', 'warning', `Limited events buffered (${events.length} events)`);
      }
      
    } catch (error) {
      this.addTestResult('event-buffering', 'failed', `Event buffering error: ${error.message}`);
    }
  }

  async testGovernanceSummary() {
    console.log('\n🔍 Test: Governance Summary');
    
    try {
      const summary = multiAgentGovernance.getGovernanceSummary();
      
      if (summary && typeof summary === 'object' && summary.totalEvents !== undefined) {
        this.addTestResult('governance-summary', 'passed', `Governance summary generated (${summary.totalEvents} total events)`);
      } else {
        this.addTestResult('governance-summary', 'failed', 'Governance summary not properly generated');
      }
    } catch (error) {
      this.addTestResult('governance-summary', 'failed', `Governance summary error: ${error.message}`);
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
    const unitTest = new MultiAgentUnitTest();
    const results = await unitTest.runAllTests();
    
    if (results.summary.failed > 0) {
      process.exit(1);
    }
    
    process.exit(0);
  })();
}

export { MultiAgentUnitTest };