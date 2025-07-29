#!/usr/bin/env npx tsx

import dotenv from 'dotenv';
import { createNotionClient } from '../src/utils/notionClient.ts';
import { Client } from '@notionhq/client';

dotenv.config();

interface ContentItem {
  title: string;
  link: string;
  category?: string;
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

async function extractAllContent(client: Client, blocks: any[]): Promise<ContentItem[]> {
  const content: ContentItem[] = [];
  let foundUnsortedHeader = false;
  let currentCategory = '';
  
  for (const block of blocks) {
    // Check for "Unsorted Content" H1
    if (block.type === 'heading_1' && block.heading_1?.rich_text) {
      const text = block.heading_1.rich_text.map((t: any) => t.plain_text).join('');
      if (text.toLowerCase().includes('unsorted content')) {
        foundUnsortedHeader = true;
        continue;
      } else if (foundUnsortedHeader) {
        // Stop at next H1 after "Unsorted Content"
        break;
      }
    }
    
    if (!foundUnsortedHeader) continue;
    
    // Track H2 headers as categories
    if (block.type === 'heading_2' && block.heading_2?.rich_text) {
      currentCategory = block.heading_2.rich_text.map((t: any) => t.plain_text).join('');
      console.log(`\n📁 Category: ${currentCategory}`);
      continue;
    }
    
    // Extract content from various block types
    
    // Paragraph blocks with links
    if (block.type === 'paragraph' && block.paragraph?.rich_text) {
      for (const textItem of block.paragraph.rich_text) {
        if (textItem.href) {
          const item = {
            title: textItem.plain_text || 'Untitled',
            link: textItem.href,
            category: currentCategory
          };
          content.push(item);
          console.log(`  - ${item.title}`);
        }
      }
      
      // Check if the entire paragraph is a URL
      const fullText = block.paragraph.rich_text.map((t: any) => t.plain_text).join('');
      if (fullText && fullText.startsWith('http')) {
        const item = {
          title: fullText.split('/').pop() || 'Untitled',
          link: fullText,
          category: currentCategory
        };
        content.push(item);
        console.log(`  - ${item.title}`);
      }
    }
    
    // Bookmark blocks
    if (block.type === 'bookmark' && block.bookmark?.url) {
      const caption = block.bookmark.caption?.[0]?.plain_text || 
                     block.bookmark.url.split('/').pop() || 
                     'Untitled Bookmark';
      const item = {
        title: caption,
        link: block.bookmark.url,
        category: currentCategory
      };
      content.push(item);
      console.log(`  - ${item.title}`);
    }
    
    // Child pages
    if (block.type === 'child_page') {
      const pageUrl = `https://www.notion.so/${block.id.replace(/-/g, '')}`;
      const item = {
        title: block.child_page.title,
        link: pageUrl,
        category: currentCategory
      };
      content.push(item);
      console.log(`  - ${item.title}`);
    }
    
    // Bulleted list items
    if (block.type === 'bulleted_list_item' && block.bulleted_list_item?.rich_text) {
      const fullText = block.bulleted_list_item.rich_text.map((t: any) => t.plain_text).join('');
      
      // Check for links in the text
      for (const textItem of block.bulleted_list_item.rich_text) {
        if (textItem.href) {
          const item = {
            title: textItem.plain_text || fullText || 'Untitled',
            link: textItem.href,
            category: currentCategory
          };
          content.push(item);
          console.log(`  - ${item.title}`);
        }
      }
      
      // Check if the text itself is a URL
      if (fullText && fullText.startsWith('http')) {
        const item = {
          title: fullText.split('/').pop() || 'Untitled',
          link: fullText,
          category: currentCategory
        };
        content.push(item);
        console.log(`  - ${item.title}`);
      }
    }
    
    // Numbered list items
    if (block.type === 'numbered_list_item' && block.numbered_list_item?.rich_text) {
      const fullText = block.numbered_list_item.rich_text.map((t: any) => t.plain_text).join('');
      
      for (const textItem of block.numbered_list_item.rich_text) {
        if (textItem.href) {
          const item = {
            title: textItem.plain_text || fullText || 'Untitled',
            link: textItem.href,
            category: currentCategory
          };
          content.push(item);
          console.log(`  - ${item.title}`);
        }
      }
      
      if (fullText && fullText.startsWith('http')) {
        const item = {
          title: fullText.split('/').pop() || 'Untitled',
          link: fullText,
          category: currentCategory
        };
        content.push(item);
        console.log(`  - ${item.title}`);
      }
    }
    
    // Toggle blocks (they might contain child blocks)
    if (block.type === 'toggle' && block.has_children) {
      const toggleText = block.toggle.rich_text.map((t: any) => t.plain_text).join('');
      console.log(`  📂 Toggle: ${toggleText}`);
      
      // Get child blocks
      const childBlocks = await getPageBlocks(client, block.id);
      const childContent = await extractAllContent(client, childBlocks);
      
      // Add category prefix to child content
      childContent.forEach(item => {
        item.title = `${toggleText} > ${item.title}`;
        item.category = currentCategory;
      });
      
      content.push(...childContent);
    }
  }
  
  return content;
}

async function populateUnsortedContentRegister(client: Client, databaseId: string, content: ContentItem[]) {
  console.log(`\n\n📊 Populating Unsorted Content Register with ${content.length} items...\n`);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const item of content) {
    try {
      console.log(`Adding: ${item.title}`);
      if (item.category) {
        console.log(`  Category: ${item.category}`);
      }
      
      const properties: any = {
        'Title': {
          title: [
            {
              text: {
                content: item.title.substring(0, 2000) // Notion title limit
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
      };
      
      // Add category/notes if available
      if (item.category) {
        properties['Notes'] = {
          rich_text: [
            {
              text: {
                content: `Category: ${item.category}`
              }
            }
          ]
        };
      }
      
      await client.pages.create({
        parent: { database_id: databaseId },
        properties
      });
      
      successCount++;
      console.log(`✅ Added successfully\n`);
    } catch (error) {
      errorCount++;
      console.error(`❌ Failed to add "${item.title}":`, error);
      console.log('');
    }
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`  ✅ Successfully added: ${successCount} items`);
  console.log(`  ❌ Failed: ${errorCount} items`);
}

async function main() {
  console.log('🚀 Extracting and populating unsorted content\n');
  
  const notionClient = createNotionClient();
  const client = notionClient.client;
  
  try {
    // The correct page with "Unsorted Content" H1 header
    const pageId = '23ce1901-e36e-8031-8e42-dd4847213d04';
    
    console.log('📄 Reading page content...');
    const blocks = await getPageBlocks(client, pageId);
    
    console.log('\n🔍 Extracting content...\n');
    const content = await extractAllContent(client, blocks);
    
    if (content.length === 0) {
      console.log('\n⚠️  No content items found to populate.');
      console.log('\nThe page might contain content in a format not yet handled by this script.');
      console.log('Please check the page manually: https://www.notion.so/WT-Unsorted-Content-26JUL1847-23ce1901e36e80318e42dd4847213d04');
      return;
    }
    
    // Populate the Unsorted Content Register database
    const unsortedContentRegisterId = '23de1901-e36e-8149-89d3-caaa4902ecd2';
    await populateUnsortedContentRegister(client, unsortedContentRegisterId, content);
    
    console.log('\n✅ Task completed!');
    console.log('\n📊 Database URL:');
    console.log('Unsorted Content Register: https://www.notion.so/roammigrationlaw/23de1901e36e814989d3caaa4902ecd2');
    
  } catch (error) {
    console.error('💥 Error:', error);
    throw error;
  }
}

// Execute
main().catch(console.error);