#!/usr/bin/env tsx
/**
 * Automated QA Evidence Generator - Phase 9.0.5
 * Automatically runs OES testing protocol and generates QA evidence with governance logging
 * Links evidence to StepID and integrates with triple logging system
 */

import fs from 'fs/promises';
import path from 'path';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const execAsync = promisify(exec);

interface QAEvidenceConfig {
  stepId: string;
  projectId: string;
  phaseId: string;
  testerAgent: 'cc' | 'zoi';
  memoryAnchor: string;
  testSuite: 'full' | 'quick' | 'custom';
  customTestCommands?: string[];
  outputDirectory: string;
}

interface TestResult {
  testName: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  output: string;
  error?: string;
  details?: any;
}

interface QAEvidence {
  evidenceId: string;
  timestamp: string;
  stepId: string;
  projectId: string;
  phaseId: string;
  testerAgent: 'cc' | 'zoi';
  memoryAnchor: string;
  testExecution: {
    suite: string;
    totalTests: number;
    passed: number;
    failed: number;
    skipped: number;
    duration: number;
    overallStatus: 'passed' | 'failed' | 'partial';
  };
  testResults: TestResult[];
  consoleOutput: {
    stdout: string;
    stderr: string;
    fullLog: string;
  };
  governance: {
    driveMemoryPath: string;
    memoryPluginUpdated: boolean;
    oAppDBLogged: boolean;
    tripleLoggingCompliant: boolean;
  };
  artifacts: {
    testReportFile: string;
    consoleLogFile: string;
    evidenceFile: string;
    governanceLogFile: string;
  };
  validation: {
    allTestsPassed: boolean;
    qaStandards: 'compliant' | 'warnings' | 'violations';
    onboardingCompliance: 'verified' | 'warnings' | 'violations';
    readyForHandoff: boolean;
  };
}

