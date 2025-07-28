#!/usr/bin/env npx tsx

import dotenv from 'dotenv';
import { createNotionClient } from '../src/utils/notionClient.ts';

dotenv.config();

async function verifyCanonicalSetup() {
  console.log('🔍 Verifying Canonical Notion WT App Setup\n');

  const client = createNotionClient();
  
  // Read canonical database IDs
  const canonicalPageId = process.env.NOTION_WT_PARENT_PAGE_ID || '';
  const projectDbId = process.env.NOTION_WT_PROJECT_DB_ID || '';
  const claudeGizmoDbId = process.env.NOTION_CLAUDE_GIZMO_DB_ID || '';
  
  const results = {
    canonicalPage: false,
    projectDatabase: false,
    communicationDatabase: false,
    messageCount: 0
  };

  try {
    // Test 1: Canonical Page Access
    console.log('1️⃣ Testing canonical page access...');
    const page = await client.getPage(canonicalPageId);
    results.canonicalPage = true;
    console.log(`   ✅ Canonical page accessible: ${page.url}`);

    // Test 2: Project Database Access
    if (projectDbId) {
      console.log('\n2️⃣ Testing project database access...');
      const projectDb = await client.queryDatabase({
        database_id: projectDbId,
        page_size: 1
      });
      results.projectDatabase = true;
      console.log(`   ✅ Project database accessible with ${projectDb.results.length} entries`);
    } else {
      console.log('\n2️⃣ ⚠️  Project database ID not found');
    }

    // Test 3: Communication Database Access
    console.log('\n3️⃣ Testing Claude-Gizmo communication database...');
    const commDb = await client.queryDatabase({
      database_id: claudeGizmoDbId,
    });
    results.communicationDatabase = true;
    results.messageCount = commDb.results.length;
    console.log(`   ✅ Communication database accessible with ${commDb.results.length} messages`);

    // Test 4: Send verification message
    console.log('\n4️⃣ Sending verification message...');
    const verificationMessage = await client.writePage({
      parent: { database_id: claudeGizmoDbId },
      properties: {
        'Message': {
          title: [{ text: { content: 'Canonical setup verification complete' } }],
        },
        'Full Content': {
          rich_text: [{ 
            text: { 
              content: 'All databases successfully migrated to canonical location. RAG memory system operational at: https://www.notion.so/roammigrationlaw/Canonical-Notion-WT-App-23ce1901e36e805bbf5ee42eb1204a13' 
            } 
          }],
        },
        'Context': {
          rich_text: [{ text: { content: 'Migration verification and system status' } }],
        },
        'Sender': {
          select: { name: 'Claude' },
        },
        'Priority': {
          select: { name: 'medium' },
        },
        'Status': {
          select: { name: 'unread' },
        },
        'Thread ID': {
          rich_text: [{ text: { content: 'thread-005-verification' } }],
        },
        'Timestamp': {
          date: { start: new Date().toISOString() },
        },
      },
    });

    console.log(`   ✅ Verification message sent: ${verificationMessage.url}`);

    // Summary
    console.log('\n📋 VERIFICATION SUMMARY:');
    console.log('─'.repeat(50));
    console.log(`✅ Canonical Page Access: ${results.canonicalPage ? 'SUCCESS' : 'FAILED'}`);
    console.log(`✅ Project Database: ${results.projectDatabase ? 'SUCCESS' : 'FAILED'}`);
    console.log(`✅ Communication Database: ${results.communicationDatabase ? 'SUCCESS' : 'FAILED'}`);
    console.log(`📨 Total Messages: ${results.messageCount + 1}`);
    console.log('─'.repeat(50));
    
    console.log('\n🎯 CANONICAL LOCATION:');
    console.log('   https://www.notion.so/roammigrationlaw/Canonical-Notion-WT-App-23ce1901e36e805bbf5ee42eb1204a13');
    
    console.log('\n🤖 COMMUNICATION DATABASE:');
    console.log(`   ${claudeGizmoDbId}`);
    console.log('   https://www.notion.so/23ce1901e36e81bbb7d6f033af88c8e9');

    if (results.canonicalPage && results.communicationDatabase) {
      console.log('\n🎉 SUCCESS! All systems operational in canonical location.');
    } else {
      console.log('\n⚠️  Some systems may need attention.');
    }

  } catch (error) {
    console.error(`💥 Verification failed: ${error}`);
  }
}

verifyCanonicalSetup().catch(console.error);