#!/usr/bin/env npx tsx

import dotenv from 'dotenv';
import { Client } from '@notionhq/client';
import { createNotionClient } from '../src/utils/notionClient.ts';

dotenv.config();

interface RecoveryRecord {
  title: string;
  chatTimestamp: string;
  chatTitle: string;
  artefactType: string;
  summary: string;
  status: string;
  suggestedName: string;
  recoveryAction: string;
  notes: string;
}

class RecoveryLogCreator {
  private client: Client;
  private parentPageId: string;
  private recoveryDbId?: string;
  
  constructor() {
    this.client = createNotionClient().client;
    this.parentPageId = process.env.NOTION_WT_PARENT_PAGE_ID || '';
  }

  async createRecoveryLogDatabase(): Promise<string> {
    console.log('📊 Creating wt-recovery-log database...\n');
    
    try {
      const response = await this.client.databases.create({
        parent: { page_id: this.parentPageId },
        title: [
          {
            text: {
              content: 'wt-recovery-log'
            }
          }
        ],
        description: [
          {
            text: {
              content: 'Recovery log for incomplete or dropped artefacts from Wombat Tracks chat archive'
            }
          }
        ],
        properties: {
          title: {
            title: {}
          },
          chatTimestamp: {
            date: {}
          },
          chatTitle: {
            rich_text: {}
          },
          artefactType: {
            select: {
              options: [
                { name: 'Project', color: 'blue' },
                { name: 'Phase', color: 'green' },
                { name: 'Feature', color: 'purple' },
                { name: 'SideQuest', color: 'pink' },
                { name: 'Document', color: 'gray' },
                { name: 'Configuration', color: 'orange' },
                { name: 'Other', color: 'default' }
              ]
            }
          },
          summary: {
            rich_text: {}
          },
          status: {
            select: {
              options: [
                { name: 'Cancelled', color: 'red' },
                { name: 'Missing', color: 'orange' },
                { name: 'Incomplete', color: 'yellow' },
                { name: 'Unlogged', color: 'gray' },
                { name: 'Complete', color: 'green' },
                { name: 'Pending Validation', color: 'purple' }
              ]
            }
          },
          suggestedName: {
            rich_text: {}
          },
          recoveryAction: {
            select: {
              options: [
                { name: 'Log', color: 'blue' },
                { name: 'Ignore', color: 'gray' },
                { name: 'Rebuild', color: 'orange' },
                { name: 'Archive', color: 'red' }
              ]
            }
          },
          notes: {
            rich_text: {}
          },
          linkedCanonicalEntry: {
            rich_text: {}  // Will store reference to existing entries
          },
          validationRequired: {
            checkbox: {}
          },
          createdAt: {
            created_time: {}
          },
          updatedAt: {
            last_edited_time: {}
          }
        }
      });

      this.recoveryDbId = response.id;
      console.log(`✅ Recovery log database created: ${response.id}`);
      console.log(`   URL: ${response.url}\n`);
      
      return response.id;
    } catch (error) {
      console.error('❌ Failed to create recovery log database:', error);
      throw error;
    }
  }

