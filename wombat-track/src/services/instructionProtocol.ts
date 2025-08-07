/**
 * Signed JSON Instruction Protocol
 * Phase 9.0.4 - Secure multi-agent execution protocol
 */

export interface InstructionContext {
  projectId?: string;
  phaseId?: string;
  stepId?: string;
  memoryAnchor?: string;
  requestor?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

export interface OperationParameter {
  name: string;
  value: any;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
}

export interface Operation {
  type: 'github' | 'file' | 'ci' | 'azure' | 'database';
  action: string;
  parameters: Record<string, any>;
  timeout?: number; // in milliseconds
  retryCount?: number;
}

export interface ExecutionInstruction {
  instructionId: string;
  version: '1.0';
  agentId: 'zoi' | 'cc' | string;
  timestamp: string;
  operation: Operation;
  signature: string;
  context?: InstructionContext;
  metadata?: {
    estimatedDuration?: number;
    requiredPermissions?: string[];
    dependencies?: string[];
  };
}

export interface InstructionValidation {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
}

export class InstructionProtocol {
  private static VERSION = '1.0';
  private privateKey: CryptoKey | null = null;
  private publicKey: CryptoKey | null = null;
  private publicKeyPem: string | null = null;
  private privateKeyPem: string | null = null;
  private keysInitialized: Promise<void>;

  constructor(private agentId: string) {
    this.keysInitialized = this.generateKeyPair();
  }

  /**
   * Check if we're in a browser environment
   */
  private isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof window.crypto !== 'undefined';
  }

  /**
   * Generate RSA key pair for signing using Web Crypto API (browser) or fallback
   */
  private async generateKeyPair(): Promise<void> {
    if (this.isBrowser()) {
      try {
        // Use Web Crypto API in browser
        const keyPair = await window.crypto.subtle.generateKey(
          {
            name: 'RSA-PSS',
            modulusLength: 2048,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: 'SHA-256',
          },
          true,
          ['sign', 'verify']
        );
        
        this.privateKey = keyPair.privateKey;
        this.publicKey = keyPair.publicKey;

        // Export keys to PEM format for compatibility
        const publicKeyBuffer = await window.crypto.subtle.exportKey('spki', keyPair.publicKey);
        const privateKeyBuffer = await window.crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
        
        this.publicKeyPem = this.bufferToPem(publicKeyBuffer, 'PUBLIC KEY');
        this.privateKeyPem = this.bufferToPem(privateKeyBuffer, 'PRIVATE KEY');
        
      } catch (error) {
        console.warn('Web Crypto API failed, using fallback:', error);
        this.generateFallbackKeys();
      }
    } else {
      // Server-side or fallback - use simple key simulation
      this.generateFallbackKeys();
    }
  }

  /**
   * Generate fallback keys for compatibility
   */
  private generateFallbackKeys(): void {
    // Generate simple keys for development/fallback
    const timestamp = Date.now().toString();
    const agentSeed = this.agentId;
    
    this.privateKeyPem = `-----BEGIN PRIVATE KEY-----
FALLBACK_PRIVATE_KEY_${agentSeed}_${timestamp}
-----END PRIVATE KEY-----`;
    
    this.publicKeyPem = `-----BEGIN PUBLIC KEY-----
FALLBACK_PUBLIC_KEY_${agentSeed}_${timestamp}
-----END PUBLIC KEY-----`;
  }

  /**
   * Convert ArrayBuffer to PEM format
   */
  private bufferToPem(buffer: ArrayBuffer, type: string): string {
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
    const formatted = base64.match(/.{1,64}/g)?.join('\n') || base64;
    return `-----BEGIN ${type}-----\n${formatted}\n-----END ${type}-----`;
  }

