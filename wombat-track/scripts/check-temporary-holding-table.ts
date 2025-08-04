#!/usr/bin/env npx tsx

/**
 * Check Temporary Holding Table Status and Populate Missing Entries
 * 
 * This script checks the current status of the Temporary Holding Table database
 * and populates it with the 10 parsed blocks from Atomic Content Parse v1.2
 */

import { createNotionClient } from '../src/utils/notionClient.js';
import dotenv from 'dotenv';

dotenv.config();

// Load database IDs from environment
const TEMPORARY_HOLDING_TABLE_ID = process.env.NOTION_TEMPORARY_HOLDING_TABLE_ID || '23de1901-e36e-81e2-bff2-ca4451f734ec';
const UNSORTED_CONTENT_REGISTER_ID = process.env.NOTION_UNSORTED_CONTENT_REGISTER_ID || '23de1901-e36e-8149-89d3-caaa4902ecd2';

interface TemporaryHoldingEntry {
  BlockTitle: string;
  RawText: string;
  BlockID: string;
  BlockNumber: number;
  ParsePass: number;
  SourceDoc: string;
  BlockCategory: string;
  ReadyForRouting: boolean;
}

// Parsed blocks data based on classification results from the CSV and atomic content parse
const PARSED_BLOCKS_DATA: TemporaryHoldingEntry[] = [
  {
    BlockTitle: "Claude-Gizmo SDLC Clarification",
    RawText: "Formalises role split and GitHub PR process between Claude and Gizmo components. Establishes governance protocols for development lifecycle controls and PR review procedures.",
    BlockID: "$wt_unsorted_block_1_parse_1",
    BlockNumber: 1,
    ParsePass: 1,
    SourceDoc: "WT-Unsorted-Content-26JUL1847",
    BlockCategory: "GovernanceLog",
    ReadyForRouting: true
  },
  {
    BlockTitle: "WT-5.6 Live Dispatch Payload",
    RawText: "Project execution entry for WT-5.6 DriveMemory live dispatch payload implementation. Feature completed and should be marked historical with complete status tag.",
    BlockID: "$wt_unsorted_block_2_parse_1",
    BlockNumber: 2,
    ParsePass: 1,
    SourceDoc: "WT-Unsorted-Content-26JUL1847",
    BlockCategory: "PhaseStep",
    ReadyForRouting: true
  },
  {
    BlockTitle: "WT-5.4 Console Integration",
    RawText: "Project execution documentation for WT-5.4 GizmoConsole integration component. Phase step marked as complete and ready for historical archival.",
    BlockID: "$wt_unsorted_block_3_parse_1",
    BlockNumber: 3,
    ParsePass: 1,
    SourceDoc: "WT-Unsorted-Content-26JUL1847",
    BlockCategory: "PhaseStep",
    ReadyForRouting: true
  },
  {
    BlockTitle: "WT-5.5 GovernanceLog Hook",
    RawText: "Dual-purpose entry covering governance decision patterns and execution documentation for WT-5.5 AI logging hooks. Requires routing to both Governance Memory and PhaseStep databases.",
    BlockID: "$wt_unsorted_block_4_parse_1",
    BlockNumber: 4,
    ParsePass: 1,
    SourceDoc: "WT-Unsorted-Content-26JUL1847",
    BlockCategory: "GovernanceLog",
    ReadyForRouting: true
  },
  {
    BlockTitle: "WT SDLC Protocol (Markdown)",
    RawText: "High-confidence reusable system documentation describing WT Software Development Lifecycle protocols. Core governance documentation for ongoing process standardization.",
    BlockID: "$wt_unsorted_block_5_parse_1",
    BlockNumber: 5,
    ParsePass: 1,
    SourceDoc: "WT-Unsorted-Content-26JUL1847",
    BlockCategory: "GovernanceLog",
    ReadyForRouting: true
  },
  {
    BlockTitle: "WT Docs Module Feature List",
    RawText: "Strategic planning documentation for WT Docs Module features. Contains feature roadmap and execution planning details not yet implemented in project tracker.",
    BlockID: "$wt_unsorted_block_6_parse_1",
    BlockNumber: 6,
    ParsePass: 1,
    SourceDoc: "WT-Unsorted-Content-26JUL1847",
    BlockCategory: "WT Docs Artefact",
    ReadyForRouting: true
  },
  {
    BlockTitle: "Claude Thread Reflections",
    RawText: "Communication and backlog documentation containing incomplete Claude logic patterns requiring triage. Covers Claude-Gizmo interaction protocols and unresolved design decisions.",
    BlockID: "$wt_unsorted_block_7_parse_1",
    BlockNumber: 7,
    ParsePass: 1,
    SourceDoc: "WT-Unsorted-Content-26JUL1847",
    BlockCategory: "WT Docs Artefact",
    ReadyForRouting: false
  },
  {
    BlockTitle: "MetaPlatform Vision",
    RawText: "Strategic AI philosophy and recursive design vision documentation. Long-term architectural guidance for RAG prompts and design context development.",
    BlockID: "$wt_unsorted_block_8_parse_1",
    BlockNumber: 8,
    ParsePass: 1,
    SourceDoc: "WT-Unsorted-Content-26JUL1847",
    BlockCategory: "GovernanceLog",
    ReadyForRouting: true
  },
  {
    BlockTitle: "Slash Command Design",
    RawText: "Governance and planning documentation for WT-5.7 slash command implementation. Contains design patterns and execution planning for unimplemented features.",
    BlockID: "$wt_unsorted_block_9_parse_1",
    BlockNumber: 9,
    ParsePass: 1,
    SourceDoc: "WT-Unsorted-Content-26JUL1847",
    BlockCategory: "GovernanceLog",
    ReadyForRouting: true
  },
  {
    BlockTitle: "RAG Dashboard Goals",
    RawText: "Strategic planning and UX design documentation for user-facing RAG dashboard features. Contains feature specifications and design system requirements.",
    BlockID: "$wt_unsorted_block_10_parse_1",
    BlockNumber: 10,
    ParsePass: 1,
    SourceDoc: "WT-Unsorted-Content-26JUL1847",
    BlockCategory: "WT Docs Artefact",
    ReadyForRouting: true
  }
];

