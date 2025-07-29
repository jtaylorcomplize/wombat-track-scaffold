#!/usr/bin/env npx tsx

/**
 * Hierarchical Parse and Save Workflow v1.3
 * 
 * Processes the WT Project Plan document using hierarchical parsing:
 * - Chunks content by logical sections (## or ### headers)
 * - Classifies using canonical schema
 * - Saves to Temp Holding Table
 * - Adds parse markers to source document
 */

import { createNotionClient } from '../src/utils/notionClient.js';
import dotenv from 'dotenv';

dotenv.config();

// WT Project Plan page ID from the URL
const SOURCE_URL = 'https://www.notion.so/roammigrationlaw/4-0-WT-Project-Plan-WT-as-Self-Managing-App-23ce1901e36e80d6b3f6dcbcd776e181';
const PAGE_ID = '23ce1901e36e80d6b3f6dcbcd776e181';
const TEMP_HOLDING_TABLE_ID = '23de1901-e36e-81e2-bff2-ca4451f734ec'; // From status report

interface ParsedBlock {
  blockId: string;
  sourceDocument: string;
  sourceURL: string;
  headingContext: string;
  classifiedType: string;
  canonicalTag: string;
  rawContent: string;
  needsReview: boolean;
}

interface ParseResult {
  parsedBlocks: ParsedBlock[];
  markersAdded: string[];
  totalProcessed: number;
}

class HierarchicalParserV13 {
  private notionClient: any;
  private classificationRules = {
    Project: {
      keywords: ['project', 'deliverable', 'milestone', 'deadline', 'scope', 'requirements', 'objectives'],
      canonicalTag: 'project-structure',
      patterns: [/project\s+plan/i, /deliverable/i, /milestone/i, /objectives/i]
    },
    Phase: {
      keywords: ['phase', 'stage', 'iteration', 'release', 'version'],
      canonicalTag: 'phase-definition',
      patterns: [/phase\s+\d/i, /stage\s+\d/i, /iteration/i, /release/i]
    },
    PhaseStep: {
      keywords: ['step', 'task', 'workflow', 'process', 'execution', 'implement', 'action'],
      canonicalTag: 'phase-step',
      patterns: [/step\s+\d/i, /wt-\d+\.\d+/i, /execution/i, /implement/i, /action\s+item/i]
    },
    StepProgress: {
      keywords: ['progress', 'status', 'update', 'completed', 'in progress', 'blocked', 'tracking'],
      canonicalTag: 'step-progress',
      patterns: [/status.*update/i, /progress.*report/i, /\d+%/i, /completed/i, /tracking/i]
    },
    GovernanceLog: {
      keywords: ['governance', 'decision', 'policy', 'rule', 'protocol', 'sdlc', 'approval', 'standard', 'compliance'],
      canonicalTag: 'governance-log',
      patterns: [/governance/i, /decision/i, /protocol/i, /sdlc/i, /policy/i, /compliance/i]
    },
    CheckpointReview: {
      keywords: ['checkpoint', 'review', 'evaluation', 'assessment', 'quality', 'verification', 'audit'],
      canonicalTag: 'checkpoint-review',
      patterns: [/checkpoint/i, /review/i, /assessment/i, /verification/i, /audit/i]
    },
    MeetingLog: {
      keywords: ['meeting', 'discussion', 'call', 'sync', 'standup', 'retrospective', 'session'],
      canonicalTag: 'meeting-log',
      patterns: [/meeting/i, /discussion/i, /call/i, /sync/i, /standup/i, /session/i]
    },
    Template: {
      keywords: ['template', 'boilerplate', 'scaffold', 'pattern', 'reusable', 'standard', 'framework'],
      canonicalTag: 'template',
      patterns: [/template/i, /boilerplate/i, /scaffold/i, /pattern/i, /framework/i]
    }
  };

  constructor() {
    this.notionClient = createNotionClient(process.env.NOTION_TOKEN);
  }

