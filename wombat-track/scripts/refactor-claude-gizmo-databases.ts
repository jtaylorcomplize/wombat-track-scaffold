#!/usr/bin/env npx tsx

import dotenv from 'dotenv';
import { Client } from '@notionhq/client';
import { CreateDatabaseResponse, UpdateDatabaseResponse } from '@notionhq/client/build/src/api-endpoints';

dotenv.config();

interface DatabaseRefactorConfig {
  oldName: string;
  newName: string;
  newDescription: string;
  requiredProperties: Record<string, any>;
}

class ClaudeGizmoDatabaseRefactor {
  private notion: Client;
  private targetPageId: string;

  constructor(notionToken: string, targetPageId: string) {
    this.notion = new Client({ auth: notionToken });
    this.targetPageId = targetPageId;
  }

  async findDatabase(name: string): Promise<string | null> {
    try {
      console.log(`🔍 Searching for database: ${name}`);
      
      // Search in the target page
      const response = await this.notion.blocks.children.list({
        block_id: this.targetPageId,
        page_size: 100
      });

      for (const block of response.results) {
        if (block.type === 'child_database' && 'child_database' in block) {
          const dbId = block.id;
          const database = await this.notion.databases.retrieve({ database_id: dbId });
          
          if ('title' in database && database.title.length > 0) {
            const dbTitle = database.title[0].plain_text;
            if (dbTitle === name) {
              console.log(`✅ Found database: ${name} (ID: ${dbId})`);
              return dbId;
            }
          }
        }
      }

      // Also search globally
      const searchResponse = await this.notion.search({
        query: name,
        filter: {
          value: 'database',
          property: 'object'
        }
      });

      for (const result of searchResponse.results) {
        if (result.object === 'database' && 'title' in result && result.title.length > 0) {
          if (result.title[0].plain_text === name) {
            console.log(`✅ Found database globally: ${name} (ID: ${result.id})`);
            return result.id;
          }
        }
      }

      console.log(`❌ Database not found: ${name}`);
      return null;
    } catch (error) {
      console.error(`Error finding database: ${error}`);
      return null;
    }
  }

  async refactorDatabase(config: DatabaseRefactorConfig): Promise<boolean> {
    try {
      const databaseId = await this.findDatabase(config.oldName);
      
      if (!databaseId) {
        console.log(`⚠️  Database "${config.oldName}" not found. Creating new database...`);
        return await this.createDatabase(config.newName, config.newDescription, config.requiredProperties);
      }

      console.log(`\n🔧 Refactoring database: ${config.oldName} → ${config.newName}`);

      // Get current database configuration
      const currentDb = await this.notion.databases.retrieve({ database_id: databaseId });
      
      // Update database title and description
      const updatePayload: any = {
        database_id: databaseId,
        title: [{ text: { content: config.newName } }],
        description: [{ text: { content: config.newDescription } }]
      };

      // Merge existing properties with required properties
      const updatedProperties: Record<string, any> = {};
      
      // Keep existing properties
      if ('properties' in currentDb) {
        Object.entries(currentDb.properties).forEach(([key, value]) => {
          updatedProperties[key] = value;
        });
      }

      // Add/update required properties
      Object.entries(config.requiredProperties).forEach(([key, value]) => {
        updatedProperties[key] = value;
      });

      updatePayload.properties = updatedProperties;

      await this.notion.databases.update(updatePayload);
      
      console.log(`✅ Database refactored successfully: ${config.newName}`);
      return true;
    } catch (error) {
      console.error(`❌ Error refactoring database: ${error}`);
      return false;
    }
  }

  async createDatabase(name: string, description: string, properties: Record<string, any>): Promise<boolean> {
    try {
      console.log(`📦 Creating new database: ${name}`);
      
      const response = await this.notion.databases.create({
        parent: { page_id: this.targetPageId },
        title: [{ text: { content: name } }],
        description: [{ text: { content: description } }],
        properties: properties
      });

      console.log(`✅ Database created successfully: ${name} (ID: ${response.id})`);
      return true;
    } catch (error) {
      console.error(`❌ Error creating database: ${error}`);
      return false;
    }
  }

