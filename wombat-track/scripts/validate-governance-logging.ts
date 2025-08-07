/**
 * Validate Governance & Logging - Step 9.0.2.1
 * Comprehensive validation of multi-agent chat governance logging
 */

import { multiAgentGovernance } from '../src/services/multiAgentGovernance.js';
import fs from 'fs/promises';
import path from 'path';

interface GovernanceValidationReport {
  timestamp: string;
  stepId: string;
  validation: {
    governanceLoggingActive: boolean;
    memoryAnchorUpdates: boolean;
    driveMemorySync: boolean;
    eventBuffering: boolean;
    conversationTracking: boolean;
  };
  metrics: {
    totalEvents: number;
    chatInteractions: number;
    governanceEvents: number;
    memoryAnchorUpdates: number;
    uniqueConversations: number;
  };
  triggers: {
    completed: string[];
    pending: string[];
  };
  recommendations: string[];
  status: 'passed' | 'failed' | 'warning';
}

class GovernanceValidator {
  private report: GovernanceValidationReport;

  constructor() {
    this.report = {
      timestamp: new Date().toISOString(),
      stepId: '9.0.2.1',
      validation: {
        governanceLoggingActive: false,
        memoryAnchorUpdates: false,
        driveMemorySync: false,
        eventBuffering: false,
        conversationTracking: false
      },
      metrics: {
        totalEvents: 0,
        chatInteractions: 0,
        governanceEvents: 0,
        memoryAnchorUpdates: 0,
        uniqueConversations: 0
      },
      triggers: {
        completed: [],
        pending: []
      },
      recommendations: [],
      status: 'failed'
    };
  }

  async validateGovernanceLogging(): Promise<GovernanceValidationReport> {
    console.log('🔍 Validating Governance & Logging for Step 9.0.2.1...');

    // Test governance logging functionality
    await this.testGovernanceLogging();
    await this.validateEventMetrics();
    await this.checkGovernanceTriggers();
    await this.generateRecommendations();
    await this.determineOverallStatus();

    console.log('\n📊 Governance Validation Results:');
    console.log(`Status: ${this.report.status.toUpperCase()}`);
    console.log(`Total Events: ${this.report.metrics.totalEvents}`);
    console.log(`Chat Interactions: ${this.report.metrics.chatInteractions}`);
    console.log(`Governance Events: ${this.report.metrics.governanceEvents}`);

    // Save validation report
    await this.saveValidationReport();

    return this.report;
  }

  private async testGovernanceLogging(): Promise<void> {
    console.log('\n🔍 Testing governance logging functionality...');

    try {
      // Clear events for clean testing
      multiAgentGovernance.clearEvents();

      // Test multiple agent interactions
      const testAgents = ['claude', 'gizmo', 'cc', 'azoai'];
      
      for (const agentId of testAgents) {
        const testInteraction = {
          userMessage: {
            content: `Validation test message for ${agentId}`,
            timestamp: new Date(),
            context: {
              projectId: 'validation-project',
              projectName: 'Step 9.0.2.1 Validation',
              phaseId: 'OF-9.0',
              phaseName: 'Phase 9.0',
              stepId: '9.0.2.1',
              stepName: 'Multi-Agent Chat QA & Fix'
            }
          },
          agentResponse: {
            agentId,
            agentName: agentId === 'claude' ? 'Claude' : 
                      agentId === 'gizmo' ? 'Gizmo' :
                      agentId === 'cc' ? 'Claude Code' : 'Azure OpenAI',
            content: `Validation response from ${agentId}`,
            timestamp: new Date()
          },
          governanceMetadata: {
            projectId: 'validation-project',
            phaseId: 'OF-9.0',
            stepId: '9.0.2.1',
            conversationId: multiAgentGovernance.generateConversationId()
          }
        };

        await multiAgentGovernance.logChatInteraction(testInteraction);
      }

      this.report.validation.governanceLoggingActive = true;
      console.log('✅ Governance logging functionality verified');

    } catch (error) {
      console.error('❌ Governance logging test failed:', error);
      this.report.validation.governanceLoggingActive = false;
    }
  }

