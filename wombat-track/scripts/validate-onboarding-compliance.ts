#!/usr/bin/env tsx
/**
 * Onboarding Manual Compliance Validator - Phase 9.0.5
 * Enforces that coding/testing actions reference onboarding manuals
 * Flags governance warnings if manuals not properly referenced
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface ComplianceRule {
  ruleId: string;
  description: string;
  severity: 'error' | 'warning' | 'info';
  requiredPatterns: string[];
  forbiddenPatterns: string[];
  applicableRoles: ('coder' | 'tester' | 'both')[];
}

interface ComplianceViolation {
  ruleId: string;
  severity: 'error' | 'warning' | 'info';
  description: string;
  details: string;
  file?: string;
  line?: number;
  context?: string;
}

interface ComplianceReport {
  timestamp: string;
  projectId: string;
  stepId: string;
  agent: 'cc' | 'zoi';
  role: 'coder' | 'tester';
  onboardingManualPath: string;
  compliance: {
    overallStatus: 'compliant' | 'warnings' | 'violations';
    totalChecks: number;
    passed: number;
    warnings: number;
    errors: number;
  };
  violations: ComplianceViolation[];
  governance: {
    manualReferenced: boolean;
    complianceLogged: boolean;
    evidenceGenerated: boolean;
  };
  recommendations: string[];
}

class OnboardingComplianceValidator {
  private projectRoot: string;
  private complianceRules: ComplianceRule[];

  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.complianceRules = this.initializeComplianceRules();
  }

  private initializeComplianceRules(): ComplianceRule[] {
    return [
      {
        ruleId: 'MANUAL_REFERENCE_REQUIRED',
        description: 'Onboarding manual must be referenced in orchestrator tasks',
        severity: 'error',
        requiredPatterns: [
          'onboarding manual',
          'CC.md',
          'Zoi.md',
          'reference.*manual',
          'manual.*compliance'
        ],
        forbiddenPatterns: [],
        applicableRoles: ['both']
      },
      {
        ruleId: 'ROLE_RESPONSIBILITIES_FOLLOWED',
        description: 'Actions must align with role-specific responsibilities',
        severity: 'warning',
        requiredPatterns: [
          'coder.*responsibility',
          'tester.*responsibility',
          'coding.*standards',
          'testing.*protocols'
        ],
        forbiddenPatterns: [],
        applicableRoles: ['both']
      },
      {
        ruleId: 'SECURITY_COMPLIANCE',
        description: 'Security requirements from manual must be followed',
        severity: 'error',
        requiredPatterns: [
          'security',
          'credentials',
          'validation',
          'sanitization'
        ],
        forbiddenPatterns: [
          'password.*log',
          'secret.*console',
          'api.*key.*print',
          'token.*debug'
        ],
        applicableRoles: ['both']
      },
      {
        ruleId: 'GOVERNANCE_COMPLIANCE',
        description: 'Governance requirements must be followed',
        severity: 'error',
        requiredPatterns: [
          'triple.*logging',
          'DriveMemory',
          'MemoryPlugin',
          'governance.*log',
          'memory.*anchor'
        ],
        forbiddenPatterns: [],
        applicableRoles: ['both']
      },
      {
        ruleId: 'QA_EVIDENCE_REQUIRED',
        description: 'QA evidence must be generated for testing role',
        severity: 'error',
        requiredPatterns: [
          'qa.*evidence',
          'test.*results',
          'oes-testing-protocol',
          'console.*output'
        ],
        forbiddenPatterns: [],
        applicableRoles: ['tester']
      },
      {
        ruleId: 'CODE_DOCUMENTATION',
        description: 'Code documentation standards must be followed',
        severity: 'warning',
        requiredPatterns: [
          'documentation',
          'comment',
          'JSDoc',
          'README'
        ],
        forbiddenPatterns: [],
        applicableRoles: ['coder']
      }
    ];
  }

  /**
   * Validate onboarding manual compliance for an orchestrator task
   */
  async validateOrchestratorCompliance(options: {
    taskFile: string;
    agent: 'cc' | 'zoi';
    role: 'coder' | 'tester';
    projectId: string;
    stepId: string;
    outputReport?: string;
  }): Promise<ComplianceReport> {

    const onboardingManualPath = path.join(
      this.projectRoot,
      'DriveMemory',
      'Onboarding',
      `${options.agent.toUpperCase()}.md`
    );

    // Read orchestrator task
    let taskContent = '';
    try {
      taskContent = await fs.readFile(options.taskFile, 'utf-8');
    } catch {
      throw new Error(`Orchestrator task file not found: ${options.taskFile}`);
    }

    // Read onboarding manual
    let manualContent = '';
    try {
      manualContent = await fs.readFile(onboardingManualPath, 'utf-8');
    } catch {
      throw new Error(`Onboarding manual not found: ${onboardingManualPath}`);
    }

    // Initialize report
    const report: ComplianceReport = {
      timestamp: new Date().toISOString(),
      projectId: options.projectId,
      stepId: options.stepId,
      agent: options.agent,
      role: options.role,
      onboardingManualPath,
      compliance: {
        overallStatus: 'compliant',
        totalChecks: 0,
        passed: 0,
        warnings: 0,
        errors: 0
      },
      violations: [],
      governance: {
        manualReferenced: false,
        complianceLogged: false,
        evidenceGenerated: false
      },
      recommendations: []
    };

    // Run compliance checks
    for (const rule of this.complianceRules) {
      if (this.isRuleApplicable(rule, options.role)) {
        await this.checkRule(rule, taskContent, manualContent, report);
      }
    }

    // Calculate overall compliance status
    if (report.compliance.errors > 0) {
      report.compliance.overallStatus = 'violations';
    } else if (report.compliance.warnings > 0) {
      report.compliance.overallStatus = 'warnings';
    }

    // Generate recommendations
    this.generateRecommendations(report);

    // Check manual reference
    report.governance.manualReferenced = this.checkManualReference(taskContent, options.agent);

    // Save report if requested
    if (options.outputReport) {
      await fs.mkdir(path.dirname(options.outputReport), { recursive: true });
      await fs.writeFile(options.outputReport, JSON.stringify(report, null, 2));
      console.log(`📋 Compliance report saved: ${options.outputReport}`);
    }

    // Log compliance status
    this.logComplianceStatus(report);

    return report;
  }

  private isRuleApplicable(rule: ComplianceRule, role: 'coder' | 'tester'): boolean {
    return rule.applicableRoles.includes('both') || rule.applicableRoles.includes(role);
  }

  private async checkRule(
    rule: ComplianceRule,
    taskContent: string,
    manualContent: string,
    report: ComplianceReport
  ): Promise<void> {
    
    report.compliance.totalChecks++;

    let ruleViolated = false;

    // Check required patterns
    for (const pattern of rule.requiredPatterns) {
      const regex = new RegExp(pattern, 'i');
      if (!regex.test(taskContent)) {
        const violation: ComplianceViolation = {
          ruleId: rule.ruleId,
          severity: rule.severity,
          description: rule.description,
          details: `Required pattern not found: ${pattern}`,
          context: 'orchestrator_task'
        };
        
        report.violations.push(violation);
        ruleViolated = true;
      }
    }

    // Check forbidden patterns
    for (const pattern of rule.forbiddenPatterns) {
      const regex = new RegExp(pattern, 'i');
      if (regex.test(taskContent)) {
        const violation: ComplianceViolation = {
          ruleId: rule.ruleId,
          severity: rule.severity,
          description: rule.description,
          details: `Forbidden pattern found: ${pattern}`,
          context: 'security_violation'
        };
        
        report.violations.push(violation);
        ruleViolated = true;
      }
    }

    // Update compliance counters
    if (ruleViolated) {
      if (rule.severity === 'error') {
        report.compliance.errors++;
      } else if (rule.severity === 'warning') {
        report.compliance.warnings++;
      }
    } else {
      report.compliance.passed++;
    }
  }

  private checkManualReference(taskContent: string, agent: 'cc' | 'zoi'): boolean {
    const manualPatterns = [
      `${agent.toLowerCase()}.md`,
      `${agent.toUpperCase()}.md`,
      'onboarding manual',
      'reference.*manual',
      'manual.*compliance'
    ];

    return manualPatterns.some(pattern => {
      const regex = new RegExp(pattern, 'i');
      return regex.test(taskContent);
    });
  }

  private generateRecommendations(report: ComplianceReport): void {
    if (!report.governance.manualReferenced) {
      report.recommendations.push(
        `Add explicit reference to onboarding manual (${report.agent.toUpperCase()}.md) in orchestrator task`
      );
    }

    if (report.compliance.errors > 0) {
      report.recommendations.push(
        'Address all compliance errors before proceeding with orchestrator execution'
      );
    }

    if (report.role === 'tester' && !this.hasQAEvidenceReference(report)) {
      report.recommendations.push(
        'Ensure QA evidence generation is included in testing responsibilities'
      );
    }

    if (report.role === 'coder' && !this.hasDocumentationReference(report)) {
      report.recommendations.push(
        'Include code documentation requirements in coding responsibilities'
      );
    }

    if (report.compliance.warnings > 0) {
      report.recommendations.push(
        'Consider addressing compliance warnings for optimal governance'
      );
    }
  }

  private hasQAEvidenceReference(report: ComplianceReport): boolean {
    return !report.violations.some(v => v.ruleId === 'QA_EVIDENCE_REQUIRED');
  }

  private hasDocumentationReference(report: ComplianceReport): boolean {
    return !report.violations.some(v => v.ruleId === 'CODE_DOCUMENTATION');
  }

  private logComplianceStatus(report: ComplianceReport): void {
    const agent = report.agent.toUpperCase();
    const role = report.role.toUpperCase();
    
    console.log(`\n📋 Onboarding Compliance Report: ${agent} as ${role}`);
    console.log(`📊 Status: ${report.compliance.overallStatus.toUpperCase()}`);
    console.log(`✅ Passed: ${report.compliance.passed}/${report.compliance.totalChecks}`);
    
    if (report.compliance.warnings > 0) {
      console.log(`⚠️ Warnings: ${report.compliance.warnings}`);
    }
    
    if (report.compliance.errors > 0) {
      console.log(`❌ Errors: ${report.compliance.errors}`);
    }

    if (report.governance.manualReferenced) {
      console.log(`✅ Onboarding manual properly referenced`);
    } else {
      console.log(`❌ Onboarding manual NOT referenced - governance violation`);
    }

    if (report.violations.length > 0) {
      console.log(`\n📝 Compliance Violations:`);
      report.violations.forEach((violation, index) => {
        const icon = violation.severity === 'error' ? '❌' : '⚠️';
        console.log(`   ${icon} ${violation.ruleId}: ${violation.details}`);
      });
    }

    if (report.recommendations.length > 0) {
      console.log(`\n💡 Recommendations:`);
      report.recommendations.forEach((rec, index) => {
        console.log(`   ${index + 1}. ${rec}`);
      });
    }
  }

  /**
   * Validate all orchestrator tasks in a directory
   */
  async validateAllTasks(tasksDirectory: string): Promise<ComplianceReport[]> {
    const reports: ComplianceReport[] = [];
    
    try {
      const files = await fs.readdir(tasksDirectory);
      const taskFiles = files.filter(f => f.startsWith('orchestrator-task-') && f.endsWith('.json'));
      
      for (const taskFile of taskFiles) {
        try {
          const taskPath = path.join(tasksDirectory, taskFile);
          const taskContent = JSON.parse(await fs.readFile(taskPath, 'utf-8'));
          
          // Extract task information
          const agent = taskContent.coder?.agent || 'cc';
          const role = taskContent.instruction?.context?.roleAssignment?.coder === agent ? 'coder' : 'tester';
          const projectId = taskContent.projectId || 'OF';
          const stepId = taskContent.stepId || 'unknown';
          
          const report = await this.validateOrchestratorCompliance({
            taskFile: taskPath,
            agent,
            role,
            projectId,
            stepId
          });
          
          reports.push(report);
          
        } catch (error) {
          console.error(`⚠️ Failed to validate task ${taskFile}: ${error}`);
        }
      }
      
    } catch (error) {
      console.error(`❌ Failed to read tasks directory: ${error}`);
    }
    
    return reports;
  }

  /**
   * Generate governance warning for non-compliant tasks
   */
  async generateGovernanceWarning(report: ComplianceReport): Promise<void> {
    if (report.compliance.overallStatus === 'compliant') {
      return; // No warning needed
    }

    const warningFile = path.join(
      this.projectRoot,
      'DriveMemory',
      'OF-9.0',
      `governance-warning-${report.stepId}.json`
    );

    const warning = {
      timestamp: new Date().toISOString(),
      warningType: 'ONBOARDING_COMPLIANCE_VIOLATION',
      stepId: report.stepId,
      agent: report.agent,
      role: report.role,
      severity: report.compliance.overallStatus,
      violations: report.violations,
      recommendations: report.recommendations,
      manualReferenced: report.governance.manualReferenced,
      resolution: {
        required: report.compliance.errors > 0,
        recommended: report.compliance.warnings > 0,
        actions: [
          'Review onboarding manual requirements',
          'Update orchestrator task documentation',
          'Re-validate compliance before execution'
        ]
      }
    };

    await fs.mkdir(path.dirname(warningFile), { recursive: true });
    await fs.writeFile(warningFile, JSON.stringify(warning, null, 2));
    
    console.log(`⚠️ Governance warning generated: ${warningFile}`);
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help')) {
    console.log(`
Usage: npx tsx scripts/validate-onboarding-compliance.ts [COMMAND] [OPTIONS]

Commands:
  validate     Validate compliance for a specific orchestrator task
  validate-all Validate all orchestrator tasks in a directory
  
Validate Options:
  --task-file FILE        Orchestrator task file (required)
  --agent AGENT          Agent: cc or zoi (required)
  --role ROLE            Role: coder or tester (required)
  --project-id ID        Project identifier (required)
  --step-id ID           Step identifier (required)
  --output FILE          Output compliance report file

Validate-All Options:
  --tasks-dir DIR        Directory containing orchestrator task files
  --output-dir DIR       Directory for compliance reports

Examples:
  # Validate specific task
  npx tsx scripts/validate-onboarding-compliance.ts validate \\
    --task-file DriveMemory/OF-9.0/orchestrator-task-9.0.5-T1.json \\
    --agent cc --role coder --project-id OF --step-id 9.0.5-T1 \\
    --output DriveMemory/OF-9.0/compliance-9.0.5-T1.json

  # Validate all tasks
  npx tsx scripts/validate-onboarding-compliance.ts validate-all \\
    --tasks-dir DriveMemory/OF-9.0 \\
    --output-dir DriveMemory/OF-9.0/compliance-reports
    `);
    process.exit(0);
  }

  const validator = new OnboardingComplianceValidator();
  const command = args[0];

  try {
    switch (command) {
      case 'validate':
        const options = {
          taskFile: '',
          agent: 'cc' as 'cc' | 'zoi',
          role: 'coder' as 'coder' | 'tester',
          projectId: '',
          stepId: '',
          outputReport: ''
        };

        for (let i = 1; i < args.length; i++) {
          switch (args[i]) {
            case '--task-file':
              options.taskFile = args[++i];
              break;
            case '--agent':
              options.agent = args[++i] as 'cc' | 'zoi';
              break;
            case '--role':
              options.role = args[++i] as 'coder' | 'tester';
              break;
            case '--project-id':
              options.projectId = args[++i];
              break;
            case '--step-id':
              options.stepId = args[++i];
              break;
            case '--output':
              options.outputReport = args[++i];
              break;
          }
        }

        if (!options.taskFile || !options.agent || !options.role || !options.projectId || !options.stepId) {
          console.error('❌ Missing required parameters. Use --help for usage information.');
          process.exit(1);
        }

        const report = await validator.validateOrchestratorCompliance(options);
        
        // Generate governance warning if needed
        if (report.compliance.overallStatus !== 'compliant') {
          await validator.generateGovernanceWarning(report);
        }

        // Exit with appropriate code
        if (report.compliance.errors > 0) {
          process.exit(1);
        } else if (report.compliance.warnings > 0) {
          process.exit(2);
        }
        break;

      case 'validate-all':
        let tasksDir = '';
        let outputDir = '';

        for (let i = 1; i < args.length; i++) {
          switch (args[i]) {
            case '--tasks-dir':
              tasksDir = args[++i];
              break;
            case '--output-dir':
              outputDir = args[++i];
              break;
          }
        }

        if (!tasksDir) {
          console.error('❌ --tasks-dir required for validate-all command');
          process.exit(1);
        }

        const reports = await validator.validateAllTasks(tasksDir);
        
        console.log(`\n📊 Compliance Summary: ${reports.length} tasks validated`);
        const compliant = reports.filter(r => r.compliance.overallStatus === 'compliant').length;
        const warnings = reports.filter(r => r.compliance.overallStatus === 'warnings').length;
        const violations = reports.filter(r => r.compliance.overallStatus === 'violations').length;
        
        console.log(`✅ Compliant: ${compliant}`);
        console.log(`⚠️ Warnings: ${warnings}`);
        console.log(`❌ Violations: ${violations}`);

        if (violations > 0) {
          process.exit(1);
        } else if (warnings > 0) {
          process.exit(2);
        }
        break;

      default:
        console.error(`❌ Unknown command: ${command}`);
        process.exit(1);
    }

  } catch (error) {
    console.error(`❌ Error: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { OnboardingComplianceValidator, ComplianceReport, ComplianceViolation };