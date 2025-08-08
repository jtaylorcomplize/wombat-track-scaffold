/**
 * Azure OpenAI Server Service - Step 9.0.2.2
 * Server-side only version for Express backend
 * Avoids TypeScript import issues in Node.js
 */

import OpenAI from "openai";

class AzureOpenAIServerService {
  constructor() {
    this.config = {
      endpoint: process.env.AZURE_OPENAI_ENDPOINT,
      apiKey: process.env.AZURE_OPENAI_API_KEY,
      apiVersion: process.env.AZURE_OPENAI_API_VERSION || "2024-02-01",
      deployment: process.env.AZURE_OPENAI_GPT4O_DEPLOYMENT || "gpt-4o-2024-11-20"
    };

    // Validate required configuration
    if (!this.config.endpoint || !this.config.apiKey) {
      throw new Error("Azure OpenAI configuration missing. Check environment variables AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY.");
    }

    // Initialize OpenAI client for Azure
    this.client = new OpenAI({
      apiKey: this.config.apiKey,
      baseURL: `${this.config.endpoint}/openai/deployments/${this.config.deployment}`,
      defaultQuery: { 'api-version': this.config.apiVersion },
      defaultHeaders: {
        'api-key': this.config.apiKey,
      },
    });

    console.log('✅ Azure OpenAI Server Service initialized');
  }

  /**
   * Test connectivity to Azure OpenAI service
   */
  async testConnection() {
    try {
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
   * Generate chat completion using Azure OpenAI
   */
  async getChatCompletion({ messages, maxTokens = 1000, temperature = 0.7 }) {
    try {
      const response = await this.client.chat.completions.create({
        messages,
        max_tokens: maxTokens,
        temperature,
        top_p: 1.0,
        frequency_penalty: 0,
        presence_penalty: 0
      });

      const content = response.choices[0]?.message?.content || "";
      console.log(`✅ Azure OpenAI response generated (${response.usage?.total_tokens} tokens)`);
      
      return content;
    } catch (error) {
      console.error("❌ Azure OpenAI API call failed:", error.message);
      
      // Provide specific error messages
      if (error.message.includes('API key')) {
        throw new Error('Azure OpenAI API authentication failed. Please check your API key.');
      } else if (error.message.includes('rate limit')) {
        throw new Error('Azure OpenAI rate limit exceeded. Please try again later.');
      } else if (error.message.includes('timeout')) {
        throw new Error('Azure OpenAI request timed out. Please try again.');
      } else if (error.message.includes('model')) {
        throw new Error('Azure OpenAI deployment not found or not accessible.');
      } else {
        throw new Error(`Azure OpenAI service error: ${error.message}`);
      }
    }
  }
}

export { AzureOpenAIServerService };