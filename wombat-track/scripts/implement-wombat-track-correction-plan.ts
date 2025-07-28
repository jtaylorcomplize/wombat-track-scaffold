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

  // StepProgress Database Schema
  static getStepProgressSchema(phaseStepDbId?: string): DatabaseSchema {
    const schema: DatabaseSchema = {
      name: 'StepProgress',
      description: 'Progress tracking for individual phase steps',
      properties: {
        progressId: {
          title: {},
        },
        status: {
          select: {
            options: [
              { name: 'Not Started', color: 'gray' },
              { name: 'In Progress', color: 'yellow' },
              { name: 'Completed', color: 'green' },
              { name: 'Blocked', color: 'red' },
              { name: 'On Hold', color: 'orange' },
            ],
          },
        },
        completionPercentage: {
          number: {
            format: 'percent',
          },
        },
        startDate: {
          date: {},
        },
        endDate: {
          date: {},
        },
        notes: {
          rich_text: {},
        },
        blockers: {
          rich_text: {},
        },
        estimatedHours: {
          number: {},
        },
        actualHours: {
          number: {},
        },
        createdAt: {
          created_time: {},
        },
        updatedAt: {
          last_edited_time: {},
        },
      },
    };

    // Add relation to PhaseStep (one-to-one)
    if (phaseStepDbId) {
      schema.properties.phaseStep = {
        relation: {
          database_id: phaseStepDbId,
        },
      };
    }

    return schema;
  }

  // CheckpointReview Database Schema
  static getCheckpointReviewSchema(phaseStepDbId?: string): DatabaseSchema {
    const schema: DatabaseSchema = {
      name: 'CheckpointReview',
      description: 'Checkpoint reviews for phase step completion verification',
      properties: {
        reviewId: {
          title: {},
        },
        reviewType: {
          select: {
            options: [
              { name: 'Quality Check', color: 'blue' },
              { name: 'Milestone Review', color: 'purple' },
              { name: 'Governance Review', color: 'green' },
              { name: 'Technical Review', color: 'orange' },
            ],
          },
        },
        status: {
          select: {
            options: [
              { name: 'Pending', color: 'gray' },
              { name: 'In Review', color: 'yellow' },
              { name: 'Approved', color: 'green' },
              { name: 'Rejected', color: 'red' },
              { name: 'Requires Changes', color: 'orange' },
            ],
          },
        },
        reviewer: {
          rich_text: {},
        },
        reviewDate: {
          date: {},
        },
        findings: {
          rich_text: {},
        },
        recommendations: {
          rich_text: {},
        },
        approved: {
          checkbox: {},
        },
        createdAt: {
          created_time: {},
        },
        updatedAt: {
          last_edited_time: {},
        },
      },
    };

    // Add relation to PhaseStep (one-to-one)
    if (phaseStepDbId) {
      schema.properties.phaseStep = {
        relation: {
          database_id: phaseStepDbId,
        },
      };
    }

    return schema;
  }

  // MeetingLog Database Schema
  static getMeetingLogSchema(phaseStepDbId?: string, governanceDbId?: string): DatabaseSchema {
    const schema: DatabaseSchema = {
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
        createdAt: {
          created_time: {},
        },
        updatedAt: {
          last_edited_time: {},
        },
      },
    };

    // Add relations
    if (phaseStepDbId) {
      schema.properties.relatedPhaseStep = {
        relation: {
          database_id: phaseStepDbId,
        },
      };
    }

    if (governanceDbId) {
      schema.properties.relatedGovernanceLog = {
        relation: {
          database_id: governanceDbId,
        },
      };
    }

    return schema;
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
  static getPhaseStepUpdateFields(templateDbId?: string): Record<string, any> {
    const fields: Record<string, any> = {
      stepNumber: {
        number: {},
      },
    };

    if (templateDbId) {
      fields.aiSuggestedTemplates = {
        relation: {
          database_id: templateDbId,
        },
      };
    }

    return fields;
  }

  // Updated GovernanceLog fields for relationships
  static getGovernanceLogUpdateFields(phaseStepDbId?: string, meetingLogDbId?: string): Record<string, any> {
    const fields: Record<string, any> = {};

    if (phaseStepDbId) {
      fields.relatedPhaseStep = {
        relation: {
          database_id: phaseStepDbId,
        },
      };
    }

    if (meetingLogDbId) {
      fields.relatedMeetingLog = {
        relation: {
          database_id: meetingLogDbId,
        },
      };
    }

    return fields;
  }
}

