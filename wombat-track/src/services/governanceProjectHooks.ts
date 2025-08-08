/**
 * Governance-Driven Project Registration Service
 * Automatically creates/updates projects when referenced in governance logs
 */

import DatabaseManager from '../server/database/connection';
import { DriveMemoryLogger } from '../server/api/import/driveMemoryLogger';

export interface GovernanceProjectData {
  projectId: string;
  phaseId?: string;
  stepId?: string;
  summary?: string;
  memoryAnchor?: string;
  actor?: string;
  status?: string;
  objectiveOrDescription?: string;
}

export class GovernanceProjectHooks {
  private static instance: GovernanceProjectHooks;
  private dbManager: DatabaseManager;

  private constructor() {
    this.dbManager = DatabaseManager.getInstance();
  }

  public static getInstance(): GovernanceProjectHooks {
    if (!GovernanceProjectHooks.instance) {
      GovernanceProjectHooks.instance = new GovernanceProjectHooks();
    }
    return GovernanceProjectHooks.instance;
  }

  /**
   * Main entry point: Process governance log entry and create/update project if needed
   */
  async processGovernanceEntry(logEntry: any): Promise<boolean> {
    try {
      const projectData = this.extractProjectData(logEntry);
      if (!projectData) {
        return false; // No project reference found
      }

      const db = await this.dbManager.getConnection();
      const existingProject = await db.get(
        'SELECT projectId, status, updatedAt FROM projects WHERE projectId = ?',
        [projectData.projectId]
      );

      if (!existingProject) {
        return await this.createProjectFromGovernance(projectData);
      } else {
        return await this.updateProjectFromGovernance(projectData, existingProject);
      }
    } catch (error) {
      console.error('Error processing governance entry:', error);
      return false;
    }
  }

  /**
   * Extract project data from governance log entry
   */
  private extractProjectData(logEntry: any): GovernanceProjectData | null {
    // Handle different governance log formats
    if (logEntry.project_id || logEntry.projectId) {
      return {
        projectId: logEntry.project_id || logEntry.projectId,
        phaseId: logEntry.phase_id || logEntry.phaseId,
        stepId: logEntry.step_id || logEntry.stepId,
        summary: logEntry.summary || logEntry.description || logEntry.details?.summary,
        memoryAnchor: logEntry.memory_anchor || logEntry.memoryAnchor,
        actor: logEntry.actor || logEntry.user_id || 'system',
        status: this.inferProjectStatus(logEntry),
        objectiveOrDescription: logEntry.objective || logEntry.details?.description
      };
    }

    // Check for project ID patterns in entityId or other fields
    const projectIdPattern = /^(OF-|WT-|[A-Z]+-)[A-Z0-9.-]+$/;
    if (logEntry.entityId && projectIdPattern.test(logEntry.entityId)) {
      return {
        projectId: logEntry.entityId,
        summary: logEntry.event || logEntry.summary,
        actor: logEntry.userId || 'system',
        status: 'Active'
      };
    }

    return null;
  }

  /**
   * Infer project status from governance log context
   */
  private inferProjectStatus(logEntry: any): string {
    if (logEntry.status === 'completed' || logEntry.action === 'complete') return 'Completed';
    if (logEntry.status === 'in_progress' || logEntry.action === 'start') return 'In Progress';
    if (logEntry.status === 'initialized' || logEntry.action === 'init') return 'Planning';
    if (logEntry.event_type === 'phase_completion') return 'Completed';
    return 'Active';
  }

