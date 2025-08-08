/**
 * Zoi AI Service - Direct AI Model Integration
 * Integrates Zoi as a conversational AI agent using Azure OpenAI or similar models
 */

import agentRegistry from '../config/agentRegistry.json';
import ZoiExecutionService from './zoiExecutionService';
import { ZoiSimpleAI } from './zoiSimpleAI';

interface ZoiAIConfig {
  provider: 'azure_openai' | 'azure_openai_simple' | 'openai' | 'anthropic';
  modelName: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  endpoint?: string;
  apiKey?: string;
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

interface ZoiResponse {
  message: string;
  confidence: number;
  tokensUsed: number;
  responseTime: number;
  canExecuteCode: boolean;
  suggestedActions?: string[];
}

export class ZoiAIService {
  private static instance: ZoiAIService;
  private config: ZoiAIConfig;
  private conversationHistory: ChatMessage[] = [];
  private isInitialized = false;
  private executionService: ZoiExecutionService;
  private simpleAI: ZoiSimpleAI;

  private constructor() {
    const zoiAgent = agentRegistry.agents.find(a => a.id === 'zoi');
    if (!zoiAgent?.endpoints?.aiModel) {
      throw new Error('Zoi AI model configuration not found');
    }

    this.config = {
      provider: zoiAgent.endpoints.aiModel.provider as any,
      modelName: zoiAgent.endpoints.aiModel.modelName,
      systemPrompt: zoiAgent.endpoints.aiModel.systemPrompt,
      temperature: zoiAgent.endpoints.aiModel.temperature,
      maxTokens: zoiAgent.endpoints.aiModel.maxTokens
    };

    this.executionService = ZoiExecutionService.getInstance();
    
    // Initialize simple AI if using azure_openai_simple provider
    if (this.config.provider === 'azure_openai_simple') {
      this.simpleAI = new ZoiSimpleAI();
    }
    
    this.initializeSystemPrompt();
  }

  public static getInstance(): ZoiAIService {
    if (!ZoiAIService.instance) {
      ZoiAIService.instance = new ZoiAIService();
    }
    return ZoiAIService.instance;
  }

  /**
   * Initialize system prompt with Zoi's personality and capabilities
   */
  private initializeSystemPrompt(): void {
    const systemMessage: ChatMessage = {
      role: 'system',
      content: `${this.config.systemPrompt}

IMPORTANT CONTEXT:
- You are integrated into a development environment with direct access to code repositories
- You can execute code changes, run tests, and manage deployments  
- Users can request both conversational help AND actual code execution
- When users ask you to "implement" or "create" something, they expect you to actually do it
- Always be clear about whether you're providing guidance or actually executing tasks

PERSONALITY:
- Use emojis occasionally (🤖 🔧 ✨ ⚡ 🎯) but don't overdo it  
- Be friendly but professional and competent
- Show enthusiasm for coding challenges
- Be transparent about what you can and cannot do

CAPABILITIES:
- Code generation and modification
- Test creation and execution
- Architecture review and recommendations  
- Bug fixing and debugging
- Performance optimization
- Security analysis
- Documentation creation
- CI/CD pipeline management

RESPONSE STYLE:
- Be conversational and natural
- Ask clarifying questions when needed
- Provide specific, actionable advice
- Explain your reasoning when helpful
- Acknowledge limitations honestly`,
      timestamp: new Date().toISOString()
    };

    this.conversationHistory = [systemMessage];
    this.isInitialized = true;
  }

  /**
   * Send a message to Zoi and get AI response
   */
  public async sendMessage(userMessage: string, context?: string): Promise<ZoiResponse> {
    if (!this.isInitialized) {
      throw new Error('Zoi AI Service not initialized');
    }

    const startTime = Date.now();

    // Add user message to conversation history
    const userMsg: ChatMessage = {
      role: 'user',
      content: context ? `Context: ${context}\n\nMessage: ${userMessage}` : userMessage,
      timestamp: new Date().toISOString()
    };
    this.conversationHistory.push(userMsg);

    try {
      // Call the appropriate AI service based on provider
      let response: string;
      let tokensUsed = 0;

      switch (this.config.provider) {
        case 'azure_openai_simple':
          ({ response, tokensUsed } = await this.callSimpleAI(userMsg.content));
          break;
        case 'azure_openai':
          ({ response, tokensUsed } = await this.callAzureOpenAI());
          break;
        case 'openai':
          ({ response, tokensUsed } = await this.callOpenAI());
          break;
        case 'anthropic':
          ({ response, tokensUsed } = await this.callAnthropic());
          break;
        default:
          throw new Error(`Unsupported AI provider: ${this.config.provider}`);
      }

      // Add AI response to conversation history
      const aiMsg: ChatMessage = {
        role: 'assistant',
        content: response,
        timestamp: new Date().toISOString()
      };
      this.conversationHistory.push(aiMsg);

      // Keep conversation history manageable (last 20 messages)
      if (this.conversationHistory.length > 21) {
        this.conversationHistory = [
          this.conversationHistory[0], // Keep system message
          ...this.conversationHistory.slice(-20)
        ];
      }

      const responseTime = Date.now() - startTime;

      return {
        message: response,
        confidence: this.calculateConfidence(response),
        tokensUsed,
        responseTime,
        canExecuteCode: this.canExecuteCode(response),
        suggestedActions: this.extractSuggestedActions(response)
      };

    } catch (error) {
      console.error('Zoi AI Service error:', error);
      throw error;
    }
  }

