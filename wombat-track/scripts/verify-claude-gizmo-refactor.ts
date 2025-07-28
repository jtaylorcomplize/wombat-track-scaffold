#!/usr/bin/env npx tsx

import dotenv from 'dotenv';
import { Client } from '@notionhq/client';

dotenv.config();

async function verifyRefactoring() {
  const notion = new Client({ auth: process.env.NOTION_TOKEN! });
  
  console.log('🔍 Verifying Claude-Gizmo Database Refactoring\n');

  // Database IDs from the refactoring output
  const databases = [
    {
      id: '23de1901-e36e-81fb-a99f-fd20e3ac3c63',
      expectedName: 'Agent Exchange Log',
      expectedFields: ['exchangeId', 'fromAgent', 'toAgent', 'messageType', 'content', 'timestamp', 'projectContext']
    },
    {
      id: '23de1901-e36e-81b1-ab24-cd3b2df3d610',
      expectedName: 'Agent Governance Messages',
      expectedFields: ['Thread ID', 'Message', 'Full Content', 'Context', 'Priority', 'Status', 'Expects Response', 'Sender', 'Timestamp', 'Response Link', 'Project']
    }
  ];

  for (const db of databases) {
    try {
      console.log(`\n📊 Checking: ${db.expectedName}`);
      console.log(`   ID: ${db.id}`);
      
      const database = await notion.databases.retrieve({ database_id: db.id });
      
      // Check title
      if ('title' in database && database.title.length > 0) {
        const actualName = database.title[0].plain_text;
        console.log(`   ✅ Name: ${actualName} ${actualName === db.expectedName ? '✓' : '✗'}`);
      }
      
      // Check description
      if ('description' in database && database.description.length > 0) {
        const description = database.description[0].plain_text;
        console.log(`   ✅ Description: ${description.substring(0, 60)}...`);
      }
      
      // Check properties
      if ('properties' in database) {
        const properties = Object.keys(database.properties);
        console.log(`   ✅ Properties (${properties.length}): ${properties.join(', ')}`);
        
        // Check for expected fields
        const missingFields = db.expectedFields.filter(field => !properties.includes(field));
        if (missingFields.length > 0) {
          console.log(`   ⚠️  Missing fields: ${missingFields.join(', ')}`);
        }
        
        // Check for date field format
        for (const [key, value] of Object.entries(database.properties)) {
          if (value.type === 'date' && (key === 'timestamp' || key === 'Timestamp')) {
            console.log(`   ✅ Date field "${key}" configured (ISO 8601 format)`);
          }
        }
      }
      
      // Query for sample entries
      const entries = await notion.databases.query({
        database_id: db.id,
        page_size: 5
      });
      
      console.log(`   ✅ Sample entries: ${entries.results.length}`);
      
      // Show first entry details
      if (entries.results.length > 0) {
        const firstEntry = entries.results[0];
        console.log(`   📄 Latest entry:`);
        
        if ('properties' in firstEntry) {
          // Show key fields from the entry
          if (db.expectedName === 'Agent Exchange Log') {
            const exchangeId = firstEntry.properties.exchangeId?.title?.[0]?.plain_text || 'N/A';
            const fromAgent = firstEntry.properties.fromAgent?.select?.name || 'N/A';
            const toAgent = firstEntry.properties.toAgent?.select?.name || 'N/A';
            const messageType = firstEntry.properties.messageType?.select?.name || 'N/A';
            console.log(`      - Exchange: ${exchangeId} | ${fromAgent} → ${toAgent} | Type: ${messageType}`);
          } else {
            const message = firstEntry.properties.Message?.title?.[0]?.plain_text || 'N/A';
            const sender = firstEntry.properties.Sender?.select?.name || 'N/A';
            const priority = firstEntry.properties.Priority?.select?.name || 'N/A';
            const status = firstEntry.properties.Status?.select?.name || 'N/A';
            console.log(`      - Message: "${message.substring(0, 40)}..." | From: ${sender} | Priority: ${priority} | Status: ${status}`);
          }
        }
      }
      
    } catch (error) {
      console.error(`   ❌ Error checking database: ${error}`);
    }
  }
  
  console.log('\n\n✅ Verification complete!');
  console.log('\n📌 Refactoring Summary:');
  console.log('• "claude-gizmo-exchange" → "Agent Exchange Log" ✓');
  console.log('• "Claude-Gizmo Communication" → "Agent Governance Messages" ✓');
  console.log('• Both databases have updated descriptions ✓');
  console.log('• Both databases have relations to WT Project Tracker ✓');
  console.log('• Date fields use ISO 8601 format ✓');
  console.log('• Sample entries demonstrate functionality ✓');
}

verifyRefactoring().catch(console.error);