  /**
   * Create new project from governance data
   */
  private async createProjectFromGovernance(data: GovernanceProjectData): Promise<boolean> {
    try {
      const db = await this.dbManager.getConnection();
      
      // Generate project name from projectId and summary
      const projectName = this.generateProjectName(data);
      const description = data.objectiveOrDescription || data.summary || `Project ${data.projectId}`;
      
      await db.run(`
        INSERT INTO projects (
          projectId, projectName, owner, status, description, 
          createdAt, updatedAt, goals, scopeNotes, RAG, 
          keyTasks, aiPromptLog
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        data.projectId,
        projectName,
        data.actor || 'system',
        data.status || 'Active',
        description,
        new Date().toISOString(),
        new Date().toISOString(),
        data.objectiveOrDescription || '',
        `Auto-created from governance log. Memory anchor: ${data.memoryAnchor || 'none'}`,
        'Green',
        JSON.stringify([`Phase ${data.phaseId}: ${data.summary}`].filter(Boolean)),
        JSON.stringify([{
          timestamp: new Date().toISOString(),
          source: 'governance_log',
          prompt: `Auto-created project from governance log entry`,
          context: data
        }])
      ]);

      // Log to governance system
      await this.logGovernanceProjectCreation(data);

      console.log(`✅ Auto-created project: ${data.projectId} (${projectName})`);
      return true;
    } catch (error) {
      console.error(`Failed to create project ${data.projectId}:`, error);
      return false;
    }
  }

  /**
   * Update existing project with governance data
   */
  private async updateProjectFromGovernance(data: GovernanceProjectData, existingProject: any): Promise<boolean> {
    try {
      const db = await this.dbManager.getConnection();
      
      // Get existing keyTasks and aiPromptLog
      const existing = await db.get(
        'SELECT keyTasks, aiPromptLog, goals FROM projects WHERE projectId = ?',
        [data.projectId]
      );

      let keyTasks = [];
      let aiPromptLog = [];
      
      try {
        keyTasks = existing?.keyTasks ? JSON.parse(existing.keyTasks) : [];
        aiPromptLog = existing?.aiPromptLog ? JSON.parse(existing.aiPromptLog) : [];
      } catch (e) {
        console.warn(`Failed to parse existing JSON for ${data.projectId}:`, e);
      }

      // Add new task if we have phase/step info
      if (data.phaseId && data.summary) {
        const newTask = `${data.phaseId}: ${data.summary}`;
        if (!keyTasks.includes(newTask)) {
          keyTasks.push(newTask);
        }
      }

      // Add governance log entry to AI prompt log
      aiPromptLog.push({
        timestamp: new Date().toISOString(),
        source: 'governance_log',
        prompt: `Project updated via governance log`,
        context: data
      });

      // Update project
      await db.run(`
        UPDATE projects 
        SET status = ?, updatedAt = ?, keyTasks = ?, aiPromptLog = ?
        WHERE projectId = ?
      `, [
        data.status || existingProject.status,
        new Date().toISOString(),
        JSON.stringify(keyTasks),
        JSON.stringify(aiPromptLog),
        data.projectId
      ]);

      console.log(`🔄 Updated project from governance: ${data.projectId}`);
      return true;
    } catch (error) {
      console.error(`Failed to update project ${data.projectId}:`, error);
      return false;
    }
  }

  /**
   * Generate project name from project ID and context
   */
  private generateProjectName(data: GovernanceProjectData): string {
    if (data.objectiveOrDescription) {
      return data.objectiveOrDescription;
    }
    
    if (data.summary) {
      return data.summary;
    }

    // Generate from project ID pattern
    const parts = data.projectId.split('-');
    if (parts.length >= 2) {
      const prefix = parts[0];
      const id = parts.slice(1).join('-');
      
      switch (prefix) {
        case 'OF': return `Orbis Forge - ${id}`;
        case 'WT': return `Wombat Track - ${id}`;
        default: return `${prefix} Project - ${id}`;
      }
    }

    return `Project ${data.projectId}`;
  }

  /**
   * Log project creation to governance system
   */
  private async logGovernanceProjectCreation(data: GovernanceProjectData): Promise<void> {
    try {
      const logger = new DriveMemoryLogger();
      await logger.log({
        timestamp: new Date().toISOString(),
        event_type: 'project_auto_created',
        resource_type: 'project',
        resource_id: data.projectId,
        action: 'create',
        success: true,
        details: {
          source: 'governance_log_hook',
          projectId: data.projectId,
          projectName: this.generateProjectName(data),
          actor: data.actor,
          memoryAnchor: data.memoryAnchor,
          originalContext: data
        }
      });
    } catch (error) {
      console.warn('Failed to log project creation to governance system:', error);
    }
  }

  /**
   * Add missing database fields if they don't exist
   */
  async ensureDatabaseSchema(): Promise<void> {
    try {
      const db = await this.dbManager.getConnection();
      
      // Check if keyTasks column exists
      const columns = await db.all("PRAGMA table_info(projects)");
      const columnNames = columns.map((col: any) => col.name);
      
      if (!columnNames.includes('keyTasks')) {
        await db.run('ALTER TABLE projects ADD COLUMN keyTasks TEXT DEFAULT NULL');
        console.log('✅ Added keyTasks column to projects table');
      }
      
      if (!columnNames.includes('aiPromptLog')) {
        await db.run('ALTER TABLE projects ADD COLUMN aiPromptLog TEXT DEFAULT NULL');
        console.log('✅ Added aiPromptLog column to projects table');
      }
    } catch (error) {
      console.error('Failed to ensure database schema:', error);
    }
  }
}

export default GovernanceProjectHooks;