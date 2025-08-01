/**
 * MCP GSuite Governance Service - WT-MCPGS-1.0
 * Phase 2: Attach GovernanceLog + MemoryPlugin hooks
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import {
  MCPGsuiteRequest,
  MCPGsuiteResponse,
  GovernanceLogEntry,
  MemoryPluginEntry,
  RAGTrigger,
  ClaudeGizmoAction
} from '../types/mcp-gsuite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class MCPGsuiteGovernance {
  private governanceLogPath: string;
  private driveMemoryPath: string;
  private memoryPluginPath: string;
  private ragTriggers: RAGTrigger[];

  constructor() {
    this.governanceLogPath = path.join(__dirname, '../../logs/governance.jsonl');
    this.driveMemoryPath = path.join(__dirname, '../../DriveMemory/MCP-GSuite');
    this.memoryPluginPath = path.join(__dirname, '../../logs/memory-plugin.jsonl');
    
    // Define RAG triggers for sensitive actions
    this.ragTriggers = [
      {
        type: 'sensitive-action',
        service: 'gmail',
        action: 'send',
        threshold: { riskLevel: 'medium' },
        governanceAction: 'log',
        memoryUpdate: true
      },
      {
        type: 'high-risk-operation',
        service: 'drive',
        action: 'create',
        threshold: { riskLevel: 'high' },
        governanceAction: 'approve',
        memoryUpdate: true
      },
      {
        type: 'bulk-operation',
        service: 'sheets',
        action: 'update',
        threshold: { riskLevel: 'medium', dataVolume: 100 },
        governanceAction: 'log',
        memoryUpdate: true
      },
      {
        type: 'external-share',
        service: 'drive',
        action: 'share',
        threshold: { riskLevel: 'high', externalRecipients: true },
        governanceAction: 'approve',
        memoryUpdate: true
      }
    ];
  }

  /**
   * Initialize governance directories and files
   */
  async initialize(): Promise<void> {
    try {
      // Create directories
      await fs.mkdir(path.dirname(this.governanceLogPath), { recursive: true });
      await fs.mkdir(this.driveMemoryPath, { recursive: true });
      await fs.mkdir(path.dirname(this.memoryPluginPath), { recursive: true });
      
      // Log initialization
      await this.logGovernanceEvent({
        event: 'mcp-gsuite-governance-init',
        phase: 'WT-MCPGS-1.0-Phase2',
        result: 'success',
        metadata: {
          ragTriggersCount: this.ragTriggers.length,
          initialized: true
        }
      });
    } catch (error: any) {
      console.error('Failed to initialize MCP GSuite governance:', error);
      throw error;
    }
  }

  /**
   * Generate unique audit ID
   */
  private generateAuditId(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Detect sensitive data in request/response
   */
  private detectSensitiveData(data: any): boolean {
    const sensitivePatterns = [
      /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/, // Credit card
      /\b\d{3}-\d{2}-\d{4}\b/, // SSN
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email (many emails)
      /\b(?:password|token|secret|key|auth)\b/i, // Security terms
      /\b(?:confidential|private|internal)\b/i // Classification terms
    ];

    const dataString = JSON.stringify(data).toLowerCase();
    return sensitivePatterns.some(pattern => pattern.test(dataString));
  }

  /**
   * Calculate risk level for an action
   */
  private calculateRiskLevel(request: MCPGsuiteRequest): 'low' | 'medium' | 'high' {
    let riskScore = 0;

    // Service-based risk
    const serviceRisk = {
      'gmail': 2,
      'drive': 3,
      'sheets': 2,
      'calendar': 1
    };
    riskScore += serviceRisk[request.service] || 1;

    // Action-based risk
    const actionRisk = {
      'send': 3,
      'create': 2,
      'update': 2,
      'delete': 4,
      'share': 4,
      'read': 1,
      'list': 1
    };
    riskScore += actionRisk[request.action] || 1;

    // Parameter-based risk
    if (request.parameters.external_recipients) riskScore += 3;
    if (request.parameters.bulk_operation) riskScore += 2;
    if (this.detectSensitiveData(request.parameters)) riskScore += 3;

    if (riskScore >= 8) return 'high';
    if (riskScore >= 5) return 'medium';
    return 'low';
  }

  /**
   * Check if action triggers RAG governance
   */
  private checkRAGTriggers(request: MCPGsuiteRequest, riskLevel: string): RAGTrigger | null {
    return this.ragTriggers.find(trigger => 
      trigger.service === request.service &&
      trigger.action === request.action &&
      (trigger.threshold.riskLevel === riskLevel || 
       (trigger.threshold.riskLevel === 'medium' && riskLevel === 'high'))
    ) || null;
  }

  /**
   * Log governance event
   */
  async logGovernanceEvent(entry: Partial<GovernanceLogEntry>, userId?: string): Promise<string> {
    const auditId = this.generateAuditId();
    
    const governanceEntry: GovernanceLogEntry = {
      timestamp: new Date().toISOString(),
      auditId,
      userId: userId || 'system',
      event: entry.event || 'mcp-gsuite-action',
      phase: entry.phase || 'WT-MCPGS-1.0',
      ...entry
    };

    try {
      // Write to governance log
      await fs.appendFile(
        this.governanceLogPath,
        JSON.stringify(governanceEntry) + '\n'
      );

      // Write to DriveMemory
      const driveMemoryFile = path.join(
        this.driveMemoryPath,
        `governance-${new Date().toISOString().split('T')[0]}.jsonl`
      );
      await fs.appendFile(driveMemoryFile, JSON.stringify(governanceEntry) + '\n');

      return auditId;
    } catch (error: any) {
      console.error('Failed to write governance log:', error);
      throw error;
    }
  }

  /**
   * Log to memory plugin
   */
  async logToMemoryPlugin(entry: MemoryPluginEntry): Promise<void> {
    try {
      await fs.appendFile(
        this.memoryPluginPath,
        JSON.stringify(entry) + '\n'
      );
    } catch (error: any) {
      console.error('Failed to write to memory plugin:', error);
      // Don't throw - memory plugin is non-critical
    }
  }

  /**
   * Process incoming MCP GSuite request
   */
  async processRequest(
    request: MCPGsuiteRequest,
    userId?: string,
    agent?: 'claude' | 'gizmo'
  ): Promise<{
    auditId: string;
    riskLevel: 'low' | 'medium' | 'high';
    requiresApproval: boolean;
    ragTriggered: boolean;
    trigger?: RAGTrigger;
  }> {
    const riskLevel = this.calculateRiskLevel(request);
    const sensitiveData = this.detectSensitiveData(request.parameters);
    const ragTrigger = this.checkRAGTriggers(request, riskLevel);
    const requiresApproval = ragTrigger?.governanceAction === 'approve';

    // Log governance event
    const auditId = await this.logGovernanceEvent({
      event: 'mcp-gsuite-request',
      phase: 'WT-MCPGS-1.0-Phase2',
      userId,
      agent,
      action: request.action,
      service: request.service,
      parameters: request.parameters,
      result: 'pending',
      riskLevel,
      sensitiveData,
      metadata: {
        requiresApproval,
        ragTriggered: !!ragTrigger,
        trigger: ragTrigger?.type
      }
    }, userId);

    // Log to memory plugin if triggered
    if (ragTrigger?.memoryUpdate) {
      await this.logToMemoryPlugin({
        timestamp: new Date().toISOString(),
        type: 'mcp-gsuite-action',
        agent,
        content: request,
        context: {
          service: request.service,
          action: request.action,
          userId: userId || 'system',
          riskLevel
        },
        tags: [
          `service:${request.service}`,
          `action:${request.action}`,
          `risk:${riskLevel}`,
          ...(ragTrigger ? [`trigger:${ragTrigger.type}`] : [])
        ]
      });
    }

    return {
      auditId,
      riskLevel,
      requiresApproval,
      ragTriggered: !!ragTrigger,
      trigger: ragTrigger || undefined
    };
  }

  /**
   * Process MCP GSuite response
   */
  async processResponse(
    response: MCPGsuiteResponse,
    auditId: string,
    userId?: string,
    agent?: 'claude' | 'gizmo'
  ): Promise<void> {
    const sensitiveData = this.detectSensitiveData(response.data);

    // Update governance log
    await this.logGovernanceEvent({
      event: 'mcp-gsuite-response',
      phase: 'WT-MCPGS-1.0-Phase2',
      userId,
      agent,
      action: response.metadata.action,
      service: response.metadata.service,
      result: response.success ? 'success' : 'failure',
      sensitiveData,
      metadata: {
        originalAuditId: auditId,
        processingTime: response.metadata.processingTime,
        dataSize: JSON.stringify(response.data || {}).length,
        error: response.error
      }
    }, userId);

    // Log to memory plugin
    await this.logToMemoryPlugin({
      timestamp: new Date().toISOString(),
      type: 'mcp-gsuite-response',
      agent,
      content: response,
      context: {
        service: response.metadata.service,
        action: response.metadata.action,
        userId: userId || 'system',
        riskLevel: 'low' // Response risk is generally lower
      },
      tags: [
        `service:${response.metadata.service}`,
        `action:${response.metadata.action}`,
        `result:${response.success ? 'success' : 'failure'}`,
        ...(sensitiveData ? ['sensitive-data'] : [])
      ]
    });
  }

  /**
   * Process Claude/Gizmo action
   */
  async processAgentAction(
    action: ClaudeGizmoAction,
    userId?: string
  ): Promise<{
    auditId: string;
    approved: boolean;
    blockReason?: string;
  }> {
    const auditId = await this.logGovernanceEvent({
      event: 'agent-action-proposal',
      phase: 'WT-MCPGS-1.0-Phase3',
      userId,
      agent: action.agent,
      action: action.action.action,
      service: action.action.service,
      riskLevel: action.riskLevel,
      metadata: {
        actionId: action.id,
        confidenceLevel: action.confidenceLevel,
        requiresApproval: action.requiresApproval,
        rationale: action.rationale
      }
    }, userId);

    // Check if action should be blocked
    let approved = true;
    let blockReason: string | undefined;

    if (action.riskLevel === 'high' && action.requiresApproval) {
      approved = false;
      blockReason = 'High-risk action requires manual approval';
    }

    if (action.confidenceLevel < 0.7) {
      approved = false;
      blockReason = 'Low confidence level requires review';
    }

    // Log to memory plugin
    await this.logToMemoryPlugin({
      timestamp: new Date().toISOString(),
      type: 'mcp-gsuite-action',
      agent: action.agent,
      content: action,
      context: {
        service: action.action.service,
        action: action.action.action,
        userId: userId || 'system',
        riskLevel: action.riskLevel
      },
      tags: [
        `agent:${action.agent}`,
        `service:${action.action.service}`,
        `action:${action.action.action}`,
        `risk:${action.riskLevel}`,
        `confidence:${Math.round(action.confidenceLevel * 100)}`,
        ...(approved ? ['approved'] : ['blocked'])
      ]
    });

    return {
      auditId,
      approved,
      blockReason
    };
  }

  /**
   * Get governance statistics
   */
  async getGovernanceStats(): Promise<{
    totalRequests: number;
    riskLevels: Record<string, number>;
    services: Record<string, number>;
    ragTriggers: number;
    sensitiveDataDetected: number;
  }> {
    try {
      const logContent = await fs.readFile(this.governanceLogPath, 'utf-8');
      const entries = logContent.trim().split('\n')
        .filter(line => line.trim())
        .map(line => JSON.parse(line) as GovernanceLogEntry);

      const stats = {
        totalRequests: 0,
        riskLevels: { low: 0, medium: 0, high: 0 },
        services: { gmail: 0, drive: 0, sheets: 0, calendar: 0 },
        ragTriggers: 0,
        sensitiveDataDetected: 0
      };

      entries.forEach(entry => {
        if (entry.event === 'mcp-gsuite-request') {
          stats.totalRequests++;
          
          if (entry.riskLevel) {
            stats.riskLevels[entry.riskLevel]++;
          }
          
          if (entry.service) {
            stats.services[entry.service as keyof typeof stats.services]++;
          }
          
          if (entry.metadata?.ragTriggered) {
            stats.ragTriggers++;
          }
          
          if (entry.sensitiveData) {
            stats.sensitiveDataDetected++;
          }
        }
      });

      return stats;
    } catch (error) {
      return {
        totalRequests: 0,
        riskLevels: { low: 0, medium: 0, high: 0 },
        services: { gmail: 0, drive: 0, sheets: 0, calendar: 0 },
        ragTriggers: 0,
        sensitiveDataDetected: 0
      };
    }
  }
}

// Singleton instance
export const mcpGsuiteGovernance = new MCPGsuiteGovernance();