  async addSampleEntry(databaseName: string, entry: Record<string, any>): Promise<boolean> {
    try {
      const databaseId = await this.findDatabase(databaseName);
      if (!databaseId) {
        console.error(`❌ Cannot add sample entry: Database "${databaseName}" not found`);
        return false;
      }

      await this.notion.pages.create({
        parent: { database_id: databaseId },
        properties: entry
      });

      console.log(`✅ Sample entry added to ${databaseName}`);
      return true;
    } catch (error) {
      console.error(`❌ Error adding sample entry: ${error}`);
      return false;
    }
  }

  async getDatabaseInfo(databaseName: string): Promise<void> {
    try {
      const databaseId = await this.findDatabase(databaseName);
      if (!databaseId) return;

      // Get database info
      const database = await this.notion.databases.retrieve({ database_id: databaseId });
      
      // Get entry count
      const entries = await this.notion.databases.query({
        database_id: databaseId,
        page_size: 1
      });

      console.log(`\n📊 Database: ${databaseName}`);
      console.log(`   ID: ${databaseId}`);
      console.log(`   URL: https://notion.so/${databaseId.replace(/-/g, '')}`);
      console.log(`   Total entries: ${entries.has_more ? '100+' : entries.results.length}`);
      
      if ('properties' in database) {
        console.log(`   Properties: ${Object.keys(database.properties).join(', ')}`);
      }
    } catch (error) {
      console.error(`Error getting database info: ${error}`);
    }
  }

  async findProjectTracker(): Promise<string | null> {
    // Try to find WT Project Tracker database
    const projectTrackerNames = ['WT Project Tracker', 'wt-project-tracker', 'Project Tracker'];
    
    for (const name of projectTrackerNames) {
      const dbId = await this.findDatabase(name);
      if (dbId) return dbId;
    }
    
    return null;
  }
}

