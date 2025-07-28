#!/usr/bin/env npx tsx

import { Client } from '@notionhq/client';
import { config } from 'dotenv';
import { readFileSync } from 'fs';
import path from 'path';

// Load environment variables
config();
config({ path: '.env.wt-databases' });

const notion = new Client({
  auth: process.env.NOTION_TOKEN
});

const CLAUDE_GIZMO_DB_ID = process.env.NOTION_CLAUDE_GIZMO_DB_ID;

interface NotionCommand {
  id: string;
  message: string;
  fullContent: string;
  context: string;
  sender: string;
  priority: string;
  status: string;
  expectsResponse: boolean;
  timestamp: string;
}

async function checkNotionDispatcher() {
  console.log('🔍 Checking Notion Dispatcher (ClaudeGizmoDB) for commands...\n');

  if (!CLAUDE_GIZMO_DB_ID) {
    console.error('❌ NOTION_CLAUDE_GIZMO_DB_ID not found in environment');
    return;
  }

  try {
    // Query for unread messages or readyNow commands
    const response = await notion.databases.query({
      database_id: CLAUDE_GIZMO_DB_ID,
      filter: {
        or: [
          {
            property: 'Status',
            select: {
              equals: 'unread'
            }
          },
          {
            property: 'Message',
            title: {
              contains: 'readyNow'
            }
          },
          {
            and: [
              {
                property: 'Sender',
                select: {
                  equals: 'Gizmo'
                }
              },
              {
                property: 'Timestamp',
                date: {
                  after: new Date(Date.now() - 30 * 60 * 1000).toISOString() // Last 30 minutes
                }
              }
            ]
          }
        ]
      },
      sorts: [
        {
          property: 'Priority',
          direction: 'descending'
        },
        {
          property: 'Timestamp',
          direction: 'descending'
        }
      ]
    });

    if (response.results.length === 0) {
      console.log('📭 No pending commands found in Notion Dispatcher');
      return;
    }

    console.log(`📬 Found ${response.results.length} command(s):\n`);

    for (const page of response.results) {
      if ('properties' in page) {
        const props = page.properties;
        
        const command: NotionCommand = {
          id: page.id,
          message: props.Message?.title?.[0]?.plain_text || '',
          fullContent: props['Full Content']?.rich_text?.[0]?.plain_text || '',
          context: props.Context?.rich_text?.[0]?.plain_text || '',
          sender: props.Sender?.select?.name || '',
          priority: props.Priority?.select?.name || 'medium',
          status: props.Status?.select?.name || '',
          expectsResponse: props['Expects Response']?.checkbox || false,
          timestamp: props.Timestamp?.date?.start || ''
        };

        console.log(`📋 Command ${response.results.indexOf(page) + 1}:`);
        console.log(`   ID: ${command.id}`);
        console.log(`   Message: ${command.message}`);
        console.log(`   Sender: ${command.sender}`);
        console.log(`   Priority: ${command.priority}`);
        console.log(`   Status: ${command.status}`);
        console.log(`   Timestamp: ${command.timestamp}`);
        
        if (command.fullContent) {
          console.log(`   Full Content: ${command.fullContent.substring(0, 100)}...`);
        }
        
        if (command.context) {
          console.log(`   Context: ${command.context}`);
        }

        console.log(`   Expects Response: ${command.expectsResponse}`);
        console.log('');

        // Check for specific command patterns
        if (command.message.toLowerCase().includes('commit verification') || 
            command.fullContent.toLowerCase().includes('wombat track ci/cd')) {
          console.log('🎯 Found CI/CD commit verification command!');
          console.log('📝 Command details:');
          console.log(command.fullContent || command.message);
          
          // Mark as read
          await notion.pages.update({
            page_id: page.id,
            properties: {
              'Status': {
                select: {
                  name: 'read'
                }
              }
            }
          });
          
          console.log('✅ Marked command as read');
        }
      }
    }

    // Check for any specific Wombat Track CI/CD commands
    const cicdCommands = response.results.filter(page => {
      if ('properties' in page) {
        const message = page.properties.Message?.title?.[0]?.plain_text || '';
        const content = page.properties['Full Content']?.rich_text?.[0]?.plain_text || '';
        return message.toLowerCase().includes('ci/cd') || 
               content.toLowerCase().includes('wombat track') ||
               content.toLowerCase().includes('commit verification');
      }
      return false;
    });

    if (cicdCommands.length > 0) {
      console.log(`\n🚀 Found ${cicdCommands.length} Wombat Track CI/CD related command(s)`);
      console.log('These commands require SDLC protocol execution.');
    }

  } catch (error) {
    console.error('❌ Error querying Notion:', error);
  }
}

// Run the check
checkNotionDispatcher().catch(console.error);