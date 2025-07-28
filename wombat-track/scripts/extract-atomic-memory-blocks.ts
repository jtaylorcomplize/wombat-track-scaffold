#!/usr/bin/env npx tsx

/**
 * Phase 1.2A - Atomic Memory Extraction Loop
 * 
 * Extracts the first 10 atomic memory blocks from the WT-Unsorted-Content document
 * and creates temporary holding table entries.
 */

import { createNotionClient } from '../src/utils/notionClient.js';
import dotenv from 'dotenv';

dotenv.config();

// Extract page ID from the Notion URL
const NOTION_URL = 'https://www.notion.so/roammigrationlaw/WT-Unsorted-Content-26JUL1847-23ce1901e36e80318e42dd4847213d04';
const PAGE_ID = '23ce1901e36e80318e42dd4847213d04'; // Extracted from the URL

interface AtomicMemoryBlock {
  BlockTitle: string;
  RawText: string;
  BlockID: string;
  BlockNumber: number;
  ParsePass: number;
  SourceDoc: string;
  BlockCategory: string;
  ReadyForRouting: boolean;
}

class AtomicMemoryExtractor {
  private notionClient: any;

  constructor() {
    this.notionClient = createNotionClient(process.env.NOTION_TOKEN);
  }

  async extractPageContent(): Promise<string[]> {
    try {
      console.log('🔍 Accessing Notion page content...');
      
      // Get the page details
      const page = await this.notionClient.getPage(PAGE_ID);
      console.log('📄 Page retrieved:', page.url);

      // Get all blocks (content) from the page
      const blocks = await this.notionClient.client.blocks.children.list({
        block_id: PAGE_ID,
        page_size: 100
      });

      console.log(`📝 Found ${blocks.results.length} blocks in the page`);

      // Extract text content from blocks
      const textBlocks: string[] = [];
      
      for (const block of blocks.results) {
        const textContent = this.extractTextFromBlock(block);
        if (textContent && textContent.trim().length > 0) {
          textBlocks.push(textContent.trim());
        }
      }

      return textBlocks;
    } catch (error) {
      console.error('❌ Error accessing Notion page:', error);
      throw error;
    }
  }

  private extractTextFromBlock(block: any): string {
    const type = block.type;
    
    switch (type) {
      case 'paragraph':
        return this.extractRichText(block.paragraph?.rich_text || []);
      case 'heading_1':
        return this.extractRichText(block.heading_1?.rich_text || []);
      case 'heading_2':
        return this.extractRichText(block.heading_2?.rich_text || []);
      case 'heading_3':
        return this.extractRichText(block.heading_3?.rich_text || []);
      case 'bulleted_list_item':
        return this.extractRichText(block.bulleted_list_item?.rich_text || []);
      case 'numbered_list_item':
        return this.extractRichText(block.numbered_list_item?.rich_text || []);
      case 'to_do':
        return this.extractRichText(block.to_do?.rich_text || []);
      case 'quote':
        return this.extractRichText(block.quote?.rich_text || []);
      case 'code':
        return this.extractRichText(block.code?.rich_text || []);
      case 'callout':
        return this.extractRichText(block.callout?.rich_text || []);
      default:
        return '';
    }
  }

  private extractRichText(richText: any[]): string {
    return richText.map(text => text.plain_text).join('');
  }

  private categorizeBlock(text: string): string {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('governance') || lowerText.includes('policy') || lowerText.includes('rule')) {
      return 'Governance';
    }
    if (lowerText.includes('execution') || lowerText.includes('implement') || lowerText.includes('process')) {
      return 'Execution';
    }
    if (lowerText.includes('memory') || lowerText.includes('data') || lowerText.includes('information')) {
      return 'Memory';
    }
    if (lowerText.includes('phase') || lowerText.includes('step') || lowerText.includes('workflow')) {
      return 'Workflow';
    }
    if (lowerText.includes('technical') || lowerText.includes('api') || lowerText.includes('system')) {
      return 'Technical';
    }
    
