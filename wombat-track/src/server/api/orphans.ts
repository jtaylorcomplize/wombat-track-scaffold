import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import csv from 'csv-parser';
import { stringify } from 'csv-stringify/sync';
import { Readable } from 'stream';
import DatabaseManager from '../database/connection';

const router = express.Router();

interface OrphanedRecord {
  id: string;
  table: string;
  field: string;
  missingReference: string;
  currentValue: any;
  record: any;
}

interface IntegrityIssue {
  table: string;
  orphanedRecords: OrphanedRecord[];
  totalOrphans: number;
  severity: 'high' | 'medium' | 'low';
}

// Helper to parse CSV
async function parseCSV(filePath: string): Promise<any[]> {
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
    return [];
  }
}

// Detect orphaned records using live canonical database
async function detectOrphans(): Promise<IntegrityIssue[]> {
  const issues: IntegrityIssue[] = [];
  
  try {
    const dbManager = DatabaseManager.getInstance();
    const db = await dbManager.getConnection('production');
    
    // Load data from live canonical database
    const projects = await dbManager.executeQuery('SELECT * FROM projects');
    const phases = await dbManager.executeQuery('SELECT * FROM phases');
    const stepProgress = await dbManager.executeQuery('SELECT * FROM step_progress');
    
    console.log(`🔍 Orphan Inspector: Checking ${projects.length} projects, ${phases.length} phases, ${stepProgress.length} steps`);
    
    // Create lookup maps
    const projectIds = new Set(projects.map((p: any) => p.projectId));
    const phaseIds = new Set(phases.map((p: any) => p.phaseid));
    
    // Check orphaned phases (phases without valid project reference)
    const orphanedPhases: OrphanedRecord[] = [];
    phases.forEach((phase: any) => {
      const projectRef = phase.project_ref;
      if (projectRef && !projectIds.has(projectRef)) {
        orphanedPhases.push({
          id: `phase-${phase.phaseid}`,
          table: 'phases',
          field: 'project_ref',
          missingReference: 'projects',
          currentValue: projectRef,
          record: phase
        });
      }
    });
    
    // Check orphaned step_progress records (steps without valid phase reference)
    const orphanedSteps: OrphanedRecord[] = [];
    stepProgress.forEach((step: any) => {
      const phaseRef = step.phaseId;
      if (phaseRef && !phaseIds.has(phaseRef)) {
        orphanedSteps.push({
          id: `step-${step.stepId}`,
          table: 'step_progress',
          field: 'phaseId',
          missingReference: 'phases',
          currentValue: phaseRef,
          record: step
        });
      }
    });
    
    if (orphanedPhases.length > 0) {
      issues.push({
        table: 'phases',
        orphanedRecords: orphanedPhases.slice(0, 10), // Limit to 10 for UI
        totalOrphans: orphanedPhases.length,
        severity: orphanedPhases.length > 20 ? 'high' : orphanedPhases.length > 10 ? 'medium' : 'low'
      });
    }
    
    if (orphanedSteps.length > 0) {
      issues.push({
        table: 'step_progress',
        orphanedRecords: orphanedSteps.slice(0, 10),
        totalOrphans: orphanedSteps.length,
        severity: orphanedSteps.length > 20 ? 'high' : orphanedSteps.length > 10 ? 'medium' : 'low'
      });
    }
    
    // Check projects without owners (not technically orphaned, but missing critical data)
    const projectsWithoutOwners = projects.filter((p: any) => !p.owner || p.owner.trim() === '');
    if (projectsWithoutOwners.length > 0) {
      const orphanedProjects: OrphanedRecord[] = projectsWithoutOwners.map((project: any) => ({
        id: `project-${project.projectId}`,
        table: 'projects',
        field: 'owner',
        missingReference: 'users',
        currentValue: project.owner || 'null',
        record: project
      }));
      
      issues.push({
        table: 'projects',
        orphanedRecords: orphanedProjects.slice(0, 10),
        totalOrphans: orphanedProjects.length,
        severity: orphanedProjects.length > 50 ? 'high' : orphanedProjects.length > 20 ? 'medium' : 'low'
      });
    }
    
  } catch (error) {
    console.error('Error detecting orphans:', error);
  }
  
  return issues;
}

// Get orphaned records endpoint
router.get('/', async (req, res) => {
  try {
    const issues = await detectOrphans();
    
    res.json({
      timestamp: new Date().toISOString(),
      issues,
      summary: {
        totalTables: issues.length,
        totalOrphans: issues.reduce((sum, issue) => sum + issue.totalOrphans, 0),
        highSeverity: issues.filter(i => i.severity === 'high').length,
        mediumSeverity: issues.filter(i => i.severity === 'medium').length,
        lowSeverity: issues.filter(i => i.severity === 'low').length
      }
    });

  } catch (error) {
    console.error('Error fetching orphaned data:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to fetch orphaned data'
    });
  }
});

