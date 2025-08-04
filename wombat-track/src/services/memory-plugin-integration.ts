import { getGizmoAgent, SDLCPhaseStep } from '../server/agents/gizmo.ts';
import { GovernanceLogger } from './governance-logger.ts';

export interface MemoryAnchorPayload {
  branch: string;
  timestamp: string;
  sdlc_validation: {
    debug_completed: boolean;
    qa_completed: boolean;
    governance_completed: boolean;
    merge_ready: boolean;
  };
  phase_steps: SDLCPhaseStep[];
  governance_summary: string;
  qa_evidence: {
    manual_qa_passed: boolean;
    screenshots_attached: boolean;
    test_results: Record<string, unknown>;
  };
  commit_info: {
    sha: string;
    message: string;
    author: string;
  };
  metadata: Record<string, unknown>;
}

export class MemoryPluginIntegration {
  private static instance: MemoryPluginIntegration;
  private gizmoAgent = getGizmoAgent();
  private governanceLogger = GovernanceLogger.getInstance();
  private memoryAnchors: Map<string, MemoryAnchorPayload> = new Map();

  private constructor() {
    this.setupQACompletionListener();
  }

  static getInstance(): MemoryPluginIntegration {
    if (!MemoryPluginIntegration.instance) {
      MemoryPluginIntegration.instance = new MemoryPluginIntegration();
    }
    return MemoryPluginIntegration.instance;
  }

  private setupQACompletionListener(): void {
    // Listen for QA completion events from Gizmo agent
    this.gizmoAgent.addEventListener('qa_completed', this.handleQACompleted.bind(this));
    console.log('🔗 MemoryPlugin integration: QA completion listener setup');
  }

  private async handleQACompleted(event: any): Promise<void> {
    try {
      const { branch, qa_result, metadata } = event;
      
      if (!qa_result) {
        console.log(`⏭️ MemoryPlugin: Skipping memory anchor for failed QA on ${branch}`);
        return;
      }

      console.log(`🔗 MemoryPlugin: QA passed for ${branch}, checking readiness for memory anchor`);
      
      // Validate that all SDLC steps are completed before creating memory anchor
      const validation = await this.gizmoAgent.validateMergeReadiness(branch);
      
      if (!validation.allowed) {
        console.log(`⚠️ MemoryPlugin: Branch ${branch} not ready for memory anchor:`, validation.blocking_reasons);
        return;
      }

      // Create memory anchor only after successful QA and full SDLC validation
      await this.createMemoryAnchor(branch, metadata);
      
    } catch (error) {
      console.error('❌ MemoryPlugin: Error handling QA completion:', error);
      this.governanceLogger.log({
        event_type: 'memory_plugin_error',
        user_id: 'system',
        user_role: 'system',
        resource_type: 'dashboard',
        resource_id: event.branch || 'unknown',
        action: 'qa_completion_handler',
        success: false,
        details: {
          error_message: error instanceof Error ? error.message : 'Unknown error',
          event: event
        }
      });
    }
  }

  async createMemoryAnchor(branch: string, metadata: Record<string, unknown> = {}): Promise<string> {
    try {
      const timestamp = new Date().toISOString();
      const anchorId = `memory_anchor_${branch}_${Date.now()}`;

      // Gather all SDLC data for the memory anchor
      const phaseSteps = this.gizmoAgent.getPhaseSteps(branch);
      const validation = await this.gizmoAgent.validateMergeReadiness(branch);

      // Extract QA evidence
      const qaStep = phaseSteps.find(step => step.step === 'QA');
      const qaEvidence = qaStep?.qa_evidence || {
        manual_qa_passed: false,
        screenshots_attached: false,
        test_results: {}
      };

      // Extract governance summary
      const govStep = phaseSteps.find(step => step.step === 'Governance');
      const governanceSummary = govStep?.governance_entry?.summary || 'No governance summary available';

      // Create comprehensive memory anchor payload
      const anchorPayload: MemoryAnchorPayload = {
        branch: branch,
        timestamp: timestamp,
        sdlc_validation: {
          debug_completed: phaseSteps.some(s => s.step === 'Debug' && s.status === 'completed'),
          qa_completed: phaseSteps.some(s => s.step === 'QA' && s.status === 'completed'),
          governance_completed: phaseSteps.some(s => s.step === 'Governance' && s.status === 'completed'),
          merge_ready: validation.allowed
        },
        phase_steps: phaseSteps,
        governance_summary: governanceSummary,
        qa_evidence: qaEvidence,
        commit_info: {
          sha: metadata.commit_sha as string || 'unknown',
          message: metadata.commit_message as string || 'No commit message',
          author: metadata.author as string || 'unknown'
        },
        metadata: {
          trigger: 'post_qa_success',
          anchor_id: anchorId,
          ...metadata
        }
      };

      // Store memory anchor
      this.memoryAnchors.set(anchorId, anchorPayload);

      // In a real implementation, this would integrate with the actual MemoryPlugin
      await this.persistMemoryAnchor(anchorId, anchorPayload);

      // Update the memory step in Gizmo
      const memoryStepId = `${branch}_memory`;
      await this.gizmoAgent.updatePhaseStep(memoryStepId, {
        status: 'completed',
        memory_anchor: {
          anchor_id: anchorId,
          anchor_timestamp: timestamp,
          status: 'created'
        }
      });

      // Log the memory anchor creation
      this.governanceLogger.logSDLCMemoryAnchor(branch, anchorId, 'created', {
        anchor_payload: anchorPayload,
        sdlc_validation: validation
      });

      console.log(`✅ MemoryPlugin: Memory anchor created for ${branch} (${anchorId})`);
      return anchorId;

    } catch (error) {
      console.error(`❌ MemoryPlugin: Failed to create memory anchor for ${branch}:`, error);
      
      this.governanceLogger.logSDLCMemoryAnchor(branch, 'failed_anchor', 'failed', {
        error_message: error instanceof Error ? error.message : 'Unknown error',
        metadata: metadata
      });
      
      throw error;
    }
  }

