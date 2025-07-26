import { Client } from '@notionhq/client';
import dotenv from 'dotenv';

dotenv.config();

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const databaseId = process.env.NOTION_CLAUDE_GIZMO_DB_ID || '';

export async function pollClaudeMessages() {
  if (!databaseId) {
    console.error('❌ NOTION_CLAUDE_GIZMO_DB_ID not set in environment');
    return;
  }

  try {
    const response = await notion.databases.query({
      database_id: databaseId,
      filter: {
        and: [
          { property: 'Sender', select: { equals: 'Claude' } },
          { property: 'Status', select: { equals: 'unread' } }
        ]
      }
    });

    console.log(`📬 Found ${response.results.length} unread messages from Claude`);

    for (const result of response.results) {
      const pageId = result.id;
      const props = result.properties as any;
      
      const threadId = props['Thread ID']?.rich_text?.[0]?.plain_text || 'no-thread';
      const message = props['Message']?.title?.[0]?.plain_text || '';
      const fullContent = props['Full Content']?.rich_text?.[0]?.plain_text || '';
      const context = props['Context']?.rich_text?.[0]?.plain_text || '';
      const expectsResponse = props['Expects Response']?.checkbox || false;

      console.log(`\n📨 Message from Claude [${threadId}]:`);
      console.log(`   Title: ${message}`);
      console.log(`   Context: ${context}`);
      console.log(`   Content: ${fullContent}`);
      console.log(`   Expects Response: ${expectsResponse}`);

      // Mark as read
      await notion.pages.update({
        page_id: pageId,
        properties: {
          Status: { select: { name: 'read' } }
        }
      });

      // If expects response, create a response
      if (expectsResponse) {
        console.log('   ↩️  Sending response...');
        
        // Create response message
        await notion.pages.create({
          parent: { database_id: databaseId },
          properties: {
            'Message': {
              title: [{ text: { content: `Re: ${message}` } }]
            },
            'Full Content': {
              rich_text: [{ 
                text: { 
                  content: 'Confirmed — communication channel is operational. Gizmo received your message and can now communicate via this Notion database.' 
                } 
              }]
            },
            'Context': {
              rich_text: [{ text: { content: context } }]
            },
            'Sender': {
              select: { name: 'Gizmo' }
            },
            'Status': {
              select: { name: 'unread' }
            },
            'Thread ID': {
              rich_text: [{ text: { content: threadId } }]
            },
            'Timestamp': {
              date: { start: new Date().toISOString() }
            },
            'Response Link': {
              url: result.url
            }
          }
        });

        // Update original message status to responded
        await notion.pages.update({
          page_id: pageId,
          properties: {
            Status: { select: { name: 'responded' } }
          }
        });

        console.log('   ✅ Response sent!');
      }
    }

    if (response.results.length === 0) {
      console.log('📭 No unread messages from Claude');
    }

  } catch (error) {
    console.error('❌ Error polling messages:', error);
    throw error;
  }
}

// Check if running as main module
if (require.main === module) {
  console.log('🤖 Gizmo Message Poller Started\n');
  pollClaudeMessages()
    .then(() => console.log('\n✅ Polling complete'))
    .catch(error => console.error('💥 Polling failed:', error));
}