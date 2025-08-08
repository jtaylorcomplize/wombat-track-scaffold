/**
 * Orchestrator Execution Service (OES)
 * Phase 9.0.4 - Enables direct execution mode for Zoi and CC
 * with full governance and secure integration
 */

import type { Request, Response } from 'express';
import express from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
// Mock Octokit for testing
class MockOctokit {
  git = {
    createRef: async (params: any) => ({ data: { ref: params.ref, sha: params.sha } }),
    getRef: async (params: any) => ({ data: { object: { sha: 'mock-sha' } } }),
    getCommit: async (params: any) => ({ data: { tree: { sha: 'mock-tree-sha' } } }),
    createBlob: async (params: any) => ({ data: { sha: 'mock-blob-sha' } }),
    createTree: async (params: any) => ({ data: { sha: 'mock-tree-sha' } }),
    createCommit: async (params: any) => ({ data: { sha: 'mock-commit-sha' } }),
    updateRef: async (params: any) => ({ data: { ref: params.ref, object: { sha: params.sha } } })
  };
  
  pulls = {
    create: async (params: any) => ({ data: { number: 1, html_url: 'https://github.com/mock/pr' } })
  };
  
  actions = {
    createWorkflowDispatch: async (params: any) => ({ data: { status: 'dispatched' } })
  };
}

import { governanceLogger } from './governanceLogger';
import { memoryAnchorService } from './memoryAnchorService';
import { vaultService } from './vaultService';

const execAsync = promisify(exec);

interface ExecutionInstruction {
  instructionId: string;
  agentId: 'zoi' | 'cc';
  timestamp: string;
  operation: {
    type: 'github' | 'file' | 'ci' | 'azure' | 'database';
    action: string;
    parameters: Record<string, any>;
  };
  signature: string;
  context?: {
    projectId?: string;
    phaseId?: string;
    stepId?: string;
    memoryAnchor?: string;
  };
}

interface ExecutionResult {
  instructionId: string;
  status: 'success' | 'failed' | 'pending';
  output?: any;
  artifacts?: string[];
  error?: string;
  governanceLogId?: string;
  timestamp: string;
}

class OrchestratorExecutionService {
  private executionHistory: ExecutionResult[] = [];
  private octokit: MockOctokit | null = null;
  
  constructor() {
    this.initializeGitHubClient();
  }

  private async initializeGitHubClient() {
    try {
      // Use mock Octokit for testing
      this.octokit = new MockOctokit();
      console.log('Initialized mock GitHub client for testing');
    } catch (error) {
      console.error('Failed to initialize GitHub client:', error);
    }
  }

  /**
   * Validates JWT token and API key
   */
  async validateAuth(req: Request): Promise<boolean> {
    const authHeader = req.headers.authorization;
    const apiKey = req.headers['x-oapp-api-key'];
    
    if (!authHeader || !apiKey) return false;
    
    try {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret');
      const validApiKey = await vaultService.getSecret('oapp_api_key');
      
      return apiKey === validApiKey;
    } catch (error) {
      return false;
    }
  }

  /**
   * Validates instruction signature
   */
  validateSignature(instruction: ExecutionInstruction): boolean {
    const { signature, ...data } = instruction;
    const dataString = JSON.stringify(data, null, 2);
    const hash = crypto.createHash('sha256').update(dataString).digest('hex');
    
    // In production, verify against agent's public key
    return signature === hash;
  }

  /**
   * Execute GitHub operations
   */
  private async executeGitHubOperation(operation: ExecutionInstruction['operation']): Promise<any> {
    if (!this.octokit) throw new Error('GitHub client not initialized');
    
    const { action, parameters } = operation;
    
    switch (action) {
      case 'create_branch':
        return await this.octokit.git.createRef({
          owner: parameters.owner,
          repo: parameters.repo,
          ref: `refs/heads/${parameters.branch}`,
          sha: parameters.sha
        });
        
      case 'create_pr':
        return await this.octokit.pulls.create({
          owner: parameters.owner,
          repo: parameters.repo,
          title: parameters.title,
          body: parameters.body,
          head: parameters.head,
          base: parameters.base
        });
        
      case 'commit_files':
        // Complex multi-file commit logic
        return await this.createMultiFileCommit(parameters);
        
      default:
        throw new Error(`Unknown GitHub action: ${action}`);
    }
  }

