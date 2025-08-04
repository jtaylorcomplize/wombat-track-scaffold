/**
 * Memory Anchor Agent
 * Automatically creates memory anchors for significant project events
 * Integrates with Gizmo memory system and DriveMemory storage
 */

import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import * as path from 'path';
import { enhancedGovernanceLogger } from '../services/enhancedGovernanceLogger';

export interface AnchorTrigger {
  id: string;
  name: string;
  event: 'phase_complete' | 'project_milestone' | 'qa_pass' | 'deployment' | 'governance_event' | 'critical_decision';
  conditions: AnchorCondition[];
  anchorType: 'governance' | 'technical' | 'decision' | 'milestone' | 'learning';
  priority: 'low' | 'medium' | 'high' | 'critical';
  gizmoIntegration: boolean;
  autoSubmit: boolean;
  enabled: boolean;
}

export interface AnchorCondition {
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'exists' | 'not_exists';
  value: unknown;
  required: boolean;
}

export interface MemoryAnchor {
  id: string;
  timestamp: string;
  type: 'governance' | 'technical' | 'decision' | 'milestone' | 'learning';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  summary: string;
  context: MemoryContext;
  content: MemoryContent;
  metadata: Record<string, unknown>;
  gizmoStatus: 'pending' | 'submitted' | 'accepted' | 'failed';
  filePath?: string;
}

export interface MemoryContext {
  projectId?: string;
  projectName?: string;
  phaseId?: string;
  phaseName?: string;
  stepId?: string;
  stepName?: string;
  triggeredBy: string;
  triggerEvent: string;
  relatedArtifacts: string[];
}

export interface MemoryContent {
  keyInsights: string[];
  decisions: string[];
  lessonsLearned: string[];
  technicalNotes: string[];
  governanceData: Record<string, unknown>;
  artifacts: MemoryArtifact[];
}

export interface MemoryArtifact {
  id: string;
  type: 'code' | 'document' | 'config' | 'log' | 'screenshot' | 'data';
  name: string;
  path: string;
  description: string;
  hash?: string;
}

export interface GizmoSubmissionResult {
  success: boolean;
  submissionId?: string;
  gizmoResponse?: unknown;
  error?: string;
}

export class MemoryAnchorAgent extends EventEmitter {
  private triggers: Map<string, AnchorTrigger>;
  private anchors: Map<string, MemoryAnchor>;
  private isActive: boolean = false;
  private driveMemoryPath: string;
  private gizmoEndpoint: string;

  constructor() {
    super();
    
    this.triggers = new Map();
    this.anchors = new Map();
    this.driveMemoryPath = process.env.DRIVE_MEMORY_PATH || './DriveMemory';
    this.gizmoEndpoint = process.env.GIZMO_MEMORY_ENDPOINT || 'http://localhost:3003/memory';
    
    this.initializeDefaultTriggers();
  }

  /**
   * Initialize default anchor triggers
   */
  private initializeDefaultTriggers(): void {
    const defaultTriggers: AnchorTrigger[] = [
      {
        id: 'phase-completion',
        name: 'Phase Completion Anchor',
        event: 'phase_complete',
        conditions: [
          { field: 'status', operator: 'equals', value: 'complete', required: true },
          { field: 'steps', operator: 'exists', value: true, required: true }
        ],
        anchorType: 'milestone',
        priority: 'high',
        gizmoIntegration: true,
        autoSubmit: true,
        enabled: true
      },
      {
        id: 'critical-decision',
        name: 'Critical Decision Anchor',
        event: 'critical_decision',
        conditions: [
          { field: 'priority', operator: 'equals', value: 'high', required: true }
        ],
        anchorType: 'decision',
        priority: 'critical',
        gizmoIntegration: true,
        autoSubmit: false,
        enabled: true
      },
      {
        id: 'qa-milestone',
        name: 'QA Milestone Anchor',
        event: 'qa_pass',
        conditions: [
          { field: 'status', operator: 'equals', value: 'complete', required: true },
          { field: 'name', operator: 'contains', value: 'qa', required: false }
        ],
        anchorType: 'governance',
        priority: 'medium',
        gizmoIntegration: true,
        autoSubmit: true,
        enabled: true
      },
      {
        id: 'deployment-milestone',
        name: 'Deployment Milestone Anchor',
        event: 'deployment',
        conditions: [
          { field: 'name', operator: 'contains', value: 'deploy', required: true }
        ],
        anchorType: 'technical',
        priority: 'high',
        gizmoIntegration: true,
        autoSubmit: true,
        enabled: true
      },
      {
        id: 'governance-event',
        name: 'Governance Event Anchor',
        event: 'governance_event',
        conditions: [
          { field: 'significance', operator: 'greater_than', value: 7, required: true }
        ],
        anchorType: 'governance',
        priority: 'medium',
        gizmoIntegration: true,
        autoSubmit: false,
        enabled: true
      }
    ];

    defaultTriggers.forEach(trigger => this.triggers.set(trigger.id, trigger));
  }

