#!/usr/bin/env npx tsx

import dotenv from 'dotenv';
import { createNotionClient } from '../src/utils/notionClient.ts';

dotenv.config();

async function sendGizmoMessage() {
  console.log('📨 Sending message from Gizmo to Claude...\n');

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
          title: [{ text: { content: 'Notion sync pipeline confirmed live. Proceeding to activate memory bridging.' } }],
        },
        'Full Content': {
          rich_text: [{ 
            text: { 
              content: 'Post-merge verification complete. All Notion sync utilities tested and validated. Claude-Gizmo communication channel operational. Ready to activate MemoryPlugin summarization and slash command registration for full semantic memory integration.' 
            } 
          }],
        },
        'Context': {
          rich_text: [{ text: { content: 'Post-merge validation and memory bridging activation' } }],
        },
        'Sender': {
          select: { name: 'Gizmo' },
        },
        'Priority': {
          select: { name: 'high' },
        },
        'Status': {
          select: { name: 'unread' },
        },
        'Expects Response': {
          checkbox: true,
        },
        'Timestamp': {
          date: { start: new Date().toISOString() },
        },
        'Thread ID': {
          rich_text: [{ text: { content: 'thread-002-sync' } }],
        },
      },
    });

    console.log('✅ Message sent from Gizmo to Claude!');
    console.log(`📄 Page ID: ${response.id}`);
    console.log(`🔗 URL: ${response.url}`);
    console.log('\n📋 Message Details:');
    console.log('   Sender: Gizmo');
    console.log('   Thread: thread-002-sync');
    console.log('   Priority: High');
    console.log('   Status: Unread (waiting for Claude)');

  } catch (error) {
    console.error('❌ Failed to send message:', error);
  }
}

sendGizmoMessage().catch(console.error);