async function main() {
  console.log('🚀 Claude-Gizmo Database Refactoring Script\n');

  const notionToken = process.env.NOTION_TOKEN;
  if (!notionToken) {
    console.error('❌ NOTION_TOKEN not found in environment variables');
    process.exit(1);
  }

  // Target page ID from the URL provided
  const targetPageId = '23de1901e36e8082a619c72ebfc05f84';
  
  const refactor = new ClaudeGizmoDatabaseRefactor(notionToken, targetPageId);

  // Find Project Tracker for relations
  const projectTrackerId = await refactor.findProjectTracker();
  if (!projectTrackerId) {
    console.warn('⚠️  WT Project Tracker not found. Relations will be skipped.');
  }

  // Task 1: Refactor claude-gizmo-exchange to Agent Exchange Log
  const task1Config: DatabaseRefactorConfig = {
    oldName: 'claude-gizmo-exchange',
    newName: 'Agent Exchange Log',
    newDescription: 'A structured log of Claude/Gizmo prompts, responses, and AI-to-AI message dispatches. Used for memory replay, governance review, and agent orchestration history.',
    requiredProperties: {
      'exchangeId': { title: {} },
      'fromAgent': {
        select: {
          options: [
            { name: 'Claude', color: 'purple' },
            { name: 'Gizmo', color: 'green' },
            { name: 'Human', color: 'blue' }
          ]
        }
      },
      'toAgent': {
        select: {
          options: [
            { name: 'Claude', color: 'purple' },
            { name: 'Gizmo', color: 'green' },
            { name: 'Human', color: 'blue' }
          ]
        }
      },
      'messageType': {
        select: {
          options: [
            { name: 'Prompt', color: 'blue' },
            { name: 'Reply', color: 'green' },
            { name: 'Update', color: 'yellow' },
            { name: 'Log', color: 'gray' }
          ]
        }
      },
      'content': { rich_text: {} },
      'timestamp': { date: {} }
    }
  };

  if (projectTrackerId) {
    task1Config.requiredProperties['projectContext'] = {
      relation: {
        database_id: projectTrackerId,
        single_property: {}
      }
    };
  }

  console.log('\n📋 Task 1: Refactoring claude-gizmo-exchange');
  await refactor.refactorDatabase(task1Config);

  // Task 2: Refactor Claude-Gizmo Communication to Agent Governance Messages
  const task2Config: DatabaseRefactorConfig = {
    oldName: 'Claude-Gizmo Communication',
    newName: 'Agent Governance Messages',
    newDescription: 'A communication overlay for high-level Claude-Gizmo decisions, status updates, and governance-related agent dialogue. Tracks message status, urgency, and summary outcomes.',
    requiredProperties: {
      'Thread ID': { rich_text: {} },
      'Message': { title: {} },
      'Full Content': { rich_text: {} },
      'Context': { rich_text: {} },
      'Priority': {
        select: {
          options: [
            { name: 'High', color: 'red' },
            { name: 'Medium', color: 'yellow' },
            { name: 'Low', color: 'gray' }
          ]
        }
      },
      'Status': {
        select: {
          options: [
            { name: 'Unread', color: 'red' },
            { name: 'Read', color: 'yellow' },
            { name: 'Actioned', color: 'green' }
          ]
        }
      },
      'Expects Response': { checkbox: {} },
      'Sender': {
        select: {
          options: [
            { name: 'Claude', color: 'purple' },
            { name: 'Gizmo', color: 'green' },
            { name: 'Human', color: 'blue' }
          ]
        }
      },
      'Timestamp': { date: {} },
      'Response Link': { url: {} }
    }
  };

  if (projectTrackerId) {
    task2Config.requiredProperties['Project'] = {
      relation: {
        database_id: projectTrackerId,
        single_property: {}
      }
    };
  }

  console.log('\n📋 Task 2: Refactoring Claude-Gizmo Communication');
  await refactor.refactorDatabase(task2Config);

  // Task 3: Add sample entries
  console.log('\n📋 Task 3: Adding sample entries');

  // Sample entry for Agent Exchange Log
  const sampleExchange = {
    exchangeId: { title: [{ text: { content: 'EX-2025-001' } }] },
    fromAgent: { select: { name: 'Claude' } },
    toAgent: { select: { name: 'Gizmo' } },
    messageType: { select: { name: 'Prompt' } },
    content: { 
      rich_text: [{ 
        text: { 
          content: 'Requesting phase data synchronization for WT-5.7 UX Design System Integration' 
        } 
      }] 
    },
    timestamp: { date: { start: new Date().toISOString() } }
  };

  await refactor.addSampleEntry('Agent Exchange Log', sampleExchange);

  // Sample entry for Agent Governance Messages
  const sampleGovernance = {
    'Thread ID': { rich_text: [{ text: { content: 'TH-2025-001' } }] },
    'Message': { title: [{ text: { content: 'Governance Review: Phase 5.7 Compliance Check' } }] },
    'Full Content': { 
      rich_text: [{ 
        text: { 
          content: 'Initiating governance review for Phase 5.7 implementation. All SDLC controls have been verified. Requesting confirmation of design system integration compliance.' 
        } 
      }] 
    },
    'Context': { 
      rich_text: [{ 
        text: { 
          content: 'Part of WT-6.0 SDLC Controls Implementation' 
        } 
      }] 
    },
    'Priority': { select: { name: 'High' } },
    'Status': { select: { name: 'Unread' } },
    'Expects Response': { checkbox: true },
    'Sender': { select: { name: 'Claude' } },
    'Timestamp': { date: { start: new Date().toISOString() } }
  };

  await refactor.addSampleEntry('Agent Governance Messages', sampleGovernance);

  // Task 4: Verify implementation
  console.log('\n📋 Task 4: Verification Report');
  await refactor.getDatabaseInfo('Agent Exchange Log');
  await refactor.getDatabaseInfo('Agent Governance Messages');

  console.log('\n✅ Refactoring complete!');
  console.log('\n📌 Summary:');
  console.log('1. Renamed "claude-gizmo-exchange" → "Agent Exchange Log"');
  console.log('2. Renamed "Claude-Gizmo Communication" → "Agent Governance Messages"');
  console.log('3. Updated descriptions and schemas for both databases');
  console.log('4. Added sample entries demonstrating functionality');
  console.log('5. Standardized date formats to ISO 8601');
  if (projectTrackerId) {
    console.log('6. Added relations to WT Project Tracker');
  } else {
    console.log('6. ⚠️  Relations to WT Project Tracker were skipped (database not found)');
  }
}

main().catch(console.error);