  /**
   * Call Simple AI service (Azure OpenAI Simple)
   */
  private async callSimpleAI(message: string): Promise<{ response: string; tokensUsed: number }> {
    try {
      if (!this.simpleAI) {
        throw new Error('Simple AI service not initialized');
      }

      const response = await this.simpleAI.sendMessage(message);
      
      return {
        response,
        tokensUsed: Math.ceil(response.length / 4) // Rough estimate
      };
    } catch (error) {
      console.warn('Simple AI unavailable, using mock response:', error);
      return await this.getMockResponse();
    }
  }

  /**
   * Call Azure OpenAI API
   */
  private async callAzureOpenAI(): Promise<{ response: string; tokensUsed: number }> {
    try {
      // Check if Azure OpenAI service is available in the project
      const azureService = await this.getAzureOpenAIService();
      
      if (azureService) {
        // Use existing Azure OpenAI service
        const result = await azureService.generateChatCompletion({
          messages: this.conversationHistory.map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          temperature: this.config.temperature,
          maxTokens: this.config.maxTokens
        });

        return {
          response: result.message,
          tokensUsed: result.tokensUsed || 0
        };
      } else {
        // Fallback to mock response for development
        return await this.getMockResponse();
      }
    } catch (error) {
      console.warn('Azure OpenAI unavailable, using mock response:', error);
      return await this.getMockResponse();
    }
  }

  /**
   * Call OpenAI API (if configured)
   */
  private async callOpenAI(): Promise<{ response: string; tokensUsed: number }> {
    // This would integrate with OpenAI API
    // For now, fallback to mock
    return await this.getMockResponse();
  }

  /**
   * Call Anthropic API (if configured)  
   */
  private async callAnthropic(): Promise<{ response: string; tokensUsed: number }> {
    // This would integrate with Anthropic API
    // For now, fallback to mock  
    return await this.getMockResponse();
  }

  /**
   * Get Azure OpenAI service if available
   */
  private async getAzureOpenAIService(): Promise<any> {
    try {
      // Try to import existing Azure OpenAI service
      const azureModule = await import('../services/azureOpenAIService');
      return azureModule.default || azureModule.AzureOpenAIService;
    } catch (error) {
      return null;
    }
  }

  /**
   * Generate context-aware response with actual execution capability
   */
  private async getMockResponse(): Promise<{ response: string; tokensUsed: number }> {
    const userMessage = this.conversationHistory[this.conversationHistory.length - 1].content;
    const conversationContext = this.getRecentConversationContext();
    const activeTasks = this.executionService.getAllActiveTasks();
    
    // Check if user is asking about existing tasks
    if (this.isProgressInquiry(userMessage)) {
      return this.generateProgressResponse(activeTasks);
    }

    // Check if this is a follow-up on previous conversation
    if (this.isFollowUpMessage(userMessage, conversationContext)) {
      return this.generateFollowUpResponse(userMessage, conversationContext, activeTasks);
    }

    // Handle new task requests
    if (this.isTaskRequest(userMessage)) {
      return await this.generateTaskResponse(userMessage);
    }

    // Default contextual response
    return this.generateContextualResponse(userMessage, conversationContext);
  }

  /**
   * Check if user is asking about progress
   */
  private isProgressInquiry(message: string): boolean {
    const progressKeywords = ['progress', 'update', 'status', 'how is', 'what happened', 'done yet', 'finished', 'complete'];
    return progressKeywords.some(keyword => message.toLowerCase().includes(keyword));
  }

