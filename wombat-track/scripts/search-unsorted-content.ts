#!/usr/bin/env npx tsx

import dotenv from 'dotenv';
import { createNotionClient } from '../src/utils/notionClient.ts';
import { Client } from '@notionhq/client';

dotenv.config();

async function searchForUnsortedContent(client: Client) {
  console.log('🔍 Searching for pages with "Unsorted Content"...\n');
  
  try {
    // Search for any page containing "Unsorted Content"
    const response = await client.search({
      query: 'Unsorted Content',
      filter: {
        value: 'page',
        property: 'object'
      },
      page_size: 20
    });
    
    console.log(`Found ${response.results.length} pages:\n`);
    
    for (const result of response.results) {
      if (result.object === 'page' && 'properties' in result) {
        const titleProp = result.properties.title || result.properties.Title;
        if (titleProp && titleProp.type === 'title') {
          const titleText = titleProp.title.map((t: any) => t.plain_text).join('');
          console.log(`Page: "${titleText}"`);
          console.log(`ID: ${result.id}`);
          console.log(`URL: ${(result as any).url}`);
          console.log(`Last edited: ${result.last_edited_time}\n`);
        }
      }
    }
    
    return response.results;
  } catch (error) {
    console.error('Error searching:', error);
    return [];
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

async function searchForH1Header(client: Client, pageId: string, headerText: string): Promise<boolean> {
  const blocks = await getPageBlocks(client, pageId);
  
  for (const block of blocks) {
    if (block.type === 'heading_1' && block.heading_1?.rich_text) {
      const text = block.heading_1.rich_text.map((t: any) => t.plain_text).join('');
      if (text.toLowerCase().includes(headerText.toLowerCase())) {
        return true;
      }
    }
  }
  
  return false;
}

async function main() {
  const notionClient = createNotionClient();
  const client = notionClient.client;
  
  try {
    // First, search for all pages with "Unsorted Content"
    const pages = await searchForUnsortedContent(client);
    
    // Then check each page for the H1 header
    console.log('\n🔍 Checking each page for "Unsorted Content" H1 header...\n');
    
    for (const page of pages) {
      if (page.object === 'page') {
        const titleProp = page.properties.title || page.properties.Title;
        if (titleProp && titleProp.type === 'title') {
          const titleText = titleProp.title.map((t: any) => t.plain_text).join('');
          console.log(`Checking page: "${titleText}"`);
          
          const hasHeader = await searchForH1Header(client, page.id, 'Unsorted Content');
          
          if (hasHeader) {
            console.log(`✅ Found "Unsorted Content" H1 header!`);
            console.log(`Page ID: ${page.id}`);
            console.log(`Page URL: ${(page as any).url}\n`);
            
            // Get and display the content under this header
            console.log('📄 Getting page content...\n');
            const blocks = await getPageBlocks(client, page.id);
            
            let foundHeader = false;
            let contentCount = 0;
            
            for (const block of blocks) {
              if (block.type === 'heading_1' && block.heading_1?.rich_text) {
                const text = block.heading_1.rich_text.map((t: any) => t.plain_text).join('');
                if (text.toLowerCase().includes('unsorted content')) {
                  foundHeader = true;
                  console.log(`Found header: "${text}"\n`);
                  console.log('Content after header:\n');
                  continue;
                }
              }
              
              if (foundHeader) {
                // Stop at next H1
                if (block.type === 'heading_1') {
                  break;
                }
                
                contentCount++;
                console.log(`Block ${contentCount}: ${block.type}`);
                
                // Display content details
                if (block[block.type]?.rich_text) {
                  const text = block[block.type].rich_text.map((t: any) => t.plain_text).join('');
                  if (text) console.log(`  Text: "${text}"`);
                  
                  block[block.type].rich_text.forEach((t: any) => {
                    if (t.href) console.log(`  Link: ${t.href}`);
                  });
                }
                
                if (block.type === 'bookmark' && block.bookmark?.url) {
                  console.log(`  URL: ${block.bookmark.url}`);
                }
                
                if (block.type === 'child_page') {
                  console.log(`  Child Page: ${block.child_page.title}`);
                }
                
                console.log('');
              }
            }
            
            if (contentCount === 0) {
              console.log('No content found after the header.\n');
            }
          } else {
            console.log(`❌ No "Unsorted Content" H1 header found\n`);
          }
        }
      }
    }
    
  } catch (error) {
    console.error('💥 Error:', error);
    throw error;
  }
}

// Execute
main().catch(console.error);