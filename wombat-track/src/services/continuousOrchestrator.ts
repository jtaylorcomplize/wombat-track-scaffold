/**
 * OF-8.5 Continuous Orchestration Service
 * Auto-detects governance logs & Memory Anchors to create PhaseSteps & StepProgress
 */

import { projectsDB } from './projectsDB';
import { enhancedGovernanceLogger } from './enhancedGovernanceLogger';
import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'events';

export interface PhaseStep {
  stepId: string;
  phaseId: string;
  projectId: string;
  stepName: string;
  stepDescription: string;
  stepOrder: number;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  assignedTo?: string;
  estimatedHours?: number;
  actualHours?: number;
  startDate?: string;
  endDate?: string;
  completionPercentage: number;
  memoryAnchor?: string;
  governanceLogRef?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StepProgress {
  progressId: string;
  stepId: string;
  timestamp: string;
  progressType: 'status_change' | 'percentage_update' | 'time_logged' | 'note_added';
  previousValue?: string;
  newValue?: string;
  notes?: string;
  createdBy?: string;
  memoryAnchor?: string;
}

export interface Phase {
  phaseId: string;
  projectId: string;
  phaseName: string;
  phaseDescription: string;
  phaseOrder: number;
  status: 'planning' | 'active' | 'completed' | 'on_hold';
  startDate?: string;
  endDate?: string;
  memoryAnchor?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GovernanceLogEntry {
  event: string;
  entityId: string;
  timestamp: string;
  sessionId: string;
  context: Record<string, unknown>;
  memoryAnchor?: string;
}

export interface MemoryAnchor {
  id: string;
  type: string;
  timestamp: string;
  context: Record<string, unknown>;
  linked_entities?: string[];
}

class ContinuousOrchestrator extends EventEmitter {
  private watchedPaths: string[] = [];
  private watchers: fs.FSWatcher[] = [];
  private isWatching = false;
  private dbInitialized = false;

  constructor() {
    super();
    this.setupWatchPaths();
  }

  private setupWatchPaths(): void {
    const baseDir = process.cwd();
    this.watchedPaths = [
      path.join(baseDir, 'logs/governance'),
      path.join(baseDir, 'logs/drive-memory'),
      path.join(baseDir, 'DriveMemory')
    ];
  }

  async initialize(): Promise<void> {
    if (this.dbInitialized) return;

    await this.ensureTablesExist();
    this.dbInitialized = true;
    
    enhancedGovernanceLogger.createPhaseAnchor('of-8.5-continuous-orchestration', 'init');
    console.log('✅ OF-8.5 Continuous Orchestrator initialized');
  }

  private async ensureTablesExist(): Promise<void> {
    const db = await projectsDB.connect();

    // Create Phases table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS Phases (
        phaseId TEXT PRIMARY KEY,
        projectId TEXT NOT NULL,
        phaseName TEXT NOT NULL,
        phaseDescription TEXT,
        phaseOrder INTEGER DEFAULT 0,
        status TEXT DEFAULT 'planning',
        startDate TEXT,
        endDate TEXT,
        memoryAnchor TEXT,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (projectId) REFERENCES Projects (projectId)
      )
    `);

    // Create PhaseSteps table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS PhaseSteps (
        stepId TEXT PRIMARY KEY,
        phaseId TEXT NOT NULL,
        projectId TEXT NOT NULL,
        stepName TEXT NOT NULL,
        stepDescription TEXT,
        stepOrder INTEGER DEFAULT 0,
        status TEXT DEFAULT 'pending',
        assignedTo TEXT,
        estimatedHours REAL,
        actualHours REAL,
        startDate TEXT,
        endDate TEXT,
        completionPercentage INTEGER DEFAULT 0,
        memoryAnchor TEXT,
        governanceLogRef TEXT,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (phaseId) REFERENCES Phases (phaseId),
        FOREIGN KEY (projectId) REFERENCES Projects (projectId)
      )
    `);

