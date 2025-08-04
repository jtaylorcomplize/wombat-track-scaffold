import fs from 'fs/promises';
import path from 'path';
import csv from 'csv-parser';
import { Readable } from 'stream';
import DatabaseManager from '../src/server/database/connection';

// Canonical CSV file paths
const PROJECTS_CSV = './WT Projects 23ce1901e36e811b946bc3e7d764c335_all.csv';
const PHASES_CSV = './WT Phase Database 23ce1901e36e81beb6b8e576174024e5_all.csv';

// Parse CSV file
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

// Map CSV columns to database schema
function mapProjectData(csvRow: any): any {
  return {
    projectId: csvRow['projectID'] || csvRow['projectId'] || `PROJ-${Date.now()}`,
    projectName: csvRow['Title'] || csvRow['projectName'] || 'Unknown Project',
    owner: csvRow['owner'] || 'system',
    status: csvRow['status'] || 'Planning',
    description: csvRow['description'] || '',
    goals: csvRow['goals'] || '',
    scopeNotes: csvRow['scopeNotes'] || '',
    RAG: csvRow['RAG'] || 'Green',
    startDate: csvRow['startDate'] || null,
    endDate: csvRow['endDate'] || null,
    priority: csvRow['priority'] || 'Medium',
    budget: parseFloat(csvRow['budget'] || '0'),
    actualCost: parseFloat(csvRow['actualCost'] || '0'),
    estimatedHours: parseFloat(csvRow['estimatedHours'] || '0'),
    actualHours: parseFloat(csvRow['actualHours'] || '0'),
    completionPercentage: parseFloat(csvRow['completionPercentage'] || '0'),
    risk: csvRow['risk'] || 'Medium',
    stakeholders: csvRow['stakeholders'] || '',
    tags: csvRow['tags'] || '',
    category: csvRow['category'] || '',
    department: csvRow['department'] || ''
  };
}

function mapPhaseData(csvRow: any): any {
  return {
    phaseid: csvRow['phaseid'] || `PHASE-${Date.now()}`,
    phasename: csvRow['phasename'] || 'Unknown Phase',
    project_ref: csvRow['projectId'] || csvRow['WT Projects'] || '',
    status: csvRow['status'] || 'Planned',
    startDate: csvRow['startDate'] || null,
    endDate: csvRow['endDate'] || null,
    RAG: csvRow['RAG'] || 'Green',
    notes: csvRow['notes'] || '',
    estimatedDuration: parseFloat(csvRow['estimatedDuration'] || '0'),
    actualDuration: parseFloat(csvRow['actualDuration'] || '0')
  };
}

async function importProjects() {
  console.log('📁 Importing Projects from CSV...');
  const dbManager = DatabaseManager.getInstance();
  const db = await dbManager.getConnection('production');
  
  try {
    // Parse CSV data
    const projectsData = await parseCSV(PROJECTS_CSV);
    console.log(`  Found ${projectsData.length} projects in CSV`);
    
    // Clear existing projects (optional - comment out to append)
    // await dbManager.executeQuery('DELETE FROM projects');
    
    let imported = 0;
    let skipped = 0;
    
    for (const csvRow of projectsData) {
      const project = mapProjectData(csvRow);
      
      // Check if project already exists
      const existing = await dbManager.executeQuery(
        'SELECT projectId FROM projects WHERE projectId = ?',
        [project.projectId]
      );
      
      if (existing.length > 0) {
        skipped++;
        continue;
      }
      
      // Insert project
      const query = `
        INSERT INTO projects (
          projectId, projectName, owner, status, description, goals, scopeNotes,
          RAG, startDate, endDate, priority, budget, actualCost, estimatedHours,
          actualHours, completionPercentage, risk, stakeholders, tags, category,
          department, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `;
      
      const params = [
        project.projectId, project.projectName, project.owner, project.status,
        project.description, project.goals, project.scopeNotes, project.RAG,
        project.startDate, project.endDate, project.priority, project.budget,
        project.actualCost, project.estimatedHours, project.actualHours,
        project.completionPercentage, project.risk, project.stakeholders,
        project.tags, project.category, project.department
      ];
      
      await dbManager.executeQuery(query, params);
      imported++;
    }
    
    console.log(`✅ Projects Import Complete: ${imported} imported, ${skipped} skipped`);
    return { imported, skipped, total: projectsData.length };
    
  } catch (error) {
    console.error('❌ Error importing projects:', error);
    throw error;
  }
}

