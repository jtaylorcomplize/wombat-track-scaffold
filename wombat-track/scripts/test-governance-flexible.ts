#!/usr/bin/env npx tsx

import dotenv from 'dotenv';
import { createGovernanceEntryFromEvent, NotionGovernanceHelper } from '../src/utils/createNotionGovernanceEntry.ts';
import type { GovernanceEvent } from '../src/types/governance.ts';

// Load environment variables
dotenv.config();

// Test governance log entry as specified in the prompt
const testGovernanceEvent: GovernanceEvent = {
  id: `governance-test-${Date.now()}`,
  phaseStepId: '3.2',
  newStatus: 'completed',
  triggeredBy: 'Claude',
  eventType: 'AgentAction',
  timestamp: new Date().toISOString(),
  details: {
    eventType: 'Decision',
    linkedProject: 'Wombat Track',
    linkedPhase: 'Phase 3',
    stepReference: '3.2 – Notion Integration',
    prompt: 'Connect Notion to WT GovernanceLog pipeline',
    response: '✅ Confirmed: Gizmo can write to Notion. Claude should now verify write ops.',
    author: 'Claude',
    memoryTags: ['notion-sync', 'phase-3']
  },
  linkedProject: 'Wombat Track',
  linkedPhase: 'Phase 3',
  severity: 'medium',
  agentId: 'claude-code',
  systemComponent: 'notion-sync'
};

async function testFlexibleGovernanceSync() {
  console.log('🧪 Testing Flexible GovernanceLog sync to Notion\n');
  
  // Try with Decision_Log_CodexRoama first
  const databaseId = '1f0e1901-e36e-8052-b448-f2691cfca791';
  
  console.log('📝 Test governance event:');
  console.log(`Event Type: ${testGovernanceEvent.eventType}`);
  console.log(`Project: ${testGovernanceEvent.linkedProject}`);
  console.log(`Phase: ${testGovernanceEvent.linkedPhase}`);
  console.log(`Triggered by: ${testGovernanceEvent.triggeredBy}`);
  
  console.log(`\n🎯 Target database: Decision_Log_CodexRoama`);
  console.log(`📊 Database ID: ${databaseId}`);
  
  try {
    console.log('\n🔍 Checking database schema...');
    const helper = new NotionGovernanceHelper({
      databaseId: databaseId,
      token: process.env.NOTION_TOKEN
    });
    
    // Get a sample to understand the structure
    const schema = await helper.getDatabaseSchema();
    console.log(`📋 Database has ${schema.results.length} existing entries`);
    
    console.log('\n🚀 Creating governance entry...');
    const result = await createGovernanceEntryFromEvent(testGovernanceEvent, {
      databaseId: databaseId,
      token: process.env.NOTION_TOKEN
    });
    
    if (result.success) {
      console.log('✅ GovernanceLog sync complete!');
      console.log(`📄 Page ID: ${result.pageId}`);
      console.log(`🔗 URL: ${result.url}`);
      console.log('\n🎉 Entry successfully pushed to Decision_Log_CodexRoama');
    } else {
      console.log('❌ Sync failed:', result.error);
      
      // Try with a simpler database structure
      await trySimpleEntry(databaseId);
    }
  } catch (error) {
    console.error('💥 Unexpected error:', error);
    
    // Try with Projects database as fallback
    await tryProjectsDatabase();
  }
}

async function trySimpleEntry(databaseId: string) {
  console.log('\n🔄 Trying with simplified entry structure...');
  
  try {
    const helper = new NotionGovernanceHelper({
      databaseId: databaseId,
      token: process.env.NOTION_TOKEN
    });
    
    const simpleEntry = {
      title: 'Wombat Track - Notion Integration Test',
      content: 'Claude successfully tested Notion sync capabilities. Integration is working.',
      project: 'Wombat Track',
      phase: 'Phase 3',
      status: 'completed',
      author: 'Claude',
      timestamp: new Date().toISOString(),
      tags: ['notion-sync', 'test']
    };
    
    const result = await helper.createGovernanceEntry(simpleEntry);
    
    if (result.success) {
      console.log('✅ Simple entry creation successful!');
      console.log(`🔗 URL: ${result.url}`);
    } else {
      console.log('❌ Simple entry failed:', result.error);
    }
  } catch (error) {
    console.error('💥 Simple entry error:', error);
  }
}

async function tryProjectsDatabase() {
  console.log('\n🔄 Testing with Projects database as fallback...');
  
  const projectsDbId = '0a87ca43-fdad-4caa-9412-35d3265eccc7';
  
  try {
    const result = await createGovernanceEntryFromEvent(testGovernanceEvent, {
      databaseId: projectsDbId,
      token: process.env.NOTION_TOKEN
    });
    
    if (result.success) {
      console.log('✅ Projects database sync successful!');
      console.log(`🔗 URL: ${result.url}`);
    } else {
      console.log('❌ Projects database sync failed:', result.error);
    }
  } catch (error) {
    console.error('💥 Projects database error:', error);
  }
}

// Main execution
async function main() {
  if (!process.env.NOTION_TOKEN) {
    console.error('❌ NOTION_TOKEN not found in environment variables');
    console.log('💡 Make sure your .env file contains a valid NOTION_TOKEN');
    process.exit(1);
  }
  
  await testFlexibleGovernanceSync();
  
  console.log('\n📋 Test complete. Check Notion to verify entries were created.');
  console.log('🎯 Next steps: Create database with proper governance schema if needed');
}

main().catch(console.error);