    // Create StepProgress table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS StepProgress (
        progressId TEXT PRIMARY KEY,
        stepId TEXT NOT NULL,
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
        progressType TEXT NOT NULL,
        previousValue TEXT,
        newValue TEXT,
        notes TEXT,
        createdBy TEXT,
        memoryAnchor TEXT,
        FOREIGN KEY (stepId) REFERENCES PhaseSteps (stepId)
      )
    `);

    console.log('✅ OF-8.5 Database tables created/verified');
  }

  async startWatching(): Promise<void> {
    if (this.isWatching) return;

    await this.initialize();

    for (const watchPath of this.watchedPaths) {
      if (fs.existsSync(watchPath)) {
        const watcher = fs.watch(watchPath, { recursive: true }, (eventType, filename) => {
          if (filename && this.shouldProcessFile(filename)) {
            this.processFileChange(path.join(watchPath, filename), eventType);
          }
        });
        this.watchers.push(watcher);
        console.log(`👀 Watching: ${watchPath}`);
      }
    }

    this.isWatching = true;
    console.log('🚀 OF-8.5 Continuous Orchestration active');
  }

  private shouldProcessFile(filename: string): boolean {
    return filename.endsWith('.jsonl') || filename.endsWith('.anchor') || filename.endsWith('.json');
  }

  private async processFileChange(filePath: string, eventType: string): Promise<void> {
    try {
      if (eventType === 'change' || eventType === 'rename') {
        if (filePath.includes('governance')) {
          await this.processGovernanceLog(filePath);
        } else if (filePath.includes('memory') || filePath.includes('anchor')) {
          await this.processMemoryAnchor(filePath);
        }
      }
    } catch (error) {
      console.error(`❌ Error processing file ${filePath}:`, error);
    }
  }

  private async processGovernanceLog(filePath: string): Promise<void> {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.trim().split('\n');
      
      for (const line of lines) {
        if (line.trim()) {
          const logEntry: GovernanceLogEntry = JSON.parse(line);
          await this.createPhaseStepFromLog(logEntry);
        }
      }
    } catch (error) {
      console.error(`❌ Error processing governance log ${filePath}:`, error);
    }
  }

  private async processMemoryAnchor(filePath: string): Promise<void> {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      let anchors: MemoryAnchor[] = [];

      if (filePath.endsWith('.jsonl')) {
        const lines = content.trim().split('\n');
        anchors = lines.map(line => JSON.parse(line));
      } else {
        anchors = [JSON.parse(content)];
      }

      for (const anchor of anchors) {
        await this.linkMemoryAnchorToSteps(anchor);
      }
    } catch (error) {
      console.error(`❌ Error processing memory anchor ${filePath}:`, error);
    }
  }

  private async createPhaseStepFromLog(logEntry: GovernanceLogEntry): Promise<void> {
    // Auto-create PhaseSteps based on governance events
    if (this.shouldCreatePhaseStep(logEntry)) {
      const stepData = this.mapLogToPhaseStep(logEntry);
      await this.createPhaseStep(stepData);
      
      // Create corresponding StepProgress entry
      await this.createStepProgress({
        progressId: `progress_${stepData.stepId}_${Date.now()}`,
        stepId: stepData.stepId,
        timestamp: new Date().toISOString(),
        progressType: 'status_change',
        newValue: stepData.status,
        notes: `Auto-created from governance event: ${logEntry.event}`,
        createdBy: 'continuous_orchestrator',
        memoryAnchor: logEntry.memoryAnchor
      });

      console.log(`✅ Auto-created PhaseStep: ${stepData.stepName}`);
    }
  }

  private shouldCreatePhaseStep(logEntry: GovernanceLogEntry): boolean {
    // Create steps for significant navigation and project events
    const stepCreationEvents = [
      'project_select',
      'work_surface_nav',
      'sub_app_select',
      'phase_init',
      'phase_complete'
    ];
    
    return stepCreationEvents.includes(logEntry.event);
  }

  private mapLogToPhaseStep(logEntry: GovernanceLogEntry): PhaseStep {
    const stepId = `step_${logEntry.event}_${Date.now()}`;
    const phaseId = this.inferPhaseIdFromLog(logEntry);
    const projectId = this.inferProjectIdFromLog(logEntry);

    return {
      stepId,
      phaseId,
      projectId,
      stepName: this.generateStepName(logEntry),
      stepDescription: this.generateStepDescription(logEntry),
      stepOrder: 0,
      status: 'in_progress',
      completionPercentage: 0,
      memoryAnchor: logEntry.memoryAnchor,
      governanceLogRef: `${logEntry.event}_${logEntry.timestamp}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  private inferPhaseIdFromLog(logEntry: GovernanceLogEntry): string {
    // Extract phase information from log context
    if (logEntry.context.phase) {
      return String(logEntry.context.phase);
    }
    
    // Map events to standard SDLC phases
    const eventPhaseMap: Record<string, string> = {
      'project_select': 'planning',
      'work_surface_nav': 'execution',
      'sub_app_select': 'integration',
      'phase_init': 'initialization',
      'phase_complete': 'completion'
    };

    return eventPhaseMap[logEntry.event] || 'general';
  }

