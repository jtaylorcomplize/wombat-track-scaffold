import type { Agent, AgentStatus, AgentCapability } from '../../types/agent';
import { GovernanceLogger } from '../../services/governance-logger';

export interface SDLCPhaseStep {
  id: string;
  phase: string;
  step: 'Debug' | 'QA' | 'Governance' | 'Memory';
  status: 'pending' | 'in_progress' | 'completed' | 'blocked' | 'failed';
  branch: string;
  created_at: string;
  updated_at: string;
  metadata: Record<string, unknown>;
  dependencies?: string[];
  ci_status?: 'pending' | 'running' | 'success' | 'failure';
  qa_evidence?: {
    manual_qa_passed: boolean;
    screenshots_attached: boolean;
    test_results: Record<string, unknown>;
    qa_timestamp?: string;
  };
  governance_entry?: {
    log_id: string;
    entry_timestamp: string;
    summary: string;
  };
  memory_anchor?: {
    anchor_id: string;
    anchor_timestamp: string;
    status: 'pending' | 'created' | 'failed';
  };
}

export interface SDLCEvent {
  type: 'branch_created' | 'build_completed' | 'merge_requested' | 'qa_completed' | 'governance_logged';
  branch: string;
  timestamp: string;
  metadata: Record<string, unknown>;
  ci_status?: 'success' | 'failure';
  qa_result?: boolean;
}

export class GizmoAgent implements Agent {
  id = 'gizmo-sdlc-agent';
  name = 'Gizmo SDLC Agent';
  description = 'Enforces SDLC governance and hygiene across development lifecycle';
  icon = '🤖';
  capabilities: AgentCapability[] = ['orchestration', 'monitoring', 'analysis'];
  currentStatus: AgentStatus = 'active';
  version = '1.0.0';
  createdAt = new Date().toISOString();
  lastActiveAt = new Date().toISOString();

  private phaseSteps: Map<string, SDLCPhaseStep> = new Map();
  private governanceLogger: GovernanceLogger;
  private eventListeners: Map<string, ((event: SDLCEvent) => void)[]> = new Map();

  constructor() {
    this.governanceLogger = GovernanceLogger.getInstance();
    this.initializeEventListeners();
  }

  private initializeEventListeners(): void {
    this.addEventListener('branch_created', this.handleBranchCreated.bind(this));
    this.addEventListener('build_completed', this.handleBuildCompleted.bind(this));
    this.addEventListener('merge_requested', this.handleMergeRequested.bind(this));
    this.addEventListener('qa_completed', this.handleQACompleted.bind(this));
  }

