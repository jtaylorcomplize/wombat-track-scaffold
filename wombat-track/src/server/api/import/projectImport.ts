/**
 * Project Import API Endpoint
 * POST /api/admin/projects/import
 */

import express from 'express';
import DatabaseManager from '../../database/connection';
import { validateProjectPayload, generatePayloadHash, ImportValidationError } from './validation';
import { DriveMemoryLogger } from './driveMemoryLogger';
import { AgentTriggerManager } from './agentTriggers';

const router = express.Router();

// POST /api/admin/projects/import - Import canonical project JSON
router.post('/', async (req, res) => {
  let transactionId: string | undefined;
  const dbManager = DatabaseManager.getInstance();
  
  try {
    console.log('📥 Project import request received');

    // Validate payload
    const validatedPayload = validateProjectPayload(req.body);
    const payloadHash = generatePayloadHash(req.body);
    
    const { project, oAppMeta } = validatedPayload;
    const submittedBy = oAppMeta?.submittedBy || 'unknown';

    console.log(`📦 Importing project: ${project.projectId} (${project.name})`);
    console.log(`📊 Project contains: ${project.phases.length} phases, ${project.phases.reduce((sum, p) => sum + (p.phaseSteps?.length || 0), 0)} steps`);

    // Begin database transaction
    transactionId = await dbManager.beginTransaction();
    
    // Import project
    await importProject(project, transactionId);
    
    // Import phases and steps
    let totalPhasesImported = 0;
    let totalStepsImported = 0;
    let totalGovernanceLogsImported = 0;
    
    for (const phase of project.phases) {
      await importPhase(phase, project.projectId, transactionId);
      totalPhasesImported++;
      
      for (const step of phase.phaseSteps) {
        await importPhaseStep(step, phase.phaseId, project.projectId, transactionId);
        totalStepsImported++;
        
        for (const log of step.governanceLogs) {
          await importGovernanceLog(log, step.stepId, transactionId);
          totalGovernanceLogsImported++;
        }
      }
    }

    // Auto-create debug phase step if needed
    const agentManager = AgentTriggerManager.getInstance();
    const debugStep = await agentManager.createDebugPhaseStepIfNeeded(project.projectId, project.phases);
    if (debugStep) {
      // Add debug step to first phase
      if (project.phases.length > 0) {
        await importPhaseStep(debugStep, project.phases[0].phaseId, project.projectId, transactionId);
        totalStepsImported++;
        
        for (const log of debugStep.governanceLogs) {
          await importGovernanceLog(log, debugStep.stepId, transactionId);
          totalGovernanceLogsImported++;
        }
      }
    }

    // Commit transaction
    await dbManager.commitTransaction(transactionId);
    console.log('✅ Project import transaction committed');

    // Trigger relevant agents
    const allGovernanceLogs = project.phases.flatMap(p => p.phaseSteps.flatMap(s => s.governanceLogs));
    const triggerResults = await agentManager.triggerAllRelevantAgents(
      project.projectId,
      project.phases,
      allGovernanceLogs
    );

    const triggeredAgents = triggerResults
      .filter(r => r.triggered)
      .map(r => r.agent);

    // Log to DriveMemory
    const driveMemoryLogger = DriveMemoryLogger.getInstance();
    await driveMemoryLogger.logProjectImport(
      payloadHash,
      totalPhasesImported + totalStepsImported + totalGovernanceLogsImported,
      'success',
      {
        projectId: project.projectId,
        phasesImported: totalPhasesImported,
        stepsImported: totalStepsImported,
        governanceLogsImported: totalGovernanceLogsImported,
        agentTriggers: triggeredAgents
      },
      submittedBy
    );

    // Success response
    res.status(201).json({
      success: true,
      message: 'Project imported successfully',
      data: {
        projectId: project.projectId,
        recordsImported: {
          phases: totalPhasesImported,
          steps: totalStepsImported,
          governanceLogs: totalGovernanceLogsImported,
          total: totalPhasesImported + totalStepsImported + totalGovernanceLogsImported
        },
        agentTriggers: triggerResults,
        payloadHash,
        driveMemoryLogged: true
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Project import failed:', error);

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
      await driveMemoryLogger.logProjectImport(
        payloadHash,
        0,
        'error',
        {},
        req.body?.oAppMeta?.submittedBy,
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

async function importProject(project: any, transactionId: string): Promise<void> {
  const dbManager = DatabaseManager.getInstance();
  
  const query = `
    INSERT OR REPLACE INTO projects (
      projectId, projectName, description, status, owner, priority,
      createdAt, updatedAt, completionPercentage, RAG
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const params = [
    project.projectId,
    project.name,
    project.description || '',
    mapImportStatus(project.status),
    'System Import', // Default owner for imported projects
    project.programType || 'medium',
    project.createdAt,
    project.lastUpdated,
    calculateCompletionPercentage(project),
    'Green' // Default RAG status
  ];

  await dbManager.executeQuery(query, params, transactionId);
  console.log(`✅ Project imported: ${project.projectId}`);
}

async function importPhase(phase: any, projectId: string, transactionId: string): Promise<void> {
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

async function importPhaseStep(step: any, phaseId: string, projectId: string, transactionId: string): Promise<void> {
  const dbManager = DatabaseManager.getInstance();
  
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
    step.dueDate || null,
    step.completedAt || null,
    step.startedAt || new Date().toISOString(),
    step.completedAt || new Date().toISOString()
  ];

  await dbManager.executeQuery(query, params, transactionId);
  console.log(`    ✅ Step imported: ${step.stepId}`);
}

async function importGovernanceLog(log: any, stepId: string, transactionId: string): Promise<void> {
  const dbManager = DatabaseManager.getInstance();
  
  const query = `
    INSERT INTO governance_logs (
      timestamp, event_type, resource_type, resource_id, 
      action, details, success, user_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const params = [
    log.timestamp,
    log.entryType,
    'PhaseStep',
    stepId,
    'Import',
    JSON.stringify({ logId: log.logId, summary: log.summary }),
    1, // success
    'system-import'
  ];

  await dbManager.executeQuery(query, params, transactionId);
  console.log(`      ✅ Governance log imported: ${log.logId}`);
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

function calculateCompletionPercentage(project: any): number {
  if (!project.phases || project.phases.length === 0) return 0;
  
  const totalSteps = project.phases.reduce((sum: number, phase: any) => 
    sum + (phase.phaseSteps?.length || 0), 0);
  
  if (totalSteps === 0) return 0;
  
  const completedSteps = project.phases.reduce((sum: number, phase: any) => 
    sum + (phase.phaseSteps?.filter((step: any) => step.status === 'Complete')?.length || 0), 0);
  
  return Math.round((completedSteps / totalSteps) * 100);
}

export default router;