  /**
   * Create a signed instruction
   */
  async createInstruction(
    operation: Operation,
    context?: InstructionContext,
    metadata?: ExecutionInstruction['metadata']
  ): Promise<ExecutionInstruction> {
    // Wait for keys to be initialized
    await this.keysInitialized;

    const instruction: Omit<ExecutionInstruction, 'signature'> = {
      instructionId: `inst-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      version: InstructionProtocol.VERSION,
      agentId: this.agentId,
      timestamp: new Date().toISOString(),
      operation,
      context,
      metadata
    };

    // Sign the instruction
    const signature = await this.signInstruction(instruction);

    return {
      ...instruction,
      signature
    };
  }

  /**
   * Sign an instruction with private key
   */
  private async signInstruction(instruction: Omit<ExecutionInstruction, 'signature'>): Promise<string> {
    const dataString = JSON.stringify(instruction, null, 2);
    
    if (this.isBrowser() && this.privateKey) {
      try {
        // Use Web Crypto API for signing
        const encoder = new TextEncoder();
        const data = encoder.encode(dataString);
        
        const signature = await window.crypto.subtle.sign(
          {
            name: 'RSA-PSS',
            saltLength: 32,
          },
          this.privateKey,
          data
        );
        
        // Convert to hex string
        const signatureArray = new Uint8Array(signature);
        return Array.from(signatureArray).map(b => b.toString(16).padStart(2, '0')).join('');
        
      } catch (error) {
        console.warn('Web Crypto signing failed, using fallback:', error);
      }
    }

    // Fallback: Simple hash-based signature for development
    if (this.privateKeyPem) {
      const simpleHash = await this.simpleHash(dataString + this.privateKeyPem);
      return simpleHash;
    }

    throw new Error('No signing method available');
  }

  /**
   * Simple hash function for fallback signing
   */
  private async simpleHash(data: string): Promise<string> {
    if (this.isBrowser()) {
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', dataBuffer);
      const hashArray = new Uint8Array(hashBuffer);
      return Array.from(hashArray).map(b => b.toString(16).padStart(2, '0')).join('');
    } else {
      // Fallback for non-browser environments
      let hash = 0;
      for (let i = 0; i < data.length; i++) {
        const char = data.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
      }
      return Math.abs(hash).toString(16);
    }
  }

  /**
   * Verify instruction signature with public key
   */
  async verifySignature(instruction: ExecutionInstruction, publicKey?: string): Promise<boolean> {
    const { signature, ...data } = instruction;
    const dataString = JSON.stringify(data, null, 2);
    
    if (this.isBrowser() && this.publicKey) {
      try {
        // Use Web Crypto API for verification
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(dataString);
        
        // Convert hex signature back to ArrayBuffer
        const signatureBytes = new Uint8Array(signature.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []);
        
        const isValid = await window.crypto.subtle.verify(
          {
            name: 'RSA-PSS',
            saltLength: 32,
          },
          this.publicKey,
          signatureBytes.buffer,
          dataBuffer
        );
        
        return isValid;
        
      } catch (error) {
        console.warn('Web Crypto verification failed, using fallback:', error);
      }
    }

    // Fallback: Simple hash verification
    const keyToUse = publicKey || this.privateKeyPem;
    if (keyToUse) {
      const expectedSignature = await this.simpleHash(dataString + keyToUse);
      return signature === expectedSignature;
    }

    return false;
  }

  /**
   * Get public key in PEM format
   */
  async getPublicKeyPem(): Promise<string> {
    await this.keysInitialized;
    return this.publicKeyPem || '';
  }

  /**
   * Validate instruction format and requirements
   */
  validateInstruction(instruction: ExecutionInstruction): InstructionValidation {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check version
    if (instruction.version !== InstructionProtocol.VERSION) {
      errors.push(`Invalid version: ${instruction.version}`);
    }

    // Check required fields
    if (!instruction.instructionId) errors.push('Missing instructionId');
    if (!instruction.agentId) errors.push('Missing agentId');
    if (!instruction.timestamp) errors.push('Missing timestamp');
    if (!instruction.operation) errors.push('Missing operation');
    if (!instruction.signature) errors.push('Missing signature');

    // Validate operation
    if (instruction.operation) {
      const validTypes = ['github', 'file', 'ci', 'azure', 'database'];
      if (!validTypes.includes(instruction.operation.type)) {
        errors.push(`Invalid operation type: ${instruction.operation.type}`);
      }

      if (!instruction.operation.action) {
        errors.push('Missing operation action');
      }

      if (!instruction.operation.parameters) {
        warnings.push('No parameters provided for operation');
      }
    }

    // Validate timestamp
    if (instruction.timestamp) {
      const timestamp = new Date(instruction.timestamp);
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      
      if (timestamp > now) {
        errors.push('Timestamp is in the future');
      } else if (timestamp < fiveMinutesAgo) {
        warnings.push('Instruction is older than 5 minutes');
      }
    }

    // Check metadata warnings
    if (instruction.metadata) {
      if (!instruction.metadata.estimatedDuration) {
        warnings.push('No estimated duration provided');
      }
      if (!instruction.metadata.requiredPermissions) {
        warnings.push('No required permissions specified');
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  /**
   * Create GitHub operation instructions
   */
  static githubOperations = {
    createBranch: (owner: string, repo: string, branch: string, baseSha: string): Operation => ({
      type: 'github',
      action: 'create_branch',
      parameters: { owner, repo, branch, sha: baseSha }
    }),

    createPR: (
      owner: string,
      repo: string,
      title: string,
      body: string,
      head: string,
      base: string
    ): Operation => ({
      type: 'github',
      action: 'create_pr',
      parameters: { owner, repo, title, body, head, base }
    }),

    commitFiles: (
      owner: string,
      repo: string,
      branch: string,
      files: Array<{ path: string; content: string }>,
      message: string
    ): Operation => ({
      type: 'github',
      action: 'commit_files',
      parameters: { owner, repo, branch, files, message }
    })
  };

  /**
   * Create file operation instructions
   */
  static fileOperations = {
    write: (path: string, content: string): Operation => ({
      type: 'file',
      action: 'write',
      parameters: { path, content }
    }),

    syncDriveMemory: (folder: string, file: string, data: any): Operation => ({
      type: 'file',
      action: 'sync_drive_memory',
      parameters: { folder, file, data }
    })
  };

  /**
   * Create CI/CD operation instructions
   */
  static ciOperations = {
    triggerWorkflow: (
      owner: string,
      repo: string,
      workflow: string,
      ref?: string,
      inputs?: Record<string, any>
    ): Operation => ({
      type: 'ci',
      action: 'trigger_workflow',
      parameters: { owner, repo, workflow, ref, inputs }
    }),

    runTests: (command: string): Operation => ({
      type: 'ci',
      action: 'run_tests',
      parameters: { command }
    })
  };

  /**
   * Create Azure operation instructions
   */
  static azureOperations = {
    deployContainer: (
      resourceGroup: string,
      name: string,
      image: string
    ): Operation => ({
      type: 'azure',
      action: 'deploy_container',
      parameters: { resourceGroup, name, image }
    }),

    openAICompletion: (prompt: string, model?: string, temperature?: number): Operation => ({
      type: 'azure',
      action: 'openai_completion',
      parameters: { prompt, model: model || 'gpt-4', temperature: temperature || 0.7 }
    })
  };

  /**
   * Create database operation instructions
   */
  static databaseOperations = {
    updateGovernance: (
      phaseId: string,
      stepId: string,
      agentId: string,
      action: string,
      data: any
    ): Operation => ({
      type: 'database',
      action: 'update_governance',
      parameters: { phaseId, stepId, agentId, action, data }
    }),

    logMemoryAnchor: (anchorId: string, phaseId: string, data: any): Operation => ({
      type: 'database',
      action: 'log_memory_anchor',
      parameters: { anchorId, phaseId, data }
    })
  };

  /**
   * Get public key for verification (returns PEM format)
   */
  async getPublicKey(): Promise<string | null> {
    await this.keysInitialized;
    return this.publicKeyPem;
  }

  /**
   * Create a batch of instructions
   */
  async createBatch(operations: Operation[], context?: InstructionContext): Promise<ExecutionInstruction[]> {
    const instructions: ExecutionInstruction[] = [];
    for (const operation of operations) {
      const instruction = await this.createInstruction(operation, context);
      instructions.push(instruction);
    }
    return instructions;
  }

  /**
   * Serialize instruction for transmission
   */
  static serialize(instruction: ExecutionInstruction): string {
    return JSON.stringify(instruction);
  }

  /**
   * Deserialize instruction from transmission
   */
  static deserialize(data: string): ExecutionInstruction {
    return JSON.parse(data);
  }
}

// Agent-specific protocol instances
export class ZoiInstructionProtocol extends InstructionProtocol {
  constructor() {
    super('zoi');
  }

  /**
   * Create Zoi-specific instruction with Azure context
   */
  async createAzureInstruction(
    operation: Operation,
    subscriptionId: string,
    resourceGroup: string
  ): Promise<ExecutionInstruction> {
    return await this.createInstruction(operation, {
      projectId: 'azure-openai',
      phaseId: 'OF-9.0',
      stepId: '9.0.4',
      memoryAnchor: 'of-9.0-init-20250806'
    }, {
      requiredPermissions: ['azure:openai', 'azure:resources'],
      estimatedDuration: 30000
    });
  }
}

export class CCInstructionProtocol extends InstructionProtocol {
  constructor() {
    super('cc');
  }

  /**
   * Create CC-specific instruction with GitHub context
   */
  async createGitHubInstruction(
    operation: Operation,
    prNumber?: number
  ): Promise<ExecutionInstruction> {
    return await this.createInstruction(operation, {
      projectId: 'wombat-track',
      phaseId: 'OF-9.0',
      stepId: '9.0.4',
      memoryAnchor: 'of-9.0-init-20250806'
    }, {
      requiredPermissions: ['github:repo', 'github:pr'],
      estimatedDuration: 15000,
      dependencies: prNumber ? [`pr:${prNumber}`] : undefined
    });
  }
}

export default InstructionProtocol;