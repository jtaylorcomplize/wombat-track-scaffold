/**
 * Zoi Simple AI Service - Direct Azure OpenAI Integration
 * This is what Zoi should be - a simple AI agent like Claude/Gizmo
 */

import OpenAI from 'openai';

interface ZoiMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export class ZoiSimpleAI {
  private client: OpenAI;
  private conversationHistory: ZoiMessage[] = [];
  private isConfigured: boolean = false;

  constructor() {
    this.initializeClient();
    this.setupSystemPrompt();
  }

  /**
   * Initialize Azure OpenAI client
   */
  private initializeClient(): void {
    try {
      // Check for Azure OpenAI configuration (browser-compatible)
      const endpoint = this.getConfigValue('AZURE_OPENAI_ENDPOINT');
      const apiKey = this.getConfigValue('AZURE_OPENAI_API_KEY');
      const apiVersion = this.getConfigValue('AZURE_OPENAI_API_VERSION') || '2025-01-01-preview';
      const deploymentName = this.getConfigValue('AZURE_OPENAI_DEPLOYMENT') || 'gpt-4o';

      if (!endpoint || !apiKey) {
        console.warn('🤖 Zoi: Azure OpenAI not configured, falling back to mock responses');
        this.isConfigured = false;
        return;
      }

      // Configure Azure OpenAI client
      this.client = new OpenAI({
        apiKey,
        baseURL: `${endpoint}/openai/deployments/${deploymentName}`,
        defaultQuery: { 'api-version': apiVersion },
        defaultHeaders: {
          'api-key': apiKey,
        },
      });

      this.isConfigured = true;
      console.log('🤖 Zoi: Connected to Azure OpenAI successfully');

    } catch (error) {
      console.error('🤖 Zoi: Failed to initialize Azure OpenAI:', error);
      this.isConfigured = false;
    }
  }

  /**
   * Set up Zoi's system prompt
   */
  private setupSystemPrompt(): void {
    const systemPrompt: ZoiMessage = {
      role: 'system',
      content: `You are Zoi, an autonomous coding agent specializing in software development. 

PERSONALITY:
- Professional but friendly and conversational
- Enthusiastic about coding challenges
- Use occasional emojis (🤖 🔧 ✨ ⚡ 🎯) but don't overdo it
- Be specific and actionable in your responses

CAPABILITIES:
- Code generation and review
- Architecture design and recommendations
- Debugging and troubleshooting
- Testing strategies
- Performance optimization
- Security analysis
- Documentation creation

RESPONSE STYLE:
- Be natural and conversational like Claude or GPT
- Ask clarifying questions when needed
- Provide specific, practical advice
- Explain your reasoning when helpful
- Admit limitations honestly
- Remember conversation context

When users ask about implementation or creating code, you can provide detailed code examples, explain approaches, and give step-by-step guidance. You're an AI assistant focused on development tasks.`
    };

    this.conversationHistory = [systemPrompt];
  }

  /**
   * Send message to Zoi and get response
   */
  public async sendMessage(message: string): Promise<string> {
    // Add user message to history
    this.conversationHistory.push({
      role: 'user',
      content: message
    });

    try {
      if (this.isConfigured && this.client) {
        // Use real Azure OpenAI
        return await this.getAIResponse();
      } else {
        // Fallback to smart mock response
        return this.getSmartMockResponse(message);
      }
    } catch (error) {
      console.error('🤖 Zoi: Error getting response:', error);
      return this.getErrorResponse(error);
    }
  }

