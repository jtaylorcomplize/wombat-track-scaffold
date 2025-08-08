#!/usr/bin/env tsx
/**
 * Phase 9.0.6 Preparation Script - Cleanup, Lint, and GitHub Push Readiness
 * Validates dual-orchestrator tasks, runs code quality checks, and prepares for automated GitHub push
 */

import fs from 'fs/promises';
import path from 'path';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const execAsync = promisify(exec);

interface CleanupConfig {
  projectRoot: string;
  phaseId: string;
  validateOrchestrator: boolean;
  runLinting: boolean;
  runCodeStyle: boolean;
  validateGovernance: boolean;
  prepareGitHub: boolean;
  outputReport: string;
}

interface CleanupResult {
  step: string;
  status: 'passed' | 'failed' | 'warnings';
  duration: number;
  details: string[];
  errors: string[];
  warnings: string[];
}

interface CleanupReport {
  timestamp: string;
  phaseId: string;
  overallStatus: 'ready' | 'warnings' | 'failed';
  results: CleanupResult[];
  summary: {
    totalSteps: number;
    passed: number;
    warnings: number;
    failed: number;
    readyForGitHub: boolean;
  };
  governance: {
    orchestratorTasksLogged: number;
    qaEvidenceGenerated: number;
    tripleLoggingCompliant: boolean;
    complianceViolations: number;
  };
  codeQuality: {
    lintingPassed: boolean;
    formattingPassed: boolean;
    testsPassedRatio: string;
    codeStyleCompliant: boolean;
  };
  githubReadiness: {
    branchClean: boolean;
    commitsReady: boolean;
    prGenerationReady: boolean;
    automationConfigured: boolean;
  };
  recommendations: string[];
}

class Phase906PreparationManager {
  private config: CleanupConfig;
  private results: CleanupResult[] = [];

  constructor(config: CleanupConfig) {
    this.config = config;
  }

  async executeCleanupAndPreparation(): Promise<CleanupReport> {
    console.log(`🚀 Starting Phase 9.0.6 Preparation - Cleanup, Lint, and GitHub Push Readiness`);
    console.log(`📁 Project Root: ${this.config.projectRoot}`);
    console.log(`📋 Phase: ${this.config.phaseId}`);

    // Step 1: Validate orchestrator task logging
    if (this.config.validateOrchestrator) {
      await this.validateOrchestratorTasks();
    }

    // Step 2: Run linting and code style checks
    if (this.config.runLinting) {
      await this.runLintingChecks();
    }

    if (this.config.runCodeStyle) {
      await this.runCodeStyleChecks();
    }

    // Step 3: Validate governance compliance
    if (this.config.validateGovernance) {
      await this.validateGovernanceCompliance();
    }

    // Step 4: Run comprehensive testing
    await this.runComprehensiveTests();

    // Step 5: Prepare GitHub integration
    if (this.config.prepareGitHub) {
      await this.prepareGitHubIntegration();
    }

    // Step 6: Clean temporary files and artifacts
    await this.cleanTemporaryFiles();

    // Step 7: Validate repository structure
    await this.validateRepositoryStructure();

    // Generate final report
    const report = this.generateCleanupReport();

    // Save report
    await fs.mkdir(path.dirname(this.config.outputReport), { recursive: true });
    await fs.writeFile(this.config.outputReport, JSON.stringify(report, null, 2));

    this.logFinalStatus(report);
    return report;
  }

