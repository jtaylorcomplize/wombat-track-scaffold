/**
 * Memory Anchor Import API Endpoint
 * POST /api/admin/memory-anchors/import
 */

import express from 'express';
import DatabaseManager from '../../database/connection';
import type { MemoryAnchorImportData} from './validation';
import { validateMemoryAnchorPayload, generatePayloadHash, ImportValidationError } from './validation';
import { DriveMemoryLogger } from './driveMemoryLogger';

const router = express.Router();

interface MemoryAnchorImportRequest {
  memoryAnchors: MemoryAnchorImportData[];
  submittedBy?: string;
}

// POST /api/admin/memory-anchors/import - Import memory anchors
router.post('/', async (req, res) => {
  let transactionId: string | undefined;
  const dbManager = DatabaseManager.getInstance();
  
  try {
    console.log('📥 Memory anchor import request received');

    const { memoryAnchors, submittedBy } = req.body as MemoryAnchorImportRequest;

    // Validate payload
    if (!Array.isArray(memoryAnchors) || memoryAnchors.length === 0) {
      throw new ImportValidationError('Missing or empty memoryAnchors array');
    }

    // Validate each memory anchor
    memoryAnchors.forEach((anchor, index) => {
      try {
        validateMemoryAnchorPayload(anchor);
      } catch (error) {
        throw new ImportValidationError(
          `Invalid memory anchor at index ${index}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          `memoryAnchors[${index}]`,
          anchor
        );
      }
    });

    const payloadHash = generatePayloadHash(req.body);
    
    console.log(`📦 Importing ${memoryAnchors.length} memory anchors`);

    // Verify all linked phase steps exist and have QA complete
    const db = await dbManager.getConnection();
    for (const anchor of memoryAnchors) {
      const existingStep = await db.get(`
        SELECT stepId, status, qaStatus 
        FROM step_progress 
        WHERE stepId = ?
      `, [anchor.linkedPhaseStepId]);

      if (!existingStep) {
        throw new ImportValidationError(`Linked phase step ${anchor.linkedPhaseStepId} not found`);
      }

      // Memory anchor restriction: only create for QA Complete steps
      if (existingStep.status !== 'Completed' || existingStep.qaStatus !== 'Complete') {
        throw new ImportValidationError(
          `Memory anchor creation restricted: Step ${anchor.linkedPhaseStepId} must have status=Completed and qaStatus=Complete. Current: status=${existingStep.status}, qaStatus=${existingStep.qaStatus}`
        );
      }
    }

    // Begin database transaction
    transactionId = await dbManager.beginTransaction();
    
    // Ensure memory anchors table exists
    await ensureMemoryAnchorTable(transactionId);
    
    let totalAnchorsImported = 0;
    
    for (const anchor of memoryAnchors) {
      await importMemoryAnchor(anchor, transactionId);
      totalAnchorsImported++;
    }

    // Commit transaction
    await dbManager.commitTransaction(transactionId);
    console.log('✅ Memory anchor import transaction committed');

    // Log to DriveMemory
    const driveMemoryLogger = DriveMemoryLogger.getInstance();
    await driveMemoryLogger.logMemoryAnchorImport(
      payloadHash,
      totalAnchorsImported,
      'success',
      {
        anchorsImported: totalAnchorsImported,
        anchorIds: memoryAnchors.map(a => a.anchorId),
        linkedSteps: memoryAnchors.map(a => a.linkedPhaseStepId)
      },
      submittedBy
    );

    // Success response
    res.status(201).json({
      success: true,
      message: 'Memory anchors imported successfully',
      data: {
        anchorsImported: totalAnchorsImported,
        anchorIds: memoryAnchors.map(a => a.anchorId),
        linkedSteps: memoryAnchors.map(a => a.linkedPhaseStepId),
        payloadHash,
        driveMemoryLogged: true,
        restrictionNote: 'Memory anchors only created for QA-complete steps'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Memory anchor import failed:', error);

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
      await driveMemoryLogger.logMemoryAnchorImport(
        payloadHash,
        0,
        'error',
        {},
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

async function ensureMemoryAnchorTable(transactionId: string): Promise<void> {
  const dbManager = DatabaseManager.getInstance();
  
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS memory_anchors (
      anchorId TEXT PRIMARY KEY,
      linkedPhaseStepId TEXT NOT NULL,
      status TEXT NOT NULL,
      anchorType TEXT,
      content TEXT,
      tags TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (linkedPhaseStepId) REFERENCES step_progress(stepId)
    )
  `;

  await dbManager.executeQuery(createTableQuery, [], transactionId);
  
  // Create index for performance
  const createIndexQuery = `
    CREATE INDEX IF NOT EXISTS idx_memory_anchors_step 
    ON memory_anchors(linkedPhaseStepId)
  `;
  
  await dbManager.executeQuery(createIndexQuery, [], transactionId);
}

async function importMemoryAnchor(anchor: MemoryAnchorImportData, transactionId: string): Promise<void> {
  const dbManager = DatabaseManager.getInstance();
  
  const query = `
    INSERT OR REPLACE INTO memory_anchors (
      anchorId, linkedPhaseStepId, status, anchorType, content, tags, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const params = [
    anchor.anchorId,
    anchor.linkedPhaseStepId,
    anchor.status,
    anchor.anchorType || 'canonical-import',
    anchor.content || null,
    anchor.tags ? JSON.stringify(anchor.tags) : null,
    anchor.createdAt,
    new Date().toISOString()
  ];

  await dbManager.executeQuery(query, params, transactionId);
  console.log(`      ✅ Memory anchor imported: ${anchor.anchorId}`);
}

export default router;