  /**
   * Get response from Azure OpenAI
   */
  private async getAIResponse(): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: 'gpt-4o', // This will use the deployed model
      messages: this.conversationHistory,
      max_tokens: 2000,
      temperature: 0.7,
    });

    const aiResponse = response.choices[0]?.message?.content || 'No response generated';

    // Add AI response to history
    this.conversationHistory.push({
      role: 'assistant',
      content: aiResponse
    });

    // Keep history manageable (last 20 messages)
    if (this.conversationHistory.length > 21) {
      this.conversationHistory = [
        this.conversationHistory[0], // Keep system prompt
        ...this.conversationHistory.slice(-20)
      ];
    }

    return aiResponse;
  }

  /**
   * Smart mock response when AI is not available
   */
  private getSmartMockResponse(message: string): string {
    const lowerMessage = message.toLowerCase();

    // Context-aware responses based on conversation history
    const recentMessages = this.conversationHistory.slice(-3).map(m => m.content).join(' ');

    if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
      return `👋 Hello! I'm Zoi, your coding agent. I'm here to help with development tasks, code review, architecture design, and more. What would you like to work on today?

*Note: I'm currently running in development mode. For full AI capabilities, Azure OpenAI needs to be configured.*`;
    }

    if (lowerMessage.includes('implement') || lowerMessage.includes('create') || lowerMessage.includes('build')) {
      return `🔧 I'd love to help you implement that! Let me break down the approach:

1. **Requirements Analysis**: First, I'll need to understand the specific requirements and constraints
2. **Architecture Design**: I'll suggest the best approach based on your existing codebase
3. **Implementation Plan**: Step-by-step development with best practices
4. **Testing Strategy**: Ensure quality and reliability

Can you provide more details about what you'd like to implement? The more specific you are, the better I can help!

*With full Azure OpenAI integration, I could provide detailed code examples and implementation guidance.*`;
    }

    if (lowerMessage.includes('fix') || lowerMessage.includes('debug') || lowerMessage.includes('error')) {
      return `🔍 I'm ready to help debug that issue! Here's my debugging approach:

1. **Problem Analysis**: Understanding the symptoms and context
2. **Root Cause Investigation**: Tracing through the code and logs
3. **Solution Design**: Identifying the best fix approach
4. **Testing**: Ensuring the fix doesn't break anything else

Could you share:
- The specific error message or unexpected behavior?
- When does it occur (specific conditions)?
- What have you already tried?

*With full AI integration, I could analyze your actual code and provide specific solutions.*`;
    }

    if (lowerMessage.includes('review') || lowerMessage.includes('analyze')) {
      return `📊 Great! I love doing code reviews and analysis. I can help with:

✅ **Code Structure** - Organization and patterns
✅ **Performance** - Optimization opportunities  
✅ **Security** - Vulnerability assessment
✅ **Best Practices** - Standards compliance
✅ **Architecture** - Design improvements

Which aspect would you like me to focus on? If you can share the code or describe the system, I can provide more targeted feedback.

*Full AI integration would allow me to analyze actual code files and provide detailed, specific recommendations.*`;
    }

    // Default contextual response
    return `🤖 I understand you're asking about: "${message.substring(0, 100)}${message.length > 100 ? '...' : ''}"

As Zoi, I'm designed to help with software development tasks. I can assist with:
- Code implementation and architecture
- Debugging and troubleshooting  
- Code reviews and optimization
- Testing strategies
- Documentation

Could you provide more specific details about what you need help with? The more context you give me, the better I can assist!

*Currently running in development mode. Full AI capabilities available with Azure OpenAI configuration.*`;
  }

  /**
   * Handle error responses
   */
  private getErrorResponse(error: any): string {
    return `❌ I encountered an issue: ${error.message || 'Unknown error'}

This might be due to:
- Azure OpenAI configuration issues
- Network connectivity problems
- API rate limits

I'm falling back to basic assistance mode. How can I help you with your development tasks?`;
  }

  /**
   * Check if AI is properly configured
   */
  public isAIConfigured(): boolean {
    return this.isConfigured;
  }

  /**
   * Get conversation history
   */
  public getConversationHistory(): ZoiMessage[] {
    return this.conversationHistory.slice(1); // Exclude system prompt
  }

  /**
   * Clear conversation
   */
  public clearConversation(): void {
    this.conversationHistory = [this.conversationHistory[0]]; // Keep only system prompt
  }

  /**
   * Browser-compatible configuration getter
   * Checks localStorage first, then falls back to window globals
   */
  private getConfigValue(key: string): string | undefined {
    // Try localStorage first
    const localValue = localStorage.getItem(key);
    if (localValue) {
      return localValue;
    }

    // Try window globals (set by app initialization)
    const windowValue = (window as any)?.[key];
    if (windowValue) {
      return windowValue;
    }

    // Return undefined if not found
    return undefined;
  }
}

// Singleton instance
let zoiInstance: ZoiSimpleAI | null = null;

export function getZoiInstance(): ZoiSimpleAI {
  if (!zoiInstance) {
    zoiInstance = new ZoiSimpleAI();
  }
  return zoiInstance;
}

export default ZoiSimpleAI;