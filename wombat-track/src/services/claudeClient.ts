/**
 * Claude Client Service - Step 9.0.2.3
 * Browser-safe client for Claude API calls via backend proxy
 * Provides intelligent contextual responses for multi-agent chat
 */

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatCompletionRequest {
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
  context?: {
    projectName: string;
    phaseName: string;
    stepName: string;
  };
}

interface ChatResponse {
  success: boolean;
  content?: string;
  error?: string;
  context?: any;
  agent?: string;
}

class ClaudeClient {
  private baseUrl: string;

  constructor() {
    // Use the Express server port (3001) for API calls
    this.baseUrl = typeof window !== 'undefined' ? 'http://localhost:3001' : 'http://localhost:3001';
  }

  /**
   * Get chat completion via backend API proxy
   */
  async getChatCompletion(request: ChatCompletionRequest): Promise<string> {
    try {
      console.log('🧠 Making Claude request via backend proxy...');
      
      const response = await fetch(`${this.baseUrl}/api/claude/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request)
      });

      const data: ChatResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      if (!data.success) {
        throw new Error(data.error || 'Claude API call failed');
      }

      console.log('✅ Claude response received via backend proxy');
      return data.content || 'No response content received';

    } catch (error) {
      console.error('❌ Claude Client Error:', error);
      
      // Provide user-friendly error messages
      if (error instanceof Error) {
        if (error.message.includes('fetch')) {
          throw new Error('Unable to connect to Claude service. Please check your connection.');
        } else if (error.message.includes('authentication')) {
          throw new Error('Claude authentication failed. Please check configuration.');
        } else if (error.message.includes('rate limit')) {
          throw new Error('Claude rate limit exceeded. Please try again in a moment.');
        } else {
          throw error;
        }
      }
      
      throw new Error('Unexpected error with Claude service');
    }
  }

  /**
   * Test connection to backend proxy
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.getChatCompletion({
        messages: [{ role: 'user', content: 'Hello Claude' }],
        maxTokens: 50
      });
      
      return response.length > 0;
    } catch (error) {
      console.error('Claude connection test failed:', error);
      return false;
    }
  }

  /**
   * Generate Claude response with context awareness
   */
  async generateContextualResponse(
    userMessage: string,
    context: { projectName: string; phaseName: string; stepName: string }
  ): Promise<string> {
    const systemPrompt = `You are Claude Code, an intelligent development assistant integrated with the Orbis platform.
Current context: Project "${context.projectName}", Phase "${context.phaseName}", Step "${context.stepName}".
Provide helpful, detailed responses focused on code analysis, architecture, debugging, and strategic guidance.
Be thorough but practical, and reference the current project context when relevant.`;

    try {
      const response = await this.getChatCompletion({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        maxTokens: 600,
        temperature: 0.7,
        context
      });

      return response;

    } catch (error) {
      console.error('❌ Claude contextual response failed:', error);
      
      // Return error message that maintains the assistant persona
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return `I'm experiencing connectivity issues with my backend service. Error: ${errorMessage}. 

However, I can still provide general guidance:

• **Code Analysis**: I can review TypeScript/React code for patterns and improvements
• **Architecture**: Help design scalable system architectures and integrations
• **Debugging**: Assist with error analysis and troubleshooting approaches  
• **Azure Integration**: Guide cloud service implementation and optimization
• **Strategic Planning**: Provide technical roadmap and implementation guidance

Please try your request again, or let me know how else I can help with your development work.`;
    }
  }

  /**
   * Get intelligent code analysis response
   */
  async analyzeCode(
    codeSnippet: string,
    context: { projectName: string; phaseName: string; stepName: string },
    analysisType: 'review' | 'optimize' | 'debug' | 'architecture' = 'review'
  ): Promise<string> {
    const analysisPrompts = {
      review: 'Please review this code for quality, best practices, and potential improvements:',
      optimize: 'Please analyze this code for performance optimization opportunities:',
      debug: 'Please help debug this code and identify potential issues:',
      architecture: 'Please evaluate the architectural patterns in this code:'
    };

    const userMessage = `${analysisPrompts[analysisType]}

\`\`\`
${codeSnippet}
\`\`\`

Context: This is from "${context.projectName}" in phase "${context.phaseName}", step "${context.stepName}".`;

    return this.generateContextualResponse(userMessage, context);
  }

  /**
   * Get strategic planning guidance
   */
  async getStrategicGuidance(
    planningTopic: string,
    context: { projectName: string; phaseName: string; stepName: string }
  ): Promise<string> {
    const userMessage = `I need strategic guidance for: ${planningTopic}

Current project context:
- Project: ${context.projectName}
- Phase: ${context.phaseName}  
- Step: ${context.stepName}

Please provide comprehensive planning recommendations including technical approach, potential risks, and implementation strategy.`;

    return this.generateContextualResponse(userMessage, context);
  }
}

// Export singleton instance for use across the application
export const claudeClient = new ClaudeClient();

// Export class for testing or custom configurations
export { ClaudeClient };
export default claudeClient;