/**
 * Authority Service - CC/Gizmo Authority Delegation Protocol
 * Enables autonomous operations without terminal approval while maintaining governance
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { GovernanceLogger } from './governance-logger';

export interface AuthorityConfig {
  claude_code_authority: {
    create_branches: boolean;
    push_to_github: boolean;
    create_governance_logs: boolean;
    create_memory_anchors: boolean;
    trigger_import_endpoints: boolean;
    activate_agents: boolean;
  };
  limits: {
    main_merge_requires_qa: boolean;
    main_merge_requires_governance: boolean;
    no_delete_without_approval: boolean;
  };
  last_updated: string;
}

export interface AuthorityCheckResult {
  authorized: boolean;
  reason?: string;
  requires_governance: boolean;
  requires_memory_anchor: boolean;
}

export interface AutonomousActionLog {
  action_id: string;
  action_type: string;
  timestamp: string;
  agent: 'claude' | 'gizmo';
  authorized: boolean;
  governance_logged: boolean;
  memory_anchored: boolean;
  result: 'success' | 'failure' | 'pending';
  details: Record<string, unknown>;
}

export class AuthorityService {
  private static instance: AuthorityService;
  private config: AuthorityConfig | null = null;
  private governanceLogger = GovernanceLogger.getInstance();
  private actionLog: AutonomousActionLog[] = [];

  private constructor() {
    this.loadConfig();
  }

  static getInstance(): AuthorityService {
    if (!AuthorityService.instance) {
      AuthorityService.instance = new AuthorityService();
    }
    return AuthorityService.instance;
  }

  private loadConfig(): void {
    try {
      const configPath = join(process.cwd(), 'config', 'developer_authority.json');
      const configData = readFileSync(configPath, 'utf-8');
      this.config = JSON.parse(configData);
      console.log('✅ Authority Service: Configuration loaded successfully');
    } catch {
      console.warn('⚠️ Authority Service: Could not load authority config, defaulting to manual approval mode');
      this.config = null;
    }
  }

  /**
   * Check if action is authorized for autonomous execution
   */
  checkAuthority(
    actionType: 'create_branches' | 'push_to_github' | 'create_governance_logs' | 
               'create_memory_anchors' | 'trigger_import_endpoints' | 'activate_agents',
    context: {
      agent: 'claude' | 'gizmo';
      branch?: string;
      user_id?: string;
      risk_level?: 'low' | 'medium' | 'high';
    }
  ): AuthorityCheckResult {
    if (!this.config) {
      return {
        authorized: false,
        reason: 'Authority configuration not available - manual approval required',
        requires_governance: true,
        requires_memory_anchor: true
      };
    }

    // Check if action is enabled
    if (!this.config.claude_code_authority[actionType]) {
      return {
        authorized: false,
        reason: `Action '${actionType}' not authorized in configuration`,
        requires_governance: true,
        requires_memory_anchor: true
      };
    }

    // Apply limits
    if (actionType === 'push_to_github' && context.branch === 'main') {
      if (this.config.limits.main_merge_requires_qa) {
        return {
          authorized: false,
          reason: 'Main branch merge requires QA approval',
          requires_governance: true,
          requires_memory_anchor: true
        };
      }
    }

    // High risk actions still require governance even if authorized
    const requiresGovernance = context.risk_level === 'high' || 
                              actionType === 'push_to_github' ||
                              actionType === 'create_memory_anchors';

    const requiresMemoryAnchor = actionType === 'create_branches' ||
                               actionType === 'trigger_import_endpoints' ||
                               actionType === 'activate_agents';

    return {
      authorized: true,
      requires_governance: requiresGovernance,
      requires_memory_anchor: requiresMemoryAnchor
    };
  }

  /**
   * Execute autonomous action with authority checking
   */
  async executeAutonomousAction<T>(
    actionType: 'create_branches' | 'push_to_github' | 'create_governance_logs' | 
               'create_memory_anchors' | 'trigger_import_endpoints' | 'activate_agents',
    context: {
      agent: 'claude' | 'gizmo';
      branch?: string;
      user_id?: string;
      risk_level?: 'low' | 'medium' | 'high';
      description: string;
    },
    executeFunction: () => Promise<T>
  ): Promise<{
    success: boolean;
    result?: T;
    action_id: string;
    authority_check: AuthorityCheckResult;
    error?: string;
  }> {
    const actionId = `autonomous_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const authorityCheck = this.checkAuthority(actionType, context);

    // Create action log entry
    const actionLog: AutonomousActionLog = {
      action_id: actionId,
      action_type: actionType,
      timestamp: new Date().toISOString(),
      agent: context.agent,
      authorized: authorityCheck.authorized,
      governance_logged: false,
      memory_anchored: false,
      result: 'pending',
      details: {
        description: context.description,
        branch: context.branch,
        user_id: context.user_id,
        risk_level: context.risk_level,
        authority_reason: authorityCheck.reason
      }
    };

    this.actionLog.push(actionLog);

    try {
      if (!authorityCheck.authorized) {
        actionLog.result = 'failure';
        console.log(`🚫 Authority Service: Action blocked - ${authorityCheck.reason}`);
        
        return {
          success: false,
          action_id: actionId,
          authority_check: authorityCheck,
          error: authorityCheck.reason
        };
      }

      // Log autonomous action initiation
      if (authorityCheck.requires_governance) {
        await this.logGovernanceEntry(actionLog);
        actionLog.governance_logged = true;
      }

      console.log(`🤖 Authority Service: Executing autonomous ${actionType} - ${context.description}`);

      // Execute the action
      const result = await executeFunction();
      actionLog.result = 'success';

      // Post-execution logging
      if (authorityCheck.requires_memory_anchor) {
        await this.createMemoryAnchor(actionLog);
        actionLog.memory_anchored = true;
      }

      console.log(`✅ Authority Service: Autonomous action completed - ${actionId}`);

      return {
        success: true,
        result,
        action_id: actionId,
        authority_check: authorityCheck
      };

    } catch (error: unknown) {
      actionLog.result = 'failure';
      actionLog.details.error = String((error as Error).message || 'Unknown error');

      console.error(`❌ Authority Service: Autonomous action failed - ${actionId}:`, error);

      // Log failure to governance
      if (authorityCheck.requires_governance) {
        await this.logGovernanceEntry(actionLog);
        actionLog.governance_logged = true;
      }

      return {
        success: false,
        action_id: actionId,
        authority_check: authorityCheck,
        error: error.message
      };
    }
  }

  /**
   * Log governance entry for autonomous action
   */
  private async logGovernanceEntry(actionLog: AutonomousActionLog): Promise<void> {
    try {
      await this.governanceLogger.log({
        event_type: 'autonomous_action',
        user_id: actionLog.details.user_id || 'system',
        user_role: actionLog.agent,
        resource_type: 'sdlc',
        resource_id: actionLog.action_id,
        action: actionLog.action_type,
        success: actionLog.result === 'success',
        details: {
          action_id: actionLog.action_id,
          agent: actionLog.agent,
          description: actionLog.details.description,
          authorized: actionLog.authorized,
          timestamp: actionLog.timestamp,
          branch: actionLog.details.branch,
          risk_level: actionLog.details.risk_level
        }
      });
    } catch {
      console.error('❌ Authority Service: Failed to log governance entry:', error);
    }
  }

  /**
   * Create memory anchor for autonomous action
   */
  private async createMemoryAnchor(actionLog: AutonomousActionLog): Promise<void> {
    try {
      // In a real implementation, this would interface with the MemoryPlugin
      // For now, we'll create a simple memory record
      const memoryAnchor = {
        anchor_id: `memory_${actionLog.action_id}`,
        type: 'autonomous_action',
        timestamp: new Date().toISOString(),
        agent: actionLog.agent,
        action_type: actionLog.action_type,
        description: actionLog.details.description,
        governance_id: actionLog.action_id,
        status: actionLog.result
      };

      // TODO: Integrate with actual MemoryPlugin API
      console.log(`🧠 Authority Service: Memory anchor created - ${memoryAnchor.anchor_id}`);
    } catch {
      console.error('❌ Authority Service: Failed to create memory anchor:', error);
    }
  }

  /**
   * Get activity feed for Orbis Admin Dashboard
   */
  getActivityFeed(limit: number = 50): AutonomousActionLog[] {
    return this.actionLog
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  /**
   * Get authority configuration status
   */
  getAuthorityStatus(): {
    configured: boolean;
    config?: AuthorityConfig;
    actions_today: number;
    successful_actions: number;
    failed_actions: number;
  } {
    const today = new Date().toISOString().split('T')[0];
    const todayActions = this.actionLog.filter(log => 
      log.timestamp.startsWith(today)
    );

    return {
      configured: this.config !== null,
      config: this.config || undefined,
      actions_today: todayActions.length,
      successful_actions: todayActions.filter(log => log.result === 'success').length,
      failed_actions: todayActions.filter(log => log.result === 'failure').length
    };
  }

  /**
   * Reload configuration (for runtime updates)
   */
  reloadConfig(): void {
    this.loadConfig();
  }
}

// Export singleton instance
export const authorityService = AuthorityService.getInstance();