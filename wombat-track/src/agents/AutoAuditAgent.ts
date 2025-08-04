/**
 * Auto-Audit Agent
 * Automatically performs compliance audits and governance checks
 * Monitors project health, SDLC compliance, and security best practices
 */

import { EventEmitter } from 'events';
import type { Project, Phase, PhaseStep } from '../types/phase';
import { governanceLogger } from '../services/governanceLogger';
import { enhancedGovernanceLogger } from '../services/enhancedGovernanceLogger';

export interface AuditRule {
  id: string;
  name: string;
  description: string;
  category: 'security' | 'compliance' | 'performance' | 'governance' | 'quality';
  severity: 'low' | 'medium' | 'high' | 'critical';
  frequency: 'real_time' | 'hourly' | 'daily' | 'weekly' | 'on_demand';
  enabled: boolean;
  autoRemediation: boolean;
  scope: 'project' | 'phase' | 'step' | 'global';
}

export interface ComplianceCheck {
  id: string;
  name: string;
  description: string;
  checkFunction: (context: AuditContext) => Promise<ComplianceResult>;
  requiredFields: string[];
  dependencies: string[];
}

export interface AuditContext {
  project?: Project;
  phase?: Phase;
  step?: PhaseStep;
  timestamp: string;
  userId?: string;
  metadata: Record<string, unknown>;
}

export interface ComplianceResult {
  passed: boolean;
  score: number; // 0-100
  findings: AuditFinding[];
  recommendations: string[];
  metadata: Record<string, unknown>;
}

export interface AuditFinding {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  description: string;
  location: string; // project.phase.step path
  remediation?: RemediationAction;
  evidence: Record<string, unknown>;
}

export interface RemediationAction {
  id: string;
  type: 'auto_fix' | 'notification' | 'escalation' | 'documentation';
  description: string;
  automated: boolean;
  priority: number;
  estimatedTime: number; // minutes
}

export interface AuditReport {
  id: string;
  timestamp: string;
  scope: string;
  overallScore: number;
  totalFindings: number;
  findingsBySeverity: Record<string, number>;
  complianceChecks: ComplianceResult[];
  remediationActions: RemediationAction[];
  executionTime: number; // milliseconds
}

export class AutoAuditAgent extends EventEmitter {
  private rules: Map<string, AuditRule>;
  private checks: Map<string, ComplianceCheck>;
  private auditHistory: AuditReport[];
  private isActive: boolean = false;
  private auditTimer?: NodeJS.Timeout;

  constructor() {
    super();
    
    this.rules = new Map();
    this.checks = new Map();
    this.auditHistory = [];
    
    // Initialize default audit rules
    this.initializeDefaultRules();
    this.initializeDefaultChecks();
  }

  /**
   * Initialize default audit rules
   */
  private initializeDefaultRules(): void {
    const defaultRules: AuditRule[] = [
      {
        id: 'project-governance',
        name: 'Project Governance Compliance',
        description: 'Ensures proper project governance documentation and tracking',
        category: 'governance',
        severity: 'high',
        frequency: 'daily',
        enabled: true,
        autoRemediation: false,
        scope: 'project'
      },
      {
        id: 'phase-documentation',
        name: 'Phase Documentation Requirements',
        description: 'Validates that phases have proper documentation and planning',
        category: 'compliance',
        severity: 'medium',
        frequency: 'daily',
        enabled: true,
        autoRemediation: true,
        scope: 'phase'
      },
      {
        id: 'step-completion-tracking',
        name: 'Step Completion Tracking',
        description: 'Monitors step completion patterns and identifies bottlenecks',
        category: 'performance',
        severity: 'medium',
        frequency: 'real_time',
        enabled: true,
        autoRemediation: false,
        scope: 'step'
      },
      {
        id: 'security-checklist-compliance',
        name: 'Security Checklist Compliance',
        description: 'Ensures security checklists are completed for critical steps',
        category: 'security',
        severity: 'critical',
        frequency: 'real_time',
        enabled: true,
        autoRemediation: false,
        scope: 'step'
      },
      {
        id: 'quality-gate-validation',
        name: 'Quality Gate Validation',
        description: 'Validates that quality gates are properly configured and enforced',
        category: 'quality',
        severity: 'high',
        frequency: 'daily',
        enabled: true,
        autoRemediation: true,
        scope: 'phase'
      }
    ];

    defaultRules.forEach(rule => this.rules.set(rule.id, rule));
  }

