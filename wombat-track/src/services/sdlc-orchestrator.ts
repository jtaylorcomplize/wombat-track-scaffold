import { getGizmoAgent, SDLCEvent } from '../server/agents/gizmo';
import { GovernanceLogger } from './governance-logger';
import { authorityService } from './authority-service';

export interface GitHookEvent {
  event_type: 'push' | 'pull_request' | 'branch_created' | 'branch_deleted';
  repository: string;
  branch: string;
  commit_sha?: string;
  commit_message?: string;
  author: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface CICDEvent {
  event_type: 'build_started' | 'build_completed' | 'deployment_started' | 'deployment_completed';
  branch: string;
  build_id: string;
  status: 'pending' | 'running' | 'success' | 'failure' | 'cancelled';
  timestamp: string;
  duration_ms?: number;
  metadata?: Record<string, unknown>;
}

export class SDLCOrchestrator {
  private static instance: SDLCOrchestrator;
  private gizmoAgent = getGizmoAgent();
  private governanceLogger = GovernanceLogger.getInstance();
  private isActive = true;

  private constructor() {
    this.setupEventListeners();
  }

  static getInstance(): SDLCOrchestrator {
    if (!SDLCOrchestrator.instance) {
      SDLCOrchestrator.instance = new SDLCOrchestrator();
    }
    return SDLCOrchestrator.instance;
  }

  private setupEventListeners(): void {
    // Set up webhook listeners or polling mechanisms
    // In a real implementation, this would integrate with GitHub webhooks, CI/CD systems, etc.
    console.log('🔧 SDLC Orchestrator: Setting up event listeners');
  }

  // GitHub/Git Integration
  async handleGitHookEvent(event: GitHookEvent): Promise<void> {
    if (!this.isActive) return;

    try {
      this.governanceLogger.log({
        event_type: 'git_hook_received',
        user_id: event.author,
        user_role: 'developer',
        resource_type: 'dashboard',
        resource_id: event.branch,
        action: event.event_type,
        success: true,
        details: {
          repository: event.repository,
          branch: event.branch,
          commit_sha: event.commit_sha,
          event_type: event.event_type
        }
      });

      switch (event.event_type) {
        case 'branch_created':
          await this.handleBranchCreated(event);
          break;
        case 'push':
          await this.handlePushEvent(event);
          break;
        case 'pull_request':
          await this.handlePullRequestEvent(event);
          break;
        default:
          console.log(`📝 SDLC Orchestrator: Unhandled git event type: ${event.event_type}`);
      }
    } catch (error) {
      console.error('❌ SDLC Orchestrator: Error handling git hook event:', error);
      this.governanceLogger.log({
        event_type: 'sdlc_orchestrator_error',
        user_id: 'system',
        user_role: 'system',
        resource_type: 'dashboard',
        resource_id: event.branch,
        action: 'git_hook_error',
        success: false,
        details: {
          error_message: error instanceof Error ? error.message : 'Unknown error',
          event: event
        }
      });
    }
  }

  private async handleBranchCreated(event: GitHookEvent): Promise<void> {
    // Only trigger SDLC for feature branches
    if (!event.branch.startsWith('feature/') && !event.branch.startsWith('hotfix/')) {
      console.log(`⏭️ SDLC Orchestrator: Skipping non-feature branch: ${event.branch}`);
      return;
    }

    // Use authority service for autonomous branch creation handling
    const result = await authorityService.executeAutonomousAction(
      'create_branches',
      {
        agent: 'gizmo',
        branch: event.branch,
        user_id: event.author,
        risk_level: 'low',
        description: `Branch created: ${event.branch} by ${event.author}`
      },
      async () => {
        const sdlcEvent: SDLCEvent = {
          type: 'branch_created',
          branch: event.branch,
          timestamp: event.timestamp,
          metadata: {
            repository: event.repository,
            author: event.author,
            commit_sha: event.commit_sha,
            trigger: 'git_hook',
            autonomous: true
          }
        };

        this.gizmoAgent.emit(sdlcEvent);
        return sdlcEvent;
      }
    );

    if (result.success) {
      console.log(`🤖 SDLC Orchestrator: Branch created event autonomously processed for ${event.branch}`);
    } else {
      console.log(`🚫 SDLC Orchestrator: Branch creation requires manual approval - ${result.error}`);
    }
  }

