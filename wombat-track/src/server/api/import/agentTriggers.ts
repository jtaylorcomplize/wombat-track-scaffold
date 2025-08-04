/**
 * Agent trigger utilities for import operations
 */

export interface AgentTriggerResult {
  agent: string;
  triggered: boolean;
  reason?: string;
  error?: string;
}

export class AgentTriggerManager {
  private static instance: AgentTriggerManager;

  static getInstance(): AgentTriggerManager {
    if (!AgentTriggerManager.instance) {
      AgentTriggerManager.instance = new AgentTriggerManager();
    }
    return AgentTriggerManager.instance;
  }

  async triggerSideQuestDetector(projectId: string, incompleteSteps: any[]): Promise<AgentTriggerResult> {
    try {
      // In production, this would trigger the actual SideQuestDetector agent
      // For now, we'll simulate the trigger
      
      const hasIncompleteSteps = incompleteSteps.length > 0;
      const hasUnanchoredSteps = incompleteSteps.some(step => 
        step.status !== 'Complete' || !step.memoryAnchor
      );

      if (hasIncompleteSteps || hasUnanchoredSteps) {
        console.log(`🤖 SideQuestDetector triggered for project ${projectId}: ${incompleteSteps.length} incomplete/unanchored steps`);
        
        return {
          agent: 'SideQuestDetector',
          triggered: true,
          reason: `Found ${incompleteSteps.length} incomplete or unanchored steps requiring attention`
        };
      }

      return {
        agent: 'SideQuestDetector',
        triggered: false,
        reason: 'All steps complete and properly anchored'
      };

    } catch (error) {
      console.error('Error triggering SideQuestDetector:', error);
      return {
        agent: 'SideQuestDetector',
        triggered: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async triggerAutoAuditAgent(projectId: string, governanceLogs: any[]): Promise<AgentTriggerResult> {
    try {
      // In production, this would trigger the actual AutoAuditAgent
      // For now, we'll simulate the trigger based on governance requirements
      
      const requiresAudit = governanceLogs.some(log => 
        ['Change', 'Decision', 'Architecture'].includes(log.entryType)
      );

      if (requiresAudit) {
        console.log(`🤖 AutoAuditAgent triggered for project ${projectId}: ${governanceLogs.length} governance entries requiring audit`);
        
        return {
          agent: 'AutoAuditAgent',
          triggered: true,
          reason: `Found ${governanceLogs.length} governance entries requiring compliance verification`
        };
      }

      return {
        agent: 'AutoAuditAgent',
        triggered: false,
        reason: 'No governance entries requiring audit'
      };

    } catch (error) {
      console.error('Error triggering AutoAuditAgent:', error);
      return {
        agent: 'AutoAuditAgent',
        triggered: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async triggerMemoryAnchorAgent(projectId: string, completedSteps: any[]): Promise<AgentTriggerResult> {
    try {
      // Only trigger for steps that are Complete and have QA passed
      const qaCompleteSteps = completedSteps.filter(step => 
        step.status === 'Complete' && 
        (step.qaStatus === 'Pass' || step.qaStatus === 'Complete')
      );

      if (qaCompleteSteps.length > 0) {
        console.log(`🤖 MemoryAnchorAgent triggered for project ${projectId}: ${qaCompleteSteps.length} QA-complete steps ready for anchoring`);
        
        return {
          agent: 'MemoryAnchorAgent',
          triggered: true,
          reason: `Found ${qaCompleteSteps.length} QA-complete steps ready for memory anchoring`
        };
      }

      return {
        agent: 'MemoryAnchorAgent',
        triggered: false,
        reason: 'No QA-complete steps ready for memory anchoring'
      };

    } catch (error) {
      console.error('Error triggering MemoryAnchorAgent:', error);
      return {
        agent: 'MemoryAnchorAgent',
        triggered: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async triggerAllRelevantAgents(
    projectId: string, 
    phases: any[], 
    governanceLogs: any[]
  ): Promise<AgentTriggerResult[]> {
    const results: AgentTriggerResult[] = [];

    // Collect all steps from all phases
    const allSteps = phases.flatMap(phase => phase.phaseSteps || []);
    const incompleteSteps = allSteps.filter(step => step.status !== 'Complete');
    const completedSteps = allSteps.filter(step => step.status === 'Complete');

    // Trigger agents in sequence
    results.push(await this.triggerSideQuestDetector(projectId, incompleteSteps));
    results.push(await this.triggerAutoAuditAgent(projectId, governanceLogs));
    results.push(await this.triggerMemoryAnchorAgent(projectId, completedSteps));

    return results;
  }

  async createDebugPhaseStepIfNeeded(projectId: string, phases: any[]): Promise<any | null> {
    // Check if any phase has steps that might need a debug phase
    const needsDebugPhase = phases.some(phase => 
      phase.phaseSteps?.some((step: any) => 
        step.debugBranch || step.pullRequest || step.issueLink
      )
    );

    if (needsDebugPhase) {
      const debugPhaseStep = {
        stepId: `${projectId}-DEBUG-AUTO`,
        name: 'Auto-Generated Debug Step',
        status: 'Complete',
        description: 'Automatically created debug step for imported items with debug artifacts',
        debugBranch: 'auto-generated',
        createdAt: new Date().toISOString(),
        governanceLogs: [{
          logId: `${projectId}-DEBUG-LOG`,
          entryType: 'System',
          summary: 'Auto-created debug step during import for SDLC hygiene',
          timestamp: new Date().toISOString(),
          memoryAnchor: null
        }]
      };

      console.log(`🔧 Auto-created debug PhaseStep for project ${projectId}`);
      return debugPhaseStep;
    }

    return null;
  }
}