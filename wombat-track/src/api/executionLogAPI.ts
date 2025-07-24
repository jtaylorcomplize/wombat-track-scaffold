import type { TemplateExecution } from '../types/template';

// Mocked store - simulates backend persistence
const executionStore: TemplateExecution[] = [];

/**
 * Log a new execution entry to the persistent store
 */
export async function logExecution(execution: TemplateExecution): Promise<void> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
  
  executionStore.push(execution);
  console.log(`📝 Logged execution ${execution.id} to API store:`, {
    id: execution.id,
    templateId: execution.templateId,
    integrationName: execution.integrationName,
    status: execution.status,
    platform: execution.platform
  });
}

/**
 * Update an existing execution entry in the persistent store
 */
export async function updateExecution(id: string, updates: Partial<TemplateExecution>): Promise<void> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 30 + Math.random() * 70));
  
  const index = executionStore.findIndex(exec => exec.id === id);
  if (index !== -1) {
    executionStore[index] = { ...executionStore[index], ...updates };
    console.log(`🔄 Updated execution ${id} in API store:`, updates);
  } else {
    console.warn(`⚠️ Execution ${id} not found in API store for update`);
  }
}

/**
 * Fetch all execution logs from the persistent store, sorted by most recent first
 */
export async function fetchExecutionLogs(): Promise<TemplateExecution[]> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
  
  const logs = [...executionStore].sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
  console.log(`📋 Fetched ${logs.length} execution logs from API store`);
  
  return logs;
}

/**
 * Get executions for a specific integration
 */
export async function fetchExecutionsByIntegration(integrationId: string): Promise<TemplateExecution[]> {
  await new Promise(resolve => setTimeout(resolve, 80 + Math.random() * 120));
  
  const logs = executionStore
    .filter(exec => exec.integrationId === integrationId)
    .sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
    
  console.log(`📋 Fetched ${logs.length} execution logs for integration ${integrationId}`);
  
  return logs;
}

/**
 * Clear all execution logs (useful for testing)
 */
export async function clearExecutionLogs(): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 50));
  
  const count = executionStore.length;
  executionStore.length = 0;
  console.log(`🗑️ Cleared ${count} execution logs from API store`);
}

/**
 * Get execution statistics
 */
export async function getExecutionStats(): Promise<{
  total: number;
  successful: number;
  failed: number;
  inProgress: number;
}> {
  await new Promise(resolve => setTimeout(resolve, 60));
  
  const stats = {
    total: executionStore.length,
    successful: executionStore.filter(e => e.status === 'done').length,
    failed: executionStore.filter(e => e.status === 'error').length,
    inProgress: executionStore.filter(e => e.status === 'in_progress' || e.status === 'queued').length
  };
  
  console.log(`📊 Execution stats:`, stats);
  
  return stats;
}