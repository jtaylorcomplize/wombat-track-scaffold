import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import csv from 'csv-parser';
import { stringify } from 'csv-stringify/sync';
import { Readable } from 'stream';
import multer from 'multer';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// Enhanced table configurations with support for all table types
const TABLE_CONFIG = {
  projects: {
    csvFile: 'cleaned-projects-snapshot.csv',
    dataSource: 'csv',
    primaryKey: 'projectId',
    requiredFields: ['projectName', 'projectId', 'status'],
    foreignKeys: { owner: 'users' },
    supportsExport: true
  },
  phases: {
    csvFile: 'cleaned-phases-snapshot.csv',
    dataSource: 'csv',
    primaryKey: 'phaseid',
    requiredFields: ['phasename', 'phaseid', 'WT Projects'],
    foreignKeys: { 'WT Projects': 'projects' },
    supportsExport: true
  },
  step_progress: {
    csvFile: 'step-progress-snapshot.csv',
    dataSource: 'csv',
    primaryKey: 'stepId',
    requiredFields: ['stepId', 'phaseId', 'status'],
    foreignKeys: { phaseId: 'phases' },
    supportsExport: true
  },
  governance_logs: {
    jsonlFile: 'logs/governance.jsonl',
    dataSource: 'jsonl',
    primaryKey: 'id',
    requiredFields: ['timestamp', 'event_type'],
    foreignKeys: {},
    supportsExport: true,
    exportSensitive: true // Requires special handling
  },
  sub_apps: {
    csvFile: 'Sub-Apps 23ee1901e36e81deba63ce1abf2ed31e_all.csv',
    dataSource: 'csv',
    primaryKey: 'id',
    requiredFields: ['name'],
    foreignKeys: {},
    supportsExport: true
  }
};

// Helper to parse CSV file
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

// Helper to parse JSONL file
async function parseJSONL(filePath: string): Promise<any[]> {
  try {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const lines = fileContent.trim().split('\n').filter(line => line.trim());
    return lines.map(line => {
      try {
        return JSON.parse(line);
      } catch (e) {
        console.warn('Invalid JSON line:', line.substring(0, 100));
        return null;
      }
    }).filter(item => item !== null);
  } catch (error) {
    console.error(`Error reading JSONL file ${filePath}:`, error);
    return [];
  }
}

// Helper to get data from any supported source
async function getTableData(tableName: string, config: any): Promise<any[]> {
  let data: any[] = [];
  
  try {
    if (config.dataSource === 'csv' && config.csvFile) {
      const filePath = path.join(process.cwd(), config.csvFile);
      data = await parseCSV(filePath);
    } else if (config.dataSource === 'jsonl' && config.jsonlFile) {
      const filePath = path.join(process.cwd(), config.jsonlFile);
      data = await parseJSONL(filePath);
    }
  } catch (error) {
    console.warn(`Could not load data for ${tableName}:`, error);
  }
  
  return data;
}