  /**
   * Execute file system operations
   */
  private async executeFileOperation(operation: ExecutionInstruction['operation']): Promise<any> {
    const { action, parameters } = operation;
    
    switch (action) {
      case 'write':
        const filePath = path.join('/home/jtaylor/wombat-track-scaffold/wombat-track', parameters.path);
        await fs.writeFile(filePath, parameters.content, 'utf-8');
        return { path: filePath, size: parameters.content.length };
        
      case 'sync_drive_memory':
        const memoryPath = path.join(
          '/home/jtaylor/wombat-track-scaffold/wombat-track/DriveMemory',
          parameters.folder,
          parameters.file
        );
        await fs.mkdir(path.dirname(memoryPath), { recursive: true });
        await fs.writeFile(memoryPath, JSON.stringify(parameters.data, null, 2));
        return { path: memoryPath, synced: true };
        
      default:
        throw new Error(`Unknown file action: ${action}`);
    }
  }

  /**
   * Execute CI/CD operations
   */
  private async executeCIOperation(operation: ExecutionInstruction['operation']): Promise<any> {
    const { action, parameters } = operation;
    
    switch (action) {
      case 'trigger_workflow':
        if (!this.octokit) throw new Error('GitHub client not initialized');
        
        return await this.octokit.actions.createWorkflowDispatch({
          owner: parameters.owner,
          repo: parameters.repo,
          workflow_id: parameters.workflow,
          ref: parameters.ref || 'main',
          inputs: parameters.inputs
        });
        
      case 'run_tests':
        const { stdout, stderr } = await execAsync(parameters.command, {
          cwd: '/home/jtaylor/wombat-track-scaffold/wombat-track'
        });
        return { stdout, stderr };
        
      default:
        throw new Error(`Unknown CI action: ${action}`);
    }
  }

  /**
   * Execute Azure operations
   */
  private async executeAzureOperation(operation: ExecutionInstruction['operation']): Promise<any> {
    const { action, parameters } = operation;
    
    switch (action) {
      case 'deploy_container':
        // Azure container deployment logic
        const deployCommand = `az container create --resource-group ${parameters.resourceGroup} --name ${parameters.name} --image ${parameters.image}`;
        const { stdout } = await execAsync(deployCommand);
        return JSON.parse(stdout);
        
      case 'openai_completion':
        // Forward to Azure OpenAI service
        const azureOpenAIService = await import('./azureOpenAIService');
        return await azureOpenAIService.default.createCompletion(parameters);
        
      default:
        throw new Error(`Unknown Azure action: ${action}`);
    }
  }

  /**
   * Execute database operations
   */
  private async executeDatabaseOperation(operation: ExecutionInstruction['operation']): Promise<any> {
    const { action, parameters } = operation;
    const db = await import('../../databases/production.db');
    
    switch (action) {
      case 'update_governance':
        // Update governance tables
        return await db.default.run(
          'INSERT INTO governance_log (phase_id, step_id, agent_id, action, data) VALUES (?, ?, ?, ?, ?)',
          [parameters.phaseId, parameters.stepId, parameters.agentId, parameters.action, JSON.stringify(parameters.data)]
        );
        
      case 'log_memory_anchor':
        return await memoryAnchorService.createAnchor({
          anchorId: parameters.anchorId,
          phaseId: parameters.phaseId,
          data: parameters.data
        });
        
      default:
        throw new Error(`Unknown database action: ${action}`);
    }
  }