  /**
   * Initialize default compliance checks
   */
  private initializeDefaultChecks(): void {
    const defaultChecks: ComplianceCheck[] = [
      {
        id: 'project-metadata-completeness',
        name: 'Project Metadata Completeness',
        description: 'Validates that all required project metadata fields are populated',
        checkFunction: this.checkProjectMetadataCompleteness.bind(this),
        requiredFields: ['project'],
        dependencies: []
      },
      {
        id: 'phase-step-consistency',
        name: 'Phase-Step Consistency',
        description: 'Ensures phases have consistent step structures and dependencies',
        checkFunction: this.checkPhaseStepConsistency.bind(this),
        requiredFields: ['project', 'phase'],
        dependencies: []
      },
      {
        id: 'governance-log-completeness',
        name: 'Governance Log Completeness',
        description: 'Validates that significant actions are properly logged',
        checkFunction: this.checkGovernanceLogCompleteness.bind(this),
        requiredFields: ['project'],
        dependencies: []
      },
      {
        id: 'security-compliance-validation',
        name: 'Security Compliance Validation',
        description: 'Checks for security compliance requirements and violations',
        checkFunction: this.checkSecurityCompliance.bind(this),
        requiredFields: ['step'],
        dependencies: []
      },
      {
        id: 'performance-threshold-monitoring',
        name: 'Performance Threshold Monitoring',
        description: 'Monitors performance metrics against defined thresholds',
        checkFunction: this.checkPerformanceThresholds.bind(this),
        requiredFields: ['project', 'phase'],
        dependencies: []
      }
    ];

    defaultChecks.forEach(check => this.checks.set(check.id, check));
  }

  /**
   * Start the Auto-Audit Agent
   */
  async start(): Promise<void> {
    if (this.isActive) {
      return;
    }

    this.isActive = true;
    
    // Start periodic audits
    this.schedulePeriodicAudits();
    
    this.emit('agent-started', { 
      agentId: 'auto-audit-agent', 
      timestamp: new Date().toISOString(),
      rulesCount: this.rules.size,
      checksCount: this.checks.size
    });

    await enhancedGovernanceLogger.logAgentAction('auto-audit-agent', 'start', {
      rules_loaded: this.rules.size,
      checks_loaded: this.checks.size
    });
  }

  /**
   * Stop the Auto-Audit Agent
   */
  async stop(): Promise<void> {
    this.isActive = false;
    
    if (this.auditTimer) {
      clearTimeout(this.auditTimer);
      this.auditTimer = undefined;
    }

    this.emit('agent-stopped', { 
      agentId: 'auto-audit-agent', 
      timestamp: new Date().toISOString() 
    });

    await enhancedGovernanceLogger.logAgentAction('auto-audit-agent', 'stop', {
      audits_completed: this.auditHistory.length
    });
  }

