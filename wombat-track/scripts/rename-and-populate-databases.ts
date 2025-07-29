#!/usr/bin/env npx tsx

import dotenv from 'dotenv';
import { createNotionClient } from '../src/utils/notionClient.ts';
import { Client } from '@notionhq/client';

dotenv.config();

interface DatabaseRename {
  databaseId: string;
  newName: string;
}

async function renameDatabases(client: Client, renames: DatabaseRename[]) {
  console.log('📝 Renaming databases...\n');
  
  for (const { databaseId, newName } of renames) {
    try {
      console.log(`Renaming database ${databaseId} to "${newName}"...`);
      
      await client.databases.update({
        database_id: databaseId,
        title: [
          {
            type: 'text',
            text: {
              content: newName
            }
          }
        ]
      });
      
      console.log(`✅ Successfully renamed to "${newName}"\n`);
    } catch (error) {
      console.error(`❌ Failed to rename database ${databaseId}:`, error);
    }
  }
}

async function getPageBlocks(client: Client, pageId: string): Promise<any[]> {
  const blocks: any[] = [];
  let hasMore = true;
  let cursor: string | undefined;

  while (hasMore) {
    const response = await client.blocks.children.list({
      block_id: pageId,
      start_cursor: cursor,
      page_size: 100
    });

    blocks.push(...response.results);
    hasMore = response.has_more;
    cursor = response.next_cursor || undefined;
  }

  return blocks;
}

async function extractContentFromBlocks(client: Client, blocks: any[], afterHeader: string): Promise<Array<{title: string, link: string}>> {
  const content: Array<{title: string, link: string}> = [];
  let foundHeader = false;
  
  for (const block of blocks) {
    // Check if this is the header we're looking for
    if (block.type === 'heading_1' && block.heading_1?.rich_text) {
      const headerText = block.heading_1.rich_text.map((t: any) => t.plain_text).join('');
      if (headerText.includes(afterHeader)) {
        foundHeader = true;
        continue;
      }
    }
    
    // If we've found the header, collect content
    if (foundHeader) {
      // Stop if we hit another H1 header
      if (block.type === 'heading_1') {
        break;
      }
      
      // Extract links from various block types
      if (block.type === 'paragraph' && block.paragraph?.rich_text) {
        for (const textItem of block.paragraph.rich_text) {
          if (textItem.href) {
            content.push({
              title: textItem.plain_text || 'Untitled',
              link: textItem.href
            });
          }
        }
      }
      
      // Check for bookmark blocks
      if (block.type === 'bookmark' && block.bookmark?.url) {
        const caption = block.bookmark.caption?.[0]?.plain_text || block.bookmark.url;
        content.push({
          title: caption,
          link: block.bookmark.url
        });
      }
      
      // Check for child pages
      if (block.type === 'child_page') {
        const pageUrl = `https://www.notion.so/${block.id.replace(/-/g, '')}`;
        content.push({
          title: block.child_page.title,
          link: pageUrl
        });
      }
      
      // Check for bulleted list items
      if (block.type === 'bulleted_list_item' && block.bulleted_list_item?.rich_text) {
        for (const textItem of block.bulleted_list_item.rich_text) {
          if (textItem.href) {
            content.push({
              title: textItem.plain_text || 'Untitled',
              link: textItem.href
            });
          }
        }
      }
      
      // Check for numbered list items
      if (block.type === 'numbered_list_item' && block.numbered_list_item?.rich_text) {
        for (const textItem of block.numbered_list_item.rich_text) {
          if (textItem.href) {
            content.push({
              title: textItem.plain_text || 'Untitled',
              link: textItem.href
            });
          }
        }
      }
    }
  }
  
  return content;
}

