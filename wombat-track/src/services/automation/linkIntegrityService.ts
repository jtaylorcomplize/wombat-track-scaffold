/**
 * OF-9.5.2: Link Integrity Service
 * Detect broken/missing links and provide repair workflows for Governance Logs
 */

import type { GovernanceLog} from '../governanceLogsService';
import { governanceLogsService } from '../governanceLogsService';
import { semanticSearchService } from './semanticSearchService';
import { logClassifierService } from './logClassifierService';

export interface LinkIntegrityIssue {
  id: string;
  logId: string;
  issueType: 'phase' | 'step' | 'anchor' | 'governance_log' | 'file';
  field: 'related_phase' | 'related_step' | 'linked_anchor' | 'links' | 'memory_anchor_id';
  currentValue: string;
  severity: 'critical' | 'warning' | 'info';
  description: string;
  suggestions?: LinkRepairSuggestion[];
  detectedAt: string;
}

export interface LinkRepairSuggestion {
  value: string;
  confidence: number;
  reasoning: string;
  source: 'exact_match' | 'semantic_match' | 'pattern_match' | 'manual';
}

export interface LinkIntegrityReport {
  totalIssues: number;
  criticalIssues: number;
  warningIssues: number;
  infoIssues: number;
  issues: LinkIntegrityIssue[];
  scanDuration: number;
  scannedLogs: number;
  lastScan: string;
}

export interface RepairRequest {
  issueId: string;
  newValue: string;
  repairSource: 'auto' | 'manual' | 'suggestion';
  userReason?: string;
}

export interface RepairResult {
  success: boolean;
  issueId: string;
  oldValue: string;
  newValue: string;
  updatedLogId: string;
  timestamp: string;
  message: string;
}

export class LinkIntegrityService {
  private static instance: LinkIntegrityService;
  private isInitialized = false;
  private lastReport: LinkIntegrityReport | null = null;

  private constructor() {}

  static getInstance(): LinkIntegrityService {
    if (!LinkIntegrityService.instance) {
      LinkIntegrityService.instance = new LinkIntegrityService();
    }
    return LinkIntegrityService.instance;
  }

  async init(): Promise<void> {
    if (this.isInitialized) return;
    
    // Initialize semantic search service for suggestions
    await semanticSearchService.init();
    await logClassifierService.init();
    
    this.isInitialized = true;
  }