// Export table to CSV
router.get('/export/:tableName', async (req, res) => {
  const { tableName } = req.params;
  
  if (!TABLE_CONFIG[tableName as keyof typeof TABLE_CONFIG]) {
    return res.status(404).json({ 
      error: 'Table not found',
      availableTables: Object.keys(TABLE_CONFIG).filter(t => TABLE_CONFIG[t as keyof typeof TABLE_CONFIG].supportsExport),
      message: `Table '${tableName}' is not available for export. Check available tables list.`
    });
  }

  try {
    const config = TABLE_CONFIG[tableName as keyof typeof TABLE_CONFIG];
    
    if (!config.supportsExport) {
      return res.status(403).json({
        error: 'Export not supported',
        message: `Table '${tableName}' does not support export operations`
      });
    }
    
    // Get data using the unified helper function
    const data = await getTableData(tableName, config);

    if (data.length === 0) {
      console.warn(`No data found for ${tableName}, exporting empty dataset`);
    }

    // Handle sensitive data exports (governance_logs)
    let exportData = data;
    if (config.exportSensitive && tableName === 'governance_logs') {
      // For governance logs, limit to last 1000 entries and sanitize sensitive fields
      exportData = data
        .slice(-1000) // Last 1000 entries
        .map(entry => ({
          ...entry,
          // Remove potentially sensitive details if needed
          user_id: entry.user_id || 'system',
          timestamp: entry.timestamp,
          event_type: entry.event_type,
          action: entry.action,
          success: entry.success,
          resource_type: entry.resource_type,
          resource_id: entry.resource_id
        }));
    }

    // Convert to CSV format
    const csvContent = stringify(exportData, {
      header: true,
      columns: exportData.length > 0 ? Object.keys(exportData[0]) : config.requiredFields
    });

    // Set headers for file download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${tableName}_export_${Date.now()}.csv"`);
    
    // Log export to governance (avoid recursion for governance_logs)
    if (tableName !== 'governance_logs') {
      const governanceEntry = {
        timestamp: new Date().toISOString(),
        event_type: 'data_export',
        user_id: req.headers['x-user-id'] || 'admin',
        user_role: 'admin',
        resource_type: 'table_export',
        resource_id: tableName,
        action: 'export_csv',
        success: true,
        details: {
          operation: 'CSV Export',
          table: tableName,
          dataSource: config.dataSource,
          recordCount: data.length,
          exportedRecords: exportData.length,
          exportPath: `${tableName}_export_${Date.now()}.csv`
        },
        runtime_context: {
          phase: 'WT-ADMIN-UI-4.0',
          environment: 'data_pipeline'
        }
      };

      const governanceLogPath = path.join(process.cwd(), 'logs/governance.jsonl');
      await fs.appendFile(governanceLogPath, JSON.stringify(governanceEntry) + '\n');
    }

    // Save export to DriveMemory for audit trail
    const exportArtifactPath = path.join(
      process.cwd(),
      'DriveMemory/OrbisForge/BackEndVisibility/exports',
      `${tableName}_export_${Date.now()}.csv`
    );
    
    await fs.mkdir(path.dirname(exportArtifactPath), { recursive: true });
    await fs.writeFile(exportArtifactPath, csvContent);

    res.send(csvContent);

  } catch (error) {
    console.error(`Error exporting ${tableName}:`, error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: `Failed to export ${tableName}: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }
});

// Import CSV to table
router.post('/import/:tableName', upload.single('file'), async (req, res) => {
  const { tableName } = req.params;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  if (!TABLE_CONFIG[tableName as keyof typeof TABLE_CONFIG]) {
    // Clean up uploaded file
    await fs.unlink(file.path).catch(() => {});
    return res.status(404).json({ 
      error: 'Table not found',
      availableTables: Object.keys(TABLE_CONFIG)
    });
  }

  try {
    const config = TABLE_CONFIG[tableName as keyof typeof TABLE_CONFIG];
    
    // Parse uploaded CSV
    const uploadedData = await parseCSV(file.path);
    
    // Validate data
    const validation = validateImportData(uploadedData, config);
    
    if (!validation.valid) {
      // Clean up uploaded file
      await fs.unlink(file.path).catch(() => {});
      return res.status(400).json({
        error: 'Validation failed',
        issues: validation.issues
      });
    }

    // Backup existing data
    const backupPath = path.join(
      process.cwd(), 
      'DriveMemory/OrbisForge/BackEndVisibility/backups',
      `${tableName}_backup_${Date.now()}.csv`
    );
    
    // Ensure backup directory exists
    await fs.mkdir(path.dirname(backupPath), { recursive: true });
    
    // Read existing data for backup
    const existingFilePath = path.join(process.cwd(), config.csvFile);
    try {
      const existingData = await fs.readFile(existingFilePath, 'utf-8');
      await fs.writeFile(backupPath, existingData);
    } catch (error) {
      console.warn('No existing data to backup');
    }

    // Write new data
    const csvContent = stringify(uploadedData, {
      header: true,
      columns: Object.keys(uploadedData[0])
    });
    
    await fs.writeFile(existingFilePath, csvContent);

    // Log import to governance and DriveMemory
    const governanceEntry = {
      timestamp: new Date().toISOString(),
      event_type: 'data_import',
      user_id: req.headers['x-user-id'] || 'admin',
      user_role: 'admin',
      resource_type: 'table_import',
      resource_id: tableName,
      action: 'import_csv',
      success: true,
      details: {
        operation: 'CSV Import',
        table: tableName,
        recordCount: uploadedData.length,
        backupPath,
        validation: validation.summary
      },
      runtime_context: {
        phase: 'OF-BEV-2.2',
        environment: 'data_pipeline'
      }
    };

    const governanceLogPath = path.join(process.cwd(), 'logs/governance.jsonl');
    await fs.appendFile(governanceLogPath, JSON.stringify(governanceEntry) + '\n');

    // Save import summary to DriveMemory
    const importSummaryPath = path.join(
      process.cwd(),
      'DriveMemory/OrbisForge/BackEndVisibility/imports',
      `${tableName}_import_${Date.now()}.json`
    );
    
    await fs.mkdir(path.dirname(importSummaryPath), { recursive: true });
    await fs.writeFile(importSummaryPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      table: tableName,
      recordCount: uploadedData.length,
      user: req.headers['x-user-id'] || 'admin',
      validation: validation.summary,
      backupPath
    }, null, 2));

    // Clean up uploaded file
    await fs.unlink(file.path).catch(() => {});

    res.json({
      success: true,
      message: `Successfully imported ${uploadedData.length} records to ${tableName}`,
      backupPath,
      validation: validation.summary
    });

  } catch (error) {
    console.error(`Error importing ${tableName}:`, error);
    // Clean up uploaded file
    await fs.unlink(file.path).catch(() => {});
    res.status(500).json({ 
      error: 'Internal server error',
      message: `Failed to import ${tableName}`
    });
  }
});

// Validate import data
function validateImportData(data: any[], config: any) {
  const issues: string[] = [];
  const summary = {
    totalRecords: data.length,
    validRecords: 0,
    duplicates: 0,
    missingRequired: 0,
    invalidForeignKeys: 0
  };

  const primaryKeys = new Set<string>();

  data.forEach((record, index) => {
    let recordValid = true;

    // Check required fields
    for (const field of config.requiredFields) {
      if (!record[field] || record[field].trim() === '') {
        issues.push(`Row ${index + 1}: Missing required field '${field}'`);
        summary.missingRequired++;
        recordValid = false;
      }
    }

    // Check primary key uniqueness
    const primaryKeyValue = record[config.primaryKey];
    if (primaryKeyValue) {
      if (primaryKeys.has(primaryKeyValue)) {
        issues.push(`Row ${index + 1}: Duplicate primary key '${primaryKeyValue}'`);
        summary.duplicates++;
        recordValid = false;
      } else {
        primaryKeys.add(primaryKeyValue);
      }
    }

    if (recordValid) {
      summary.validRecords++;
    }
  });

  return {
    valid: issues.length === 0,
    issues: issues.slice(0, 10), // Return max 10 issues
    summary
  };
}

// Get import field mapping
router.get('/mapping/:tableName', async (req, res) => {
  const { tableName } = req.params;
  
  if (!TABLE_CONFIG[tableName as keyof typeof TABLE_CONFIG]) {
    return res.status(404).json({ 
      error: 'Table not found',
      availableTables: Object.keys(TABLE_CONFIG)
    });
  }

  const config = TABLE_CONFIG[tableName as keyof typeof TABLE_CONFIG];
  
  res.json({
    table: tableName,
    primaryKey: config.primaryKey,
    requiredFields: config.requiredFields,
    foreignKeys: config.foreignKeys || {},
    description: `Import configuration for ${tableName} table`
  });
});

export default router;