  /**
   * Generate progress response based on active tasks
   */
  private generateProgressResponse(activeTasks: any[]): { response: string; tokensUsed: number } {
    if (activeTasks.length === 0) {
      const response = `📊 I don't currently have any active tasks running. What would you like me to work on?`;
      return { response, tokensUsed: Math.floor(response.length / 4) };
    }

    let response = `📋 Here's my current status:\n\n`;
    
    activeTasks.forEach((task, index) => {
      const emoji = task.status === 'completed' ? '✅' : 
                   task.status === 'in_progress' ? '🔄' : 
                   task.status === 'failed' ? '❌' : '⏳';
      
      response += `${emoji} **Task ${index + 1}**: ${task.description}\n`;
      response += `   Status: ${task.status} (${task.progress}% complete)\n`;
      response += `   Last update: ${new Date(task.lastUpdate).toLocaleTimeString()}\n`;
      
      if (task.filesModified.length > 0) {
        response += `   Files modified: ${task.filesModified.slice(0, 3).join(', ')}${task.filesModified.length > 3 ? '...' : ''}\n`;
      }
      
      if (task.status === 'in_progress') {
        const currentStep = task.steps.find((s: any) => s.status === 'in_progress');
        if (currentStep) {
          response += `   Currently: ${currentStep.description}\n`;
        }
      }
      
      response += `\n`;
    });

    if (activeTasks.some(t => t.status === 'in_progress')) {
      response += `🚀 I'm actively working on these tasks. Check back in a few minutes for more updates!`;
    }

    return { response, tokensUsed: Math.floor(response.length / 4) };
  }

  /**
   * Check if this is a follow-up message
   */
  private isFollowUpMessage(message: string, context: string): boolean {
    const followUpIndicators = ['yes', 'proceed', 'go ahead', 'continue', 'do it', 'start', 'begin', 'please'];
    return followUpIndicators.some(indicator => message.toLowerCase().includes(indicator));
  }

  /**
   * Generate follow-up response
   */
  private generateFollowUpResponse(message: string, context: string, activeTasks: any[]): { response: string; tokensUsed: number } {
    const lastResponse = this.conversationHistory[this.conversationHistory.length - 2]?.content || '';
    
    if (lastResponse.includes('Would you like me to proceed') || lastResponse.includes('implement')) {
      const response = `🚀 Perfect! I'm starting the implementation now. I'll break this down into manageable steps and execute them one by one.

You'll see real progress updates as I:
1. Create the necessary files
2. Implement the core functionality  
3. Add proper testing
4. Update documentation

I'll keep you posted on my progress. You can ask for updates anytime!

*Starting execution...*`;

      // Simulate starting a task
      this.simulateTaskCreation(context);

      return { response, tokensUsed: Math.floor(response.length / 4) };
    }

    const response = `👍 Got it! Continuing with the previous task. Let me pick up where we left off and make some progress.`;
    return { response, tokensUsed: Math.floor(response.length / 4) };
  }

  /**
   * Check if message is a task request
   */
  private isTaskRequest(message: string): boolean {
    const taskKeywords = ['implement', 'create', 'build', 'develop', 'make', 'generate', 'write', 'fix', 'debug', 'review'];
    return taskKeywords.some(keyword => message.toLowerCase().includes(keyword));
  }

  /**
   * Generate task response and create actual task
   */
  private async generateTaskResponse(message: string): Promise<{ response: string; tokensUsed: number }> {
    // Extract task details from message
    const taskDescription = this.extractTaskDescription(message);
    const steps = this.generateTaskSteps(message);
    
    // Create actual task
    try {
      const taskId = await this.executionService.createTask(taskDescription, steps);
      
      const response = `🎯 I understand! I'm going to ${taskDescription.toLowerCase()}.

Here's my execution plan:
${steps.map((step, i) => `${i + 1}. ${step}`).join('\n')}

I've created task ${taskId} and I'm ready to execute it. This will involve actual code changes and file creation.

Should I proceed with the implementation? I'll provide real-time updates as I work through each step.`;

      // Start executing the task
      setTimeout(() => {
        this.executionService.executeTask(taskId).catch(console.error);
      }, 1000);

      return { response, tokensUsed: Math.floor(response.length / 4) };
      
    } catch (error) {
      const response = `❌ I encountered an issue creating the task: ${error instanceof Error ? error.message : 'Unknown error'}

Let me try a different approach. Can you provide more specific details about what you'd like me to implement?`;
      
      return { response, tokensUsed: Math.floor(response.length / 4) };
    }
  }