async function importPhases() {
  console.log('📁 Importing Phases from CSV...');
  const dbManager = DatabaseManager.getInstance();
  const db = await dbManager.getConnection('production');
  
  try {
    // Parse CSV data
    const phasesData = await parseCSV(PHASES_CSV);
    console.log(`  Found ${phasesData.length} phases in CSV`);
    
    // Clear existing phases (optional - comment out to append)
    // await dbManager.executeQuery('DELETE FROM phases');
    
    let imported = 0;
    let skipped = 0;
    
    for (const csvRow of phasesData) {
      const phase = mapPhaseData(csvRow);
      
      // Check if phase already exists
      const existing = await dbManager.executeQuery(
        'SELECT phaseid FROM phases WHERE phaseid = ?',
        [phase.phaseid]
      );
      
      if (existing.length > 0) {
        skipped++;
        continue;
      }
      
      // Insert phase
      const query = `
        INSERT INTO phases (
          phaseid, phasename, project_ref, status, startDate, endDate,
          RAG, notes, estimatedDuration, actualDuration, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `;
      
      const params = [
        phase.phaseid, phase.phasename, phase.project_ref, phase.status,
        phase.startDate, phase.endDate, phase.RAG, phase.notes,
        phase.estimatedDuration, phase.actualDuration
      ];
      
      await dbManager.executeQuery(query, params);
      imported++;
    }
    
    console.log(`✅ Phases Import Complete: ${imported} imported, ${skipped} skipped`);
    return { imported, skipped, total: phasesData.length };
    
  } catch (error) {
    console.error('❌ Error importing phases:', error);
    throw error;
  }
}

async function logGovernanceEntry(details: any) {
  const dbManager = DatabaseManager.getInstance();
  
  const query = `
    INSERT INTO governance_logs (timestamp, event_type, user_id, user_role, resource_type, resource_id, action, success, details, runtime_context)
    VALUES (datetime('now'), ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  const params = [
    details.event_type,
    details.user_id || 'system',
    details.user_role || 'admin',
    details.resource_type,
    details.resource_id,
    details.action,
    details.success ? 1 : 0,
    JSON.stringify(details.details || {}),
    JSON.stringify(details.runtime_context || {})
  ];
  
  await dbManager.executeQuery(query, params);
  
  // Also log to JSONL file
  const governanceLogPath = path.join(process.cwd(), 'logs/governance.jsonl');
  const logEntry = {
    timestamp: new Date().toISOString(),
    ...details
  };
  await fs.appendFile(governanceLogPath, JSON.stringify(logEntry) + '\n');
}

async function main() {
  console.log('🚀 Starting Canonical CSV Import for OF Database');
  console.log('================================================');
  
  try {
    // Import projects
    const projectResult = await importProjects();
    
    // Import phases
    const phaseResult = await importPhases();
    
    // Log governance entry
    await logGovernanceEntry({
      event_type: 'data_import',
      user_id: 'system',
      user_role: 'admin',
      resource_type: 'database',
      resource_id: 'canonical_import',
      action: 'import_canonical_csv',
      success: true,
      details: {
        operation: 'OF-PRE-GH1 Canonical Data Import',
        projects: projectResult,
        phases: phaseResult,
        source: 'Canonical CSV Files',
        timestamp: new Date().toISOString()
      },
      runtime_context: {
        phase: 'OF-PRE-GH1',
        environment: 'data_import',
        script: 'import-canonical-csv.ts'
      }
    });
    
    // Create MemoryPlugin anchor
    const anchorPath = path.join(process.cwd(), 'DriveMemory/anchors/of-pre-gh1-dataexplorer.anchor');
    await fs.mkdir(path.dirname(anchorPath), { recursive: true });
    await fs.writeFile(anchorPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      phase: 'OF-PRE-GH1',
      operation: 'Canonical CSV Import',
      description: 'Imported canonical Projects and Phases data from CSV into OF database',
      results: {
        projects: projectResult,
        phases: phaseResult
      }
    }, null, 2));
    
    console.log('\n✅ Import Complete!');
    console.log(`📊 Summary:`);
    console.log(`   - Projects: ${projectResult.imported} imported, ${projectResult.skipped} skipped`);
    console.log(`   - Phases: ${phaseResult.imported} imported, ${phaseResult.skipped} skipped`);
    console.log(`📝 Governance log entry created`);
    console.log(`⚓ MemoryPlugin anchor created: of-pre-gh1-dataexplorer.anchor`);
    
  } catch (error) {
    console.error('\n❌ Import failed:', error);
    
    // Log failure to governance
    await logGovernanceEntry({
      event_type: 'data_import',
      user_id: 'system',
      user_role: 'admin',
      resource_type: 'database',
      resource_id: 'canonical_import',
      action: 'import_canonical_csv',
      success: false,
      details: {
        operation: 'OF-PRE-GH1 Canonical Data Import',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      runtime_context: {
        phase: 'OF-PRE-GH1',
        environment: 'data_import',
        script: 'import-canonical-csv.ts'
      }
    });
    
    process.exit(1);
  }
  
  process.exit(0);
}

// Run the import
main().catch(console.error);