/**
 * Phase Import API Endpoint
 * POST /api/admin/phases/import
 */

import express from 'express';
import DatabaseManager from '../../database/connection';
import type { PhaseImportData} from './validation';
import { generatePayloadHash, ImportValidationError } from './validation';
import { DriveMemoryLogger } from './driveMemoryLogger';

const router = express.Router();

interface PhaseImportRequest {
  projectId: string;
  phases: PhaseImportData[];
  submittedBy?: string;
}

// POST /api/admin/phases/import - Import phases for a project
router.post('/', async (req, res) => {
  let transactionId: string | undefined;
  const dbManager = DatabaseManager.getInstance();
  
  try {
    console.log('📥 Phase import request received');

    const { projectId, phases, submittedBy } = req.body as PhaseImportRequest;

    // Validate payload
    if (!projectId || typeof projectId !== 'string') {
      throw new ImportValidationError('Missing or invalid projectId');
    }

    if (!Array.isArray(phases) || phases.length === 0) {
      throw new ImportValidationError('Missing or empty phases array');
    }

    const payloadHash = generatePayloadHash(req.body);
    
    console.log(`📦 Importing ${phases.length} phases for project: ${projectId}`);

    // Verify project exists
    const db = await dbManager.getConnection();
    const existingProject = await db.get(
      'SELECT projectId FROM projects WHERE projectId = ?',
      [projectId]
    );

    if (!existingProject) {
      throw new ImportValidationError(`Project ${projectId} not found`);
    }

    // Begin database transaction
    transactionId = await dbManager.beginTransaction();
    
    let totalPhasesImported = 0;
    
    for (const phase of phases) {
      await importPhase(phase, projectId, transactionId);
      totalPhasesImported++;
    }

    // Commit transaction
    await dbManager.commitTransaction(transactionId);
    console.log('✅ Phase import transaction committed');

    // Log to DriveMemory
    const driveMemoryLogger = DriveMemoryLogger.getInstance();
    await driveMemoryLogger.logPhaseImport(
      payloadHash,
      totalPhasesImported,
      'success',
      {
        projectId,
        phasesImported: totalPhasesImported,
        phaseIds: phases.map(p => p.phaseId)
      },
      submittedBy
    );

    // Success response
    res.status(201).json({
      success: true,
      message: 'Phases imported successfully',
      data: {
        projectId,
        phasesImported: totalPhasesImported,
        phaseIds: phases.map(p => p.phaseId),
        payloadHash,
        driveMemoryLogged: true
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Phase import failed:', error);

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
      await driveMemoryLogger.logPhaseImport(
        payloadHash,
        0,
        'error',
        { projectId: req.body?.projectId },
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

async function importPhase(phase: PhaseImportData, projectId: string, transactionId: string): Promise<void> {
  const dbManager = DatabaseManager.getInstance();
  
  const query = `
    INSERT OR REPLACE INTO phases (
      phaseid, phasename, project_ref, status, startDate, endDate, 
      createdAt, updatedAt, RAG
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const params = [
    phase.phaseId,
    phase.name,
    projectId,
    mapImportStatus(phase.status),
    phase.startedAt || null,
    phase.completedAt || null,
    phase.startedAt || new Date().toISOString(),
    phase.completedAt || new Date().toISOString(),
    'Green' // Default RAG status
  ];

  await dbManager.executeQuery(query, params, transactionId);
  console.log(`  ✅ Phase imported: ${phase.phaseId}`);
}

function mapImportStatus(importStatus: string): string {
  const statusMap: Record<string, string> = {
    'Active': 'Planning',
    'Complete': 'Completed',
    'In Progress': 'In Progress',
    'Completed': 'Completed',
    'Planning': 'Planning'
  };
  
  return statusMap[importStatus] || 'Planning';
}

export default router;