  private inferProjectIdFromLog(logEntry: GovernanceLogEntry): string {
    // Extract project ID from context
    if (logEntry.context.projectId) {
      return String(logEntry.context.projectId);
    }
    if (logEntry.context.subAppId) {
      return `${logEntry.context.subAppId}_default_project`;
    }
    return 'orchestrator_default_project';
  }

  private generateStepName(logEntry: GovernanceLogEntry): string {
    const eventNames: Record<string, string> = {
      'project_select': 'Project Context Switch',
      'work_surface_nav': 'Work Surface Navigation',
      'sub_app_select': 'SubApp Context Change',
      'phase_init': 'Phase Initialization',
      'phase_complete': 'Phase Completion'
    };

    return eventNames[logEntry.event] || `Auto-generated: ${logEntry.event}`;
  }

  private generateStepDescription(logEntry: GovernanceLogEntry): string {
    return `Auto-generated step from governance event: ${logEntry.event}. Context: ${JSON.stringify(logEntry.context)}`;
  }

  async createPhaseStep(stepData: PhaseStep): Promise<void> {
    const db = await projectsDB.connect();
    
    // Ensure phase exists
    await this.ensurePhaseExists(stepData.phaseId, stepData.projectId);

    await db.run(`
      INSERT OR REPLACE INTO PhaseSteps (
        stepId, phaseId, projectId, stepName, stepDescription, stepOrder,
        status, assignedTo, estimatedHours, actualHours, startDate, endDate,
        completionPercentage, memoryAnchor, governanceLogRef, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      stepData.stepId, stepData.phaseId, stepData.projectId, stepData.stepName,
      stepData.stepDescription, stepData.stepOrder, stepData.status, stepData.assignedTo,
      stepData.estimatedHours, stepData.actualHours, stepData.startDate, stepData.endDate,
      stepData.completionPercentage, stepData.memoryAnchor, stepData.governanceLogRef,
      stepData.createdAt, stepData.updatedAt
    ]);

    this.emit('phaseStepCreated', stepData);
  }

  async createStepProgress(progressData: StepProgress): Promise<void> {
    const db = await projectsDB.connect();
    
    await db.run(`
      INSERT INTO StepProgress (
        progressId, stepId, timestamp, progressType, previousValue,
        newValue, notes, createdBy, memoryAnchor
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      progressData.progressId, progressData.stepId, progressData.timestamp,
      progressData.progressType, progressData.previousValue, progressData.newValue,
      progressData.notes, progressData.createdBy, progressData.memoryAnchor
    ]);

    this.emit('stepProgressCreated', progressData);
  }

