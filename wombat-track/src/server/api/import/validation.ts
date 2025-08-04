/**
 * Validation schemas and utilities for SDLC import endpoints
 */

import * as crypto from 'crypto';

export interface ProjectImportPayload {
  project: {
    projectId: string;
    name: string;
    description?: string;
    programType: string;
    status: string;
    createdAt: string;
    lastUpdated: string;
    phases: PhaseImportData[];
    metadata?: {
      totalPhases?: number;
      completedPhases?: number;
      totalSteps?: number;
      completedSteps?: number;
      inProgressSteps?: number;
      overallProgress?: string;
      keyAchievements?: string[];
      technicalDebt?: string[];
      nextActions?: string[];
    };
  };
  oAppMeta: {
    submissionType: string;
    submittedBy: string;
    submissionTimestamp: string;
    targetSystem?: string;
    priority?: string;
    tags: string[];
  };
}

export interface PhaseImportData {
  phaseId: string;
  name: string;
  status: string;
  startedAt?: string;
  completedAt?: string;
  phaseSteps: PhaseStepImportData[];
}

export interface PhaseStepImportData {
  stepId: string;
  name: string;
  status: string;
  startedAt?: string;
  completedAt?: string;
  sdlcStage?: string;
  branchName?: string;
  commitId?: string;
  ciStatus?: string;
  qaStatus?: string;
  debugBranch?: string;
  issueLink?: string;
  pullRequest?: string;
  testResults?: Record<string, string>;
  governanceLogs: GovernanceLogImportData[];
}

export interface GovernanceLogImportData {
  logId: string;
  entryType: string;
  summary: string;
  timestamp: string;
  memoryAnchor?: string | null;
}

export interface MemoryAnchorImportData {
  anchorId: string;
  linkedPhaseStepId: string;
  status: string;
  anchorType?: string;
  content?: string;
  tags?: string[];
  createdAt: string;
}

export class ImportValidationError extends Error {
  constructor(message: string, public field?: string, public value?: any) {
    super(message);
    this.name = 'ImportValidationError';
  }
}

export function validateProjectPayload(payload: any): ProjectImportPayload {
  if (!payload || typeof payload !== 'object') {
    throw new ImportValidationError('Payload must be an object');
  }

  if (!payload.project) {
    throw new ImportValidationError('Missing required field: project');
  }

  const project = payload.project;

  // Validate required project fields
  if (!project.projectId || typeof project.projectId !== 'string') {
    throw new ImportValidationError('Project must have a valid projectId', 'project.projectId', project.projectId);
  }

  if (!project.name || typeof project.name !== 'string') {
    throw new ImportValidationError('Project must have a valid name', 'project.name', project.name);
  }

  if (!project.programType || typeof project.programType !== 'string') {
    throw new ImportValidationError('Project must have a valid programType', 'project.programType', project.programType);
  }

  if (!project.status || typeof project.status !== 'string') {
    throw new ImportValidationError('Project must have a valid status', 'project.status', project.status);
  }

  // Validate phases array
  if (!Array.isArray(project.phases)) {
    throw new ImportValidationError('Project must have phases array', 'project.phases', project.phases);
  }

  // Validate each phase
  project.phases.forEach((phase: any, index: number) => {
    validatePhaseData(phase, `project.phases[${index}]`);
  });

  // Validate oAppMeta if present
  if (payload.oAppMeta) {
    validateOAppMeta(payload.oAppMeta);
  }

  return payload as ProjectImportPayload;
}

function validatePhaseData(phase: any, fieldPath: string): void {
  if (!phase.phaseId || typeof phase.phaseId !== 'string') {
    throw new ImportValidationError(`Phase must have a valid phaseId`, `${fieldPath}.phaseId`, phase.phaseId);
  }

  if (!phase.name || typeof phase.name !== 'string') {
    throw new ImportValidationError(`Phase must have a valid name`, `${fieldPath}.name`, phase.name);
  }

  if (!phase.status || typeof phase.status !== 'string') {
    throw new ImportValidationError(`Phase must have a valid status`, `${fieldPath}.status`, phase.status);
  }

  if (!Array.isArray(phase.phaseSteps)) {
    throw new ImportValidationError(`Phase must have phaseSteps array`, `${fieldPath}.phaseSteps`, phase.phaseSteps);
  }

  // Validate each phase step
  phase.phaseSteps.forEach((step: any, index: number) => {
    validatePhaseStepData(step, `${fieldPath}.phaseSteps[${index}]`);
  });
}

