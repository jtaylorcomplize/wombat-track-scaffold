#!/usr/bin/env npx tsx

import dotenv from 'dotenv';
import { createNotionClient } from '../src/utils/notionClient.ts';

dotenv.config();

async function findParentPage() {
  console.log('🔍 Searching for available parent pages...\n');

  const client = createNotionClient();
  
  try {
    // Search for pages
    const searchResponse = await client.client.search({
      filter: {
        value: 'page',
        property: 'object',
      },
      page_size: 10,
    });

    console.log(`Found ${searchResponse.results.length} pages:\n`);

    searchResponse.results.forEach((page: any, index: number) => {
      const title = page.properties?.title?.title?.[0]?.plain_text || 
                    page.properties?.Name?.title?.[0]?.plain_text || 
                    'Untitled';
      console.log(`${index + 1}. ${title}`);
      console.log(`   ID: ${page.id}`);
      console.log(`   URL: ${page.url}\n`);
    });

    if (searchResponse.results.length === 0) {
      console.log('❌ No pages found. Please create a page in Notion first.');
      console.log('\n📋 Instructions:');
      console.log('1. Go to your Notion workspace');
      console.log('2. Create a new page called "Wombat Track OS" or "WT App N-Test"');
      console.log('3. Share it with your integration');
      console.log('4. Run this script again to get the page ID');
    } else {
      console.log('✅ You can use any of these page IDs as the parent.');
      console.log('\n📋 Next step:');
      console.log('Copy one of the page IDs above and use it to create databases.');
    }

    return searchResponse.results;

  } catch (error) {
    console.error('💥 Error:', error);
    throw error;
  }
}

findParentPage().catch(console.error);