#!/usr/bin/env npx tsx

/**
 * Check and Create Unsorted Content Databases
 * 
 * This script checks if the three linked Notion databases exist under the WT-Unsorted-Content page:
 * 1. Unsorted Content Register
 * 2. Temporary Holding Table
 * 3. Routing Table
 * 
 * If they don't exist, it creates them with the specified schema.
 */

import dotenv from 'dotenv';
import { createNotionClient } from '../src/utils/notionClient.ts';
import { NotionDatabaseCreator } from '../src/utils/notionDatabaseCreator.ts';
import type { DatabaseSchema } from '../src/utils/notionDatabaseCreator.ts';

dotenv.config();

// Extract page ID from the Notion URL
const WT_UNSORTED_CONTENT_URL = 'https://www.notion.so/roammigrationlaw/WT-Unsorted-Content-26JUL1847-23ce1901e36e80318e42dd4847213d04';
const WT_UNSORTED_CONTENT_PAGE_ID = '23ce1901e36e80318e42dd4847213d04';

interface DatabaseCheckResult {
  exists: boolean;
  id?: string;
  url?: string;
  name: string;
}

class UnsortedContentDatabaseManager {
  private notionClient: any;
  private creator: NotionDatabaseCreator;

  constructor() {
    this.notionClient = createNotionClient();
    this.creator = new NotionDatabaseCreator(process.env.NOTION_TOKEN!, WT_UNSORTED_CONTENT_PAGE_ID);
  }

  /**
   * Get schema for Unsorted Content Register database
   */
  static getUnsortedContentRegisterSchema(): DatabaseSchema {
    return {
      name: 'Unsorted Content Register',
      description: 'Index all raw Notion pages/files intended for structured parsing',
      properties: {
        'Title': {
          title: {},
        },
        'SourceLink': {
          url: {},
        },
        'ParseStatus': {
          select: {
            options: [
              { name: 'Not Started', color: 'gray' },
              { name: 'In Progress', color: 'yellow' },
              { name: 'Partial', color: 'orange' },
              { name: 'Complete', color: 'green' },
            ],
          },
        },
        'LatestBlockParsed': {
          rich_text: {},
        },
        'EstimatedBlocks': {
          number: {},
        },
        'AssignedTo': {
          people: {},
        },
        'Created': {
          date: {},
        },
        'LastParsed': {
          date: {},
        },
      },
    };
  }

  /**
   * Get schema for Temporary Holding Table database
   */
  static getTemporaryHoldingTableSchema(unsortedContentRegisterId?: string): DatabaseSchema {
    const schema: DatabaseSchema = {
      name: 'Temporary Holding Table',
      description: 'Store parsed atomic memory blocks (pre-routing)',
      properties: {
        'BlockTitle': {
          title: {},
        },
        'RawText': {
          rich_text: {},
        },
        'BlockID': {
          rich_text: {},
        },
        'ParsePass': {
          number: {},
        },
        'BlockNumber': {
          number: {},
        },
        'BlockCategory': {
          select: {
            options: [
              { name: 'Governance', color: 'blue' },
              { name: 'Execution', color: 'green' },
              { name: 'AI Philosophy', color: 'purple' },
              { name: 'Project', color: 'orange' },
              { name: 'Backlog', color: 'pink' },
              { name: 'Meta', color: 'gray' },
              { name: 'Unknown', color: 'default' },
            ],
          },
        },
        'ReadyForRouting': {
          checkbox: {},
        },
        'Created': {
          date: {},
        },
      },
    };

    // Add relation to Unsorted Content Register if ID is provided
    if (unsortedContentRegisterId) {
      schema.properties['SourceDoc'] = {
        relation: {
          database_id: unsortedContentRegisterId,
          single_property: {},
        },
      };
    } else {
      schema.properties['SourceDoc'] = {
        rich_text: {},
      };
    }

    return schema;
  }

