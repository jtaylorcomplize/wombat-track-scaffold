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

async function printBlockTree(client: Client, block: any, indent = 0) {
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
          console.log(`${prefix}  🔗 Link: ${t.href}`);
        }
      });
    }
    
    if (block[type].title) {
      const title = typeof block[type].title === 'string' 
        ? block[type].title 
        : block[type].title;
      console.log(`${prefix}  Title: "${title}"`);
    }
    
    if (block[type].url) {
      console.log(`${prefix}  🔗 URL: ${block[type].url}`);
    }
    
    if (block[type].caption && Array.isArray(block[type].caption)) {
      const caption = block[type].caption.map((t: any) => t.plain_text).join('');
      if (caption) {
        console.log(`${prefix}  Caption: "${caption}"`);
      }
    }
  }
  
  // If block has children, fetch and print them
  if (block.has_children) {
    console.log(`${prefix}  📂 Has children...`);
    try {
      const children = await getPageBlocks(client, block.id);
      for (const child of children) {
        await printBlockTree(client, child, indent + 1);
      }
    } catch (error) {
      console.log(`${prefix}  ❌ Error fetching children: ${error}`);
    }
  }
  
  console.log('');
}

async function main() {
  console.log('🔍 Deep inspection of WT Unsorted Content page\n');
  
  const notionClient = createNotionClient();
  const client = notionClient.client;
  
  try {
    const pageId = '23ce1901-e36e-8031-8e42-dd4847213d04';
    
    console.log('📄 Reading page blocks...\n');
    const blocks = await getPageBlocks(client, pageId);
    
    console.log(`Total top-level blocks: ${blocks.length}\n`);
    console.log('Complete block tree:\n');
    
    let foundUnsortedHeader = false;
    
    for (const block of blocks) {
      // Check for "Unsorted Content" H1
      if (block.type === 'heading_1' && block.heading_1?.rich_text) {
        const text = block.heading_1.rich_text.map((t: any) => t.plain_text).join('');
        if (text.toLowerCase().includes('unsorted content')) {
          foundUnsortedHeader = true;
          console.log('=== FOUND "Unsorted Content" HEADER ===\n');
        } else if (foundUnsortedHeader) {
          console.log('=== END OF UNSORTED CONTENT SECTION ===\n');
          break;
        }
      }
      
      if (foundUnsortedHeader) {
        await printBlockTree(client, block);
      }
    }
    
  } catch (error) {
    console.error('💥 Error:', error);
    throw error;
  }
}

// Execute
main().catch(console.error);