#!/usr/bin/env npx tsx

import dotenv from 'dotenv';
import { createNotionClient } from '../src/utils/notionClient.ts';
import type { Client } from '@notionhq/client';

dotenv.config();

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

function printBlock(block: any, indent = 0) {
  const prefix = '  '.repeat(indent);
  const type = block.type;
  
  console.log(`${prefix}[${type}] (ID: ${block.id})`);
  
  // Print content based on type
  if (block[type]) {
    if (block[type].rich_text) {
      const text = block[type].rich_text.map((t: any) => t.plain_text).join('');
      if (text) {
        console.log(`${prefix}  Text: "${text}"`);
      }
      
      // Check for links
      block[type].rich_text.forEach((t: any) => {
        if (t.href) {
          console.log(`${prefix}  Link: ${t.href}`);
        }
      });
    }
    
    if (block[type].title) {
      const title = typeof block[type].title === 'string' 
        ? block[type].title 
        : block[type].title.map ? block[type].title.map((t: any) => t.plain_text).join('') : '';
      console.log(`${prefix}  Title: "${title}"`);
    }
    
    if (block[type].url) {
      console.log(`${prefix}  URL: ${block[type].url}`);
    }
    
    if (block[type].caption) {
      const caption = block[type].caption.map((t: any) => t.plain_text).join('');
      if (caption) {
        console.log(`${prefix}  Caption: "${caption}"`);
      }
    }
  }
  
  console.log('');
}

async function findUnsortedContentPage(client: Client): Promise<string | null> {
  try {
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
        const titleProp = result.properties.title || result.properties.Title;
        if (titleProp && titleProp.type === 'title') {
          const titleText = titleProp.title.map((t: any) => t.plain_text).join('');
          if (titleText.includes('WT-Unsorted-Content')) {
            console.log(`Found WT-Unsorted-Content page: ${result.id}`);
            console.log(`Title: ${titleText}`);
            console.log(`URL: ${(result as any).url}\n`);
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

async function main() {
  console.log('🔍 Inspecting WT-Unsorted-Content page structure\n');
  
  const notionClient = createNotionClient();
  const client = notionClient.client;
  
  try {
    const pageId = await findUnsortedContentPage(client);
    
    if (!pageId) {
      console.error('❌ Could not find WT-Unsorted-Content page');
      return;
    }
    
    console.log('📄 Reading page blocks...\n');
    const blocks = await getPageBlocks(client, pageId);
    
    console.log(`Total blocks found: ${blocks.length}\n`);
    console.log('Block structure:\n');
    
    blocks.forEach((block, index) => {
      console.log(`\n--- Block ${index + 1} ---`);
      printBlock(block);
    });
    
    // Look for any H1 headers
    console.log('\n🔍 H1 Headers found:');
    blocks.forEach((block) => {
      if (block.type === 'heading_1' && block.heading_1?.rich_text) {
        const text = block.heading_1.rich_text.map((t: any) => t.plain_text).join('');
        console.log(`  - "${text}"`);
      }
    });
    
    // Look for any child pages
    console.log('\n📄 Child pages found:');
    blocks.forEach((block) => {
      if (block.type === 'child_page') {
        console.log(`  - "${block.child_page.title}" (ID: ${block.id})`);
      }
    });
    
  } catch (error) {
    console.error('💥 Error:', error);
    throw error;
  }
}

// Execute
main().catch(console.error);