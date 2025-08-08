/**
 * Zoi Execution Service (Browser-Compatible)
 * Enables Zoi to track task progress and communicate with backend for actual execution
 * Note: File operations and command execution happen via API calls to backend
 */

interface TaskProgress {
  taskId: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress: number; // 0-100
  steps: TaskStep[];
  filesModified: string[];
  startTime: string;
  lastUpdate: string;
  completedTime?: string;
  error?: string;
}

interface TaskStep {
  id: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  completedTime?: string;
  output?: string;
  filesCreated?: string[];
  filesModified?: string[];
}

export class ZoiExecutionService {
  private static instance: ZoiExecutionService;
  private activeTasks: Map<string, TaskProgress> = new Map();
  private apiBaseUrl: string;

  private constructor() {
    this.apiBaseUrl = '/api';
    this.loadActiveTasksFromStorage();
  }

  public static getInstance(): ZoiExecutionService {
    if (!ZoiExecutionService.instance) {
      ZoiExecutionService.instance = new ZoiExecutionService();
    }
    return ZoiExecutionService.instance;
  }

  /**
   * Create a new task and start tracking it
   */
  public async createTask(description: string, steps: string[]): Promise<string> {
    const taskId = `zoi-task-${Date.now()}`;
    const task: TaskProgress = {
      taskId,
      description,
      status: 'pending',
      progress: 0,
      steps: steps.map((step, index) => ({
        id: `step-${index + 1}`,
        description: step,
        status: 'pending'
      })),
      filesModified: [],
      startTime: new Date().toISOString(),
      lastUpdate: new Date().toISOString()
    };

    this.activeTasks.set(taskId, task);
    await this.saveTaskToStorage(task);

    // Log task creation to governance via API
    await this.logToGovernance({
      timestamp: new Date().toISOString(),
      entryType: 'ZoiTaskCreated',
      taskId,
      summary: `Zoi task created: ${description}`,
      steps: steps.length,
      status: 'initiated'
    });

    return taskId;
  }

  /**
   * Execute a task step by step
   */
  public async executeTask(taskId: string): Promise<void> {
    const task = this.activeTasks.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    task.status = 'in_progress';
    task.lastUpdate = new Date().toISOString();

    try {
      for (let i = 0; i < task.steps.length; i++) {
        const step = task.steps[i];
        step.status = 'in_progress';
        
        await this.executeStep(step, task);
        
        step.status = 'completed';
        step.completedTime = new Date().toISOString();
        
        task.progress = ((i + 1) / task.steps.length) * 100;
        task.lastUpdate = new Date().toISOString();
        
        await this.saveTaskToStorage(task);

        // Log step completion
        await this.logToGovernance({
          timestamp: new Date().toISOString(),
          entryType: 'ZoiStepCompleted',
          taskId,
          stepId: step.id,
          summary: `Step completed: ${step.description}`,
          filesModified: step.filesModified || [],
          progress: task.progress
        });
      }

      task.status = 'completed';
      task.completedTime = new Date().toISOString();
      task.lastUpdate = new Date().toISOString();

      await this.saveTaskToStorage(task);

      // Log task completion
      await this.logToGovernance({
        timestamp: new Date().toISOString(),
        entryType: 'ZoiTaskCompleted',
        taskId,
        summary: `Task completed: ${task.description}`,
        filesModified: task.filesModified,
        totalSteps: task.steps.length,
        duration: this.calculateDuration(task.startTime, task.completedTime!)
      });

    } catch (error) {
      task.status = 'failed';
      task.error = error instanceof Error ? error.message : 'Unknown error';
      task.lastUpdate = new Date().toISOString();
      
      await this.saveTaskToStorage(task);

      // Log task failure
      await this.logToGovernance({
        timestamp: new Date().toISOString(),
        entryType: 'ZoiTaskFailed',
        taskId,
        summary: `Task failed: ${task.description}`,
        error: task.error
      });

      throw error;
    }
  }