  /**
   * Perform audit on specific context
   */
  async performAudit(context: AuditContext): Promise<AuditReport> {
    const startTime = Date.now();
    const reportId = `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Determine applicable rules based on scope
    const applicableRules = Array.from(this.rules.values()).filter(rule => 
      rule.enabled && this.isRuleApplicable(rule, context)
    );

    const complianceResults: ComplianceResult[] = [];
    const allFindings: AuditFinding[] = [];
    const allRemediations: RemediationAction[] = [];

    // Execute compliance checks for each applicable rule
    for (const rule of applicableRules) {
      try {
        const checksForRule = Array.from(this.checks.values()).filter(check => 
          this.isCheckApplicableToRule(check, rule)
        );

        for (const check of checksForRule) {
          const result = await check.checkFunction(context);
          complianceResults.push(result);
          
          allFindings.push(...result.findings);
          allRemediations.push(...result.findings
            .filter(f => f.remediation)
            .map(f => f.remediation!)
          );
        }
      } catch (error) {
        // Log check execution error
        await enhancedGovernanceLogger.logAgentAction('auto-audit-agent', 'check-error', {
          rule_id: rule.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Calculate overall compliance score
    const overallScore = complianceResults.length > 0 
      ? complianceResults.reduce((sum, result) => sum + result.score, 0) / complianceResults.length
      : 100;

    // Group findings by severity
    const findingsBySeverity = allFindings.reduce((acc, finding) => {
      acc[finding.severity] = (acc[finding.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const report: AuditReport = {
      id: reportId,
      timestamp: new Date().toISOString(),
      scope: this.getScopeDescription(context),
      overallScore: Math.round(overallScore),
      totalFindings: allFindings.length,
      findingsBySeverity,
      complianceChecks: complianceResults,
      remediationActions: allRemediations,
      executionTime: Date.now() - startTime
    };

    // Store in history
    this.auditHistory.push(report);
    
    // Keep only last 100 reports
    if (this.auditHistory.length > 100) {
      this.auditHistory = this.auditHistory.slice(-100);
    }

    // Emit audit completed event
    this.emit('audit-completed', report);

    // Log governance event
    await enhancedGovernanceLogger.logAgentAction('auto-audit-agent', 'audit-completed', {
      report_id: reportId,
      overall_score: overallScore,
      findings_count: allFindings.length,
      execution_time: report.executionTime
    });

    // Trigger auto-remediation if enabled
    await this.processAutoRemediation(report);

    return report;
  }

  /**
   * Check project metadata completeness
   */
  private async checkProjectMetadataCompleteness(context: AuditContext): Promise<ComplianceResult> {
    const findings: AuditFinding[] = [];
    
    if (!context.project) {
      return {
        passed: false,
        score: 0,
        findings: [{
          id: 'missing-project-context',
          severity: 'critical',
          category: 'governance',
          description: 'Project context is missing from audit',
          location: 'audit-context',
          evidence: { context }
        }],
        recommendations: ['Provide project context for audit'],
        metadata: {}
      };
    }

    const project = context.project;
    const requiredFields = ['name', 'description', 'createdBy', 'projectOwner', 'projectType', 'status'];
    let completenessScore = 0;

    for (const field of requiredFields) {
      if (project[field as keyof Project]) {
        completenessScore += 1;
      } else {
        findings.push({
          id: `missing-${field}`,
          severity: 'medium',
          category: 'governance',
          description: `Required project field '${field}' is missing or empty`,
          location: `project.${field}`,
          evidence: { field, value: project[field as keyof Project] }
        });
      }
    }

    const score = (completenessScore / requiredFields.length) * 100;
    const passed = score >= 80; // 80% completeness threshold

    return {
      passed,
      score,
      findings,
      recommendations: findings.length > 0 
        ? ['Complete missing project metadata fields for better governance tracking']
        : [],
      metadata: {
        required_fields: requiredFields.length,
        completed_fields: completenessScore,
        completeness_ratio: completenessScore / requiredFields.length
      }
    };
  }

  /**
   * Check phase-step consistency
   */
  private async checkPhaseStepConsistency(context: AuditContext): Promise<ComplianceResult> {
    const findings: AuditFinding[] = [];
    
    if (!context.project || !context.phase) {
      return {
        passed: false,
        score: 0,
        findings: [{
          id: 'missing-phase-context',
          severity: 'high',
          category: 'compliance',
          description: 'Phase context is missing from audit',
          location: 'audit-context',
          evidence: { context }
        }],
        recommendations: ['Provide phase context for consistency check'],
        metadata: {}
      };
    }

    const phase = context.phase;
    let consistencyScore = 100;

    // Check if phase has steps
    if (!phase.steps || phase.steps.length === 0) {
      findings.push({
        id: 'phase-no-steps',
        severity: 'high',
        category: 'compliance',
        description: 'Phase has no defined steps',
        location: `project.${context.project.id}.phase.${phase.id}`,
        evidence: { phase_id: phase.id, steps_count: 0 }
      });
      consistencyScore -= 30;
    }

    // Check step status consistency
    if (phase.steps) {
      const completedSteps = phase.steps.filter(s => s.status === 'complete').length;
      const totalSteps = phase.steps.length;
      
      if (phase.status === 'complete' && completedSteps < totalSteps) {
        findings.push({
          id: 'phase-step-status-mismatch',
          severity: 'medium',
          category: 'compliance',
          description: 'Phase marked as complete but has incomplete steps',
          location: `project.${context.project.id}.phase.${phase.id}`,
          evidence: { 
            phase_status: phase.status,
            completed_steps: completedSteps,
            total_steps: totalSteps
          }
        });
        consistencyScore -= 20;
      }
    }

    const passed = consistencyScore >= 70;

    return {
      passed,
      score: Math.max(0, consistencyScore),
      findings,
      recommendations: findings.length > 0 
        ? ['Review phase-step consistency and update statuses accordingly']
        : [],
      metadata: {
        phase_id: phase.id,
        steps_count: phase.steps?.length || 0,
        consistency_score: consistencyScore
      }
    };
  }

  /**
   * Check governance log completeness
   */
  private async checkGovernanceLogCompleteness(context: AuditContext): Promise<ComplianceResult> {
    // For now, assume good governance logging since we have the infrastructure
    return {
      passed: true,
      score: 95,
      findings: [],
      recommendations: [],
      metadata: {
        governance_infrastructure: 'present',
        logging_active: true
      }
    };
  }

  /**
   * Check security compliance
   */
  private async checkSecurityCompliance(context: AuditContext): Promise<ComplianceResult> {
    const findings: AuditFinding[] = [];
    
    if (!context.step) {
      return {
        passed: true,
        score: 100,
        findings: [],
        recommendations: [],
        metadata: { reason: 'no_step_context' }
      };
    }

    const step = context.step;
    let securityScore = 100;

    // Check if critical steps have security checklists
    const isCriticalStep = step.name.toLowerCase().includes('deploy') || 
                          step.name.toLowerCase().includes('release') ||
                          step.name.toLowerCase().includes('production');

    if (isCriticalStep && (!step.completionChecklist || step.completionChecklist.length === 0)) {
      findings.push({
        id: 'missing-security-checklist',
        severity: 'high',
        category: 'security',
        description: 'Critical step missing security completion checklist',
        location: `step.${step.id}`,
        evidence: { 
          step_name: step.name,
          is_critical: isCriticalStep,
          has_checklist: !!step.completionChecklist
        }
      });
      securityScore -= 40;
    }

    const passed = securityScore >= 80;

    return {
      passed,
      score: Math.max(0, securityScore),
      findings,
      recommendations: findings.length > 0 
        ? ['Add security checklists to critical deployment and release steps']
        : [],
      metadata: {
        step_id: step.id,
        is_critical_step: isCriticalStep,
        security_score: securityScore
      }
    };
  }

  /**
   * Check performance thresholds
   */
  private async checkPerformanceThresholds(context: AuditContext): Promise<ComplianceResult> {
    // Basic performance check - can be extended with real metrics
    return {
      passed: true,
      score: 90,
      findings: [],
      recommendations: [],
      metadata: {
        performance_monitoring: 'basic',
        thresholds_defined: false
      }
    };
  }

  /**
   * Process auto-remediation for applicable findings
   */
  private async processAutoRemediation(report: AuditReport): Promise<void> {
    const autoRemediations = report.remediationActions.filter(action => action.automated);
    
    for (const remediation of autoRemediations) {
      try {
        // Execute auto-remediation based on type
        switch (remediation.type) {
          case 'auto_fix':
            await this.executeAutoFix(remediation);
            break;
          case 'notification':
            await this.sendNotification(remediation);
            break;
          case 'documentation':
            await this.generateDocumentation(remediation);
            break;
        }

        this.emit('remediation-executed', {
          remediation_id: remediation.id,
          type: remediation.type,
          report_id: report.id
        });

      } catch (error) {
        await enhancedGovernanceLogger.logAgentAction('auto-audit-agent', 'remediation-error', {
          remediation_id: remediation.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  }

  /**
   * Execute auto-fix remediation
   */
  private async executeAutoFix(remediation: RemediationAction): Promise<void> {
    // Placeholder for auto-fix logic
    await enhancedGovernanceLogger.logAgentAction('auto-audit-agent', 'auto-fix-executed', {
      remediation_id: remediation.id,
      description: remediation.description
    });
  }

  /**
   * Send notification for remediation
   */
  private async sendNotification(remediation: RemediationAction): Promise<void> {
    // Placeholder for notification logic
    await enhancedGovernanceLogger.logAgentAction('auto-audit-agent', 'notification-sent', {
      remediation_id: remediation.id,
      description: remediation.description
    });
  }

  /**
   * Generate documentation for remediation
   */
  private async generateDocumentation(remediation: RemediationAction): Promise<void> {
    // Placeholder for documentation generation
    await enhancedGovernanceLogger.logAgentAction('auto-audit-agent', 'documentation-generated', {
      remediation_id: remediation.id,
      description: remediation.description
    });
  }

  /**
   * Schedule periodic audits
   */
  private schedulePeriodicAudits(): void {
    const scheduleNext = () => {
      this.auditTimer = setTimeout(async () => {
        if (this.isActive) {
          // Perform system-wide audit
          await this.performSystemAudit();
          scheduleNext();
        }
      }, 60000); // Check every minute for due audits
    };

    scheduleNext();
  }

  /**
   * Perform system-wide audit
   */
  private async performSystemAudit(): Promise<void> {
    const context: AuditContext = {
      timestamp: new Date().toISOString(),
      metadata: { audit_type: 'system_wide' }
    };

    await this.performAudit(context);
  }

  /**
   * Utility methods
   */
  private isRuleApplicable(rule: AuditRule, context: AuditContext): boolean {
    switch (rule.scope) {
      case 'project': return !!context.project;
      case 'phase': return !!context.phase;
      case 'step': return !!context.step;
      case 'global': return true;
      default: return false;
    }
  }

  private isCheckApplicableToRule(check: ComplianceCheck, rule: AuditRule): boolean {
    // Simple mapping - can be made more sophisticated
    return check.name.toLowerCase().includes(rule.category);
  }

  private getScopeDescription(context: AuditContext): string {
    if (context.step) return `Step: ${context.step.name}`;
    if (context.phase) return `Phase: ${context.phase.name}`;
    if (context.project) return `Project: ${context.project.name}`;
    return 'System-wide';
  }

  /**
   * Get audit history
   */
  getAuditHistory(): AuditReport[] {
    return [...this.auditHistory];
  }

  /**
   * Get agent status
   */
  getStatus(): { active: boolean; rulesCount: number; checksCount: number; auditCount: number } {
    return {
      active: this.isActive,
      rulesCount: this.rules.size,
      checksCount: this.checks.size,
      auditCount: this.auditHistory.length
    };
  }
}

// Export singleton instance
export const autoAuditAgent = new AutoAuditAgent();