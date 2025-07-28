#!/usr/bin/env npx tsx

/**
 * Verify Workflow Entries in Temp Holding Table
 * 
 * This script verifies the entries created by the hierarchical parse workflow
 */

import { createNotionClient } from '../src/utils/notionClient.js';
import dotenv from 'dotenv';

dotenv.config();

const TEMP_HOLDING_TABLE_ID = '23de1901-e36e-81e2-bff2-ca4451f734ec';

async function verifyEntries() {
  const notionClient = createNotionClient(process.env.NOTION_TOKEN);
  
  try {
    console.log('🔍 Verifying workflow entries in Temp Holding Table...');
    
    const response = await notionClient.queryDatabase({
      database_id: TEMP_HOLDING_TABLE_ID,
      filter: {
        property: 'BlockID',
        rich_text: {
          starts_with: 'wt_block_'
        }
      },
      sorts: [{ property: 'BlockNumber', direction: 'ascending' }]
    });
    
    console.log(`\n📊 Found ${response.results.length} entries with wt_block_ IDs\n`);
    
    for (const entry of response.results) {
      const blockTitle = entry.properties?.BlockTitle?.title?.[0]?.text?.content || 'No title';
      const blockId = entry.properties?.BlockID?.rich_text?.[0]?.text?.content || 'No ID';
      const blockNumber = entry.properties?.BlockNumber?.number || 'No number';
      const category = entry.properties?.BlockCategory?.select?.name || 'No category';
      const readyForRouting = entry.properties?.ReadyForRouting?.checkbox;
      const rawTextPreview = entry.properties?.RawText?.rich_text?.[0]?.text?.content?.substring(0, 100) || 'No content';
      
      console.log(`📦 Entry ${blockNumber}: ${blockId}`);
      console.log(`   Title: ${blockTitle}`);
      console.log(`   Category: ${category}`);
      console.log(`   Ready for Routing: ${readyForRouting ? '✅ YES' : '❌ NO'}`);
      console.log(`   Content Preview: ${rawTextPreview}...`);
      console.log(`   Notion URL: https://www.notion.so/${entry.id.replace(/-/g, '')}`);
      console.log('');
    }
    
    console.log('✅ Verification complete!');
    
  } catch (error) {
    console.error('❌ Error verifying entries:', error);
  }
}

verifyEntries();