import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import csv from 'csv-parser';
import { stringify } from 'csv-stringify/sync';
import { Readable } from 'stream';

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

// Detect orphaned records
async function detectOrphans(): Promise<IntegrityIssue[]> {
  const issues: IntegrityIssue[] = [];
  
  try {
    // Load data from CSV files
    const projects = await parseCSV(path.join(process.cwd(), 'cleaned-projects-snapshot.csv'));
    const phases = await parseCSV(path.join(process.cwd(), 'cleaned-phases-snapshot.csv'));
    
    // Create lookup maps
    const projectIds = new Set(projects.map(p => p.projectId));
    
    // Check orphaned phases (phases without valid project reference)
    const orphanedPhases: OrphanedRecord[] = [];
    phases.forEach(phase => {
      const projectRef = phase['WT Projects'];
      if (projectRef && !projectIds.has(projectRef)) {
        orphanedPhases.push({
          id: `phase-${phase.phaseid}`,
          table: 'phases',
          field: 'WT Projects',
          missingReference: 'projects',
          currentValue: projectRef,
          record: phase
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
    
    // Check projects without owners (not technically orphaned, but missing critical data)
    const projectsWithoutOwners = projects.filter(p => !p.owner || p.owner.trim() === '');
    if (projectsWithoutOwners.length > 0) {
      const orphanedProjects: OrphanedRecord[] = projectsWithoutOwners.map(project => ({
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
    let filePath: string;
    let data: any[];
    
    // Determine file path based on table
    switch (tableName) {
      case 'projects':
        filePath = path.join(process.cwd(), 'cleaned-projects-snapshot.csv');
        break;
      case 'phases':
        filePath = path.join(process.cwd(), 'cleaned-phases-snapshot.csv');
        break;
      default:
        return res.status(400).json({ error: 'Invalid table name' });
    }
    
    // Read current data
    data = await parseCSV(filePath);
    
    // Apply fix
    let fixApplied = false;
    if (action === 'delete') {
      // Remove the record
      const originalLength = data.length;
      data = data.filter(record => {
        const id = record.projectId || record.phaseid || record.id;
        return id !== recordId;
      });
      fixApplied = data.length < originalLength;
    } else {
      // Update the field
      data = data.map(record => {
        const id = record.projectId || record.phaseid || record.id;
        if (id === recordId) {
          record[field] = value;
          fixApplied = true;
        }
        return record;
      });
    }
    
    if (!fixApplied) {
      return res.status(404).json({ error: 'Record not found' });
    }
    
    // Write updated data back
    const csvContent = stringify(data, {
      header: true,
      columns: Object.keys(data[0])
    });
    
    await fs.writeFile(filePath, csvContent);
    
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
        operation: 'Orphan Data Fix',
        table: tableName,
        recordId,
        field,
        oldValue: null,
        newValue: value,
        action
      },
      runtime_context: {
        phase: 'OF-BEV-2.3',
        environment: 'data_integrity'
      }
    };

    const governanceLogPath = path.join(process.cwd(), 'logs/governance.jsonl');
    await fs.appendFile(governanceLogPath, JSON.stringify(governanceEntry) + '\n');
    
    // Create MemoryPlugin anchor for major fixes
    if (action === 'delete' || field === 'owner') {
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
      value
    });

  } catch (error) {
    console.error('Error applying fix:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to apply fix'
    });
  }
});

export default router;