  private async validateEventMetrics(): Promise<void> {
    console.log('\n🔍 Validating event metrics...');

    try {
      const summary = multiAgentGovernance.getGovernanceSummary();
      const events = multiAgentGovernance.getEvents();

      this.report.metrics.totalEvents = summary.totalEvents;
      this.report.metrics.chatInteractions = summary.chatInteractions;
      this.report.metrics.governanceEvents = events.filter(e => e.eventType === 'governance_logged').length;
      
      // Count memory anchor updates
      this.report.metrics.memoryAnchorUpdates = events.filter(e => 
        e.eventType === 'governance_logged' && 
        e.details?.trigger?.includes('Memory anchor')
      ).length;

      // Count unique conversations
      const conversationIds = new Set();
      events.filter(e => e.eventType === 'agent_chat').forEach(e => {
        if (e.details?.conversation_id) {
          conversationIds.add(e.details.conversation_id);
        }
      });
      this.report.metrics.uniqueConversations = conversationIds.size;

      // Validate event buffering
      if (events.length > 0) {
        this.report.validation.eventBuffering = true;
      }

      // Validate conversation tracking
      if (conversationIds.size > 0) {
        this.report.validation.conversationTracking = true;
      }

      // Check for memory anchor updates
      if (this.report.metrics.memoryAnchorUpdates > 0) {
        this.report.validation.memoryAnchorUpdates = true;
      }

      // Check for DriveMemory sync evidence
      const driveMemoryEvents = events.filter(e => 
        e.eventType === 'governance_logged' && 
        e.details?.trigger?.includes('DriveMemory')
      );
      if (driveMemoryEvents.length > 0) {
        this.report.validation.driveMemorySync = true;
      }

      console.log('✅ Event metrics validated');

    } catch (error) {
      console.error('❌ Event metrics validation failed:', error);
    }
  }

  private async checkGovernanceTriggers(): Promise<void> {
    console.log('\n🔍 Checking governance triggers...');

    try {
      const summary = multiAgentGovernance.getGovernanceSummary();
      
      this.report.triggers.completed = summary.completedTriggers || [];
      this.report.triggers.pending = summary.pendingTriggers || [];

      console.log(`✅ Governance triggers checked (${this.report.triggers.completed.length} completed, ${this.report.triggers.pending.length} pending)`);

    } catch (error) {
      console.error('❌ Governance triggers check failed:', error);
    }
  }

  private async generateRecommendations(): Promise<void> {
    console.log('\n🔍 Generating recommendations...');

    const recommendations: string[] = [];

    if (!this.report.validation.governanceLoggingActive) {
      recommendations.push('Enable governance logging for all chat interactions');
    }

    if (!this.report.validation.memoryAnchorUpdates) {
      recommendations.push('Ensure memory anchor updates are properly triggered by chat events');
    }

    if (!this.report.validation.driveMemorySync) {
      recommendations.push('Verify DriveMemory synchronization is working');
    }

    if (!this.report.validation.eventBuffering) {
      recommendations.push('Fix event buffering system to store governance events');
    }

    if (!this.report.validation.conversationTracking) {
      recommendations.push('Implement proper conversation ID tracking');
    }

    if (this.report.metrics.chatInteractions === 0) {
      recommendations.push('Test actual chat interactions to verify end-to-end flow');
    }

    if (this.report.triggers.pending.length > 2) {
      recommendations.push('Complete remaining governance triggers for full Step 9.0.2.1 compliance');
    }

    // Add positive recommendations
    if (this.report.metrics.totalEvents > 10) {
      recommendations.push('✅ Event generation is working well - maintain current logging level');
    }

    if (this.report.validation.conversationTracking && this.report.validation.eventBuffering) {
      recommendations.push('✅ Core governance infrastructure is solid - ready for Step 9.0.3');
    }

    this.report.recommendations = recommendations;
    console.log(`✅ Generated ${recommendations.length} recommendations`);
  }

  private async determineOverallStatus(): Promise<void> {
    const validationChecks = Object.values(this.report.validation);
    const passedChecks = validationChecks.filter(Boolean).length;
    const totalChecks = validationChecks.length;
    
    const passRate = passedChecks / totalChecks;

    if (passRate >= 0.8) {
      this.report.status = 'passed';
    } else if (passRate >= 0.6) {
      this.report.status = 'warning';
    } else {
      this.report.status = 'failed';
    }

    console.log(`\n📊 Overall Status: ${this.report.status.toUpperCase()} (${passedChecks}/${totalChecks} checks passed)`);
  }

  private async saveValidationReport(): Promise<void> {
    try {
      const reportsDir = path.join(process.cwd(), 'logs', 'governance');
      await fs.mkdir(reportsDir, { recursive: true });
      
      const reportPath = path.join(reportsDir, 'step-9.0.2.1-governance-validation.json');
      await fs.writeFile(reportPath, JSON.stringify(this.report, null, 2));
      
      console.log(`\n📁 Validation report saved: ${reportPath}`);
    } catch (error) {
      console.error('❌ Failed to save validation report:', error);
    }
  }
}

// Export for use in other scripts
export { GovernanceValidator };

// Run validation if called directly
if (process.argv[1] === import.meta.url.replace('file://', '')) {
  (async () => {
    const validator = new GovernanceValidator();
    const report = await validator.validateGovernanceLogging();
    
    if (report.status === 'failed') {
      console.error('\n❌ Governance validation failed');
      process.exit(1);
    } else if (report.status === 'warning') {
      console.warn('\n⚠️  Governance validation completed with warnings');
      process.exit(0);
    } else {
      console.log('\n✅ Governance validation passed successfully');
      process.exit(0);
    }
  })();
}