async function findUnsortedContentPage(client: Client): Promise<string | null> {
  try {
    // Search for pages with "WT-Unsorted-Content" in the title
    const response = await client.search({
      query: 'WT-Unsorted-Content',
      filter: {
        value: 'page',
        property: 'object'
      },
      sort: {
        direction: 'descending',
        timestamp: 'last_edited_time'
      }
    });
    
    for (const result of response.results) {
      if (result.object === 'page' && 'properties' in result) {
        // Check if the title contains WT-Unsorted-Content
        const titleProp = result.properties.title || result.properties.Title;
        if (titleProp && titleProp.type === 'title') {
          const titleText = titleProp.title.map((t: any) => t.plain_text).join('');
          if (titleText.includes('WT-Unsorted-Content')) {
            console.log(`Found WT-Unsorted-Content page: ${result.id}`);
            return result.id;
          }
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error searching for WT-Unsorted-Content page:', error);
    return null;
  }
}

async function populateUnsortedContentRegister(client: Client, databaseId: string, content: Array<{title: string, link: string}>) {
  console.log(`\n📊 Populating Unsorted Content Register with ${content.length} items...\n`);
  
  for (const item of content) {
    try {
      console.log(`Adding: ${item.title}`);
      
      await client.pages.create({
        parent: { database_id: databaseId },
        properties: {
          'Title': {
            title: [
              {
                text: {
                  content: item.title
                }
              }
            ]
          },
          'SourceLink': {
            url: item.link
          },
          'ParseStatus': {
            select: {
              name: 'Not Started'
            }
          },
          'Created': {
            date: {
              start: new Date().toISOString()
            }
          }
        }
      });
      
      console.log(`✅ Added successfully\n`);
    } catch (error) {
      console.error(`❌ Failed to add "${item.title}":`, error);
    }
  }
}

async function main() {
  console.log('🚀 Starting database rename and population task\n');
  
  const notionClient = createNotionClient();
  const client = notionClient.client;
  
  try {
    // Task 1: Rename databases
    const databaseRenames: DatabaseRename[] = [
      {
        databaseId: '23de1901-e36e-8149-89d3-caaa4902ecd2',
        newName: 'Unsorted Content Register'
      },
      {
        databaseId: '23de1901-e36e-81e2-bff2-ca4451f734ec',
        newName: 'Temporary Holding Table'
      },
      {
        databaseId: '23de1901-e36e-81cd-b3f4-efac55a1bb34',
        newName: 'Routing Table'
      }
    ];
    
    await renameDatabases(client, databaseRenames);
    
    // Task 2: Find WT-Unsorted-Content page
    console.log('🔍 Searching for WT-Unsorted-Content page...\n');
    const unsortedContentPageId = await findUnsortedContentPage(client);
    
    if (!unsortedContentPageId) {
      console.error('❌ Could not find WT-Unsorted-Content page');
      return;
    }
    
    // Get page content
    console.log('📄 Reading page content...\n');
    const blocks = await getPageBlocks(client, unsortedContentPageId);
    
    // Extract content under "Unsorted Content" header
    const unsortedContent = await extractContentFromBlocks(client, blocks, 'Unsorted Content');
    
    console.log(`Found ${unsortedContent.length} content items:\n`);
    unsortedContent.forEach(item => {
      console.log(`  - ${item.title}`);
    });
    
    // Populate the Unsorted Content Register database
    const unsortedContentRegisterId = '23de1901-e36e-8149-89d3-caaa4902ecd2';
    await populateUnsortedContentRegister(client, unsortedContentRegisterId, unsortedContent);
    
    console.log('\n✅ All tasks completed successfully!');
    console.log('\n📊 Database URLs:');
    console.log('Unsorted Content Register: https://www.notion.so/roammigrationlaw/23de1901e36e814989d3caaa4902ecd2');
    console.log('Temporary Holding Table: https://www.notion.so/roammigrationlaw/23de1901e36e81e2bff2ca4451f734ec');
    console.log('Routing Table: https://www.notion.so/roammigrationlaw/23de1901e36e81cdb3f4efac55a1bb34');
    
  } catch (error) {
    console.error('💥 Error:', error);
    throw error;
  }
}

// Execute
main().catch(console.error);