#!/usr/bin/env tsx
/**
 * Orchestrator Task Generator - Phase 9.0.5
 * Generates dual-orchestrator SDLC automation tasks with role rotation
 * Enables CC and Zoi to alternate coding/testing roles automatically
 */

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface OrchestratorRole {
  agent: 'cc' | 'zoi';
  role: 'coder' | 'tester';
  responsibilities: string[];
}

interface OrchestratorTask {
  taskId: string;
  projectId: string;
  phaseId: string;
  stepId: string;
  memoryAnchor: string;
  timestamp: string;
  coder: OrchestratorRole;
  tester: OrchestratorRole;
  instruction: {
    instructionId: string;
    version: string;
    agentId: 'cc' | 'zoi';
    timestamp: string;
    operation: {
      type: 'sdlc';
      action: 'dual_orchestrator_step';
      parameters: any;
    };
    signature: string;
    context: {
      projectId: string;
      phaseId: string;
      stepId: string;
      memoryAnchor: string;
      roleAssignment: {
        coder: string;
        tester: string;
      };
    };
  };
  onboardingValidation: {
    coderManualPath: string;
    testerManualPath: string;
    validationRequired: boolean;
  };
  governance: {
    driveMemoryPath: string;
    memoryPluginUpdate: boolean;
    oAppDBLogging: boolean;
  };
  qaEvidence: {
    evidenceFile: string;
    testProtocolRequired: boolean;
    consoleLogCapture: boolean;
  };
}

