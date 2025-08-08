import OpenAI from "openai";
import { DefaultAzureCredential } from "@azure/identity";
import { SecretClient } from "@azure/keyvault-secrets";

interface AzureOpenAIConfig {
  endpoint: string;
  apiKey: string;
  apiVersion: string;
  deployments: {
    gpt4o: string;
    embedding: string;
  };
  keyVaultUrl?: string;
  retryOptions: {
    maxRetries: number;
    backoffMultiplier: number;
    maxBackoffMs: number;
  };
  monitoring: {
    enableLogging: boolean;
    logLevel: 'error' | 'warn' | 'info' | 'debug';
    applicationInsights?: string;
  };
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatCompletionRequest {
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

interface EmbeddingRequest {
  input: string | string[];
  dimensions?: number;
}

class AzureOpenAIService {
  private client: OpenAI;
  private config: AzureOpenAIConfig;
  private secretClient?: SecretClient;
  private metrics: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    avgResponseTime: number;
  };

  constructor() {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      avgResponseTime: 0
    };
    
    this.config = {
      endpoint: process.env.AZURE_OPENAI_ENDPOINT!,
      apiKey: process.env.AZURE_OPENAI_API_KEY!,
      apiVersion: process.env.AZURE_OPENAI_API_VERSION || "2024-02-01",
      deployments: {
        gpt4o: process.env.AZURE_OPENAI_GPT4O_DEPLOYMENT || "gpt-4o-2024-11-20",
        embedding: process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT || "text-embedding-3-large"
      },
      keyVaultUrl: process.env.AZURE_KEYVAULT_URL,
      retryOptions: {
        maxRetries: parseInt(process.env.AZURE_OPENAI_MAX_RETRIES || '3'),
        backoffMultiplier: 2,
        maxBackoffMs: 30000
      },
      monitoring: {
        enableLogging: process.env.AZURE_OPENAI_ENABLE_LOGGING === 'true',
        logLevel: (process.env.AZURE_OPENAI_LOG_LEVEL as any) || 'info',
        applicationInsights: process.env.APPLICATIONINSIGHTS_CONNECTION_STRING
      }
    };

    if (!this.config.endpoint || !this.config.apiKey) {
      throw new Error("Azure OpenAI configuration missing. Check environment variables.");
    }

    // Initialize Key Vault client if available
    if (this.config.keyVaultUrl) {
      try {
        const credential = new DefaultAzureCredential();
        this.secretClient = new SecretClient(this.config.keyVaultUrl, credential);
        this.log('info', 'Key Vault client initialized');
      } catch (error) {
        this.log('warn', 'Failed to initialize Key Vault client', error);
      }
    }

    // Initialize client for Azure OpenAI
    this.client = new OpenAI({
      apiKey: this.config.apiKey,
      baseURL: `${this.config.endpoint}/openai/deployments/${this.config.deployments.gpt4o}`,
      defaultQuery: { 'api-version': this.config.apiVersion },
      defaultHeaders: {
        'api-key': this.config.apiKey,
      },
    });
  }

  /**
   * Test connectivity to Azure OpenAI service
   */
  async testConnection(): Promise<boolean> {
    try {
      // Simple test with a minimal request
      const response = await this.client.chat.completions.create({
        messages: [{ role: "user", content: "Hello" }],
        max_tokens: 5
      });
      
      return response.choices.length > 0;
    } catch (error) {
      console.error("Azure OpenAI connection test failed:", error);
      return false;
    }
  }

  /**
   * Generate chat completion using GPT-4o
   */
  async getChatCompletion(request: ChatCompletionRequest): Promise<string> {
    return this.withRetryAndMetrics(async () => {
      const response = await this.client.chat.completions.create({
        messages: request.messages,
        max_tokens: request.maxTokens || 1000,
        temperature: request.temperature || 0.7,
        top_p: request.topP || 1.0,
        frequency_penalty: request.frequencyPenalty || 0,
        presence_penalty: request.presencePenalty || 0
      });

      const content = response.choices[0]?.message?.content || "";
      this.log('debug', 'Chat completion successful', {
        tokensUsed: response.usage?.total_tokens,
        model: response.model
      });
      return content;
    }, 'getChatCompletion');
  }