  /**
   * Main execution handler
   */
  async execute(instruction: ExecutionInstruction): Promise<ExecutionResult> {
    const startTime = Date.now();
    const result: ExecutionResult = {
      instructionId: instruction.instructionId,
      status: 'pending',
      timestamp: new Date().toISOString()
    };
    
    try {
      // Validate signature
      if (!this.validateSignature(instruction)) {
        throw new Error('Invalid instruction signature');
      }
      
      // Log to governance
      const governanceEntry = await governanceLogger.logPhaseStep({
        phaseId: instruction.context?.phaseId || 'OF-9.0',
        stepId: instruction.context?.stepId || '9.0.4',
        action: `EXECUTE_${instruction.operation.type.toUpperCase()}`,
        agent: instruction.agentId,
        details: instruction.operation,
        timestamp: new Date().toISOString()
      });
      
      result.governanceLogId = governanceEntry.id;
      
      // Execute based on operation type
      let output;
      switch (instruction.operation.type) {
        case 'github':
          output = await this.executeGitHubOperation(instruction.operation);
          break;
        case 'file':
          output = await this.executeFileOperation(instruction.operation);
          break;
        case 'ci':
          output = await this.executeCIOperation(instruction.operation);
          break;
        case 'azure':
          output = await this.executeAzureOperation(instruction.operation);
          break;
        case 'database':
          output = await this.executeDatabaseOperation(instruction.operation);
          break;
        default:
          throw new Error(`Unknown operation type: ${instruction.operation.type}`);
      }
      
      result.output = output;
      result.status = 'success';
      
      // Log to memory anchor if specified
      if (instruction.context?.memoryAnchor) {
        await memoryAnchorService.appendToAnchor(
          instruction.context.memoryAnchor,
          {
            instructionId: instruction.instructionId,
            result: output,
            executionTime: Date.now() - startTime
          }
        );
      }
      
    } catch (error: any) {
      result.status = 'failed';
      result.error = error.message;
      
      // Log error to governance
      await governanceLogger.logError({
        phaseId: instruction.context?.phaseId || 'OF-9.0',
        stepId: instruction.context?.stepId || '9.0.4',
        error: error.message,
        instruction: instruction
      });
    }
    
    // Store in history (keep last 10)
    this.executionHistory.unshift(result);
    if (this.executionHistory.length > 10) {
      this.executionHistory.pop();
    }
    
    return result;
  }

  /**
   * Get execution status history
   */
  getStatus(): ExecutionResult[] {
    return this.executionHistory;
  }

  /**
   * Helper: Create multi-file commit
   */
  private async createMultiFileCommit(parameters: any): Promise<any> {
    if (!this.octokit) throw new Error('GitHub client not initialized');
    
    const { owner, repo, branch, files, message } = parameters;
    
    // Get current commit SHA
    const { data: ref } = await this.octokit.git.getRef({
      owner,
      repo,
      ref: `heads/${branch}`
    });
    
    const currentCommitSha = ref.object.sha;
    
    // Get current tree
    const { data: currentCommit } = await this.octokit.git.getCommit({
      owner,
      repo,
      commit_sha: currentCommitSha
    });
    
    // Create blobs for each file
    const blobs = await Promise.all(
      files.map(async (file: any) => {
        const { data: blob } = await this.octokit!.git.createBlob({
          owner,
          repo,
          content: Buffer.from(file.content).toString('base64'),
          encoding: 'base64'
        });
        return {
          path: file.path,
          mode: '100644' as const,
          type: 'blob' as const,
          sha: blob.sha
        };
      })
    );
    
    // Create tree
    const { data: tree } = await this.octokit.git.createTree({
      owner,
      repo,
      tree: blobs,
      base_tree: currentCommit.tree.sha
    });
    
    // Create commit
    const { data: commit } = await this.octokit.git.createCommit({
      owner,
      repo,
      message,
      tree: tree.sha,
      parents: [currentCommitSha]
    });
    
    // Update reference
    await this.octokit.git.updateRef({
      owner,
      repo,
      ref: `heads/${branch}`,
      sha: commit.sha
    });
    
    return commit;
  }
}

// Express API endpoints
export function createOrchestratorAPI() {
  const router = express.Router();
  const service = new OrchestratorExecutionService();
  
  /**
   * POST /api/orchestrator/execute
   * Execute signed instruction from agent
   */
  router.post('/execute', async (req: Request, res: Response) => {
    try {
      // Validate auth
      const isAuthorized = await service.validateAuth(req);
      if (!isAuthorized) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      const instruction: ExecutionInstruction = req.body;
      
      // Execute instruction
      const result = await service.execute(instruction);
      
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ 
        error: error.message,
        instructionId: req.body.instructionId 
      });
    }
  });
  
  /**
   * POST /api/orchestrator/status
   * Get status of last 10 executions
   */
  router.post('/status', async (req: Request, res: Response) => {
    try {
      // Validate auth
      const isAuthorized = await service.validateAuth(req);
      if (!isAuthorized) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      const history = service.getStatus();
      
      res.json({
        count: history.length,
        executions: history
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  return router;
}

export default OrchestratorExecutionService;