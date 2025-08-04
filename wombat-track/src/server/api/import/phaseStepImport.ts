/**
 * Phase Step Import API Endpoint
 * POST /api/admin/phase-steps/import
 */

import express from 'express';
import DatabaseManager from '../../database/connection';
import { PhaseStepImportData, generatePayloadHash, ImportValidationError } from './validation';
import { DriveMemoryLogger } from './driveMemoryLogger';

const router = express.Router();

interface PhaseStepImportRequest {
  phaseId: string;
  projectId: string;
  phaseSteps: PhaseStepImportData[];
  submittedBy?: string;
}

// POST /api/admin/phase-steps/import - Import phase steps
router.post('/', async (req, res) => {
  let transactionId: string | undefined;
  const dbManager = DatabaseManager.getInstance();
  
  try {
    console.log('📥 Phase step import request received');

    const { phaseId, projectId, phaseSteps, submittedBy } = req.body as PhaseStepImportRequest;

    // Validate payload
    if (!phaseId || typeof phaseId !== 'string') {
      throw new ImportValidationError('Missing or invalid phaseId');
    }

    if (!projectId || typeof projectId !== 'string') {
      throw new ImportValidationError('Missing or invalid projectId');
    }

    if (!Array.isArray(phaseSteps) || phaseSteps.length === 0) {
      throw new ImportValidationError('Missing or empty phaseSteps array');
    }

    const payloadHash = generatePayloadHash(req.body);
    
    console.log(`📦 Importing ${phaseSteps.length} phase steps for phase: ${phaseId}`);

    // Verify phase exists
    const db = await dbManager.getConnection();
    const existingPhase = await db.get(
      'SELECT phaseid FROM phases WHERE phaseid = ? AND project_ref = ?',
      [phaseId, projectId]
    );

    if (!existingPhase) {
      throw new ImportValidationError(`Phase ${phaseId} not found in project ${projectId}`);
    }

    // Begin database transaction
    transactionId = await dbManager.beginTransaction();
    
    let totalStepsImported = 0;
    
    for (const step of phaseSteps) {
      await importPhaseStep(step, phaseId, transactionId);
      totalStepsImported++;
    }

    // Commit transaction
    await dbManager.commitTransaction(transactionId);
    console.log('✅ Phase step import transaction committed');

    // Log to DriveMemory
    const driveMemoryLogger = DriveMemoryLogger.getInstance();
    await driveMemoryLogger.logPhaseStepImport(
      payloadHash,
      totalStepsImported,
      'success',
      {
        projectId,
        phaseId,
        stepsImported: totalStepsImported,
        stepIds: phaseSteps.map(s => s.stepId)
      },
      submittedBy
    );

    // Success response
    res.status(201).json({
      success: true,
      message: 'Phase steps imported successfully',
      data: {
        projectId,
        phaseId,
        stepsImported: totalStepsImported,
        stepIds: phaseSteps.map(s => s.stepId),
        payloadHash,
        driveMemoryLogged: true
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Phase step import failed:', error);

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
      await driveMemoryLogger.logPhaseStepImport(
        payloadHash,
        0,
        'error',
        { projectId: req.body?.projectId, phaseId: req.body?.phaseId },
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

async function importPhaseStep(step: PhaseStepImportData, phaseId: string, transactionId: string): Promise<void> {
  const dbManager = DatabaseManager.getInstance();
  
  // Create extended step_progress table to handle SDLC fields
  // First, let's check if we need to add SDLC columns
  await ensureSDLCColumns(transactionId);
  
  const query = `
    INSERT OR REPLACE INTO step_progress (
      stepId, phaseId, stepName, status, progress, assignedTo,
      dueDate, completedAt, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const progress = step.status === 'Complete' ? 100 : 
                  step.status === 'In Progress' ? 50 : 0;

  const params = [
    step.stepId,
    phaseId,
    step.name,
    mapImportStatus(step.status),
    progress,
    'System Import', // Default assignee
    null, // dueDate
    step.completedAt || null,
    step.startedAt || new Date().toISOString(),
    step.completedAt || new Date().toISOString()
  ];

  await dbManager.executeQuery(query, params, transactionId);
  
  // Store SDLC metadata separately if provided
  if (hasSDLCData(step)) {
    await insertSDLCMetadata(step, transactionId);
  }
  
  console.log(`    ✅ Step imported: ${step.stepId}`);
}

async function ensureSDLCColumns(transactionId: string): Promise<void> {
  const dbManager = DatabaseManager.getInstance();
  
  // Add SDLC-specific columns if they don't exist
  const alterQueries = [
    `ALTER TABLE step_progress ADD COLUMN sdlcStage TEXT`,
    `ALTER TABLE step_progress ADD COLUMN branchName TEXT`,
    `ALTER TABLE step_progress ADD COLUMN commitId TEXT`,
    `ALTER TABLE step_progress ADD COLUMN ciStatus TEXT`,
    `ALTER TABLE step_progress ADD COLUMN qaStatus TEXT`,
    `ALTER TABLE step_progress ADD COLUMN debugBranch TEXT`,
    `ALTER TABLE step_progress ADD COLUMN issueLink TEXT`,
    `ALTER TABLE step_progress ADD COLUMN pullRequest TEXT`,
    `ALTER TABLE step_progress ADD COLUMN testResults TEXT`
  ];

  for (const query of alterQueries) {
    try {
      await dbManager.executeQuery(query, [], transactionId);
    } catch (error) {
      // Column likely already exists, continue
      console.log(`SDLC column already exists or error adding: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }
}

async function insertSDLCMetadata(step: PhaseStepImportData, transactionId: string): Promise<void> {
  const dbManager = DatabaseManager.getInstance();
  
  const updateQuery = `
    UPDATE step_progress 
    SET sdlcStage = ?, branchName = ?, commitId = ?, ciStatus = ?, qaStatus = ?,
        debugBranch = ?, issueLink = ?, pullRequest = ?, testResults = ?
    WHERE stepId = ?
  `;

  const params = [
    step.sdlcStage || null,
    step.branchName || null,
    step.commitId || null,
    step.ciStatus || null,
    step.qaStatus || null,
    step.debugBranch || null,
    step.issueLink || null,
    step.pullRequest || null,
    step.testResults ? JSON.stringify(step.testResults) : null,
    step.stepId
  ];

  await dbManager.executeQuery(updateQuery, params, transactionId);
  console.log(`      ✅ SDLC metadata updated for step: ${step.stepId}`);
}

function hasSDLCData(step: PhaseStepImportData): boolean {
  return !!(
    step.sdlcStage || step.branchName || step.commitId || 
    step.ciStatus || step.qaStatus || step.debugBranch || 
    step.issueLink || step.pullRequest || step.testResults
  );
}

function mapImportStatus(importStatus: string): string {
  const statusMap: Record<string, string> = {
    'Active': 'In Progress',
    'Complete': 'Completed',
    'In Progress': 'In Progress',
    'Completed': 'Completed',
    'Planning': 'Pending',
    'Pending': 'Pending'
  };
  
  return statusMap[importStatus] || 'Pending';
}

export default router;