  addEventListener(eventType: string, callback: (event: SDLCEvent) => void): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType)!.push(callback);
  }

  removeEventListener(eventType: string, callback: (event: SDLCEvent) => void): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  emit(event: SDLCEvent): void {
    this.lastActiveAt = new Date().toISOString();
    
    const listeners = this.eventListeners.get(event.type) || [];
    listeners.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error(`Error in SDLC event listener for ${event.type}:`, error);
        this.governanceLogger.log({
          event_type: 'gizmo_error',
          user_id: 'system',
          user_role: 'agent',
          resource_type: 'dashboard',
          resource_id: 'gizmo-agent',
          action: 'event_handling',
          success: false,
          details: {
            event_type: event.type,
            error_message: error instanceof Error ? error.message : 'Unknown error',
            branch: event.branch
          }
        });
      }
    });
  }

  private async handleBranchCreated(event: SDLCEvent): Promise<void> {
    const stepId = `${event.branch}_debug`;
    const phaseStep: SDLCPhaseStep = {
      id: stepId,
      phase: 'SDLC_Integration',
      step: 'Debug',
      status: 'in_progress',
      branch: event.branch,
      created_at: event.timestamp,
      updated_at: event.timestamp,
      metadata: event.metadata,
      ci_status: 'pending'
    };

    this.phaseSteps.set(stepId, phaseStep);

    this.governanceLogger.log({
      event_type: 'sdlc_phase_started',
      user_id: event.metadata.user_id as string || 'system',
      user_role: 'developer',
      resource_type: 'dashboard',
      resource_id: event.branch,
      action: 'phase_start',
      success: true,
      details: {
        phase: 'Debug',
        branch: event.branch,
        step_id: stepId
      }
    });

    console.log(`🚀 Gizmo: Debug phase started for branch ${event.branch}`);
  }

  private async handleBuildCompleted(event: SDLCEvent): Promise<void> {
    const debugStepId = `${event.branch}_debug`;
    const debugStep = this.phaseSteps.get(debugStepId);

    if (!debugStep) {
      console.warn(`⚠️ Gizmo: No debug step found for branch ${event.branch}`);
      return;
    }

    debugStep.status = event.ci_status === 'success' ? 'completed' : 'failed';
    debugStep.ci_status = event.ci_status;
    debugStep.updated_at = event.timestamp;

    if (event.ci_status === 'success') {
      // Create QA step
      const qaStepId = `${event.branch}_qa`;
      const qaStep: SDLCPhaseStep = {
        id: qaStepId,
        phase: 'SDLC_Integration',
        step: 'QA',
        status: 'pending',
        branch: event.branch,
        created_at: event.timestamp,
        updated_at: event.timestamp,
        metadata: event.metadata,
        dependencies: [debugStepId]
      };

      this.phaseSteps.set(qaStepId, qaStep);

      this.governanceLogger.log({
        event_type: 'sdlc_build_success',
        user_id: 'system',
        user_role: 'ci',
        resource_type: 'dashboard',
        resource_id: event.branch,
        action: 'build_complete',
        success: true,
        details: {
          branch: event.branch,
          qa_step_created: qaStepId,
          ready_for_qa: true
        }
      });

      console.log(`✅ Gizmo: Build completed for ${event.branch}, QA phase ready`);
    } else {
      this.governanceLogger.log({
        event_type: 'sdlc_build_failure',
        user_id: 'system',
        user_role: 'ci',
        resource_type: 'dashboard',
        resource_id: event.branch,
        action: 'build_failed',
        success: false,
        details: {
          branch: event.branch,
          ci_status: event.ci_status,
          metadata: event.metadata
        }
      });

      console.log(`❌ Gizmo: Build failed for ${event.branch}, blocking progression`);
    }
  }

  private async handleQACompleted(event: SDLCEvent): Promise<void> {
    const qaStepId = `${event.branch}_qa`;
    const qaStep = this.phaseSteps.get(qaStepId);

    if (!qaStep) {
      console.warn(`⚠️ Gizmo: No QA step found for branch ${event.branch}`);
      return;
    }

    qaStep.status = event.qa_result ? 'completed' : 'failed';
    qaStep.updated_at = event.timestamp;
    qaStep.qa_evidence = {
      manual_qa_passed: event.qa_result || false,
      screenshots_attached: !!(event.metadata.screenshots),
      test_results: event.metadata.test_results as Record<string, unknown> || {},
      qa_timestamp: event.timestamp
    };

    if (event.qa_result) {
      // Create Governance step
      const govStepId = `${event.branch}_governance`;
      const govStep: SDLCPhaseStep = {
        id: govStepId,
        phase: 'SDLC_Integration',
        step: 'Governance',
        status: 'pending',
        branch: event.branch,
        created_at: event.timestamp,
        updated_at: event.timestamp,
        metadata: event.metadata,
        dependencies: [qaStepId]
      };

      this.phaseSteps.set(govStepId, govStep);

      this.governanceLogger.log({
        event_type: 'sdlc_qa_success',
        user_id: event.metadata.user_id as string || 'qa_user',
        user_role: 'qa',
        resource_type: 'dashboard',
        resource_id: event.branch,
        action: 'qa_complete',
        success: true,
        details: {
          branch: event.branch,
          qa_evidence: qaStep.qa_evidence,
          governance_step_created: govStepId
        }
      });

      console.log(`✅ Gizmo: QA completed for ${event.branch}, Governance phase ready`);
    } else {
      this.governanceLogger.log({
        event_type: 'sdlc_qa_failure',
        user_id: event.metadata.user_id as string || 'qa_user',
        user_role: 'qa',
        resource_type: 'dashboard',
        resource_id: event.branch,
        action: 'qa_failed',
        success: false,
        details: {
          branch: event.branch,
          qa_evidence: qaStep.qa_evidence
        }
      });

      console.log(`❌ Gizmo: QA failed for ${event.branch}, blocking merge`);
    }
  }

  private async handleMergeRequested(event: SDLCEvent): Promise<void> {
    const canMerge = await this.validateMergeReadiness(event.branch);
    
    if (canMerge.allowed) {
      // Trigger Memory anchor creation
      await this.createMemoryAnchor(event.branch, event.timestamp);
      
      this.governanceLogger.log({
        event_type: 'sdlc_merge_approved',
        user_id: event.metadata.user_id as string || 'system',
        user_role: 'developer',
        resource_type: 'dashboard',
        resource_id: event.branch,
        action: 'merge_approved',
        success: true,
        details: {
          branch: event.branch,
          validation_results: canMerge
        }
      });

      console.log(`✅ Gizmo: Merge approved for ${event.branch}`);
    } else {
      this.governanceLogger.log({
        event_type: 'sdlc_merge_blocked',
        user_id: event.metadata.user_id as string || 'system',
        user_role: 'developer',
        resource_type: 'dashboard',
        resource_id: event.branch,
        action: 'merge_blocked',
        success: false,
        details: {
          branch: event.branch,
          blocking_reasons: canMerge.blocking_reasons,
          validation_results: canMerge
        }
      });

      console.log(`🚫 Gizmo: Merge blocked for ${event.branch}:`, canMerge.blocking_reasons);
    }
  }

  async validateMergeReadiness(branch: string): Promise<{
    allowed: boolean;
    blocking_reasons: string[];
    completed_steps: string[];
    pending_steps: string[];
  }> {
    const branchSteps = Array.from(this.phaseSteps.values())
      .filter(step => step.branch === branch);

    const completedSteps = branchSteps
      .filter(step => step.status === 'completed')
      .map(step => step.step);

    const pendingSteps = branchSteps
      .filter(step => step.status !== 'completed')
      .map(step => step.step);

    const blockingReasons: string[] = [];

    // Check required steps completion
    const requiredSteps = ['Debug', 'QA', 'Governance'];
    for (const required of requiredSteps) {
      if (!completedSteps.includes(required)) {
        blockingReasons.push(`${required} step not completed`);
      }
    }

    // Check QA evidence
    const qaStep = branchSteps.find(step => step.step === 'QA');
    if (qaStep && (!qaStep.qa_evidence?.manual_qa_passed || !qaStep.qa_evidence?.screenshots_attached)) {
      blockingReasons.push('QA evidence incomplete (manual QA or screenshots missing)');
    }

    // Check governance logging
    const govStep = branchSteps.find(step => step.step === 'Governance');
    if (govStep && !govStep.governance_entry) {
      blockingReasons.push('Governance log entry missing');
    }

    return {
      allowed: blockingReasons.length === 0,
      blocking_reasons: blockingReasons,
      completed_steps: completedSteps,
      pending_steps: pendingSteps
    };
  }

  private async createMemoryAnchor(branch: string, timestamp: string): Promise<void> {
    const memoryStepId = `${branch}_memory`;
    const memoryStep: SDLCPhaseStep = {
      id: memoryStepId,
      phase: 'SDLC_Integration',
      step: 'Memory',
      status: 'in_progress',
      branch: branch,
      created_at: timestamp,
      updated_at: timestamp,
      metadata: { trigger: 'post_qa_success' },
      memory_anchor: {
        anchor_id: `anchor_${branch}_${Date.now()}`,
        anchor_timestamp: timestamp,
        status: 'pending'
      }
    };

    this.phaseSteps.set(memoryStepId, memoryStep);

    try {
      // Use MemoryPlugin integration for proper memory anchor creation
      const { memoryPluginIntegration } = await import('../../services/memory-plugin-integration');
      
      const anchorId = await memoryPluginIntegration.createMemoryAnchor(branch, {
        commit_sha: 'merge_trigger',
        triggered_by: 'gizmo_agent',
        timestamp: timestamp
      });

      // Update memory step status
      memoryStep.status = 'completed';
      memoryStep.memory_anchor!.anchor_id = anchorId;
      memoryStep.memory_anchor!.status = 'created';
      memoryStep.updated_at = new Date().toISOString();

      console.log(`🔗 Gizmo: Memory anchor created for ${branch} via MemoryPlugin (${anchorId})`);

    } catch (error) {
      memoryStep.status = 'failed';
      memoryStep.memory_anchor!.status = 'failed';
      
      console.error(`❌ Gizmo: Failed to create memory anchor for ${branch}:`, error);
      
      this.governanceLogger.log({
        event_type: 'sdlc_memory_anchor_failed',
        user_id: 'system',
        user_role: 'agent',
        resource_type: 'dashboard',
        resource_id: branch,
        action: 'memory_anchor_failed',
        success: false,
        details: {
          branch: branch,
          error_message: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  }

  // Public API methods for SDLC management
  getPhaseSteps(branch?: string): SDLCPhaseStep[] {
    const steps = Array.from(this.phaseSteps.values());
    return branch ? steps.filter(step => step.branch === branch) : steps;
  }

  getPhaseStep(stepId: string): SDLCPhaseStep | undefined {
    return this.phaseSteps.get(stepId);
  }

  async updatePhaseStep(stepId: string, updates: Partial<SDLCPhaseStep>): Promise<boolean> {
    const step = this.phaseSteps.get(stepId);
    if (!step) return false;

    Object.assign(step, updates, { updated_at: new Date().toISOString() });
    this.phaseSteps.set(stepId, step);

    this.governanceLogger.log({
      event_type: 'sdlc_step_updated',
      user_id: 'system',
      user_role: 'agent',
      resource_type: 'dashboard',
      resource_id: step.branch,
      action: 'step_update',
      success: true,
      details: {
        step_id: stepId,
        updates: updates
      }
    });

    return true;
  }

  getSDLCStatus(): {
    agent_status: AgentStatus;
    active_branches: number;
    completed_workflows: number;
    blocked_workflows: number;
    last_activity: string;
  } {
    const allSteps = Array.from(this.phaseSteps.values());
    const activeBranches = new Set(allSteps.map(step => step.branch)).size;
    const completedWorkflows = new Set(
      allSteps
        .filter(step => step.step === 'Memory' && step.status === 'completed')
        .map(step => step.branch)
    ).size;
    const blockedWorkflows = new Set(
      allSteps
        .filter(step => step.status === 'failed' || step.status === 'blocked')
        .map(step => step.branch)
    ).size;

    return {
      agent_status: this.currentStatus,
      active_branches: activeBranches,
      completed_workflows: completedWorkflows,
      blocked_workflows: blockedWorkflows,
      last_activity: this.lastActiveAt
    };
  }

  // Cleanup method
  cleanup(): void {
    this.eventListeners.clear();
    this.phaseSteps.clear();
    this.currentStatus = 'offline';
    console.log('🤖 Gizmo Agent cleaned up');
  }
}

// Singleton instance
let gizmoInstance: GizmoAgent | null = null;

export function getGizmoAgent(): GizmoAgent {
  if (!gizmoInstance) {
    gizmoInstance = new GizmoAgent();
  }
  return gizmoInstance;
}

export function resetGizmoAgent(): void {
  if (gizmoInstance) {
    gizmoInstance.cleanup();
    gizmoInstance = null;
  }
}