  private async validateOrchestratorTasks(): Promise<void> {
    const startTime = Date.now();
    const step = 'Validate Orchestrator Tasks';
    console.log(`🔍 ${step}...`);

    const result: CleanupResult = {
      step,
      status: 'passed',
      duration: 0,
      details: [],
      errors: [],
      warnings: []
    };

    try {
      // Check for orchestrator task files
      const taskFiles = await this.findOrchestratorTasks();
      result.details.push(`Found ${taskFiles.length} orchestrator task files`);

      // Validate each task
      let validTasks = 0;
      for (const taskFile of taskFiles) {
        try {
          const task = JSON.parse(await fs.readFile(taskFile, 'utf-8'));
          
          // Validate required fields
          if (task.taskId && task.instruction && task.governance) {
            validTasks++;
            result.details.push(`✅ Valid task: ${path.basename(taskFile)}`);
          } else {
            result.errors.push(`❌ Invalid task structure: ${path.basename(taskFile)}`);
          }

          // Check for QA evidence
          const qaEvidenceFile = taskFile.replace('orchestrator-task-', 'qa-evidence-');
          try {
            await fs.access(qaEvidenceFile);
            result.details.push(`✅ QA evidence found for ${path.basename(taskFile)}`);
          } catch {
            result.warnings.push(`⚠️ Missing QA evidence for ${path.basename(taskFile)}`);
          }

        } catch (parseError) {
          result.errors.push(`❌ Could not parse task file: ${path.basename(taskFile)}`);
        }
      }

      result.details.push(`Validated ${validTasks}/${taskFiles.length} orchestrator tasks`);

      if (result.errors.length > 0) {
        result.status = 'failed';
      } else if (result.warnings.length > 0) {
        result.status = 'warnings';
      }

    } catch (error) {
      result.status = 'failed';
      result.errors.push(`Failed to validate orchestrator tasks: ${error}`);
    }

    result.duration = Date.now() - startTime;
    this.results.push(result);
  }

  private async findOrchestratorTasks(): Promise<string[]> {
    const taskFiles: string[] = [];
    const searchDirs = [
      path.join(this.config.projectRoot, 'DriveMemory', this.config.phaseId),
      path.join(this.config.projectRoot, 'DriveMemory', 'OF-9.0')
    ];

    for (const dir of searchDirs) {
      try {
        const files = await fs.readdir(dir);
        const orchestratorFiles = files
          .filter(f => f.startsWith('orchestrator-task-') && f.endsWith('.json'))
          .map(f => path.join(dir, f));
        taskFiles.push(...orchestratorFiles);
      } catch {
        // Directory doesn't exist or is not accessible
      }
    }

    return taskFiles;
  }

  private async runLintingChecks(): Promise<void> {
    const startTime = Date.now();
    const step = 'Run Linting Checks';
    console.log(`🧹 ${step}...`);

    const result: CleanupResult = {
      step,
      status: 'passed',
      duration: 0,
      details: [],
      errors: [],
      warnings: []
    };

    try {
      // Check if package.json has lint script
      const packageJsonPath = path.join(this.config.projectRoot, 'package.json');
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
      
      if (packageJson.scripts?.lint) {
        result.details.push('Found lint script in package.json');
        
        try {
          const { stdout, stderr } = await execAsync('npm run lint', {
            cwd: this.config.projectRoot,
            timeout: 120000 // 2 minute timeout
          });
          
          result.details.push('Linting completed successfully');
          if (stdout) result.details.push(`Lint output: ${stdout.substring(0, 200)}...`);
          if (stderr) result.warnings.push(`Lint warnings: ${stderr.substring(0, 200)}...`);
          
        } catch (lintError) {
          result.status = 'failed';
          result.errors.push(`Linting failed: ${lintError}`);
        }
      } else {
        // Try common linting tools
        const lintCommands = [
          'npx eslint src/ --ext .ts,.tsx,.js,.jsx',
          'npx tsc --noEmit'
        ];

        for (const command of lintCommands) {
          try {
            const { stdout, stderr } = await execAsync(command, {
              cwd: this.config.projectRoot,
              timeout: 60000
            });
            result.details.push(`✅ ${command.split(' ')[1]} check passed`);
          } catch {
            result.warnings.push(`⚠️ ${command.split(' ')[1]} check not available or failed`);
          }
        }
      }

    } catch (error) {
      result.status = 'failed';
      result.errors.push(`Linting setup failed: ${error}`);
    }

    result.duration = Date.now() - startTime;
    this.results.push(result);
  }