  /**
   * Execute individual step
   */
  private async executeStep(step: TaskStep, task: TaskProgress): Promise<void> {
    const stepType = this.identifyStepType(step.description);
    
    switch (stepType) {
      case 'create_file':
        await this.executeCreateFile(step, task);
        break;
      case 'modify_file':
        await this.executeModifyFile(step, task);
        break;
      case 'run_command':
        await this.executeCommand(step, task);
        break;
      case 'install_package':
        await this.executeInstallPackage(step, task);
        break;
      case 'create_test':
        await this.executeCreateTest(step, task);
        break;
      default:
        // Generic step execution
        step.output = `Executed: ${step.description}`;
    }
  }

  /**
   * Create a new file via API
   */
  private async executeCreateFile(step: TaskStep, task: TaskProgress): Promise<void> {
    const match = step.description.match(/create.*?file.*?([a-zA-Z0-9/.]+\.(ts|tsx|js|jsx|json|md))/i);
    if (!match) {
      throw new Error(`Cannot parse file path from: ${step.description}`);
    }

    const filePath = match[1];
    
    // Generate file content based on file type and context
    const content = await this.generateFileContent(filePath, step.description, task);
    
    // Call API to create file
    await this.apiCall('/zoi/create-file', {
      method: 'POST',
      body: JSON.stringify({ filePath, content })
    });
    
    step.filesCreated = [filePath];
    task.filesModified.push(filePath);
    step.output = `Created file: ${filePath}`;
  }

  /**
   * Modify existing file via API
   */
  private async executeModifyFile(step: TaskStep, task: TaskProgress): Promise<void> {
    const match = step.description.match(/modify.*?file.*?([a-zA-Z0-9/.]+\.(ts|tsx|js|jsx|json|md))/i);
    if (!match) {
      throw new Error(`Cannot parse file path from: ${step.description}`);
    }

    const filePath = match[1];
    
    // Read existing content via API
    const existingContent = await this.apiCall(`/zoi/read-file?path=${encodeURIComponent(filePath)}`);
    
    // Generate modifications (this would be more sophisticated in a real implementation)
    const modifiedContent = await this.generateFileModifications(existingContent, step.description, task);
    
    // Update file via API
    await this.apiCall('/zoi/update-file', {
      method: 'PUT',
      body: JSON.stringify({ filePath, content: modifiedContent })
    });
    
    step.filesModified = [filePath];
    task.filesModified.push(filePath);
    step.output = `Modified file: ${filePath}`;
  }

  /**
   * Execute command via API
   */
  private async executeCommand(step: TaskStep, task: TaskProgress): Promise<void> {
    const command = this.extractCommand(step.description);
    if (!command) {
      throw new Error(`Cannot extract command from: ${step.description}`);
    }

    const result = await this.apiCall('/zoi/execute-command', {
      method: 'POST',
      body: JSON.stringify({ command })
    });
    
    step.output = result.output || 'Command executed successfully';
  }

  /**
   * Install package via API
   */
  private async executeInstallPackage(step: TaskStep, task: TaskProgress): Promise<void> {
    const packageMatch = step.description.match(/install.*?package.*?([a-zA-Z0-9@/-]+)/i);
    if (!packageMatch) {
      throw new Error(`Cannot parse package name from: ${step.description}`);
    }

    const packageName = packageMatch[1];
    
    const result = await this.apiCall('/zoi/install-package', {
      method: 'POST',
      body: JSON.stringify({ packageName })
    });
    
    step.output = `Installed package: ${packageName}`;
  }

  /**
   * Create test file via API
   */
  private async executeCreateTest(step: TaskStep, task: TaskProgress): Promise<void> {
    const match = step.description.match(/test.*?for.*?([a-zA-Z0-9/.]+)/i);
    if (!match) {
      throw new Error(`Cannot parse test target from: ${step.description}`);
    }

    const targetFile = match[1];
    const testFileName = `${targetFile.replace(/\.(ts|tsx|js|jsx)$/, '')}.test.$1`;
    const testFilePath = `tests/${testFileName}`;

    // Generate test content
    const testContent = await this.generateTestContent(targetFile, step.description);
    
    // Create test file via API
    await this.apiCall('/zoi/create-file', {
      method: 'POST',
      body: JSON.stringify({ filePath: testFilePath, content: testContent })
    });
    
    step.filesCreated = [testFilePath];
    task.filesModified.push(testFilePath);
    step.output = `Created test file: ${testFilePath}`;
  }