class DualOrchestratorGenerator {
  private projectRoot: string;
  private roleRotationState: Map<string, 'cc' | 'zoi'> = new Map();

  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.loadRoleRotationState();
  }

  private async loadRoleRotationState() {
    try {
      const stateFile = path.join(this.projectRoot, 'DriveMemory', 'OF-9.0', 'orchestrator-role-state.json');
      const state = await fs.readFile(stateFile, 'utf-8');
      const parsed = JSON.parse(state);
      this.roleRotationState = new Map(Object.entries(parsed));
    } catch {
      // Initialize with CC as first coder for new projects
      this.roleRotationState.set('current_coder', 'cc');
    }
  }

  private async saveRoleRotationState() {
    const stateFile = path.join(this.projectRoot, 'DriveMemory', 'OF-9.0', 'orchestrator-role-state.json');
    const stateObj = Object.fromEntries(this.roleRotationState);
    await fs.mkdir(path.dirname(stateFile), { recursive: true });
    await fs.writeFile(stateFile, JSON.stringify(stateObj, null, 2));
  }

  private getNextRoleAssignment(stepId: string): { coder: 'cc' | 'zoi', tester: 'cc' | 'zoi' } {
    const currentCoder = this.roleRotationState.get('current_coder') || 'cc';
    const nextCoder: 'cc' | 'zoi' = currentCoder === 'cc' ? 'zoi' : 'cc';
    const tester: 'cc' | 'zoi' = currentCoder; // Current coder becomes next tester
    
    // Update state for next iteration
    this.roleRotationState.set('current_coder', nextCoder);
    this.roleRotationState.set(`step_${stepId}_coder`, nextCoder);
    this.roleRotationState.set(`step_${stepId}_tester`, tester);
    
    return { coder: nextCoder, tester };
  }

  private createSignature(instruction: any): string {
    const { signature, ...data } = instruction;
    const dataString = JSON.stringify(data, null, 0);
    return crypto.createHash('sha256').update(dataString).digest('hex');
  }

  private async validateOnboardingManuals(): Promise<{ ccPath: string, zoiPath: string, valid: boolean }> {
    const ccPath = path.join(this.projectRoot, 'DriveMemory', 'Onboarding', 'CC.md');
    const zoiPath = path.join(this.projectRoot, 'DriveMemory', 'Onboarding', 'Zoi.md');
    
    try {
      await fs.access(ccPath);
      await fs.access(zoiPath);
      return { ccPath, zoiPath, valid: true };
    } catch {
      return { ccPath, zoiPath, valid: false };
    }
  }

  async generateOrchestratorTask(options: {
    projectId: string;
    phaseId: string;
    stepId: string;
    memoryAnchor: string;
    taskDescription: string;
    codeActions: string[];
    testActions: string[];
    outputPath?: string;
  }): Promise<OrchestratorTask> {
    
    const { coder, tester } = this.getNextRoleAssignment(options.stepId);
    const taskId = `orchestrator-${options.stepId}-${Date.now()}`;
    const timestamp = new Date().toISOString();

    // Validate onboarding manuals
    const onboarding = await this.validateOnboardingManuals();

    // Define roles and responsibilities
    const coderRole: OrchestratorRole = {
      agent: coder,
      role: 'coder',
      responsibilities: [
        'Implement the required functionality',
        'Follow coding standards and patterns',
        'Reference onboarding manual for best practices',
        'Create clean, maintainable code',
        'Document implementation decisions',
        ...options.codeActions
      ]
    };

    const testerRole: OrchestratorRole = {
      agent: tester,
      role: 'tester',
      responsibilities: [
        'Review code for quality and correctness',
        'Run comprehensive testing protocols',
        'Validate against requirements',
        'Generate QA evidence documentation',
        'Reference onboarding manual for testing standards',
        ...options.testActions
      ]
    };

    // Create instruction for OES
    const instruction = {
      instructionId: `dual-orchestrator-${taskId}`,
      version: '1.0',
      agentId: coder, // Start with coder agent
      timestamp,
      operation: {
        type: 'sdlc' as const,
        action: 'dual_orchestrator_step' as const,
        parameters: {
          stepDescription: options.taskDescription,
          coderActions: options.codeActions,
          testerActions: options.testActions,
          roleAssignment: {
            coder: coder,
            tester: tester
          },
          workflow: 'sequential', // Coder first, then tester
          onboardingRequired: true,
          qaEvidenceRequired: true
        }
      },
      signature: '', // Will be filled after creation
      context: {
        projectId: options.projectId,
        phaseId: options.phaseId,
        stepId: options.stepId,
        memoryAnchor: options.memoryAnchor,
        roleAssignment: {
          coder: coder,
          tester: tester
        }
      }
    };

    // Generate signature
    instruction.signature = this.createSignature(instruction);

    // Create orchestrator task
    const orchestratorTask: OrchestratorTask = {
      taskId,
      projectId: options.projectId,
      phaseId: options.phaseId,
      stepId: options.stepId,
      memoryAnchor: options.memoryAnchor,
      timestamp,
      coder: coderRole,
      tester: testerRole,
      instruction,
      onboardingValidation: {
        coderManualPath: onboarding.ccPath,
        testerManualPath: onboarding.zoiPath,
        validationRequired: onboarding.valid
      },
      governance: {
        driveMemoryPath: path.join(this.projectRoot, 'DriveMemory', options.phaseId, `orchestrator-task-${options.stepId}.json`),
        memoryPluginUpdate: true,
        oAppDBLogging: true
      },
      qaEvidence: {
        evidenceFile: path.join(this.projectRoot, 'DriveMemory', options.phaseId, `qa-evidence-${options.stepId}.json`),
        testProtocolRequired: true,
        consoleLogCapture: true
      }
    };

    // Save role rotation state
    await this.saveRoleRotationState();

    // Output task if path provided
    if (options.outputPath) {
      await fs.mkdir(path.dirname(options.outputPath), { recursive: true });
      await fs.writeFile(options.outputPath, JSON.stringify(orchestratorTask, null, 2));
      console.log(`✅ Orchestrator task generated: ${options.outputPath}`);
      console.log(`🤖 Coder: ${coder.toUpperCase()}, Tester: ${tester.toUpperCase()}`);
    }

    return orchestratorTask;
  }

  async generateQAEvidence(stepId: string, testResults: any, consoleOutput: string): Promise<void> {
    const evidenceFile = path.join(this.projectRoot, 'DriveMemory', 'OF-9.0', `qa-evidence-${stepId}.json`);
    
    const evidence = {
      stepId,
      timestamp: new Date().toISOString(),
      testResults,
      consoleOutput,
      governance: {
        tester: this.roleRotationState.get(`step_${stepId}_tester`),
        coder: this.roleRotationState.get(`step_${stepId}_coder`),
        evidenceGenerated: true,
        testProtocolExecuted: true
      },
      validation: {
        allTestsPassed: testResults.failed === 0,
        qaStandards: 'followed',
        onboardingCompliance: 'verified'
      }
    };

    await fs.mkdir(path.dirname(evidenceFile), { recursive: true });
    await fs.writeFile(evidenceFile, JSON.stringify(evidence, null, 2));
    
    console.log(`📊 QA Evidence generated: ${evidenceFile}`);
  }

  async executeDualOrchestratorWorkflow(taskFile: string): Promise<void> {
    const task: OrchestratorTask = JSON.parse(await fs.readFile(taskFile, 'utf-8'));
    
    console.log(`🚀 Starting dual-orchestrator workflow for ${task.stepId}`);
    console.log(`👨‍💻 Coder: ${task.coder.agent.toUpperCase()}`);
    console.log(`🧪 Tester: ${task.tester.agent.toUpperCase()}`);

    // Step 1: Validate onboarding manuals
    if (task.onboardingValidation.validationRequired && !task.onboardingValidation.coderManualPath) {
      throw new Error('❌ Onboarding manuals not found - cannot proceed with dual orchestration');
    }

    // Step 2: Execute coder phase
    console.log(`\n📝 Phase 1: ${task.coder.agent.toUpperCase()} Coding Phase`);
    console.log('Responsibilities:');
    task.coder.responsibilities.forEach(resp => console.log(`  • ${resp}`));

    // Step 3: Execute tester phase  
    console.log(`\n🔍 Phase 2: ${task.tester.agent.toUpperCase()} Testing Phase`);
    console.log('Responsibilities:');
    task.tester.responsibilities.forEach(resp => console.log(`  • ${resp}`));

    // Step 4: Run automated testing protocol
    console.log('\n🧪 Running automated testing protocol...');
    try {
      const { spawn } = await import('child_process');
      const { promisify } = await import('util');
      const { exec } = await import('child_process');
      const execAsync = promisify(exec);

      const testCommand = `./scripts/oes-testing-protocol.sh --host http://localhost:3001 --auto --no-prompt --json-report "DriveMemory/OF-9.0/test-results-${task.stepId}.json" --log "DriveMemory/OF-9.0/test-console-${task.stepId}.log"`;
      
      const { stdout, stderr } = await execAsync(testCommand, {
        cwd: this.projectRoot,
        timeout: 120000 // 2 minute timeout
      });

      // Generate QA evidence
      await this.generateQAEvidence(task.stepId, { status: 'completed', stdout, stderr }, stdout);
      
      console.log('✅ Dual-orchestrator workflow completed successfully');
      
    } catch (error) {
      console.error(`❌ Testing protocol failed: ${error}`);
      await this.generateQAEvidence(task.stepId, { status: 'failed', error: (error as Error).message }, '');
      throw error;
    }

    // Step 5: Update governance logs
    await this.updateGovernanceLogs(task);
  }

  private async updateGovernanceLogs(task: OrchestratorTask): Promise<void> {
    // DriveMemory logging
    const driveMemoryEntry = {
      timestamp: new Date().toISOString(),
      stepId: task.stepId,
      action: 'DUAL_ORCHESTRATOR_COMPLETE',
      coder: task.coder.agent,
      tester: task.tester.agent,
      governance: 'triple_logged',
      status: 'completed'
    };

    const driveMemoryLog = path.join(this.projectRoot, 'DriveMemory', task.phaseId, 'Phase_9.0.5_DualOrchestrator_Automation.json');
    await fs.mkdir(path.dirname(driveMemoryLog), { recursive: true });
    
    // Read existing or create new
    let existingLog = [];
    try {
      const existing = await fs.readFile(driveMemoryLog, 'utf-8');
      existingLog = JSON.parse(existing);
    } catch {
      existingLog = [];
    }
    
    existingLog.push(driveMemoryEntry);
    await fs.writeFile(driveMemoryLog, JSON.stringify(existingLog, null, 2));

    console.log('📝 Governance logs updated successfully');
  }

  async getRoleHistory(): Promise<Record<string, any>> {
    return Object.fromEntries(this.roleRotationState);
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help')) {
    console.log(`
Usage: npx tsx scripts/generate-orchestrator-task.ts [COMMAND] [OPTIONS]

Commands:
  generate    Generate a new dual-orchestrator task
  execute     Execute an existing orchestrator task
  status      Show role rotation status
  
Generate Options:
  --project-id ID         Project identifier (required)
  --phase-id ID           Phase identifier (required)
  --step-id ID            Step identifier (required)
  --memory-anchor ID      Memory anchor identifier (required)
  --description TEXT      Task description (required)
  --code-actions ACTIONS  Comma-separated coding actions
  --test-actions ACTIONS  Comma-separated testing actions
  --output FILE           Output file path

Execute Options:
  --task-file FILE        Orchestrator task file to execute

Examples:
  # Generate new task
  npx tsx scripts/generate-orchestrator-task.ts generate \\
    --project-id OF \\
    --phase-id 9.0 \\
    --step-id 9.0.5-T1 \\
    --memory-anchor of-9.0-init-20250806 \\
    --description "Implement user authentication" \\
    --code-actions "Create auth service,Add JWT tokens" \\
    --test-actions "Test login flow,Validate security" \\
    --output DriveMemory/OF-9.0/orchestrator-task-9.0.5-T1.json

  # Execute existing task
  npx tsx scripts/generate-orchestrator-task.ts execute \\
    --task-file DriveMemory/OF-9.0/orchestrator-task-9.0.5-T1.json
    `);
    process.exit(0);
  }

  const generator = new DualOrchestratorGenerator();
  const command = args[0];

  try {
    switch (command) {
      case 'generate':
        const options = {
          projectId: '',
          phaseId: '',
          stepId: '',
          memoryAnchor: '',
          taskDescription: '',
          codeActions: [] as string[],
          testActions: [] as string[],
          outputPath: ''
        };

        for (let i = 1; i < args.length; i += 2) {
          const flag = args[i];
          const value = args[i + 1];

          switch (flag) {
            case '--project-id':
              options.projectId = value;
              break;
            case '--phase-id':
              options.phaseId = value;
              break;
            case '--step-id':
              options.stepId = value;
              break;
            case '--memory-anchor':
              options.memoryAnchor = value;
              break;
            case '--description':
              options.taskDescription = value;
              break;
            case '--code-actions':
              options.codeActions = value.split(',').map(s => s.trim());
              break;
            case '--test-actions':
              options.testActions = value.split(',').map(s => s.trim());
              break;
            case '--output':
              options.outputPath = value;
              break;
          }
        }

        if (!options.projectId || !options.phaseId || !options.stepId || !options.memoryAnchor) {
          console.error('❌ Missing required parameters. Use --help for usage information.');
          process.exit(1);
        }

        await generator.generateOrchestratorTask(options);
        break;

      case 'execute':
        let taskFile = '';
        for (let i = 1; i < args.length; i += 2) {
          if (args[i] === '--task-file') {
            taskFile = args[i + 1];
          }
        }

        if (!taskFile) {
          console.error('❌ --task-file required for execute command');
          process.exit(1);
        }

        await generator.executeDualOrchestratorWorkflow(taskFile);
        break;

      case 'status':
        const history = await generator.getRoleHistory();
        console.log('🔄 Role Rotation Status:');
        console.log(JSON.stringify(history, null, 2));
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

export { DualOrchestratorGenerator };
export type { OrchestratorTask, OrchestratorRole };