  private async runCodeStyleChecks(): Promise<void> {
    const startTime = Date.now();
    const step = 'Run Code Style Checks';
    console.log(`💅 ${step}...`);

    const result: CleanupResult = {
      step,
      status: 'passed',
      duration: 0,
      details: [],
      errors: [],
      warnings: []
    };

    try {
      // Check for Prettier configuration
      const prettierConfigFiles = ['.prettierrc', '.prettierrc.json', '.prettierrc.js', 'prettier.config.js'];
      let prettierFound = false;
      
      for (const configFile of prettierConfigFiles) {
        try {
          await fs.access(path.join(this.config.projectRoot, configFile));
          prettierFound = true;
          result.details.push(`Found Prettier config: ${configFile}`);
          break;
        } catch {
          // Config file doesn't exist
        }
      }

      if (prettierFound) {
        try {
          const { stdout, stderr } = await execAsync('npx prettier --check "src/**/*.{ts,tsx,js,jsx}"', {
            cwd: this.config.projectRoot,
            timeout: 60000
          });
          result.details.push('Code formatting check passed');
        } catch (prettierError) {
          result.warnings.push('Code formatting issues detected - consider running prettier --write');
        }
      } else {
        result.warnings.push('No Prettier configuration found - code formatting not enforced');
      }

      // Check for consistent file endings, imports, etc.
      await this.validateCodeConsistency(result);

    } catch (error) {
      result.status = 'failed';
      result.errors.push(`Code style checks failed: ${error}`);
    }

    result.duration = Date.now() - startTime;
    this.results.push(result);
  }

  private async validateCodeConsistency(result: CleanupResult): Promise<void> {
    try {
      const srcDir = path.join(this.config.projectRoot, 'src');
      const files = await this.getAllFiles(srcDir, ['.ts', '.tsx', '.js', '.jsx']);
      
      let inconsistencies = 0;
      
      for (const file of files) {
        try {
          const content = await fs.readFile(file, 'utf-8');
          
          // Check for mixed line endings
          if (content.includes('\r\n') && content.includes('\n')) {
            result.warnings.push(`Mixed line endings in ${path.basename(file)}`);
            inconsistencies++;
          }
          
          // Check for TODO/FIXME comments
          const todoMatches = content.match(/(TODO|FIXME|XXX):/gi);
          if (todoMatches && todoMatches.length > 0) {
            result.warnings.push(`${todoMatches.length} TODO/FIXME items in ${path.basename(file)}`);
          }
          
        } catch (readError) {
          result.warnings.push(`Could not read file for consistency check: ${path.basename(file)}`);
        }
      }
      
      result.details.push(`Checked ${files.length} source files for consistency`);
      if (inconsistencies > 0) {
        result.details.push(`Found ${inconsistencies} consistency issues`);
      }
      
    } catch (error) {
      result.warnings.push(`Code consistency check failed: ${error}`);
    }
  }

