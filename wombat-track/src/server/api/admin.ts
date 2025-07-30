import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import csv from 'csv-parser';
import { Readable } from 'stream';

const router = express.Router();

// Table configurations
const TABLE_CONFIGS = {
  projects: {
    csvFile: 'cleaned-projects-snapshot.csv',
    description: 'Project records from oApp database'
  },
  phases: {
    csvFile: 'cleaned-phases-snapshot.csv', 
    description: 'Phase and step definitions'
  },
  governance_logs: {
    jsonlFile: 'logs/governance.jsonl',
    description: 'Governance and audit logs'
  },
  sub_apps: {
    csvFile: 'Sub-Apps 23ee1901e36e81deba63ce1abf2ed31e_all.csv',
    description: 'Sub-application definitions'
  }
};

// Helper function to parse CSV data
async function parseCSVFile(filePath: string): Promise<any[]> {
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

// Helper function to parse JSONL data
async function parseJSONLFile(filePath: string): Promise<any[]> {
  try {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const lines = fileContent.trim().split('\n').filter(line => line.trim());
    return lines.map(line => {
      try {
        return JSON.parse(line);
      } catch (e) {
        console.warn('Invalid JSON line:', line);
        return null;
      }
    }).filter(item => item !== null);
  } catch (error) {
    console.error(`Error reading JSONL file ${filePath}:`, error);
    return [];
  }
}

// Get table data endpoint
router.get('/:tableName', async (req, res) => {
  const { tableName } = req.params;
  
  if (!TABLE_CONFIGS[tableName as keyof typeof TABLE_CONFIGS]) {
    return res.status(404).json({ 
      error: 'Table not found',
      availableTables: Object.keys(TABLE_CONFIGS)
    });
  }

  try {
    const config = TABLE_CONFIGS[tableName as keyof typeof TABLE_CONFIGS];
    let data: any[] = [];

    if ('csvFile' in config) {
      const filePath = path.join(process.cwd(), config.csvFile);
      data = await parseCSVFile(filePath);
    } else if ('jsonlFile' in config) {
      const filePath = path.join(process.cwd(), config.jsonlFile);
      data = await parseJSONLFile(filePath);
    }

    // Add metadata to response
    res.json({
      table: tableName,
      description: config.description,
      recordCount: data.length,
      data: data,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error(`Error fetching ${tableName} data:`, error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: `Failed to fetch ${tableName} data`
    });
  }
});

// Get table metadata endpoint
router.get('/', async (req, res) => {
  try {
    const metadata = await Promise.all(
      Object.entries(TABLE_CONFIGS).map(async ([tableName, config]) => {
        let recordCount = 0;
        try {
          if ('csvFile' in config) {
            const filePath = path.join(process.cwd(), config.csvFile);
            const data = await parseCSVFile(filePath);
            recordCount = data.length;
          } else if ('jsonlFile' in config) {
            const filePath = path.join(process.cwd(), config.jsonlFile);
            const data = await parseJSONLFile(filePath);
            recordCount = data.length;
          }
        } catch (error) {
          console.warn(`Could not get record count for ${tableName}:`, error);
        }

        return {
          name: tableName,
          description: config.description,
          recordCount,
          available: recordCount > 0
        };
      })
    );

    res.json({
      timestamp: new Date().toISOString(),
      tables: metadata,
      totalTables: metadata.length
    });

  } catch (error) {
    console.error('Error fetching table metadata:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to fetch table metadata'
    });
  }
});

export default router;