  private async persistMemoryAnchor(anchorId: string, payload: MemoryAnchorPayload): Promise<void> {
    // Simulate memory anchor persistence
    // In a real implementation, this would:
    // 1. Serialize the anchor payload
    // 2. Store it in the DriveMemory system
    // 3. Create appropriate directory structure
    // 4. Generate metadata files
    // 5. Update memory indices
    
    try {
      console.log(`💾 MemoryPlugin: Persisting memory anchor ${anchorId}`);
      
      // Simulate async persistence operation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Create memory anchor directory structure
      const memoryPath = `/DriveMemory/anchors/${payload.branch}/${anchorId}`;
      
      // Log successful persistence
      console.log(`✅ MemoryPlugin: Memory anchor persisted at ${memoryPath}`);
      
    } catch (error) {
      console.error(`❌ MemoryPlugin: Failed to persist memory anchor ${anchorId}:`, error);
      throw error;
    }
  }

  async getMemoryAnchor(anchorId: string): Promise<MemoryAnchorPayload | null> {
    return this.memoryAnchors.get(anchorId) || null;
  }

  async getMemoryAnchorsForBranch(branch: string): Promise<MemoryAnchorPayload[]> {
    return Array.from(this.memoryAnchors.values())
      .filter(anchor => anchor.branch === branch);
  }

  async validateMemoryAnchorTrigger(branch: string): Promise<{
    should_trigger: boolean;
    blocking_reasons: string[];
    validation_details: {
      qa_completed: boolean;
      qa_evidence_complete: boolean;
      governance_logged: boolean;
      merge_ready: boolean;
    };
  }> {
    try {
      const phaseSteps = this.gizmoAgent.getPhaseSteps(branch);
      const validation = await this.gizmoAgent.validateMergeReadiness(branch);

      const qaStep = phaseSteps.find(step => step.step === 'QA');
      const govStep = phaseSteps.find(step => step.step === 'Governance');

      const validationDetails = {
        qa_completed: qaStep?.status === 'completed',
        qa_evidence_complete: !!(qaStep?.qa_evidence?.manual_qa_passed && qaStep?.qa_evidence?.screenshots_attached),
        governance_logged: !!(govStep?.status === 'completed' && govStep?.governance_entry),
        merge_ready: validation.allowed
      };

      const blockingReasons: string[] = [];
      
      if (!validationDetails.qa_completed) {
        blockingReasons.push('QA step not completed');
      }
      
      if (!validationDetails.qa_evidence_complete) {
        blockingReasons.push('QA evidence incomplete (missing manual QA pass or screenshots)');
      }
      
      if (!validationDetails.governance_logged) {
        blockingReasons.push('Governance entry not logged');
      }
      
      if (!validationDetails.merge_ready) {
        blockingReasons.push(...validation.blocking_reasons);
      }

      return {
        should_trigger: blockingReasons.length === 0,
        blocking_reasons: blockingReasons,
        validation_details: validationDetails
      };

    } catch (error) {
      console.error(`❌ MemoryPlugin: Error validating memory anchor trigger for ${branch}:`, error);
      return {
        should_trigger: false,
        blocking_reasons: ['Validation error occurred'],
        validation_details: {
          qa_completed: false,
          qa_evidence_complete: false,
          governance_logged: false,
          merge_ready: false
        }
      };
    }
  }

  // Manual trigger for testing or emergency situations
  async manuallyTriggerMemoryAnchor(branch: string, force: boolean = false): Promise<string> {
    try {
      if (!force) {
        const validation = await this.validateMemoryAnchorTrigger(branch);
        if (!validation.should_trigger) {
          throw new Error(`Cannot create memory anchor: ${validation.blocking_reasons.join(', ')}`);
        }
      }

      return await this.createMemoryAnchor(branch, {
        trigger: 'manual',
        forced: force,
        triggered_by: 'admin_user',
        triggered_at: new Date().toISOString()
      });

    } catch (error) {
      console.error(`❌ MemoryPlugin: Manual trigger failed for ${branch}:`, error);
      throw error;
    }
  }

  getMemoryAnchorStats(): {
    total_anchors: number;
    anchors_by_branch: Record<string, number>;
    recent_anchors: Array<{
      id: string;
      branch: string;
      timestamp: string;
      trigger: string;
    }>;
  } {
    const anchors = Array.from(this.memoryAnchors.values());
    
    const anchorsByBranch: Record<string, number> = {};
    anchors.forEach(anchor => {
      anchorsByBranch[anchor.branch] = (anchorsByBranch[anchor.branch] || 0) + 1;
    });

    const recentAnchors = anchors
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10)
      .map(anchor => ({
        id: anchor.metadata.anchor_id as string,
        branch: anchor.branch,
        timestamp: anchor.timestamp,
        trigger: anchor.metadata.trigger as string
      }));

    return {
      total_anchors: anchors.length,
      anchors_by_branch: anchorsByBranch,
      recent_anchors: recentAnchors
    };
  }
}

// Export singleton instance
export const memoryPluginIntegration = MemoryPluginIntegration.getInstance();