  private async ensurePhaseExists(phaseId: string, projectId: string): Promise<void> {
    const db = await projectsDB.connect();
    
    const existingPhase = await db.get('SELECT phaseId FROM Phases WHERE phaseId = ?', [phaseId]);
    
    if (!existingPhase) {
      const phase: Phase = {
        phaseId,
        projectId,
        phaseName: this.generatePhaseName(phaseId),
        phaseDescription: `Auto-generated phase: ${phaseId}`,
        phaseOrder: 0,
        status: 'active',
        memoryAnchor: `phase_${phaseId}_${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await db.run(`
        INSERT INTO Phases (
          phaseId, projectId, phaseName, phaseDescription, phaseOrder,
          status, startDate, endDate, memoryAnchor, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        phase.phaseId, phase.projectId, phase.phaseName, phase.phaseDescription,
        phase.phaseOrder, phase.status, phase.startDate, phase.endDate,
        phase.memoryAnchor, phase.createdAt, phase.updatedAt
      ]);
    }
  }

  private generatePhaseName(phaseId: string): string {
    const phaseNames: Record<string, string> = {
      'planning': 'Planning & Requirements',
      'execution': 'Development & Implementation',
      'integration': 'Integration & Testing',
      'initialization': 'Project Initialization',
      'completion': 'Project Completion',
      'general': 'General Operations'
    };

    return phaseNames[phaseId] || `Phase: ${phaseId}`;
  }

  private async linkMemoryAnchorToSteps(anchor: MemoryAnchor): Promise<void> {
    const db = await projectsDB.connect();
    
    // Find steps that could be linked to this anchor
    const steps = await db.all(`
      SELECT stepId FROM PhaseSteps 
      WHERE memoryAnchor IS NULL 
        AND datetime(createdAt) >= datetime(?, '-1 hour')
        AND datetime(createdAt) <= datetime(?, '+1 hour')
    `, [anchor.timestamp, anchor.timestamp]);

    for (const step of steps) {
      await db.run(`
        UPDATE PhaseSteps 
        SET memoryAnchor = ?, updatedAt = ?
        WHERE stepId = ?
      `, [anchor.id, new Date().toISOString(), step.stepId]);
    }

    if (steps.length > 0) {
      console.log(`🔗 Linked memory anchor ${anchor.id} to ${steps.length} steps`);
    }
  }

  async stopWatching(): Promise<void> {
    for (const watcher of this.watchers) {
      watcher.close();
    }
    this.watchers = [];
    this.isWatching = false;
    console.log('⏹️  Continuous Orchestration stopped');
  }

  // Query methods
  async getPhaseSteps(phaseId?: string): Promise<PhaseStep[]> {
    const db = await projectsDB.connect();
    
    let query = 'SELECT * FROM PhaseSteps';
    const params: any[] = [];
    
    if (phaseId) {
      query += ' WHERE phaseId = ?';
      params.push(phaseId);
    }
    
    query += ' ORDER BY phaseOrder ASC, createdAt ASC';
    
    return db.all(query, params);
  }

  async getStepProgress(stepId: string): Promise<StepProgress[]> {
    const db = await projectsDB.connect();
    
    return db.all(`
      SELECT * FROM StepProgress 
      WHERE stepId = ? 
      ORDER BY timestamp DESC
    `, [stepId]);
  }

  async getPhases(projectId?: string): Promise<Phase[]> {
    const db = await projectsDB.connect();
    
    let query = 'SELECT * FROM Phases';
    const params: any[] = [];
    
    if (projectId) {
      query += ' WHERE projectId = ?';
      params.push(projectId);
    }
    
    query += ' ORDER BY phaseOrder ASC, createdAt ASC';
    
    return db.all(query, params);
  }
}

// Export singleton instance
export const continuousOrchestrator = new ContinuousOrchestrator();
export default continuousOrchestrator;