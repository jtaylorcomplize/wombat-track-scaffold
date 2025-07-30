import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import csv from 'csv-parser';
import { stringify } from 'csv-stringify/sync';
import { Readable } from 'stream';
import multer from 'multer';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// Table configurations with primary keys
const TABLE_CONFIG = {
  projects: {
    csvFile: 'cleaned-projects-snapshot.csv',
    primaryKey: 'projectId',
    requiredFields: ['projectName', 'projectId', 'status'],
    foreignKeys: { owner: 'users' }
  },
  phases: {
    csvFile: 'cleaned-phases-snapshot.csv',
    primaryKey: 'phaseid',
    requiredFields: ['phasename', 'phaseid', 'WT Projects'],
    foreignKeys: { 'WT Projects': 'projects' }
  },
  step_progress: {
    csvFile: 'step-progress-snapshot.csv',
    primaryKey: 'stepId',
    requiredFields: ['stepId', 'phaseId', 'status'],
    foreignKeys: { phaseId: 'phases' }
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

// Export table to CSV
router.get('/export/:tableName', async (req, res) => {
  const { tableName } = req.params;
  
  if (!TABLE_CONFIG[tableName as keyof typeof TABLE_CONFIG]) {
    return res.status(404).json({ 
      error: 'Table not found',
      availableTables: Object.keys(TABLE_CONFIG)
    });
  }

  try {
    const config = TABLE_CONFIG[tableName as keyof typeof TABLE_CONFIG];
    const filePath = path.join(process.cwd(), config.csvFile);
    
    // Check if file exists, if not create empty data
    let data: any[] = [];
    try {
      data = await parseCSV(filePath);
    } catch (error) {
      console.warn(`CSV file not found for ${tableName}, returning empty dataset`);
    }

    // Convert to CSV format
    const csvContent = stringify(data, {
      header: true,
      columns: data.length > 0 ? Object.keys(data[0]) : config.requiredFields
    });

    // Set headers for file download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${tableName}_export_${Date.now()}.csv"`);
    
    // Log export to governance
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
        recordCount: data.length,
        exportPath: `${tableName}_export_${Date.now()}.csv`
      },
      runtime_context: {
        phase: 'OF-BEV-2.2',
        environment: 'data_pipeline'
      }
    };

    const governanceLogPath = path.join(process.cwd(), 'logs/governance.jsonl');
    await fs.appendFile(governanceLogPath, JSON.stringify(governanceEntry) + '\n');

    res.send(csvContent);

  } catch (error) {
    console.error(`Error exporting ${tableName}:`, error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: `Failed to export ${tableName}`
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