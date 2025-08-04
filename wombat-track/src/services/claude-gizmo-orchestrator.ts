/**
 * Claude & Gizmo Orchestration Service - WT-MCPGS-1.0
 * Phase 3: Enable Claude & Gizmo to propose and execute MCP calls
 */

import { EventEmitter } from 'events';
import axios from 'axios';
import type {
  ClaudeGizmoAction,
  ClaudeGizmoResponse,
  AgentExecutionPlan,
  MultiAgentExecution,
  MCPGsuiteRequest,
  MCPGsuiteResponse
} from '../types/mcp-gsuite';
import { mcpGsuiteGovernance } from './mcp-gsuite-governance';
import { authorityService, AuthorityService } from './authority-service';

export class ClaudeGizmoOrchestrator extends EventEmitter {
  private readonly baseUrl: string;
  private readonly metaPlatformUrl: string;
  private activeExecutions: Map<string, MultiAgentExecution>;
  private executionQueue: AgentExecutionPlan[];

  constructor() {
    super();
    this.baseUrl = process.env.OAPP_API_BASE_URL || 'http://localhost:3002';
    this.metaPlatformUrl = process.env.METAPLATFORM_QUEUE_URL || 'http://localhost:3003/queue';
    this.activeExecutions = new Map();
    this.executionQueue = [];
  }

  /**
   * Generate unique execution ID
   */
  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Validate agent action before execution
   */
  private async validateAction(action: ClaudeGizmoAction, userId?: string): Promise<{
    valid: boolean;
    reason?: string;
    governance: any;
  }> {
    // Check action structure
    if (!action.action || !action.action.service || !action.action.action) {
      return {
        valid: false,
        reason: 'Invalid action structure - missing required fields',
        governance: null
      };
    }

    // Check confidence level
    if (action.confidenceLevel < 0.5) {
      return {
        valid: false,
        reason: 'Confidence level too low (< 0.5)',
        governance: null
      };
    }

    // Process through governance
    const governance = await mcpGsuiteGovernance.processAgentAction(action, userId);
    
    if (!governance.approved) {
      return {
        valid: false,
        reason: governance.blockReason || 'Action blocked by governance',
        governance
      };
    }

    return {
      valid: true,
      governance
    };
  }

  /**
   * Execute MCP GSuite action
   */
  private async executeMCPAction(
    request: MCPGsuiteRequest,
    userId?: string
  ): Promise<MCPGsuiteResponse> {
    const startTime = Date.now();
    
    try {
      // Process request through governance
      const governanceResult = await mcpGsuiteGovernance.processRequest(request, userId);
      
      if (governanceResult.requiresApproval) {
        return {
          success: false,
          error: 'Action requires manual approval',
          metadata: {
            timestamp: new Date().toISOString(),
            requestId: request.metadata?.requestId || 'unknown',
            processingTime: Date.now() - startTime,
            service: request.service,
            action: request.action
          },
          governance: {
            logged: true,
            auditId: governanceResult.auditId,
            sensitiveDataDetected: governanceResult.riskLevel === 'high'
          }
        };
      }

      // Execute the action via MCP API
      const endpoint = this.buildEndpoint(request.service, request.action);
      const response = await this.callMCPAPI(endpoint, request.parameters, userId);

      const mcpResponse: MCPGsuiteResponse = {
        success: response.success,
        data: response.data,
        error: response.error,
        metadata: {
          timestamp: new Date().toISOString(),
          requestId: request.metadata?.requestId || 'unknown',
          processingTime: Date.now() - startTime,
          service: request.service,
          action: request.action
        },
        governance: {
          logged: true,
          auditId: governanceResult.auditId,
          sensitiveDataDetected: governanceResult.riskLevel === 'high'
        }
      };

      // Log response through governance
      await mcpGsuiteGovernance.processResponse(mcpResponse, governanceResult.auditId, userId);

      return mcpResponse;
    } catch (error: any) {
      const errorResponse: MCPGsuiteResponse = {
        success: false,
        error: error.message,
        metadata: {
          timestamp: new Date().toISOString(),
          requestId: request.metadata?.requestId || 'unknown',
          processingTime: Date.now() - startTime,
          service: request.service,
          action: request.action
        },
        governance: {
          logged: true,
          auditId: 'error_' + Date.now(),
          sensitiveDataDetected: false
        }
      };

      return errorResponse;
    }
  }

