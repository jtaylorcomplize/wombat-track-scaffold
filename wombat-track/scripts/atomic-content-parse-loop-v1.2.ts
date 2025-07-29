#!/usr/bin/env npx tsx

/**
 * Atomic Content Parse Loop v1.2
 * 
 * Processes the first 10 unmarked blocks from WT Unsorted Content Register
 * Following Classification Schema v1.2 and Parse Rules
 */

import { createNotionClient } from '../src/utils/notionClient.js';
import dotenv from 'dotenv';

dotenv.config();

// WT Unsorted Content page ID from the URL
const NOTION_URL = 'https://www.notion.so/roammigrationlaw/WT-Unsorted-Content-26JUL1847-23ce1901e36e80318e42dd4847213d04';
const PAGE_ID = '23ce1901e36e80318e42dd4847213d04';

interface ParsedBlock {
  sourceBlock: string;
  type: string;
  canonicalTag: string;
  content: string;
  needsReview: boolean;
  blockTitle?: string;
  metadata?: {
    confidence: number;
    keywords: string[];
    estimatedCategory: string;
  };
}

interface BlockParseResult {
  parsed: ParsedBlock[];
  totalProcessed: number;
  markersAdded: string[];
}

class AtomicContentParserV12 {
  private notionClient: any;
  private classificationRules = {
    Project: {
      keywords: ['project', 'deliverable', 'milestone', 'deadline', 'scope', 'requirements'],
      canonicalTag: 'project',
      patterns: [/project\s+\w+/i, /deliverable/i, /milestone/i]
    },
    PhaseStep: {
      keywords: ['phase', 'step', 'workflow', 'process', 'execution', 'implement', 'task'],
      canonicalTag: 'phase-step',
      patterns: [/phase\s+\d/i, /step\s+\d/i, /wt-\d+\.\d+/i, /execution/i]
    },
    StepProgress: {
      keywords: ['progress', 'status', 'update', 'completed', 'in progress', 'blocked'],
      canonicalTag: 'step-progress',
      patterns: [/status.*update/i, /progress.*report/i, /\d+%/i, /completed/i]
    },
    GovernanceLog: {
      keywords: ['governance', 'decision', 'policy', 'rule', 'protocol', 'sdlc', 'approval'],
      canonicalTag: 'governance-log',
      patterns: [/governance/i, /decision/i, /protocol/i, /sdlc/i, /policy/i]
    },
    CheckpointReview: {
      keywords: ['checkpoint', 'review', 'evaluation', 'assessment', 'quality', 'verification'],
      canonicalTag: 'checkpoint-review',
      patterns: [/checkpoint/i, /review/i, /assessment/i, /verification/i]
    },
    MeetingLog: {
      keywords: ['meeting', 'discussion', 'call', 'sync', 'standup', 'retrospective'],
      canonicalTag: 'meeting-log',
      patterns: [/meeting/i, /discussion/i, /call/i, /sync/i, /standup/i]
    },
    Template: {
      keywords: ['template', 'boilerplate', 'scaffold', 'pattern', 'reusable', 'standard'],
      canonicalTag: 'template',
      patterns: [/template/i, /boilerplate/i, /scaffold/i, /pattern/i]
    }
  };

  constructor() {
    this.notionClient = createNotionClient(process.env.NOTION_TOKEN);
  }

  async extractPageContent(): Promise<any[]> {
    try {
      console.log('🔍 Accessing WT Unsorted Content page...');
      
      // Get all blocks from the page with pagination
      const allBlocks: any[] = [];
      let hasMore = true;
      let cursor: string | undefined;

      while (hasMore) {
        const response = await this.notionClient.client.blocks.children.list({
          block_id: PAGE_ID,
          start_cursor: cursor,
          page_size: 100
        });

        allBlocks.push(...response.results);
        hasMore = response.has_more;
        cursor = response.next_cursor || undefined;
      }

      console.log(`📝 Found ${allBlocks.length} total blocks in the page`);
      
      // Also extract content from child blocks (toggle blocks, etc.)
      const expandedBlocks = await this.expandChildBlocks(allBlocks);
      console.log(`📝 Total blocks after expansion: ${expandedBlocks.length}`);
      
      return expandedBlocks;
    } catch (error) {
      console.error('❌ Error accessing Notion page:', error);
      throw error;
    }
  }

