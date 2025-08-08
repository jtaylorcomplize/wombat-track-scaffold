/**
 * Zoi Chat Integration Service
 * Monitors for Zoi responses and injects them as natural language chat messages
 */

interface ZoiChatResponse {
  requestId: string;
  message: string;
  timestamp: string;
  responseType: 'natural_language' | 'status_update' | 'task_completion' | 'error';
  metadata?: {
    taskStatus?: string;
    filesModified?: string[];
    branchCreated?: string;
    prNumber?: number;
    governanceLogEntry?: string;
  };
}

interface ZoiPersonality {
  greeting: string[];
  taskAcknowledgment: string[];
  completion: string[];
  error: string[];
  workingStatus: string[];
}

export class ZoiChatIntegration {
  private static instance: ZoiChatIntegration;
  private monitoringActive: boolean = false;
  private responseCallbacks: Set<(response: ZoiChatResponse) => void> = new Set();
  
  // Zoi's personality templates for natural language responses
  private personality: ZoiPersonality = {
    greeting: [
      "👋 Zoi here! I'm ready to help with your development tasks.",
      "🤖 Hello! Zoi reporting for duty. What shall we build today?",
      "✨ Zoi online and ready to code. How can I assist you?"
    ],
    taskAcknowledgment: [
      "🎯 Got it! I'm starting work on: {task}",
      "⚡ Task received! Working on: {task}",
      "🚀 On it! Beginning: {task}",
      "📝 Understood! I'll handle: {task}"
    ],
    completion: [
      "✅ Task completed successfully! {details}",
      "🎉 All done! {details}",
      "✨ Task finished! {details}",
      "🏁 Complete! {details}"
    ],
    error: [
      "❌ I encountered an issue: {error}",
      "🚫 Task failed: {error}",
      "⚠️ Problem detected: {error}",
      "🔧 Need assistance with: {error}"
    ],
    workingStatus: [
      "🔨 Still working on {task}... {progress}",
      "⚙️ In progress: {task} - {progress}",
      "🛠️ Coding away on {task}... {progress}",
      "📊 {progress} complete on {task}"
    ]
  };

  private constructor() {
    this.startMonitoring();
  }

  public static getInstance(): ZoiChatIntegration {
    if (!ZoiChatIntegration.instance) {
      ZoiChatIntegration.instance = new ZoiChatIntegration();
    }
    return ZoiChatIntegration.instance;
  }

  /**
   * Start monitoring for Zoi responses
   */
  public startMonitoring(): void {
    if (this.monitoringActive) return;
    
    this.monitoringActive = true;
    console.log('🤖 Zoi chat monitoring started');
    
    // Monitor multiple response channels
    this.monitorGovernanceLog();
    this.monitorMemoryPlugin(); 
    this.monitorAgentResponses();
    
    // Periodic check every 5 seconds
    setInterval(() => {
      this.checkForResponses();
    }, 5000);
  }

  /**
   * Stop monitoring
   */
  public stopMonitoring(): void {
    this.monitoringActive = false;
    console.log('🤖 Zoi chat monitoring stopped');
  }

  /**
   * Subscribe to Zoi chat responses
   */
  public onZoiResponse(callback: (response: ZoiChatResponse) => void): void {
    this.responseCallbacks.add(callback);
  }

  /**
   * Unsubscribe from responses
   */
  public offZoiResponse(callback: (response: ZoiChatResponse) => void): void {
    this.responseCallbacks.delete(callback);
  }

  /**
   * Send a message to Zoi and expect a chat response
   */
  public async sendMessageToZoi(message: string, context?: string): Promise<string> {
    const requestId = `zoi-chat-${Date.now()}`;
    
    // Create structured prompt for Zoi
    const prompt = {
      timestamp: new Date().toISOString(),
      requestId,
      targetAgent: "zoi",
      trigger: "ChatConversation",
      message,
      context: context || "Direct chat conversation",
      responseExpected: true,
      responseChannel: "chat-ui",
      responseFormat: "natural_language",
      expectDirectChatResponse: true
    };

    // Write to memory plugin for Zoi to pick up
    await this.writeToMemoryPlugin(prompt);

    // Return immediate acknowledgment
    const ack = this.getRandomMessage(this.personality.taskAcknowledgment)
      .replace('{task}', message.substring(0, 50) + '...');
    
    // Set up response monitoring for this specific request
    this.setupResponseMonitoring(requestId);
    
    return ack;
  }

  /**
   * Monitor governance log for Zoi responses
   */
  private async monitorGovernanceLog(): Promise<void> {
    // This would typically use file watching or polling
    // For now, we'll check periodically in checkForResponses()
  }

  /**
   * Monitor memory plugin for Zoi responses
   */
  private async monitorMemoryPlugin(): Promise<void> {
    // Monitor logs/memoryplugin/ for Zoi response entries
  }

  /**
   * Monitor agent response files
   */
  private async monitorAgentResponses(): Promise<void> {
    // Monitor logs/agents/ for zoi-response-*.json files
  }

  /**
   * Check for new responses from Zoi
   */
  private async checkForResponses(): Promise<void> {
    if (!this.monitoringActive) return;

    try {
      // Check for new governance entries from Zoi
      await this.checkGovernanceEntries();
      
      // Check for agent response files
      await this.checkAgentResponseFiles();
      
      // Check memory plugin responses
      await this.checkMemoryPluginResponses();
      
    } catch (error) {
      console.error('Error checking for Zoi responses:', error);
    }
  }

  /**
   * Check governance log for Zoi entries
   */
  private async checkGovernanceEntries(): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const content = await fs.readFile('logs/governance.jsonl', 'utf-8');
      const lines = content.trim().split('\n');
      
      // Check recent entries (last 10)
      const recentLines = lines.slice(-10);
      
