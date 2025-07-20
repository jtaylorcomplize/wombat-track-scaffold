// Template Dispatcher for triggering real workflows
// Handles Claude, GitHub, and other template integrations

export interface TemplateDispatchResult {
  success: boolean;
  message: string;
  executionId?: string;
  timestamp: Date;
}

export interface TemplateDispatcher {
  execute: (templateId: string, integrationName: string) => Promise<TemplateDispatchResult>;
}

// Mock Claude API dispatcher
const claudeDispatcher: TemplateDispatcher = {
  execute: async (templateId: string, integrationName: string) => {
    console.log(`📨 [Claude] Dispatching template ${templateId} for ${integrationName}`);
    
    // Simulate Claude API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const result: TemplateDispatchResult = {
      success: true,
      message: `Claude template executed successfully`,
      executionId: `claude-exec-${Date.now()}`,
      timestamp: new Date()
    };
    
    console.log(`✅ [Claude] Template ${templateId} dispatch completed - Execution ID: ${result.executionId}`);
    return result;
  }
};

// Mock GitHub Actions dispatcher
const githubDispatcher: TemplateDispatcher = {
  execute: async (templateId: string, integrationName: string) => {
    console.log(`📨 [GitHub] Dispatching workflow ${templateId} for ${integrationName}`);
    
    // Simulate GitHub API call
    await new Promise(resolve => setTimeout(resolve, 1200));
    
    const result: TemplateDispatchResult = {
      success: true,
      message: `GitHub workflow triggered successfully`,
      executionId: `github-run-${Date.now()}`,
      timestamp: new Date()
    };
    
    console.log(`✅ [GitHub] Template ${templateId} dispatch completed - Run ID: ${result.executionId}`);
    return result;
  }
};

// Mock CI/CD dispatcher
const ciDispatcher: TemplateDispatcher = {
  execute: async (templateId: string, integrationName: string) => {
    console.log(`📨 [CI/CD] Dispatching pipeline ${templateId} for ${integrationName}`);
    
    // Simulate CI/CD API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const result: TemplateDispatchResult = {
      success: true,
      message: `CI pipeline triggered successfully`,
      executionId: `ci-pipeline-${Date.now()}`,
      timestamp: new Date()
    };
    
    console.log(`✅ [CI/CD] Template ${templateId} dispatch completed - Pipeline ID: ${result.executionId}`);
    return result;
  }
};

// Default mock dispatcher for other integrations
const defaultDispatcher: TemplateDispatcher = {
  execute: async (templateId: string, integrationName: string) => {
    console.log(`📨 [Generic] Dispatching template ${templateId} for ${integrationName}`);
    
    // Simulate generic API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const result: TemplateDispatchResult = {
      success: true,
      message: `Template executed successfully`,
      executionId: `generic-exec-${Date.now()}`,
      timestamp: new Date()
    };
    
    console.log(`✅ [Generic] Template ${templateId} dispatch completed - Execution ID: ${result.executionId}`);
    return result;
  }
};

// Dispatcher mapping based on template ID patterns
const dispatcherMap: Record<string, TemplateDispatcher> = {
  'claude-health-001': claudeDispatcher,
  'claude-sync-setup': claudeDispatcher,
  'github-deploy-002': githubDispatcher,
  'github-workflow-deploy': githubDispatcher,
  'ci-repair-003': ciDispatcher,
  'ci-pipeline-repair': ciDispatcher,
  'sync-recovery-004': defaultDispatcher,
  'memory-opt-005': defaultDispatcher,
  'bubble-setup-006': defaultDispatcher,
};

/**
 * Main function to trigger template execution
 * Routes to appropriate dispatcher based on templateId
 */
export async function triggerTemplate(
  templateId: string, 
  integrationName: string
): Promise<TemplateDispatchResult> {
  try {
    console.log(`🚀 Triggering template: ${templateId} for integration: ${integrationName}`);
    
    // Find appropriate dispatcher or use default
    const dispatcher = dispatcherMap[templateId] || defaultDispatcher;
    
    // Execute template
    const result = await dispatcher.execute(templateId, integrationName);
    
    console.log(`✅ Template "${templateId}" dispatch completed successfully`);
    return result;
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error(`❌ Template dispatch failed for ${templateId}:`, errorMessage);
    
    return {
      success: false,
      message: `Template dispatch failed: ${errorMessage}`,
      timestamp: new Date()
    };
  }
}

/**
 * Get available dispatchers for debugging/monitoring
 */
export function getAvailableDispatchers(): string[] {
  return Object.keys(dispatcherMap);
}

/**
 * Add or update a dispatcher for a specific template ID
 */
export function registerDispatcher(templateId: string, dispatcher: TemplateDispatcher): void {
  dispatcherMap[templateId] = dispatcher;
  console.log(`📝 Registered dispatcher for template: ${templateId}`);
}