// Fix orphaned record endpoint
router.patch('/fix/:tableName', async (req, res) => {
  const { tableName } = req.params;
  const { recordId, field, value, action } = req.body;
  
  try {
    const dbManager = DatabaseManager.getInstance();
    const db = await dbManager.getConnection('production');
    
    let fixApplied = false;
    let oldValue: any = null;
    
    if (action === 'delete') {
      // Delete the record
      let deleteQuery: string;
      let deleteParams: any[];
      
      switch (tableName) {
        case 'projects':
          deleteQuery = 'DELETE FROM projects WHERE projectId = ?';
          deleteParams = [recordId];
          break;
        case 'phases':
          deleteQuery = 'DELETE FROM phases WHERE phaseid = ?';
          deleteParams = [recordId];
          break;
        case 'step_progress':
          deleteQuery = 'DELETE FROM step_progress WHERE stepId = ?';
          deleteParams = [recordId];
          break;
        default:
          return res.status(400).json({ error: 'Invalid table name' });
      }
      
      const deleteResult = await dbManager.executeQuery(deleteQuery, deleteParams);
      fixApplied = deleteResult && deleteResult.changes > 0;
      
    } else {
      // Update the field
      let updateQuery: string;
      let selectQuery: string;
      let updateParams: any[];
      let selectParams: any[];
      
      switch (tableName) {
        case 'projects':
          selectQuery = `SELECT ${field} FROM projects WHERE projectId = ?`;
          updateQuery = `UPDATE projects SET ${field} = ?, updatedAt = CURRENT_TIMESTAMP WHERE projectId = ?`;
          selectParams = [recordId];
          updateParams = [value, recordId];
          break;
        case 'phases':
          selectQuery = `SELECT ${field} FROM phases WHERE phaseid = ?`;
          updateQuery = `UPDATE phases SET ${field} = ?, updatedAt = CURRENT_TIMESTAMP WHERE phaseid = ?`;
          selectParams = [recordId];
          updateParams = [value, recordId];
          break;
        case 'step_progress':
          selectQuery = `SELECT ${field} FROM step_progress WHERE stepId = ?`;
          updateQuery = `UPDATE step_progress SET ${field} = ?, updatedAt = CURRENT_TIMESTAMP WHERE stepId = ?`;
          selectParams = [recordId];
          updateParams = [value, recordId];
          break;
        default:
          return res.status(400).json({ error: 'Invalid table name' });
      }
      
      // Get old value first
      const oldRecord = await dbManager.executeQuery(selectQuery, selectParams);
      if (oldRecord && oldRecord.length > 0) {
        oldValue = oldRecord[0][field];
      }
      
      // Apply the update
      const updateResult = await dbManager.executeQuery(updateQuery, updateParams);
      fixApplied = updateResult && updateResult.changes > 0;
    }
    
    if (!fixApplied) {
      return res.status(404).json({ error: 'Record not found or no changes made' });
    }
    
    // Log fix to governance
    const governanceEntry = {
      timestamp: new Date().toISOString(),
      event_type: 'orphan_data_fix',
      user_id: req.headers['x-user-id'] || 'admin',
      user_role: 'admin',
      resource_type: 'data_integrity',
      resource_id: `${tableName}_${recordId}`,
      action: action === 'delete' ? 'delete_orphan' : 'fix_orphan',
      success: true,
      details: {
        operation: 'Orphan Database Fix',
        table: tableName,
        recordId,
        field,
        oldValue,
        newValue: value,
        action,
        method: 'live_database_update'
      },
      runtime_context: {
        phase: 'OF-9.0.7.3',
        environment: 'data_integrity'
      }
    };

    const governanceLogPath = path.join(process.cwd(), 'logs/governance.jsonl');
    await fs.appendFile(governanceLogPath, JSON.stringify(governanceEntry) + '\n');
    
    // Create MemoryPlugin anchor for major fixes
    if (action === 'delete' || field === 'project_ref' || field === 'phaseId') {
      const anchorPath = path.join(
        process.cwd(),
        'DriveMemory/OrbisForge/BackEndVisibility/integrity-fixes',
        `${tableName}_fix_${Date.now()}.json`
      );
      
      await fs.mkdir(path.dirname(anchorPath), { recursive: true });
      await fs.writeFile(anchorPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        fix: governanceEntry.details,
        memoryplugin_anchor: `of-bev-integrity-fix-${Date.now()}`
      }, null, 2));
    }
    
    res.json({
      success: true,
      message: `Successfully ${action === 'delete' ? 'deleted' : 'fixed'} orphaned record`,
      recordId,
      field,
      value,
      oldValue,
      method: 'database_update'
    });

  } catch (error) {
    console.error('Error applying fix:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to apply fix'
    });
  }
});

// Get all available projects and phases for fix options
router.get('/fix-options', async (req, res) => {
  try {
    const dbManager = DatabaseManager.getInstance();
    
    // Get all projects
    const projects = await dbManager.executeQuery('SELECT projectId, projectName FROM projects ORDER BY projectName');
    
    // Get all phases
    const phases = await dbManager.executeQuery('SELECT phaseid, phasename, project_ref FROM phases ORDER BY phasename');
    
    const fixOptions = {
      projects: projects.map((p: any) => ({
        value: p.projectId,
        label: `${p.projectId} - ${p.projectName}`
      })),
      phases: phases.map((p: any) => ({
        value: p.phaseid,
        label: `${p.phaseid} - ${p.phasename}`,
        project_ref: p.project_ref
      }))
    };

    res.json({
      success: true,
      fixOptions,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching fix options:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch fix options'
    });
  }
});

export default router;