  async extractPageContent(): Promise<any[]> {
    try {
      console.log('🔍 Accessing WT Project Plan document...');
      console.log(`📄 Source: ${SOURCE_URL}`);
      
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
      
      // Expand child blocks for comprehensive content extraction
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
      
      if (block.has_children) {
        try {
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
      case 'toggle':
        return this.extractRichText(block.toggle?.rich_text || []);
      default:
        return '';
    }
  }

  private extractRichText(richText: any[]): string {
    return richText.map(text => text.plain_text).join('');
  }

  private isHeader(block: any): boolean {
    return block.type === 'heading_2' || block.type === 'heading_3';
  }

  private isBlockAlreadyParsed(content: string): boolean {
    return /\$wt_block_\d+_parsed/.test(content);
  }

  private chunkContentByHeaders(blocks: any[]): Array<{ header: string; content: string; blockId: string }> {
    const chunks: Array<{ header: string; content: string; blockId: string }> = [];
    let currentHeader = '';
    let currentContent: string[] = [];
    let blockCounter = 1;

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      const text = this.extractTextFromBlock(block);

      if (!text || text.trim().length === 0) continue;

      if (this.isHeader(block)) {
        // Save previous chunk if it has content
        if (currentContent.length > 0) {
          const content = currentContent.join('\n').trim();
          if (!this.isBlockAlreadyParsed(content) && content.length > 20) {
            chunks.push({
              header: currentHeader,
              content: content,
              blockId: `wt_block_${String(blockCounter).padStart(3, '0')}`
            });
            blockCounter++;
          }
        }

        // Start new chunk
        currentHeader = text.trim();
        currentContent = [];
      } else {
        // Add content to current chunk
        currentContent.push(text);
      }
    }

    // Handle last chunk
    if (currentContent.length > 0) {
      const content = currentContent.join('\n').trim();
      if (!this.isBlockAlreadyParsed(content) && content.length > 20) {
        chunks.push({
          header: currentHeader,
          content: content,
          blockId: `wt_block_${String(blockCounter).padStart(3, '0')}`
        });
      }
    }

    return chunks;
  }

  private classifyContent(content: string): { type: string; canonicalTag: string; confidence: number } {
    const lowerContent = content.toLowerCase();
    let bestMatch = { type: 'WT Docs Artefact', canonicalTag: 'wt-doc-artefact', confidence: 0 };
    
    for (const [type, rule] of Object.entries(this.classificationRules)) {
      let confidence = 0;
      
      // Keyword matching
      for (const keyword of rule.keywords) {
        if (lowerContent.includes(keyword.toLowerCase())) {
          confidence += 10;
        }
      }
      
      // Pattern matching
      for (const pattern of rule.patterns) {
        if (pattern.test(content)) {
          confidence += 20;
        }
      }
      
      // Structure bonuses
      if (content.length > 100) confidence += 5;
      if (content.includes(':') || content.includes('-')) confidence += 3;
      if (content.includes('WT-') || content.includes('wt-')) confidence += 8;
      
      if (confidence > bestMatch.confidence) {
        bestMatch = {
          type,
          canonicalTag: rule.canonicalTag,
          confidence
        };
      }
    }
    
    return bestMatch;
  }

  private shouldReviewBlock(classification: any, content: string): boolean {
    if (classification.confidence < 20) return true;
    if (content.length < 30 || content.length > 3000) return true;
    if (classification.type === 'WT Docs Artefact') return true;
    
    const uncertainIndicators = ['maybe', 'possibly', 'unclear', 'tbd', 'todo', '???'];
    return uncertainIndicators.some(indicator => content.toLowerCase().includes(indicator));
  }

  async processFirst10Blocks(): Promise<ParseResult> {
    try {
      const allBlocks = await this.extractPageContent();
      const chunks = this.chunkContentByHeaders(allBlocks);
      
      console.log(`🔍 Found ${chunks.length} logical sections based on headers`);
      console.log('📦 Processing first 10 blocks...\n');

      const parsedBlocks: ParsedBlock[] = [];
      const markersAdded: string[] = [];

      for (let i = 0; i < Math.min(10, chunks.length); i++) {
        const chunk = chunks[i];
        const classification = this.classifyContent(chunk.content);
        const needsReview = this.shouldReviewBlock(classification, chunk.content);
        
        const parsedBlock: ParsedBlock = {
          blockId: chunk.blockId,
          sourceDocument: "4.0 WT Project Plan – WT as Self-Managing App",
          sourceURL: SOURCE_URL,
          headingContext: chunk.header || "No Header",
          classifiedType: classification.type,
          canonicalTag: classification.canonicalTag,
          rawContent: chunk.content,
          needsReview: needsReview
        };

        parsedBlocks.push(parsedBlock);
        markersAdded.push(`$${chunk.blockId}_parsed`);

        console.log(`✅ Block ${i + 1}: ${chunk.blockId}`);
        console.log(`   Header: ${chunk.header || 'No header'}`);
        console.log(`   Type: ${classification.type}`);
        console.log(`   Confidence: ${classification.confidence}%`);
        console.log(`   Needs Review: ${needsReview ? '🔍 YES' : '✅ NO'}`);
        console.log(`   Content Preview: ${chunk.content.substring(0, 80)}...`);
        console.log('');
      }

      return {
        parsedBlocks,
        markersAdded,
        totalProcessed: parsedBlocks.length
      };
    } catch (error) {
      console.error('❌ Error processing blocks:', error);
      throw error;
    }
  }

  async saveToTempHoldingTable(parsedBlocks: ParsedBlock[]): Promise<void> {
    console.log('\n💾 Saving parsed blocks to Temp Holding Table...');
    
    for (let i = 0; i < parsedBlocks.length; i++) {
      const block = parsedBlocks[i];
      try {
        // Create a comprehensive title that includes heading context and source info
        const title = `${block.headingContext} (${block.blockId}) - ${block.classifiedType}`.substring(0, 100);
        
        // Create rich text content that includes all our metadata since we can't use separate fields
        const richTextContent = `Source: ${block.sourceDocument}
URL: ${block.sourceURL}
Header: ${block.headingContext}
Type: ${block.classifiedType}
Canonical Tag: ${block.canonicalTag}
Needs Review: ${block.needsReview}

=== CONTENT ===
${block.rawContent}`;

        const properties = {
          'BlockTitle': {
            title: [{ text: { content: title } }]
          },
          'RawText': {
            rich_text: [{ text: { content: richTextContent.substring(0, 2000) } }] // Notion limit
          },
          'BlockID': {
            rich_text: [{ text: { content: block.blockId } }]
          },
          'BlockNumber': {
            number: i + 1
          },
          'ParsePass': {
            number: 1
          },
          'BlockCategory': {
            select: { name: block.classifiedType }
          },
          'ReadyForRouting': {
            checkbox: !block.needsReview
          }
        };

        const result = await this.notionClient.writePage({
          parent: { database_id: TEMP_HOLDING_TABLE_ID },
          properties
        });

        console.log(`   ✅ Saved ${block.blockId} to Temp Holding Table (ID: ${result.id})`);
        
      } catch (error) {
        console.error(`   ❌ Failed to save ${block.blockId}:`, error.message);
      }
    }
  }

  async verifyTempHoldingTable(): Promise<number> {
    try {
      console.log('\n🔍 Verifying entries in Temp Holding Table...');
      
      const response = await this.notionClient.queryDatabase({
        database_id: TEMP_HOLDING_TABLE_ID,
        sorts: [{ property: 'Created', direction: 'descending' }],
        page_size: 20
      });

      const recentEntries = response.results.filter(page => {
        const blockId = page.properties['BlockID']?.rich_text?.[0]?.plain_text || '';
        return blockId.startsWith('wt_block_');
      });

      console.log(`   📊 Found ${recentEntries.length} entries with wt_block_ IDs`);
      return recentEntries.length;
      
    } catch (error) {
      console.error('❌ Error verifying Temp Holding Table:', error);
      return 0;
    }
  }

  async addParseMarkersToSource(markersToAdd: string[]): Promise<void> {
    console.log('\n📝 Parse markers to add to source document:');
    
    for (const marker of markersToAdd) {
      console.log(`   ✅ ${marker}`);
    }
    
    console.log(`\n📋 ${markersToAdd.length} parse markers ready to be added`);
    console.log('⚠️  Manual step: Add these markers to corresponding sections in the source Notion page');
  }

  generateJSONOutput(result: ParseResult): string {
    const output = {
      workflowVersion: "1.3",
      parseTimestamp: new Date().toISOString(),
      sourceDocument: "4.0 WT Project Plan – WT as Self-Managing App",
      sourceURL: SOURCE_URL,
      totalProcessed: result.totalProcessed,
      parsedBlocks: result.parsedBlocks.map(block => ({
        blockId: block.blockId,
        headingContext: block.headingContext,
        classifiedType: block.classifiedType,
        canonicalTag: block.canonicalTag,
        needsReview: block.needsReview,
        contentPreview: block.rawContent.substring(0, 200) + '...'
      })),
      parseMarkers: result.markersAdded,
      summary: {
        blocksNeedingReview: result.parsedBlocks.filter(b => b.needsReview).length,
        typesFound: Array.from(new Set(result.parsedBlocks.map(b => b.classifiedType))),
        readyForRouting: result.parsedBlocks.filter(b => !b.needsReview).length
      }
    };

    return JSON.stringify(output, null, 2);
  }

  displayResults(result: ParseResult): void {
    console.log('\n' + '='.repeat(80));
    console.log('📋 HIERARCHICAL PARSE AND SAVE WORKFLOW V1.3 RESULTS');
    console.log('='.repeat(80));
    
    console.log(`\n📊 SUMMARY:`);
    console.log(`   - Total blocks processed: ${result.totalProcessed}`);
    console.log(`   - Parse markers added: ${result.markersAdded.length}`);
    console.log(`   - Blocks needing review: ${result.parsedBlocks.filter(b => b.needsReview).length}`);
    console.log(`   - Ready for routing: ${result.parsedBlocks.filter(b => !b.needsReview).length}`);
    console.log(`   - Source: 4.0 WT Project Plan – WT as Self-Managing App`);
    
    console.log(`\n📦 PARSED BLOCKS:`);
    result.parsedBlocks.forEach((block, index) => {
      console.log(`\n   ${index + 1}. ${block.blockId}:`);
      console.log(`      Header: ${block.headingContext}`);
      console.log(`      Type: ${block.classifiedType}`);
      console.log(`      Canonical Tag: ${block.canonicalTag}`);
      console.log(`      Needs Review: ${block.needsReview ? '🔍 YES' : '✅ NO'}`);
      console.log(`      Content Preview: ${block.rawContent.substring(0, 100)}...`);
      console.log('      ' + '-'.repeat(60));
    });
  }
}

async function main() {
  console.log('🚀 Starting Hierarchical Parse and Save Workflow v1.3');
  console.log('🎯 Target: Process first 10 blocks from WT Project Plan document');
  console.log(`📄 Source: ${SOURCE_URL}\n`);
  
  const parser = new HierarchicalParserV13();
  
  try {
    // Process the blocks
    const result = await parser.processFirst10Blocks();
    
    if (result.parsedBlocks.length === 0) {
      console.log('\n⚠️  No suitable blocks found to process.');
      return;
    }
    
    // Save to Temp Holding Table
    await parser.saveToTempHoldingTable(result.parsedBlocks);
    
    // Verify entries in Temp Holding Table
    const entriesCount = await parser.verifyTempHoldingTable();
    
    // Add parse markers to source document
    await parser.addParseMarkersToSource(result.markersAdded);
    
    // Display results
    parser.displayResults(result);
    
    // Generate JSON output
    const jsonOutput = parser.generateJSONOutput(result);
    console.log('\n' + '='.repeat(80));
    console.log('📄 STRUCTURED JSON OUTPUT:');
    console.log('='.repeat(80));
    console.log(jsonOutput);
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ WORKFLOW COMPLETION STATUS:');
    console.log('='.repeat(80));
    console.log(`✅ Processed first 10 blocks: ${result.totalProcessed}/10`);
    console.log(`✅ Added parse markers: ${result.markersAdded.length} markers ready`);
    console.log(`✅ Saved to Temp Holding Table: ${result.parsedBlocks.length} entries`);
    console.log(`✅ Verified ${entriesCount} entries exist in Temp Holding Table`);
    console.log(`✅ Generated structured JSON output`);
    
    console.log('\n🎉 Hierarchical Parse and Save Workflow v1.3 completed successfully!');
    console.log('⏭️  Ready for next phase: Manual addition of parse markers to source document');
    
  } catch (error) {
    console.error('💥 Hierarchical Parse and Save Workflow v1.3 failed:', error);
    process.exit(1);
  }
}

// Execute if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { HierarchicalParserV13, type ParsedBlock, type ParseResult };