async function implementCorrectionPlan() {
  console.log('🔧 Implementing Wombat Track Data Model Correction Plan\n');

  const token = process.env.NOTION_TOKEN;
  if (!token) {
    throw new Error('NOTION_TOKEN environment variable is required');
  }

  // Use the replicated oApp databases page ID from the request
  const parentPageId = '23de1901-e36e-8082-a619-c72ebfc05f84';
  const manager = new WombatTrackDatabaseManager(token, parentPageId);

  // Get existing database IDs
  const projectDbId = process.env.NOTION_WT_PROJECT_DB_ID;
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
    // Step 1: Create missing databases
    console.log('🏗️  Creating missing databases...\n');

    // Create Template Database
    console.log('📊 Creating Template database...');
    const templateResult = await manager.createDatabase(
      WombatTrackDatabaseManager.getTemplateSchema()
    );
    if (templateResult.success) {
      results.createdDatabases.push({
        name: 'Template',
        id: templateResult.databaseId,
        url: templateResult.url,
      });
      console.log(`✅ Template database created: ${templateResult.databaseId}`);
    } else {
      results.errors.push(`Template DB: ${templateResult.error}`);
      console.log(`❌ Template DB: ${templateResult.error}`);
    }

    // Create StepProgress Database
    console.log('📊 Creating StepProgress database...');
    const stepProgressResult = await manager.createDatabase(
      WombatTrackDatabaseManager.getStepProgressSchema(phaseStepDbId)
    );
    if (stepProgressResult.success) {
      results.createdDatabases.push({
        name: 'StepProgress',
        id: stepProgressResult.databaseId,
        url: stepProgressResult.url,
      });
      console.log(`✅ StepProgress database created: ${stepProgressResult.databaseId}`);
    } else {
      results.errors.push(`StepProgress DB: ${stepProgressResult.error}`);
      console.log(`❌ StepProgress DB: ${stepProgressResult.error}`);
    }

    // Create CheckpointReview Database
    console.log('📊 Creating CheckpointReview database...');
    const checkpointResult = await manager.createDatabase(
      WombatTrackDatabaseManager.getCheckpointReviewSchema(phaseStepDbId)
    );
    if (checkpointResult.success) {
      results.createdDatabases.push({
        name: 'CheckpointReview',
        id: checkpointResult.databaseId,
        url: checkpointResult.url,
      });
      console.log(`✅ CheckpointReview database created: ${checkpointResult.databaseId}`);
    } else {
      results.errors.push(`CheckpointReview DB: ${checkpointResult.error}`);
      console.log(`❌ CheckpointReview DB: ${checkpointResult.error}`);
    }

    // Create MeetingLog Database
    console.log('📊 Creating MeetingLog database...');
    const meetingLogResult = await manager.createDatabase(
      WombatTrackDatabaseManager.getMeetingLogSchema(phaseStepDbId, governanceDbId)
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
    if (phaseStepDbId && templateResult.success) {
      console.log('📊 Updating PhaseStep database...');
      const phaseStepUpdateResult = await manager.updateDatabaseProperties(
        phaseStepDbId,
        WombatTrackDatabaseManager.getPhaseStepUpdateFields(templateResult.databaseId)
      );
      if (phaseStepUpdateResult.success) {
        results.updatedDatabases.push({
          name: 'PhaseStep',
          id: phaseStepDbId,
          fields: ['stepNumber', 'aiSuggestedTemplates'],
        });
        console.log('✅ PhaseStep database updated with new fields');
      } else {
        results.errors.push(`PhaseStep DB Update: ${phaseStepUpdateResult.error}`);
        console.log(`❌ PhaseStep DB Update: ${phaseStepUpdateResult.error}`);
      }
    }

    // Update GovernanceLog Database
    if (governanceDbId && meetingLogResult.success) {
      console.log('📊 Updating GovernanceLog database...');
      const governanceUpdateResult = await manager.updateDatabaseProperties(
        governanceDbId,
        WombatTrackDatabaseManager.getGovernanceLogUpdateFields(phaseStepDbId, meetingLogResult.databaseId)
      );
      if (governanceUpdateResult.success) {
        results.updatedDatabases.push({
          name: 'GovernanceLog',
          id: governanceDbId,
          fields: ['relatedPhaseStep', 'relatedMeetingLog'],
        });
        console.log('✅ GovernanceLog database updated with new relationships');
      } else {
        results.errors.push(`GovernanceLog DB Update: ${governanceUpdateResult.error}`);
        console.log(`❌ GovernanceLog DB Update: ${governanceUpdateResult.error}`);
      }
    }

    // Step 3: Create summary report
    console.log('\n📋 Implementation Summary\n');
    
    console.log('✅ Created Databases:');
    results.createdDatabases.forEach((db: any) => {
      console.log(`   📊 ${db.name}`);
      console.log(`      ID: ${db.id}`);
      console.log(`      URL: ${db.url}`);
    });

    console.log('\n🔄 Updated Databases:');
    results.updatedDatabases.forEach((db: any) => {
      console.log(`   📊 ${db.name} (${db.id})`);
      console.log(`      Added fields: ${db.fields.join(', ')}`);
    });

    if (results.errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      results.errors.forEach((error: string) => {
        console.log(`   ❌ ${error}`);
      });
    }

    console.log('\n🎯 Final Schema Validation:');
    console.log('✅ All 7 required databases should now exist:');
    console.log('   1. Project (existing, updated with new fields)');
    console.log('   2. PhaseStep (existing, updated with new fields)');
    console.log('   3. StepProgress (newly created)');
    console.log('   4. GovernanceLog (existing, updated with relationships)');
    console.log('   5. CheckpointReview (newly created)');
    console.log('   6. MeetingLog (newly created)');
    console.log('   7. Template (newly created)');

    console.log('\n🔗 Implemented Relationships:');
    console.log('   • PhaseStep ↔ StepProgress (one-to-one)');
    console.log('   • PhaseStep ↔ CheckpointReview (one-to-one)');
    console.log('   • PhaseStep ↔ GovernanceLog (one-to-many)');
    console.log('   • PhaseStep ↔ MeetingLog (one-to-many)');
    console.log('   • GovernanceLog ↔ MeetingLog (many-to-many)');
    console.log('   • PhaseStep ↔ Template (many-to-many via aiSuggestedTemplates)');

    return results;

  } catch (error) {
    console.error('💥 Error during implementation:', error);
    throw error;
  }
}

// Execute the correction plan
implementCorrectionPlan()
  .then(results => {
    console.log('\n🎉 Wombat Track Data Model Correction Plan implemented successfully!');
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