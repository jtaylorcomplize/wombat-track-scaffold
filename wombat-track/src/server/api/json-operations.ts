import express from 'express';
import DatabaseManager from '../database/connection';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import multer from 'multer';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });
const dbManager = DatabaseManager.getInstance();

interface SchemaExport {
  metadata: {
    timestamp: string;
    exportType: 'full_schema';
    version: string;
    hash: string;
    recordCounts: Record<string, number>;
  };
  tables: {
    projects: any[];
    phases: any[];
    step_progress: any[];
    governance_logs: any[];
  };
}

// Helper function to generate hash for data integrity
function generateDataHash(data: any): string {
  const dataString = JSON.stringify(data, null, 0);
  return crypto.createHash('sha256').update(dataString).digest('hex');
}

// Helper function to log governance entry
async function logGovernanceEntry(details: any): Promise<number> {
  const query = `
    INSERT INTO governance_logs (timestamp, event_type, user_id, user_role, resource_type, resource_id, action, success, details, runtime_context)
    VALUES (datetime('now'), ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  const params = [
    details.event_type,
    details.user_id || 'admin',
    details.user_role || 'admin',
    details.resource_type,
    details.resource_id,
    details.action,
    details.success ? 1 : 0,
    JSON.stringify(details.details || {}),
    JSON.stringify(details.runtime_context || {})
  ];
  
  const result = await dbManager.executeQuery(query, params);
  return result.lastID;
}

// Export full database schema to JSON
router.get('/export', async (req, res) => {
  const userId = req.headers['x-user-id'] as string || 'admin';
  
  try {
    // Get all data from each table
    const projects = await dbManager.executeQuery('SELECT * FROM projects ORDER BY updatedAt DESC');
    const phases = await dbManager.executeQuery('SELECT * FROM phases ORDER BY updatedAt DESC');
    const stepProgress = await dbManager.executeQuery('SELECT * FROM step_progress ORDER BY updatedAt DESC');
    const governanceLogs = await dbManager.executeQuery('SELECT * FROM governance_logs ORDER BY timestamp DESC LIMIT 1000'); // Limit governance logs to last 1000 entries
    
    const exportData: SchemaExport = {
      metadata: {
        timestamp: new Date().toISOString(),
        exportType: 'full_schema',
        version: '3.0',
        hash: '',
        recordCounts: {
          projects: projects.length,
          phases: phases.length,
          step_progress: stepProgress.length,
          governance_logs: governanceLogs.length
        }
      },
      tables: {
        projects,
        phases,
        step_progress: stepProgress,
        governance_logs: governanceLogs
      }
    };
    
    // Generate hash after data is complete
    exportData.metadata.hash = generateDataHash(exportData.tables);
    
    // Save export to DriveMemory
    const exportPath = path.join(
      process.cwd(),
      'DriveMemory/OrbisForge/BackEndVisibility/Phase3/exports',
      `full_schema_export_${Date.now()}.json`
    );
    
    await fs.mkdir(path.dirname(exportPath), { recursive: true });
    await fs.writeFile(exportPath, JSON.stringify(exportData, null, 2));
    
    // Log export to governance
    const governanceLogId = await logGovernanceEntry({
      event_type: 'schema_export',
      user_id: userId,
      user_role: 'admin',
      resource_type: 'database_schema',
      resource_id: 'full_export',
      action: 'export_json',
      success: true,
      details: {
        operation: 'Full Schema JSON Export',
        recordCounts: exportData.metadata.recordCounts,
        hash: exportData.metadata.hash,
        exportPath: path.basename(exportPath)
      },
      runtime_context: {
        phase: 'OF-BEV-3.3',
        environment: 'json_operations'
      }
    });
    
    // Set headers for file download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="orbis_forge_export_${Date.now()}.json"`);
    
    res.json(exportData);

  } catch (error) {
    console.error('Error exporting schema:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to export database schema'
    });
  }
});

