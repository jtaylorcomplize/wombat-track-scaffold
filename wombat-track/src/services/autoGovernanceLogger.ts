/**
 * Auto-Governance Logger Service (OF-9.3.2)
 * Automatically creates governance logs for significant events:
 * - PhaseStep completion
 * - PR merge events
 * - Checkpoint pass/fail
 * - Significant AI actions
 */

import type { CreateGovernanceLogRequest } from './governanceLogsService';
import { governanceLogsService } from './governanceLogsService';

export interface PhaseStepCompletionEvent {
  stepId: string;
  phaseId: string;
  stepName: string;
  status: 'completed' | 'failed';
  completedBy: string;
  duration?: number;
  notes?: string;
  timestamp?: string;
}

export interface PRMergeEvent {
  prNumber: number;
  prTitle: string;
  fromBranch: string;
  toBranch: string;
  author: string;
  mergedBy: string;
  mergeCommitSha?: string;
  filesChanged: number;
  linesAdded: number;
  linesDeleted: number;
  timestamp?: string;
}

export interface CheckpointEvent {
  checkpointId: string;
  checkpointName: string;
  status: 'pass' | 'fail' | 'warning';
  testResults?: {
    passed: number;
    failed: number;
    skipped: number;
    total: number;
  };
  duration?: number;
  runBy: string;
  errorDetails?: string;
  timestamp?: string;
}

export interface AIActionEvent {
  action: 'code_generation' | 'code_review' | 'test_creation' | 'refactoring' | 'documentation' | 'debugging';
  model?: string;
  promptTokens?: number;
  responseTokens?: number;
  duration?: number;
  context: {
    projectId?: string;
    phaseId?: string;
    stepId?: string;
    files?: string[];
    description: string;
  };
  result: 'success' | 'partial' | 'failed';
  triggeredBy: string;
  timestamp?: string;
}

export class AutoGovernanceLogger {
  private static instance: AutoGovernanceLogger;

  private constructor() {}

  public static getInstance(): AutoGovernanceLogger {
    if (!AutoGovernanceLogger.instance) {
      AutoGovernanceLogger.instance = new AutoGovernanceLogger();
    }
    return AutoGovernanceLogger.instance;
  }

  /**
   * Log PhaseStep completion event
   */
  async logPhaseStepCompletion(event: PhaseStepCompletionEvent): Promise<string | null> {
    try {
      const logData: CreateGovernanceLogRequest = {
        entryType: event.status === 'completed' ? 'Change' : 'Risk',
        summary: `${event.status === 'completed' ? 'Completed' : 'Failed'} step: ${event.stepName}`,
        gptDraftEntry: this.formatPhaseStepDetails(event),
        classification: `step_${event.status}`,
        related_phase: event.phaseId,
        related_step: event.stepId,
        created_by: event.completedBy || 'system'
      };

      const createdLog = await governanceLogsService.createGovernanceLog(logData);
      
      console.log(`📝 Auto-logged PhaseStep completion: ${event.stepId} (${event.status})`);
      return createdLog.id;

    } catch (error) {
      console.error('Failed to log PhaseStep completion:', error);
      return null;
    }
  }

  /**
   * Log PR merge event
   */
  async logPRMerge(event: PRMergeEvent): Promise<string | null> {
    try {
      const logData: CreateGovernanceLogRequest = {
        entryType: 'Change',
        summary: `Merged PR #${event.prNumber}: ${event.prTitle}`,
        gptDraftEntry: this.formatPRMergeDetails(event),
        classification: 'pr_merge',
        created_by: event.mergedBy || event.author
      };

      const createdLog = await governanceLogsService.createGovernanceLog(logData);
      
      console.log(`📝 Auto-logged PR merge: #${event.prNumber}`);
      return createdLog.id;

    } catch (error) {
      console.error('Failed to log PR merge:', error);
      return null;
    }
  }

  /**
   * Log checkpoint/test results
   */
  async logCheckpointResult(event: CheckpointEvent): Promise<string | null> {
    try {
      const entryType = event.status === 'pass' ? 'Quality' : 
                       event.status === 'fail' ? 'Risk' : 'Review';
      
      const logData: CreateGovernanceLogRequest = {
        entryType,
        summary: `Checkpoint ${event.status}: ${event.checkpointName}`,
        gptDraftEntry: this.formatCheckpointDetails(event),
        classification: `checkpoint_${event.status}`,
        created_by: event.runBy || 'system'
      };

      const createdLog = await governanceLogsService.createGovernanceLog(logData);
      
      console.log(`📝 Auto-logged checkpoint result: ${event.checkpointId} (${event.status})`);
      return createdLog.id;

    } catch (error) {
      console.error('Failed to log checkpoint result:', error);
      return null;
    }
  }

  /**
   * Log significant AI action
   */
  async logAIAction(event: AIActionEvent): Promise<string | null> {
    try {
      const logData: CreateGovernanceLogRequest = {
        entryType: 'Process',
        summary: `AI ${event.action}: ${event.context.description}`,
        gptDraftEntry: this.formatAIActionDetails(event),
        classification: `ai_${event.action}`,
        related_phase: event.context.phaseId,
        related_step: event.context.stepId,
        created_by: event.triggeredBy || 'ai_system'
      };

      const createdLog = await governanceLogsService.createGovernanceLog(logData);
      
      console.log(`📝 Auto-logged AI action: ${event.action} (${event.result})`);
      return createdLog.id;

    } catch (error) {
      console.error('Failed to log AI action:', error);
      return null;
    }
  }