  /**
   * Build API endpoint for service/action combination
   */
  private buildEndpoint(service: string, action: string): string {
    const endpointMap: Record<string, Record<string, string>> = {
      gmail: {
        send: 'POST /api/mcp/gsuite/gmail/send',
        labels: 'GET /api/mcp/gsuite/gmail/labels',
        search: 'GET /api/mcp/gsuite/gmail/messages'
      },
      drive: {
        list: 'GET /api/mcp/gsuite/drive/list',
        read: 'GET /api/mcp/gsuite/drive/read',
        create: 'POST /api/mcp/gsuite/drive/create'
      },
      sheets: {
        read: 'GET /api/mcp/gsuite/sheets/read',
        update: 'POST /api/mcp/gsuite/sheets/update'
      },
      calendar: {
        events: 'GET /api/mcp/gsuite/calendar/events',
        create: 'POST /api/mcp/gsuite/calendar/events'
      }
    };

    return endpointMap[service]?.[action] || `GET /api/mcp/gsuite/${service}/${action}`;
  }

  /**
   * Call MCP API endpoint
   */
  private async callMCPAPI(endpoint: string, parameters: any, userId?: string): Promise<any> {
    const [method, path] = endpoint.split(' ');
    const url = this.baseUrl + path;

    const config: any = {
      method: method.toLowerCase(),
      url,
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId || 'system'
      },
      timeout: 30000
    };

    if (method === 'GET') {
      config.params = parameters;
    } else {
      config.data = parameters;
    }