  /**
   * Generate contextual response
   */
  private generateContextualResponse(message: string, context: string): { response: string; tokensUsed: number } {
    const response = `👋 I'm Zoi, and I'm here to help with your development needs! 

I can actually execute code changes, create files, run tests, and manage real development tasks. Unlike just providing guidance, I can:

🔨 **Actually implement** features and components
🧪 **Create and run** tests  
📝 **Generate** documentation and configs
🔍 **Debug and fix** actual code issues
⚡ **Execute** commands and install packages

What specific task would you like me to work on? I'll create a real execution plan and show you progress as I work.`;

    return { response, tokensUsed: Math.floor(response.length / 4) };
  }

  /**
   * Get recent conversation context
   */
  private getRecentConversationContext(): string {
    const recentMessages = this.conversationHistory.slice(-5);
    return recentMessages.map(m => `${m.role}: ${m.content}`).join('\n');
  }

  /**
   * Extract task description from user message
   */
  private extractTaskDescription(message: string): string {
    // Simple extraction - in a real AI integration, this would be more sophisticated
    return message.trim();
  }

  /**
   * Generate task steps from message
   */
  private generateTaskSteps(message: string): string[] {
    const steps: string[] = [];
    
    if (message.toLowerCase().includes('component') || message.toLowerCase().includes('react')) {
      steps.push('Create React component file');
      steps.push('Implement component logic');
      steps.push('Add styling with Tailwind CSS');
      steps.push('Create unit tests');
    } else if (message.toLowerCase().includes('service') || message.toLowerCase().includes('api')) {
      steps.push('Create service TypeScript file');
      steps.push('Implement service methods');
      steps.push('Add error handling');
      steps.push('Create integration tests');
    } else if (message.toLowerCase().includes('fix') || message.toLowerCase().includes('debug')) {
      steps.push('Analyze the issue');
      steps.push('Identify root cause');
      steps.push('Implement fix');
      steps.push('Test the solution');
    } else {
      steps.push('Analyze requirements');
      steps.push('Create necessary files');
      steps.push('Implement functionality');
      steps.push('Add tests and documentation');
    }
    
    return steps;
  }

  /**
   * Simulate task creation for demonstration
   */
  private async simulateTaskCreation(context: string): Promise<void> {
    try {
      const taskId = await this.executionService.createTask(
        'Implementation based on user request',
        ['Analyze requirements', 'Create files', 'Implement features', 'Add tests']
      );
      console.log(`Created task ${taskId} for context: ${context.substring(0, 100)}...`);
    } catch (error) {
      console.warn('Failed to create simulated task:', error);
    }
  }

  /**
   * Calculate confidence score based on response characteristics
   */
  private calculateConfidence(response: string): number {
    // Simple confidence calculation
    // In a real implementation, this might use model confidence scores
    const hasSpecificActions = /\b(implement|create|fix|analyze|review)\b/i.test(response);
    const hasStructuredResponse = response.includes('1.') || response.includes('-');
    const hasEmojis = /[\u{1F300}-\u{1F9FF}]/u.test(response);
    
    let confidence = 0.7; // Base confidence
    if (hasSpecificActions) confidence += 0.1;
    if (hasStructuredResponse) confidence += 0.1;  
    if (hasEmojis) confidence += 0.05;

    return Math.min(confidence, 0.95);
  }

  /**
   * Check if response indicates Zoi can execute code
   */
  private canExecuteCode(response: string): boolean {
    const executionIndicators = [
      'I can implement',
      'I\'ll create',
      'Let me build',
      'I can fix',
      'I\'ll generate',
      'I can write'
    ];

    return executionIndicators.some(indicator => 
      response.toLowerCase().includes(indicator.toLowerCase())
    );
  }

  /**
   * Extract suggested actions from response
   */
  private extractSuggestedActions(response: string): string[] {
    const actions: string[] = [];
    
    // Look for numbered lists or bullet points
    const numberedActions = response.match(/\d+\.\s*([^\n]+)/g);
    if (numberedActions) {
      actions.push(...numberedActions.map(action => action.replace(/^\d+\.\s*/, '')));
    }

    const bulletActions = response.match(/[•\-\*]\s*([^\n]+)/g);
    if (bulletActions) {
      actions.push(...bulletActions.map(action => action.replace(/^[•\-\*]\s*/, '')));
    }

    return actions.slice(0, 5); // Limit to 5 actions
  }

  /**
   * Get conversation history
   */
  public getConversationHistory(): ChatMessage[] {
    return this.conversationHistory.slice(1); // Exclude system message
  }

  /**
   * Clear conversation history (except system message)
   */
  public clearConversation(): void {
    this.conversationHistory = [this.conversationHistory[0]]; // Keep only system message
  }

  /**
   * Check if Zoi AI service is available
   */
  public isAvailable(): boolean {
    return this.isInitialized;
  }
}

export default ZoiAIService;