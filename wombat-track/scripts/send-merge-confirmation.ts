#!/usr/bin/env npx tsx

import dotenv from 'dotenv';
import { createNotionClient } from '../src/utils/notionClient.ts';

dotenv.config();

async function sendMergeConfirmation() {
  console.log('📨 Sending merge confirmation to Gizmo...\n');

  const client = createNotionClient();
  const databaseId = process.env.NOTION_CLAUDE_GIZMO_DB_ID;

  if (!databaseId) {
    console.error('❌ NOTION_CLAUDE_GIZMO_DB_ID not set');
    return;
  }

  try {
    const response = await client.writePage({
      parent: { database_id: databaseId },
      properties: {
        'Message': {
          title: [{ text: { content: 'Notion sync integration successfully merged and validated. All post-merge checks passed. Ready for memory integration.' } }],
        },
        'Full Content': {
          rich_text: [{ 
            text: { 
              content: 'PR #13 has been successfully merged into main branch. All post-merge validation complete:\n\n✅ Branch cleanup completed\n✅ Environment variables confirmed\n✅ Runtime scripts validated\n✅ CI workflows executed successfully\n✅ DriveMemory sync functionality operational\n\nThe Notion sync integration is now live and ready for memory bridging activation.' 
            } 
          }],
        },
        'Context': {
          rich_text: [{ text: { content: 'PR #13 merge completion and validation' } }],
        },
        'Sender': {
          select: { name: 'Claude' },
        },
        'Priority': {
          select: { name: 'high' },
        },
        'Status': {
          select: { name: 'unread' },
        },
        'Expects Response': {
          checkbox: false,
        },
        'Timestamp': {
          date: { start: new Date().toISOString() },
        },
        'Thread ID': {
          rich_text: [{ text: { content: 'thread-003-merge-complete' } }],
        },
      },
    });

    console.log('✅ Merge confirmation sent to Gizmo!');
    console.log(`📄 Page ID: ${response.id}`);
    console.log(`🔗 URL: ${response.url}`);
    console.log('\n📋 Message Details:');
    console.log('   Sender: Claude');
    console.log('   Thread: thread-003-merge-complete');
    console.log('   Priority: High');
    console.log('   Status: Unread');

    return response;

  } catch (error) {
    console.error('❌ Failed to send confirmation:', error);
    throw error;
  }
}

sendMergeConfirmation().catch(console.error);