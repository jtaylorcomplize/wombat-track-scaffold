#!/usr/bin/env npx tsx

import { Client } from '@notionhq/client';
import { config } from 'dotenv';

// Load environment variables
config();
config({ path: '.env.wt-databases' });

const notion = new Client({
  auth: process.env.NOTION_TOKEN
});

const CLAUDE_GIZMO_DB_ID = process.env.NOTION_CLAUDE_GIZMO_DB_ID;

async function checkCICDCommands() {
  console.log('🔍 Searching for Wombat Track CI/CD commit verification commands...\n');

  if (!CLAUDE_GIZMO_DB_ID) {
    console.error('❌ NOTION_CLAUDE_GIZMO_DB_ID not found in environment');
    return;
  }

  try {
    // Query for CI/CD related messages
    const response = await notion.databases.query({
      database_id: CLAUDE_GIZMO_DB_ID,
      filter: {
        or: [
          {
            property: 'Message',
            title: {
              contains: 'commit'
            }
          },
          {
            property: 'Message',
            title: {
              contains: 'CI/CD'
            }
          },
          {
            property: 'Full Content',
            rich_text: {
              contains: 'commit verification'
            }
          },
          {
            property: 'Full Content',
            rich_text: {
              contains: 'Wombat Track CI/CD'
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
                property: 'Status',
                select: {
                  equals: 'unread'
                }
              }
            ]
          }
        ]
      },
      sorts: [
        {
          property: 'Timestamp',
          direction: 'descending'
        }
      ],
      page_size: 50
    });

    if (response.results.length === 0) {
      console.log('❌ No CI/CD commit verification commands found');
      
      // Let's also check ALL recent Gizmo messages
      console.log('\n📋 Checking ALL recent Gizmo messages...\n');
      
      const gizmoMessages = await notion.databases.query({
        database_id: CLAUDE_GIZMO_DB_ID,
        filter: {
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
                after: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // Last 24 hours
              }
            }
          ]
        },
        sorts: [
          {
            property: 'Timestamp',
            direction: 'descending'
          }
        ]
      });

      console.log(`Found ${gizmoMessages.results.length} recent Gizmo messages`);
      
      for (const page of gizmoMessages.results.slice(0, 5)) {
        if ('properties' in page) {
          const props = page.properties;
          console.log(`\n📝 Gizmo Message:`);
          console.log(`   Message: ${props.Message?.title?.[0]?.plain_text || 'N/A'}`);
          console.log(`   Status: ${props.Status?.select?.name || 'N/A'}`);
          console.log(`   Timestamp: ${props.Timestamp?.date?.start || 'N/A'}`);
          
          const content = props['Full Content']?.rich_text?.[0]?.plain_text || '';
          if (content) {
            console.log(`   Content Preview: ${content.substring(0, 200)}...`);
          }
        }
      }
      
      return;
    }

    console.log(`✅ Found ${response.results.length} potential CI/CD command(s)\n`);

    for (const page of response.results) {
      if ('properties' in page) {
        const props = page.properties;
        
        const message = props.Message?.title?.[0]?.plain_text || '';
        const fullContent = props['Full Content']?.rich_text?.[0]?.plain_text || '';
        const sender = props.Sender?.select?.name || '';
        const status = props.Status?.select?.name || '';
        const timestamp = props.Timestamp?.date?.start || '';

        console.log(`📋 Command:`);
        console.log(`   ID: ${page.id}`);
        console.log(`   Message: ${message}`);
        console.log(`   Sender: ${sender}`);
        console.log(`   Status: ${status}`);
        console.log(`   Timestamp: ${timestamp}`);
        
        if (fullContent) {
          console.log(`   Full Content:\n${'-'.repeat(60)}`);
          console.log(fullContent);
          console.log(`${'-'.repeat(60)}\n`);
        }

        // Execute if it's a CI/CD verification command
        if ((message.toLowerCase().includes('commit verification') || 
             fullContent.toLowerCase().includes('wombat track ci/cd')) && 
            status === 'unread') {
          
          console.log('🎯 This is the CI/CD commit verification command!');
          console.log('📌 Marking as read and preparing to execute...\n');
          
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
          
          // TODO: Execute the SDLC protocol for this command
          console.log('⚡ Ready to execute SDLC protocol for this command');
        }
      }
    }

  } catch (error) {
    console.error('❌ Error querying Notion:', error);
  }
}

// Run the check
checkCICDCommands().catch(console.error);