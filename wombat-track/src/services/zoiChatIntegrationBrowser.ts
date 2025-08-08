/**
 * Browser-compatible Zoi Chat Integration Service
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
  private apiBaseUrl: string;
  
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
      "❌ Encountered an issue: {error}",
      "🔧 Hit a snag: {error}",
      "⚠️ Something went wrong: {error}",
      "🚨 Error occurred: {error}"
    ],
    workingStatus: [
      "⚙️ Working on it...",
      "🔄 Processing your request...",
      "⚡ Making progress...",
      "🎯 On it!"
    ]
  };

  private constructor() {
    this.apiBaseUrl = '/api';
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
    console.log('[ZoiChat] Started monitoring for responses');

    // Browser-compatible polling for responses
    setInterval(() => {
      this.pollForResponses();
    }, 2000);
  }

  /**
   * Stop monitoring
   */
  public stopMonitoring(): void {
    this.monitoringActive = false;
    console.log('[ZoiChat] Stopped monitoring');
  }

  /**
   * Register callback for responses
   */
  public onResponse(callback: (response: ZoiChatResponse) => void): void {
    this.responseCallbacks.add(callback);
  }

  /**
   * Register callback for Zoi responses (compatibility alias)
   */
  public onZoiResponse(callback: (response: ZoiChatResponse) => void): void {
    this.responseCallbacks.add(callback);
  }

  /**
   * Remove response callback
   */
  public removeResponseCallback(callback: (response: ZoiChatResponse) => void): void {
    this.responseCallbacks.delete(callback);
  }

  /**
   * Send message to Zoi
   */
  public async sendMessage(message: string, context?: string): Promise<ZoiChatResponse> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/zoi/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          context,
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`Chat API failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.warn('[ZoiChat] API call failed, using mock response:', error);
      
      // Generate mock response for development
      return this.generateMockResponse(message);
    }
  }

  /**
   * Poll for new responses
   */
  private async pollForResponses(): Promise<void> {
    if (!this.monitoringActive) return;

    try {
      const response = await fetch(`${this.apiBaseUrl}/zoi/responses`);
      
      if (response.ok) {
        const responses: ZoiChatResponse[] = await response.json();
        
        for (const chatResponse of responses) {
          this.notifyCallbacks(chatResponse);
        }
      }
    } catch (error) {
      // Silently ignore polling errors for development
    }
  }

  /**
   * Notify all registered callbacks
   */
  private notifyCallbacks(response: ZoiChatResponse): void {
    for (const callback of this.responseCallbacks) {
      try {
        callback(response);
      } catch (error) {
        console.warn('[ZoiChat] Callback error:', error);
      }
    }
  }

  /**
   * Generate mock response for development
   */
  private generateMockResponse(message: string): ZoiChatResponse {
    const randomGreeting = this.personality.greeting[Math.floor(Math.random() * this.personality.greeting.length)];
    const randomAck = this.personality.taskAcknowledgment[Math.floor(Math.random() * this.personality.taskAcknowledgment.length)];
    
    let responseMessage = randomGreeting;
    
    if (message.toLowerCase().includes('implement') || message.toLowerCase().includes('create')) {
      responseMessage = randomAck.replace('{task}', message.substring(0, 50));
    }

    return {
      requestId: `mock_${Date.now()}`,
      message: responseMessage,
      timestamp: new Date().toISOString(),
      responseType: 'natural_language',
      metadata: {
        taskStatus: 'mock_mode'
      }
    };
  }

  /**
   * Get personality templates
   */
  public getPersonality(): ZoiPersonality {
    return this.personality;
  }

  /**
   * Check if monitoring is active
   */
  public isMonitoringActive(): boolean {
    return this.monitoringActive;
  }
}

export default ZoiChatIntegration;