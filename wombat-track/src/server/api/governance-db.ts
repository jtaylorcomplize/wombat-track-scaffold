import express from 'express';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs/promises';

const router = express.Router();

// Initialize database connection
const dbPath = path.join(process.cwd(), 'databases', 'production.db');
let db: Database.Database | null = null;

try {
  db = new Database(dbPath, { readonly: false });
  console.log('✅ Connected to production database for governance logs');
} catch (error) {
  console.error('❌ Failed to connect to database:', error);
}

// Helper to sync JSONL files to database
async function syncJSONLToDatabase() {
  if (!db) return { success: false, error: 'Database not connected' };

  try {
    const logsDir = path.join(process.cwd(), 'logs', 'governance');
    const files = await fs.readdir(logsDir);
    const jsonlFiles = files.filter(f => f.endsWith('.jsonl'));
    
    let totalSynced = 0;
    
    for (const file of jsonlFiles) {
      const filePath = path.join(logsDir, file);
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.trim().split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        try {
          const logEntry = JSON.parse(line);
          
          // Check if entry already exists
          const existing = db!.prepare(`
            SELECT id FROM governance_logs 
            WHERE timestamp = ? AND event_type = ? AND resource_id = ?
          `).get(logEntry.timestamp, logEntry.event_type || '', logEntry.resource_id || '');
          
          if (!existing) {
            // Insert new entry
            db!.prepare(`
              INSERT INTO governance_logs (
                timestamp, event_type, user_id, user_role, 
                resource_type, resource_id, action, success, 
                details, runtime_context
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
              logEntry.timestamp || new Date().toISOString(),
              logEntry.event_type || 'unknown',
              logEntry.user_id || null,
              logEntry.user_role || null,
              logEntry.resource_type || null,
              logEntry.resource_id || null,
              logEntry.action || null,
              logEntry.success !== undefined ? (logEntry.success ? 1 : 0) : 1,
              JSON.stringify(logEntry.details || {}),
              JSON.stringify(logEntry.runtime_context || {})
            );
            totalSynced++;
          }
        } catch (parseError) {
          console.warn('Failed to parse/insert log line:', parseError);
        }
      }
    }
    
    return { success: true, synced: totalSynced, files: jsonlFiles.length };
  } catch (error) {
    console.error('Sync error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// GET /api/admin/governance_logs - Fetch all governance logs from database
router.get('/governance_logs', async (req, res) => {
  if (!db) {
    return res.status(500).json({ 
      error: 'Database not connected',
      data: []
    });
  }

  try {
    // First, sync any new JSONL entries
    const syncResult = await syncJSONLToDatabase();
    console.log('📊 Sync result:', syncResult);

    // Fetch all governance logs
    const logs = db.prepare(`
      SELECT 
        id,
        timestamp,
        event_type,
        user_id,
        user_role,
        resource_type,
        resource_id,
        action,
        success,
        details,
        runtime_context
      FROM governance_logs
      ORDER BY timestamp DESC
      LIMIT 1000
    `).all();

    // Parse JSON fields
    const parsedLogs = logs.map(log => ({
      ...log,
      success: log.success === 1,
      details: log.details ? JSON.parse(log.details as string) : {},
      runtime_context: log.runtime_context ? JSON.parse(log.runtime_context as string) : {}
    }));

    res.json({
      success: true,
      count: parsedLogs.length,
      syncResult,
      data: parsedLogs
    });

  } catch (error) {
    console.error('Error fetching governance logs:', error);
    res.status(500).json({ 
      error: 'Failed to fetch governance logs',
      message: error instanceof Error ? error.message : 'Unknown error',
      data: []
    });
  }
});

// GET /api/admin/governance_logs/:id - Fetch specific governance log
router.get('/governance_logs/:id', (req, res) => {
  if (!db) {
    return res.status(500).json({ error: 'Database not connected' });
  }

  try {
    const { id } = req.params;
    
    const log = db.prepare(`
      SELECT * FROM governance_logs WHERE id = ?
    `).get(id);

    if (!log) {
      return res.status(404).json({ error: 'Log not found' });
    }

    // Parse JSON fields
    const parsedLog = {
      ...log,
      success: log.success === 1,
      details: log.details ? JSON.parse(log.details as string) : {},
      runtime_context: log.runtime_context ? JSON.parse(log.runtime_context as string) : {}
    };

    res.json({
      success: true,
      data: parsedLog
    });

  } catch (error) {
    console.error('Error fetching governance log:', error);
    res.status(500).json({ 
      error: 'Failed to fetch governance log',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/admin/governance_logs/sync - Force sync JSONL files to database
router.post('/governance_logs/sync', async (req, res) => {
  try {
    const result = await syncJSONLToDatabase();
    
    if (result.success) {
      res.json({
        success: true,
        message: `Synced ${result.synced} new entries from ${result.files} files`
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error during sync:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/admin/phases - Fetch phase/step data with governance links
router.get('/phases', async (req, res) => {
  if (!db) {
    return res.status(500).json({ 
      error: 'Database not connected',
      data: []
    });
  }

  try {
    // Load canonical phase JSON files
    const phasesDir = path.join(process.cwd(), 'data', 'phases');
    let canonicalPhases: any[] = [];
    
    try {
      await fs.access(phasesDir);
      const files = await fs.readdir(phasesDir);
      const jsonFiles = files.filter(f => f.endsWith('.json'));
      
      for (const file of jsonFiles) {
        try {
          const content = await fs.readFile(path.join(phasesDir, file), 'utf-8');
          const phaseData = JSON.parse(content);
          
          // Transform canonical JSON to flat structure for UI
          if (phaseData.steps && Array.isArray(phaseData.steps)) {
            phaseData.steps.forEach((step: any) => {
              canonicalPhases.push({
                phaseId: phaseData.phaseId,
                phaseName: phaseData.name,
                ...step,
                lastUpdated: step.completedAt || new Date().toISOString()
              });
            });
          }
        } catch (parseError) {
          console.warn(`Failed to parse ${file}:`, parseError);
        }
      }
    } catch (dirError) {
      console.log('Phases directory not found, using fallback data');
    }
    
    // If no canonical data found, use fallback
    if (canonicalPhases.length === 0) {
      canonicalPhases = [
      {
        phaseId: 'WT-9.0',
        phaseName: 'Phase 9.0 - Governance Integration',
        stepId: 'WT-9.0.1',
        stepName: 'Initialize Governance Framework',
        stepInstruction: 'Set up core governance logging and monitoring',
        status: 'completed',
        RAG: 'Green',
        priority: 'High',
        assignedTo: 'Claude Code',
        governanceLogId: '1',
        memoryAnchor: 'WT-ANCHOR-GOVERNANCE',
        lastUpdated: new Date().toISOString()
      },
      {
        phaseId: 'WT-9.0',
        phaseName: 'Phase 9.0 - Governance Integration',
        stepId: 'WT-9.0.2',
        stepName: 'Implement Database Sync',
        stepInstruction: 'Sync JSONL governance logs to SQLite database',
        status: 'in_progress',
        RAG: 'Amber',
        priority: 'Critical',
        assignedTo: 'System',
        governanceLogId: '2',
        memoryAnchor: 'WT-ANCHOR-IMPLEMENTATION',
        lastUpdated: new Date().toISOString()
      },
      {
        phaseId: 'WT-9.0',
        phaseName: 'Phase 9.0 - Governance Integration',
        stepId: 'WT-9.0.3',
        stepName: 'Create UI Components',
        stepInstruction: 'Build AdminPhaseView and related components',
        status: 'completed',
        RAG: 'Green',
        priority: 'High',
        assignedTo: 'Claude',
        memoryAnchor: 'WT-ANCHOR-QUALITY',
        lastUpdated: new Date().toISOString()
      }
    ];
    }

    res.json({
      success: true,
      count: canonicalPhases.length,
      source: canonicalPhases.length > 3 ? 'canonical' : 'fallback',
      data: canonicalPhases
    });

  } catch (error) {
    console.error('Error fetching phase data:', error);
    res.status(500).json({ 
      error: 'Failed to fetch phase data',
      message: error instanceof Error ? error.message : 'Unknown error',
      data: []
    });
  }
});

// GET /api/admin/memory/:anchor - Resolve memory anchor to file location
router.get('/memory/:anchor', async (req, res) => {
  const { anchor } = req.params;
  
  try {
    // Search for files containing this anchor
    const driveMemoryPath = path.join(process.cwd(), 'DriveMemory');
    const searchResult = await searchForAnchor(driveMemoryPath, anchor);
    
    if (searchResult) {
      res.json({
        success: true,
        anchor,
        location: searchResult.path,
        content: searchResult.content,
        metadata: {
          size: searchResult.size,
          modified: searchResult.modified
        }
      });
    } else {
      res.status(404).json({
        success: false,
        error: `Memory anchor ${anchor} not found`
      });
    }
  } catch (error) {
    console.error('Error resolving memory anchor:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Helper function to search for anchor in DriveMemory
async function searchForAnchor(dir: string, anchor: string): Promise<any> {
  try {
    const files = await fs.readdir(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = await fs.stat(filePath);
      
      if (stat.isDirectory()) {
        const result = await searchForAnchor(filePath, anchor);
        if (result) return result;
      } else if (file.endsWith('.md') || file.endsWith('.json') || file.endsWith('.jsonl')) {
        const content = await fs.readFile(filePath, 'utf-8');
        if (content.includes(anchor)) {
          return {
            path: filePath,
            content: content.substring(0, 1000), // First 1000 chars
            size: stat.size,
            modified: stat.mtime.toISOString()
          };
        }
      }
    }
  } catch (error) {
    console.error('Error searching directory:', error);
  }
  
  return null;
}

export default router;