    const response = await axios(config);
    return response.data;
  }

  /**
   * Propose action from Claude or Gizmo
   */
  async proposeAction(
    agent: 'claude' | 'gizmo',
    prompt: string,
    action: MCPGsuiteRequest,
    options: {
      userId?: string;
      rationale?: string;
      confidenceLevel: number;
      riskLevel: 'low' | 'medium' | 'high';
    }
  ): Promise<{
    actionId: string;
    approved: boolean;
    reason?: string;
    estimatedDuration?: number;
    autonomous?: boolean;
  }> {
    const actionId = this.generateExecutionId();
    
    // Check authority for autonomous execution
    const authorityCheck = authorityService.checkAuthority('activate_agents', {
      agent,
      user_id: options.userId,
      risk_level: options.riskLevel
    });

    const claudeGizmoAction: ClaudeGizmoAction = {
      type: 'mcp-gsuite-action',
      id: actionId,
      timestamp: new Date().toISOString(),
      agent,
      prompt,
      action,
      rationale: options.rationale,
      confidenceLevel: options.confidenceLevel,
      riskLevel: options.riskLevel,
      requiresApproval: !authorityCheck.authorized || options.riskLevel === 'high' || options.confidenceLevel < 0.7
    };

    // If authorized for autonomous execution, skip manual validation
    if (authorityCheck.authorized && !claudeGizmoAction.requiresApproval) {
      console.log(`🤖 Claude-Gizmo Orchestrator: Autonomous execution authorized for ${agent} - ${prompt}`);
      
      // Create execution plan
      const executionPlan: AgentExecutionPlan = {
        id: actionId,
        agent,
        actions: [claudeGizmoAction],
        dependencies: [],
        executionOrder: [0],
        approvalRequired: false,
        estimatedDuration: this.estimateExecutionTime(action)
      };

      // Add to queue for immediate execution
      this.executionQueue.push(executionPlan);

      this.emit('actionAutonomouslyApproved', {
        actionId,
        agent,
        action: claudeGizmoAction,
        executionPlan,
        authorityCheck
      });

      return {
        actionId,
        approved: true,
        autonomous: true,
        estimatedDuration: executionPlan.estimatedDuration
      };
    }

    // Validate the action (manual approval path)
    const validation = await this.validateAction(claudeGizmoAction, options.userId);
    
    if (!validation.valid) {
      this.emit('actionRejected', {
        actionId,
        agent,
        reason: validation.reason,
        action: claudeGizmoAction
      });

      return {
        actionId,
        approved: false,
        reason: validation.reason,
        autonomous: false
      };
    }

    // Create execution plan
    const executionPlan: AgentExecutionPlan = {
      id: actionId,
      agent,
      actions: [claudeGizmoAction],
      dependencies: [],
      executionOrder: [0],
      approvalRequired: claudeGizmoAction.requiresApproval,
      estimatedDuration: this.estimateExecutionTime(action)
    };

    // Add to queue
    this.executionQueue.push(executionPlan);

    this.emit('actionProposed', {
      actionId,
      agent,
      action: claudeGizmoAction,
      executionPlan
    });

    return {
      actionId,
      approved: true,
      autonomous: false,
      estimatedDuration: executionPlan.estimatedDuration
    };
  }

  /**
   * Execute proposed action
   */
  async executeAction(actionId: string, userId?: string): Promise<ClaudeGizmoResponse> {
    const executionPlan = this.executionQueue.find(plan => plan.id === actionId);
    
    if (!executionPlan) {
      throw new Error(`Execution plan not found for action ${actionId}`);
    }

    // Remove from queue
    this.executionQueue = this.executionQueue.filter(plan => plan.id !== actionId);

    const startTime = Date.now();
    const action = executionPlan.actions[0]; // Single action for now

    try {
      // Execute the MCP action
      const result = await this.executeMCPAction(action.action, userId);

      const response: ClaudeGizmoResponse = {
        type: 'mcp-gsuite-response',
        id: this.generateExecutionId(),
        timestamp: new Date().toISOString(),
        agent: executionPlan.agent,
        originalActionId: actionId,
        result
      };

      this.emit('actionExecuted', {
        actionId,
        agent: executionPlan.agent,
        result,
        duration: Date.now() - startTime
      });

      return response;
    } catch (error: any) {
      const errorResponse: ClaudeGizmoResponse = {
        type: 'mcp-gsuite-response',
        id: this.generateExecutionId(),
        timestamp: new Date().toISOString(),
        agent: executionPlan.agent,
        originalActionId: actionId,
        result: {
          success: false,
          error: error.message,
          metadata: {
            timestamp: new Date().toISOString(),
            requestId: actionId,
            processingTime: Date.now() - startTime,
            service: action.action.service,
            action: action.action.action
          }
        }
      };

      this.emit('actionFailed', {
        actionId,
        agent: executionPlan.agent,
        error: error.message,
        duration: Date.now() - startTime
      });

      return errorResponse;
    }
  }

  /**
   * Execute multi-agent coordinated actions
   */
  async executeMultiAgent(
    agents: ('claude' | 'gizmo')[],
    actions: { [agentName: string]: MCPGsuiteRequest[] },
    options: {
      userId?: string;
      coordination?: 'sequential' | 'parallel';
      timeout?: number;
    } = {}
  ): Promise<MultiAgentExecution> {
    const executionId = this.generateExecutionId();
    const coordination = options.coordination || 'sequential';
    
    const multiExecution: MultiAgentExecution = {
      id: executionId,
      timestamp: new Date().toISOString(),
      agents,
      coordinatedActions: {},
      status: 'pending',
      governanceLogs: []
    };

    // Create execution plans for each agent
    for (const agent of agents) {
      const agentActions = actions[agent] || [];
      const claudeGizmoActions: ClaudeGizmoAction[] = agentActions.map((action, index) => ({
        type: 'mcp-gsuite-action',
        id: `${executionId}_${agent}_${index}`,
        timestamp: new Date().toISOString(),
        agent,
        prompt: `Multi-agent execution ${executionId}`,
        action,
        confidenceLevel: 0.8,
        riskLevel: 'medium',
        requiresApproval: false
      }));

      multiExecution.coordinatedActions[agent] = {
        id: `${executionId}_${agent}`,
        agent,
        actions: claudeGizmoActions,
        dependencies: [],
        executionOrder: claudeGizmoActions.map((_, i) => i),
        approvalRequired: false,
        estimatedDuration: claudeGizmoActions.reduce(
          (sum, action) => sum + this.estimateExecutionTime(action.action),
          0
        )
      };
    }

    this.activeExecutions.set(executionId, multiExecution);
    multiExecution.status = 'in-progress';

    try {
      if (coordination === 'sequential') {
        multiExecution.results = await this.executeSequential(multiExecution, options.userId);
      } else {
        multiExecution.results = await this.executeParallel(multiExecution, options.userId);
      }
      
      multiExecution.status = 'completed';
    } catch (error: any) {
      multiExecution.status = 'failed';
      throw error;
    } finally {
      this.activeExecutions.delete(executionId);
    }

    this.emit('multiAgentCompleted', multiExecution);
    return multiExecution;
  }

  /**
   * Execute actions sequentially
   */
  private async executeSequential(
    execution: MultiAgentExecution,
    userId?: string
  ): Promise<{ [agentName: string]: ClaudeGizmoResponse[] }> {
    const results: { [agentName: string]: ClaudeGizmoResponse[] } = {};

    for (const agent of execution.agents) {
      const plan = execution.coordinatedActions[agent];
      results[agent] = [];

      for (const action of plan.actions) {
        const response = await this.executeMCPAction(action.action, userId);
        results[agent].push({
          type: 'mcp-gsuite-response',
          id: this.generateExecutionId(),
          timestamp: new Date().toISOString(),
          agent,
          originalActionId: action.id,
          result: response
        });
      }
    }

    return results;
  }

  /**
   * Execute actions in parallel
   */
  private async executeParallel(
    execution: MultiAgentExecution,
    userId?: string
  ): Promise<{ [agentName: string]: ClaudeGizmoResponse[] }> {
    const results: { [agentName: string]: ClaudeGizmoResponse[] } = {};
    const promises: Promise<any>[] = [];

    for (const agent of execution.agents) {
      const plan = execution.coordinatedActions[agent];
      results[agent] = [];

      const agentPromise = Promise.all(
        plan.actions.map(async (action) => {
          const response = await this.executeMCPAction(action.action, userId);
          return {
            type: 'mcp-gsuite-response',
            id: this.generateExecutionId(),
            timestamp: new Date().toISOString(),
            agent,
            originalActionId: action.id,
            result: response
          };
        })
      ).then(responses => {
        results[agent] = responses;
      });

      promises.push(agentPromise);
    }

    await Promise.all(promises);
    return results;
  }

  /**
   * Estimate execution time for an action
   */
  private estimateExecutionTime(action: MCPGsuiteRequest): number {
    const baseTimes: Record<string, Record<string, number>> = {
      gmail: { send: 3000, labels: 1000, search: 2000 },
      drive: { list: 2000, read: 1500, create: 4000 },
      sheets: { read: 2000, update: 3000 },
      calendar: { events: 1500, create: 2500 }
    };

    return baseTimes[action.service]?.[action.action] || 2000;
  }

  /**
   * Get execution queue status
   */
  getQueueStatus(): {
    pending: number;
    active: number;
    agents: Record<string, number>;
  } {
    const agentCounts: Record<string, number> = {};
    
    this.executionQueue.forEach(plan => {
      agentCounts[plan.agent] = (agentCounts[plan.agent] || 0) + 1;
    });

    return {
      pending: this.executionQueue.length,
      active: this.activeExecutions.size,
      agents: agentCounts
    };
  }

  /**
   * Cancel execution
   */
  async cancelExecution(executionId: string): Promise<boolean> {
    // Remove from queue
    const wasInQueue = this.executionQueue.some(plan => plan.id === executionId);
    this.executionQueue = this.executionQueue.filter(plan => plan.id !== executionId);

    // Cancel active execution
    const activeExecution = this.activeExecutions.get(executionId);
    if (activeExecution) {
      activeExecution.status = 'cancelled';
      this.activeExecutions.delete(executionId);
      this.emit('executionCancelled', { executionId });
      return true;
    }

    return wasInQueue;
  }
}

// Singleton instance
export const claudeGizmoOrchestrator = new ClaudeGizmoOrchestrator();