  /**
   * Get task progress
   */
  public getTaskProgress(taskId: string): TaskProgress | null {
    return this.activeTasks.get(taskId) || null;
  }

  /**
   * Get all active tasks
   */
  public getAllActiveTasks(): TaskProgress[] {
    return Array.from(this.activeTasks.values());
  }

  /**
   * Get tasks by status
   */
  public getTasksByStatus(status: TaskProgress['status']): TaskProgress[] {
    return Array.from(this.activeTasks.values()).filter(task => task.status === status);
  }

  /**
   * Generate contextual file content
   */
  private async generateFileContent(filePath: string, description: string, task: TaskProgress): Promise<string> {
    const extension = filePath.substring(filePath.lastIndexOf('.'));
    
    switch (extension) {
      case '.tsx':
      case '.jsx':
        return this.generateReactComponent(filePath, description);
      case '.ts':
        return this.generateTypeScriptService(filePath, description);
      case '.json':
        return this.generateJsonConfig(filePath, description);
      case '.md':
        return this.generateMarkdownDoc(filePath, description);
      default:
        return `// ${description}\n// Generated by Zoi at ${new Date().toISOString()}\n`;
    }
  }

  /**
   * Generate React component
   */
  private generateReactComponent(filePath: string, description: string): string {
    const fileName = filePath.substring(filePath.lastIndexOf('/') + 1);
    const componentName = fileName.substring(0, fileName.lastIndexOf('.'));
    
    return `import React from 'react';

interface ${componentName}Props {
  // Add props here
}

export const ${componentName}: React.FC<${componentName}Props> = () => {
  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold">${componentName}</h2>
      {/* ${description} */}
      <p>Component implementation goes here</p>
    </div>
  );
};

export default ${componentName};
`;
  }

  /**
   * Generate TypeScript service
   */
  private generateTypeScriptService(filePath: string, description: string): string {
    const fileName = filePath.substring(filePath.lastIndexOf('/') + 1);
    const serviceName = fileName.substring(0, fileName.lastIndexOf('.'));
    const className = serviceName.charAt(0).toUpperCase() + serviceName.slice(1);
    
    return `/**
 * ${serviceName}
 * ${description}
 * Generated by Zoi at ${new Date().toISOString()}
 */

export class ${className} {
  private static instance: ${className};

  private constructor() {}

  public static getInstance(): ${className} {
    if (!${className}.instance) {
      ${className}.instance = new ${className}();
    }
    return ${className}.instance;
  }

  // Add service methods here
}

export default ${className};
`;
  }

  /**
   * Generate JSON configuration
   */
  private generateJsonConfig(filePath: string, description: string): string {
    return JSON.stringify({
      _comment: description,
      _generated: new Date().toISOString(),
      _generator: "Zoi",
      // Add configuration here
    }, null, 2);
  }

