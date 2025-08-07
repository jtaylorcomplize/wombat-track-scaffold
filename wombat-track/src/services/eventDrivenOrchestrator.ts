/**
 * Event-Driven Orchestrator - OF-8.6 Implementation
 * Handles event-driven PhaseStep creation and governance synchronization
 */

import { EventEmitter } from 'events';
import { enhancedGovernanceLogger } from './enhancedGovernanceLogger';
import { mcpMSSQLServer } from './mcpMSSQLServer';
import { mcpAzureServer } from './mcpAzureServer';

export interface OrchestrationEvent {
  id: string;
  type: 'governance_log_created' | 'phase_step_updated' | 'memory_anchor_created' | 'project_status_changed';
  source: string;
  timestamp: string;
  projectId: string;
  phaseId?: string;
  stepId?: string;
  data: Record<string, any>;
  priority: 'low' | 'medium' | 'high' | 'critical';
  triggers: string[];
  metadata: {
    compliance: string;
    auditTrail: string;
    memoryAnchor?: string;
  };
}

export interface PhaseStepAutoCreationRule {
  id: string;
  name: string;
  description: string;
  eventTriggers: string[];
  conditions: {
    projectId?: string;
    phaseId?: string;
    eventType: string;
    dataPattern?: any;
  };
  stepTemplate: {
    namePattern: string;
    descriptionPattern: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    assignmentRules: any;
    dueDateRules: any;
  };
  enabled: boolean;
  auCompliant: boolean;
}

export interface GovernanceSyncRule {
  id: string;
  name: string;
  description: string;
  sourceEvents: string[];
  targetSystems: ('canonical_db' | 'complize' | 'azure_storage' | 'memory_anchors')[];
  syncFrequency: 'immediate' | 'batch_5min' | 'batch_hourly' | 'daily';
  retryPolicy: {
    maxRetries: number;
    backoffMs: number;
    exponentialBackoff: boolean;
  };
  enabled: boolean;
}

class EventDrivenOrchestrator extends EventEmitter {
  private initialized = false;
  private eventQueue: OrchestrationEvent[] = [];
  private processingQueue = false;
  private autoCreationRules: Map<string, PhaseStepAutoCreationRule> = new Map();
  private syncRules: Map<string, GovernanceSyncRule> = new Map();
  private eventMetrics = {
    processed: 0,
    failed: 0,
    stepsCreated: 0,
    syncsCompleted: 0
  };

  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log('🚀 Initializing Event-Driven Orchestrator...');

    // Setup default rules
    await this.setupDefaultAutoCreationRules();
    await this.setupDefaultSyncRules();

    // Setup event listeners
    this.setupEventListeners();

    // Start event processing loop
    this.startEventProcessingLoop();

    this.initialized = true;
    console.log('✅ Event-Driven Orchestrator initialized');