class TemporaryHoldingTableManager {
  private notionClient: any;

  constructor() {
    this.notionClient = createNotionClient(process.env.NOTION_TOKEN);
  }

  async checkCurrentEntries(): Promise<any[]> {
    try {
      console.log('🔍 Checking current entries in Temporary Holding Table...');
      
      const response = await this.notionClient.client.databases.query({
        database_id: TEMPORARY_HOLDING_TABLE_ID,
        page_size: 100
      });

      console.log(`📊 Found ${response.results.length} existing entries in Temporary Holding Table`);
      
      return response.results;
    } catch (error) {
      console.error('❌ Error checking Temporary Holding Table:', error);
      throw error;
    }
  }

  async findSourceDocId(): Promise<string | null> {
    try {
      console.log('🔍 Finding WT-Unsorted-Content-26JUL1847 in Unsorted Content Register...');
      
      const response = await this.notionClient.client.databases.query({
        database_id: UNSORTED_CONTENT_REGISTER_ID,
        filter: {
          property: 'Title',
          title: {
            contains: 'WT-Unsorted-Content-26JUL1847'
          }
        }
      });

      if (response.results.length > 0) {
        const sourceDocId = response.results[0].id;
        console.log(`✅ Found source document ID: ${sourceDocId}`);
        return sourceDocId;
      } else {
        console.log('⚠️  Source document not found in Unsorted Content Register');
        return null;
      }
    } catch (error) {
      console.error('❌ Error finding source document:', error);
      throw error;
    }
  }

  async createEntry(entry: TemporaryHoldingEntry, sourceDocId: string): Promise<string> {
    try {
      const properties: any = {
        'BlockTitle': {
          title: [
            {
              text: {
                content: entry.BlockTitle
              }
            }
          ]
        },
        'RawText': {
          rich_text: [
            {
              text: {
                content: entry.RawText
              }
            }
          ]
        },
        'BlockID': {
          rich_text: [
            {
              text: {
                content: entry.BlockID
              }
            }
          ]
        },
        'ParsePass': {
          number: entry.ParsePass
        },
        'BlockNumber': {
          number: entry.BlockNumber
        },
        'BlockCategory': {
          select: {
            name: entry.BlockCategory
          }
        },
        'ReadyForRouting': {
          checkbox: entry.ReadyForRouting
        }
      };

      // Add SourceDoc relation if sourceDocId is available
      if (sourceDocId) {
        properties['SourceDoc'] = {
          relation: [
            {
              id: sourceDocId
            }
          ]
        };
      }

      const response = await this.notionClient.client.pages.create({
        parent: {
          database_id: TEMPORARY_HOLDING_TABLE_ID
        },
        properties: properties
      });

      console.log(`✅ Created entry: ${entry.BlockTitle} (${entry.BlockID})`);
      return response.id;
    } catch (error) {
      console.error(`❌ Error creating entry ${entry.BlockID}:`, error);
      throw error;
    }
  }

  async populateMissingEntries(): Promise<void> {
    try {
      console.log('\n🚀 Starting population of Temporary Holding Table...');
      
      // Get current entries
      const existingEntries = await this.checkCurrentEntries();
      
      // Extract existing block IDs
      const existingBlockIds = new Set(
        existingEntries.map(entry => {
          const blockIdProperty = entry.properties?.BlockID?.rich_text?.[0]?.text?.content;
          return blockIdProperty;
        }).filter(Boolean)
      );

      console.log(`📋 Existing block IDs: ${Array.from(existingBlockIds).join(', ') || 'None'}`);

      // Find source document ID
      const sourceDocId = await this.findSourceDocId();

      // Create missing entries
      let createdCount = 0;
      let skippedCount = 0;

      for (const entry of PARSED_BLOCKS_DATA) {
        if (existingBlockIds.has(entry.BlockID)) {
          console.log(`⏭️  Skipping ${entry.BlockID}: Already exists`);
          skippedCount++;
          continue;
        }

        await this.createEntry(entry, sourceDocId || '');
        createdCount++;
      }

      console.log(`\n📊 Population Summary:`);
      console.log(`   ✅ Created: ${createdCount} entries`);
      console.log(`   ⏭️  Skipped: ${skippedCount} entries (already existed)`);
      console.log(`   📦 Total target entries: ${PARSED_BLOCKS_DATA.length}`);

    } catch (error) {
      console.error('❌ Error populating Temporary Holding Table:', error);
      throw error;
    }
  }