  async importRecoveryRecords(databaseId: string): Promise<void> {
    console.log('📥 Importing recovery records...\n');
    
    // Sample recovery records based on Wombat Tracks chat archive
    // In a real scenario, these would be parsed from the actual archive
    const recoveryRecords: RecoveryRecord[] = [
      {
        title: 'WT-3.1 Validation Scaffolding',
        chatTimestamp: '2025-07-20T00:00:00Z',
        chatTitle: 'Creating validation test harness',
        artefactType: 'Phase',
        summary: 'Validation framework setup with Puppeteer tests',
        status: 'Incomplete',
        suggestedName: 'WT-3.1',
        recoveryAction: 'Log',
        notes: 'Phase partially implemented, needs Puppeteer test completion'
      },
      {
        title: 'MemSync Deep Dive Architecture',
        chatTimestamp: '2025-07-18T00:00:00Z',
        chatTitle: 'MemSync implementation planning',
        artefactType: 'Document',
        summary: 'Architecture document for MemSync integration',
        status: 'Missing',
        suggestedName: 'WT-5.x-memsync-arch',
        recoveryAction: 'Rebuild',
        notes: 'Referenced in multiple chats but document not found in current structure'
      },
      {
        title: 'Gizmo-Claude Protocol v2',
        chatTimestamp: '2025-07-22T00:00:00Z',
        chatTitle: 'Protocol enhancement discussion',
        artefactType: 'Feature',
        summary: 'Enhanced communication protocol between Gizmo and Claude',
        status: 'Unlogged',
        suggestedName: 'WT-6.x-protocol-v2',
        recoveryAction: 'Log',
        notes: 'Feature discussed but not logged in governance'
      },
      {
        title: 'Notion API Rate Limiting Handler',
        chatTimestamp: '2025-07-19T00:00:00Z',
        chatTitle: 'API optimization sidequest',
        artefactType: 'SideQuest',
        summary: 'Rate limiting handler for Notion API calls',
        status: 'Unlogged',
        suggestedName: 'SQ-notion-rate-limit',
        recoveryAction: 'Log',
        notes: 'Implemented as part of WT-3.3 but not separately tracked'
      },
      {
        title: 'Abandoned OAuth Implementation',
        chatTimestamp: '2025-07-15T00:00:00Z',
        chatTitle: 'OAuth vs API key discussion',
        artefactType: 'Feature',
        summary: 'OAuth implementation attempt before switching to API keys',
        status: 'Cancelled',
        suggestedName: 'WT-X-oauth',
        recoveryAction: 'Archive',
        notes: 'Decided to use API keys instead, code archived'
      },
      {
        title: 'Sub-App Dashboard Mock',
        chatTimestamp: '2025-07-25T00:00:00Z',
        chatTitle: 'UI wireframe review',
        artefactType: 'Document',
        summary: 'Dashboard wireframe for sub-app management',
        status: 'Pending Validation',
        suggestedName: 'WT-7.2-dashboard-mock',
        recoveryAction: 'Log',
        notes: 'Wireframe created but needs validation against implementation'
      }
    ];

    for (const record of recoveryRecords) {
      try {
        const properties: any = {
          title: {
            title: [{ text: { content: record.title } }]
          },
          chatTimestamp: {
            date: { start: record.chatTimestamp }
          },
          chatTitle: {
            rich_text: [{ text: { content: record.chatTitle } }]
          },
          artefactType: {
            select: { name: record.artefactType }
          },
          summary: {
            rich_text: [{ text: { content: record.summary } }]
          },
          status: {
            select: { name: record.status }
          },
          suggestedName: {
            rich_text: [{ text: { content: record.suggestedName } }]
          },
          recoveryAction: {
            select: { name: record.recoveryAction }
          },
          notes: {
            rich_text: [{ text: { content: record.notes } }]
          },
          validationRequired: {
            checkbox: record.status === 'Pending Validation'
          }
        };

        // Check if this links to an existing canonical entry
        if (record.suggestedName.startsWith('WT-')) {
          properties.linkedCanonicalEntry = {
            rich_text: [{ text: { content: `Linked to ${record.suggestedName}` } }]
          };
        }

        await this.client.pages.create({
          parent: { database_id: databaseId },
          properties
        });

        console.log(`✅ Imported: ${record.title}`);
      } catch (error) {
        console.error(`❌ Failed to import ${record.title}:`, error);
      }
    }
  }

  async createDatabaseViews(databaseId: string): Promise<void> {
    console.log('\n📋 Creating database views...\n');
    
    // Note: Notion API doesn't directly support creating views,
    // but we can document the views that should be created manually
    
    console.log('Please create the following views in Notion:');
    console.log('\n1. 📌 Pending Validation');
    console.log('   - Filter: validationRequired = true');
    console.log('   - Sort: chatTimestamp (descending)');
    console.log('   - Show: All fields');
    
    console.log('\n2. 🔍 Recovery - Unresolved Items');
    console.log('   - Filter: status != "Complete"');
    console.log('   - Sort: recoveryAction (priority), chatTimestamp');
    console.log('   - Group by: recoveryAction');
    
    console.log('\n3. 📅 Timeline View');
    console.log('   - View type: Timeline');
    console.log('   - Date property: chatTimestamp');
    console.log('   - Color by: status');
    
    console.log('\n4. 🏗️ Items to Rebuild');
    console.log('   - Filter: recoveryAction = "Rebuild"');
    console.log('   - Sort: artefactType, suggestedName');
  }

  async run(): Promise<void> {
    console.log('🚀 Wombat Track Recovery Log Setup\n');
    console.log('=' .repeat(60) + '\n');

    try {
      if (!this.parentPageId) {
        throw new Error('Parent page ID not found in environment');
      }

      // Create the database
      const dbId = await this.createRecoveryLogDatabase();
      
      // Import recovery records
      await this.importRecoveryRecords(dbId);
      
      // Document the views to create
      await this.createDatabaseViews(dbId);
      
      // Save database ID to env file
      console.log('\n💾 Saving database ID to .env.wt-recovery...');
      
      const envContent = `# Wombat Track Recovery Log Database ID
# Generated on ${new Date().toISOString()}

NOTION_WT_RECOVERY_LOG_DB_ID=${dbId}
`;

      await import('fs/promises').then(fs => 
        fs.writeFile('.env.wt-recovery', envContent)
      );

      console.log('\n✅ Recovery log setup complete!');
      console.log('\n📋 Summary:');
      console.log('- Recovery log database created');
      console.log('- Sample records imported');
      console.log('- Database ID saved to .env.wt-recovery');
      console.log('\n⚠️  Remember to create the views manually in Notion');
      
    } catch (error) {
      console.error('\n❌ Setup failed:', error);
      process.exit(1);
    }
  }
}

// Run the creator
const creator = new RecoveryLogCreator();
creator.run().catch(console.error);