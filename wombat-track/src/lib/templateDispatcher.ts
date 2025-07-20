export interface TemplateDispatchResult {
  success: boolean;
  message: string;
  executionId?: string;
  timestamp: Date;
  templateId: string;
  integrationName: string;
  platform?: string;
  duration?: number;
  response?: any;
  error?: string;
}

export interface TemplateDispatcher {
  execute(templateId: string, integrationName: string): Promise<TemplateDispatchResult>;
}

export interface PostDispatchOptions {
  url: string;
  payload: any;
  headers?: Record<string, string>;
  timeout?: number;
}

export async function dispatchViaPost(options: PostDispatchOptions): Promise<TemplateDispatchResult> {
  const startTime = Date.now();
  const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeout || 30000);
    
    const response = await fetch(options.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Execution-ID': executionId,
        ...options.headers
      },
      body: JSON.stringify(options.payload),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    const duration = Date.now() - startTime;
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const responseData = await response.json();
    
    return {
      success: true,
      message: `Successfully dispatched via POST to ${options.url}`,
      executionId,
      timestamp: new Date(),
      templateId: options.payload.templateId || 'unknown',
      integrationName: options.payload.integrationName || 'unknown',
      platform: extractPlatformFromUrl(options.url),
      duration,
      response: responseData
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return {
      success: false,
      message: `Failed to dispatch via POST: ${errorMessage}`,
      executionId,
      timestamp: new Date(),
      templateId: options.payload?.templateId || 'unknown',
      integrationName: options.payload?.integrationName || 'unknown',
      platform: extractPlatformFromUrl(options.url),
      duration,
      error: errorMessage
    };
  }
}

function extractPlatformFromUrl(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    if (hostname.includes('claude')) return 'Claude API';
    if (hostname.includes('github')) return 'GitHub Actions';
    if (hostname.includes('ci')) return 'CI/CD Pipeline';
    return hostname;
  } catch {
    return 'Unknown Platform';
  }
}

const claudeDispatcher: TemplateDispatcher = {
  async execute(templateId: string, integrationName: string): Promise<TemplateDispatchResult> {
    return await dispatchViaPost({
      url: 'https://claude.api.wombattrack.io/trigger',
      payload: {
        templateId,
        integrationName,
        timestamp: new Date().toISOString(),
        source: 'orbis-dashboard'
      },
      headers: {
        'X-API-Version': '1.0',
        'X-Source': 'wombat-track-orbis'
      },
      timeout: 30000
    });
  }
};

const githubDispatcher: TemplateDispatcher = {
  async execute(templateId: string, integrationName: string): Promise<TemplateDispatchResult> {
    return await dispatchViaPost({
      url: 'https://api.github.com/repos/wombat-track/workflows/dispatches',
      payload: {
        ref: 'main',
        inputs: {
          templateId,
          integrationName,
          trigger: 'orbis-dashboard'
        }
      },
      headers: {
        'Authorization': 'token ghp_placeholder_token',
        'Accept': 'application/vnd.github.v3+json'
      },
      timeout: 20000
    });
  }
};

const ciDispatcher: TemplateDispatcher = {
  async execute(templateId: string, integrationName: string): Promise<TemplateDispatchResult> {
    return await dispatchViaPost({
      url: 'https://ci.wombattrack.io/api/v1/trigger',
      payload: {
        pipeline: templateId,
        context: {
          integration: integrationName,
          initiator: 'orbis-dashboard',
          timestamp: new Date().toISOString()
        }
      },
      headers: {
        'X-CI-Token': 'ci_placeholder_token'
      },
      timeout: 25000
    });
  }
};

const defaultDispatcher: TemplateDispatcher = {
  async execute(templateId: string, integrationName: string): Promise<TemplateDispatchResult> {
    console.log(`⚠️  No specific dispatcher found for template ${templateId}, using default simulation`);
    
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    const success = Math.random() > 0.2;
    
    return {
      success,
      message: success 
        ? `Default dispatcher simulated execution for ${templateId}`
        : `Default dispatcher simulation failed for ${templateId}`,
      executionId: `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      templateId,
      integrationName,
      platform: 'Simulation',
      duration: 1000 + Math.random() * 2000,
      error: success ? undefined : 'Simulated failure for testing'
    };
  }
};

const dispatcherMap: Record<string, TemplateDispatcher> = {
  'claude-health-001': claudeDispatcher,
  'github-deploy-002': githubDispatcher,
  'ci-repair-003': ciDispatcher,
};

export async function triggerTemplate(
  templateId: string, 
  integrationName: string
): Promise<TemplateDispatchResult> {
  console.log(`🚀 Triggering template ${templateId} for integration ${integrationName}`);
  
  const dispatcher = dispatcherMap[templateId] || defaultDispatcher;
  
  try {
    const result = await dispatcher.execute(templateId, integrationName);
    
    console.log(`✅ Template execution ${result.success ? 'completed' : 'failed'}:`, {
      templateId,
      integrationName,
      executionId: result.executionId,
      duration: result.duration,
      platform: result.platform
    });
    
    return result;
  } catch (error) {
    console.error(`❌ Template execution failed:`, error);
    
    return {
      success: false,
      message: `Unexpected error during template execution: ${error instanceof Error ? error.message : 'Unknown error'}`,
      executionId: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      templateId,
      integrationName,
      platform: 'Unknown',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}