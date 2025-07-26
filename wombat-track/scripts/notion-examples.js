#!/usr/bin/env node

/**
 * Notion Sync Utilities - Example Usage
 * 
 * This script demonstrates how to use the Notion sync utilities
 * Run with: node scripts/notion-examples.js [command]
 * 
 * Commands:
 *   test-connection  - Test Notion API connection and list databases
 *   sync-log         - Sync a sample governance log entry
 *   sync-file        - Sync entire governance log file
 */

import dotenv from 'dotenv';
import { testNotionConnection, validateDatabaseAccess } from '../src/utils/testNotionConnection.ts';
import { syncGovernanceLogToNotion, syncGovernanceLogFileToNotion } from '../src/utils/syncGovernanceLogToNotion.ts';

// Load environment variables
dotenv.config();

const SAMPLE_GOVERNANCE_EVENT = {
  id: `example-${Date.now()}`,
  phaseStepId: 'phase-1-step-2',
  newStatus: 'completed',
  triggeredBy: 'Claude Code Example',
  eventType: 'StepStatusUpdated',
  timestamp: new Date().toISOString(),
  linkedProject: 'wombat-track',
  linkedPhase: 'WT-6.0',
  severity: 'medium',
  agentId: 'claude-code',
  systemComponent: 'governance-logger',
  details: {
    message: 'Example governance event created by notion-examples.js',
    previousStatus: 'in_progress',
    executionTime: '2.3s'
  },
  rollbackInfo: {
    canRollback: true,
    rollbackSteps: ['revert-status', 'notify-stakeholders'],
    rollbackWindowMinutes: 30
  }
};

async function testConnection() {
  console.log('🧪 Testing Notion connection...\n');
  
  const result = await testNotionConnection();
  
  if (result.success) {
    console.log('\n✅ Connection test successful!');
    console.log(`📊 Found ${result.accessibleDatabases?.length || 0} accessible databases\n`);
    
    // Test database access if NOTION_GOVERNANCE_DB_ID is set
    const governanceDbId = process.env.NOTION_GOVERNANCE_DB_ID;
    if (governanceDbId) {
      console.log('🔍 Testing governance database access...');
      const dbTest = await validateDatabaseAccess(governanceDbId);
      if (dbTest.canAccess) {
        console.log('✅ Governance database is accessible');
      } else {
        console.log('❌ Governance database access failed:', dbTest.error);
      }
    } else {
      console.log('ℹ️  Set NOTION_GOVERNANCE_DB_ID to test specific database access');
    }
  } else {
    console.log('\n❌ Connection test failed:', result.error);
  }
}

async function syncSampleLog() {
  console.log('📝 Syncing sample governance log entry...\n');
  
  const databaseId = process.env.NOTION_GOVERNANCE_DB_ID;
  if (!databaseId) {
    console.error('❌ NOTION_GOVERNANCE_DB_ID environment variable is required');
    console.log('💡 Add your governance database ID to .env file');
    return;
  }
  
  console.log('Sample event:', JSON.stringify(SAMPLE_GOVERNANCE_EVENT, null, 2));
  console.log('\n🚀 Syncing to Notion...');
  
  const result = await syncGovernanceLogToNotion(SAMPLE_GOVERNANCE_EVENT, {
    databaseId: databaseId
  });
  
  if (result.success) {
    console.log('✅ Successfully synced to Notion!');
    console.log(`📄 Page ID: ${result.pageId}`);
    console.log(`🔗 URL: ${result.url}`);
  } else {
    console.log('❌ Sync failed:', result.error);
  }
}

async function syncLogFile() {
  console.log('📂 Syncing governance log file...\n');
  
  const databaseId = process.env.NOTION_GOVERNANCE_DB_ID;
  if (!databaseId) {
    console.error('❌ NOTION_GOVERNANCE_DB_ID environment variable is required');
    return;
  }
  
  const logFilePath = './logs/governance.jsonl';
  console.log(`📖 Reading from: ${logFilePath}`);
  
  const results = await syncGovernanceLogFileToNotion(logFilePath, {
    databaseId: databaseId
  });
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`\n📊 Sync complete:`);
  console.log(`  ✅ Successful: ${successful}`);
  console.log(`  ❌ Failed: ${failed}`);
  
  if (failed > 0) {
    console.log('\n🔍 Failed entries:');
    results.filter(r => !r.success).forEach((result, index) => {
      console.log(`  ${index + 1}. ${result.error}`);
    });
  }
}

function printUsage() {
  console.log(`
🧠 Notion Sync Utilities - Example Usage

Commands:
  test-connection  - Test Notion API connection and list databases
  sync-log         - Sync a sample governance log entry
  sync-file        - Sync entire governance log file

Environment Variables Required:
  NOTION_TOKEN              - Your Notion integration token
  NOTION_GOVERNANCE_DB_ID   - Database ID for governance logs (for sync commands)

Examples:
  node scripts/notion-examples.js test-connection
  node scripts/notion-examples.js sync-log
  node scripts/notion-examples.js sync-file

Setup:
  1. Copy .env.example to .env
  2. Add your NOTION_TOKEN from https://www.notion.so/my-integrations
  3. Add your NOTION_GOVERNANCE_DB_ID (get from database URL)
  4. Share your databases with the integration
`);
}

// Main execution
const command = process.argv[2];

switch (command) {
  case 'test-connection':
    await testConnection();
    break;
  case 'sync-log':
    await syncSampleLog();
    break;
  case 'sync-file':
    await syncLogFile();
    break;
  default:
    printUsage();
    break;
}