#!/usr/bin/env npx tsx

import dotenv from 'dotenv';
import { NotionDatabaseCreator } from '../src/utils/notionDatabaseCreator.ts';

dotenv.config();

async function setupClaudeGizmoDatabase() {
  console.log('🤖 Setting up Claude-Gizmo Communication Database...\n');

  const parentPageId = process.env.NOTION_WT_PARENT_PAGE_ID;
  if (!parentPageId) {
    console.error('❌ Please run setup-wt-databases.ts first to get parent page ID');
    return;
  }

  const creator = new NotionDatabaseCreator(
    process.env.NOTION_TOKEN!,
    parentPageId
  );

  const schema = {
    name: 'Claude-Gizmo Communication',
    description: 'Async message queue for AI agent communication',
    properties: {
      'Message': {
        title: {},
      },
      'Full Content': {
        rich_text: {},
      },
      'Context': {
        rich_text: {},
      },
      'Sender': {
        select: {
          options: [
            { name: 'Claude', color: 'purple' },
            { name: 'Gizmo', color: 'green' },
            { name: 'User', color: 'blue' },
            { name: 'System', color: 'gray' },
          ],
        },
      },
      'Priority': {
        select: {
          options: [
            { name: 'low', color: 'gray' },
            { name: 'medium', color: 'yellow' },
            { name: 'high', color: 'orange' },
            { name: 'urgent', color: 'red' },
          ],
        },
      },
      'Status': {
        select: {
          options: [
            { name: 'unread', color: 'red' },
            { name: 'read', color: 'yellow' },
            { name: 'responded', color: 'green' },
            { name: 'archived', color: 'gray' },
          ],
        },
      },
      'Expects Response': {
        checkbox: {},
      },
      'Response Link': {
        url: {},
      },
      'Timestamp': {
        date: {},
      },
      'Thread ID': {
        rich_text: {},
      },
      'Attachments': {
        files: {},
      },
    },
  };

  try {
    const result = await creator.createDatabase(schema);
    
    if (result.success) {
      console.log('✅ Claude-Gizmo Communication database created!');
      console.log(`📊 Database ID: ${result.databaseId}`);
      console.log(`🔗 URL: ${result.url}`);
      
      // Save to env file
      const fs = await import('fs/promises');
      const envContent = `\n# Claude-Gizmo Communication\nNOTION_CLAUDE_GIZMO_DB_ID=${result.databaseId}\n`;
      await fs.appendFile('.env.wt-databases', envContent);
      
      console.log('\n📋 Communication Protocol:');
      console.log('1. Claude sends messages with "Claude" as sender');
      console.log('2. Gizmo polls for unread messages where sender = "Claude"');
      console.log('3. Gizmo marks messages as "read" and optionally "responded"');
      console.log('4. Both agents can check thread history via Thread ID');
      
    } else {
      console.error('❌ Failed to create database:', result.error);
    }
  } catch (error) {
    console.error('💥 Error:', error);
  }
}

setupClaudeGizmoDatabase().catch(console.error);