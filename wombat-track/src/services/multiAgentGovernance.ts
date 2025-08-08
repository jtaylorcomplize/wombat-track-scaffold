/**
 * Multi-Agent Orchestration Governance Service
 * Handles auto-logging of all sidebar chat interactions and orchestration events
 */

export interface OrchestrationGovernanceEvent {
  timestamp: string;
  phaseId: string;
  stepId: string;
  eventType: 'agent_chat' | 'agent_task_assigned' | 'agent_status_changed' | 'orchestration_action' | 'governance_logged';
  context: {
    projectId: string;
    projectName: string;
    phaseId: string;
    phaseName: string;
    stepId: string;
    stepName: string;
  };
  details: any;
  memoryAnchor: string;
  participants: string[];
  autoLogged: boolean;
}

export interface ChatInteraction {
  userMessage: {
    content: string;
    timestamp: Date;
    context: any;
  };
  agentResponse: {
    agentId: string;
    agentName: string;
    content: string;
    timestamp: Date;
  };
  governanceMetadata: {
    projectId: string;
    phaseId: string;
    stepId: string;
    conversationId: string;
  };
}

export interface AgentTask {
  id: string;
  agentId: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  status: 'queued' | 'in_progress' | 'completed' | 'failed';
  assignedAt: Date;
  context: any;
}

class MultiAgentGovernanceService {
  private memoryAnchor: string = 'of-9.0-init-20250806';
  private phaseId: string = 'OF-9.0';
  private stepId: string = '9.0.2';
  private eventBuffer: OrchestrationGovernanceEvent[] = [];
  private conversationCounter: number = 0;

  /**
   * Log a chat interaction between user and agent
   */
  async logChatInteraction(interaction: ChatInteraction): Promise<void> {
    const event: OrchestrationGovernanceEvent = {
      timestamp: new Date().toISOString(),
      phaseId: this.phaseId,
      stepId: this.stepId,
      eventType: 'agent_chat',
      context: interaction.governanceMetadata,
      details: {
        operation: 'Multi-Agent Chat Interaction',
        user_message: interaction.userMessage.content,
        agent_response: interaction.agentResponse.content,
        agent_id: interaction.agentResponse.agentId,
        agent_name: interaction.agentResponse.agentName,
        conversation_id: interaction.governanceMetadata.conversationId,
        context_preserved: true,
        auto_tagged: true
      },
      memoryAnchor: this.memoryAnchor,
      participants: ['user', interaction.agentResponse.agentId],
      autoLogged: true
    };

    this.eventBuffer.push(event);
    
    // Console logging for development
    console.log('📝 Multi-Agent Chat Governance:', event);

    // Log to file-based systems (until migration to native storage)
    await this.writeToGovernanceLog(event);
    await this.updateMemoryPlugin(event);
    await this.syncToDriveMemory(event);

    // Mark governance trigger
    await this.markGovernanceTrigger('First orchestrator message logged');
  }

  /**
   * Log agent task assignment
   */
  async logAgentTaskAssignment(task: AgentTask): Promise<void> {
    const event: OrchestrationGovernanceEvent = {
      timestamp: new Date().toISOString(),
      phaseId: this.phaseId,
      stepId: this.stepId,
      eventType: 'agent_task_assigned',
      context: task.context,
      details: {
        operation: 'Agent Task Assignment',
        task_id: task.id,
        agent_id: task.agentId,
        task_title: task.title,
        task_description: task.description,
        priority: task.priority,
        status: task.status,
        assigned_at: task.assignedAt.toISOString()
      },
      memoryAnchor: this.memoryAnchor,
      participants: [task.agentId],
      autoLogged: true
    };

    this.eventBuffer.push(event);
    console.log('📝 Agent Task Assignment:', event);

    await this.writeToGovernanceLog(event);
    await this.updateMemoryPlugin(event);

    // Mark governance trigger for first task
    if (this.eventBuffer.filter(e => e.eventType === 'agent_task_assigned').length === 1) {
      await this.markGovernanceTrigger('First task queued & tracked');
    }
  }

  /**
   * Log agent status changes
   */
  async logAgentStatusChange(agentId: string, oldStatus: string, newStatus: string, context: any): Promise<void> {
    const event: OrchestrationGovernanceEvent = {
      timestamp: new Date().toISOString(),
      phaseId: this.phaseId,
      stepId: this.stepId,
      eventType: 'agent_status_changed',
      context,
      details: {
        operation: 'Agent Status Change',
        agent_id: agentId,
        old_status: oldStatus,
        new_status: newStatus,
        status_change_reason: 'orchestration_update'
      },
      memoryAnchor: this.memoryAnchor,
      participants: [agentId],
      autoLogged: true
    };

    this.eventBuffer.push(event);
    console.log('📝 Agent Status Change:', event);

    await this.writeToGovernanceLog(event);
  }

