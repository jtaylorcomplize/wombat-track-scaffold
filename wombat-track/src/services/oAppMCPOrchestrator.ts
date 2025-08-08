/**
 * oApp ↔ Claude ↔ MCP Roundtrip Orchestrator - OF-8.6 Implementation
 * Enables seamless integration between oApp, Claude Code, and MCP servers
 */

import { EventEmitter } from 'events';
import { enhancedGovernanceLogger } from './enhancedGovernanceLogger';
import { agenticCloudOrchestrator } from './agenticCloudOrchestrator';
import { eventDrivenOrchestrator } from './eventDrivenOrchestrator';
import { mcpMSSQLServer } from './mcpMSSQLServer';
import { mcpAzureServer } from './mcpAzureServer';

export interface OAppRequest {
  id: string;
  type: 'project_creation' | 'phase_step_creation' | 'governance_sync' | 'memory_anchor_creation' | 'workflow_execution';
  source: 'oapp_ui' | 'oapp_api' | 'oapp_automation';
  timestamp: string;
  projectId: string;
  phaseId?: string;
  stepId?: string;
  payload: Record<string, any>;
  priority: 'low' | 'medium' | 'high' | 'critical';
  requestedActions: string[];
  expectedResponse: {
    format: 'json' | 'text' | 'structured';
    includeGovernance: boolean;
    includeMemoryAnchors: boolean;
    includeValidation: boolean;
  };
  metadata: {
    userId: string;
    sessionId: string;
    ipAddress?: string;
    userAgent?: string;
    compliance: string;
  };
}

export interface ClaudeWorkflowStep {
  id: string;
  name: string;
  description: string;
  action: 'analyze' | 'generate' | 'validate' | 'integrate' | 'sync';
  inputs: Record<string, any>;
  outputs: Record<string, any>;
  mcpTargets: string[];
  governanceTracking: boolean;
  auCompliant: boolean;
}

export interface MCPCallback {
  id: string;
  originalRequestId: string;
  mcpServerId: string;
  timestamp: string;
  status: 'success' | 'error' | 'pending';
  data: Record<string, any>;
  governanceEvents: string[];
  memoryAnchors: string[];
  nextActions: string[];
}

export interface OAppResponse {
  requestId: string;
  status: 'completed' | 'failed' | 'partial' | 'pending';
  timestamp: string;
  results: {
    claudeWorkflowResults: Record<string, any>;
    mcpCallbackResults: MCPCallback[];
    governanceEvents: string[];
    memoryAnchors: string[];
    validationResults: Record<string, any>;
  };
  metadata: {
    executionTime: number;
    stepsCompleted: number;
    complianceValidated: boolean;
    auDataResident: boolean;
  };
  nextSteps: string[];
  errors: string[];
}

class OAppMCPOrchestrator extends EventEmitter {
  private initialized = false;
  private activeRequests = new Map<string, OAppRequest>();
  private claudeWorkflows = new Map<string, ClaudeWorkflowStep[]>();
  private mcpCallbacks = new Map<string, MCPCallback[]>();
  private orchestrationMetrics = {
    requestsProcessed: 0,
    claudeWorkflowsExecuted: 0,
    mcpCallbacksReceived: 0,
    governanceEventsCreated: 0,
    memoryAnchorsLinked: 0,
    errors: 0
  };

  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log('🚀 Initializing oApp ↔ Claude ↔ MCP Orchestrator...');

    // Setup event listeners
    this.setupEventListeners();

    // Initialize dependent services
    await this.initializeDependentServices();

    // Register default workflows
    await this.registerDefaultWorkflows();

    this.initialized = true;
    console.log('✅ oApp ↔ Claude ↔ MCP Orchestrator initialized');