  /**
   * Start the Memory Anchor Agent
   */
  async start(): Promise<void> {
    if (this.isActive) {
      return;
    }

    this.isActive = true;
    
    // Ensure DriveMemory directories exist
    await this.ensureDirectoryStructure();
    
    this.emit('agent-started', { 
      agentId: 'memory-anchor-agent', 
      timestamp: new Date().toISOString(),
      triggersCount: this.triggers.size
    });

    await enhancedGovernanceLogger.logAgentAction('memory-anchor-agent', 'start', {
      triggers_loaded: this.triggers.size,
      drive_memory_path: this.driveMemoryPath
    });
  }

  /**
   * Stop the Memory Anchor Agent
   */
  async stop(): Promise<void> {
    this.isActive = false;
    
    this.emit('agent-stopped', { 
      agentId: 'memory-anchor-agent', 
      timestamp: new Date().toISOString() 
    });

    await enhancedGovernanceLogger.logAgentAction('memory-anchor-agent', 'stop', {
      anchors_created: this.anchors.size
    });
  }

  /**
   * Process potential anchor trigger
   */
  async processTrigger(
    event: string,
    context: MemoryContext,
    data: unknown
  ): Promise<MemoryAnchor[]> {
    if (!this.isActive) {
      return [];
    }

    const applicableTriggers = Array.from(this.triggers.values())
      .filter(trigger => trigger.enabled && trigger.event === event);

    const createdAnchors: MemoryAnchor[] = [];

    for (const trigger of applicableTriggers) {
      if (await this.evaluateConditions(trigger.conditions, data)) {
        const anchor = await this.createMemoryAnchor(trigger, context, data);
        createdAnchors.push(anchor);

        // Auto-submit to Gizmo if configured
        if (trigger.autoSubmit && trigger.gizmoIntegration) {
          await this.submitToGizmo(anchor);
        }
      }
    }

    return createdAnchors;
  }

