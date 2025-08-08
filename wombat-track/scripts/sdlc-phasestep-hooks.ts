#!/usr/bin/env tsx
/**
 * SDLC PhaseStep Integration Hooks - Phase 9.0.5
 * Integrates dual-orchestrator automation with SDLC phase/step initialization
 * Automatically triggers orchestrator task generation and governance logging
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { DualOrchestratorGenerator } from './generate-orchestrator-task.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface PhaseStepConfig {
  projectId: string;
  phaseId: string;
  stepId: string;
  memoryAnchor: string;
  stepDescription: string;
  codeActions: string[];
  testActions: string[];
  autoExecute: boolean;
  governanceRequired: boolean;
}

interface PhaseStepHook {
  hookId: string;
  triggerEvent: 'phase_init' | 'step_init' | 'step_complete';
  projectId: string;
  phaseId: string;
  stepId?: string;
  orchestratorConfig: PhaseStepConfig;
  governance: {
    memoryPluginUpdate: boolean;
    driveMemoryLogging: boolean;
    oAppDBEntry: boolean;
  };
  execution: {
    timestamp: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    orchestratorTaskFile?: string;
    qaEvidenceFile?: string;
    error?: string;
  };
}

class SDLCPhaseStepHooks {
  private projectRoot: string;
  private orchestratorGenerator: DualOrchestratorGenerator;
  private activeHooks: Map<string, PhaseStepHook> = new Map();

  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.orchestratorGenerator = new DualOrchestratorGenerator();
    this.loadActiveHooks();
  }

  private async loadActiveHooks() {
    try {
      const hooksFile = path.join(this.projectRoot, 'DriveMemory', 'OF-9.0', 'active-sdlc-hooks.json');
      const hooks = await fs.readFile(hooksFile, 'utf-8');
      const parsed = JSON.parse(hooks);
      
      for (const [key, hook] of Object.entries(parsed)) {
        this.activeHooks.set(key, hook as PhaseStepHook);
      }
    } catch {
      // No existing hooks to load
    }
  }

  private async saveActiveHooks() {
    const hooksFile = path.join(this.projectRoot, 'DriveMemory', 'OF-9.0', 'active-sdlc-hooks.json');
    const hooksObj = Object.fromEntries(this.activeHooks);
    await fs.mkdir(path.dirname(hooksFile), { recursive: true });
    await fs.writeFile(hooksFile, JSON.stringify(hooksObj, null, 2));
  }

  /**
   * Register a new SDLC phase/step hook
   */
  async registerPhaseStepHook(config: {
    projectId: string;
    phaseId: string;
    stepId?: string;
    triggerEvent: 'phase_init' | 'step_init' | 'step_complete';
    stepDescription: string;
    codeActions: string[];
    testActions: string[];
    memoryAnchor: string;
    autoExecute?: boolean;
    governanceRequired?: boolean;
  }): Promise<PhaseStepHook> {
    
    const hookId = `${config.projectId}-${config.phaseId}${config.stepId ? `-${config.stepId}` : ''}-${config.triggerEvent}`;
    
    const hook: PhaseStepHook = {
      hookId,
      triggerEvent: config.triggerEvent,
      projectId: config.projectId,
      phaseId: config.phaseId,
      stepId: config.stepId,
      orchestratorConfig: {
        projectId: config.projectId,
        phaseId: config.phaseId,
        stepId: config.stepId || `${config.phaseId}-auto`,
        memoryAnchor: config.memoryAnchor,
        stepDescription: config.stepDescription,
        codeActions: config.codeActions,
        testActions: config.testActions,
        autoExecute: config.autoExecute || false,
        governanceRequired: config.governanceRequired !== false
      },
      governance: {
        memoryPluginUpdate: true,
        driveMemoryLogging: true,
        oAppDBEntry: true
      },
      execution: {
        timestamp: new Date().toISOString(),
        status: 'pending'
      }
    };

    this.activeHooks.set(hookId, hook);
    await this.saveActiveHooks();

    console.log(`✅ Registered SDLC hook: ${hookId}`);
    return hook;
  }

  /**
   * Trigger a phase/step event and execute associated hooks
   */
  async triggerPhaseStepEvent(
    triggerEvent: 'phase_init' | 'step_init' | 'step_complete',
    projectId: string,
    phaseId: string,
    stepId?: string
  ): Promise<void> {
    
    console.log(`🔄 Triggering SDLC event: ${triggerEvent} for ${projectId}/${phaseId}${stepId ? `/${stepId}` : ''}`);

    // Find matching hooks
    const matchingHooks = Array.from(this.activeHooks.values()).filter(hook =>
      hook.triggerEvent === triggerEvent &&
      hook.projectId === projectId &&
      hook.phaseId === phaseId &&
      (stepId ? hook.stepId === stepId : true)
    );

    if (matchingHooks.length === 0) {
      console.log(`ℹ️ No hooks found for ${triggerEvent} ${projectId}/${phaseId}${stepId ? `/${stepId}` : ''}`);
      return;
    }

    // Execute each matching hook
    for (const hook of matchingHooks) {
      await this.executeHook(hook);
    }
  }

  /**
   * Execute a specific hook
   */
  private async executeHook(hook: PhaseStepHook): Promise<void> {
    console.log(`🚀 Executing hook: ${hook.hookId}`);
    
    try {
      hook.execution.status = 'running';
      hook.execution.timestamp = new Date().toISOString();
      await this.saveActiveHooks();

      // Step 1: Generate orchestrator task
      const orchestratorTaskPath = path.join(
        this.projectRoot,
        'DriveMemory',
        hook.phaseId,
        `orchestrator-task-${hook.orchestratorConfig.stepId}.json`
      );

      const orchestratorTask = await this.orchestratorGenerator.generateOrchestratorTask({
        ...hook.orchestratorConfig,
        outputPath: orchestratorTaskPath
      });

      hook.execution.orchestratorTaskFile = orchestratorTaskPath;

      // Step 2: Update MemoryPlugin with new task
      await this.updateMemoryPlugin(hook, orchestratorTask);

      // Step 3: Create DriveMemory governance entry
      await this.createDriveMemoryEntry(hook);

      // Step 4: Log to oApp DB (simulated)
      await this.logToOAppDB(hook);

      // Step 5: Auto-execute if configured
      if (hook.orchestratorConfig.autoExecute) {
        console.log(`🤖 Auto-executing orchestrator workflow...`);
        await this.orchestratorGenerator.executeDualOrchestratorWorkflow(orchestratorTaskPath);
        
        hook.execution.qaEvidenceFile = path.join(
          this.projectRoot,
          'DriveMemory',
          hook.phaseId,
          `qa-evidence-${hook.orchestratorConfig.stepId}.json`
        );
      }

      hook.execution.status = 'completed';
      console.log(`✅ Hook execution completed: ${hook.hookId}`);

    } catch (error) {
      hook.execution.status = 'failed';
      hook.execution.error = error instanceof Error ? error.message : String(error);
      console.error(`❌ Hook execution failed: ${hook.hookId} - ${hook.execution.error}`);
    }

    await this.saveActiveHooks();
  }

  /**
   * Update MemoryPlugin with orchestrator task information
   */
  private async updateMemoryPlugin(hook: PhaseStepHook, orchestratorTask: any): Promise<void> {
    const memoryPluginFile = path.join(
      this.projectRoot,
      'DriveMemory',
      'MemoryPlugin',
      `${hook.orchestratorConfig.memoryAnchor}.json`
    );

    try {
      const existing = await fs.readFile(memoryPluginFile, 'utf-8');
      const memoryAnchor = JSON.parse(existing);

      // Add orchestrator task to memory anchor
      if (!memoryAnchor.orchestrator_tasks) {
        memoryAnchor.orchestrator_tasks = [];
      }

      memoryAnchor.orchestrator_tasks.push({
        hookId: hook.hookId,
        stepId: hook.orchestratorConfig.stepId,
        coder: orchestratorTask.coder.agent,
        tester: orchestratorTask.tester.agent,
        taskFile: hook.execution.orchestratorTaskFile,
        timestamp: hook.execution.timestamp,
        status: hook.execution.status
      });

      memoryAnchor.last_updated = new Date().toISOString();

      await fs.writeFile(memoryPluginFile, JSON.stringify(memoryAnchor, null, 2));
      console.log(`📝 MemoryPlugin updated: ${memoryPluginFile}`);

    } catch (error) {
      console.error(`⚠️ Failed to update MemoryPlugin: ${error}`);
    }
  }

  /**
   * Create DriveMemory governance entry
   */
  private async createDriveMemoryEntry(hook: PhaseStepHook): Promise<void> {
    const driveMemoryPath = path.join(
      this.projectRoot,
      'DriveMemory',
      hook.phaseId,
      'Phase_9.0.5_DualOrchestrator_Automation.json'
    );

    const entry = {
      timestamp: hook.execution.timestamp,
      hookId: hook.hookId,
      stepId: hook.orchestratorConfig.stepId,
      triggerEvent: hook.triggerEvent,
      action: 'SDLC_HOOK_EXECUTED',
      orchestratorTask: hook.execution.orchestratorTaskFile,
      governance: 'triple_logged',
      status: hook.execution.status
    };

    // Read existing or create new
    let existingEntries = [];
    try {
      const existing = await fs.readFile(driveMemoryPath, 'utf-8');
      existingEntries = JSON.parse(existing);
    } catch {
      existingEntries = [];
    }

    existingEntries.push(entry);

    await fs.mkdir(path.dirname(driveMemoryPath), { recursive: true });
    await fs.writeFile(driveMemoryPath, JSON.stringify(existingEntries, null, 2));
    
    console.log(`📁 DriveMemory updated: ${driveMemoryPath}`);
  }

  /**
   * Log to oApp Database (simulated)
   */
  private async logToOAppDB(hook: PhaseStepHook): Promise<void> {
    // In production, this would connect to the actual oApp database
    const dbLogPath = path.join(
      this.projectRoot,
      'logs',
      'governance',
      `sdlc-hook-${hook.hookId}.json`
    );

    const dbEntry = {
      timestamp: hook.execution.timestamp,
      table: 'governance_log',
      action: 'INSERT',
      data: {
        phase_id: hook.phaseId,
        step_id: hook.orchestratorConfig.stepId,
        agent_id: 'sdlc_hooks',
        action: 'ORCHESTRATOR_HOOK_TRIGGERED',
        details: JSON.stringify({
          hookId: hook.hookId,
          triggerEvent: hook.triggerEvent,
          coder: hook.orchestratorConfig.codeActions.length > 0 ? 'assigned' : 'none',
          tester: hook.orchestratorConfig.testActions.length > 0 ? 'assigned' : 'none'
        })
      }
    };

    await fs.mkdir(path.dirname(dbLogPath), { recursive: true });
    await fs.writeFile(dbLogPath, JSON.stringify(dbEntry, null, 2));
    
    console.log(`🗄️ oApp DB logged: ${dbLogPath}`);
  }

  /**
   * Get status of all hooks
   */
  async getHookStatus(): Promise<Record<string, PhaseStepHook>> {
    return Object.fromEntries(this.activeHooks);
  }

  /**
   * Clean up completed hooks
   */
  async cleanupCompletedHooks(olderThanDays: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    
    let removedCount = 0;
    
    for (const [hookId, hook] of this.activeHooks) {
      const hookDate = new Date(hook.execution.timestamp);
      if (hookDate < cutoffDate && (hook.execution.status === 'completed' || hook.execution.status === 'failed')) {
        this.activeHooks.delete(hookId);
        removedCount++;
      }
    }
    
    if (removedCount > 0) {
      await this.saveActiveHooks();
      console.log(`🧹 Cleaned up ${removedCount} old hooks`);
    }
    
    return removedCount;
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help')) {
    console.log(`
Usage: npx tsx scripts/sdlc-phasestep-hooks.ts [COMMAND] [OPTIONS]

Commands:
  register     Register a new SDLC phase/step hook
  trigger      Trigger a phase/step event
  status       Show status of all hooks
  cleanup      Clean up old completed hooks
  
Register Options:
  --project-id ID         Project identifier (required)
  --phase-id ID           Phase identifier (required) 
  --step-id ID            Step identifier (optional)
  --trigger EVENT         Trigger event: phase_init, step_init, step_complete (required)
  --description TEXT      Step description (required)
  --code-actions ACTIONS  Comma-separated coding actions
  --test-actions ACTIONS  Comma-separated testing actions
  --memory-anchor ID      Memory anchor identifier (required)
  --auto-execute          Auto-execute orchestrator workflow
  --no-governance         Skip governance logging

Trigger Options:
  --event EVENT           Event type: phase_init, step_init, step_complete (required)
  --project-id ID         Project identifier (required)
  --phase-id ID           Phase identifier (required)
  --step-id ID            Step identifier (for step events)

Examples:
  # Register step initialization hook
  npx tsx scripts/sdlc-phasestep-hooks.ts register \\
    --project-id OF \\
    --phase-id 9.0 \\
    --step-id 9.0.5-T1 \\
    --trigger step_init \\
    --description "Implement user authentication" \\
    --code-actions "Create auth service,Add JWT validation" \\
    --test-actions "Test login flow,Security testing" \\
    --memory-anchor of-9.0-init-20250806 \\
    --auto-execute

  # Trigger step initialization
  npx tsx scripts/sdlc-phasestep-hooks.ts trigger \\
    --event step_init \\
    --project-id OF \\
    --phase-id 9.0 \\
    --step-id 9.0.5-T1
    `);
    process.exit(0);
  }

  const hooks = new SDLCPhaseStepHooks();
  const command = args[0];

  try {
    switch (command) {
      case 'register':
        const config = {
          projectId: '',
          phaseId: '',
          stepId: '',
          triggerEvent: 'step_init' as 'phase_init' | 'step_init' | 'step_complete',
          stepDescription: '',
          codeActions: [] as string[],
          testActions: [] as string[],
          memoryAnchor: '',
          autoExecute: false,
          governanceRequired: true
        };

        for (let i = 1; i < args.length; i++) {
          switch (args[i]) {
            case '--project-id':
              config.projectId = args[++i];
              break;
            case '--phase-id':
              config.phaseId = args[++i];
              break;
            case '--step-id':
              config.stepId = args[++i];
              break;
            case '--trigger':
              config.triggerEvent = args[++i] as any;
              break;
            case '--description':
              config.stepDescription = args[++i];
              break;
            case '--code-actions':
              config.codeActions = args[++i].split(',').map(s => s.trim());
              break;
            case '--test-actions':
              config.testActions = args[++i].split(',').map(s => s.trim());
              break;
            case '--memory-anchor':
              config.memoryAnchor = args[++i];
              break;
            case '--auto-execute':
              config.autoExecute = true;
              break;
            case '--no-governance':
              config.governanceRequired = false;
              break;
          }
        }

        if (!config.projectId || !config.phaseId || !config.stepDescription || !config.memoryAnchor) {
          console.error('❌ Missing required parameters. Use --help for usage information.');
          process.exit(1);
        }

        await hooks.registerPhaseStepHook(config);
        break;

      case 'trigger':
        let triggerEvent = '';
        let projectId = '';
        let phaseId = '';
        let stepId = '';

        for (let i = 1; i < args.length; i++) {
          switch (args[i]) {
            case '--event':
              triggerEvent = args[++i];
              break;
            case '--project-id':
              projectId = args[++i];
              break;
            case '--phase-id':
              phaseId = args[++i];
              break;
            case '--step-id':
              stepId = args[++i];
              break;
          }
        }

        if (!triggerEvent || !projectId || !phaseId) {
          console.error('❌ Missing required parameters for trigger. Use --help for usage information.');
          process.exit(1);
        }

        await hooks.triggerPhaseStepEvent(triggerEvent as any, projectId, phaseId, stepId || undefined);
        break;

      case 'status':
        const status = await hooks.getHookStatus();
        console.log('📊 SDLC Hook Status:');
        console.log(JSON.stringify(status, null, 2));
        break;

      case 'cleanup':
        const cleaned = await hooks.cleanupCompletedHooks();
        console.log(`🧹 Cleaned up ${cleaned} old hooks`);
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

export { SDLCPhaseStepHooks, PhaseStepHook, PhaseStepConfig };