function validatePhaseStepData(step: any, fieldPath: string): void {
  if (!step.stepId || typeof step.stepId !== 'string') {
    throw new ImportValidationError(`PhaseStep must have a valid stepId`, `${fieldPath}.stepId`, step.stepId);
  }

  if (!step.name || typeof step.name !== 'string') {
    throw new ImportValidationError(`PhaseStep must have a valid name`, `${fieldPath}.name`, step.name);
  }

  if (!step.status || typeof step.status !== 'string') {
    throw new ImportValidationError(`PhaseStep must have a valid status`, `${fieldPath}.status`, step.status);
  }

  if (!Array.isArray(step.governanceLogs)) {
    throw new ImportValidationError(`PhaseStep must have governanceLogs array`, `${fieldPath}.governanceLogs`, step.governanceLogs);
  }

  // Validate each governance log
  step.governanceLogs.forEach((log: any, index: number) => {
    validateGovernanceLogData(log, `${fieldPath}.governanceLogs[${index}]`);
  });
}

function validateGovernanceLogData(log: any, fieldPath: string): void {
  if (!log.logId || typeof log.logId !== 'string') {
    throw new ImportValidationError(`GovernanceLog must have a valid logId`, `${fieldPath}.logId`, log.logId);
  }

  if (!log.entryType || typeof log.entryType !== 'string') {
    throw new ImportValidationError(`GovernanceLog must have a valid entryType`, `${fieldPath}.entryType`, log.entryType);
  }

  if (!log.summary || typeof log.summary !== 'string') {
    throw new ImportValidationError(`GovernanceLog must have a valid summary`, `${fieldPath}.summary`, log.summary);
  }

  if (!log.timestamp || typeof log.timestamp !== 'string') {
    throw new ImportValidationError(`GovernanceLog must have a valid timestamp`, `${fieldPath}.timestamp`, log.timestamp);
  }

  // Validate timestamp format (ISO 8601)
  try {
    new Date(log.timestamp);
  } catch (error) {
    throw new ImportValidationError(`GovernanceLog timestamp must be valid ISO 8601 format`, `${fieldPath}.timestamp`, log.timestamp);
  }
}

function validateOAppMeta(meta: any): void {
  if (!meta.submissionType || typeof meta.submissionType !== 'string') {
    throw new ImportValidationError('oAppMeta must have a valid submissionType', 'oAppMeta.submissionType', meta.submissionType);
  }

  if (!meta.submittedBy || typeof meta.submittedBy !== 'string') {
    throw new ImportValidationError('oAppMeta must have a valid submittedBy', 'oAppMeta.submittedBy', meta.submittedBy);
  }

  if (!meta.submissionTimestamp || typeof meta.submissionTimestamp !== 'string') {
    throw new ImportValidationError('oAppMeta must have a valid submissionTimestamp', 'oAppMeta.submissionTimestamp', meta.submissionTimestamp);
  }

  if (!Array.isArray(meta.tags)) {
    throw new ImportValidationError('oAppMeta must have tags array', 'oAppMeta.tags', meta.tags);
  }
}

export function validateMemoryAnchorPayload(payload: any): MemoryAnchorImportData {
  if (!payload || typeof payload !== 'object') {
    throw new ImportValidationError('Memory anchor payload must be an object');
  }

  if (!payload.anchorId || typeof payload.anchorId !== 'string') {
    throw new ImportValidationError('Memory anchor must have a valid anchorId', 'anchorId', payload.anchorId);
  }

  if (!payload.linkedPhaseStepId || typeof payload.linkedPhaseStepId !== 'string') {
    throw new ImportValidationError('Memory anchor must have a valid linkedPhaseStepId', 'linkedPhaseStepId', payload.linkedPhaseStepId);
  }

  if (!payload.status || typeof payload.status !== 'string') {
    throw new ImportValidationError('Memory anchor must have a valid status', 'status', payload.status);
  }

  return payload as MemoryAnchorImportData;
}

export function generatePayloadHash(payload: any): string {
  const jsonString = JSON.stringify(payload, Object.keys(payload).sort());
  return crypto.createHash('sha256').update(jsonString).digest('hex');
}