      for (const line of recentLines) {
        try {
          const entry = JSON.parse(line);
          
          if (this.isZoiResponse(entry)) {
            const chatResponse = this.convertToChat(entry);
            this.broadcastResponse(chatResponse);
          }
        } catch (parseError) {
          // Skip invalid JSON lines
        }
      }
    } catch (error) {
      console.debug('Could not read governance log:', error);
    }
  }

  /**
   * Check agent response files
   */
  private async checkAgentResponseFiles(): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      const agentsDir = 'logs/agents/';
      const files = await fs.readdir(agentsDir).catch(() => []);
      
      const zoiResponseFiles = files.filter(f => 
        f.startsWith('zoi-response-') && f.endsWith('.json')
      );
      
      for (const file of zoiResponseFiles) {
        const filePath = path.join(agentsDir, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const response = JSON.parse(content);
        
        if (this.isRecentResponse(response)) {
          const chatResponse = this.convertToChat(response);
          this.broadcastResponse(chatResponse);
        }
      }
    } catch (error) {
      console.debug('Could not check agent response files:', error);
    }
  }

  /**
   * Check memory plugin for responses
   */
  private async checkMemoryPluginResponses(): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const content = await fs.readFile('logs/memoryplugin/agent_comm.jsonl', 'utf-8');
      const lines = content.trim().split('\n');
      
      // Look for response entries from Zoi
      const recentLines = lines.slice(-5);
      
      for (const line of recentLines) {
        try {
          const entry = JSON.parse(line);
          
          if (entry.sourceAgent === 'zoi' && entry.messageType === 'response') {
            const chatResponse = this.convertToChat(entry);
            this.broadcastResponse(chatResponse);
          }
        } catch (parseError) {
          // Skip invalid JSON lines
        }
      }
    } catch (error) {
      console.debug('Could not read memory plugin responses:', error);
    }
  }

  /**
   * Check if entry is from Zoi
   */
  private isZoiResponse(entry: any): boolean {
    return entry.entryType === 'ZoiCommunication' || 
           entry.entryType === 'ZoiResponse' ||
           entry.sourceAgent === 'zoi' ||
           (entry.summary && entry.summary.toLowerCase().includes('zoi'));
  }

  /**
   * Check if response is recent (within last 30 seconds)
   */
  private isRecentResponse(response: any): boolean {
    if (!response.timestamp) return false;
    
    const responseTime = new Date(response.timestamp).getTime();
    const now = Date.now();
    const thirtySecondsAgo = now - (30 * 1000);
    
    return responseTime > thirtySecondsAgo;
  }

  /**
   * Convert structured response to chat format
   */
  private convertToChat(entry: any): ZoiChatResponse {
    let message = '';
    let responseType: ZoiChatResponse['responseType'] = 'natural_language';

    // Generate natural language message based on entry type
    if (entry.status === 'completed' || entry.entryType?.includes('Completion')) {
      const details = this.extractCompletionDetails(entry);
      message = this.getRandomMessage(this.personality.completion)
        .replace('{details}', details);
      responseType = 'task_completion';
    } else if (entry.status === 'error' || entry.error) {
      message = this.getRandomMessage(this.personality.error)
        .replace('{error}', entry.error || entry.summary || 'Unknown error');
      responseType = 'error';
    } else if (entry.status === 'in_progress') {
      message = this.getRandomMessage(this.personality.workingStatus)
        .replace('{task}', entry.summary || 'task')
        .replace('{progress}', entry.progress || 'working');
      responseType = 'status_update';
    } else {
      // Default natural language response
      message = entry.message || entry.summary || 'Task acknowledged';
    }

    return {
      requestId: entry.requestId || `zoi-${Date.now()}`,
      message,
      timestamp: entry.timestamp || new Date().toISOString(),
      responseType,
      metadata: {
        taskStatus: entry.status,
        filesModified: entry.filesModified || entry.deliverables,
        branchCreated: entry.branchName,
        governanceLogEntry: entry.entryType
      }
    };
  }

  /**
   * Extract completion details from entry
   */
  private extractCompletionDetails(entry: any): string {
    const details = [];
    
    if (entry.filesModified?.length) {
      details.push(`Modified ${entry.filesModified.length} files`);
    }
    if (entry.branchName) {
      details.push(`Created branch: ${entry.branchName}`);
    }
    if (entry.testsCreated) {
      details.push('Tests included');
    }
    if (entry.prNumber) {
      details.push(`PR #${entry.prNumber} created`);
    }

    return details.length > 0 ? details.join(', ') : 'Task completed successfully';
  }

  /**
   * Get random message from personality array
   */
  private getRandomMessage(messages: string[]): string {
    return messages[Math.floor(Math.random() * messages.length)];
  }

  /**
   * Broadcast response to all subscribers
   */
  private broadcastResponse(response: ZoiChatResponse): void {
    this.responseCallbacks.forEach(callback => {
      try {
        callback(response);
      } catch (error) {
        console.error('Error in Zoi response callback:', error);
      }
    });
  }

  /**
   * Write prompt to memory plugin
   */
  private async writeToMemoryPlugin(prompt: any): Promise<void> {
    try {
      const fs = await import('fs/promises');
      await fs.appendFile('logs/memoryplugin/agent_comm.jsonl', JSON.stringify(prompt) + '\n');
    } catch (error) {
      console.error('Failed to write to memory plugin:', error);
    }
  }

  /**
   * Set up response monitoring for specific request
   */
  private setupResponseMonitoring(requestId: string): void {
    // Set up specific monitoring for this request
    // This could include webhooks, file watchers, etc.
    console.log(`🔍 Monitoring for Zoi response to request: ${requestId}`);
  }
}

export default ZoiChatIntegration;