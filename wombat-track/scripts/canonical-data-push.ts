#!/usr/bin/env tsx

import fs from 'fs/promises';
import path from 'path';
import csv from 'csv-parser';
import { Readable } from 'stream';
import DatabaseManager from '../src/server/database/connection.js';

interface CSVProject {
  projectId?: string;
  projectName?: string;
  owner?: string;
  status?: string;
  description?: string;
  goals?: string;
  scopeNotes?: string;
  RAG?: string;
  startDate?: string;
  endDate?: string;
  priority?: string;
  budget?: string;
  actualCost?: string;
  estimatedHours?: string;
  actualHours?: string;
  completionPercentage?: string;
  risk?: string;
  stakeholders?: string;
  tags?: string;
  category?: string;
  department?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface CSVPhase {
  phaseid?: string;
  phasename?: string;
  project_ref?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  RAG?: string;
  notes?: string;
  estimatedDuration?: string;
  actualDuration?: string;
  createdAt?: string;
  updatedAt?: string;
}

class CanonicalDataPusher {
  private dbManager: DatabaseManager;
  private report: {
    timestamp: string;
    projectsProcessed: number;
    projectsInserted: number;
    projectsUpdated: number;
    phasesProcessed: number;
    phasesInserted: number;
    phasesUpdated: number;
    orphanPhases: number;
    errors: string[];
  };

  constructor() {
    this.dbManager = DatabaseManager.getInstance();
    this.report = {
      timestamp: new Date().toISOString(),
      projectsProcessed: 0,
      projectsInserted: 0,
      projectsUpdated: 0,
      phasesProcessed: 0,
      phasesInserted: 0,
      phasesUpdated: 0,
      orphanPhases: 0,
      errors: []
    };
  }

  async parseCSVFile(filePath: string): Promise<any[]> {
    try {
      const fileContent = await fs.readFile(filePath, 'utf-8');
      return new Promise((resolve, reject) => {
        const results: any[] = [];
        const stream = Readable.from([fileContent]);
        
        stream
          .pipe(csv())
          .on('data', (data) => results.push(data))
          .on('end', () => resolve(results))
          .on('error', reject);
      });
    } catch (error) {
      console.error(`Error reading CSV file ${filePath}:`, error);
      this.report.errors.push(`CSV Parse Error: ${filePath} - ${error}`);
      return [];
    }
  }

  async createGovernanceLog(eventType: string, action: string, details: any) {
    const db = await this.dbManager.getConnection();
    
    const logEntry = {
      timestamp: new Date().toISOString(),
      event_type: eventType,
      user_id: 'system',
      user_role: 'canonical-data-pusher',
      resource_type: 'bulk_import',
      resource_id: 'canonical-push',
      action: action,
      success: true,
      details: JSON.stringify(details),
      runtime_context: JSON.stringify({ source: 'canonical-data-push', version: '1.0' })
    };

    const result = await db.run(`
      INSERT INTO governance_logs (timestamp, event_type, user_id, user_role, resource_type, resource_id, action, success, details, runtime_context)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      logEntry.timestamp,
      logEntry.event_type,
      logEntry.user_id,
      logEntry.user_role,
      logEntry.resource_type,
      logEntry.resource_id,
      logEntry.action,
      logEntry.success,
      logEntry.details,
      logEntry.runtime_context
    ]);

    return result.lastID;
  }

  async createMemoryAnchor(anchorId: string, context: any) {
    const anchorData = {
      id: anchorId,
      timestamp: new Date().toISOString(),
      context: context,
      type: 'canonical-data-push'
    };
    
    const anchorPath = path.join(process.cwd(), 'DriveMemory', 'MemoryPlugin', `${anchorId}.json`);
    await fs.mkdir(path.dirname(anchorPath), { recursive: true });
    await fs.writeFile(anchorPath, JSON.stringify(anchorData, null, 2));
  }

  async processProjects(csvData: CSVProject[]) {
    console.log(`📊 Processing ${csvData.length} projects...`);
    const db = await this.dbManager.getConnection();

    for (const csvProject of csvData) {
      try {
        this.report.projectsProcessed++;

        // Clean and validate data
        const projectData = {
          projectId: csvProject.projectId?.trim() || `proj_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          projectName: csvProject.projectName?.trim() || 'Unnamed Project',
          owner: csvProject.owner?.trim() || null,
          status: csvProject.status?.trim() || 'Planning',
          description: csvProject.description?.trim() || null,
          goals: csvProject.goals?.trim() || null,
          scopeNotes: csvProject.scopeNotes?.trim() || null,
          RAG: csvProject.RAG?.trim() || 'Green',
          startDate: csvProject.startDate?.trim() || null,
          endDate: csvProject.endDate?.trim() || null,
          priority: csvProject.priority?.trim() || 'Medium',
          budget: csvProject.budget && !isNaN(Number(csvProject.budget)) ? Number(csvProject.budget) : null,
          actualCost: csvProject.actualCost && !isNaN(Number(csvProject.actualCost)) ? Number(csvProject.actualCost) : null,
          estimatedHours: csvProject.estimatedHours && !isNaN(Number(csvProject.estimatedHours)) ? Number(csvProject.estimatedHours) : null,
          actualHours: csvProject.actualHours && !isNaN(Number(csvProject.actualHours)) ? Number(csvProject.actualHours) : null,
          completionPercentage: csvProject.completionPercentage && !isNaN(Number(csvProject.completionPercentage)) ? Number(csvProject.completionPercentage) : 0,
          risk: csvProject.risk?.trim() || 'Medium',
          stakeholders: csvProject.stakeholders?.trim() || null,
          tags: csvProject.tags?.trim() || null,
          category: csvProject.category?.trim() || null,
          department: csvProject.department?.trim() || null,
          isDraft: 0,
          createdAt: csvProject.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        // Check if project exists
        const existingProject = await db.get('SELECT projectId FROM projects WHERE projectId = ?', [projectData.projectId]);

        if (existingProject) {
          // Update existing project
          const setClause = Object.keys(projectData).filter(key => key !== 'projectId').map(key => `${key} = ?`).join(', ');
          const values = Object.entries(projectData).filter(([key]) => key !== 'projectId').map(([, value]) => value);
          values.push(projectData.projectId);

          await db.run(`UPDATE projects SET ${setClause} WHERE projectId = ?`, values);
          this.report.projectsUpdated++;
          console.log(`  ✅ Updated project: ${projectData.projectName}`);
        } else {
          // Insert new project
          const columns = Object.keys(projectData).join(', ');
          const placeholders = Object.keys(projectData).map(() => '?').join(', ');
          const values = Object.values(projectData);

          await db.run(`INSERT INTO projects (${columns}) VALUES (${placeholders})`, values);
          this.report.projectsInserted++;
          console.log(`  ➕ Inserted project: ${projectData.projectName}`);
        }

      } catch (error) {
        const errorMsg = `Project processing error: ${csvProject.projectName} - ${error}`;
        console.error(`  ❌ ${errorMsg}`);
        this.report.errors.push(errorMsg);
      }
    }
  }

