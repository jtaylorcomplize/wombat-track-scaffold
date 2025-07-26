#!/usr/bin/env npx tsx

import dotenv from 'dotenv';
import { syncGovernanceLogToNotion } from '../src/utils/syncGovernanceLogToNotion.ts';
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
  systemComponent: 'notion-sync',
  rollbackInfo: {
    canRollback: true,
    rollbackSteps: ['remove-notion-entry', 'revert-sync-status'],
    rollbackWindowMinutes: 60
  }
};

async function testGovernanceSync() {
  console.log('🧪 Testing GovernanceLog sync to Notion\n');
  
  // Use the Decision_Log_CodexRoama database which seems most appropriate
  const databaseId = '1f0e1901-e36e-8052-b448-f2691cfca791'; // Decision_Log_CodexRoama
  
  console.log('📝 Test governance event:');
  console.log(JSON.stringify(testGovernanceEvent, null, 2));
  
  console.log(`\n🎯 Target database: Decision_Log_CodexRoama`);
  console.log(`📊 Database ID: ${databaseId}`);
  
  console.log('\n🚀 Syncing to Notion...');
  
  try {
    const result = await syncGovernanceLogToNotion(testGovernanceEvent, {
      databaseId: databaseId,
      token: process.env.NOTION_TOKEN
    });
    
    if (result.success) {
      console.log('✅ GovernanceLog sync complete!');
      console.log(`📄 Page ID: ${result.pageId}`);
      console.log(`🔗 URL: ${result.url}`);
      console.log('\n🎉 Entry successfully pushed to Notion');
      console.log('👀 Check the Decision_Log_CodexRoama database to verify the entry');
    } else {
      console.log('❌ Sync failed:', result.error);
      console.log('\n🔍 Possible issues:');
      console.log('  • Database properties may not match expected schema');
      console.log('  • Integration may not have write permissions');
      console.log('  • Database ID may be incorrect');
    }
  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

// Alternative test with Projects database
async function testWithProjectsDatabase() {
  console.log('\n🔄 Testing with Projects database as fallback...');
  
  const projectsDbId = '0a87ca43-fdad-4caa-9412-35d3265eccc7'; // Projects database
  
  try {
    const result = await syncGovernanceLogToNotion(testGovernanceEvent, {
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
  
  await testGovernanceSync();
  
  // If primary test fails, try with Projects database
  console.log('\n' + '='.repeat(50));
  await testWithProjectsDatabase();
  
  console.log('\n📋 Test complete. Check Notion to verify entries were created.');
}

main().catch(console.error);