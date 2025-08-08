/**
 * Cloud IDE Governance Service
 * Handles logging of IDE events for Phase 9.0.1 governance tracking
 */

export interface IDEGovernanceEvent {
  timestamp: string;
  phaseId: string;
  stepId: string;
  eventType: 'ide_initialized' | 'branch_created' | 'branch_switch' | 'file_edited' | 'terminal_command' | 'pr_created' | 'governance_logged';
  project?: string;
  phase?: string;
  step?: string;
  details: any;
  memoryAnchor: string;
  userId?: string;
  gitBranch?: string;
}

export interface IDEGovernanceConfig {
  memoryAnchor: string;
  phaseId: string;
  stepId: string;
  driveMemoryPath: string;
  governanceLogPath: string;
  enableConsoleLogging: boolean;
  enableFileLogging: boolean;
}

class CloudIDEGovernanceService {
  private config: IDEGovernanceConfig;
  private eventBuffer: IDEGovernanceEvent[] = [];

  constructor(config?: Partial<IDEGovernanceConfig>) {
    this.config = {
      memoryAnchor: 'of-9.0-init-20250806',
      phaseId: 'OF-9.0',
      stepId: '9.0.1',
      driveMemoryPath: '/DriveMemory/OF-9.0/',
      governanceLogPath: '/DriveMemory/OF-9.0/Phase_9.0_Governance.jsonl',
      enableConsoleLogging: true,
      enableFileLogging: true,
      ...config
    };
  }

  /**
   * Log an IDE governance event
   */
  async logEvent(eventType: IDEGovernanceEvent['eventType'], details: any, additionalContext?: Partial<IDEGovernanceEvent>): Promise<void> {
    const event: IDEGovernanceEvent = {
      timestamp: new Date().toISOString(),
      phaseId: this.config.phaseId,
      stepId: this.config.stepId,
      eventType,
      details,
      memoryAnchor: this.config.memoryAnchor,
      userId: 'system', // In real implementation, get from auth context
      ...additionalContext
    };

    // Add to buffer
    this.eventBuffer.push(event);

    // Console logging for development
    if (this.config.enableConsoleLogging) {
      console.log('📝 Cloud IDE Governance Event:', event);
    }

    // File logging (simulated - in real implementation would POST to API)
    if (this.config.enableFileLogging) {
      await this.writeEventToFile(event);
    }

    // Trigger memory plugin update
    await this.updateMemoryPlugin(event);
  }

  /**
   * Log IDE initialization
   */
  async logIDEInitialization(projectName?: string, phaseName?: string, stepName?: string): Promise<void> {
    await this.logEvent('ide_initialized', {
      operation: 'Cloud IDE Initialization',
      status: 'IDE provisioned successfully',
      features: ['GitHub integration', 'Terminal access', 'File editing', 'Branch management'],
      governance_integration: 'active'
    }, {
      project: projectName,
      phase: phaseName,
      step: stepName
    });

    // Mark governance trigger
    await this.markGovernanceTrigger('IDE provisioned');
  }

  /**
   * Log branch creation
   */
  async logBranchCreated(branchName: string, fromBranch?: string): Promise<void> {
    await this.logEvent('branch_created', {
      operation: 'Git Branch Creation',
      branch: branchName,
      from_branch: fromBranch || 'main',
      ephemeral: true,
      governance_tracked: true
    }, {
      gitBranch: branchName
    });

    // Mark governance trigger for first ephemeral branch
    if (!this.hasGovernanceTrigger('First ephemeral branch created')) {
      await this.markGovernanceTrigger('First ephemeral branch created');
    }
  }

  /**
   * Log PR creation
   */
  async logPRCreated(title: string, branch: string, targetBranch: string = 'main'): Promise<void> {
    await this.logEvent('pr_created', {
      operation: 'GitHub Pull Request Creation',
      title,
      source_branch: branch,
      target_branch: targetBranch,
      ci_cd_triggered: true,
      governance_linked: true
    }, {
      gitBranch: branch
    });

    // Mark governance triggers
    await this.markGovernanceTrigger('First PR opened');
    await this.markGovernanceTrigger('CI/CD workflow triggered successfully');
  }

  /**
   * Log file editing
   */
  async logFileEdited(filePath: string, branch: string): Promise<void> {
    await this.logEvent('file_edited', {
      operation: 'File Edit',
      file_path: filePath,
      branch,
      governance_tracked: true
    }, {
      gitBranch: branch
    });

    // Mark governance trigger for first commit
    if (!this.hasGovernanceTrigger('First branch commit logged')) {
      await this.markGovernanceTrigger('First branch commit logged');
    }
  }

  /**
   * Log terminal command execution
   */
  async logTerminalCommand(command: string, branch: string): Promise<void> {
    await this.logEvent('terminal_command', {
      operation: 'Terminal Command Execution',
      command,
      branch,
      governance_tracked: true
    }, {
      gitBranch: branch
    });
  }

  /**
   * Mark a governance trigger as completed
   */
  private async markGovernanceTrigger(trigger: string): Promise<void> {
    await this.logEvent('governance_logged', {
      operation: 'Governance Trigger',
      trigger,
      step: this.config.stepId,
      memory_anchor_updated: true
    });

    console.log(`✅ Governance Trigger: ${trigger}`);
  }

  /**
   * Check if a governance trigger has been logged
   */
  private hasGovernanceTrigger(trigger: string): boolean {
    return this.eventBuffer.some(event => 
      event.eventType === 'governance_logged' && 
      event.details.trigger === trigger
    );
  }

  /**
   * Write event to file (simulated)
   */
  private async writeEventToFile(event: IDEGovernanceEvent): Promise<void> {
    // In real implementation, this would POST to an API endpoint
    // that appends to the governance JSONL file
    console.log(`📁 Writing to ${this.config.governanceLogPath}:`, JSON.stringify(event));
  }

  /**
   * Update memory plugin anchor
   */
  private async updateMemoryPlugin(event: IDEGovernanceEvent): Promise<void> {
    // In real implementation, this would update the memory plugin anchor
    // with the latest event information
    console.log(`🧠 Updating MemoryPlugin anchor ${this.config.memoryAnchor} with event:`, event.eventType);
  }

  /**
   * Get buffered events
   */
  getEvents(): IDEGovernanceEvent[] {
    return [...this.eventBuffer];
  }

  /**
   * Get governance summary for Step 9.0.1
   */
  getGovernanceSummary() {
    const triggers = this.eventBuffer
      .filter(e => e.eventType === 'governance_logged')
      .map(e => e.details.trigger);

    return {
      totalEvents: this.eventBuffer.length,
      completedTriggers: triggers,
      pendingTriggers: [
        'IDE provisioned',
        'First ephemeral branch created',
        'First PR opened',
        'CI/CD workflow triggered successfully',
        'First branch commit logged',
        'MemoryPlugin anchor updated'
      ].filter(t => !triggers.includes(t))
    };
  }

  /**
   * Export events for DriveMemory storage
   */
  exportForDriveMemory() {
    return {
      timestamp: new Date().toISOString(),
      stepId: this.config.stepId,
      phaseId: this.config.phaseId,
      memoryAnchor: this.config.memoryAnchor,
      events: this.eventBuffer,
      governance_summary: this.getGovernanceSummary()
    };
  }
}

// Export singleton instance
export const cloudIDEGovernance = new CloudIDEGovernanceService();

// Export class for custom configurations
export { CloudIDEGovernanceService };