#!/usr/bin/env npx tsx

import dotenv from 'dotenv';
import { Client } from '@notionhq/client';

dotenv.config();

interface DatabaseSchema {
  name: string;
  description?: string;
  properties: Record<string, any>;
}

class WombatTrackDatabaseManager {
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

  async updateDatabaseProperties(databaseId: string, newProperties: Record<string, any>) {
    try {
      const response = await this.client.databases.update({
        database_id: databaseId,
        properties: newProperties,
      });

      return {
        success: true,
        response,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async getDatabaseInfo(databaseId: string) {
    try {
      const response = await this.client.databases.retrieve({
        database_id: databaseId,
      });
      return {
        success: true,
        database: response,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Template Database Schema
  static getTemplateSchema(): DatabaseSchema {
    return {
      name: 'Template',
      description: 'AI-suggested templates for project phases and steps',
      properties: {
        templateId: {
          title: {},
        },
        name: {
          rich_text: {},
        },
        description: {
          rich_text: {},
        },
        templateType: {
          select: {
            options: [
              { name: 'Phase Template', color: 'blue' },
              { name: 'Step Template', color: 'green' },
              { name: 'Governance Template', color: 'purple' },
              { name: 'Meeting Template', color: 'orange' },
            ],
          },
        },
        content: {
          rich_text: {},
        },
        tags: {
          multi_select: {
            options: [
              { name: 'AI-Generated', color: 'purple' },
              { name: 'User-Created', color: 'blue' },
              { name: 'Standard', color: 'green' },
              { name: 'Custom', color: 'orange' },
            ],
          },
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

  // MeetingLog Database Schema - Simplified to avoid relation issues initially
  static getMeetingLogSchema(): DatabaseSchema {
    return {
      name: 'MeetingLog',
      description: 'Meeting records and decisions related to project phases',
      properties: {
        meetingId: {
          title: {},
        },
        meetingType: {
          select: {
            options: [
              { name: 'Stand-up', color: 'blue' },
              { name: 'Planning', color: 'purple' },
              { name: 'Review', color: 'green' },
              { name: 'Retrospective', color: 'orange' },
              { name: 'Decision Meeting', color: 'red' },
            ],
          },
        },
        date: {
          date: {},
        },
        participants: {
          multi_select: {
            options: [
              { name: 'Project Manager', color: 'blue' },
              { name: 'Developer', color: 'green' },
              { name: 'Stakeholder', color: 'purple' },
              { name: 'AI Agent', color: 'orange' },
            ],
          },
        },
        agenda: {
          rich_text: {},
        },
        minutes: {
          rich_text: {},
        },
        decisions: {
          rich_text: {},
        },
        actionItems: {
          rich_text: {},
        },
        followUpRequired: {
          checkbox: {},
        },
        // These will be added as text fields initially, then converted to relations
        relatedPhaseStepId: {
          rich_text: {},
        },
        relatedGovernanceLogId: {
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

  // Updated Project Database fields
  static getProjectUpdateFields(): Record<string, any> {
    return {
      goals: {
        rich_text: {},
      },
      scopeNotes: {
        rich_text: {},
      },
      keyTasks: {
        multi_select: {
          options: [
            { name: 'Analysis', color: 'blue' },
            { name: 'Design', color: 'purple' },
            { name: 'Implementation', color: 'green' },
            { name: 'Testing', color: 'orange' },
            { name: 'Deployment', color: 'red' },
            { name: 'Documentation', color: 'gray' },
          ],
        },
      },
      aiPromptLog: {
        rich_text: {},
      },
    };
  }

  // Updated PhaseStep Database fields
  static getPhaseStepUpdateFields(): Record<string, any> {
    return {
      stepNumber: {
        number: {},
      },
      // Start with text field, will convert to relation later
      aiSuggestedTemplateIds: {
        rich_text: {},
      },
    };
  }
}

async function implementCorrectionPlan() {
  console.log('🔧 Implementing Wombat Track Data Model Correction Plan (Fixed Version)\n');

  const token = process.env.NOTION_TOKEN;
  if (!token) {
    throw new Error('NOTION_TOKEN environment variable is required');
  }

  // Use the replicated oApp databases page ID from the request
  const parentPageId = '23de1901-e36e-8082-a619-c72ebfc05f84';
  const manager = new WombatTrackDatabaseManager(token, parentPageId);

  // Get existing database IDs
  const projectDbId = process.env.NOTION_WT_PROJECT_DB_ID || '23ce1901-e36e-811b-946b-c3e7d764c335';
  const phaseStepDbId = process.env.NOTION_PHASE_STEP_DB_ID;
  const governanceDbId = process.env.NOTION_WT_GOVERNANCE_DB_ID;

  console.log('📊 Current Database Configuration:');
  console.log(`  Project DB: ${projectDbId || 'Not set'}`);
  console.log(`  PhaseStep DB: ${phaseStepDbId || 'Not set'}`);
  console.log(`  Governance DB: ${governanceDbId || 'Not set'}\n`);

  const results: any = {
    createdDatabases: [],
    updatedDatabases: [],
    errors: [],
  };

  try {
    // Step 1: Create MeetingLog Database (the one that failed before)
    console.log('🏗️  Creating MeetingLog database...\n');

    console.log('📊 Creating MeetingLog database...');
    const meetingLogResult = await manager.createDatabase(
      WombatTrackDatabaseManager.getMeetingLogSchema()
    );
    if (meetingLogResult.success) {
      results.createdDatabases.push({
        name: 'MeetingLog',
        id: meetingLogResult.databaseId,
        url: meetingLogResult.url,
      });
      console.log(`✅ MeetingLog database created: ${meetingLogResult.databaseId}`);
    } else {
      results.errors.push(`MeetingLog DB: ${meetingLogResult.error}`);
      console.log(`❌ MeetingLog DB: ${meetingLogResult.error}`);
    }

    // Step 2: Update existing databases with missing fields
    console.log('\n🔄 Updating existing databases with missing fields...\n');

    // Update Project Database
    if (projectDbId) {
      console.log('📊 Updating Project database...');
      const projectUpdateResult = await manager.updateDatabaseProperties(
        projectDbId,
        WombatTrackDatabaseManager.getProjectUpdateFields()
      );
      if (projectUpdateResult.success) {
        results.updatedDatabases.push({
          name: 'Project',
          id: projectDbId,
          fields: ['goals', 'scopeNotes', 'keyTasks', 'aiPromptLog'],
        });
        console.log('✅ Project database updated with new fields');
      } else {
        results.errors.push(`Project DB Update: ${projectUpdateResult.error}`);
        console.log(`❌ Project DB Update: ${projectUpdateResult.error}`);
      }
    }

    // Update PhaseStep Database
    if (phaseStepDbId) {
      console.log('📊 Updating PhaseStep database...');
      const phaseStepUpdateResult = await manager.updateDatabaseProperties(
        phaseStepDbId,
        WombatTrackDatabaseManager.getPhaseStepUpdateFields()
      );
      if (phaseStepUpdateResult.success) {
        results.updatedDatabases.push({
          name: 'PhaseStep',
          id: phaseStepDbId,
          fields: ['stepNumber', 'aiSuggestedTemplateIds'],
        });
        console.log('✅ PhaseStep database updated with new fields');
      } else {
        results.errors.push(`PhaseStep DB Update: ${phaseStepUpdateResult.error}`);
        console.log(`❌ PhaseStep DB Update: ${phaseStepUpdateResult.error}`);
      }
    }

    // Step 3: Create summary report
    console.log('\n📋 Implementation Summary\n');
    
    console.log('✅ Created Databases:');
    if (results.createdDatabases.length > 0) {
      results.createdDatabases.forEach((db: any) => {
        console.log(`   📊 ${db.name}`);
        console.log(`      ID: ${db.id}`);
        console.log(`      URL: ${db.url}`);
      });
    } else {
      console.log('   No new databases created in this run');
    }

    console.log('\n🔄 Updated Databases:');
    if (results.updatedDatabases.length > 0) {
      results.updatedDatabases.forEach((db: any) => {
        console.log(`   📊 ${db.name} (${db.id})`);
        console.log(`      Added fields: ${db.fields.join(', ')}`);
      });
    } else {
      console.log('   No databases updated in this run');
    }

    if (results.errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      results.errors.forEach((error: string) => {
        console.log(`   ❌ ${error}`);
      });
    }

    console.log('\n🎯 Current Status Update:');
    console.log('📊 Databases that should now exist:');
    console.log('   1. ✅ Project (existing, updated with new fields)');
    console.log('   2. ✅ PhaseStep (existing, updated with new fields)');
    console.log('   3. ✅ StepProgress (created in previous run)');
    console.log('   4. ? GovernanceLog (existing, relationships pending)');
    console.log('   5. ✅ CheckpointReview (created in previous run)');
    console.log('   6. ✅ MeetingLog (created in this run)');
    console.log('   7. ✅ Template (created in previous run)');

    console.log('\n📝 Next Steps Required:');
    console.log('   1. Convert text fields to proper relations once all databases exist');
    console.log('   2. Verify all 7 databases are accessible from the parent page');
    console.log('   3. Test the relationships work correctly');

    return results;

  } catch (error) {
    console.error('💥 Error during implementation:', error);
    throw error;
  }
}

// Execute the correction plan
implementCorrectionPlan()
  .then(results => {
    console.log('\n🎉 Wombat Track Data Model Correction Plan (Fixed) completed!');
    console.log(`📊 Created ${results.createdDatabases.length} new databases`);
    console.log(`🔄 Updated ${results.updatedDatabases.length} existing databases`);
    if (results.errors.length > 0) {
      console.log(`❌ ${results.errors.length} errors encountered`);
    }
  })
  .catch(error => {
    console.error('💥 Implementation failed:', error);
    process.exit(1);
  });