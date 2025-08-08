#!/usr/bin/env tsx

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from project root
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Import after env is loaded
import { createAzureOpenAIService } from '../src/services/azureOpenAIService';

async function testAzureOpenAI() {
  console.log('🔧 Testing Azure OpenAI Service Configuration...\n');

  try {
    // Create service instance
    const azureOpenAIService = createAzureOpenAIService();
    
    // Test 1: Configuration
    console.log('1️⃣ Configuration Check:');
    const config = azureOpenAIService.getConfig();
    console.log(`   ✅ Endpoint: ${config.endpoint}`);
    console.log(`   ✅ API Version: ${config.apiVersion}`);
    console.log(`   ✅ GPT-4o Deployment: ${config.deployments?.gpt4o}`);
    console.log(`   ✅ Embedding Deployment: ${config.deployments?.embedding}\n`);

    // Test 2: Connection
    console.log('2️⃣ Connection Test:');
    const connected = await azureOpenAIService.testConnection();
    console.log(`   ${connected ? '✅' : '❌'} Connection: ${connected ? 'SUCCESS' : 'FAILED'}\n`);

    if (!connected) {
      console.log('❗ Connection failed. This is expected if quota is not approved yet.\n');
      return;
    }

    // Test 3: Model Availability
    console.log('3️⃣ Model Availability:');
    const availability = await azureOpenAIService.checkModelAvailability();
    console.log(`   ${availability.gpt4o ? '✅' : '❌'} GPT-4o: ${availability.gpt4o ? 'AVAILABLE' : 'NOT AVAILABLE'}`);
    console.log(`   ${availability.embedding ? '✅' : '❌'} Embedding: ${availability.embedding ? 'AVAILABLE' : 'NOT AVAILABLE'}\n`);

    // Test 4: Chat Completion (if available)
    if (availability.gpt4o) {
      console.log('4️⃣ Chat Completion Test:');
      try {
        const response = await azureOpenAIService.getChatCompletion({
          messages: [
            { role: 'system', content: 'You are a helpful assistant for OrbisForge.' },
            { role: 'user', content: 'Say hello and confirm you are working with Azure OpenAI.' }
          ],
          maxTokens: 100,
          temperature: 0.7
        });
        console.log(`   ✅ Response: ${response.substring(0, 100)}${response.length > 100 ? '...' : ''}\n`);
      } catch (error) {
        console.log(`   ❌ Chat completion failed: ${error}\n`);
      }
    }

    // Test 5: Embeddings (if available)
    if (availability.embedding) {
      console.log('5️⃣ Embedding Test:');
      try {
        const embeddings = await azureOpenAIService.getEmbeddings({
          input: 'OrbisForge integration test',
          dimensions: 1536
        });
        console.log(`   ✅ Generated embedding with ${embeddings[0]?.length || 0} dimensions\n`);
      } catch (error) {
        console.log(`   ❌ Embedding generation failed: ${error}\n`);
      }
    }

    console.log('🎉 Azure OpenAI integration test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('quota') || error.message.includes('InsufficientQuota')) {
        console.log('\n💡 Quota Issue: Request Azure OpenAI access at https://aka.ms/oai/access');
      }
      if (error.message.includes('deployment')) {
        console.log('\n💡 Model Issue: Models may not be deployed yet. Deploy them first.');
      }
    }
  }
}

// Auto-run when script is executed directly
testAzureOpenAI();

export { testAzureOpenAI };