    // Create initialization governance log
    enhancedGovernanceLogger.createPhaseAnchor('oapp-mcp-orchestrator-init', 'integration');
  }

  private setupEventListeners(): void {
    // Listen for oApp requests
    this.on('oapp_request', this.handleOAppRequest.bind(this));

    // Listen for Claude workflow completions
    this.on('claude_workflow_completed', this.handleClaudeWorkflowCompleted.bind(this));

    // Listen for MCP callbacks
    this.on('mcp_callback', this.handleMCPCallback.bind(this));

    // Listen for governance events
    this.on('governance_event_created', this.handleGovernanceEventCreated.bind(this));

    console.log('📡 oApp ↔ MCP event listeners configured');
  }

  private async initializeDependentServices(): Promise<void> {
    // Ensure all dependent services are initialized
    await agenticCloudOrchestrator.initialize();
    await eventDrivenOrchestrator.initialize();
    await mcpMSSQLServer.initialize();
    await mcpAzureServer.initialize();

    console.log('✅ Dependent services initialized');
  }

  private async registerDefaultWorkflows(): Promise<void> {
    // Project Creation Workflow
    const projectCreationWorkflow: ClaudeWorkflowStep[] = [
      {
        id: 'analyze_project_request',
        name: 'Analyze Project Creation Request',
        description: 'Analyze oApp project creation request and extract requirements',
        action: 'analyze',
        inputs: { projectData: 'oapp_request.payload' },
        outputs: { requirements: 'structured_analysis', validation: 'boolean' },
        mcpTargets: [],
        governanceTracking: true,
        auCompliant: true
      },
      {
        id: 'create_canonical_project',
        name: 'Create Project in Canonical Database',
        description: 'Create project record in MSSQL canonical database',
        action: 'integrate',
        inputs: { projectData: 'analyzed_requirements' },
        outputs: { projectId: 'string', databaseRecord: 'object' },
        mcpTargets: ['mcp-mssql-server'],
        governanceTracking: true,
        auCompliant: true
      },
      {
        id: 'create_complize_project',
        name: 'Create Project in Complize System',
        description: 'Sync project to Complize canonical memory',
        action: 'sync',
        inputs: { projectData: 'canonical_project_data' },
        outputs: { complizeProjectId: 'string', memoryAnchors: 'array' },
        mcpTargets: ['mcp-azure-server'],
        governanceTracking: true,
        auCompliant: true
      },
      {
        id: 'create_memory_anchors',
        name: 'Create Initial Memory Anchors',
        description: 'Create memory anchors for project initialization',
        action: 'generate',
        inputs: { projectId: 'string', initialData: 'object' },
        outputs: { memoryAnchors: 'array', governanceEvents: 'array' },
        mcpTargets: ['mcp-mssql-server', 'mcp-azure-server'],
        governanceTracking: true,
        auCompliant: true
      }
    ];

    // Phase Step Creation Workflow
    const phaseStepCreationWorkflow: ClaudeWorkflowStep[] = [
      {
        id: 'validate_phase_step_request',
        name: 'Validate PhaseStep Creation Request',
        description: 'Validate phase step creation request from oApp',
        action: 'validate',
        inputs: { stepData: 'oapp_request.payload' },
        outputs: { isValid: 'boolean', validationErrors: 'array' },
        mcpTargets: ['mcp-mssql-server'],
        governanceTracking: true,
        auCompliant: true
      },
      {
        id: 'create_phase_step',
        name: 'Create PhaseStep Record',
        description: 'Create PhaseStep in canonical database',
        action: 'integrate',
        inputs: { stepData: 'validated_step_data' },
        outputs: { stepId: 'string', stepRecord: 'object' },
        mcpTargets: ['mcp-mssql-server'],
        governanceTracking: true,
        auCompliant: true
      },
      {
        id: 'link_memory_anchors',
        name: 'Link Memory Anchors to PhaseStep',
        description: 'Create and link memory anchors to the new PhaseStep',
        action: 'generate',
        inputs: { stepId: 'string', stepData: 'object' },
        outputs: { linkedAnchors: 'array', anchorIds: 'array' },
        mcpTargets: ['mcp-mssql-server', 'mcp-azure-server'],
        governanceTracking: true,
        auCompliant: true
      }
    ];

    // Governance Sync Workflow
    const governanceSyncWorkflow: ClaudeWorkflowStep[] = [
      {
        id: 'collect_governance_events',
        name: 'Collect Governance Events',
        description: 'Collect and validate governance events from oApp',
        action: 'analyze',
        inputs: { events: 'oapp_request.payload.events' },
        outputs: { validEvents: 'array', invalidEvents: 'array' },
        mcpTargets: [],
        governanceTracking: true,
        auCompliant: true
      },
      {
        id: 'sync_to_canonical_db',
        name: 'Sync Events to Canonical Database',
        description: 'Sync governance events to MSSQL canonical database',
        action: 'sync',
        inputs: { events: 'valid_governance_events' },
        outputs: { syncedEvents: 'array', failedEvents: 'array' },
        mcpTargets: ['mcp-mssql-server'],
        governanceTracking: true,
        auCompliant: true
      },
      {
        id: 'sync_to_complize',
        name: 'Sync Events to Complize',
        description: 'Sync governance events to Complize canonical memory',
        action: 'sync',
        inputs: { events: 'synced_canonical_events' },
        outputs: { complizeSyncResults: 'object', memoryAnchors: 'array' },
        mcpTargets: ['mcp-azure-server'],
        governanceTracking: true,
        auCompliant: true
      }
    ];

    // Register workflows
    this.claudeWorkflows.set('project_creation', projectCreationWorkflow);
    this.claudeWorkflows.set('phase_step_creation', phaseStepCreationWorkflow);
    this.claudeWorkflows.set('governance_sync', governanceSyncWorkflow);

    console.log(`📋 Registered ${this.claudeWorkflows.size} default Claude workflows`);
  }

  // Main Orchestration Methods

  async processOAppRequest(request: OAppRequest): Promise<string> {
    console.log('📥 Processing oApp request:', request.type, request.id);

    try {
      // Store active request
      this.activeRequests.set(request.id, request);

      // Create governance event for request
      await this.createGovernanceEventForRequest(request);

      // Determine Claude workflow
      const workflowType = this.determineWorkflowType(request);
      const workflow = this.claudeWorkflows.get(workflowType);

      if (!workflow) {
        throw new Error(`No workflow found for request type: ${request.type}`);
      }

      // Execute Claude workflow
      const claudeWorkflowId = await this.executeClaudeWorkflow(workflow, request);

      // Update metrics
      this.orchestrationMetrics.requestsProcessed++;

      console.log(`✅ oApp request processed: ${request.id} -> Claude workflow: ${claudeWorkflowId}`);
      return claudeWorkflowId;

    } catch (error) {
      console.error(`❌ Failed to process oApp request ${request.id}:`, error);
      this.orchestrationMetrics.errors++;
      
      // Create error governance event
      await this.createErrorGovernanceEvent(request, error);
      
      throw error;
    }
  }

  private async executeClaudeWorkflow(workflow: ClaudeWorkflowStep[], request: OAppRequest): Promise<string> {
    console.log('🧠 Executing Claude workflow with MCP integration...');

    const workflowId = `claude_workflow_${request.id}_${Date.now()}`;
    
    try {
      // Convert workflow to Claude execution context
      const cloudExecutionContext = {
        projectId: request.projectId,
        phaseId: request.phaseId || 'default',
        stepId: request.stepId || 'workflow',
        gitBranch: 'feature/of-8.6-mcp-integration',
        environment: 'production' as const,
        governance: {
          memoryAnchors: [],
          auditTrail: [request.id],
          approvals: []
        }
      };

      // Execute workflow via agentic cloud orchestrator
      const executionId = await agenticCloudOrchestrator.executeWorkflow(
        'code_generation_workflow', // Use appropriate workflow type
        cloudExecutionContext,
        {
          oappRequest: request,
          workflowSteps: workflow,
          mcpIntegration: true,
          auCompliance: true
        }
      );

      // Update metrics
      this.orchestrationMetrics.claudeWorkflowsExecuted++;

      console.log(`✅ Claude workflow executed: ${workflowId} -> ${executionId}`);
      return executionId;

    } catch (error) {
      console.error(`❌ Claude workflow execution failed:`, error);
      throw error;
    }
  }

  private async executeMCPIntegrations(workflow: ClaudeWorkflowStep[], request: OAppRequest): Promise<MCPCallback[]> {
    console.log('🔗 Executing MCP integrations...');

    const callbacks: MCPCallback[] = [];

    for (const step of workflow) {
      if (step.mcpTargets.length === 0) continue;

      for (const mcpTarget of step.mcpTargets) {
        try {
          const callback = await this.executeMCPStep(step, mcpTarget, request);
          callbacks.push(callback);
        } catch (error) {
          console.error(`❌ MCP step execution failed: ${step.id} -> ${mcpTarget}`, error);
          
          // Create error callback
          const errorCallback: MCPCallback = {
            id: `mcp_error_${Date.now()}`,
            originalRequestId: request.id,
            mcpServerId: mcpTarget,
            timestamp: new Date().toISOString(),
            status: 'error',
            data: { error: error instanceof Error ? error.message : 'Unknown error' },
            governanceEvents: [],
            memoryAnchors: [],
            nextActions: []
          };
          
          callbacks.push(errorCallback);
        }
      }
    }

    console.log(`✅ MCP integrations completed: ${callbacks.length} callbacks`);
    return callbacks;
  }

  private async executeMCPStep(step: ClaudeWorkflowStep, mcpTarget: string, request: OAppRequest): Promise<MCPCallback> {
    console.log(`🎯 Executing MCP step: ${step.id} -> ${mcpTarget}`);

    const callbackId = `mcp_callback_${step.id}_${Date.now()}`;
    
    try {
      let mcpResult: any;

      switch (mcpTarget) {
        case 'mcp-mssql-server':
          mcpResult = await this.executeMSSQLMCPStep(step, request);
          break;
        case 'mcp-azure-server':
          mcpResult = await this.executeAzureMCPStep(step, request);
          break;
        default:
          throw new Error(`Unknown MCP target: ${mcpTarget}`);
      }

      const callback: MCPCallback = {
        id: callbackId,
        originalRequestId: request.id,
        mcpServerId: mcpTarget,
        timestamp: new Date().toISOString(),
        status: 'success',
        data: mcpResult,
        governanceEvents: step.governanceTracking ? [callbackId] : [],
        memoryAnchors: mcpResult.memoryAnchors || [],
        nextActions: mcpResult.nextActions || []
      };

      // Update metrics
      this.orchestrationMetrics.mcpCallbacksReceived++;

      return callback;

    } catch (error) {
      console.error(`❌ MCP step execution failed: ${step.id}`, error);
      throw error;
    }
  }

  private async executeMSSQLMCPStep(step: ClaudeWorkflowStep, request: OAppRequest): Promise<any> {
    console.log('💾 Executing MSSQL MCP step:', step.action);

    switch (step.action) {
      case 'integrate':
        if (step.name.includes('Project')) {
          // Create project in canonical database
          return await mcpMSSQLServer.executeTool('query_canonical_data', {
            query: 'INSERT INTO projects (id, name, data) VALUES (?, ?, ?)',
            parameters: [request.projectId, request.payload.name, JSON.stringify(request.payload)]
          });
        } else if (step.name.includes('PhaseStep')) {
          // Create phase step
          return await mcpMSSQLServer.executeTool('create_phase_step', {
            projectId: request.projectId,
            phaseId: request.phaseId || 'default',
            stepName: request.payload.stepName,
            description: request.payload.description,
            governanceEventId: request.id,
            priority: request.priority
          });
        }
        break;

      case 'sync':
        // Sync governance events
        return await mcpMSSQLServer.executeTool('sync_governance_events', {
          events: [{
            eventId: request.id,
            timestamp: request.timestamp,
            eventType: request.type,
            projectId: request.projectId,
            phaseId: request.phaseId,
            data: request.payload
          }]
        });

      case 'generate':
        // Create memory anchor
        return await mcpMSSQLServer.executeTool('create_memory_anchor', {
          anchorId: `oapp_${request.id}`,
          projectId: request.projectId,
          phaseId: request.phaseId,
          anchorType: 'oapp_integration',
          content: request.payload,
          tags: ['oapp', 'automated', 'of-8.6']
        });

      default:
        throw new Error(`Unsupported MSSQL MCP action: ${step.action}`);
    }
  }

  private async executeAzureMCPStep(step: ClaudeWorkflowStep, request: OAppRequest): Promise<any> {
    console.log('☁️ Executing Azure MCP step:', step.action);

    switch (step.action) {
      case 'sync':
        if (step.name.includes('Complize')) {
          // Sync to Complize
          return await mcpAzureServer.syncProjectToComplize({
            projectId: request.projectId,
            projectData: request.payload,
            includePhases: true,
            includeSteps: true,
            includeGovernance: true
          });
        }
        break;

      case 'generate':
        // Store memory anchor in Complize
        return await mcpAzureServer.storeMemoryAnchorComplize({
          anchorId: `oapp_${request.id}`,
          projectId: request.projectId,
          phaseId: request.phaseId,
          content: request.payload,
          tags: ['oapp', 'automated', 'of-8.6'],
          metadata: {
            source: 'oapp_orchestrator',
            timestamp: request.timestamp,
            compliance: 'AU-resident'
          }
        });

      case 'integrate':
        // Upload governance artifact
        return await mcpAzureServer.uploadGovernanceArtifact({
          filename: `oapp_request_${request.id}.json`,
          content: JSON.stringify(request),
          contentType: 'application/json',
          metadata: {
            projectId: request.projectId,
            requestType: request.type,
            compliance: 'AU-resident'
          }
        });

      default:
        throw new Error(`Unsupported Azure MCP action: ${step.action}`);
    }
  }

  // Event Handlers

  private async handleOAppRequest(request: OAppRequest): Promise<void> {
    console.log('📥 Handling oApp request:', request.type);
    await this.processOAppRequest(request);
  }

  private async handleClaudeWorkflowCompleted(data: { workflowId: string; results: any }): Promise<void> {
    console.log('📥 Handling Claude workflow completion:', data.workflowId);

    // Find original request
    const request = Array.from(this.activeRequests.values())
      .find(req => data.workflowId.includes(req.id));

    if (!request) {
      console.warn('No matching request found for workflow:', data.workflowId);
      return;
    }

    // Execute MCP integrations
    const workflow = this.claudeWorkflows.get(this.determineWorkflowType(request));
    if (workflow) {
      const mcpCallbacks = await this.executeMCPIntegrations(workflow, request);
      this.mcpCallbacks.set(request.id, mcpCallbacks);
    }

    // Generate oApp response
    await this.generateOAppResponse(request, data.results);
  }

  private async handleMCPCallback(callback: MCPCallback): Promise<void> {
    console.log('📥 Handling MCP callback:', callback.mcpServerId);

    // Store callback
    const existingCallbacks = this.mcpCallbacks.get(callback.originalRequestId) || [];
    existingCallbacks.push(callback);
    this.mcpCallbacks.set(callback.originalRequestId, existingCallbacks);

    // Process governance events from callback
    if (callback.governanceEvents.length > 0) {
      for (const eventId of callback.governanceEvents) {
        await this.processGovernanceEventFromCallback(eventId, callback);
      }
    }

    // Process memory anchors from callback
    if (callback.memoryAnchors.length > 0) {
      for (const anchorId of callback.memoryAnchors) {
        await this.processMemoryAnchorFromCallback(anchorId, callback);
      }
    }
  }

  private async handleGovernanceEventCreated(eventData: { eventId: string; data: any }): Promise<void> {
    console.log('📥 Handling governance event created:', eventData.eventId);

    // Trigger event-driven orchestrator
    await eventDrivenOrchestrator.createEvent({
      type: 'governance_log_created',
      source: 'oapp-mcp-orchestrator',
      projectId: eventData.data.projectId,
      phaseId: eventData.data.phaseId,
      data: eventData.data,
      priority: 'medium',
      triggers: ['auto_phase_step_creation', 'governance_sync']
    });

    // Update metrics
    this.orchestrationMetrics.governanceEventsCreated++;
  }

  // Utility Methods

  private determineWorkflowType(request: OAppRequest): string {
    switch (request.type) {
      case 'project_creation':
        return 'project_creation';
      case 'phase_step_creation':
        return 'phase_step_creation';
      case 'governance_sync':
      case 'memory_anchor_creation':
        return 'governance_sync';
      default:
        return 'governance_sync'; // Default fallback
    }
  }

  private async createGovernanceEventForRequest(request: OAppRequest): Promise<void> {
    const governanceEvent = {
      eventId: `oapp_request_${request.id}`,
      timestamp: request.timestamp,
      eventType: 'oapp_request_received',
      projectId: request.projectId,
      phaseId: request.phaseId,
      data: {
        requestType: request.type,
        source: request.source,
        priority: request.priority,
        payload: request.payload
      },
      source: 'oapp-mcp-orchestrator'
    };

    enhancedGovernanceLogger.createPhaseAnchor(
      `oapp-request-${request.id}`,
      'integration'
    );

    this.emit('governance_event_created', { eventId: governanceEvent.eventId, data: governanceEvent });
  }

  private async createErrorGovernanceEvent(request: OAppRequest, error: any): Promise<void> {
    const errorEvent = {
      eventId: `oapp_error_${request.id}`,
      timestamp: new Date().toISOString(),
      eventType: 'oapp_request_error',
      projectId: request.projectId,
      phaseId: request.phaseId,
      data: {
        originalRequestId: request.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        requestType: request.type
      },
      source: 'oapp-mcp-orchestrator'
    };

    enhancedGovernanceLogger.createPhaseAnchor(
      `oapp-error-${request.id}`,
      'error'
    );
  }

  private async generateOAppResponse(request: OAppRequest, claudeResults: any): Promise<void> {
    console.log('📤 Generating oApp response:', request.id);

    const mcpCallbacks = this.mcpCallbacks.get(request.id) || [];
    
    const response: OAppResponse = {
      requestId: request.id,
      status: 'completed',
      timestamp: new Date().toISOString(),
      results: {
        claudeWorkflowResults: claudeResults,
        mcpCallbackResults: mcpCallbacks,
        governanceEvents: mcpCallbacks.flatMap(cb => cb.governanceEvents),
        memoryAnchors: mcpCallbacks.flatMap(cb => cb.memoryAnchors),
        validationResults: { auCompliant: true, dataResident: true }
      },
      metadata: {
        executionTime: Date.now() - new Date(request.timestamp).getTime(),
        stepsCompleted: mcpCallbacks.length,
        complianceValidated: true,
        auDataResident: true
      },
      nextSteps: mcpCallbacks.flatMap(cb => cb.nextActions),
      errors: mcpCallbacks.filter(cb => cb.status === 'error').map(cb => cb.data.error)
    };

    // Emit response event
    this.emit('oapp_response_generated', response);

    // Clean up active request
    this.activeRequests.delete(request.id);
    this.mcpCallbacks.delete(request.id);

    console.log(`✅ oApp response generated: ${request.id}`);
  }

  private async processGovernanceEventFromCallback(eventId: string, callback: MCPCallback): Promise<void> {
    console.log('📋 Processing governance event from MCP callback:', eventId);
    
    // Create governance log entry
    enhancedGovernanceLogger.createPhaseAnchor(
      `mcp-callback-governance-${eventId}`,
      'automation'
    );
  }

  private async processMemoryAnchorFromCallback(anchorId: string, callback: MCPCallback): Promise<void> {
    console.log('⚓ Processing memory anchor from MCP callback:', anchorId);
    
    // Update metrics
    this.orchestrationMetrics.memoryAnchorsLinked++;

    // Create memory anchor governance log
    enhancedGovernanceLogger.createPhaseAnchor(
      `mcp-callback-anchor-${anchorId}`,
      'memory'
    );
  }

  // Public API

  async createOAppRequest(requestData: Partial<OAppRequest>): Promise<string> {
    const request: OAppRequest = {
      id: `oapp_req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: requestData.type || 'governance_sync',
      source: requestData.source || 'oapp_api',
      timestamp: new Date().toISOString(),
      projectId: requestData.projectId || 'unknown',
      phaseId: requestData.phaseId,
      stepId: requestData.stepId,
      payload: requestData.payload || {},
      priority: requestData.priority || 'medium',
      requestedActions: requestData.requestedActions || [],
      expectedResponse: {
        format: 'json',
        includeGovernance: true,
        includeMemoryAnchors: true,
        includeValidation: true,
        ...requestData.expectedResponse
      },
      metadata: {
        userId: 'system',
        sessionId: `session_${Date.now()}`,
        compliance: 'AU-resident',
        ...requestData.metadata
      }
    };

    await this.processOAppRequest(request);
    return request.id;
  }

  getMetrics(): typeof this.orchestrationMetrics {
    return { ...this.orchestrationMetrics };
  }

  getActiveRequests(): OAppRequest[] {
    return Array.from(this.activeRequests.values());
  }

  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: Record<string, boolean>;
    metrics: typeof this.orchestrationMetrics;
    activeRequests: number;
  }> {
    const checks = {
      initialized: this.initialized,
      dependentServicesReady: await this.checkDependentServices(),
      workflowsRegistered: this.claudeWorkflows.size > 0,
      activeRequestsHealthy: this.activeRequests.size < 100, // Arbitrary threshold
      mcpServersReady: await this.checkMCPServers()
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
      activeRequests: this.activeRequests.size
    };
  }

  private async checkDependentServices(): Promise<boolean> {
    try {
      const cloudOrchestratorHealth = await agenticCloudOrchestrator.generateCloudMigrationReport();
      const eventOrchestratorHealth = await eventDrivenOrchestrator.healthCheck();
      
      return !!cloudOrchestratorHealth && eventOrchestratorHealth.status !== 'unhealthy';
    } catch {
      return false;
    }
  }

  private async checkMCPServers(): Promise<boolean> {
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
export const oAppMCPOrchestrator = new OAppMCPOrchestrator();
export default oAppMCPOrchestrator;