  async processPhases(csvData: CSVPhase[]) {
    console.log(`📊 Processing ${csvData.length} phases...`);
    const db = await this.dbManager.getConnection();

    for (const csvPhase of csvData) {
      try {
        this.report.phasesProcessed++;

        // Clean and validate data
        const phaseData = {
          phaseid: csvPhase.phaseid?.trim() || `phase_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          phasename: csvPhase.phasename?.trim() || 'Unnamed Phase',
          project_ref: csvPhase.project_ref?.trim() || null,
          status: csvPhase.status?.trim() || 'Planned',
          startDate: csvPhase.startDate?.trim() || null,
          endDate: csvPhase.endDate?.trim() || null,
          RAG: csvPhase.RAG?.trim() || 'Green',
          notes: csvPhase.notes?.trim() || null,
          estimatedDuration: csvPhase.estimatedDuration && !isNaN(Number(csvPhase.estimatedDuration)) ? Number(csvPhase.estimatedDuration) : null,
          actualDuration: csvPhase.actualDuration && !isNaN(Number(csvPhase.actualDuration)) ? Number(csvPhase.actualDuration) : null,
          isDraft: 0,
          createdAt: csvPhase.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        // Check if phase is orphaned (no matching project)
        if (phaseData.project_ref) {
          const project = await db.get('SELECT projectId FROM projects WHERE projectId = ?', [phaseData.project_ref]);
          if (!project) {
            this.report.orphanPhases++;
            console.log(`  ⚠️  Orphan phase: ${phaseData.phasename} (project_ref: ${phaseData.project_ref})`);
          }
        } else {
          this.report.orphanPhases++;
          console.log(`  ⚠️  Phase without project reference: ${phaseData.phasename}`);
        }

        // Check if phase exists
        const existingPhase = await db.get('SELECT phaseid FROM phases WHERE phaseid = ?', [phaseData.phaseid]);

        if (existingPhase) {
          // Update existing phase
          const setClause = Object.keys(phaseData).filter(key => key !== 'phaseid').map(key => `${key} = ?`).join(', ');
          const values = Object.entries(phaseData).filter(([key]) => key !== 'phaseid').map(([, value]) => value);
          values.push(phaseData.phaseid);

          await db.run(`UPDATE phases SET ${setClause} WHERE phaseid = ?`, values);
          this.report.phasesUpdated++;
          console.log(`  ✅ Updated phase: ${phaseData.phasename}`);
        } else {
          // Insert new phase
          const columns = Object.keys(phaseData).join(', ');
          const placeholders = Object.keys(phaseData).map(() => '?').join(', ');
          const values = Object.values(phaseData);

          await db.run(`INSERT INTO phases (${columns}) VALUES (${placeholders})`, values);
          this.report.phasesInserted++;
          console.log(`  ➕ Inserted phase: ${phaseData.phasename}`);
        }

      } catch (error) {
        const errorMsg = `Phase processing error: ${csvPhase.phasename} - ${error}`;
        console.error(`  ❌ ${errorMsg}`);
        this.report.errors.push(errorMsg);
      }
    }
  }

  async generateReport() {
    const reportPath = path.join(process.cwd(), 'DriveMemory', 'OF-PRE-GH1-CanonicalPushReport.json');
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, JSON.stringify(this.report, null, 2));
    
    console.log('\n📋 CANONICAL DATA PUSH REPORT');
    console.log('='.repeat(50));
    console.log(`📅 Timestamp: ${this.report.timestamp}`);
    console.log(`📊 Projects: ${this.report.projectsProcessed} processed, ${this.report.projectsInserted} inserted, ${this.report.projectsUpdated} updated`);
    console.log(`🔄 Phases: ${this.report.phasesProcessed} processed, ${this.report.phasesInserted} inserted, ${this.report.phasesUpdated} updated`);
    console.log(`⚠️  Orphan Phases: ${this.report.orphanPhases}`);
    console.log(`❌ Errors: ${this.report.errors.length}`);
    
    if (this.report.errors.length > 0) {
      console.log('\n🚨 ERRORS:');
      this.report.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }
    
    console.log(`\n📄 Full report saved to: ${reportPath}`);
    return reportPath;
  }

  async run() {
    console.log('🚀 Starting Canonical Data Push to OF Database');
    console.log('='.repeat(60));

    try {
      // Find CSV files
      const projectsCsvPaths = [
        path.join(process.cwd(), 'cleaned-projects-snapshot.csv'),
        path.join(process.cwd(), 'public', 'cleaned-projects-snapshot.csv'),
        path.join(process.cwd(), 'DriveMemory', 'WT Projects Database 19 fields - WT Projects.csv')
      ];

      const phasesCsvPaths = [
        path.join(process.cwd(), 'cleaned-phases-snapshot.csv'),
        path.join(process.cwd(), 'public', 'cleaned-phases-snapshot.csv'),
        path.join(process.cwd(), 'DriveMemory', 'WT Phase Database 10 fields - WT Phases.csv')
      ];

      // Find existing CSV files
      let projectsCsv = null;
      let phasesCsv = null;

      for (const csvPath of projectsCsvPaths) {
        try {
          await fs.access(csvPath);
          projectsCsv = csvPath;
          console.log(`📁 Found projects CSV: ${csvPath}`);
          break;
        } catch {
          // File doesn't exist, continue
        }
      }

      for (const csvPath of phasesCsvPaths) {
        try {
          await fs.access(csvPath);
          phasesCsv = csvPath;
          console.log(`📁 Found phases CSV: ${csvPath}`);
          break;
        } catch {
          // File doesn't exist, continue
        }
      }

      if (!projectsCsv && !phasesCsv) {
        throw new Error('No CSV files found in expected locations');
      }

      // Create governance log for start
      const startLogId = await this.createGovernanceLog(
        'OF-PRE-GH1-CanonicalPushStart',
        'Starting canonical data push to OF database',
        { projectsCsv, phasesCsv }
      );

      // Process projects
      if (projectsCsv) {
        const projectsData = await this.parseCSVFile(projectsCsv);
        await this.processProjects(projectsData);
      }

      // Process phases
      if (phasesCsv) {
        const phasesData = await this.parseCSVFile(phasesCsv);
        await this.processPhases(phasesData);
      }

      // Create completion governance log
      const completeLogId = await this.createGovernanceLog(
        'OF-PRE-GH1-CanonicalPushComplete',
        'Canonical data push completed successfully',
        this.report
      );

      // Create memory anchor
      await this.createMemoryAnchor('of-pre-gh1-canonical-db-pushed', {
        ...this.report,
        startLogId,
        completeLogId
      });

      // Generate and save report
      const reportPath = await this.generateReport();

      console.log('\n✅ Canonical data push completed successfully!');
      return true;

    } catch (error) {
      console.error('\n❌ Canonical data push failed:', error);
      this.report.errors.push(`Fatal error: ${error}`);
      
      // Create failure governance log
      await this.createGovernanceLog(
        'OF-PRE-GH1-CanonicalPushError',
        'Canonical data push failed',
        { error: error instanceof Error ? error.message : String(error), report: this.report }
      );

      await this.generateReport();
      return false;
    } finally {
      await this.dbManager.closeAllConnections();
    }
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const pusher = new CanonicalDataPusher();
  pusher.run().then(success => {
    process.exit(success ? 0 : 1);
  });
}

export default CanonicalDataPusher;