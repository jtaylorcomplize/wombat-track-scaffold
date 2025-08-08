#!/usr/bin/env tsx

/**
 * Test script to verify governance log → project auto-creation
 * Directly tests the GovernanceProjectHooks integration
 */

import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { GovernanceProjectHooks } from '../src/services/governanceProjectHooks';

const DB_PATH = path.join(process.cwd(), 'databases', 'production.db');

async function testGovernanceToProjectCreation() {
  console.log('🧪 Testing Governance Log → Project Auto-Creation');
  console.log('='.repeat(50));

  // Create test governance log entry
  const testProjectId = 'TEST-AUTO-' + Date.now();
  const testLogEntry = {
    projectId: testProjectId,
    project_id: testProjectId,
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
    const db = await open({
      filename: DB_PATH,
      driver: sqlite3.Database
    });
    
    const beforeCount = await db.get('SELECT COUNT(*) as count FROM projects WHERE projectId = ?', [testProjectId]);
    console.log(`📊 Projects with ID ${testProjectId} before test: ${beforeCount?.count || 0} (should be 0)`);

    // Test with governance hooks
    console.log('\n🔄 Testing governance hooks...');
    
    const hooks = GovernanceProjectHooks.getInstance();
    
    // Ensure schema is ready
    await hooks.ensureDatabaseSchema();
    
    // Process the governance entry
    const success = await hooks.processGovernanceEntry(testLogEntry);
    console.log(`✅ Governance processing result: ${success}`);

    // Check database after
    const project = await db.get(
      'SELECT projectId, projectName, owner, status, keyTasks, aiPromptLog FROM projects WHERE projectId = ?', 
      [testProjectId]
    );

    if (project) {
      console.log('\n🎉 SUCCESS: Project auto-created!');
      console.log('📋 Project Details:');
      console.log(`   - ID: ${project.projectId}`);
      console.log(`   - Name: ${project.projectName}`);
      console.log(`   - Owner: ${project.owner}`);
      console.log(`   - Status: ${project.status}`);
      console.log(`   - Key Tasks: ${project.keyTasks}`);
      console.log(`   - AI Prompt Log: ${project.aiPromptLog ? 'Present' : 'Missing'}`);
      
      // Parse and display JSON fields
      try {
        if (project.keyTasks) {
          const keyTasks = JSON.parse(project.keyTasks);
          console.log(`   - Parsed Key Tasks:`, keyTasks);
        }
        if (project.aiPromptLog) {
          const aiLog = JSON.parse(project.aiPromptLog);
          console.log(`   - AI Log Entries: ${aiLog.length}`);
          console.log(`   - Latest Entry:`, aiLog[aiLog.length - 1]);
        }
      } catch (e) {
        console.log(`   - JSON parsing error: ${e.message}`);
      }
    } else {
      console.log('❌ FAILURE: Project was not created');
      throw new Error('Project auto-creation failed');
    }

    await db.close();
    
    return { success: true, projectId: testProjectId };
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// Run the test
testGovernanceToProjectCreation()
  .then((result) => {
    console.log('\n✅ Test completed successfully');
    console.log(`🚀 Created project: ${result.projectId}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });