/**
 * DriveMemory logging utility for import operations
 */

import { promises as fs } from 'fs';
import * as path from 'path';

export interface ImportLogEntry {
  timestamp: string;
  operation: string;
  payloadHash: string;
  recordCount: number;
  status: 'success' | 'error' | 'partial';
  details: any;
  submittedBy?: string;
  agentTriggers?: string[];
  errorMessage?: string;
}

export class DriveMemoryLogger {
  private static instance: DriveMemoryLogger;
  private driveMemoryPath: string;

  private constructor() {
    this.driveMemoryPath = path.join(process.cwd(), 'DriveMemory', 'imports');
  }

  static getInstance(): DriveMemoryLogger {
    if (!DriveMemoryLogger.instance) {
      DriveMemoryLogger.instance = new DriveMemoryLogger();
    }
    return DriveMemoryLogger.instance;
  }

  async ensureDirectoryExists(): Promise<void> {
    try {
      await fs.mkdir(this.driveMemoryPath, { recursive: true });
    } catch (error) {
      console.warn('Could not create DriveMemory directory:', error);
    }
  }

  async logImportOperation(entry: ImportLogEntry): Promise<void> {
    try {
      await this.ensureDirectoryExists();
      
      const logFile = path.join(this.driveMemoryPath, 'import-operations.jsonl');
      const logLine = JSON.stringify(entry) + '\n';
      
      await fs.appendFile(logFile, logLine, 'utf-8');
      
      console.log(`📝 Import logged to DriveMemory: ${entry.operation} - ${entry.status} (${entry.recordCount} records)`);
    } catch (error) {
      console.error('Failed to log to DriveMemory:', error);
    }
  }

  async logProjectImport(
    payloadHash: string, 
    recordCount: number, 
    status: 'success' | 'error',
    details: any,
    submittedBy?: string,
    errorMessage?: string
  ): Promise<void> {
    const entry: ImportLogEntry = {
      timestamp: new Date().toISOString(),
      operation: 'project-import',
      payloadHash,
      recordCount,
      status,
      details: {
        projectId: details.projectId,
        phasesImported: details.phasesImported,
        stepsImported: details.stepsImported,
        governanceLogsImported: details.governanceLogsImported
      },
      submittedBy,
      agentTriggers: details.agentTriggers,
      errorMessage
    };

    await this.logImportOperation(entry);
  }

  async logPhaseImport(
    payloadHash: string,
    recordCount: number,
    status: 'success' | 'error',
    details: any,
    submittedBy?: string,
    errorMessage?: string
  ): Promise<void> {
    const entry: ImportLogEntry = {
      timestamp: new Date().toISOString(),
      operation: 'phase-import',
      payloadHash,
      recordCount,
      status,
      details,
      submittedBy,
      errorMessage
    };

    await this.logImportOperation(entry);
  }

  async logPhaseStepImport(
    payloadHash: string,
    recordCount: number,
    status: 'success' | 'error',
    details: any,
    submittedBy?: string,
    errorMessage?: string
  ): Promise<void> {
    const entry: ImportLogEntry = {
      timestamp: new Date().toISOString(),
      operation: 'phase-step-import',
      payloadHash,
      recordCount,
      status,
      details,
      submittedBy,
      errorMessage
    };

    await this.logImportOperation(entry);
  }

  async logGovernanceLogImport(
    payloadHash: string,
    recordCount: number,
    status: 'success' | 'error',
    details: any,
    submittedBy?: string,
    errorMessage?: string
  ): Promise<void> {
    const entry: ImportLogEntry = {
      timestamp: new Date().toISOString(),
      operation: 'governance-log-import',
      payloadHash,
      recordCount,
      status,
      details,
      submittedBy,
      errorMessage
    };

    await this.logImportOperation(entry);
  }

  async logMemoryAnchorImport(
    payloadHash: string,
    recordCount: number,
    status: 'success' | 'error',
    details: any,
    submittedBy?: string,
    errorMessage?: string
  ): Promise<void> {
    const entry: ImportLogEntry = {
      timestamp: new Date().toISOString(),
      operation: 'memory-anchor-import',
      payloadHash,
      recordCount,
      status,
      details,
      submittedBy,
      errorMessage
    };

    await this.logImportOperation(entry);
  }

  async getImportHistory(limit: number = 100): Promise<ImportLogEntry[]> {
    try {
      const logFile = path.join(this.driveMemoryPath, 'import-operations.jsonl');
      const content = await fs.readFile(logFile, 'utf-8');
      
      const lines = content.trim().split('\n').filter(line => line.trim());
      const entries = lines
        .map(line => {
          try {
            return JSON.parse(line);
          } catch (error) {
            console.warn('Invalid log line:', line);
            return null;
          }
        })
        .filter(entry => entry !== null)
        .slice(-limit); // Get last N entries

      return entries;
    } catch (error) {
      console.warn('Could not read import history:', error);
      return [];
    }
  }
}