    // Create initialization governance log
    enhancedGovernanceLogger.createPhaseAnchor('event-driven-orchestrator-init', 'automation');
  }

  private async setupDefaultAutoCreationRules(): Promise<void> {
    const rules: PhaseStepAutoCreationRule[] = [
      {
        id: 'governance-log-trigger',
        name: 'Auto-create PhaseStep from Governance Log',
        description: 'Creates PhaseSteps automatically when governance logs indicate new work',
        eventTriggers: ['governance_log_created'],
        conditions: {
          eventType: 'governance_log_created',
          dataPattern: {
            action: ['work_surface_navigation', 'project_phase_started', 'memory_anchor_created']
          }
        },
        stepTemplate: {
          namePattern: 'Auto: {eventAction}',
          descriptionPattern: 'Automatically created from governance event: {eventId}',
          priority: 'medium',
          assignmentRules: { autoAssign: false },
          dueDateRules: { addDays: 7 }
        },
        enabled: true,
        auCompliant: true
      },
      {
        id: 'memory-anchor-trigger',  
        name: 'Auto-create PhaseStep from Memory Anchor',
        description: 'Creates PhaseSteps when memory anchors are created for active phases',
        eventTriggers: ['memory_anchor_created'],
        conditions: {
          eventType: 'memory_anchor_created',
          dataPattern: {
            anchorType: ['phase_completion', 'milestone_reached', 'decision_point']
          }
        },
        stepTemplate: {
          namePattern: 'Follow-up: {anchorType}',
          descriptionPattern: 'Follow-up action for memory anchor: {anchorId}',
          priority: 'high',
          assignmentRules: { autoAssign: true },
          dueDateRules: { addDays: 3 }
        },
        enabled: true,
        auCompliant: true
      },
      {
        id: 'project-milestone-trigger',
        name: 'Auto-create PhaseStep from Project Milestones',
        description: 'Creates PhaseSteps for project milestone events',
        eventTriggers: ['project_status_changed'],
        conditions: {
          eventType: 'project_status_changed',
          dataPattern: {
            newStatus: ['milestone_reached', 'phase_completed', 'checkpoint_reached']
          }
        },
        stepTemplate: {
          namePattern: 'Milestone: {milestoneType}',
          descriptionPattern: 'Milestone action: {description}',
          priority: 'high',
          assignmentRules: { autoAssign: true },
          dueDateRules: { addDays: 5 }
        },
        enabled: true,
        auCompliant: true
      }
    ];

    rules.forEach(rule => {
      this.autoCreationRules.set(rule.id, rule);
    });

    console.log(`📋 Configured ${rules.length} auto-creation rules`);
  }

  private async setupDefaultSyncRules(): Promise<void> {
    const syncRules: GovernanceSyncRule[] = [
      {
        id: 'canonical-db-sync',
        name: 'Sync to Canonical Database',
        description: 'Sync all governance events to canonical MSSQL database',
        sourceEvents: ['governance_log_created', 'phase_step_updated', 'memory_anchor_created'],
        targetSystems: ['canonical_db'],
        syncFrequency: 'immediate',
        retryPolicy: {
          maxRetries: 3,
          backoffMs: 1000,
          exponentialBackoff: true
        },
        enabled: true
      },
      {
        id: 'complize-sync',
        name: 'Sync to Complize System',
        description: 'Sync governance events and memory anchors to Complize canonical memory',
        sourceEvents: ['governance_log_created', 'memory_anchor_created', 'project_status_changed'],
        targetSystems: ['complize', 'azure_storage'],
        syncFrequency: 'batch_5min',
        retryPolicy: {
          maxRetries: 2,
          backoffMs: 2000,
          exponentialBackoff: true
        },
        enabled: true
      },
      {
        id: 'memory-anchor-sync',
        name: 'Sync Memory Anchors',
        description: 'Sync memory anchors to all target systems for redundancy',
        sourceEvents: ['memory_anchor_created'],
        targetSystems: ['canonical_db', 'complize', 'azure_storage'],
        syncFrequency: 'immediate',
        retryPolicy: {
          maxRetries: 5,
          backoffMs: 500,
          exponentialBackoff: false
        },
        enabled: true
      }
    ];

    syncRules.forEach(rule => {
      this.syncRules.set(rule.id, rule);
    });

    console.log(`🔄 Configured ${syncRules.length} sync rules`);
  }

  private setupEventListeners(): void {
    // Listen for orchestration events
    this.on('orchestration_event', this.handleOrchestrationEvent.bind(this));
    
    // Listen for MCP server events
    this.on('mcp_event', this.handleMCPEvent.bind(this));
    
    // Listen for governance events
    this.on('governance_event', this.handleGovernanceEvent.bind(this));

    console.log('📡 Event listeners configured');
  }

  private startEventProcessingLoop(): void {
    setInterval(async () => {
      if (!this.processingQueue && this.eventQueue.length > 0) {
        await this.processEventQueue();
      }
    }, 1000); // Process every second

    console.log('🔄 Event processing loop started');
  }

  // Event Processing

  async processEvent(event: OrchestrationEvent): Promise<void> {
    console.log('📥 Processing orchestration event:', event.type, event.id);

    try {
      // Add to queue for processing
      this.eventQueue.push(event);

      // Update metrics
      this.eventMetrics.processed++;

      // Log for audit
      await this.logEventProcessing(event);

      console.log(`✅ Event queued for processing: ${event.id}`);
    } catch (error) {
      console.error(`❌ Failed to process event ${event.id}:`, error);
      this.eventMetrics.failed++;
    }
  }

  private async processEventQueue(): Promise<void> {
    if (this.processingQueue || this.eventQueue.length === 0) return;

    this.processingQueue = true;

    try {
      console.log(`🔄 Processing event queue: ${this.eventQueue.length} events`);

      while (this.eventQueue.length > 0) {
        const event = this.eventQueue.shift();
        if (event) {
          await this.processIndividualEvent(event);
        }
      }

    } catch (error) {
      console.error('❌ Event queue processing failed:', error);
    } finally {
      this.processingQueue = false;
    }
  }

  private async processIndividualEvent(event: OrchestrationEvent): Promise<void> {
    console.log('⚙️ Processing individual event:', event.id);

    try {
      // Check for auto-creation rules
      await this.checkAutoCreationRules(event);

      // Check for sync rules
      await this.checkSyncRules(event);

      // Emit completion event
      this.emit('event_processed', event);

      console.log(`✅ Event processed successfully: ${event.id}`);
    } catch (error) {
      console.error(`❌ Failed to process individual event ${event.id}:`, error);
      
      // Retry logic could go here
      await this.handleEventProcessingError(event, error);
    }
  }

  private async checkAutoCreationRules(event: OrchestrationEvent): Promise<void> {
    console.log('🎯 Checking auto-creation rules for event:', event.type);

    for (const [ruleId, rule] of this.autoCreationRules) {
      if (!rule.enabled || !rule.auCompliant) continue;

      // Check if event triggers this rule
      if (rule.eventTriggers.includes(event.type)) {
        // Check conditions
        if (await this.evaluateRuleConditions(rule, event)) {
          await this.executeAutoCreationRule(rule, event);
        }
      }
    }
  }

  private async evaluateRuleConditions(rule: PhaseStepAutoCreationRule, event: OrchestrationEvent): Promise<boolean> {
    // Check basic conditions
    if (rule.conditions.eventType !== event.type) return false;
    if (rule.conditions.projectId && rule.conditions.projectId !== event.projectId) return false;
    if (rule.conditions.phaseId && rule.conditions.phaseId !== event.phaseId) return false;

    // Check data pattern matching
    if (rule.conditions.dataPattern) {
      return this.matchesDataPattern(event.data, rule.conditions.dataPattern);
    }

    return true;
  }

  private matchesDataPattern(eventData: any, pattern: any): boolean {
    // Simple pattern matching - can be enhanced for complex patterns
    for (const key in pattern) {
      if (Array.isArray(pattern[key])) {
        if (!pattern[key].includes(eventData[key])) return false;
      } else if (eventData[key] !== pattern[key]) {
        return false;
      }
    }
    return true;
  }

  private async executeAutoCreationRule(rule: PhaseStepAutoCreationRule, event: OrchestrationEvent): Promise<void> {
    console.log('🎯 Executing auto-creation rule:', rule.name);

    try {
      // Generate step details from template
      const stepName = this.processTemplate(rule.stepTemplate.namePattern, event);
      const stepDescription = this.processTemplate(rule.stepTemplate.descriptionPattern, event);
      
      // Calculate due date
      const dueDate = this.calculateDueDate(rule.stepTemplate.dueDateRules);

      // Create PhaseStep via MCP MSSQL Server
      const createdStep = await mcpMSSQLServer.executeTool('create_phase_step', {
        projectId: event.projectId,
        phaseId: event.phaseId || 'default',
        stepName,
        description: stepDescription,
        governanceEventId: event.id,
        priority: rule.stepTemplate.priority,
        dueDate
      });

      // Update metrics
      this.eventMetrics.stepsCreated++;

      // Create governance log for auto-creation
      enhancedGovernanceLogger.createPhaseAnchor(
        `auto-step-created-${createdStep.id}`,
        'automation'
      );

      console.log(`✅ Auto-created PhaseStep: ${createdStep.id}`);
    } catch (error) {
      console.error(`❌ Failed to execute auto-creation rule ${rule.id}:`, error);
    }
  }

  private async checkSyncRules(event: OrchestrationEvent): Promise<void> {
    console.log('🔄 Checking sync rules for event:', event.type);

    for (const [ruleId, rule] of this.syncRules) {
      if (!rule.enabled) continue;

      // Check if event should trigger sync
      if (rule.sourceEvents.includes(event.type)) {
        await this.executeSyncRule(rule, event);
      }
    }
  }

  private async executeSyncRule(rule: GovernanceSyncRule, event: OrchestrationEvent): Promise<void> {
    console.log('🔄 Executing sync rule:', rule.name);

    try {
      for (const targetSystem of rule.targetSystems) {
        await this.syncToTargetSystem(targetSystem, event, rule);
      }

      // Update metrics
      this.eventMetrics.syncsCompleted++;

      console.log(`✅ Sync rule executed: ${rule.name}`);
    } catch (error) {
      console.error(`❌ Failed to execute sync rule ${rule.id}:`, error);
      
      // Retry logic
      await this.retrySyncRule(rule, event, error);
    }
  }

  private async syncToTargetSystem(targetSystem: string, event: OrchestrationEvent, rule: GovernanceSyncRule): Promise<void> {
    console.log(`🎯 Syncing to target system: ${targetSystem}`);

    switch (targetSystem) {
      case 'canonical_db':
        await this.syncToCanonicalDB(event);
        break;
      case 'complize':
        await this.syncToComplize(event);
        break;
      case 'azure_storage':
        await this.syncToAzureStorage(event);
        break;
      case 'memory_anchors':
        await this.syncToMemoryAnchors(event);
        break;
      default:
        console.warn(`Unknown target system: ${targetSystem}`);
    }
  }

  private async syncToCanonicalDB(event: OrchestrationEvent): Promise<void> {
    await mcpMSSQLServer.executeTool('sync_governance_events', {
      events: [{
        eventId: event.id,
        timestamp: event.timestamp,
        eventType: event.type,
        projectId: event.projectId,
        phaseId: event.phaseId,
        data: event.data,
        memoryAnchor: event.metadata.memoryAnchor
      }]
    });
  }

  private async syncToComplize(event: OrchestrationEvent): Promise<void> {
    if (event.type === 'memory_anchor_created') {
      await mcpAzureServer.storeMemoryAnchorComplize({
        anchorId: event.data.anchorId,
        projectId: event.projectId,
        phaseId: event.phaseId,
        content: event.data.content,
        tags: event.data.tags,
        metadata: event.metadata
      });
    }
  }

  private async syncToAzureStorage(event: OrchestrationEvent): Promise<void> {
    const filename = `governance_event_${event.id}_${Date.now()}.json`;
    await mcpAzureServer.uploadGovernanceArtifact({
      filename,
      content: JSON.stringify(event),
      contentType: 'application/json',
      metadata: {
        projectId: event.projectId,
        eventType: event.type,
        compliance: 'AU-resident'
      }
    });
  }

  private async syncToMemoryAnchors(event: OrchestrationEvent): Promise<void> {
    if (event.metadata.memoryAnchor) {
      await mcpMSSQLServer.executeTool('create_memory_anchor', {
        anchorId: event.metadata.memoryAnchor,
        projectId: event.projectId,
        phaseId: event.phaseId,
        stepId: event.stepId,
        anchorType: event.type,
        content: event.data,
        tags: ['auto-generated', 'event-driven']
      });
    }
  }

  // Utility Methods

  private processTemplate(template: string, event: OrchestrationEvent): string {
    return template
      .replace('{eventAction}', event.data.action || event.type)
      .replace('{eventId}', event.id)
      .replace('{anchorType}', event.data.anchorType || 'unknown')
      .replace('{anchorId}', event.data.anchorId || 'unknown')
      .replace('{milestoneType}', event.data.milestoneType || 'unknown')
      .replace('{description}', event.data.description || 'No description');
  }

  private calculateDueDate(dueDateRules: any): string {
    const addDays = dueDateRules.addDays || 7;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + addDays);
    return dueDate.toISOString();
  }

  private async retrySyncRule(rule: GovernanceSyncRule, event: OrchestrationEvent, error: any): Promise<void> {
    console.log(`🔄 Retrying sync rule: ${rule.name}`);
    
    // Simple retry logic - can be enhanced
    for (let attempt = 1; attempt <= rule.retryPolicy.maxRetries; attempt++) {
      try {
        await new Promise(resolve => setTimeout(resolve, rule.retryPolicy.backoffMs * attempt));
        await this.executeSyncRule(rule, event);
        console.log(`✅ Sync rule retry successful on attempt ${attempt}`);
        return;
      } catch (retryError) {
        console.error(`❌ Sync rule retry attempt ${attempt} failed:`, retryError);
      }
    }

    console.error(`❌ Sync rule failed after ${rule.retryPolicy.maxRetries} retries`);
  }

  private async handleEventProcessingError(event: OrchestrationEvent, error: any): Promise<void> {
    console.error(`❌ Event processing error for ${event.id}:`, error);
    
    // Log error for audit
    const errorLog = {
      timestamp: new Date().toISOString(),
      eventId: event.id,
      eventType: event.type,
      projectId: event.projectId,
      error: error.message,
      compliance: 'AU-resident'
    };

    console.log('🔍 Error audit:', JSON.stringify(errorLog));
  }

  private async logEventProcessing(event: OrchestrationEvent): Promise<void> {
    const auditEntry = {
      timestamp: new Date().toISOString(),
      operation: 'event_processing',
      eventId: event.id,
      eventType: event.type,
      projectId: event.projectId,
      priority: event.priority,
      source: 'event-driven-orchestrator',
      compliance: 'AU-resident'
    };

    console.log('🔍 Event audit:', JSON.stringify(auditEntry));
  }

  // Event Handlers

  private async handleOrchestrationEvent(event: OrchestrationEvent): Promise<void> {
    await this.processEvent(event);
  }

  private async handleMCPEvent(event: any): Promise<void> {
    console.log('📥 Handling MCP event:', event.type);
    
    // Convert MCP event to orchestration event if needed
    const orchestrationEvent: OrchestrationEvent = {
      id: event.id || `mcp_${Date.now()}`,
      type: event.type,
      source: 'mcp-server',
      timestamp: new Date().toISOString(),
      projectId: event.projectId || 'unknown',
      phaseId: event.phaseId,
      stepId: event.stepId,
      data: event.data || {},
      priority: 'medium',
      triggers: [],
      metadata: {
        compliance: 'AU-resident',
        auditTrail: event.auditTrail || 'mcp-generated'
      }
    };

    await this.processEvent(orchestrationEvent);
  }

  private async handleGovernanceEvent(event: any): Promise<void> {
    console.log('📥 Handling governance event:', event.eventType);
    
    // Convert governance event to orchestration event
    const orchestrationEvent: OrchestrationEvent = {
      id: event.eventId || `gov_${Date.now()}`,
      type: 'governance_log_created',
      source: 'governance-logger',
      timestamp: event.timestamp || new Date().toISOString(),
      projectId: event.projectId || 'unknown',
      phaseId: event.phaseId,
      stepId: event.stepId,
      data: event.data || {},
      priority: 'medium',
      triggers: ['auto_phase_step_creation', 'governance_sync'],
      metadata: {
        compliance: 'AU-resident',
        auditTrail: event.auditTrail || 'governance-generated',
        memoryAnchor: event.memoryAnchor
      }
    };

    await this.processEvent(orchestrationEvent);
  }

  // Public API

  async createEvent(eventData: Partial<OrchestrationEvent>): Promise<string> {
    const event: OrchestrationEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: eventData.type || 'governance_log_created',
      source: eventData.source || 'manual',
      timestamp: new Date().toISOString(),
      projectId: eventData.projectId || 'unknown',
      phaseId: eventData.phaseId,
      stepId: eventData.stepId,
      data: eventData.data || {},
      priority: eventData.priority || 'medium',
      triggers: eventData.triggers || [],
      metadata: {
        compliance: 'AU-resident',
        auditTrail: 'user-generated',
        ...eventData.metadata
      }
    };

    await this.processEvent(event);
    return event.id;
  }

  getMetrics(): typeof this.eventMetrics {
    return { ...this.eventMetrics };
  }

  getQueueStatus(): { length: number; processing: boolean } {
    return {
      length: this.eventQueue.length,
      processing: this.processingQueue
    };
  }

  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: Record<string, boolean>;
    metrics: typeof this.eventMetrics;
    queueStatus: { length: number; processing: boolean };
  }> {
    const checks = {
      initialized: this.initialized,
      rulesConfigured: this.autoCreationRules.size > 0 && this.syncRules.size > 0,
      mcpServersReady: await this.checkMCPServersHealth(),
      queueHealthy: this.eventQueue.length < 1000, // Arbitrary threshold
      processingHealthy: !this.processingQueue || this.eventQueue.length === 0
    };

    const healthyChecks = Object.values(checks).filter(Boolean).length;
    let status: 'healthy' | 'degraded' | 'unhealthy';

    if (healthyChecks === Object.keys(checks).length) {
      status = 'healthy';
    } else if (healthyChecks >= 3) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    return {
      status,
      checks,
      metrics: this.getMetrics(),
      queueStatus: this.getQueueStatus()
    };
  }

  private async checkMCPServersHealth(): Promise<boolean> {
    try {
      const mssqlHealth = await mcpMSSQLServer.healthCheck();
      const azureHealth = await mcpAzureServer.healthCheck();
      
      return mssqlHealth.status !== 'unhealthy' && azureHealth.status !== 'unhealthy';
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const eventDrivenOrchestrator = new EventDrivenOrchestrator();
export default eventDrivenOrchestrator;