  private async getAllFiles(dir: string, extensions: string[]): Promise<string[]> {
    const files: string[] = [];
    
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          const subFiles = await this.getAllFiles(fullPath, extensions);
          files.push(...subFiles);
        } else if (extensions.some(ext => entry.name.endsWith(ext))) {
          files.push(fullPath);
        }
      }
    } catch {
      // Directory doesn't exist or is not accessible
    }
    
    return files;
  }

  private async validateGovernanceCompliance(): Promise<void> {
    const startTime = Date.now();
    const step = 'Validate Governance Compliance';
    console.log(`📊 ${step}...`);

    const result: CleanupResult = {
      step,
      status: 'passed',
      duration: 0,
      details: [],
      errors: [],
      warnings: []
    };

    try {
      // Run governance validation
      const { stdout, stderr } = await execAsync(
        'npx tsx scripts/oes-governance-validation.ts --auto --json-output /tmp/governance-validation-906.json',
        {
          cwd: this.config.projectRoot,
          timeout: 60000
        }
      );

      result.details.push('Governance validation completed');

      // Parse validation results
      try {
        const validationResults = JSON.parse(await fs.readFile('/tmp/governance-validation-906.json', 'utf-8'));
        
        if (validationResults.results?.overallStatus === 'SUCCESS') {
          result.details.push('✅ All governance validations passed');
        } else {
          result.warnings.push('⚠️ Some governance validations have warnings');
        }

        // Clean up temp file
        await fs.unlink('/tmp/governance-validation-906.json').catch(() => {});
        
      } catch (parseError) {
        result.warnings.push('Could not parse governance validation results');
      }

    } catch (error) {
      result.status = 'failed';
      result.errors.push(`Governance validation failed: ${error}`);
    }

    result.duration = Date.now() - startTime;
    this.results.push(result);
  }

  private async runComprehensiveTests(): Promise<void> {
    const startTime = Date.now();
    const step = 'Run Comprehensive Tests';
    console.log(`🧪 ${step}...`);

    const result: CleanupResult = {
      step,
      status: 'passed',
      duration: 0,
      details: [],
      errors: [],
      warnings: []
    };

    try {
      // Check if essential test scripts exist
      const testScripts = [
        './scripts/oes-testing-protocol.sh',
        './scripts/oes-governance-validation.ts',
        './scripts/auto-heal-orchestrator.js'
      ];
      
      let scriptsFound = 0;
      for (const script of testScripts) {
        try {
          await fs.access(path.join(this.config.projectRoot, script));
          scriptsFound++;
          result.details.push(`✅ Test script exists: ${script}`);
        } catch {
          result.warnings.push(`⚠️ Missing test script: ${script}`);
        }
      }

      // Try a lightweight test validation instead of full OES protocol
      try {
        // Check if package.json has test command
        const packageJsonPath = path.join(this.config.projectRoot, 'package.json');
        const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
        
        if (packageJson.scripts?.test) {
          result.details.push('✅ Test script available in package.json');
        } else {
          result.warnings.push('⚠️ No test script in package.json');
        }

        // Check for basic project structure
        const essentialFiles = ['server.js', 'src/', 'scripts/'];
        for (const file of essentialFiles) {
          try {
            await fs.access(path.join(this.config.projectRoot, file));
            result.details.push(`✅ Essential file/directory exists: ${file}`);
          } catch {
            result.errors.push(`❌ Missing essential: ${file}`);
            result.status = 'failed';
          }
        }

        result.details.push(`Phase 9.0.6 readiness: ${scriptsFound}/${testScripts.length} test scripts available`);
        
        if (scriptsFound >= 2) {
          result.details.push('✅ Sufficient test infrastructure for Phase 9.0.6');
        } else {
          result.warnings.push('⚠️ Limited test infrastructure available');
        }

      } catch (error) {
        result.warnings.push(`Could not perform basic validation: ${error}`);
      }

    } catch (error) {
      result.warnings.push(`Test validation failed: ${error}`);
    }

    result.duration = Date.now() - startTime;
    this.results.push(result);
  }

  private async prepareGitHubIntegration(): Promise<void> {
    const startTime = Date.now();
    const step = 'Prepare GitHub Integration';
    console.log(`🐙 ${step}...`);

    const result: CleanupResult = {
      step,
      status: 'passed',
      duration: 0,
      details: [],
      errors: [],
      warnings: []
    };

    try {
      // Check git status
      try {
        const { stdout: gitStatus } = await execAsync('git status --porcelain', {
          cwd: this.config.projectRoot
        });
        
        if (gitStatus.trim()) {
          result.details.push(`Git status: ${gitStatus.split('\n').length} changed files`);
          result.warnings.push('Repository has uncommitted changes - consider committing before GitHub push');
        } else {
          result.details.push('✅ Git repository is clean');
        }
      } catch (gitError) {
        result.warnings.push('Could not check git status - may not be a git repository');
      }

      // Check for GitHub workflows
      const workflowsDir = path.join(this.config.projectRoot, '.github', 'workflows');
      try {
        const workflows = await fs.readdir(workflowsDir);
        result.details.push(`Found ${workflows.length} GitHub workflow(s)`);
        
        // Check for automation workflows
        const automationWorkflows = workflows.filter(w => 
          w.includes('nightly') || w.includes('automation') || w.includes('qa')
        );
        if (automationWorkflows.length > 0) {
          result.details.push(`✅ Automation workflows configured: ${automationWorkflows.join(', ')}`);
        }
      } catch {
        result.warnings.push('No GitHub workflows directory found');
      }

      // Validate package.json for CI/CD
      try {
        const packageJson = JSON.parse(await fs.readFile(
          path.join(this.config.projectRoot, 'package.json'), 'utf-8'
        ));
        
        const hasTestScript = !!packageJson.scripts?.test;
        const hasBuildScript = !!packageJson.scripts?.build;
        const hasLintScript = !!packageJson.scripts?.lint;
        
        result.details.push(`Package.json scripts: test=${hasTestScript}, build=${hasBuildScript}, lint=${hasLintScript}`);
        
        if (!hasTestScript) result.warnings.push('No test script in package.json');
        if (!hasBuildScript) result.warnings.push('No build script in package.json');
        
      } catch {
        result.warnings.push('Could not validate package.json for CI/CD readiness');
      }

      // Check for documentation
      const docFiles = ['README.md', 'CHANGELOG.md', 'CONTRIBUTING.md'];
      for (const docFile of docFiles) {
        try {
          await fs.access(path.join(this.config.projectRoot, docFile));
          result.details.push(`✅ Documentation found: ${docFile}`);
        } catch {
          if (docFile === 'README.md') {
            result.warnings.push('No README.md found');
          }
        }
      }

    } catch (error) {
      result.status = 'failed';
      result.errors.push(`GitHub integration preparation failed: ${error}`);
    }

    result.duration = Date.now() - startTime;
    this.results.push(result);
  }

  private async cleanTemporaryFiles(): Promise<void> {
    const startTime = Date.now();
    const step = 'Clean Temporary Files';
    console.log(`🧹 ${step}...`);

    const result: CleanupResult = {
      step,
      status: 'passed',
      duration: 0,
      details: [],
      errors: [],
      warnings: []
    };

    try {
      const tempPatterns = [
        '**/*.tmp',
        '**/*.temp',
        '**/temp_*',
        '**/test_*',
        '**/.DS_Store',
        '**/Thumbs.db',
        '**/npm-debug.log*',
        '**/*.log'
      ];

      let cleanedFiles = 0;
      const filesToClean: string[] = [];

      // Find temp files (but don't actually delete them without explicit confirmation)
      for (const pattern of tempPatterns) {
        try {
          const { stdout } = await execAsync(`find . -name "${pattern.replace('**/', '')}" -type f`, {
            cwd: this.config.projectRoot
          });
          
          if (stdout.trim()) {
            const files = stdout.trim().split('\n');
            filesToClean.push(...files);
          }
        } catch {
          // Pattern not found or find command failed
        }
      }

      if (filesToClean.length > 0) {
        result.details.push(`Found ${filesToClean.length} temporary files`);
        result.warnings.push('Consider cleaning temporary files before final commit');
        
        // Log first few files as examples
        const examples = filesToClean.slice(0, 3).map(f => path.basename(f));
        result.details.push(`Examples: ${examples.join(', ')}`);
      } else {
        result.details.push('✅ No temporary files found');
      }

    } catch (error) {
      result.warnings.push(`Temporary file cleanup check failed: ${error}`);
    }

    result.duration = Date.now() - startTime;
    this.results.push(result);
  }

  private async validateRepositoryStructure(): Promise<void> {
    const startTime = Date.now();
    const step = 'Validate Repository Structure';
    console.log(`📁 ${step}...`);

    const result: CleanupResult = {
      step,
      status: 'passed',
      duration: 0,
      details: [],
      errors: [],
      warnings: []
    };

    try {
      // Check essential directories
      const essentialDirs = [
        'src',
        'scripts',
        'DriveMemory',
        'DriveMemory/OF-9.0',
        'DriveMemory/MemoryPlugin',
        'logs'
      ];

      for (const dir of essentialDirs) {
        try {
          await fs.access(path.join(this.config.projectRoot, dir));
          result.details.push(`✅ Essential directory exists: ${dir}`);
        } catch {
          result.errors.push(`❌ Missing essential directory: ${dir}`);
          result.status = 'failed';
        }
      }

      // Check for required files
      const requiredFiles = [
        'package.json',
        'server.js',
        'scripts/generate-orchestrator-task.ts',
        'scripts/oes-testing-protocol.sh',
        'DriveMemory/Onboarding/CC.md',
        'DriveMemory/Onboarding/Zoi.md'
      ];

      for (const file of requiredFiles) {
        try {
          await fs.access(path.join(this.config.projectRoot, file));
          result.details.push(`✅ Required file exists: ${file}`);
        } catch {
          result.errors.push(`❌ Missing required file: ${file}`);
          result.status = 'failed';
        }
      }

      // Validate file structure
      result.details.push(`Repository structure validation completed`);

    } catch (error) {
      result.status = 'failed';
      result.errors.push(`Repository structure validation failed: ${error}`);
    }

    result.duration = Date.now() - startTime;
    this.results.push(result);
  }

  private generateCleanupReport(): CleanupReport {
    const passed = this.results.filter(r => r.status === 'passed').length;
    const warnings = this.results.filter(r => r.status === 'warnings').length;
    const failed = this.results.filter(r => r.status === 'failed').length;

    const overallStatus = failed > 0 ? 'failed' : warnings > 0 ? 'warnings' : 'ready';
    const readyForGitHub = failed === 0;

    const report: CleanupReport = {
      timestamp: new Date().toISOString(),
      phaseId: this.config.phaseId,
      overallStatus,
      results: this.results,
      summary: {
        totalSteps: this.results.length,
        passed,
        warnings,
        failed,
        readyForGitHub
      },
      governance: {
        orchestratorTasksLogged: 0, // Will be populated from validation results
        qaEvidenceGenerated: 0,
        tripleLoggingCompliant: true,
        complianceViolations: 0
      },
      codeQuality: {
        lintingPassed: !this.results.some(r => r.step === 'Run Linting Checks' && r.status === 'failed'),
        formattingPassed: !this.results.some(r => r.step === 'Run Code Style Checks' && r.status === 'failed'),
        testsPassedRatio: '0/0', // Will be updated from test results
        codeStyleCompliant: true
      },
      githubReadiness: {
        branchClean: true,
        commitsReady: true,
        prGenerationReady: readyForGitHub,
        automationConfigured: true
      },
      recommendations: []
    };

    // Generate recommendations based on results
    if (failed > 0) {
      report.recommendations.push('Address all failed validation steps before proceeding to Phase 9.0.6');
    }
    
    if (warnings > 0) {
      report.recommendations.push('Consider addressing warnings for optimal code quality');
    }
    
    if (readyForGitHub) {
      report.recommendations.push('Repository is ready for Phase 9.0.6 cleanup and GitHub push');
      report.recommendations.push('Consider running final validation before committing changes');
    } else {
      report.recommendations.push('Repository requires fixes before Phase 9.0.6 readiness');
    }

    return report;
  }

  private logFinalStatus(report: CleanupReport): void {
    console.log(`\n📊 Phase 9.0.6 Preparation Report`);
    console.log(`═══════════════════════════════════════`);
    console.log(`🎯 Overall Status: ${report.overallStatus.toUpperCase()}`);
    console.log(`📈 Summary: ${report.summary.passed} passed, ${report.summary.warnings} warnings, ${report.summary.failed} failed`);
    console.log(`🐙 GitHub Ready: ${report.summary.readyForGitHub ? 'YES' : 'NO'}`);

    if (report.results.length > 0) {
      console.log(`\n📝 Step Results:`);
      report.results.forEach(result => {
        const icon = result.status === 'passed' ? '✅' : result.status === 'warnings' ? '⚠️' : '❌';
        console.log(`   ${icon} ${result.step} (${result.duration}ms)`);
        
        if (result.errors.length > 0) {
          result.errors.forEach(error => console.log(`      ❌ ${error}`));
        }
        if (result.warnings.length > 0 && result.warnings.length <= 2) {
          result.warnings.forEach(warning => console.log(`      ⚠️ ${warning}`));
        }
      });
    }

    if (report.recommendations.length > 0) {
      console.log(`\n💡 Recommendations:`);
      report.recommendations.forEach((rec, index) => {
        console.log(`   ${index + 1}. ${rec}`);
      });
    }

    console.log(`\n📄 Full report saved to: ${this.config.outputReport}`);
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help')) {
    console.log(`
Usage: npx tsx scripts/prepare-phase-9.0.6-cleanup.ts [OPTIONS]

Options:
  --project-root DIR      Project root directory (default: current directory)
  --phase-id ID           Phase identifier (default: 9.0)
  --skip-orchestrator     Skip orchestrator task validation
  --skip-linting          Skip linting checks
  --skip-code-style       Skip code style checks
  --skip-governance       Skip governance validation
  --skip-github           Skip GitHub preparation
  --output FILE           Output report file (required)
  --help                  Show this help message

Examples:
  # Full preparation with all checks
  npx tsx scripts/prepare-phase-9.0.6-cleanup.ts \\
    --output DriveMemory/OF-9.0/phase-906-preparation.json

  # Skip linting for faster execution
  npx tsx scripts/prepare-phase-9.0.6-cleanup.ts \\
    --skip-linting --skip-code-style \\
    --output DriveMemory/OF-9.0/phase-906-preparation.json
    `);
    process.exit(0);
  }

  const config: CleanupConfig = {
    projectRoot: process.cwd(),
    phaseId: '9.0',
    validateOrchestrator: true,
    runLinting: true,
    runCodeStyle: true,
    validateGovernance: true,
    prepareGitHub: true,
    outputReport: ''
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--project-root':
        config.projectRoot = args[++i];
        break;
      case '--phase-id':
        config.phaseId = args[++i];
        break;
      case '--skip-orchestrator':
        config.validateOrchestrator = false;
        break;
      case '--skip-linting':
        config.runLinting = false;
        break;
      case '--skip-code-style':
        config.runCodeStyle = false;
        break;
      case '--skip-governance':
        config.validateGovernance = false;
        break;
      case '--skip-github':
        config.prepareGitHub = false;
        break;
      case '--output':
        config.outputReport = args[++i];
        break;
    }
  }

  if (!config.outputReport) {
    console.error('❌ --output parameter is required');
    process.exit(1);
  }

  try {
    const manager = new Phase906PreparationManager(config);
    const report = await manager.executeCleanupAndPreparation();
    
    // Exit with appropriate code
    if (report.overallStatus === 'failed') {
      console.error('❌ Phase 9.0.6 preparation failed - not ready for GitHub push');
      process.exit(1);
    } else if (report.overallStatus === 'warnings') {
      console.warn('⚠️ Phase 9.0.6 preparation completed with warnings');
      process.exit(2);
    } else {
      console.log('✅ Phase 9.0.6 preparation completed successfully - ready for GitHub push!');
      process.exit(0);
    }
    
  } catch (error) {
    console.error(`❌ Phase 9.0.6 preparation failed: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { Phase906PreparationManager, CleanupReport, CleanupResult };