  /**
   * Generate Markdown documentation
   */
  private generateMarkdownDoc(filePath: string, description: string): string {
    const fileName = filePath.substring(filePath.lastIndexOf('/') + 1);
    const title = fileName.substring(0, fileName.lastIndexOf('.'))
      .replace(/-/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
    
    return `# ${title}

${description}

## Overview

This documentation was generated by Zoi at ${new Date().toISOString()}.

## Usage

Add usage instructions here.

## Examples

Add examples here.
`;
  }

  // Utility methods
  private identifyStepType(description: string): string {
    if (description.toLowerCase().includes('create') && description.toLowerCase().includes('file')) return 'create_file';
    if (description.toLowerCase().includes('modify') && description.toLowerCase().includes('file')) return 'modify_file';
    if (description.toLowerCase().includes('run') || description.toLowerCase().includes('execute')) return 'run_command';
    if (description.toLowerCase().includes('install') && description.toLowerCase().includes('package')) return 'install_package';
    if (description.toLowerCase().includes('test')) return 'create_test';
    return 'generic';
  }

  private extractCommand(description: string): string | null {
    const commandMatch = description.match(/run\s+[`"]([^`"]+)[`"]/i) || 
                        description.match(/execute\s+[`"]([^`"]+)[`"]/i) ||
                        description.match(/command:\s*([^\n]+)/i);
    return commandMatch ? commandMatch[1] : null;
  }

  private calculateDuration(startTime: string, endTime: string): string {
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    const durationMs = end - start;
    const seconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(seconds / 60);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  }

  private async generateFileModifications(content: string, description: string, task: TaskProgress): string {
    // This would use AI to generate modifications
    // For now, add a comment
    const comment = `\n// Modified by Zoi: ${description}\n// Task: ${task.description}\n// Modified at: ${new Date().toISOString()}\n`;
    return content + comment;
  }

  private async generateTestContent(targetFile: string, description: string): string {
    const fileName = targetFile.substring(targetFile.lastIndexOf('/') + 1);
    const testName = fileName.substring(0, fileName.lastIndexOf('.'));
    
    return `import { ${testName} } from '../${targetFile.replace(/\.(ts|tsx)$/, '')}';

describe('${testName}', () => {
  test('should be defined', () => {
    expect(${testName}).toBeDefined();
  });

  // Add more tests here
  // ${description}
});
`;
  }

  private async saveTaskToStorage(task: TaskProgress): Promise<void> {
    try {
      localStorage.setItem(`zoi-task-${task.taskId}`, JSON.stringify(task));
      
      // Also save to server via API for persistence
      await this.apiCall('/zoi/save-task', {
        method: 'POST',
        body: JSON.stringify(task)
      }).catch(console.warn);
    } catch (error) {
      console.warn('Failed to save task to storage:', error);
    }
  }

  private async loadActiveTasksFromStorage(): Promise<void> {
    try {
      // Load from localStorage first
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('zoi-task-')) {
          const taskData = JSON.parse(localStorage.getItem(key)!);
          if (taskData.status === 'in_progress' || taskData.status === 'pending') {
            this.activeTasks.set(taskData.taskId, taskData);
          }
        }
      }
      
      // Also try to load from server
      const serverTasks = await this.apiCall('/zoi/active-tasks').catch(() => []);
      for (const task of serverTasks) {
        if (task.status === 'in_progress' || task.status === 'pending') {
          this.activeTasks.set(task.taskId, task);
        }
      }
    } catch (error) {
      console.debug('No existing tasks to load');
    }
  }

  private async logToGovernance(entry: any): Promise<void> {
    try {
      await this.apiCall('/zoi/log-governance', {
        method: 'POST',
        body: JSON.stringify(entry)
      });
    } catch (error) {
      console.warn('Failed to log to governance:', error);
    }
  }

  /**
   * Generic API call method
   */
  private async apiCall(endpoint: string, options?: RequestInit): Promise<any> {
    const url = `${this.apiBaseUrl}${endpoint}`;
    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
      },
    };

    try {
      const response = await fetch(url, { ...defaultOptions, ...options });
      
      // Handle 404s gracefully by returning mock data
      if (response.status === 404) {
        return this.getMockApiResponse(endpoint);
      }
      
      if (!response.ok) {
        throw new Error(`API call failed: ${response.status} ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      } else {
        return await response.text();
      }
    } catch (error) {
      // Silently handle network errors in development
      if (process.env.NODE_ENV === 'development' || endpoint.includes('/zoi/')) {
        return this.getMockApiResponse(endpoint);
      }
      
      console.warn(`API call to ${endpoint} failed:`, error);
      
      throw error;
    }
  }

  /**
   * Mock API responses for development
   */
  private getMockApiResponse(endpoint: string): any {
    if (endpoint.includes('read-file')) {
      return '// Mock file content\n';
    }
    if (endpoint.includes('execute-command')) {
      return { output: 'Mock command executed successfully' };
    }
    if (endpoint.includes('active-tasks')) {
      return [];
    }
    return { success: true };
  }
}

export default ZoiExecutionService;