    return 'General';
  }

  private isReadyForRouting(text: string): boolean {
    // Check if the block is complete and self-contained
    const hasEnoughContent = text.length > 50;
    const isNotJustHeader = !text.match(/^[A-Z\s]{1,50}$/);
    const isNotFragment = !text.endsWith('...');
    
    return hasEnoughContent && isNotJustHeader && isNotFragment;
  }

  private generateBlockTitle(text: string): string {
    // Create a descriptive short title from the first sentence or key concepts
    const firstSentence = text.split('.')[0];
    if (firstSentence.length <= 60) {
      return firstSentence;
    }
    
    // Extract key words and create a title
    const words = firstSentence.split(' ').slice(0, 8);
    return words.join(' ') + (words.length < firstSentence.split(' ').length ? '...' : '');
  }

  async processFirst10Blocks(): Promise<AtomicMemoryBlock[]> {
    try {
      const textBlocks = await this.extractPageContent();
      
      if (textBlocks.length === 0) {
        throw new Error('No content blocks found in the Notion page');
      }

      console.log(`📊 Processing first 10 blocks out of ${textBlocks.length} total blocks`);

      const atomicBlocks: AtomicMemoryBlock[] = [];
      const blocksToProcess = Math.min(10, textBlocks.length);

      for (let i = 0; i < blocksToProcess; i++) {
        const text = textBlocks[i];
        
        // Skip empty or very short blocks
        if (text.length < 20) {
          console.log(`⏭️  Skipping block ${i + 1}: Too short (${text.length} chars)`);
          continue;
        }

        const block: AtomicMemoryBlock = {
          BlockTitle: this.generateBlockTitle(text),
          RawText: text,
          BlockID: `$wt_unsorted_block_${atomicBlocks.length + 1}_parse_1`,
          BlockNumber: atomicBlocks.length + 1,
          ParsePass: 1,
          SourceDoc: 'WT-Unsorted-Content-26JUL1847',
          BlockCategory: this.categorizeBlock(text),
          ReadyForRouting: this.isReadyForRouting(text)
        };

        atomicBlocks.push(block);
        
        console.log(`✅ Block ${block.BlockNumber}: "${block.BlockTitle}" (${block.BlockCategory})`);
        
        // Stop once we have 10 atomic blocks
        if (atomicBlocks.length >= 10) {
          break;
        }
      }

      return atomicBlocks;
    } catch (error) {
      console.error('❌ Error processing blocks:', error);
      throw error;
    }
  }

  displayResults(blocks: AtomicMemoryBlock[]): void {
    console.log('\n' + '='.repeat(80));
    console.log('📋 ATOMIC MEMORY EXTRACTION RESULTS - PHASE 1.2A');
    console.log('='.repeat(80));
    
    blocks.forEach((block, index) => {
      console.log(`\n📦 BLOCK ${block.BlockNumber}:`);
      console.log(`   Title: ${block.BlockTitle}`);
      console.log(`   ID: ${block.BlockID}`);
      console.log(`   Category: ${block.BlockCategory}`);
      console.log(`   Ready for Routing: ${block.ReadyForRouting ? '✅' : '⏳'}`);
      console.log(`   Text Preview: ${block.RawText.substring(0, 100)}${block.RawText.length > 100 ? '...' : ''}`);
      console.log('   ' + '-'.repeat(70));
    });

    console.log(`\n📊 SUMMARY:`);
    console.log(`   - Total blocks extracted: ${blocks.length}`);
    console.log(`   - Ready for routing: ${blocks.filter(b => b.ReadyForRouting).length}`);
    console.log(`   - Categories found: ${Array.from(new Set(blocks.map(b => b.BlockCategory))).join(', ')}`);
    console.log(`   - Latest block parsed: ${blocks[blocks.length - 1]?.BlockID || 'None'}`);
  }

  generateUpdateInstructions(blocks: AtomicMemoryBlock[]): void {
    console.log('\n' + '='.repeat(80));
    console.log('📝 UNSORTED CONTENT REGISTER UPDATE INSTRUCTIONS');
    console.log('='.repeat(80));
    
    console.log('\nUpdate the following fields in the Unsorted Content Register:');
    console.log(`✏️  ParseStatus: "Partial"`);
    console.log(`✏️  LatestBlockParsed: "${blocks[blocks.length - 1]?.BlockID || 'None'}"`);
    console.log(`✏️  EstimatedBlocks: "50+" (estimation based on initial scan)`);
    console.log(`✏️  LastParsed: "${new Date().toISOString().split('T')[0]}"`);
    
    console.log('\n📋 Next Steps:');
    console.log('1. Review the extracted blocks above');
    console.log('2. Confirm categorization is appropriate');
    console.log('3. Proceed to routing phase for ready blocks');
    console.log('4. Continue extraction for remaining blocks if approved');
  }
}

async function main() {
  console.log('🚀 Starting Phase 1.2A - Atomic Memory Extraction Loop');
  console.log('🎯 Target: First 10 content blocks from WT-Unsorted-Content-26JUL1847');
  
  const extractor = new AtomicMemoryExtractor();
  
  try {
    const atomicBlocks = await extractor.processFirst10Blocks();
    
    extractor.displayResults(atomicBlocks);
    extractor.generateUpdateInstructions(atomicBlocks);
    
    console.log('\n🎉 Phase 1.2A completed successfully!');
    console.log('⏸️  Pausing for review before proceeding to routing phase...');
    
  } catch (error) {
    console.error('💥 Phase 1.2A failed:', error);
    process.exit(1);
  }
}

// Execute if this is the main module
main();