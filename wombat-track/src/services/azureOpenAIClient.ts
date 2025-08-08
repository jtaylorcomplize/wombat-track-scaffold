/**
 * Azure OpenAI Client Service - Step 9.0.2.2
 * Browser-safe client for Azure OpenAI API calls via backend proxy
 * Replaces direct Azure OpenAI service usage in frontend
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
}

class AzureOpenAIClient {
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
      console.log('🌐 Making Azure OpenAI request via backend proxy...');
      
      const response = await fetch(`${this.baseUrl}/api/azure-openai/chat`, {
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
        throw new Error(data.error || 'Azure OpenAI API call failed');
      }

      console.log('✅ Azure OpenAI response received via backend proxy');
      return data.content || 'No response content received';

    } catch (error) {
      console.error('❌ Azure OpenAI Client Error:', error);
      
      // Provide user-friendly error messages
      if (error instanceof Error) {
        if (error.message.includes('fetch')) {
          throw new Error('Unable to connect to Azure OpenAI service. Please check your connection.');
        } else if (error.message.includes('authentication')) {
          throw new Error('Azure OpenAI authentication failed. Please check configuration.');
        } else if (error.message.includes('rate limit')) {
          throw new Error('Azure OpenAI rate limit exceeded. Please try again in a moment.');
        } else {
          throw error;
        }
      }
      
      throw new Error('Unexpected error with Azure OpenAI service');
    }
  }

  /**
   * Test connection to backend proxy
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.getChatCompletion({
        messages: [{ role: 'user', content: 'Hello' }],
        maxTokens: 5
      });
      
      return response.length > 0;
    } catch (error) {
      console.error('Azure OpenAI connection test failed:', error);
      return false;
    }
  }

  /**
   * Generate Azure OpenAI response with context awareness
   */
  async generateContextualResponse(
    userMessage: string,
    context: { projectName: string; phaseName: string; stepName: string }
  ): Promise<string> {
    const systemPrompt = `You are an Azure OpenAI assistant integrated with the Orbis platform.
Current context: Project "${context.projectName}", Phase "${context.phaseName}", Step "${context.stepName}".
Provide helpful, concise responses focused on Azure cloud services, AI/ML capabilities, and platform integration.
Keep responses under 200 words and be practical and actionable.`;

    try {
      const response = await this.getChatCompletion({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        maxTokens: 300,
        temperature: 0.7,
        context
      });

      return response;

    } catch (error) {
      console.error('❌ Azure OpenAI contextual response failed:', error);
      
      // Return error message that maintains the assistant persona
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return `I'm experiencing connectivity issues with Azure OpenAI services. Error: ${errorMessage}. 

However, I can still provide general guidance about Azure services:
- Azure OpenAI provides GPT models for text generation and analysis
- Azure Cognitive Services offer pre-built AI capabilities
- Azure Machine Learning enables custom model training and deployment
- Consider Azure Functions for serverless AI workloads

Please try your request again, or let me know how else I can help with Azure services.`;
    }
  }
}

// Export singleton instance for use across the application
export const azureOpenAIClient = new AzureOpenAIClient();

// Export class for testing or custom configurations
export { AzureOpenAIClient };
export default azureOpenAIClient;