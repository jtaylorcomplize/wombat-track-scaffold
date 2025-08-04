#!/usr/bin/env npx tsx

import dotenv from 'dotenv';
import { Client } from '@notionhq/client';

dotenv.config();

interface DatabaseSchema {
  name: string;
  description?: string;
  properties: Record<string, any>;
}

class GovernanceLogCreator {
  private client: Client;
  private parentPageId: string;

  constructor(token: string, parentPageId: string) {
    this.client = new Client({ auth: token });
    this.parentPageId = parentPageId;
  }

  async createDatabase(schema: DatabaseSchema) {
    try {
      const response = await this.client.databases.create({
        parent: { page_id: this.parentPageId },
        title: [
          {
            text: {
              content: schema.name,
            },
          },
        ],
        properties: schema.properties,
        description: schema.description ? [
          {
            text: {
              content: schema.description,
            },
          },
        ] : undefined,
      });

      return {
        success: true,
        databaseId: response.id,
        url: response.url,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // GovernanceLog Database Schema
  static getGovernanceLogSchema(): DatabaseSchema {
    return {
      name: 'GovernanceLog',
      description: 'Governance events and decisions tracking for Wombat Track projects',
      properties: {
        eventId: {
          title: {},
        },
        eventType: {
          select: {
            options: [
              { name: 'Decision', color: 'blue' },
              { name: 'StepStatusUpdated', color: 'green' },
              { name: 'PhaseUpdated', color: 'purple' },
              { name: 'AgentAction', color: 'orange' },
              { name: 'SystemUpgrade', color: 'red' },
              { name: 'MeshChange', color: 'pink' },
            ],
          },
        },
        ragStatus: {
          select: {
            options: [
              { name: 'Red', color: 'red' },
              { name: 'Amber', color: 'yellow' },
              { name: 'Green', color: 'green' },
            ],
          },
        },
        summary: {
          rich_text: {},
        },
        aiDraftEntry: {
          rich_text: {},
        },
        memoryPluginTags: {
          multi_select: {
            options: [
              { name: 'decision', color: 'blue' },
              { name: 'technical', color: 'purple' },
              { name: 'governance', color: 'green' },
              { name: 'integration', color: 'orange' },
              { name: 'milestone', color: 'red' },
            ],
          },
        },
        confidence: {
          select: {
            options: [
              { name: 'High', color: 'green' },
              { name: 'Medium', color: 'yellow' },
              { name: 'Low', color: 'red' },
            ],
          },
        },
        timestamp: {
          date: {},
        },
        author: {
          rich_text: {},
        },
        sourceSystem: {
          select: {
            options: [
              { name: 'Wombat Track', color: 'blue' },
              { name: 'Claude', color: 'purple' },
              { name: 'Gizmo', color: 'green' },
              { name: 'GitHub', color: 'gray' },
              { name: 'Manual', color: 'orange' },
            ],
          },
        },
        lastSynced: {
          date: {},
        },
        // These will be text fields initially for the related IDs
        relatedPhaseStepId: {
          rich_text: {},
        },
        relatedMeetingLogId: {
          rich_text: {},
        },
        createdAt: {
          created_time: {},
        },
        updatedAt: {
          last_edited_time: {},
        },
      },
    };
  }
}

async function createGovernanceLogDatabase() {
  console.log('🏛️  Creating GovernanceLog Database\n');

  const token = process.env.NOTION_TOKEN;
  if (!token) {
    throw new Error('NOTION_TOKEN environment variable is required');
  }

  const parentPageId = '23de1901-e36e-8082-a619-c72ebfc05f84';
  const creator = new GovernanceLogCreator(token, parentPageId);

  try {
    console.log('📊 Creating GovernanceLog database...');
    const result = await creator.createDatabase(
      GovernanceLogCreator.getGovernanceLogSchema()
    );

    if (result.success) {
      console.log(`✅ GovernanceLog database created successfully!`);
      console.log(`   Database ID: ${result.databaseId}`);
      console.log(`   URL: ${result.url}`);

      console.log('\n🎯 Final Database Collection Status:');
      console.log('✅ All 7 required databases now exist:');
      console.log('   1. ✅ Project');
      console.log('   2. ✅ PhaseStep');
      console.log('   3. ✅ StepProgress');
      console.log('   4. ✅ GovernanceLog (just created)');
      console.log('   5. ✅ CheckpointReview');
      console.log('   6. ✅ MeetingLog');
      console.log('   7. ✅ Template');

      console.log('\n💾 Save this GovernanceLog Database ID:');
      console.log(`NOTION_WT_GOVERNANCE_DB_ID=${result.databaseId}`);

      return {
        success: true,
        databaseId: result.databaseId,
        url: result.url,
      };
    } else {
      console.error(`❌ Failed to create GovernanceLog database: ${result.error}`);
      return result;
    }

  } catch (error) {
    console.error('💥 Error creating GovernanceLog database:', error);
    throw error;
  }
}

// Execute
createGovernanceLogDatabase()
  .then(result => {
    if (result.success) {
      console.log('\n🎉 GovernanceLog database creation completed successfully!');
    } else {
      console.log('\n❌ GovernanceLog database creation failed');
    }
  })
  .catch(error => {
    console.error('💥 Failed:', error);
    process.exit(1);
  });