  /**
   * Generic event logger for custom events
   */
  async logCustomEvent(
    entryType: CreateGovernanceLogRequest['entryType'],
    summary: string,
    details: any,
    options: {
      classification?: string;
      relatedPhase?: string;
      relatedStep?: string;
      createdBy?: string;
    } = {}
  ): Promise<string | null> {
    try {
      const logData: CreateGovernanceLogRequest = {
        entryType,
        summary,
        gptDraftEntry: typeof details === 'string' ? details : JSON.stringify(details, null, 2),
        classification: options.classification || 'custom_event',
        related_phase: options.relatedPhase,
        related_step: options.relatedStep,
        created_by: options.createdBy || 'system'
      };

      const createdLog = await governanceLogsService.createGovernanceLog(logData);
      
      console.log(`📝 Auto-logged custom event: ${summary}`);
      return createdLog.id;

    } catch (error) {
      console.error('Failed to log custom event:', error);
      return null;
    }
  }

  // Private formatting methods

  private formatPhaseStepDetails(event: PhaseStepCompletionEvent): string {
    const details = {
      stepId: event.stepId,
      phaseId: event.phaseId,
      stepName: event.stepName,
      status: event.status,
      completedBy: event.completedBy,
      completionTime: event.timestamp || new Date().toISOString(),
      duration: event.duration ? `${event.duration}ms` : undefined,
      notes: event.notes
    };

    return `PhaseStep ${event.status}:\n\n${Object.entries(details)
      .filter(([_, value]) => value !== undefined)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n')}`;
  }

  private formatPRMergeDetails(event: PRMergeEvent): string {
    const details = {
      prNumber: event.prNumber,
      title: event.prTitle,
      branch: `${event.fromBranch} → ${event.toBranch}`,
      author: event.author,
      mergedBy: event.mergedBy,
      mergeTime: event.timestamp || new Date().toISOString(),
      commitSha: event.mergeCommitSha,
      changes: `+${event.linesAdded} -${event.linesDeleted} across ${event.filesChanged} files`
    };

    return `PR Merge Summary:\n\n${Object.entries(details)
      .filter(([_, value]) => value !== undefined)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n')}`;
  }

  private formatCheckpointDetails(event: CheckpointEvent): string {
    const details = {
      checkpointId: event.checkpointId,
      name: event.checkpointName,
      status: event.status,
      runBy: event.runBy,
      runTime: event.timestamp || new Date().toISOString(),
      duration: event.duration ? `${event.duration}ms` : undefined,
      testResults: event.testResults ? 
        `${event.testResults.passed}/${event.testResults.total} passed` : undefined,
      errorDetails: event.errorDetails
    };

    return `Checkpoint Results:\n\n${Object.entries(details)
      .filter(([_, value]) => value !== undefined)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n')}`;
  }

  private formatAIActionDetails(event: AIActionEvent): string {
    const details = {
      action: event.action,
      model: event.model,
      result: event.result,
      triggeredBy: event.triggeredBy,
      timestamp: event.timestamp || new Date().toISOString(),
      duration: event.duration ? `${event.duration}ms` : undefined,
      tokenUsage: event.promptTokens && event.responseTokens ? 
        `${event.promptTokens} prompt + ${event.responseTokens} response` : undefined,
      context: event.context.description,
      projectId: event.context.projectId,
      phaseId: event.context.phaseId,
      stepId: event.context.stepId,
      filesAffected: event.context.files?.length || 0
    };

    return `AI Action Summary:\n\n${Object.entries(details)
      .filter(([_, value]) => value !== undefined)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n')}`;
  }

  // Helper methods for integration

  /**
   * Hook into existing PhaseStep completion logic
   */
  static async hookPhaseStepCompletion(
    stepId: string, 
    phaseId: string, 
    stepName: string, 
    completedBy: string,
    success: boolean = true,
    notes?: string
  ): Promise<void> {
    const logger = AutoGovernanceLogger.getInstance();
    await logger.logPhaseStepCompletion({
      stepId,
      phaseId,
      stepName,
      status: success ? 'completed' : 'failed',
      completedBy,
      notes,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Hook into PR workflow (can be called from GitHub Actions or git hooks)
   */
  static async hookPRMerge(
    prData: Partial<PRMergeEvent>
  ): Promise<void> {
    if (!prData.prNumber || !prData.prTitle) {
      console.warn('Insufficient PR data for governance logging');
      return;
    }

    const logger = AutoGovernanceLogger.getInstance();
    await logger.logPRMerge({
      prNumber: prData.prNumber,
      prTitle: prData.prTitle,
      fromBranch: prData.fromBranch || 'unknown',
      toBranch: prData.toBranch || 'main',
      author: prData.author || 'unknown',
      mergedBy: prData.mergedBy || prData.author || 'unknown',
      mergeCommitSha: prData.mergeCommitSha,
      filesChanged: prData.filesChanged || 0,
      linesAdded: prData.linesAdded || 0,
      linesDeleted: prData.linesDeleted || 0,
      timestamp: prData.timestamp || new Date().toISOString()
    });
  }

  /**
   * Hook into test/CI systems
   */
  static async hookTestResults(
    checkpointName: string,
    passed: boolean,
    testResults?: CheckpointEvent['testResults'],
    runBy?: string,
    errorDetails?: string
  ): Promise<void> {
    const logger = AutoGovernanceLogger.getInstance();
    await logger.logCheckpointResult({
      checkpointId: `checkpoint-${Date.now()}`,
      checkpointName,
      status: passed ? 'pass' : 'fail',
      testResults,
      runBy: runBy || 'ci_system',
      errorDetails,
      timestamp: new Date().toISOString()
    });
  }
}

export default AutoGovernanceLogger;