  /**
   * Get schema for Routing Table database
   */
  static getRoutingTableSchema(temporaryHoldingTableId?: string): DatabaseSchema {
    const schema: DatabaseSchema = {
      name: 'Routing Table',
      description: 'Classify atomic blocks to destination canonical tables in WT',
      properties: {
        'Title': {
          title: {},
        },
        'TargetDatabase': {
          select: {
            options: [
              { name: 'Phase', color: 'blue' },
              { name: 'PhaseStep', color: 'green' },
              { name: 'Governance Memory', color: 'purple' },
              { name: 'Claude-Gizmo Comms', color: 'orange' },
              { name: 'Project Tracker', color: 'pink' },
              { name: 'Design System', color: 'yellow' },
              { name: 'DriveMemory', color: 'red' },
              { name: 'MemoryPlugin', color: 'brown' },
              { name: 'Backlog', color: 'gray' },
              { name: 'Undecided', color: 'default' },
            ],
          },
        },
        'RoutingStatus': {
          select: {
            options: [
              { name: 'Pending', color: 'gray' },
              { name: 'Pushed', color: 'green' },
              { name: 'Error', color: 'red' },
              { name: 'Manual Review', color: 'yellow' },
            ],
          },
        },
        'Tags': {
          multi_select: {
            options: [
              { name: 'urgent', color: 'red' },
              { name: 'technical', color: 'purple' },
              { name: 'governance', color: 'blue' },
              { name: 'memory', color: 'green' },
              { name: 'integration', color: 'orange' },
            ],
          },
        },
        'DispatchedBy': {
          people: {},
        },
        'DispatchTimestamp': {
          date: {},
        },
        'Comments': {
          rich_text: {},
        },
      },
    };

    // Add relation to Temporary Holding Table if ID is provided
    if (temporaryHoldingTableId) {
      schema.properties['BlockRef'] = {
        relation: {
          database_id: temporaryHoldingTableId,
          single_property: {},
        },
      };
    } else {
      schema.properties['BlockRef'] = {
        rich_text: {},
      };
    }

    return schema;
  }

  /**
   * Check if databases exist by searching child blocks of the parent page
   */
  async checkExistingDatabases(): Promise<Map<string, DatabaseCheckResult>> {
    const results = new Map<string, DatabaseCheckResult>();
    const targetDatabases = [
      'Unsorted Content Register',
      'Temporary Holding Table',
      'Routing Table',
    ];

    try {
      console.log('🔍 Checking for existing databases under WT-Unsorted-Content page...');

      // Get all child blocks of the page
      const response = await this.notionClient.client.blocks.children.list({
        block_id: WT_UNSORTED_CONTENT_PAGE_ID,
        page_size: 100,
      });

      // Check each block for database references
      for (const block of response.results) {
        if (block.type === 'child_database') {
          const databaseId = block.id;
          
          // Get database details
          try {
            const database = await this.notionClient.client.databases.retrieve({
              database_id: databaseId,
            });

            const title = database.title?.[0]?.plain_text || '';
            
            if (targetDatabases.includes(title)) {
              results.set(title, {
                exists: true,
                id: database.id,
                url: database.url,
                name: title,
              });
              console.log(`✅ Found existing database: ${title}`);
            }
          } catch (error) {
            console.warn(`⚠️  Could not retrieve database details for ${databaseId}`);
          }
        }
      }

      // Mark missing databases
      for (const dbName of targetDatabases) {
        if (!results.has(dbName)) {
          results.set(dbName, {
            exists: false,
            name: dbName,
          });
          console.log(`❌ Database not found: ${dbName}`);
        }
      }

      return results;
    } catch (error) {
      console.error('Error checking databases:', error);
      throw error;
    }
  }