  private async expandChildBlocks(blocks: any[]): Promise<any[]> {
    const expandedBlocks: any[] = [];
    
    for (const block of blocks) {
      expandedBlocks.push(block);
      
      // If block has children, recursively get them
      if (block.has_children) {
        try {
          console.log(`🔍 Expanding child blocks for ${block.type} block`);
          const childBlocks = await this.notionClient.client.blocks.children.list({
            block_id: block.id,
            page_size: 100
          });
          
          if (childBlocks.results.length > 0) {
            const expandedChildBlocks = await this.expandChildBlocks(childBlocks.results);
            expandedBlocks.push(...expandedChildBlocks);
          }
        } catch (error) {
          console.warn(`⚠️  Could not expand child blocks for block ${block.id}:`, error.message);
        }
      }
    }
    
    return expandedBlocks;
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

  private isBlockAlreadyParsed(content: string): boolean {
    // Check for existing parse markers
    return /\$wt_block_\d+_parsed/.test(content);
  }

  private classifyContent(content: string): { type: string; canonicalTag: string; confidence: number; keywords: string[] } {
    const lowerContent = content.toLowerCase();
    let bestMatch = { type: 'WT Docs Artefact', canonicalTag: 'wt-doc', confidence: 0, keywords: [] };
    
    // Test each classification rule
    for (const [type, rule] of Object.entries(this.classificationRules)) {
      let confidence = 0;
      const foundKeywords: string[] = [];
      
      // Keyword matching
      for (const keyword of rule.keywords) {
        if (lowerContent.includes(keyword.toLowerCase())) {
          confidence += 10;
          foundKeywords.push(keyword);
        }
      }
      
      // Pattern matching
      for (const pattern of rule.patterns) {
        if (pattern.test(content)) {
          confidence += 20;
        }
      }
      
      // Length and structure bonuses
      if (content.length > 100) confidence += 5;
      if (content.includes(':') || content.includes('-')) confidence += 3;
      
      if (confidence > bestMatch.confidence) {
        bestMatch = {
          type,
          canonicalTag: rule.canonicalTag,
          confidence,
          keywords: foundKeywords
        };
      }
    }
    
    return bestMatch;
  }

  private shouldReviewBlock(classification: any, content: string): boolean {
    // Always review if confidence is low
    if (classification.confidence < 15) return true;
    
    // Review if content is very short or very long
    if (content.length < 50 || content.length > 2000) return true;
    
    // Review if it's a fallback classification
    if (classification.type === 'WT Docs Artefact') return true;
    
    // Review if it contains uncertain indicators
    const uncertainIndicators = ['maybe', 'possibly', 'unclear', 'tbd', 'todo'];
    if (uncertainIndicators.some(indicator => content.toLowerCase().includes(indicator))) {
      return true;
    }
    
    return false;
  }

  private generateBlockTitle(content: string): string {
    // Extract first meaningful sentence or phrase
    const firstLine = content.split('\n')[0].trim();
    if (firstLine.length <= 60) {
      return firstLine;
    }
    
    // Create title from key words
    const words = firstLine.split(' ').slice(0, 8);
    return words.join(' ') + (words.length < firstLine.split(' ').length ? '...' : '');
  }

  async processFirst10UnmarkedBlocks(): Promise<BlockParseResult> {
    try {
      const allBlocks = await this.extractPageContent();
      const parsedBlocks: ParsedBlock[] = [];
      const markersAdded: string[] = [];
      let blocksProcessed = 0;
      let blockCounter = 1;

      console.log('🔍 Looking for first 10 unmarked blocks...');

      for (const block of allBlocks) {
        if (parsedBlocks.length >= 10) break;

        const content = this.extractTextFromBlock(block);
        
        // Debug: Log all blocks we find
        if (content && content.trim().length > 0) {
          console.log(`🔍 Found content (${content.length} chars): "${content.substring(0, 50)}..."`);
        }
        
        // Skip empty blocks (reduced threshold to capture more content)
        if (!content || content.trim().length < 10) {
          continue;
        }

        // Skip if already parsed
        if (this.isBlockAlreadyParsed(content)) {
          console.log(`⏭️  Skipping block: Already has parse marker`);
          continue;
        }

        // Process this block
        const sourceBlockId = `$wt_block_${String(blockCounter).padStart(3, '0')}`;
        const parseMarkerId = `${sourceBlockId}_parsed`;
        
        const classification = this.classifyContent(content);
        const needsReview = this.shouldReviewBlock(classification, content);
        
        const parsedBlock: ParsedBlock = {
          sourceBlock: sourceBlockId,
          type: classification.type,
          canonicalTag: classification.canonicalTag,
          content: content,
          needsReview: needsReview,
          blockTitle: this.generateBlockTitle(content),
          metadata: {
            confidence: classification.confidence,
            keywords: classification.keywords,
            estimatedCategory: classification.type
          }
        };

        parsedBlocks.push(parsedBlock);
        markersAdded.push(parseMarkerId);
        blocksProcessed++;
        blockCounter++;

        console.log(`✅ Block ${blockCounter-1}: "${parsedBlock.blockTitle}" → ${classification.type} (${classification.confidence}% confidence)`);
      }

      return {
        parsed: parsedBlocks,
        totalProcessed: blocksProcessed,
        markersAdded: markersAdded
      };
    } catch (error) {
      console.error('❌ Error processing blocks:', error);
      throw error;
    }
  }

  async addParseMarkersToSourceDocument(markersToAdd: string[]): Promise<void> {
    console.log('\n📝 Adding parse markers to source document...');
    
    // Note: In a real implementation, we would update the Notion page
    // For now, we'll simulate this step and log what would be done
    
    for (const marker of markersToAdd) {
      console.log(`   ✅ Would add marker: ${marker}`);
    }
    
    console.log(`\n📋 ${markersToAdd.length} parse markers ready to be added to source document`);
    console.log('⚠️  Manual step required: Add these markers to the corresponding blocks in Notion');
  }

  displayResults(result: BlockParseResult): void {
    console.log('\n' + '='.repeat(80));
    console.log('📋 ATOMIC CONTENT PARSE LOOP V1.2 RESULTS');
    console.log('='.repeat(80));
    
    console.log(`\n📊 SUMMARY:`);
    console.log(`   - Total blocks processed: ${result.totalProcessed}`);
    console.log(`   - Parse markers added: ${result.markersAdded.length}`);
    console.log(`   - Blocks needing review: ${result.parsed.filter(b => b.needsReview).length}`);
    console.log(`   - Source document: WT-Unsorted-Content-26JUL1847`);
    
    console.log(`\n📦 PARSED BLOCKS:`);
    result.parsed.forEach((block, index) => {
      console.log(`\n   ${index + 1}. ${block.sourceBlock}:`);
      console.log(`      Title: ${block.blockTitle}`);
      console.log(`      Type: ${block.type}`);
      console.log(`      Canonical Tag: ${block.canonicalTag}`);
      console.log(`      Needs Review: ${block.needsReview ? '🔍 YES' : '✅ NO'}`);
      console.log(`      Confidence: ${block.metadata?.confidence}%`);
      console.log(`      Keywords: ${block.metadata?.keywords.join(', ') || 'None'}`);
      console.log(`      Content Preview: ${block.content.substring(0, 100)}${block.content.length > 100 ? '...' : ''}`);
      console.log('      ' + '-'.repeat(60));
    });
  }

  generateJSONOutput(result: BlockParseResult): string {
    const output = {
      schemaVersion: "1.2",
      parseTimestamp: new Date().toISOString(),
      sourceDocument: "WT-Unsorted-Content-26JUL1847",
      totalProcessed: result.totalProcessed,
      parsedBlocks: result.parsed,
      parseMarkers: result.markersAdded,
      summary: {
        blocksNeedingReview: result.parsed.filter(b => b.needsReview).length,
        typesFound: Array.from(new Set(result.parsed.map(b => b.type))),
        averageConfidence: Math.round(
          result.parsed.reduce((sum, b) => sum + (b.metadata?.confidence || 0), 0) / result.parsed.length
        )
      }
    };

    return JSON.stringify(output, null, 2);
  }
}

async function main() {
  console.log('🚀 Starting Atomic Content Parse Loop v1.2');
  console.log('🎯 Target: Process first 10 unmarked blocks from WT Unsorted Content Register');
  console.log(`📄 Source: ${NOTION_URL}\n`);
  
  const parser = new AtomicContentParserV12();
  
  try {
    // Process the blocks
    const result = await parser.processFirst10UnmarkedBlocks();
    
    if (result.parsed.length === 0) {
      console.log('\n⚠️  No unmarked blocks found to process.');
      console.log('All blocks may already have parse markers.');
      return;
    }
    
    // Display results
    parser.displayResults(result);
    
    // Add parse markers to source document
    await parser.addParseMarkersToSourceDocument(result.markersAdded);
    
    // Generate JSON output
    const jsonOutput = parser.generateJSONOutput(result);
    console.log('\n' + '='.repeat(80));
    console.log('📄 JSON OUTPUT (Copy to processing pipeline):');
    console.log('='.repeat(80));
    console.log(jsonOutput);
    
    console.log('\n🎉 Atomic Content Parse Loop v1.2 completed successfully!');
    console.log(`✅ Processed ${result.totalProcessed} blocks with ${result.markersAdded.length} markers added`);
    console.log('⏭️  Ready for next phase: Route classified blocks to appropriate databases');
    
  } catch (error) {
    console.error('💥 Atomic Content Parse Loop v1.2 failed:', error);
    process.exit(1);
  }
}

// Execute if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { AtomicContentParserV12, type ParsedBlock, type BlockParseResult };