  async updateUnsortedContentRegister(): Promise<void> {
    try {
      console.log('\n📝 Updating Unsorted Content Register...');
      
      // Find the source document
      const response = await this.notionClient.client.databases.query({
        database_id: UNSORTED_CONTENT_REGISTER_ID,
        filter: {
          property: 'Title',
          title: {
            contains: 'WT-Unsorted-Content-26JUL1847'
          }
        }
      });

      if (response.results.length === 0) {
        console.log('⚠️  Source document not found for update');
        return;
      }

      const sourceDocPageId = response.results[0].id;

      // Update the source document with parse status
      await this.notionClient.client.pages.update({
        page_id: sourceDocPageId,
        properties: {
          'ParseStatus': {
            select: {
              name: 'Partial'
            }
          },
          'LatestBlockParsed': {
            rich_text: [
              {
                text: {
                  content: '$wt_unsorted_block_10_parse_1'
                }
              }
            ]
          },
          'LastParsed': {
            date: {
              start: new Date().toISOString().split('T')[0]
            }
          },
          'EstimatedBlocks': {
            number: 50
          }
        }
      });

      console.log('✅ Updated Unsorted Content Register with parse status');

    } catch (error) {
      console.error('❌ Error updating Unsorted Content Register:', error);
      throw error;
    }
  }

  displayStorageStatus(existingEntries: any[]): void {
    console.log('\n' + '='.repeat(80));
    console.log('📊 TEMPORARY HOLDING TABLE STORAGE STATUS REPORT');
    console.log('='.repeat(80));
    
    console.log(`\n📦 Database Information:`);
    console.log(`   Database ID: ${TEMPORARY_HOLDING_TABLE_ID}`);
    console.log(`   Database URL: https://www.notion.so/roammigrationlaw/${TEMPORARY_HOLDING_TABLE_ID}`);
    console.log(`   Total Entries Found: ${existingEntries.length}`);

    if (existingEntries.length > 0) {
      console.log(`\n📋 Existing Entries:`);
      existingEntries.forEach((entry, index) => {
        const title = entry.properties?.BlockTitle?.title?.[0]?.text?.content || 'Untitled';
        const blockId = entry.properties?.BlockID?.rich_text?.[0]?.text?.content || 'No ID';
        const category = entry.properties?.BlockCategory?.select?.name || 'No Category';
        const readyForRouting = entry.properties?.ReadyForRouting?.checkbox || false;
        
        console.log(`   ${index + 1}. ${title}`);
        console.log(`      Block ID: ${blockId}`);
        console.log(`      Category: ${category}`);
        console.log(`      Ready for Routing: ${readyForRouting ? '✅' : '❌'}`);
        console.log('      ' + '-'.repeat(50));
      });
    } else {
      console.log('\n📝 No entries found in Temporary Holding Table');
    }

    console.log(`\n🎯 Expected Entries (from Atomic Content Parse v1.2):`);
    PARSED_BLOCKS_DATA.forEach((entry, index) => {
      console.log(`   ${index + 1}. ${entry.BlockTitle}`);
      console.log(`      Block ID: ${entry.BlockID}`);
      console.log(`      Category: ${entry.BlockCategory}`);
      console.log(`      Ready for Routing: ${entry.ReadyForRouting ? '✅' : '❌'}`);
      console.log('      ' + '-'.repeat(50));
    });
  }
}

async function main() {
  console.log('🔍 Checking Temporary Holding Table Database Status');
  console.log(`📍 Database: https://www.notion.so/roammigrationlaw/${TEMPORARY_HOLDING_TABLE_ID}`);
  console.log('🎯 Looking for 10 parsed blocks from Atomic Content Parse v1.2\n');
  
  const manager = new TemporaryHoldingTableManager();
  
  try {
    // Check current status
    const existingEntries = await manager.checkCurrentEntries();
    manager.displayStorageStatus(existingEntries);

    // Check if we need to populate
    const hasExpectedEntries = PARSED_BLOCKS_DATA.some(expectedEntry => 
      existingEntries.some(existing => 
        existing.properties?.BlockID?.rich_text?.[0]?.text?.content === expectedEntry.BlockID
      )
    );

    if (!hasExpectedEntries || existingEntries.length < 10) {
      console.log('\n🚨 Missing entries detected! Populating Temporary Holding Table...');
      await manager.populateMissingEntries();
      await manager.updateUnsortedContentRegister();
    } else {
      console.log('\n✅ All expected entries found in Temporary Holding Table');
    }
    
    console.log('\n🎉 Temporary Holding Table check completed!');
    
  } catch (error) {
    console.error('💥 Operation failed:', error);
    process.exit(1);
  }
}

// Execute if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { TemporaryHoldingTableManager, type TemporaryHoldingEntry };