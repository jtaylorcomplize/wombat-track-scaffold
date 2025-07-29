#!/usr/bin/env tsx

/**
 * Inspect actual database schemas to understand field naming
 */

import { createNotionClient } from '../src/utils/notionClient';

async function inspectDatabaseSchemas() {
  const token = process.env.NOTION_TOKEN;
  
  if (!token) {
    console.error('❌ Missing NOTION_TOKEN environment variable');
    process.exit(1);
  }
  
  const client = createNotionClient(token);
  
  const TARGET_DATABASES = {
    'wt-project-tracker': '23ce1901-e36e-811b-946b-c3e7d764c335',
    'wt-claude-gizmo-comm': '23ce1901-e36e-81bb-b7d6-f033af88c8e9',
    'wt-tech-debt-register': '23fe1901-e36e-815b-890e-d32337b3ca8b'
  };
  
  for (const [dbName, dbId] of Object.entries(TARGET_DATABASES)) {
    console.log(`\n🔍 Inspecting ${dbName} schema:`);
    
    try {
      const dbDetails = await client.client.databases.retrieve({ database_id: dbId });
      
      console.log(`   Database Title: ${dbDetails.title[0]?.plain_text || 'No title'}`);
      console.log(`   Properties:`);
      
      for (const [propName, propConfig] of Object.entries(dbDetails.properties)) {
        console.log(`      - ${propName} (${propConfig.type})`);
      }
      
      // Also get a sample record to see actual data
      const records = await client.queryDatabase({
        database_id: dbId,
        page_size: 1
      });
      
      if (records.results.length > 0) {
        const record = records.results[0];
        console.log(`   Sample Record Properties:`);
        for (const [propName, propValue] of Object.entries(record.properties)) {
          const isEmpty = !propValue || 
                         (propValue.type === 'title' && (!propValue.title || propValue.title.length === 0)) ||
                         (propValue.type === 'rich_text' && (!propValue.rich_text || propValue.rich_text.length === 0)) ||
                         (propValue.type === 'select' && !propValue.select);
          console.log(`      - ${propName}: ${isEmpty ? '❌ EMPTY' : '✅ HAS VALUE'} (${propValue.type})`);
        }
      }
      
    } catch (error) {
      console.error(`   ❌ Error inspecting ${dbName}:`, error.message);
    }
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  inspectDatabaseSchemas().catch(console.error);
}