  /**
   * Perform comprehensive link integrity scan
   */
  async performIntegrityScan(): Promise<LinkIntegrityReport> {
    await this.init();
    
    const startTime = Date.now();
    const issues: LinkIntegrityIssue[] = [];
    
    try {
      // Get all governance logs
      const logsResult = await governanceLogsService.listGovernanceLogs({
        page_size: 1000 // Get all logs for integrity check
      });
      
      const logs = logsResult.data;
      
      // Check each log for link integrity issues
      for (const log of logs) {
        const logIssues = await this.checkLogIntegrity(log);
        issues.push(...logIssues);
      }

      const endTime = Date.now();
      const scanDuration = endTime - startTime;

      // Generate suggestions for all issues
      await this.generateSuggestions(issues);

      const report: LinkIntegrityReport = {
        totalIssues: issues.length,
        criticalIssues: issues.filter(i => i.severity === 'critical').length,
        warningIssues: issues.filter(i => i.severity === 'warning').length,
        infoIssues: issues.filter(i => i.severity === 'info').length,
        issues,
        scanDuration,
        scannedLogs: logs.length,
        lastScan: new Date().toISOString()
      };

      this.lastReport = report;
      return report;

    } catch (error) {
      console.error('Link integrity scan failed:', error);
      throw new Error(`Integrity scan failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check integrity of links in a specific log
   */
  private async checkLogIntegrity(log: GovernanceLog): Promise<LinkIntegrityIssue[]> {
    const issues: LinkIntegrityIssue[] = [];

    // Check phase_id
    if (log.related_phase) {
      const phaseIssue = await this.checkPhaseIntegrity(log, log.related_phase);
      if (phaseIssue) issues.push(phaseIssue);
    }

    // Check step_id  
    if (log.related_step) {
      const stepIssue = await this.checkStepIntegrity(log, log.related_step);
      if (stepIssue) issues.push(stepIssue);
    }

    // Check memory_anchor_id
    if (log.linked_anchor) {
      const anchorIssue = await this.checkAnchorIntegrity(log, log.linked_anchor);
      if (anchorIssue) issues.push(anchorIssue);
    }

    // Check governance log links
    if (log.links && log.links.length > 0) {
      for (const link of log.links) {
        if (link.target_id) {
          const linkIssue = await this.checkGovernanceLogLink(log, link.target_id);
          if (linkIssue) issues.push(linkIssue);
        }
      }
    }

    return issues;
  }

  /**
   * Check if phase ID exists and is valid
   */
  private async checkPhaseIntegrity(log: GovernanceLog, phaseId: string): Promise<LinkIntegrityIssue | null> {
    // Pattern-based validation
    const phasePattern = /^OF-\d+(\.\d+)*$/;
    
    if (!phasePattern.test(phaseId)) {
      return {
        id: `phase-invalid-${log.id}-${Date.now()}`,
        logId: log.id,
        issueType: 'phase',
        field: 'related_phase',
        currentValue: phaseId,
        severity: 'warning',
        description: `Invalid phase ID format: "${phaseId}". Expected format: OF-X.X`,
        detectedAt: new Date().toISOString()
      };
    }

    // Check for orphaned or deprecated phases
    if (await this.isOrphanedPhase(phaseId)) {
      return {
        id: `phase-orphaned-${log.id}-${Date.now()}`,
        logId: log.id,
        issueType: 'phase',
        field: 'related_phase',
        currentValue: phaseId,
        severity: 'warning',
        description: `Phase "${phaseId}" appears to be orphaned or deprecated`,
        detectedAt: new Date().toISOString()
      };
    }

    return null;
  }

  /**
   * Check if step ID exists and is valid
   */
  private async checkStepIntegrity(log: GovernanceLog, stepId: string): Promise<LinkIntegrityIssue | null> {
    // Pattern-based validation
    const stepPattern = /^OF-\d+(\.\d+)+$/;
    
    if (!stepPattern.test(stepId)) {
      return {
        id: `step-invalid-${log.id}-${Date.now()}`,
        logId: log.id,
        issueType: 'step',
        field: 'related_step',
        currentValue: stepId,
        severity: 'warning',
        description: `Invalid step ID format: "${stepId}". Expected format: OF-X.X.X`,
        detectedAt: new Date().toISOString()
      };
    }

    // Check parent phase consistency
    if (log.related_phase) {
      const expectedPhase = stepId.split('.').slice(0, 2).join('.');
      if (log.related_phase !== expectedPhase) {
        return {
          id: `step-phase-mismatch-${log.id}-${Date.now()}`,
          logId: log.id,
          issueType: 'step',
          field: 'related_step',
          currentValue: stepId,
          severity: 'critical',
          description: `Step "${stepId}" does not belong to phase "${log.related_phase}"`,
          detectedAt: new Date().toISOString()
        };
      }
    }

    return null;
  }

  /**
   * Check if memory anchor exists and is valid
   */
  private async checkAnchorIntegrity(log: GovernanceLog, anchorId: string): Promise<LinkIntegrityIssue | null> {
    // Pattern-based validation for anchor IDs
    const anchorPattern = /^[A-Z][A-Z0-9-]+$/;
    
    if (!anchorPattern.test(anchorId)) {
      return {
        id: `anchor-invalid-${log.id}-${Date.now()}`,
        logId: log.id,
        issueType: 'anchor',
        field: 'linked_anchor',
        currentValue: anchorId,
        severity: 'info',
        description: `Unusual anchor ID format: "${anchorId}". Consider using uppercase with hyphens`,
        detectedAt: new Date().toISOString()
      };
    }

    // Check if anchor is defined in any documentation
    if (!(await this.isValidAnchor(anchorId))) {
      return {
        id: `anchor-missing-${log.id}-${Date.now()}`,
        logId: log.id,
        issueType: 'anchor',
        field: 'linked_anchor',
        currentValue: anchorId,
        severity: 'warning',
        description: `Memory anchor "${anchorId}" not found in documentation`,
        detectedAt: new Date().toISOString()
      };
    }

    return null;
  }

  /**
   * Check if governance log link is valid
   */
  private async checkGovernanceLogLink(log: GovernanceLog, targetId: string): Promise<LinkIntegrityIssue | null> {
    try {
      const targetLog = await governanceLogsService.getGovernanceLog(targetId);
      
      if (!targetLog) {
        return {
          id: `govlog-missing-${log.id}-${Date.now()}`,
          logId: log.id,
          issueType: 'governance_log',
          field: 'links',
          currentValue: targetId,
          severity: 'critical',
          description: `Linked governance log "${targetId}" not found`,
          detectedAt: new Date().toISOString()
        };
      }

      // Check for circular references
      if (targetLog.links?.some(link => link.target_id === log.id)) {
        return {
          id: `govlog-circular-${log.id}-${Date.now()}`,
          logId: log.id,
          issueType: 'governance_log',
          field: 'links',
          currentValue: targetId,
          severity: 'warning',
          description: `Circular reference detected with governance log "${targetId}"`,
          detectedAt: new Date().toISOString()
        };
      }

    } catch (error) {
      return {
        id: `govlog-error-${log.id}-${Date.now()}`,
        logId: log.id,
        issueType: 'governance_log',
        field: 'links',
        currentValue: targetId,
        severity: 'critical',
        description: `Error checking governance log link "${targetId}": ${error instanceof Error ? error.message : 'Unknown error'}`,
        detectedAt: new Date().toISOString()
      };
    }

    return null;
  }

  /**
   * Generate repair suggestions for issues
   */
  private async generateSuggestions(issues: LinkIntegrityIssue[]): Promise<void> {
    for (const issue of issues) {
      issue.suggestions = await this.getSuggestionsForIssue(issue);
    }
  }

  /**
   * Get repair suggestions for a specific issue
   */
  private async getSuggestionsForIssue(issue: LinkIntegrityIssue): Promise<LinkRepairSuggestion[]> {
    const suggestions: LinkRepairSuggestion[] = [];

    try {
      switch (issue.issueType) {
        case 'phase':
          suggestions.push(...await this.getPhaseSuggestions(issue.currentValue));
          break;
        case 'step':
          suggestions.push(...await this.getStepSuggestions(issue.currentValue, issue.logId));
          break;
        case 'anchor':
          suggestions.push(...await this.getAnchorSuggestions(issue.currentValue));
          break;
        case 'governance_log':
          suggestions.push(...await this.getGovernanceLogSuggestions(issue.currentValue, issue.logId));
          break;
      }
    } catch (error) {
      console.error(`Failed to generate suggestions for issue ${issue.id}:`, error);
    }

    return suggestions.sort((a, b) => b.confidence - a.confidence).slice(0, 5);
  }

  /**
   * Get phase repair suggestions
   */
  private async getPhaseSuggestions(currentValue: string): Promise<LinkRepairSuggestion[]> {
    const suggestions: LinkRepairSuggestion[] = [];

    // Try to find similar phases using semantic search
    try {
      const searchResults = await semanticSearchService.searchLogs({
        query: `phase ${currentValue}`,
        limit: 10,
        threshold: 0.6
      });

      for (const result of searchResults) {
        if (result.log.related_phase && result.log.related_phase !== currentValue) {
          suggestions.push({
            value: result.log.related_phase,
            confidence: result.relevanceScore,
            reasoning: `Similar phase found in governance log: ${result.log.summary.substring(0, 50)}...`,
            source: 'semantic_match'
          });
        }
      }
    } catch (error) {
      console.error('Error getting phase suggestions:', error);
    }

    // Pattern-based corrections
    if (currentValue.toLowerCase().startsWith('of-')) {
      const corrected = currentValue.toUpperCase().replace(/^OF-/, 'OF-');
      if (corrected !== currentValue) {
        suggestions.push({
          value: corrected,
          confidence: 0.9,
          reasoning: 'Corrected case formatting',
          source: 'pattern_match'
        });
      }
    }

    return suggestions;
  }

  /**
   * Get step repair suggestions
   */
  private async getStepSuggestions(currentValue: string, logId: string): Promise<LinkRepairSuggestion[]> {
    const suggestions: LinkRepairSuggestion[] = [];

    try {
      // Get the log to understand context
      const log = await governanceLogsService.getGovernanceLog(logId);
      if (!log) return suggestions;

      // If there's a valid phase, suggest steps within that phase
      if (log.related_phase) {
        const phasePrefix = log.related_phase;
        
        // Find other logs with similar content in the same phase
        const searchResults = await semanticSearchService.searchLogs({
          query: log.summary,
          limit: 10,
          threshold: 0.7,
          filters: {
            entryType: [log.entryType]
          }
        });

        for (const result of searchResults) {
          if (result.log.related_step?.startsWith(phasePrefix)) {
            suggestions.push({
              value: result.log.related_step,
              confidence: result.relevanceScore,
              reasoning: `Step found in similar ${log.entryType} log`,
              source: 'semantic_match'
            });
          }
        }
      }
    } catch (error) {
      console.error('Error getting step suggestions:', error);
    }

    return suggestions;
  }

  /**
   * Get anchor repair suggestions
   */
  private async getAnchorSuggestions(currentValue: string): Promise<LinkRepairSuggestion[]> {
    const suggestions: LinkRepairSuggestion[] = [];

    // Pattern-based corrections
    const corrected = currentValue.toUpperCase().replace(/[^A-Z0-9-]/g, '-');
    if (corrected !== currentValue) {
      suggestions.push({
        value: corrected,
        confidence: 0.8,
        reasoning: 'Normalized anchor format to uppercase with hyphens',
        source: 'pattern_match'
      });
    }

    // Common anchor patterns
    const commonAnchors = [
      'OF-GOVLOG-ACTIVE',
      'OF-GOVLOG-UI', 
      'OF-GOVLOG-AUTO',
      'OF-GOVLOG-LINK-INTEGRITY',
      'WT-ANCHOR-GOVERNANCE',
      'OF-SDLC-IMP2'
    ];

    for (const anchor of commonAnchors) {
      if (anchor.toLowerCase().includes(currentValue.toLowerCase()) ||
          currentValue.toLowerCase().includes(anchor.toLowerCase())) {
        suggestions.push({
          value: anchor,
          confidence: 0.7,
          reasoning: 'Common anchor pattern match',
          source: 'pattern_match'
        });
      }
    }

    return suggestions;
  }

  /**
   * Get governance log repair suggestions
   */
  private async getGovernanceLogSuggestions(currentValue: string, logId: string): Promise<LinkRepairSuggestion[]> {
    const suggestions: LinkRepairSuggestion[] = [];

    try {
      // Search for logs with similar IDs or content
      const searchResults = await semanticSearchService.searchLogs({
        query: currentValue,
        limit: 10,
        threshold: 0.5
      });

      for (const result of searchResults) {
        if (result.log.id !== logId) { // Don't suggest self-reference
          suggestions.push({
            value: result.log.id,
            confidence: result.relevanceScore,
            reasoning: `Similar log: ${result.log.summary.substring(0, 50)}...`,
            source: 'semantic_match'
          });
        }
      }
    } catch (error) {
      console.error('Error getting governance log suggestions:', error);
    }

    return suggestions;
  }

  /**
   * Apply a repair to fix a link integrity issue
   */
  async applyRepair(request: RepairRequest): Promise<RepairResult> {
    try {
      const issue = this.lastReport?.issues.find(i => i.id === request.issueId);
      if (!issue) {
        return {
          success: false,
          issueId: request.issueId,
          oldValue: '',
          newValue: request.newValue,
          updatedLogId: '',
          timestamp: new Date().toISOString(),
          message: 'Issue not found in last integrity report'
        };
      }

      // Get the log to update
      const log = await governanceLogsService.getGovernanceLog(issue.logId);
      if (!log) {
        return {
          success: false,
          issueId: request.issueId,
          oldValue: issue.currentValue,
          newValue: request.newValue,
          updatedLogId: issue.logId,
          timestamp: new Date().toISOString(),
          message: 'Governance log not found'
        };
      }

      // Prepare update data
      const updateData: Partial<GovernanceLog> = {};
      
      switch (issue.field) {
        case 'related_phase':
          updateData.related_phase = request.newValue;
          break;
        case 'related_step':
          updateData.related_step = request.newValue;
          break;
        case 'linked_anchor':
          updateData.linked_anchor = request.newValue;
          break;
        case 'memory_anchor_id':
          updateData.memory_anchor_id = request.newValue;
          break;
        // Links field would require more complex handling
        default:
          throw new Error(`Unsupported field for repair: ${issue.field}`);
      }

      // Apply the update
      const updatedLog = await governanceLogsService.updateGovernanceLog(issue.logId, updateData);
      
      if (!updatedLog) {
        return {
          success: false,
          issueId: request.issueId,
          oldValue: issue.currentValue,
          newValue: request.newValue,
          updatedLogId: issue.logId,
          timestamp: new Date().toISOString(),
          message: 'Failed to update governance log'
        };
      }

      // Log the repair action
      await this.logRepairAction(request, issue, log);

      return {
        success: true,
        issueId: request.issueId,
        oldValue: issue.currentValue,
        newValue: request.newValue,
        updatedLogId: issue.logId,
        timestamp: new Date().toISOString(),
        message: 'Link integrity issue successfully repaired'
      };

    } catch (error) {
      return {
        success: false,
        issueId: request.issueId,
        oldValue: '',
        newValue: request.newValue,
        updatedLogId: '',
        timestamp: new Date().toISOString(),
        message: `Repair failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Log repair action for audit trail
   */
  private async logRepairAction(request: RepairRequest, issue: LinkIntegrityIssue, originalLog: GovernanceLog): Promise<void> {
    try {
      const auditEntry = {
        entryType: 'System' as const,
        summary: `Link integrity repair: ${issue.issueType} field "${issue.field}" updated from "${issue.currentValue}" to "${request.newValue}"`,
        gptDraftEntry: `Automated repair applied via ${request.repairSource} action. Original log: ${originalLog.summary}. Issue: ${issue.description}`,
        classification: 'operational',
        related_phase: originalLog.related_phase,
        linked_anchor: 'OF-GOVLOG-LINK-INTEGRITY',
        created_by: 'link-integrity-service'
      };

      await governanceLogsService.createGovernanceLog(auditEntry);
    } catch (error) {
      console.error('Failed to log repair action:', error);
    }
  }

  /**
   * Get the last integrity report
   */
  getLastReport(): LinkIntegrityReport | null {
    return this.lastReport;
  }

  /**
   * Helper methods for validation
   */
  private async isOrphanedPhase(phaseId: string): Promise<boolean> {
    // Check if phase has recent activity
    try {
      const recentLogs = await governanceLogsService.listGovernanceLogs({
        phase_id: phaseId,
        page_size: 1
      });
      
      return recentLogs.data.length === 0;
    } catch {
      return true; // Assume orphaned if we can't check
    }
  }

  private async isValidAnchor(anchorId: string): Promise<boolean> {
    // Check against known anchor patterns and documentation
    const knownAnchors = [
      'OF-GOVLOG-ACTIVE',
      'OF-GOVLOG-UI',
      'OF-GOVLOG-AUTO', 
      'OF-GOVLOG-LINK-INTEGRITY',
      'WT-ANCHOR-GOVERNANCE',
      'OF-SDLC-IMP2'
    ];
    
    return knownAnchors.includes(anchorId) || 
           /^OF-[A-Z0-9]+-[A-Z0-9-]+$/.test(anchorId);
  }

  /**
   * Get integrity summary for specific log
   */
  async getLogIntegritySummary(logId: string): Promise<{ issueCount: number; severity: 'none' | 'info' | 'warning' | 'critical' }> {
    if (!this.lastReport) {
      await this.performIntegrityScan();
    }

    const logIssues = this.lastReport?.issues.filter(issue => issue.logId === logId) || [];
    
    if (logIssues.length === 0) {
      return { issueCount: 0, severity: 'none' };
    }

    const maxSeverity = logIssues.reduce((max, issue) => {
      const severityRank = { info: 1, warning: 2, critical: 3 };
      return severityRank[issue.severity] > severityRank[max] ? issue.severity : max;
    }, 'info' as 'info' | 'warning' | 'critical');

    return { issueCount: logIssues.length, severity: maxSeverity };
  }
}

export const linkIntegrityService = LinkIntegrityService.getInstance();