  /**
   * Create memory anchor from trigger and context
   */
  async createMemoryAnchor(
    trigger: AnchorTrigger,
    context: MemoryContext,
    data: unknown
  ): Promise<MemoryAnchor> {
    const anchorId = `anchor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const anchor: MemoryAnchor = {
      id: anchorId,
      timestamp: new Date().toISOString(),
      type: trigger.anchorType,
      priority: trigger.priority,
      title: this.generateAnchorTitle(trigger, context, data),
      summary: this.generateAnchorSummary(trigger, context, data),
      context,
      content: await this.generateAnchorContent(trigger, context, data),
      metadata: {
        trigger_id: trigger.id,
        trigger_name: trigger.name,
        auto_generated: true,
        version: '1.0'
      },
      gizmoStatus: 'pending'
    };

    // Save to file system
    const filePath = await this.saveAnchorToFile(anchor);
    anchor.filePath = filePath;

    // Store in memory
    this.anchors.set(anchorId, anchor);

    // Emit event
    this.emit('anchor-created', anchor);

    // Log governance event
    await enhancedGovernanceLogger.logAgentAction('memory-anchor-agent', 'anchor-created', {
      anchor_id: anchorId,
      trigger_id: trigger.id,
      anchor_type: anchor.type,
      priority: anchor.priority,
      file_path: filePath
    });

    return anchor;
  }

  /**
   * Generate anchor title based on context
   */
  private generateAnchorTitle(trigger: AnchorTrigger, context: MemoryContext, _data: unknown): string { // eslint-disable-line @typescript-eslint/no-unused-vars
    const projectName = context.projectName || 'Unknown Project';
    const eventType = trigger.event.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    if (context.stepName) {
      return `${eventType}: ${context.stepName} (${projectName})`;
    } else if (context.phaseName) {
      return `${eventType}: ${context.phaseName} (${projectName})`;
    } else {
      return `${eventType}: ${projectName}`;
    }
  }

  /**
   * Generate anchor summary
   */
  private generateAnchorSummary(trigger: AnchorTrigger, context: MemoryContext, _data: unknown): string { // eslint-disable-line @typescript-eslint/no-unused-vars
    const timestamp = new Date().toLocaleString();
    const projectContext = context.projectName ? ` in project ${context.projectName}` : '';
    
    return `Memory anchor automatically created on ${timestamp} for ${trigger.name}${projectContext}. ` +
           `This anchor captures significant ${trigger.anchorType} information for future reference.`;
  }

  /**
   * Generate comprehensive anchor content
   */
  private async generateAnchorContent(
    trigger: AnchorTrigger, 
    context: MemoryContext, 
    data: unknown
  ): Promise<MemoryContent> {
    const content: MemoryContent = {
      keyInsights: [],
      decisions: [],
      lessonsLearned: [],
      technicalNotes: [],
      governanceData: {},
      artifacts: []
    };

    // Extract insights based on trigger type
    switch (trigger.anchorType) {
      case 'milestone':
        content.keyInsights.push(
          `Milestone achieved: ${context.stepName || context.phaseName}`,
          `Completion status verified and documented`,
          `Progress tracked and governance logged`
        );
        break;

      case 'decision':
        content.decisions.push(
          `Critical decision documented: ${data.decision || 'Decision details in context'}`,
          `Decision rationale and impact assessed`,
          `Stakeholder consensus achieved`
        );
        break;

      case 'technical':
        content.technicalNotes.push(
          `Technical implementation completed: ${context.stepName}`,
          `System changes documented and tested`,
          `Performance and security validated`
        );
        break;

      case 'governance':
        content.governanceData = {
          compliance_status: data.compliance || 'verified',
          audit_trail: data.auditTrail || 'documented',
          approval_status: data.approval || 'pending'
        };
        break;

      case 'learning':
        content.lessonsLearned.push(
          `Key learning captured from: ${context.stepName || context.phaseName}`,
          `Process improvements identified`,
          `Best practices documented for future reference`
        );
        break;
    }

    // Add context-specific artifacts
    if (context.relatedArtifacts) {
      content.artifacts = context.relatedArtifacts.map((artifactPath, index) => ({
        id: `artifact_${index}`,
        type: this.inferArtifactType(artifactPath),
        name: path.basename(artifactPath),
        path: artifactPath,
        description: `Related artifact for ${trigger.name}`
      }));
    }

    return content;
  }

  /**
   * Infer artifact type from file path
   */
  private inferArtifactType(filePath: string): MemoryArtifact['type'] {
    const ext = path.extname(filePath).toLowerCase();
    
    if (['.js', '.ts', '.tsx', '.jsx', '.py', '.java', '.cpp'].includes(ext)) return 'code';
    if (['.md', '.txt', '.doc', '.docx', '.pdf'].includes(ext)) return 'document';
    if (['.json', '.yaml', '.yml', '.xml', '.env'].includes(ext)) return 'config';
    if (['.log', '.out', '.err'].includes(ext)) return 'log';
    if (['.png', '.jpg', '.jpeg', '.gif', '.svg'].includes(ext)) return 'screenshot';
    
    return 'data';
  }

  /**
   * Save anchor to file system
   */
  private async saveAnchorToFile(anchor: MemoryAnchor): Promise<string> {
    const fileName = `${anchor.id}.anchor`;
    const directory = path.join(this.driveMemoryPath, 'anchors');
    const filePath = path.join(directory, fileName);

    // Ensure directory exists
    await fs.mkdir(directory, { recursive: true });

    // Create human-readable anchor file
    const anchorContent = this.formatAnchorForFile(anchor);
    await fs.writeFile(filePath, anchorContent, 'utf8');

    return filePath;
  }

  /**
   * Format anchor for file storage
   */
  private formatAnchorForFile(anchor: MemoryAnchor): string {
    return `# Memory Anchor: ${anchor.title}
# ID: ${anchor.id}
# Type: ${anchor.type}
# Priority: ${anchor.priority}
# Timestamp: ${anchor.timestamp}
# Gizmo Status: ${anchor.gizmoStatus}

## Summary
${anchor.summary}

## Context
- Project: ${anchor.context.projectName || 'N/A'} (${anchor.context.projectId || 'N/A'})
- Phase: ${anchor.context.phaseName || 'N/A'} (${anchor.context.phaseId || 'N/A'})
- Step: ${anchor.context.stepName || 'N/A'} (${anchor.context.stepId || 'N/A'})
- Triggered By: ${anchor.context.triggeredBy}
- Trigger Event: ${anchor.context.triggerEvent}

## Key Insights
${anchor.content.keyInsights.map(insight => `- ${insight}`).join('\n')}

## Decisions
${anchor.content.decisions.map(decision => `- ${decision}`).join('\n')}

## Lessons Learned
${anchor.content.lessonsLearned.map(lesson => `- ${lesson}`).join('\n')}

## Technical Notes
${anchor.content.technicalNotes.map(note => `- ${note}`).join('\n')}

## Governance Data
${JSON.stringify(anchor.content.governanceData, null, 2)}

## Artifacts
${anchor.content.artifacts.map(artifact => 
  `- ${artifact.name} (${artifact.type}): ${artifact.description}`
).join('\n')}

## Metadata
${JSON.stringify(anchor.metadata, null, 2)}

---
**Memory Anchor generated by MemoryAnchorAgent v1.0**
**Ready for Gizmo integration and permanent storage**
`;
  }

  /**
   * Submit anchor to Gizmo memory system
   */
  async submitToGizmo(anchor: MemoryAnchor): Promise<GizmoSubmissionResult> {
    try {
      // Prepare Gizmo payload
      const payload = {
        anchor_id: anchor.id,
        type: anchor.type,
        priority: anchor.priority,
        title: anchor.title,
        summary: anchor.summary,
        content: anchor.content,
        context: anchor.context,
        metadata: {
          ...anchor.metadata,
          submission_timestamp: new Date().toISOString(),
          agent_version: '1.0'
        }
      };

      // Submit to Gizmo endpoint (placeholder for actual implementation)
      // In production, this would be a real HTTP request to Gizmo
      const response = await this.mockGizmoSubmission(payload);

      if (response.success) {
        anchor.gizmoStatus = 'submitted';
        
        this.emit('gizmo-submission-success', {
          anchor_id: anchor.id,
          submission_id: response.submissionId
        });

        await enhancedGovernanceLogger.logAgentAction('memory-anchor-agent', 'gizmo-submitted', {
          anchor_id: anchor.id,
          submission_id: response.submissionId
        });
      } else {
        anchor.gizmoStatus = 'failed';
        
        this.emit('gizmo-submission-failed', {
          anchor_id: anchor.id,
          error: response.error
        });
      }

      return response;

    } catch (error) {
      anchor.gizmoStatus = 'failed';
      
      const result: GizmoSubmissionResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      this.emit('gizmo-submission-failed', {
        anchor_id: anchor.id,
        error: result.error
      });

      return result;
    }
  }

  /**
   * Mock Gizmo submission for development/testing
   */
  private async mockGizmoSubmission(_payload: unknown): Promise<GizmoSubmissionResult> { // eslint-disable-line @typescript-eslint/no-unused-vars
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // Mock successful submission 90% of the time
    const success = Math.random() > 0.1;

    if (success) {
      return {
        success: true,
        submissionId: `gizmo_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        gizmoResponse: {
          status: 'accepted',
          memory_id: `mem_${Date.now()}`,
          processed_at: new Date().toISOString()
        }
      };
    } else {
      return {
        success: false,
        error: 'Mock Gizmo submission failure for testing'
      };
    }
  }

  /**
   * Ensure directory structure exists
   */
  private async ensureDirectoryStructure(): Promise<void> {
    const directories = [
      path.join(this.driveMemoryPath, 'anchors'),
      path.join(this.driveMemoryPath, 'MemoryPlugin'),
      path.join(this.driveMemoryPath, 'oApp')
    ];

    for (const dir of directories) {
      await fs.mkdir(dir, { recursive: true });
    }
  }

  /**
   * Evaluate trigger conditions
   */
  private async evaluateConditions(conditions: AnchorCondition[], data: unknown): Promise<boolean> {
    for (const condition of conditions.filter(c => c.required)) {
      if (!this.evaluateCondition(condition, data)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Evaluate single condition
   */
  private evaluateCondition(condition: AnchorCondition, data: unknown): boolean {
    const value = this.getNestedValue(data, condition.field);

    switch (condition.operator) {
      case 'equals':
        return value === condition.value;
      case 'contains':
        return typeof value === 'string' && value.toLowerCase().includes(condition.value.toLowerCase());
      case 'greater_than':
        return typeof value === 'number' && value > condition.value;
      case 'less_than':
        return typeof value === 'number' && value < condition.value;
      case 'exists':
        return value !== undefined && value !== null;
      case 'not_exists':
        return value === undefined || value === null;
      default:
        return false;
    }
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: unknown, path: string): unknown {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Get agent status
   */
  getStatus(): { 
    active: boolean; 
    triggersCount: number; 
    anchorsCount: number; 
    driveMemoryPath: string;
    gizmoEndpoint: string;
  } {
    return {
      active: this.isActive,
      triggersCount: this.triggers.size,
      anchorsCount: this.anchors.size,
      driveMemoryPath: this.driveMemoryPath,
      gizmoEndpoint: this.gizmoEndpoint
    };
  }

  /**
   * Get all anchors
   */
  getAnchors(): MemoryAnchor[] {
    return Array.from(this.anchors.values());
  }

  /**
   * Get anchor by ID
   */
  getAnchor(id: string): MemoryAnchor | undefined {
    return this.anchors.get(id);
  }
}

// Export singleton instance
export const memoryAnchorAgent = new MemoryAnchorAgent();