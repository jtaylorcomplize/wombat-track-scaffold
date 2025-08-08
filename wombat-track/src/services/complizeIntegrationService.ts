/**
 * Complize Integration Service - OF-8.6 Implementation
 * Full integration with Complize canonical memory system
 */

import { EventEmitter } from 'events';
import { enhancedGovernanceLogger } from './enhancedGovernanceLogger';
import { mcpAzureServer } from './mcpAzureServer';
import { mcpMSSQLServer } from './mcpMSSQLServer';

export interface ComplizeProject {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'completed' | 'archived' | 'on_hold';
  phases: ComplizePhase[];
  metadata: {
    createdAt: string;
    updatedAt: string;
    ownerId: string;
    tags: string[];
    compliance: string;
    dataResidency: string;
  };
  governance: {
    auditTrail: string[];
    memoryAnchors: string[];
    approvals: string[];
    checkpoints: string[];
  };
}

export interface ComplizePhase {
  id: string;
  projectId: string;
  name: string;
  description: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'blocked';
  steps: ComplizePhaseStep[];
  memoryAnchors: string[];
  governanceEvents: string[];
  progress: number;
  startDate?: string;
  endDate?: string;
  estimatedDuration?: number;
}

export interface ComplizePhaseStep {
  id: string;
  projectId: string;
  phaseId: string;
  name: string;
  description: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'blocked' | 'cancelled';
  progress: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignedTo?: string;
  dueDate?: string;
  completedAt?: string;
  memoryAnchors: string[];
  governanceEvents: string[];
  dependencies: string[];
  deliverables: string[];
  auditTrail: ComplizeAuditEntry[];
}

export interface ComplizeMemoryAnchor {
  id: string;
  anchorType: 'project' | 'phase' | 'step' | 'governance' | 'milestone' | 'decision';
  projectId: string;
  phaseId?: string;
  stepId?: string;
  title: string;
  content: Record<string, any>;
  tags: string[];
  linkedAnchors: string[];
  governanceEvents: string[];
  metadata: {
    createdAt: string;
    updatedAt: string;
    authorId: string;
    version: number;
    compliance: string;
    classification: 'public' | 'internal' | 'confidential' | 'restricted';
  };
  search: {
    keywords: string[];
    fullTextIndex: string;
    semanticEmbedding?: number[];
  };
}

export interface ComplizeAuditEntry {
  id: string;
  timestamp: string;
  action: 'created' | 'updated' | 'deleted' | 'accessed' | 'linked' | 'unlinked';
  actorId: string;
  actorType: 'user' | 'system' | 'automation' | 'integration';
  resourceType: 'project' | 'phase' | 'step' | 'memory_anchor' | 'governance_event';
  resourceId: string;
  changes: Record<string, { before: any; after: any }>;
  context: {
    source: string;
    sessionId: string;
    ipAddress?: string;
    userAgent?: string;
  };
  compliance: {
    dataResidency: string;
    retentionPolicy: string;
    auditLevel: 'low' | 'medium' | 'high' | 'critical';
  };
}

export interface ComplizeSyncResult {
  projectsSync: {
    created:number;
    updated: number;
    failed: number;
  };
  phasesSync: {
    created: number;
    updated: number;
    failed: number;
  };
  stepsSync: {
    created: number;
    updated: number;  
    failed: number;
  };
  memoryAnchorsSync: {
    created: number;
    updated: number;
    linked: number;
    failed: number;
  };
  governanceSync: {
    events: number;
    auditEntries: number;
    failed: number;
  };
  totalRecords: number;
  syncDuration: number;
  errors: string[];
}

class ComplizeIntegrationService extends EventEmitter {
  private initialized = false;
  private syncSchedule: NodeJS.Timeout | null = null;
  private syncMetrics = {
    totalSyncs: 0,
    successfulSyncs: 0,
    failedSyncs: 0,
    recordsSynced: 0,
    lastSync: '',
    averageSyncTime: 0
  };
  private memoryAnchorCache = new Map<string, ComplizeMemoryAnchor>();
  private projectCache = new Map<string, ComplizeProject>();

  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log('🚀 Initializing Complize Integration Service...');

    // Setup event listeners
    this.setupEventListeners();