  private async handlePushEvent(event: GitHookEvent): Promise<void> {
    // Trigger CI build for feature branches
    if (event.branch.startsWith('feature/') || event.branch.startsWith('hotfix/')) {
      await this.triggerCIBuild(event.branch, event.commit_sha || 'unknown', event.author);
    }
  }

  private async handlePullRequestEvent(event: GitHookEvent): Promise<void> {
    const sdlcEvent: SDLCEvent = {
      type: 'merge_requested',
      branch: event.branch,
      timestamp: event.timestamp,
      metadata: {
        repository: event.repository,
        author: event.author,
        commit_sha: event.commit_sha,
        trigger: 'pull_request'
      }
    };

    this.gizmoAgent.emit(sdlcEvent);
    console.log(`🔀 SDLC Orchestrator: Merge request event emitted for ${event.branch}`);
  }

  // CI/CD Integration
  async handleCICDEvent(event: CICDEvent): Promise<void> {
    if (!this.isActive) return;

    try {
      this.governanceLogger.log({
        event_type: 'cicd_event_received',
        user_id: 'system',
        user_role: 'ci',
        resource_type: 'dashboard',
        resource_id: event.branch,
        action: event.event_type,
        success: event.status === 'success',
        details: {
          build_id: event.build_id,
          status: event.status,
          duration_ms: event.duration_ms,
          event_type: event.event_type
        }
      });

      switch (event.event_type) {
        case 'build_completed':
          await this.handleBuildCompleted(event);
          break;
        case 'deployment_completed':
          await this.handleDeploymentCompleted(event);
          break;
        default:
          console.log(`📝 SDLC Orchestrator: Unhandled CI/CD event type: ${event.event_type}`);
      }
    } catch (error) {
      console.error('❌ SDLC Orchestrator: Error handling CI/CD event:', error);
      this.governanceLogger.log({
        event_type: 'sdlc_orchestrator_error',
        user_id: 'system',
        user_role: 'system',
        resource_type: 'dashboard',
        resource_id: event.branch,
        action: 'cicd_event_error',
        success: false,
        details: {
          error_message: error instanceof Error ? error.message : 'Unknown error',
          event: event
        }
      });
    }
  }

  private async handleBuildCompleted(event: CICDEvent): Promise<void> {
    const sdlcEvent: SDLCEvent = {
      type: 'build_completed',
      branch: event.branch,
      timestamp: event.timestamp,
      metadata: {
        build_id: event.build_id,
        duration_ms: event.duration_ms,
        trigger: 'ci_system',
        ...event.metadata
      },
      ci_status: event.status
    };

    this.gizmoAgent.emit(sdlcEvent);
    console.log(`🏗️ SDLC Orchestrator: Build completed event emitted for ${event.branch} (${event.status})`);
  }

  private async handleDeploymentCompleted(event: CICDEvent): Promise<void> {
    // Log deployment completion for tracking
    this.governanceLogger.log({
      event_type: 'deployment_completed',
      user_id: 'system',
      user_role: 'deployment',
      resource_type: 'dashboard',
      resource_id: event.branch,
      action: 'deploy',
      success: event.status === 'success',
      details: {
        build_id: event.build_id,
        status: event.status,
        duration_ms: event.duration_ms
      }
    });
  }

  // Manual QA Integration
  async submitQAResults(branch: string, qaResult: {
    passed: boolean;
    tester: string;
    notes: string;
    screenshots?: string[];
    test_results?: Record<string, unknown>;
  }): Promise<void> {
    try {
      const sdlcEvent: SDLCEvent = {
        type: 'qa_completed',
        branch: branch,
        timestamp: new Date().toISOString(),
        metadata: {
          tester: qaResult.tester,
          notes: qaResult.notes,
          screenshots: qaResult.screenshots,
          test_results: qaResult.test_results,
          trigger: 'manual_qa'
        },
        qa_result: qaResult.passed
      };

      this.gizmoAgent.emit(sdlcEvent);

      this.governanceLogger.log({
        event_type: 'manual_qa_submitted',
        user_id: qaResult.tester,
        user_role: 'qa',
        resource_type: 'dashboard',
        resource_id: branch,
        action: 'qa_complete',
        success: qaResult.passed,
        details: {
          qa_result: qaResult.passed,
          notes: qaResult.notes,
          screenshots_count: qaResult.screenshots?.length || 0,
          test_results: qaResult.test_results
        }
      });

      console.log(`✅ SDLC Orchestrator: QA results submitted for ${branch} (${qaResult.passed ? 'PASSED' : 'FAILED'})`);
    } catch (error) {
      console.error('❌ SDLC Orchestrator: Error submitting QA results:', error);
      throw error;
    }
  }