// Preview JSON import without applying changes
router.post('/preview', upload.single('file'), async (req, res) => {
  const file = req.file;
  const userId = req.headers['x-user-id'] as string || 'admin';

  if (!file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    // Read and parse the uploaded JSON
    const fileContent = await fs.readFile(file.path, 'utf-8');
    const importData = JSON.parse(fileContent);
    
    // Validate structure
    if (!importData.metadata || !importData.tables) {
      await fs.unlink(file.path).catch(() => {});
      return res.status(400).json({ 
        error: 'Invalid JSON structure',
        expected: 'File must contain metadata and tables properties'
      });
    }
    
    // Verify hash if present
    let hashValid = true;
    if (importData.metadata.hash) {
      const calculatedHash = generateDataHash(importData.tables);
      hashValid = calculatedHash === importData.metadata.hash;
    }
    
    // Analyze changes that would be made
    const currentProjects = await dbManager.executeQuery('SELECT * FROM projects');
    const currentPhases = await dbManager.executeQuery('SELECT * FROM phases');
    const currentStepProgress = await dbManager.executeQuery('SELECT * FROM step_progress');
    
    const analysis = {
      projects: {
        current: currentProjects.length,
        import: importData.tables.projects?.length || 0,
        new: 0,
        updated: 0,
        deleted: 0
      },
      phases: {
        current: currentPhases.length,
        import: importData.tables.phases?.length || 0,
        new: 0,
        updated: 0,
        deleted: 0
      },
      step_progress: {
        current: currentStepProgress.length,
        import: importData.tables.step_progress?.length || 0,
        new: 0,
        updated: 0,
        deleted: 0
      }
    };
    
    // Calculate detailed changes for projects
    if (importData.tables.projects) {
      const currentProjectIds = new Set(currentProjects.map(p => p.projectId));
      const importProjectIds = new Set(importData.tables.projects.map(p => p.projectId));
      
      analysis.projects.new = importData.tables.projects.filter(p => !currentProjectIds.has(p.projectId)).length;
      analysis.projects.deleted = currentProjects.filter(p => !importProjectIds.has(p.projectId)).length;
      analysis.projects.updated = importData.tables.projects.filter(p => currentProjectIds.has(p.projectId)).length;
    }
    
    // Clean up uploaded file
    await fs.unlink(file.path).catch(() => {});
    
    res.json({
      valid: true,
      hashValid,
      metadata: importData.metadata,
      analysis,
      warnings: [
        ...(hashValid ? [] : ['Hash verification failed - data may be corrupted']),
        ...(analysis.projects.deleted > 0 ? [`${analysis.projects.deleted} projects will be deleted`] : []),
        ...(analysis.phases.deleted > 0 ? [`${analysis.phases.deleted} phases will be deleted`] : [])
      ],
      readyForImport: hashValid
    });

  } catch (error) {
    console.error('Error previewing import:', error);
    await fs.unlink(file.path).catch(() => {});
    res.status(400).json({ 
      error: 'Invalid JSON file',
      message: error instanceof Error ? error.message : 'Failed to parse JSON'
    });
  }
});