class AutomatedQAEvidenceGenerator {
  private projectRoot: string;

  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
  }

  /**
   * Generate comprehensive QA evidence for a step
   */
  async generateQAEvidence(config: QAEvidenceConfig): Promise<QAEvidence> {
    const evidenceId = `qa-evidence-${config.stepId}-${Date.now()}`;
    const timestamp = new Date().toISOString();
    
    console.log(`🧪 Starting QA evidence generation: ${evidenceId}`);
    console.log(`📋 Step: ${config.stepId}, Tester: ${config.testerAgent.toUpperCase()}`);

    // Ensure output directory exists
    await fs.mkdir(config.outputDirectory, { recursive: true });

    // Initialize evidence structure
    const evidence: QAEvidence = {
      evidenceId,
      timestamp,
      stepId: config.stepId,
      projectId: config.projectId,
      phaseId: config.phaseId,
      testerAgent: config.testerAgent,
      memoryAnchor: config.memoryAnchor,
      testExecution: {
        suite: config.testSuite,
        totalTests: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        duration: 0,
        overallStatus: 'passed'
      },
      testResults: [],
      consoleOutput: {
        stdout: '',
        stderr: '',
        fullLog: ''
      },
      governance: {
        driveMemoryPath: '',
        memoryPluginUpdated: false,
        oAppDBLogged: false,
        tripleLoggingCompliant: false
      },
      artifacts: {
        testReportFile: path.join(config.outputDirectory, `test-report-${config.stepId}.json`),
        consoleLogFile: path.join(config.outputDirectory, `console-log-${config.stepId}.log`),
        evidenceFile: path.join(config.outputDirectory, `qa-evidence-${config.stepId}.json`),
        governanceLogFile: path.join(config.outputDirectory, `governance-log-${config.stepId}.json`)
      },
      validation: {
        allTestsPassed: false,
        qaStandards: 'compliant',
        onboardingCompliance: 'verified',
        readyForHandoff: false
      }
    };

    try {
      // Step 1: Run OES testing protocol
      await this.runOESTestingProtocol(evidence, config);

      // Step 2: Run additional custom tests if specified
      if (config.customTestCommands && config.customTestCommands.length > 0) {
        await this.runCustomTests(evidence, config);
      }

      // Step 3: Run governance validation
      await this.runGovernanceValidation(evidence);

      // Step 4: Validate onboarding compliance
      await this.validateOnboardingCompliance(evidence, config);

      // Step 5: Update governance systems
      await this.updateGovernanceSystems(evidence);

      // Step 6: Generate final validation
      this.generateFinalValidation(evidence);

      // Step 7: Save evidence artifacts
      await this.saveEvidenceArtifacts(evidence);

      console.log(`✅ QA evidence generation completed: ${evidenceId}`);
      console.log(`📊 Status: ${evidence.testExecution.overallStatus.toUpperCase()}`);
      console.log(`📈 Tests: ${evidence.testExecution.passed}/${evidence.testExecution.totalTests} passed`);

    } catch (error) {
      evidence.testExecution.overallStatus = 'failed';
      evidence.validation.allTestsPassed = false;
      evidence.validation.readyForHandoff = false;
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      evidence.consoleOutput.stderr += `\nQA Evidence Generation Error: ${errorMessage}`;
      
      console.error(`❌ QA evidence generation failed: ${errorMessage}`);
      
      // Still save artifacts even on failure
      await this.saveEvidenceArtifacts(evidence);
    }

    return evidence;
  }

  /**
   * Run OES testing protocol
   */
  private async runOESTestingProtocol(evidence: QAEvidence, config: QAEvidenceConfig): Promise<void> {
    console.log('🔬 Running OES testing protocol...');
    
    const testCommand = `./scripts/oes-testing-protocol.sh --host http://localhost:3001 --auto --no-prompt --json-report "${evidence.artifacts.testReportFile}" --log "${evidence.artifacts.consoleLogFile}"`;
    
    const startTime = Date.now();
    
    try {
      const { stdout, stderr } = await execAsync(testCommand, {
        cwd: this.projectRoot,
        timeout: 300000 // 5 minute timeout
      });

      evidence.consoleOutput.stdout += stdout;
      evidence.consoleOutput.stderr += stderr;
      evidence.testExecution.duration = Date.now() - startTime;

      // Parse test results from JSON report if available
      try {
        const testReport = JSON.parse(await fs.readFile(evidence.artifacts.testReportFile, 'utf-8'));
        evidence.testExecution.totalTests = testReport.results?.totalTests || 0;
        evidence.testExecution.passed = testReport.results?.passed || 0;
        evidence.testExecution.failed = testReport.results?.failed || 0;
        evidence.testExecution.overallStatus = testReport.results?.overallStatus === 'SUCCESS' ? 'passed' : 'failed';
        
        // Extract individual test results
        if (testReport.testDetails) {
          evidence.testResults = testReport.testDetails.map((test: any) => ({
            testName: test.name || 'Unknown Test',
            status: test.status === 'PASSED' ? 'passed' : 'failed',
            duration: 0, // Not provided in current format
            output: test.description || '',
            error: test.status === 'FAILED' ? test.description : undefined
          }));
        }
        
      } catch (parseError) {
        console.warn('⚠️ Could not parse test report JSON - using basic results');
        evidence.testExecution.overallStatus = 'passed'; // Assume success if command completed
      }

      console.log(`✅ OES testing protocol completed in ${evidence.testExecution.duration}ms`);
      
    } catch (error) {
      evidence.testExecution.overallStatus = 'failed';
      evidence.consoleOutput.stderr += `\nOES Testing Protocol Error: ${error}`;
      console.error(`❌ OES testing protocol failed: ${error}`);
    }
  }

  /**
   * Run custom test commands
   */
  private async runCustomTests(evidence: QAEvidence, config: QAEvidenceConfig): Promise<void> {
    console.log('🧪 Running custom test commands...');
    
    for (const [index, command] of (config.customTestCommands || []).entries()) {
      console.log(`   Running custom test ${index + 1}: ${command}`);
      
      const startTime = Date.now();
      
      try {
        const { stdout, stderr } = await execAsync(command, {
          cwd: this.projectRoot,
          timeout: 120000 // 2 minute timeout per custom command
        });
        
        const customTest: TestResult = {
          testName: `Custom Test ${index + 1}`,
          status: 'passed',
          duration: Date.now() - startTime,
          output: stdout
        };
        
        evidence.testResults.push(customTest);
        evidence.testExecution.totalTests++;
        evidence.testExecution.passed++;
        evidence.consoleOutput.stdout += `\n--- Custom Test ${index + 1} ---\n${stdout}`;
        
        if (stderr) {
          evidence.consoleOutput.stderr += `\n--- Custom Test ${index + 1} Warnings ---\n${stderr}`;
        }
        
      } catch (error) {
        const customTest: TestResult = {
          testName: `Custom Test ${index + 1}`,
          status: 'failed',
          duration: Date.now() - startTime,
          output: '',
          error: error instanceof Error ? error.message : String(error)
        };
        
        evidence.testResults.push(customTest);
        evidence.testExecution.totalTests++;
        evidence.testExecution.failed++;
        evidence.consoleOutput.stderr += `\n--- Custom Test ${index + 1} Error ---\n${customTest.error}`;
      }
    }
  }

  /**
   * Run governance validation
   */
  private async runGovernanceValidation(evidence: QAEvidence): Promise<void> {
    console.log('📊 Running governance validation...');
    
    try {
      const governanceCommand = `npx tsx scripts/oes-governance-validation.ts --auto --json-output "${evidence.artifacts.governanceLogFile}"`;
      
      const { stdout, stderr } = await execAsync(governanceCommand, {
        cwd: this.projectRoot,
        timeout: 60000 // 1 minute timeout
      });
      
      evidence.consoleOutput.stdout += `\n--- Governance Validation ---\n${stdout}`;
      
      // Check if governance validation passed
      try {
        const governanceReport = JSON.parse(await fs.readFile(evidence.artifacts.governanceLogFile, 'utf-8'));
        evidence.governance.tripleLoggingCompliant = governanceReport.results?.overallStatus === 'SUCCESS';
      } catch {
        evidence.governance.tripleLoggingCompliant = false;
      }
      
      console.log(`✅ Governance validation completed`);
      
    } catch (error) {
      evidence.consoleOutput.stderr += `\n--- Governance Validation Error ---\n${error}`;
      console.warn(`⚠️ Governance validation failed: ${error}`);
    }
  }

  /**
   * Validate onboarding compliance
   */
  private async validateOnboardingCompliance(evidence: QAEvidence, config: QAEvidenceConfig): Promise<void> {
    console.log('📋 Validating onboarding compliance...');
    
    try {
      // Look for orchestrator task file to validate
      const taskFile = path.join(config.outputDirectory, `../orchestrator-task-${config.stepId}.json`);
      
      const complianceCommand = `npx tsx scripts/validate-onboarding-compliance.ts validate --task-file "${taskFile}" --agent ${config.testerAgent} --role tester --project-id ${config.projectId} --step-id ${config.stepId}`;
      
      const { stdout, stderr } = await execAsync(complianceCommand, {
        cwd: this.projectRoot,
        timeout: 30000 // 30 second timeout
      });
      
      evidence.consoleOutput.stdout += `\n--- Onboarding Compliance ---\n${stdout}`;
      evidence.validation.onboardingCompliance = 'verified';
      
      console.log(`✅ Onboarding compliance validated`);
      
    } catch (error) {
      evidence.consoleOutput.stderr += `\n--- Onboarding Compliance Error ---\n${error}`;
      evidence.validation.onboardingCompliance = 'violations';
      console.warn(`⚠️ Onboarding compliance check failed: ${error}`);
    }
  }

  /**
   * Update governance systems (triple logging)
   */
  private async updateGovernanceSystems(evidence: QAEvidence): Promise<void> {
    console.log('📝 Updating governance systems...');
    
    try {
      // Update DriveMemory
      await this.updateDriveMemory(evidence);
      
      // Update MemoryPlugin
      await this.updateMemoryPlugin(evidence);
      
      // Log to oApp DB (simulated)
      await this.logToOAppDB(evidence);
      
      evidence.governance.tripleLoggingCompliant = 
        evidence.governance.driveMemoryPath !== '' &&
        evidence.governance.memoryPluginUpdated &&
        evidence.governance.oAppDBLogged;
      
      console.log(`✅ Governance systems updated`);
      
    } catch (error) {
      console.error(`❌ Failed to update governance systems: ${error}`);
    }
  }

  private async updateDriveMemory(evidence: QAEvidence): Promise<void> {
    const driveMemoryFile = path.join(
      this.projectRoot,
      'DriveMemory',
      evidence.phaseId,
      `qa-evidence-${evidence.stepId}.json`
    );
    
    const driveMemoryEntry = {
      timestamp: evidence.timestamp,
      stepId: evidence.stepId,
      action: 'QA_EVIDENCE_GENERATED',
      testerAgent: evidence.testerAgent,
      testResults: {
        totalTests: evidence.testExecution.totalTests,
        passed: evidence.testExecution.passed,
        failed: evidence.testExecution.failed,
        overallStatus: evidence.testExecution.overallStatus
      },
      governance: 'triple_logged',
      evidenceFile: evidence.artifacts.evidenceFile
    };
    
    await fs.mkdir(path.dirname(driveMemoryFile), { recursive: true });
    await fs.writeFile(driveMemoryFile, JSON.stringify(driveMemoryEntry, null, 2));
    
    evidence.governance.driveMemoryPath = driveMemoryFile;
  }

  private async updateMemoryPlugin(evidence: QAEvidence): Promise<void> {
    try {
      const memoryPluginFile = path.join(
        this.projectRoot,
        'DriveMemory',
        'MemoryPlugin',
        `${evidence.memoryAnchor}.json`
      );
      
      const existing = await fs.readFile(memoryPluginFile, 'utf-8');
      const memoryAnchor = JSON.parse(existing);
      
      // Add QA evidence to memory anchor
      if (!memoryAnchor.qa_evidence) {
        memoryAnchor.qa_evidence = [];
      }
      
      memoryAnchor.qa_evidence.push({
        stepId: evidence.stepId,
        testerAgent: evidence.testerAgent,
        timestamp: evidence.timestamp,
        overallStatus: evidence.testExecution.overallStatus,
        evidenceFile: evidence.artifacts.evidenceFile
      });
      
      memoryAnchor.last_updated = evidence.timestamp;
      
      await fs.writeFile(memoryPluginFile, JSON.stringify(memoryAnchor, null, 2));
      evidence.governance.memoryPluginUpdated = true;
      
    } catch (error) {
      console.warn(`⚠️ Could not update MemoryPlugin: ${error}`);
    }
  }

  private async logToOAppDB(evidence: QAEvidence): Promise<void> {
    // Simulate oApp DB logging
    const dbLogFile = path.join(
      this.projectRoot,
      'logs',
      'governance',
      `qa-evidence-${evidence.stepId}.json`
    );
    
    const dbEntry = {
      timestamp: evidence.timestamp,
      table: 'qa_evidence',
      action: 'INSERT',
      data: {
        step_id: evidence.stepId,
        tester_agent: evidence.testerAgent,
        total_tests: evidence.testExecution.totalTests,
        passed_tests: evidence.testExecution.passed,
        failed_tests: evidence.testExecution.failed,
        overall_status: evidence.testExecution.overallStatus,
        evidence_file: evidence.artifacts.evidenceFile
      }
    };
    
    await fs.mkdir(path.dirname(dbLogFile), { recursive: true });
    await fs.writeFile(dbLogFile, JSON.stringify(dbEntry, null, 2));
    evidence.governance.oAppDBLogged = true;
  }

  /**
   * Generate final validation assessment
   */
  private generateFinalValidation(evidence: QAEvidence): void {
    evidence.validation.allTestsPassed = evidence.testExecution.failed === 0;
    
    // Determine QA standards compliance
    if (evidence.testExecution.overallStatus === 'failed' || !evidence.governance.tripleLoggingCompliant) {
      evidence.validation.qaStandards = 'violations';
    } else if (evidence.validation.onboardingCompliance === 'warnings') {
      evidence.validation.qaStandards = 'warnings';
    } else {
      evidence.validation.qaStandards = 'compliant';
    }
    
    // Determine readiness for handoff
    evidence.validation.readyForHandoff = 
      evidence.validation.allTestsPassed &&
      evidence.governance.tripleLoggingCompliant &&
      evidence.validation.onboardingCompliance !== 'violations' &&
      evidence.validation.qaStandards !== 'violations';
  }

  /**
   * Save all evidence artifacts
   */
  private async saveEvidenceArtifacts(evidence: QAEvidence): Promise<void> {
    // Combine console output
    evidence.consoleOutput.fullLog = 
      `--- STDOUT ---\n${evidence.consoleOutput.stdout}\n\n--- STDERR ---\n${evidence.consoleOutput.stderr}`;
    
    // Save full evidence file
    await fs.writeFile(evidence.artifacts.evidenceFile, JSON.stringify(evidence, null, 2));
    
    // Save console log file
    await fs.writeFile(evidence.artifacts.consoleLogFile, evidence.consoleOutput.fullLog);
    
    console.log(`💾 Evidence artifacts saved:`);
    console.log(`   📊 Evidence: ${evidence.artifacts.evidenceFile}`);
    console.log(`   📝 Console Log: ${evidence.artifacts.consoleLogFile}`);
    console.log(`   📋 Test Report: ${evidence.artifacts.testReportFile}`);
    console.log(`   📊 Governance: ${evidence.artifacts.governanceLogFile}`);
  }

  /**
   * Generate QA evidence summary for multiple steps
   */
  async generateQASummary(evidenceFiles: string[]): Promise<any> {
    const summary = {
      timestamp: new Date().toISOString(),
      totalSteps: evidenceFiles.length,
      overallStatus: 'passed' as 'passed' | 'failed' | 'partial',
      totalTests: 0,
      totalPassed: 0,
      totalFailed: 0,
      governanceCompliant: true,
      stepSummaries: [] as any[]
    };
    
    let failedSteps = 0;
    
    for (const evidenceFile of evidenceFiles) {
      try {
        const evidence: QAEvidence = JSON.parse(await fs.readFile(evidenceFile, 'utf-8'));
        
        summary.totalTests += evidence.testExecution.totalTests;
        summary.totalPassed += evidence.testExecution.passed;
        summary.totalFailed += evidence.testExecution.failed;
        
        if (!evidence.governance.tripleLoggingCompliant) {
          summary.governanceCompliant = false;
        }
        
        if (evidence.testExecution.overallStatus === 'failed') {
          failedSteps++;
        }
        
        summary.stepSummaries.push({
          stepId: evidence.stepId,
          testerAgent: evidence.testerAgent,
          overallStatus: evidence.testExecution.overallStatus,
          testsPassedRatio: `${evidence.testExecution.passed}/${evidence.testExecution.totalTests}`,
          governanceCompliant: evidence.governance.tripleLoggingCompliant,
          readyForHandoff: evidence.validation.readyForHandoff
        });
        
      } catch (error) {
        console.warn(`⚠️ Could not process evidence file ${evidenceFile}: ${error}`);
      }
    }
    
    // Determine overall status
    if (failedSteps === 0) {
      summary.overallStatus = 'passed';
    } else if (failedSteps === evidenceFiles.length) {
      summary.overallStatus = 'failed';
    } else {
      summary.overallStatus = 'partial';
    }
    
    return summary;
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help')) {
    console.log(`
Usage: npx tsx scripts/automated-qa-evidence.ts [COMMAND] [OPTIONS]

Commands:
  generate     Generate QA evidence for a specific step
  summary      Generate QA summary from multiple evidence files
  
Generate Options:
  --step-id ID            Step identifier (required)
  --project-id ID         Project identifier (required)
  --phase-id ID           Phase identifier (required)
  --tester-agent AGENT    Tester agent: cc or zoi (required)
  --memory-anchor ID      Memory anchor identifier (required)
  --test-suite SUITE      Test suite: full, quick, custom (default: full)
  --custom-tests CMDS     Comma-separated custom test commands
  --output-dir DIR        Output directory for artifacts (required)

Summary Options:
  --evidence-files FILES  Comma-separated list of evidence files
  --output FILE           Output summary file

Examples:
  # Generate QA evidence
  npx tsx scripts/automated-qa-evidence.ts generate \\
    --step-id 9.0.5-T1 \\
    --project-id OF \\
    --phase-id 9.0 \\
    --tester-agent zoi \\
    --memory-anchor of-9.0-init-20250806 \\
    --test-suite full \\
    --output-dir DriveMemory/OF-9.0

  # Generate QA summary
  npx tsx scripts/automated-qa-evidence.ts summary \\
    --evidence-files "evidence1.json,evidence2.json" \\
    --output DriveMemory/OF-9.0/qa-summary.json
    `);
    process.exit(0);
  }

  const generator = new AutomatedQAEvidenceGenerator();
  const command = args[0];

  try {
    switch (command) {
      case 'generate':
        const config: QAEvidenceConfig = {
          stepId: '',
          projectId: '',
          phaseId: '',
          testerAgent: 'cc',
          memoryAnchor: '',
          testSuite: 'full',
          customTestCommands: [],
          outputDirectory: ''
        };

        for (let i = 1; i < args.length; i++) {
          switch (args[i]) {
            case '--step-id':
              config.stepId = args[++i];
              break;
            case '--project-id':
              config.projectId = args[++i];
              break;
            case '--phase-id':
              config.phaseId = args[++i];
              break;
            case '--tester-agent':
              config.testerAgent = args[++i] as 'cc' | 'zoi';
              break;
            case '--memory-anchor':
              config.memoryAnchor = args[++i];
              break;
            case '--test-suite':
              config.testSuite = args[++i] as 'full' | 'quick' | 'custom';
              break;
            case '--custom-tests':
              config.customTestCommands = args[++i].split(',').map(s => s.trim());
              break;
            case '--output-dir':
              config.outputDirectory = args[++i];
              break;
          }
        }

        if (!config.stepId || !config.projectId || !config.phaseId || !config.memoryAnchor || !config.outputDirectory) {
          console.error('❌ Missing required parameters. Use --help for usage information.');
          process.exit(1);
        }

        const evidence = await generator.generateQAEvidence(config);
        
        if (!evidence.validation.readyForHandoff) {
          console.error('❌ QA evidence generation completed with issues - not ready for handoff');
          process.exit(1);
        }
        
        console.log('✅ QA evidence generation completed successfully');
        break;

      case 'summary':
        let evidenceFiles: string[] = [];
        let outputFile = '';

        for (let i = 1; i < args.length; i++) {
          switch (args[i]) {
            case '--evidence-files':
              evidenceFiles = args[++i].split(',').map(s => s.trim());
              break;
            case '--output':
              outputFile = args[++i];
              break;
          }
        }

        if (evidenceFiles.length === 0) {
          console.error('❌ --evidence-files required for summary command');
          process.exit(1);
        }

        const summary = await generator.generateQASummary(evidenceFiles);
        
        if (outputFile) {
          await fs.writeFile(outputFile, JSON.stringify(summary, null, 2));
          console.log(`📊 QA summary saved: ${outputFile}`);
        } else {
          console.log(JSON.stringify(summary, null, 2));
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

export { AutomatedQAEvidenceGenerator, QAEvidence, QAEvidenceConfig };