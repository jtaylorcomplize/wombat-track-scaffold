/**
 * Governance Log Import API Endpoint
 * POST /api/admin/governance-logs/import
 */

import express from 'express';
import DatabaseManager from '../../database/connection';
import type { GovernanceLogImportData} from './validation';
import { generatePayloadHash, ImportValidationError } from './validation';
import { DriveMemoryLogger } from './driveMemoryLogger';

const router = express.Router();

interface GovernanceLogImportRequest {
  phaseStepId: string;
  projectId: string;
  governanceLogs: GovernanceLogImportData[];
  submittedBy?: string;
}

// POST /api/admin/governance-logs/import - Import governance logs
router.post('/', async (req, res) => {
  let transactionId: string | undefined;
  const dbManager = DatabaseManager.getInstance();
  
  try {
    console.log('📥 Governance log import request received');

    const { phaseStepId, projectId, governanceLogs, submittedBy } = req.body as GovernanceLogImportRequest;

    // Validate payload
    if (!phaseStepId || typeof phaseStepId !== 'string') {
      throw new ImportValidationError('Missing or invalid phaseStepId');
    }

    if (!projectId || typeof projectId !== 'string') {
      throw new ImportValidationError('Missing or invalid projectId');
    }

    if (!Array.isArray(governanceLogs) || governanceLogs.length === 0) {
      throw new ImportValidationError('Missing or empty governanceLogs array');
    }

    const payloadHash = generatePayloadHash(req.body);
    
    console.log(`📦 Importing ${governanceLogs.length} governance logs for step: ${phaseStepId}`);

    // Verify phase step exists
    const db = await dbManager.getConnection();
    const existingStep = await db.get(
      'SELECT stepId FROM step_progress WHERE stepId = ?',
      [phaseStepId]
    );

    if (!existingStep) {
      throw new ImportValidationError(`Phase step ${phaseStepId} not found`);
    }

    // Begin database transaction
    transactionId = await dbManager.beginTransaction();
    
    let totalLogsImported = 0;
    
    for (const log of governanceLogs) {
      await importGovernanceLog(log, phaseStepId, transactionId);
      totalLogsImported++;
    }

    // Commit transaction
    await dbManager.commitTransaction(transactionId);
    console.log('✅ Governance log import transaction committed');

    // Log to DriveMemory
    const driveMemoryLogger = DriveMemoryLogger.getInstance();
    await driveMemoryLogger.logGovernanceLogImport(
      payloadHash,
      totalLogsImported,
      'success',
      {
        projectId,
        phaseStepId,
        logsImported: totalLogsImported,
        logIds: governanceLogs.map(l => l.logId)
      },
      submittedBy
    );

    // Success response
    res.status(201).json({
      success: true,
      message: 'Governance logs imported successfully',
      data: {
        projectId,
        phaseStepId,
        logsImported: totalLogsImported,
        logIds: governanceLogs.map(l => l.logId),
        payloadHash,
        driveMemoryLogged: true
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Governance log import failed:', error);

    // Rollback transaction if it exists
    if (transactionId) {
      try {
        await dbManager.rollbackTransaction(transactionId);
        console.log('🔄 Transaction rolled back');
      } catch (rollbackError) {
        console.error('❌ Rollback failed:', rollbackError);
      }
    }

    // Log error to DriveMemory
    try {
      const driveMemoryLogger = DriveMemoryLogger.getInstance();
      const payloadHash = generatePayloadHash(req.body);
      await driveMemoryLogger.logGovernanceLogImport(
        payloadHash,
        0,
        'error',
        { projectId: req.body?.projectId, phaseStepId: req.body?.phaseStepId },
        req.body?.submittedBy,
        error instanceof Error ? error.message : 'Unknown error'
      );
    } catch (logError) {
      console.error('Failed to log error to DriveMemory:', logError);
    }

    // Error response
    if (error instanceof ImportValidationError) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        message: error.message,
        field: error.field,
        value: error.value,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Import failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }
});

async function importGovernanceLog(log: GovernanceLogImportData, phaseStepId: string, transactionId: string): Promise<void> {
  const dbManager = DatabaseManager.getInstance();
  
  const query = `
    INSERT INTO governance_logs (
      timestamp, event_type, resource_type, resource_id, 
      action, details, success, user_id, runtime_context
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const details = {
    logId: log.logId,
    summary: log.summary,
    memoryAnchor: log.memoryAnchor,
    importedAt: new Date().toISOString()
  };

  const params = [
    log.timestamp,
    log.entryType,
    'PhaseStep',
    phaseStepId,
    'Import',
    JSON.stringify(details),
    1, // success
    'system-import',
    JSON.stringify({ 
      source: 'canonical-import', 
      originalLogId: log.logId 
    })
  ];

  await dbManager.executeQuery(query, params, transactionId);
  console.log(`      ✅ Governance log imported: ${log.logId}`);
}

export default router;