  /**
   * Create the three databases with proper relationships
   */
  async createDatabases(existingDatabases: Map<string, DatabaseCheckResult>) {
    const createdDatabases: Record<string, any> = {};

    try {
      // 1. Create Unsorted Content Register if it doesn't exist
      let unsortedContentRegisterId: string | undefined;
      const unsortedContentRegister = existingDatabases.get('Unsorted Content Register');
      
      if (!unsortedContentRegister?.exists) {
        console.log('\n📊 Creating Unsorted Content Register database...');
        const result = await this.creator.createDatabase(
          UnsortedContentDatabaseManager.getUnsortedContentRegisterSchema()
        );
        
        if (result.success) {
          unsortedContentRegisterId = result.databaseId;
          createdDatabases['Unsorted Content Register'] = result;
          console.log(`✅ Created: ${result.url}`);
        } else {
          throw new Error(`Failed to create Unsorted Content Register: ${result.error}`);
        }
      } else {
        unsortedContentRegisterId = unsortedContentRegister.id;
        console.log(`ℹ️  Using existing Unsorted Content Register: ${unsortedContentRegisterId}`);
      }

      // 2. Create Temporary Holding Table if it doesn't exist
      let temporaryHoldingTableId: string | undefined;
      const temporaryHoldingTable = existingDatabases.get('Temporary Holding Table');
      
      if (!temporaryHoldingTable?.exists) {
        console.log('\n📊 Creating Temporary Holding Table database...');
        const result = await this.creator.createDatabase(
          UnsortedContentDatabaseManager.getTemporaryHoldingTableSchema(unsortedContentRegisterId)
        );
        
        if (result.success) {
          temporaryHoldingTableId = result.databaseId;
          createdDatabases['Temporary Holding Table'] = result;
          console.log(`✅ Created: ${result.url}`);
        } else {
          throw new Error(`Failed to create Temporary Holding Table: ${result.error}`);
        }
      } else {
        temporaryHoldingTableId = temporaryHoldingTable.id;
        console.log(`ℹ️  Using existing Temporary Holding Table: ${temporaryHoldingTableId}`);
      }

      // 3. Create Routing Table if it doesn't exist
      const routingTable = existingDatabases.get('Routing Table');
      
      if (!routingTable?.exists) {
        console.log('\n📊 Creating Routing Table database...');
        const result = await this.creator.createDatabase(
          UnsortedContentDatabaseManager.getRoutingTableSchema(temporaryHoldingTableId)
        );
        
        if (result.success) {
          createdDatabases['Routing Table'] = result;
          console.log(`✅ Created: ${result.url}`);
        } else {
          throw new Error(`Failed to create Routing Table: ${result.error}`);
        }
      } else {
        console.log(`ℹ️  Using existing Routing Table: ${routingTable.id}`);
      }

      return createdDatabases;
    } catch (error) {
      console.error('Error creating databases:', error);
      throw error;
    }
  }

  /**
   * Add test placeholder rows to the databases
   */
  async addTestPlaceholders(databases: Map<string, DatabaseCheckResult>) {
    console.log('\n🧪 Adding test placeholder rows...');

    try {
      // Add a test entry to Unsorted Content Register
      const unsortedContentRegister = databases.get('Unsorted Content Register');
      if (unsortedContentRegister?.id) {
        await this.notionClient.client.pages.create({
          parent: { database_id: unsortedContentRegister.id },
          properties: {
            'Title': {
              title: [
                {
                  text: {
                    content: 'WT-Unsorted-Content-26JUL1847',
                  },
                },
              ],
            },
            'SourceLink': {
              url: WT_UNSORTED_CONTENT_URL,
            },
            'ParseStatus': {
              select: {
                name: 'Not Started',
              },
            },
            'LatestBlockParsed': {
              rich_text: [
                {
                  text: {
                    content: 'None',
                  },
                },
              ],
            },
            'Created': {
              date: {
                start: new Date().toISOString(),
              },
            },
          },
        });
        console.log('✅ Added test entry to Unsorted Content Register');
      }

      console.log('🎯 Test placeholders added successfully');
    } catch (error) {
      console.warn('⚠️  Could not add test placeholders:', error);
    }
  }

