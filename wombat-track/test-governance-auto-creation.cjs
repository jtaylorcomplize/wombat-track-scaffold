#!/usr/bin/env node

/**
 * Test script to verify governance log → project auto-creation
 * Directly tests the GovernanceProjectHooks integration
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(process.cwd(), 'databases', 'production.db');

async function testGovernanceToProjectCreation() {
  console.log('🧪 Testing Governance Log → Project Auto-Creation');
  console.log('='.repeat(50));

  // Create test governance log entry
  const testLogEntry = {
    projectId: 'TEST-AUTO-' + Date.now(),
    project_id: 'TEST-AUTO-' + Date.now(),
    phaseId: 'TEST-1.0',
    stepId: 'TEST-1.0.1',
    summary: 'Test auto-creation of project from governance log',
    description: 'Testing the automatic project registration workflow',
    actor: 'test-user',
    status: 'Active',
    objectiveOrDescription: 'Verify governance log triggers project creation automatically',
    memoryAnchor: 'test-anchor-123'
  };

  console.log('📝 Test Log Entry:', JSON.stringify(testLogEntry, null, 2));

  try {
    // Check database before
    const db = new sqlite3.Database(DB_PATH);
    
    await new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM projects WHERE projectId = ?', 
        [testLogEntry.projectId], 
        (err, row) => {
          if (err) reject(err);
          else {
            console.log(`📊 Projects before test: ${row.count} (should be 0)`);
            resolve(row);
          }
        }
      );
    });

    // Test with governance service (simplified simulation)
    console.log('\n🔄 Simulating governance log creation...');
    
    // Import the governance service
    const { GovernanceProjectHooks } = require('./src/services/governanceProjectHooks.ts');
    const hooks = GovernanceProjectHooks.getInstance();
    
    // Ensure schema is ready
    await hooks.ensureDatabaseSchema();
    
    // Process the governance entry
    const success = await hooks.processGovernanceEntry(testLogEntry);
    console.log(`✅ Governance processing result: ${success}`);

    // Check database after
    await new Promise((resolve, reject) => {
      db.get('SELECT projectId, projectName, owner, status, keyTasks, aiPromptLog FROM projects WHERE projectId = ?', 
        [testLogEntry.projectId], 
        (err, row) => {
          if (err) reject(err);
          else {
            if (row) {
              console.log('\n🎉 SUCCESS: Project auto-created!');
              console.log('📋 Project Details:');
              console.log(`   - ID: ${row.projectId}`);
              console.log(`   - Name: ${row.projectName}`);
              console.log(`   - Owner: ${row.owner}`);
              console.log(`   - Status: ${row.status}`);
              console.log(`   - Key Tasks: ${row.keyTasks}`);
              console.log(`   - AI Prompt Log: ${row.aiPromptLog ? 'Present' : 'Missing'}`);
            } else {
              console.log('❌ FAILURE: Project was not created');
            }
            resolve(row);
          }
        }
      );
    });

    db.close();
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testGovernanceToProjectCreation()
  .then(() => {
    console.log('\n✅ Test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });