#!/usr/bin/env tsx

import dotenv from 'dotenv';
import path from 'path';
import OpenAI from 'openai';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function testEmbeddings() {
  console.log('🔧 Testing Azure OpenAI Embeddings...\n');

  try {
    // Create embedding client
    const client = new OpenAI({
      apiKey: process.env.AZURE_OPENAI_API_KEY!,
      baseURL: `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/text-embedding-3-large`,
      defaultQuery: { 'api-version': process.env.AZURE_OPENAI_API_VERSION },
      defaultHeaders: {
        'api-key': process.env.AZURE_OPENAI_API_KEY!,
      },
    });

    console.log('1️⃣ Configuration:');
    console.log(`   Endpoint: ${process.env.AZURE_OPENAI_ENDPOINT}`);
    console.log(`   Model: text-embedding-3-large`);
    console.log(`   API Version: ${process.env.AZURE_OPENAI_API_VERSION}\n`);

    console.log('2️⃣ Testing embedding generation...');
    
    const response = await client.embeddings.create({
      input: 'OrbisForge Azure OpenAI integration test',
      dimensions: 1536
    });

    console.log(`   ✅ Success! Generated embedding with ${response.data[0].embedding.length} dimensions`);
    console.log(`   📊 Usage: ${response.usage?.total_tokens} tokens\n`);

    // Test batch embeddings
    console.log('3️⃣ Testing batch embeddings...');
    const batchResponse = await client.embeddings.create({
      input: [
        'OrbisForge project management',
        'Azure cloud integration',
        'AI-powered workflow automation'
      ],
      dimensions: 1536
    });

    console.log(`   ✅ Success! Generated ${batchResponse.data.length} embeddings`);
    console.log(`   📊 Total usage: ${batchResponse.usage?.total_tokens} tokens\n`);

    console.log('🎉 Azure OpenAI Embeddings fully operational!');

  } catch (error) {
    console.error('❌ Embedding test failed:', error);
  }
}

// Auto-run
testEmbeddings();

export { testEmbeddings };