  /**
   * Update parent page with database information
   */
  async updateParentPage(databases: Map<string, DatabaseCheckResult>) {
    console.log('\n📝 Updating parent page with database information...');

    try {
      const databaseBlocks = [];

      // Add heading
      databaseBlocks.push({
        object: 'block' as const,
        type: 'heading_2' as const,
        heading_2: {
          rich_text: [
            {
              text: {
                content: '📊 Linked Databases',
              },
            },
          ],
        },
      });

      // Add each database as a linked database block
      for (const [name, db] of databases) {
        if (db.exists || db.id) {
          databaseBlocks.push({
            object: 'block' as const,
            type: 'child_database' as const,
            child_database: {
              title: name,
            },
          });
        }
      }

      // Add instructions
      databaseBlocks.push({
        object: 'block' as const,
        type: 'divider' as const,
        divider: {},
      });

      databaseBlocks.push({
        object: 'block' as const,
        type: 'paragraph' as const,
        paragraph: {
          rich_text: [
            {
              text: {
                content: 'The three databases above are now linked and ready for use:\n\n',
              },
            },
            {
              text: {
                content: '1. Unsorted Content Register',
                bold: true,
              },
            },
            {
              text: {
                content: ' - Tracks parsing progress of raw content\n',
              },
            },
            {
              text: {
                content: '2. Temporary Holding Table',
                bold: true,
              },
            },
            {
              text: {
                content: ' - Stores parsed atomic memory blocks\n',
              },
            },
            {
              text: {
                content: '3. Routing Table',
                bold: true,
              },
            },
            {
              text: {
                content: ' - Routes blocks to their destination databases',
              },
            },
          ],
        },
      });

      await this.notionClient.appendToPage({
        page_id: WT_UNSORTED_CONTENT_PAGE_ID,
        children: databaseBlocks,
      });

      console.log('✅ Parent page updated successfully');
    } catch (error) {
      console.warn('⚠️  Could not update parent page:', error);
    }
  }
}

async function main() {
  console.log('🚀 Checking and Creating Unsorted Content Databases');
  console.log(`📍 Target page: ${WT_UNSORTED_CONTENT_URL}\n`);

  const manager = new UnsortedContentDatabaseManager();

  try {
    // Step 1: Check existing databases
    const existingDatabases = await manager.checkExistingDatabases();

    // Step 2: Create missing databases
    const createdDatabases = await manager.createDatabases(existingDatabases);

    // Step 3: Merge results
    for (const [name, result] of Object.entries(createdDatabases)) {
      existingDatabases.set(name, {
        exists: true,
        id: result.databaseId,
        url: result.url,
        name: name,
      });
    }

    // Step 4: Add test placeholders
    await manager.addTestPlaceholders(existingDatabases);

    // Step 5: Update parent page
    // Note: Commenting out for now as child_database blocks might need special permissions
    // await manager.updateParentPage(existingDatabases);

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('✅ SUMMARY');
    console.log('='.repeat(80));
    
    console.log('\n📊 Database Status:');
    for (const [name, db] of existingDatabases) {
      if (db.url) {
        console.log(`   ✅ ${name}`);
        console.log(`      URL: ${db.url}`);
        console.log(`      ID: ${db.id}`);
      } else {
        console.log(`   ❌ ${name} - Failed to create`);
      }
    }

    console.log('\n💡 Next Steps:');
    console.log('1. Visit the WT-Unsorted-Content page to see the databases');
    console.log('2. The databases are now linked with proper relations');
    console.log('3. Run the atomic memory extraction script to populate data');
    console.log('4. Use the routing table to classify and dispatch content');

    // Save database IDs to env file
    const envContent = `# Unsorted Content Database IDs
# Generated on ${new Date().toISOString()}

NOTION_UNSORTED_CONTENT_REGISTER_ID=${existingDatabases.get('Unsorted Content Register')?.id || ''}
NOTION_TEMPORARY_HOLDING_TABLE_ID=${existingDatabases.get('Temporary Holding Table')?.id || ''}
NOTION_ROUTING_TABLE_ID=${existingDatabases.get('Routing Table')?.id || ''}
`;

    const fs = await import('fs/promises');
    await fs.writeFile('.env.unsorted-content-dbs', envContent);
    console.log('\n💾 Database IDs saved to .env.unsorted-content-dbs');

  } catch (error) {
    console.error('💥 Error:', error);
    process.exit(1);
  }
}

// Execute
main();