  // Utility methods for external integration
  async triggerCIBuild(branch: string, commitSha: string, triggeredBy: string): Promise<void> {
    try {
      // In a real implementation, this would trigger the actual CI system
      console.log(`🚀 SDLC Orchestrator: Triggering CI build for ${branch} (${commitSha})`);
      
      // Simulate CI build trigger
      const buildEvent: CICDEvent = {
        event_type: 'build_started',
        branch: branch,
        build_id: `build_${branch}_${Date.now()}`,
        status: 'pending',
        timestamp: new Date().toISOString(),
        metadata: {
          commit_sha: commitSha,
          triggered_by: triggeredBy,
          trigger_type: 'auto'
        }
      };

      // Emit the build started event
      await this.handleCICDEvent(buildEvent);
      
      // Simulate build completion after a delay
      setTimeout(async () => {
        const completionEvent: CICDEvent = {
          ...buildEvent,
          event_type: 'build_completed',
          status: Math.random() > 0.2 ? 'success' : 'failure', // 80% success rate
          timestamp: new Date().toISOString(),
          duration_ms: Math.floor(Math.random() * 300000) + 60000 // 1-5 minutes
        };
        
        await this.handleCICDEvent(completionEvent);
      }, 5000); // 5 second delay for simulation

    } catch (error) {
      console.error('❌ SDLC Orchestrator: Error triggering CI build:', error);
      throw error;
    }
  }

  async getMergeBlockingReasons(branch: string): Promise<string[]> {
    const validation = await this.gizmoAgent.validateMergeReadiness(branch);
    return validation.blocking_reasons;
  }

  async isMergeAllowed(branch: string): Promise<boolean> {
    const validation = await this.gizmoAgent.validateMergeReadiness(branch);
    return validation.allowed;
  }

  // Configuration and control
  setActive(active: boolean): void {
    this.isActive = active;
    console.log(`🔧 SDLC Orchestrator: ${active ? 'Activated' : 'Deactivated'}`);
  }

  getStatus(): {
    active: boolean;
    gizmo_status: any;
    orchestrator_uptime: number;
  } {
    return {
      active: this.isActive,
      gizmo_status: this.gizmoAgent.getSDLCStatus(),
      orchestrator_uptime: Date.now() // Simplified uptime
    };
  }

  // Webhook endpoints for external integration
  async processWebhook(source: 'github' | 'gitlab' | 'jenkins' | 'custom', payload: any): Promise<void> {
    try {
      console.log(`🔗 SDLC Orchestrator: Processing ${source} webhook`);
      
      switch (source) {
        case 'github':
          await this.processGitHubWebhook(payload);
          break;
        case 'gitlab':
          await this.processGitLabWebhook(payload);
          break;
        case 'jenkins':
          await this.processJenkinsWebhook(payload);
          break;
        default:
          console.log(`⚠️ SDLC Orchestrator: Unsupported webhook source: ${source}`);
      }
    } catch (error) {
      console.error(`❌ SDLC Orchestrator: Error processing ${source} webhook:`, error);
      throw error;
    }
  }

  private async processGitHubWebhook(payload: any): Promise<void> {
    if (payload.ref && payload.ref.startsWith('refs/heads/')) {
      const branch = payload.ref.replace('refs/heads/', '');
      
      const gitEvent: GitHookEvent = {
        event_type: payload.created ? 'branch_created' : 'push',
        repository: payload.repository?.full_name || 'unknown',
        branch: branch,
        commit_sha: payload.after,
        commit_message: payload.head_commit?.message,
        author: payload.head_commit?.author?.name || payload.pusher?.name || 'unknown',
        timestamp: new Date().toISOString(),
        metadata: {
          github_event: payload.action || 'push',
          repository_url: payload.repository?.html_url
        }
      };

      await this.handleGitHookEvent(gitEvent);
    }
  }

  private async processGitLabWebhook(payload: any): Promise<void> {
    // GitLab webhook processing logic
    console.log('🦊 Processing GitLab webhook:', payload.object_kind);
  }

  private async processJenkinsWebhook(payload: any): Promise<void> {
    // Jenkins webhook processing logic
    console.log('🏗️ Processing Jenkins webhook:', payload.build?.phase);
  }
}

// Export singleton instance
export const sdlcOrchestrator = SDLCOrchestrator.getInstance();