  /**
   * Generate embeddings for text
   */
  async getEmbeddings(request: EmbeddingRequest): Promise<number[][]> {
    return this.withRetryAndMetrics(async () => {
      // Create separate client for embeddings
      const embeddingClient = new OpenAI({
        apiKey: this.config.apiKey,
        baseURL: `${this.config.endpoint}/openai/deployments/${this.config.deployments.embedding}`,
        defaultQuery: { 'api-version': this.config.apiVersion },
        defaultHeaders: {
          'api-key': this.config.apiKey,
        },
      });

      const response = await embeddingClient.embeddings.create({
        input: Array.isArray(request.input) ? request.input : [request.input],
        dimensions: request.dimensions
      });

      const embeddings = response.data.map(item => item.embedding);
      this.log('debug', 'Embeddings generated successfully', {
        inputCount: Array.isArray(request.input) ? request.input.length : 1,
        dimensions: request.dimensions,
        tokensUsed: response.usage?.total_tokens
      });
      return embeddings;
    }, 'getEmbeddings');
  }

  /**
   * Get service configuration
   */
  getConfig(): Partial<AzureOpenAIConfig> {
    return {
      endpoint: this.config.endpoint,
      apiVersion: this.config.apiVersion,
      deployments: this.config.deployments
    };
  }

  /**
   * Check if models are deployed and available
   */
  async checkModelAvailability(): Promise<{
    gpt4o: boolean;
    embedding: boolean;
    deployments: string[];
  }> {
    try {
      // Note: This would require Azure management API
      // For now, we'll test by making requests
      const gpt4oAvailable = await this.testModelDeployment(this.config.deployments.gpt4o);
      const embeddingAvailable = await this.testModelDeployment(this.config.deployments.embedding);

      return {
        gpt4o: gpt4oAvailable,
        embedding: embeddingAvailable,
        deployments: [
          this.config.deployments.gpt4o,
          this.config.deployments.embedding
        ]
      };
    } catch (error) {
      console.error("Model availability check failed:", error);
      return {
        gpt4o: false,
        embedding: false,
        deployments: []
      };
    }
  }

  private async testModelDeployment(deploymentName: string): Promise<boolean> {
    try {
      // Test with minimal request
      if (deploymentName.includes('embedding')) {
        const embeddingClient = new OpenAI({
          apiKey: this.config.apiKey,
          baseURL: `${this.config.endpoint}/openai/deployments/${deploymentName}`,
          defaultQuery: { 'api-version': this.config.apiVersion },
          defaultHeaders: { 'api-key': this.config.apiKey },
        });
        await embeddingClient.embeddings.create({ input: ['test'], dimensions: 10 });
      } else {
        const chatClient = new OpenAI({
          apiKey: this.config.apiKey,
          baseURL: `${this.config.endpoint}/openai/deployments/${deploymentName}`,
          defaultQuery: { 'api-version': this.config.apiVersion },
          defaultHeaders: { 'api-key': this.config.apiKey },
        });
        await chatClient.chat.completions.create({
          messages: [{ role: "user", content: "test" }],
          max_tokens: 1
        });
      }
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Retry wrapper with exponential backoff and metrics
   */
  private async withRetryAndMetrics<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    const startTime = Date.now();
    this.metrics.totalRequests++;
    
    for (let attempt = 0; attempt <= this.config.retryOptions.maxRetries; attempt++) {
      try {
        const result = await operation();
        this.metrics.successfulRequests++;
        
        // Update average response time
        const responseTime = Date.now() - startTime;
        this.metrics.averageResponseTime = 
          (this.metrics.averageResponseTime * (this.metrics.successfulRequests - 1) + responseTime) 
          / this.metrics.successfulRequests;

        console.log(`✅ ${operationName} succeeded in ${responseTime}ms (attempt ${attempt + 1})`);
        return result;

      } catch (error: any) {
        this.metrics.failedRequests++;
        const isLastAttempt = attempt === this.config.retryOptions.maxRetries;
        
        if (isLastAttempt) {
          console.error(`❌ ${operationName} failed after ${attempt + 1} attempts:`, error.message);
          throw error;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          1000 * Math.pow(this.config.retryOptions.backoffMultiplier, attempt),
          this.config.retryOptions.maxBackoffMs
        );

        console.warn(`⚠️  ${operationName} failed (attempt ${attempt + 1}), retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw new Error(`${operationName} failed after all retry attempts`);
  }
}

// Export class and factory function
export { AzureOpenAIService };

// Factory function to create service with environment check
export function createAzureOpenAIService(): AzureOpenAIService {
  return new AzureOpenAIService();
}

// Conditional singleton for environments where config is available
let azureOpenAIServiceInstance: AzureOpenAIService | null = null;

export function getAzureOpenAIService(): AzureOpenAIService {
  if (!azureOpenAIServiceInstance) {
    azureOpenAIServiceInstance = new AzureOpenAIService();
  }
  return azureOpenAIServiceInstance;
}

export default { AzureOpenAIService, createAzureOpenAIService, getAzureOpenAIService };
