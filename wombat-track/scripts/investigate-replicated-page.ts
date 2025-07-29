#!/usr/bin/env tsx

/**
 * Investigate the Replicated-oApp-Databases page structure
 */

import { createNotionClient } from '../src/utils/notionClient';

async function investigateReplicatedPage() {
  const token = process.env.NOTION_TOKEN;
  
  if (!token) {
    console.error('❌ Missing NOTION_TOKEN environment variable');
    process.exit(1);
  }

  const client = createNotionClient(token);
  
  try {
    console.log('🔍 Searching for Replicated-oApp-Databases page...');
    
    // Search for the page
    const searchResults = await client.client.search({
      query: 'Replicated-oApp-Databases',
      filter: { property: 'object', value: 'page' }
    });

    if (!searchResults.results.length) {
      console.log('❌ Replicated-oApp-Databases page not found');
      return;
    }

    const page = searchResults.results[0];
    console.log(`✅ Found page: ${page.id}`);
    console.log(`   URL: ${page.url}`);

    // Get page details
    const pageDetails = await client.client.pages.retrieve({ page_id: page.id });
    console.log(`   Title: ${pageDetails.properties?.title?.title?.[0]?.plain_text || 'No title'}`);

    // Get child blocks
    console.log('\n📋 Child blocks:');
    const children = await client.client.blocks.children.list({
      block_id: page.id
    });

    for (const [index, child] of children.results.entries()) {
      console.log(`   ${index + 1}. Type: ${child.type}`);
      
      switch (child.type) {
        case 'child_database':
          console.log(`      Database ID: ${child.id}`);
          try {
            const dbDetails = await client.client.databases.retrieve({ database_id: child.id });
            console.log(`      Database Name: ${dbDetails.title[0]?.plain_text || 'Untitled'}`);
          } catch (error) {
            console.log(`      Error retrieving database: ${error}`);
          }
          break;
        case 'database':
          console.log(`      Inline database ID: ${child.id}`);
          break;
        case 'table':
          console.log(`      Table ID: ${child.id}`);
          break;
        case 'heading_1':
        case 'heading_2':
        case 'heading_3':
          console.log(`      Heading: ${child[child.type]?.rich_text?.[0]?.plain_text || 'No text'}`);
          break;
        case 'paragraph':
          console.log(`      Text: ${child.paragraph?.rich_text?.[0]?.plain_text || 'No text'}`);
          break;
        default:
          console.log(`      Content: ${JSON.stringify(child).substring(0, 100)}...`);
      }
    }

    // Also search for all databases to see what's available
    console.log('\n🗄️ All available databases:');
    const allDatabases = await client.client.search({
      filter: { property: 'object', value: 'database' }
    });

    for (const db of allDatabases.results.slice(0, 10)) { // Show first 10
      try {
        const dbDetails = await client.client.databases.retrieve({ database_id: db.id });
        const title = dbDetails.title[0]?.plain_text || 'Untitled';
        console.log(`   📊 ${title} (${db.id})`);
      } catch (error) {
        console.log(`   ❌ Error accessing database ${db.id}: ${error}`);
      }
    }

  } catch (error) {
    console.error('❌ Investigation failed:', error);
  }
}

// Run the investigation
if (import.meta.url === `file://${process.argv[1]}`) {
  investigateReplicatedPage().catch(console.error);
}