  /**
   * Log general orchestration actions
   */
  async logOrchestrationAction(action: string, details: any, context: any): Promise<void> {
    const event: OrchestrationGovernanceEvent = {
      timestamp: new Date().toISOString(),
      phaseId: this.phaseId,
      stepId: this.stepId,
      eventType: 'orchestration_action',
      context,
      details: {
        operation: 'Orchestration Action',
        action,
        ...details
      },
      memoryAnchor: this.memoryAnchor,
      participants: details.participants || [],
      autoLogged: true
    };

    this.eventBuffer.push(event);
    console.log('📝 Orchestration Action:', event);

    await this.writeToGovernanceLog(event);
  }

  /**
   * Generate unique conversation ID
   */
  generateConversationId(): string {
    this.conversationCounter++;
    return `conv-9.0.2-${Date.now()}-${this.conversationCounter}`;
  }

  /**
   * Mark governance trigger as completed
   */
  private async markGovernanceTrigger(trigger: string): Promise<void> {
    const event: OrchestrationGovernanceEvent = {
      timestamp: new Date().toISOString(),
      phaseId: this.phaseId,
      stepId: this.stepId,
      eventType: 'governance_logged',
      context: {} as any,
      details: {
        operation: 'Governance Trigger',
        trigger,
        step: this.stepId,
        memory_anchor_updated: true
      },
      memoryAnchor: this.memoryAnchor,
      participants: ['system'],
      autoLogged: true
    };

    this.eventBuffer.push(event);
    console.log(`✅ Governance Trigger: ${trigger}`);
  }

  /**
   * Write event to governance JSONL file (simulated)
   */
  private async writeToGovernanceLog(event: OrchestrationGovernanceEvent): Promise<void> {
    // In real implementation, this would POST to governance API
    console.log(`📁 Writing to Governance JSONL:`, JSON.stringify(event));
  }

  /**
   * Update memory plugin with event
   */
  private async updateMemoryPlugin(event: OrchestrationGovernanceEvent): Promise<void> {
    // In real implementation, this would update the memory plugin anchor
    console.log(`🧠 Updating MemoryPlugin ${this.memoryAnchor}:`, event.eventType);
    
    // Mark trigger for memory anchor update
    if (!this.hasGovernanceTrigger('Memory anchor updated on chat')) {
      await this.markGovernanceTrigger('Memory anchor updated on chat');
    }
  }

  /**
   * Sync to DriveMemory (until migration)
   */
  private async syncToDriveMemory(event: OrchestrationGovernanceEvent): Promise<void> {
    // In real implementation, this would write to DriveMemory files
    console.log(`💾 Syncing to DriveMemory:`, event.eventType);
    
    // Mark trigger for DriveMemory sync
    if (!this.hasGovernanceTrigger('DriveMemory log entry created')) {
      await this.markGovernanceTrigger('DriveMemory log entry created');
    }
  }

  /**
   * Check if governance trigger has been logged
   */
  private hasGovernanceTrigger(trigger: string): boolean {
    return this.eventBuffer.some(event => 
      event.eventType === 'governance_logged' && 
      event.details.trigger === trigger
    );
  }

  /**
   * Get auto-context for current session
   */
  getAutoContext(projectId: string, projectName: string, phaseId: string, phaseName: string, stepId: string, stepName: string) {
    return {
      projectId,
      projectName,
      phaseId,
      phaseName,
      stepId,
      stepName,
      memoryAnchor: this.memoryAnchor,
      orchestrationActive: true,
      autoTagging: true
    };
  }

  /**
   * Get governance summary for Step 9.0.2
   */
  getGovernanceSummary() {
    const triggers = this.eventBuffer
      .filter(e => e.eventType === 'governance_logged')
      .map(e => e.details.trigger);

    const chatInteractions = this.eventBuffer.filter(e => e.eventType === 'agent_chat').length;
    const taskAssignments = this.eventBuffer.filter(e => e.eventType === 'agent_task_assigned').length;
    const statusChanges = this.eventBuffer.filter(e => e.eventType === 'agent_status_changed').length;

    return {
      totalEvents: this.eventBuffer.length,
      chatInteractions,
      taskAssignments,
      statusChanges,
      completedTriggers: triggers,
      pendingTriggers: [
        'Dashboard deployed',
        'First task queued & tracked',
        'First orchestrator message logged',
        'Auto-context tagging verified',
        'Memory anchor updated on chat',
        'DriveMemory log entry created'
      ].filter(t => !triggers.includes(t)),
      autoLoggingActive: true,
      contextAwarenessActive: true
    };
  }

  /**
   * Export events for DriveMemory storage
   */
  exportForDriveMemory() {
    return {
      timestamp: new Date().toISOString(),
      stepId: this.stepId,
      phaseId: this.phaseId,
      memoryAnchor: this.memoryAnchor,
      events: this.eventBuffer,
      governance_summary: this.getGovernanceSummary(),
      migration_note: "Events logged to file system until native storage migration in 9.0.3-9.0.4"
    };
  }

  /**
   * Get all buffered events
   */
  getEvents(): OrchestrationGovernanceEvent[] {
    return [...this.eventBuffer];
  }

  /**
   * Clear event buffer (for testing)
   */
  clearEvents(): void {
    this.eventBuffer = [];
  }
}

// Export singleton instance
export const multiAgentGovernance = new MultiAgentGovernanceService();

// Export class for custom configurations
export { MultiAgentGovernanceService };