    // Initialize sync schedule
    await this.setupSyncSchedule();

    // Perform initial sync
    await this.performInitialSync();

    this.initialized = true;
    console.log('✅ Complize Integration Service initialized');

    // Create initialization governance log
    enhancedGovernanceLogger.createPhaseAnchor('complize-integration-init', 'integration');
  }

  private setupEventListeners(): void {
    // Listen for project events
    this.on('project_created', this.handleProjectCreated.bind(this));
    this.on('project_updated', this.handleProjectUpdated.bind(this));

    // Listen for phase step events
    this.on('phase_step_created', this.handlePhaseStepCreated.bind(this));
    this.on('phase_step_updated', this.handlePhaseStepUpdated.bind(this));

    // Listen for memory anchor events
    this.on('memory_anchor_created', this.handleMemoryAnchorCreated.bind(this));
    this.on('memory_anchor_linked', this.handleMemoryAnchorLinked.bind(this));

    // Listen for governance events
    this.on('governance_event_created', this.handleGovernanceEventCreated.bind(this));

    console.log('📡 Complize event listeners configured');
  }

  private async setupSyncSchedule(): Promise<void> {
    // Setup periodic sync every 5 minutes
    this.syncSchedule = setInterval(async () => {
      try {
        await this.performIncrementalSync();
      } catch (error) {
        console.error('❌ Scheduled sync failed:', error);
      }
    }, 5 * 60 * 1000); // 5 minutes

    console.log('⏰ Complize sync schedule configured (5-minute intervals)');
  }

  private async performInitialSync(): Promise<void> {
    console.log('🔄 Performing initial Complize sync...');

    try {
      const syncResult = await this.syncAllDataToComplize();
      
      this.syncMetrics.totalSyncs++;
      this.syncMetrics.successfulSyncs++;
      this.syncMetrics.recordsSynced += syncResult.totalRecords;
      this.syncMetrics.lastSync = new Date().toISOString();
      this.syncMetrics.averageSyncTime = syncResult.syncDuration;

      console.log(`✅ Initial Complize sync completed: ${syncResult.totalRecords} records`);
    } catch (error) {
      console.error('❌ Initial Complize sync failed:', error);
      this.syncMetrics.failedSyncs++;
    }
  }

  // Core Sync Methods

  async syncAllDataToComplize(): Promise<ComplizeSyncResult> {
    console.log('🔄 Starting full Complize sync...');

    const startTime = Date.now();
    const syncResult: ComplizeSyncResult = {
      projectsSync: { created: 0, updated: 0, failed: 0 },
      phasesSync: { created: 0, updated: 0, failed: 0 },
      stepsSync: { created: 0, updated: 0, failed: 0 },
      memoryAnchorsSync: { created: 0, updated: 0, linked: 0, failed: 0 },
      governanceSync: { events: 0, auditEntries: 0, failed: 0 },
      totalRecords: 0,
      syncDuration: 0,
      errors: []
    };

    try {
      // Sync projects
      await this.syncProjectsToComplize(syncResult);

      // Sync phases
      await this.syncPhasesToComplize(syncResult);

      // Sync phase steps
      await this.syncPhaseStepsToComplize(syncResult);

      // Sync memory anchors
      await this.syncMemoryAnchorsToComplize(syncResult);

      // Sync governance events
      await this.syncGovernanceEventsToComplize(syncResult);

      // Calculate totals
      syncResult.totalRecords = 
        syncResult.projectsSync.created + syncResult.projectsSync.updated +
        syncResult.phasesSync.created + syncResult.phasesSync.updated +
        syncResult.stepsSync.created + syncResult.stepsSync.updated +
        syncResult.memoryAnchorsSync.created + syncResult.memoryAnchorsSync.updated +
        syncResult.governanceSync.events;

      syncResult.syncDuration = Date.now() - startTime;

      console.log(`✅ Full Complize sync completed: ${syncResult.totalRecords} records in ${syncResult.syncDuration}ms`);
      return syncResult;

    } catch (error) {
      syncResult.errors.push(error instanceof Error ? error.message : 'Unknown sync error');
      syncResult.syncDuration = Date.now() - startTime;
      
      console.error('❌ Full Complize sync failed:', error);
      throw error;
    }
  }

  private async syncProjectsToComplize(syncResult: ComplizeSyncResult): Promise<void> {
    console.log('📁 Syncing projects to Complize...');

    try {
      // Get projects from canonical database
      const projects = await mcpMSSQLServer.executeTool('query_canonical_data', {
        query: 'SELECT * FROM projects WHERE status = ?',
        parameters: ['active']
      });

      for (const project of projects) {
        try {
          // Convert to Complize format
          const complizeProject = await this.convertToComplizeProject(project);

          // Sync to Complize via Azure MCP
          const syncResponse = await mcpAzureServer.syncProjectToComplize({
            projectId: complizeProject.id,
            projectData: complizeProject,
            includePhases: true,
            includeSteps: true,
            includeGovernance: true
          });

          if (syncResponse.synced) {
            syncResult.projectsSync.created += syncResponse.recordsCreated > 0 ? 1 : 0;
            syncResult.projectsSync.updated += syncResponse.recordsCreated === 0 ? 1 : 0;
          } else {
            syncResult.projectsSync.failed++;
          }

          // Cache project
          this.projectCache.set(complizeProject.id, complizeProject);

        } catch (error) {
          console.error(`❌ Failed to sync project ${project.id}:`, error);
          syncResult.projectsSync.failed++;
          syncResult.errors.push(`Project sync failed: ${project.id}`);
        }
      }

      console.log(`✅ Projects sync: ${syncResult.projectsSync.created} created, ${syncResult.projectsSync.updated} updated, ${syncResult.projectsSync.failed} failed`);
    } catch (error) {
      console.error('❌ Projects sync failed:', error);
      syncResult.errors.push('Projects sync failed');
    }
  }

  private async syncPhasesToComplize(syncResult: ComplizeSyncResult): Promise<void> {
    console.log('📋 Syncing phases to Complize...');

    try {
      // Get phases from canonical database
      const phases = await mcpMSSQLServer.executeTool('query_canonical_data', {
        query: 'SELECT * FROM phases WHERE status IN (?, ?)',
        parameters: ['active', 'in_progress']
      });

      for (const phase of phases) {
        try {
          // Convert to Complize format
          const complizePhase = await this.convertToComplizePhase(phase);

          // Store phase data in Complize
          await mcpAzureServer.storeMemoryAnchorComplize({
            anchorId: `phase_${complizePhase.id}`,
            projectId: complizePhase.projectId,
            phaseId: complizePhase.id,
            content: complizePhase,
            tags: ['phase', 'complize', 'canonical'],
            metadata: {
              source: 'complize-integration-service',
              timestamp: new Date().toISOString(),
              compliance: 'AU-resident'
            }
          });

          syncResult.phasesSync.created++;

        } catch (error) {
          console.error(`❌ Failed to sync phase ${phase.id}:`, error);
          syncResult.phasesSync.failed++;
          syncResult.errors.push(`Phase sync failed: ${phase.id}`);
        }
      }

      console.log(`✅ Phases sync: ${syncResult.phasesSync.created} created, ${syncResult.phasesSync.failed} failed`);
    } catch (error) {
      console.error('❌ Phases sync failed:', error);
      syncResult.errors.push('Phases sync failed');
    }
  }

  private async syncPhaseStepsToComplize(syncResult: ComplizeSyncResult): Promise<void> {
    console.log('🎯 Syncing phase steps to Complize...');

    try {
      // Get phase steps from canonical database
      const steps = await mcpMSSQLServer.executeTool('query_canonical_data', {
        query: 'SELECT * FROM phase_steps WHERE status IN (?, ?, ?)',
        parameters: ['not_started', 'in_progress', 'completed']
      });

      for (const step of steps) {
        try {
          // Convert to Complize format
          const complizeStep = await this.convertToComplizePhaseStep(step);

          // Store step data in Complize
          await mcpAzureServer.storeMemoryAnchorComplize({
            anchorId: `step_${complizeStep.id}`,
            projectId: complizeStep.projectId,
            phaseId: complizeStep.phaseId,
            content: complizeStep,
            tags: ['phase_step', 'complize', 'canonical'],
            metadata: {
              source: 'complize-integration-service',
              timestamp: new Date().toISOString(),
              compliance: 'AU-resident'
            }
          });

          syncResult.stepsSync.created++;

        } catch (error) {
          console.error(`❌ Failed to sync step ${step.id}:`, error);
          syncResult.stepsSync.failed++;
          syncResult.errors.push(`Step sync failed: ${step.id}`);
        }
      }

      console.log(`✅ Steps sync: ${syncResult.stepsSync.created} created, ${syncResult.stepsSync.failed} failed`);
    } catch (error) {
      console.error('❌ Steps sync failed:', error);
      syncResult.errors.push('Steps sync failed');
    }
  }

  private async syncMemoryAnchorsToComplize(syncResult: ComplizeSyncResult): Promise<void> {
    console.log('⚓ Syncing memory anchors to Complize...');

    try {
      // Get memory anchors from canonical database
      const anchors = await mcpMSSQLServer.executeTool('query_canonical_data', {
        query: 'SELECT * FROM memory_anchors ORDER BY created_at DESC LIMIT 1000'
      });

      for (const anchor of anchors) {
        try {
          // Convert to Complize format
          const complizeAnchor = await this.convertToComplizeMemoryAnchor(anchor);

          // Store in Complize
          const storeResponse = await mcpAzureServer.storeMemoryAnchorComplize({
            anchorId: complizeAnchor.id,
            projectId: complizeAnchor.projectId,
            phaseId: complizeAnchor.phaseId,
            content: {
              title: complizeAnchor.title,
              content: complizeAnchor.content,
              anchorType: complizeAnchor.anchorType,
              tags: complizeAnchor.tags,
              linkedAnchors: complizeAnchor.linkedAnchors,
              search: complizeAnchor.search
            },
            tags: complizeAnchor.tags,
            metadata: complizeAnchor.metadata
          });

          if (storeResponse.stored) {
            syncResult.memoryAnchorsSync.created++;
            
            // Cache memory anchor
            this.memoryAnchorCache.set(complizeAnchor.id, complizeAnchor);
          } else {
            syncResult.memoryAnchorsSync.failed++;
          }

        } catch (error) {
          console.error(`❌ Failed to sync memory anchor ${anchor.id}:`, error);
          syncResult.memoryAnchorsSync.failed++;
          syncResult.errors.push(`Memory anchor sync failed: ${anchor.id}`);
        }
      }

      console.log(`✅ Memory anchors sync: ${syncResult.memoryAnchorsSync.created} created, ${syncResult.memoryAnchorsSync.failed} failed`);
    } catch (error) {
      console.error('❌ Memory anchors sync failed:', error);
      syncResult.errors.push('Memory anchors sync failed');
    }
  }

  private async syncGovernanceEventsToComplize(syncResult: ComplizeSyncResult): Promise<void> {
    console.log('📋 Syncing governance events to Complize...');

    try {
      // Get recent governance events
      const events = await mcpMSSQLServer.executeTool('query_canonical_data', {
        query: 'SELECT * FROM governance_logs WHERE created_at > ? ORDER BY created_at DESC LIMIT 500',
        parameters: [new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()] // Last 24 hours
      });

      for (const event of events) {
        try {
          // Store governance event in Complize
          await mcpAzureServer.uploadGovernanceArtifact({
            filename: `governance_event_${event.id}.json`,
            content: JSON.stringify(event),
            contentType: 'application/json',
            metadata: {
              projectId: event.project_id,
              eventType: event.event_type,
              compliance: 'AU-resident',
              source: 'complize-integration-service'
            }
          });

          syncResult.governanceSync.events++;

        } catch (error) {
          console.error(`❌ Failed to sync governance event ${event.id}:`, error);
          syncResult.governanceSync.failed++;
          syncResult.errors.push(`Governance event sync failed: ${event.id}`);
        }
      }

      console.log(`✅ Governance events sync: ${syncResult.governanceSync.events} events, ${syncResult.governanceSync.failed} failed`);
    } catch (error) {
      console.error('❌ Governance events sync failed:', error);
      syncResult.errors.push('Governance events sync failed');
    }
  }

  // Data Conversion Methods

  private async convertToComplizeProject(projectData: any): Promise<ComplizeProject> {
    return {
      id: projectData.id,
      name: projectData.name || 'Untitled Project',
      description: projectData.description || '',
      status: projectData.status || 'active',
      phases: [], // Will be populated separately
      metadata: {
        createdAt: projectData.created_at || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ownerId: projectData.owner_id || 'system',
        tags: projectData.tags ? JSON.parse(projectData.tags) : [],
        compliance: 'AU-resident',
        dataResidency: 'australia_east'
      },
      governance: {
        auditTrail: [],
        memoryAnchors: [],
        approvals: [],
        checkpoints: []
      }
    };
  }

  private async convertToComplizePhase(phaseData: any): Promise<ComplizePhase> {
    return {
      id: phaseData.id,
      projectId: phaseData.project_id,
      name: phaseData.name || 'Untitled Phase',
      description: phaseData.description || '',
      status: phaseData.status || 'not_started',
      steps: [], // Will be populated separately
      memoryAnchors: [],
      governanceEvents: [],
      progress: phaseData.progress || 0,
      startDate: phaseData.start_date,
      endDate: phaseData.end_date,
      estimatedDuration: phaseData.estimated_duration
    };
  }

  private async convertToComplizePhaseStep(stepData: any): Promise<ComplizePhaseStep> {
    return {
      id: stepData.id,
      projectId: stepData.project_id,
      phaseId: stepData.phase_id,
      name: stepData.name || 'Untitled Step',
      description: stepData.description || '',
      status: stepData.status || 'not_started',
      progress: stepData.progress || 0,
      priority: stepData.priority || 'medium',
      assignedTo: stepData.assigned_to,
      dueDate: stepData.due_date,
      completedAt: stepData.completed_at,
      memoryAnchors: [],
      governanceEvents: [],
      dependencies: stepData.dependencies ? JSON.parse(stepData.dependencies) : [],
      deliverables: stepData.deliverables ? JSON.parse(stepData.deliverables) : [],
      auditTrail: []
    };
  }

  private async convertToComplizeMemoryAnchor(anchorData: any): Promise<ComplizeMemoryAnchor> {
    return {
      id: anchorData.id,
      anchorType: anchorData.anchor_type || 'governance',
      projectId: anchorData.project_id,
      phaseId: anchorData.phase_id,
      stepId: anchorData.step_id,
      title: anchorData.title || 'Untitled Anchor',
      content: anchorData.content ? JSON.parse(anchorData.content) : {},
      tags: anchorData.tags ? JSON.parse(anchorData.tags) : [],
      linkedAnchors: anchorData.linked_anchors ? JSON.parse(anchorData.linked_anchors) : [],
      governanceEvents: [],
      metadata: {
        createdAt: anchorData.created_at || new Date().toISOString(),
        updatedAt: anchorData.updated_at || new Date().toISOString(),
        authorId: anchorData.author_id || 'system',
        version: anchorData.version || 1,
        compliance: 'AU-resident',
        classification: anchorData.classification || 'internal'
      },
      search: {
        keywords: anchorData.keywords ? JSON.parse(anchorData.keywords) : [],
        fullTextIndex: anchorData.full_text_index || '',
        semanticEmbedding: anchorData.semantic_embedding ? JSON.parse(anchorData.semantic_embedding) : undefined
      }
    };
  }

  private async performIncrementalSync(): Promise<void> {
    console.log('🔄 Performing incremental Complize sync...');

    try {
      const lastSyncTime = this.syncMetrics.lastSync || new Date(Date.now() - 5 * 60 * 1000).toISOString();
      
      // Get changed records since last sync
      const changedProjects = await mcpMSSQLServer.executeTool('query_canonical_data', {
        query: 'SELECT * FROM projects WHERE updated_at > ?',
        parameters: [lastSyncTime]
      });

      const changedSteps = await mcpMSSQLServer.executeTool('query_canonical_data', {
        query: 'SELECT * FROM phase_steps WHERE updated_at > ?',
        parameters: [lastSyncTime]
      });

      const changedAnchors = await mcpMSSQLServer.executeTool('query_canonical_data', {
        query: 'SELECT * FROM memory_anchors WHERE updated_at > ?',
        parameters: [lastSyncTime]
      });

      // Sync changed records
      let recordsSynced = 0;

      for (const project of changedProjects) {
        await this.syncSingleProjectToComplize(project);
        recordsSynced++;
      }

      for (const step of changedSteps) {
        await this.syncSingleStepToComplize(step);
        recordsSynced++;
      }

      for (const anchor of changedAnchors) {
        await this.syncSingleAnchorToComplize(anchor);
        recordsSynced++;
      }

      // Update sync metrics
      this.syncMetrics.totalSyncs++;
      this.syncMetrics.successfulSyncs++;
      this.syncMetrics.recordsSynced += recordsSynced;
      this.syncMetrics.lastSync = new Date().toISOString();

      console.log(`✅ Incremental sync completed: ${recordsSynced} records`);

    } catch (error) {
      console.error('❌ Incremental sync failed:', error);
      this.syncMetrics.failedSyncs++;
    }
  }

  private async syncSingleProjectToComplize(projectData: any): Promise<void> {
    const complizeProject = await this.convertToComplizeProject(projectData);
    
    await mcpAzureServer.syncProjectToComplize({
      projectId: complizeProject.id,
      projectData: complizeProject,
      includePhases: true,
      includeSteps: true,
      includeGovernance: true
    });

    this.projectCache.set(complizeProject.id, complizeProject);
  }

  private async syncSingleStepToComplize(stepData: any): Promise<void> {
    const complizeStep = await this.convertToComplizePhaseStep(stepData);

    await mcpAzureServer.storeMemoryAnchorComplize({
      anchorId: `step_${complizeStep.id}`,
      projectId: complizeStep.projectId,
      phaseId: complizeStep.phaseId,
      content: complizeStep,
      tags: ['phase_step', 'complize', 'incremental'],
      metadata: {
        source: 'complize-integration-service',
        timestamp: new Date().toISOString(),
        compliance: 'AU-resident'
      }
    });
  }

  private async syncSingleAnchorToComplize(anchorData: any): Promise<void> {
    const complizeAnchor = await this.convertToComplizeMemoryAnchor(anchorData);

    await mcpAzureServer.storeMemoryAnchorComplize({
      anchorId: complizeAnchor.id,
      projectId: complizeAnchor.projectId,
      phaseId: complizeAnchor.phaseId,
      content: {
        title: complizeAnchor.title,
        content: complizeAnchor.content,
        anchorType: complizeAnchor.anchorType,
        tags: complizeAnchor.tags,
        linkedAnchors: complizeAnchor.linkedAnchors,
        search: complizeAnchor.search
      },
      tags: complizeAnchor.tags,
      metadata: complizeAnchor.metadata
    });

    this.memoryAnchorCache.set(complizeAnchor.id, complizeAnchor);
  }

  // Event Handlers

  private async handleProjectCreated(projectData: any): Promise<void> {
    console.log('📥 Handling project created:', projectData.id);
    await this.syncSingleProjectToComplize(projectData);
  }

  private async handleProjectUpdated(projectData: any): Promise<void> {
    console.log('📥 Handling project updated:', projectData.id);
    await this.syncSingleProjectToComplize(projectData);
  }

  private async handlePhaseStepCreated(stepData: any): Promise<void> {
    console.log('📥 Handling phase step created:', stepData.id);
    await this.syncSingleStepToComplize(stepData);
  }

  private async handlePhaseStepUpdated(stepData: any): Promise<void> {
    console.log('📥 Handling phase step updated:', stepData.id);
    await this.syncSingleStepToComplize(stepData);
  }

  private async handleMemoryAnchorCreated(anchorData: any): Promise<void> {
    console.log('📥 Handling memory anchor created:', anchorData.id);
    await this.syncSingleAnchorToComplize(anchorData);
  }

  private async handleMemoryAnchorLinked(linkData: { anchorId: string; targetId: string; linkType: string }): Promise<void> {
    console.log('📥 Handling memory anchor linked:', linkData.anchorId, '->', linkData.targetId);
    
    // Update linked anchor relationships in Complize
    const anchor = this.memoryAnchorCache.get(linkData.anchorId);
    if (anchor) {
      anchor.linkedAnchors.push(linkData.targetId);
      await this.syncSingleAnchorToComplize(anchor);
    }
  }

  private async handleGovernanceEventCreated(eventData: any): Promise<void> {
    console.log('📥 Handling governance event created:', eventData.eventId);
    
    // Store governance event in Complize
    await mcpAzureServer.uploadGovernanceArtifact({
      filename: `governance_event_${eventData.eventId}.json`,
      content: JSON.stringify(eventData),
      contentType: 'application/json',
      metadata: {
        projectId: eventData.projectId,
        eventType: eventData.eventType,
        compliance: 'AU-resident',
        source: 'complize-integration-service'
      }
    });
  }

  // Public API

  async triggerFullSync(): Promise<ComplizeSyncResult> {
    console.log('🔄 Triggering full Complize sync...');
    return await this.syncAllDataToComplize();
  }

  async queryComplizeData(query: {
    projectId?: string;
    anchorType?: string;
    tags?: string[];
    dateRange?: { start: string; end: string };
    limit?: number;
  }): Promise<any[]> {
    console.log('🔍 Querying Complize data:', query);

    // Build query for Azure MCP
    const azureQuery = this.buildComplizeQuery(query);
    
    const results = await mcpAzureServer.queryComplizeData({
      container: 'MemoryAnchors',
      query: azureQuery,
      maxItems: query.limit || 100
    });

    return results.results;
  }

  private buildComplizeQuery(query: any): string {
    let sqlQuery = 'SELECT * FROM c WHERE 1=1';
    
    if (query.projectId) {
      sqlQuery += ` AND c.projectId = '${query.projectId}'`;
    }
    
    if (query.anchorType) {
      sqlQuery += ` AND c.data.anchorType = '${query.anchorType}'`;
    }
    
    if (query.tags && query.tags.length > 0) {
      const tagConditions = query.tags.map(tag => `ARRAY_CONTAINS(c.tags, '${tag}')`).join(' OR ');
      sqlQuery += ` AND (${tagConditions})`;
    }
    
    if (query.dateRange) {
      sqlQuery += ` AND c.metadata.createdAt >= '${query.dateRange.start}' AND c.metadata.createdAt <= '${query.dateRange.end}'`;
    }
    
    sqlQuery += ' ORDER BY c.metadata.updatedAt DESC';
    
    return sqlQuery;
  }

  getMetrics(): typeof this.syncMetrics {
    return { ...this.syncMetrics };
  }

  getCachedProject(projectId: string): ComplizeProject | undefined {
    return this.projectCache.get(projectId);
  }

  getCachedMemoryAnchor(anchorId: string): ComplizeMemoryAnchor | undefined {
    return this.memoryAnchorCache.get(anchorId);
  }

  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: Record<string, boolean>;
    metrics: typeof this.syncMetrics;
    cacheStatus: { projects: number; memoryAnchors: number };
  }> {
    const checks = {
      initialized: this.initialized,
      syncScheduleActive: this.syncSchedule !== null,
      mcpServersReady: await this.checkMCPServersHealth(),
      recentSyncSuccessful: this.syncMetrics.lastSync && 
        (Date.now() - new Date(this.syncMetrics.lastSync).getTime()) < 10 * 60 * 1000, // Within 10 minutes
      cacheHealthy: this.projectCache.size > 0 || this.memoryAnchorCache.size > 0
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
      cacheStatus: {
        projects: this.projectCache.size,
        memoryAnchors: this.memoryAnchorCache.size
      }
    };
  }

  private async checkMCPServersHealth(): Promise<boolean> {
    try {
      const azureHealth = await mcpAzureServer.healthCheck();
      const mssqlHealth = await mcpMSSQLServer.healthCheck();
      
      return azureHealth.status !== 'unhealthy' && mssqlHealth.status !== 'unhealthy';
    } catch {
      return false;
    }
  }

  async shutdown(): Promise<void> {
    console.log('🛑 Shutting down Complize Integration Service...');
    
    if (this.syncSchedule) {
      clearInterval(this.syncSchedule);
      this.syncSchedule = null;
    }
    
    this.initialized = false;
    console.log('✅ Complize Integration Service shutdown complete');
  }
}

// Export singleton instance
export const complizeIntegrationService = new ComplizeIntegrationService();
export default complizeIntegrationService;