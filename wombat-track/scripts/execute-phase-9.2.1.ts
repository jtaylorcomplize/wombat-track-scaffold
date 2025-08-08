/**
 * OF-9.2.1: Database & Storage Finalisation - Phase Executor
 * Orchestrates all steps in Phase 9.2.1 with proper error handling and governance logging
 */

import AzureSQLProvisioner from './azure-sql-production-setup';
import AzureSchemaManager from './azure-schema-migration';
import AzureBlobManager from './azure-blob-storage-cutover';
import AzureKeyVaultManager from './azure-keyvault-secrets';
import * as fs from 'fs/promises';

interface PhaseExecutionResult {
  phaseId: string;
  startTime: string;
  endTime?: string;
  status: 'in_progress' | 'completed' | 'failed';
  steps: Array<{
    stepId: string;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    startTime?: string;
    endTime?: string;
    error?: string;
  }>;
  error?: string;
}

class Phase921Executor {
  private result: PhaseExecutionResult;

  constructor() {
    this.result = {
      phaseId: 'OF-9.2.1',
      startTime: new Date().toISOString(),
      status: 'in_progress',
      steps: [
        { stepId: 'OF-9.2.1.1', status: 'pending' },
        { stepId: 'OF-9.2.1.2', status: 'pending' },
        { stepId: 'OF-9.2.1.3', status: 'pending' },
        { stepId: 'OF-9.2.1.4', status: 'pending' }
      ]
    };
  }

  async executePhase(): Promise<PhaseExecutionResult> {
    console.log('🚀 Starting Phase OF-9.2.1: Database & Storage Finalisation');
    
    try {
      // Step 1: Provision Azure SQL Production Tier
      await this.executeStep('OF-9.2.1.1', async () => {
        const sqlProvisioner = new AzureSQLProvisioner();
        await sqlProvisioner.provisionProductionSQL();
      });

      // Step 2: Migrate Schema and Data
      await this.executeStep('OF-9.2.1.2', async () => {
        const schemaManager = new AzureSchemaManager();
        await schemaManager.migrateToAzure();
      });

      // Step 3: Cut-over Blob Storage
      await this.executeStep('OF-9.2.1.3', async () => {
        const blobManager = new AzureBlobManager();
        await blobManager.cutoverBlobStorage();
      });

      // Step 4: Update Environment Secrets
      await this.executeStep('OF-9.2.1.4', async () => {
        const keyVaultManager = new AzureKeyVaultManager();
        await keyVaultManager.updateEnvironmentSecrets();
      });

      // Mark phase as completed
      this.result.status = 'completed';
      this.result.endTime = new Date().toISOString();
      
      console.log('✅ Phase OF-9.2.1 completed successfully');
      
      // Update database phase status
      await this.updatePhaseStatus('completed');
      
      // Log phase completion to governance
      await this.logPhaseCompletion();
      
    } catch (error) {
      console.error('❌ Phase OF-9.2.1 failed:', error);
      
      this.result.status = 'failed';
      this.result.endTime = new Date().toISOString();
      this.result.error = error.message;
      
      // Update database phase status
      await this.updatePhaseStatus('failed');
      
      // Log phase failure
      await this.logPhaseFailure(error);
    }

    // Save execution results
    await this.saveExecutionResults();
    
    return this.result;
  }

  private async executeStep(stepId: string, stepFunction: () => Promise<void>): Promise<void> {
    const step = this.result.steps.find(s => s.stepId === stepId);
    if (!step) throw new Error(`Step ${stepId} not found`);

    console.log(`🔄 Executing ${stepId}...`);
    
    step.status = 'in_progress';
    step.startTime = new Date().toISOString();

    try {
      await stepFunction();
      
      step.status = 'completed';
      step.endTime = new Date().toISOString();
      
      console.log(`✅ Step ${stepId} completed`);
      
    } catch (error) {
      step.status = 'failed';
      step.endTime = new Date().toISOString();
      step.error = error.message;
      
      console.error(`❌ Step ${stepId} failed:`, error);
      throw error;
    }
  }

  private async updatePhaseStatus(status: 'completed' | 'failed'): Promise<void> {
    // In a real implementation, this would update the database
    console.log(`📊 Phase status updated: ${this.result.phaseId} -> ${status}`);
  }

  private async logPhaseCompletion(): Promise<void> {
    const logEntry = {
      timestamp: new Date().toISOString(),
      entryType: 'Implementation',
      summary: `OF-9.2.1: Database & Storage Finalisation completed successfully`,
      phaseRef: 'OF-9.2.1',
      projectRef: 'OF-CloudMig',
      gptDraftEntry: `Phase 9.2.1 completed: Azure SQL provisioned, schema migrated, blob storage cut-over, secrets configured`,
      status: 'completed',
      executionTime: this.getExecutionTime(),
      steps: this.result.steps.map(step => ({
        stepId: step.stepId,
        status: step.status,
        executionTime: step.startTime && step.endTime 
          ? new Date(step.endTime).getTime() - new Date(step.startTime).getTime()
          : null
      }))
    };

    await fs.appendFile('./logs/governance.jsonl', JSON.stringify(logEntry) + '\n');
    console.log('📝 Phase completion logged to governance');
  }

  private async logPhaseFailure(error: Error): Promise<void> {
    const logEntry = {
      timestamp: new Date().toISOString(),
      entryType: 'Implementation',
      summary: `OF-9.2.1: Database & Storage Finalisation failed`,
      phaseRef: 'OF-9.2.1',
      projectRef: 'OF-CloudMig',
      gptDraftEntry: `Phase 9.2.1 failed: ${error.message}`,
      status: 'failed',
      error: error.message,
      executionTime: this.getExecutionTime(),
      failedSteps: this.result.steps.filter(step => step.status === 'failed')
    };

    await fs.appendFile('./logs/governance.jsonl', JSON.stringify(logEntry) + '\n');
    console.log('📝 Phase failure logged to governance');
  }

  private getExecutionTime(): number {
    if (!this.result.endTime) return 0;
    return new Date(this.result.endTime).getTime() - new Date(this.result.startTime).getTime();
  }

  private async saveExecutionResults(): Promise<void> {
    const resultsFile = `./DriveMemory/OF-9.2/phase-9.2.1-execution-results.json`;
    
    await fs.writeFile(resultsFile, JSON.stringify(this.result, null, 2));
    
    console.log(`📊 Execution results saved: ${resultsFile}`);
  }
}

export default Phase921Executor;

// Run if called directly
if (require.main === module) {
  const executor = new Phase921Executor();
  executor.executePhase()
    .then(result => {
      console.log('Phase execution completed:', result.status);
      process.exit(result.status === 'completed' ? 0 : 1);
    })
    .catch(error => {
      console.error('Phase execution failed:', error);
      process.exit(1);
    });
}