// Import JSON data with transaction safety
router.post('/import', upload.single('file'), async (req, res) => {
  const file = req.file;
  const userId = req.headers['x-user-id'] as string || 'admin';
  const { skipHashCheck = false } = req.body;

  if (!file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  let transactionId: string | undefined;
  
  try {
    // Read and parse the uploaded JSON
    const fileContent = await fs.readFile(file.path, 'utf-8');
    const importData = JSON.parse(fileContent);
    
    // Validate structure
    if (!importData.metadata || !importData.tables) {
      await fs.unlink(file.path).catch(() => {});
      return res.status(400).json({ 
        error: 'Invalid JSON structure',
        expected: 'File must contain metadata and tables properties'
      });
    }
    
    // Verify hash unless skipped
    if (!skipHashCheck && importData.metadata.hash) {
      const calculatedHash = generateDataHash(importData.tables);
      if (calculatedHash !== importData.metadata.hash) {
        await fs.unlink(file.path).catch(() => {});
        return res.status(400).json({ 
          error: 'Hash verification failed',
          message: 'Data integrity check failed. Use skipHashCheck=true to override.'
        });
      }
    }
    
    // Begin transaction
    transactionId = await dbManager.beginTransaction();
    
    // Create backup before import
    const backupData = {
      projects: await dbManager.executeQuery('SELECT * FROM projects', [], transactionId),
      phases: await dbManager.executeQuery('SELECT * FROM phases', [], transactionId),
      step_progress: await dbManager.executeQuery('SELECT * FROM step_progress', [], transactionId)
    };
    
    const backupPath = path.join(
      process.cwd(),
      'DriveMemory/OrbisForge/BackEndVisibility/Phase3/backups',
      `pre_import_backup_${Date.now()}.json`
    );
    
    await fs.mkdir(path.dirname(backupPath), { recursive: true });
    await fs.writeFile(backupPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      backup_type: 'pre_import',
      tables: backupData
    }, null, 2));
    
    // Clear existing data (except governance logs)
    await dbManager.executeQuery('DELETE FROM step_progress', [], transactionId);
    await dbManager.executeQuery('DELETE FROM phases', [], transactionId);
    await dbManager.executeQuery('DELETE FROM projects', [], transactionId);
    
    // Import projects
    if (importData.tables.projects) {
      for (const project of importData.tables.projects) {
        const fields = Object.keys(project);
        const placeholders = fields.map(() => '?').join(', ');
        const query = `INSERT INTO projects (${fields.join(', ')}) VALUES (${placeholders})`;
        await dbManager.executeQuery(query, Object.values(project), transactionId);
      }
    }
    
    // Import phases
    if (importData.tables.phases) {
      for (const phase of importData.tables.phases) {
        const fields = Object.keys(phase);
        const placeholders = fields.map(() => '?').join(', ');
        const query = `INSERT INTO phases (${fields.join(', ')}) VALUES (${placeholders})`;
        await dbManager.executeQuery(query, Object.values(phase), transactionId);
      }
    }
    
    // Import step progress
    if (importData.tables.step_progress) {
      for (const step of importData.tables.step_progress) {
        const fields = Object.keys(step);
        const placeholders = fields.map(() => '?').join(', ');
        const query = `INSERT INTO step_progress (${fields.join(', ')}) VALUES (${placeholders})`;
        await dbManager.executeQuery(query, Object.values(step), transactionId);
      }
    }
    
    // Log import to governance
    const governanceLogId = await logGovernanceEntry({
      event_type: 'schema_import',
      user_id: userId,
      user_role: 'admin',
      resource_type: 'database_schema',
      resource_id: 'full_import',
      action: 'import_json',
      success: true,
      details: {
        operation: 'Full Schema JSON Import',
        importMetadata: importData.metadata,
        recordsImported: {
          projects: importData.tables.projects?.length || 0,
          phases: importData.tables.phases?.length || 0,
          step_progress: importData.tables.step_progress?.length || 0
        },
        backupPath: path.basename(backupPath)
      },
      runtime_context: {
        phase: 'OF-BEV-3.3',
        environment: 'json_operations',
        transaction_id: transactionId
      }
    });
    
    // Commit transaction
    await dbManager.commitTransaction(transactionId);
    
    // Save import metadata to DriveMemory
    const importMetadataPath = path.join(
      process.cwd(),
      'DriveMemory/OrbisForge/BackEndVisibility/Phase3/imports',
      `import_metadata_${Date.now()}.json`
    );
    
    await fs.mkdir(path.dirname(importMetadataPath), { recursive: true });
    await fs.writeFile(importMetadataPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      import_metadata: importData.metadata,
      user: userId,
      transaction_id: transactionId,
      governance_log_id: governanceLogId,
      backup_path: backupPath,
      memoryplugin_anchor: `of-bev-json-import-${Date.now()}`
    }, null, 2));
    
    // Clean up uploaded file
    await fs.unlink(file.path).catch(() => {});
    
    res.json({
      success: true,
      message: 'Database import completed successfully',
      importMetadata: importData.metadata,
      recordsImported: {
        projects: importData.tables.projects?.length || 0,
        phases: importData.tables.phases?.length || 0,
        step_progress: importData.tables.step_progress?.length || 0
      },
      transactionId,
      governanceLogId,
      backupPath: path.basename(backupPath)
    });

  } catch (error) {
    console.error('Error importing data:', error);
    
    if (transactionId) {
      try {
        await dbManager.rollbackTransaction(transactionId);
      } catch (rollbackError) {
        console.error('Error rolling back transaction:', rollbackError);
      }
    }
    
    await fs.unlink(file.path).catch(() => {});
    
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to import data - transaction rolled back'
    });
  }
});

// Get import/export history
router.get('/history', async (req, res) => {
  try {
    const query = `
      SELECT * FROM governance_logs 
      WHERE event_type IN ('schema_export', 'schema_import')
      ORDER BY timestamp DESC 
      LIMIT 50
    `;
    
    const history = await dbManager.executeQuery(query);
    
    res.json({
      historyCount: history.length,
      history: history.map(entry => ({
        ...entry,
        details: JSON.parse(entry.details)
      })),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching import/export history:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to fetch history'
    });
  }
});

export default router;