#!/usr/bin/env npx tsx

import dotenv from 'dotenv';
import { createNotionClient } from '../src/utils/notionClient.ts';
import { Client } from '@notionhq/client';

dotenv.config();

interface ContentItem {
  title: string;
  link: string;
  category?: string;
  type: 'file' | 'page' | 'link';
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

async function extractContentItems(client: Client, pageId: string): Promise<ContentItem[]> {
  const content: ContentItem[] = [];
  const blocks = await getPageBlocks(client, pageId);
  
  let foundUnsortedHeader = false;
  let currentCategory = '';
  
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    
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
      console.log(`\n📁 Processing category: ${currentCategory}`);
      
      // If this H2 has children, process them
      if (block.has_children) {
        try {
          const childBlocks = await getPageBlocks(client, block.id);
          
          for (const child of childBlocks) {
            // Handle file blocks
            if (child.type === 'file') {
              const fileUrl = child.file.type === 'external' 
                ? child.file.external.url 
                : child.file.file.url;
              
              const fileName = child.file.caption?.[0]?.plain_text || 
                            child.file.name ||
                            fileUrl.split('/').pop() || 
                            'Untitled File';
              
              content.push({
                title: fileName,
                link: fileUrl,
                category: currentCategory,
                type: 'file'
              });
              console.log(`  📄 Found file: ${fileName}`);
            }
            
            // Handle child pages
            if (child.type === 'child_page') {
              const pageUrl = `https://www.notion.so/${child.id.replace(/-/g, '')}`;
              content.push({
                title: child.child_page.title,
                link: pageUrl,
                category: currentCategory,
                type: 'page'
              });
              console.log(`  📑 Found page: ${child.child_page.title}`);
            }
            
            // Handle bookmarks
            if (child.type === 'bookmark' && child.bookmark?.url) {
              const caption = child.bookmark.caption?.[0]?.plain_text || 
                             child.bookmark.url.split('/').pop() || 
                             'Untitled Bookmark';
              content.push({
                title: caption,
                link: child.bookmark.url,
                category: currentCategory,
                type: 'link'
              });
              console.log(`  🔗 Found bookmark: ${caption}`);
            }
            
            // Handle paragraphs with links
            if (child.type === 'paragraph' && child.paragraph?.rich_text) {
              for (const textItem of child.paragraph.rich_text) {
                if (textItem.href) {
                  content.push({
                    title: textItem.plain_text || 'Untitled Link',
                    link: textItem.href,
                    category: currentCategory,
                    type: 'link'
                  });
                  console.log(`  🔗 Found link: ${textItem.plain_text}`);
                }
              }
            }
          }
        } catch (error) {
          console.error(`  ❌ Error processing children of ${currentCategory}:`, error);
        }
      }
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
      console.log(`  Type: ${item.type}`);
      console.log(`  Category: ${item.category}`);
      
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
      if (item.category || item.type) {
        const notes = [`Type: ${item.type}`];
        if (item.category) notes.push(`Category: ${item.category}`);
        
        properties['Notes'] = {
          rich_text: [
            {
              text: {
                content: notes.join(' | ')
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
  console.log('🚀 Final attempt to populate Unsorted Content Register\n');
  
  const notionClient = createNotionClient();
  const client = notionClient.client;
  
  try {
    // The correct page with "Unsorted Content" H1 header
    const pageId = '23ce1901-e36e-8031-8e42-dd4847213d04';
    
    console.log('📄 Extracting content from WT Unsorted Content page...');
    const content = await extractContentItems(client, pageId);
    
    console.log(`\n📊 Found ${content.length} content items total`);
    
    if (content.length === 0) {
      console.log('\n⚠️  No content items found.');
      return;
    }
    
    // Show summary by category
    const categoryCounts: Record<string, number> = {};
    content.forEach(item => {
      categoryCounts[item.category || 'Uncategorized'] = (categoryCounts[item.category || 'Uncategorized'] || 0) + 1;
    });
    
    console.log('\n📊 Content breakdown by category:');
    Object.entries(categoryCounts).forEach(([category, count]) => {
      console.log(`  ${category}: ${count} items`);
    });
    
    // Populate the Unsorted Content Register database
    const unsortedContentRegisterId = '23de1901-e36e-8149-89d3-caaa4902ecd2';
    await populateUnsortedContentRegister(client, unsortedContentRegisterId, content);
    
    console.log('\n✅ Task completed!');
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