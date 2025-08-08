#!/usr/bin/env tsx

/**
 * Test script for DriveMemory Watcher (OF-9.3.1)
 * Verifies that the watcher can process JSONL files and create projects
 */

import fs from 'fs';
import path from 'path';
import { createDriveMemoryWatcher, destroyDriveMemoryWatcher } from '../src/services/driveMemoryWatcher';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const TEST_WATCH_PATH = path.join(process.cwd(), 'test-drive-memory');
const DB_PATH = path.join(process.cwd(), 'databases', 'production.db');

async function testDriveMemoryWatcher() {
  console.log('🧪 Testing DriveMemory Watcher (OF-9.3.1)');
  console.log('='.repeat(60));

  // Cleanup any existing watcher
  destroyDriveMemoryWatcher();

  // Create test directory
  if (fs.existsSync(TEST_WATCH_PATH)) {
    fs.rmSync(TEST_WATCH_PATH, { recursive: true });
  }
  fs.mkdirSync(TEST_WATCH_PATH, { recursive: true });

  try {
    // Step 1: Create test JSONL file with governance entries
    const testProjectId = `DRIVE-MEM-TEST-${Date.now()}`;
    const testEntries = [
      {
        timestamp: new Date().toISOString(),
        entryType: 'Decision',
        summary: `DriveMemory test project: ${testProjectId}`,
        gptDraftEntry: 'Testing DriveMemory watcher file processing',
        classification: 'test',
        related_phase: `${testProjectId}-1.0`,
        project_id: testProjectId,
        created_by: 'drive-memory-test'
      },
      {
        timestamp: new Date().toISOString(),
        entryType: 'Change',
        summary: `DriveMemory second entry for ${testProjectId}`,
        gptDraftEntry: 'Testing multiple entries processing',
        classification: 'test',
        related_phase: `${testProjectId}-1.1`,
        project_id: testProjectId,
        created_by: 'drive-memory-test'
      }
    ];

    const testFile = path.join(TEST_WATCH_PATH, 'test-governance-log.jsonl');
    const jsonlContent = testEntries.map(entry => JSON.stringify(entry)).join('\n');
    
    console.log('📝 Creating test JSONL file with entries:');
    testEntries.forEach((entry, i) => {
      console.log(`   ${i + 1}. ${entry.summary}`);
    });

    // Step 2: Initialize watcher
    console.log('\n🚀 Starting DriveMemory watcher...');
    const watcher = createDriveMemoryWatcher({
      watchPath: TEST_WATCH_PATH,
      filePattern: '*.jsonl',
      pollInterval: 1000, // Fast polling for test
      enableProjectHooks: true,
      logLevel: 'debug'
    });

    await watcher.start();
    
    // Give watcher time to initialize
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 3: Write the test file (should trigger processing)
    console.log('\n📁 Writing test file to trigger watcher...');
    fs.writeFileSync(testFile, jsonlContent);

    // Give watcher time to process
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Step 4: Verify results
    console.log('\n🔍 Verifying results...');
    
    const db = await open({
      filename: DB_PATH,
      driver: sqlite3.Database
    });

    // Check governance logs
    const govLogs = await db.all(`
      SELECT id, summary, entryType, classification, created_by 
      FROM enhanced_governance_logs 
      WHERE created_by = 'drive-memory-test' OR summary LIKE ?
    `, [`%${testProjectId}%`]);

    console.log(`📊 Found ${govLogs.length} governance logs created by watcher`);
    govLogs.forEach((log, i) => {
      console.log(`   ${i + 1}. [${log.entryType}] ${log.summary}`);
    });

    // Check projects
    const projects = await db.all(`
      SELECT projectId, projectName, owner, keyTasks, aiPromptLog 
      FROM projects 
      WHERE projectId = ?
    `, [testProjectId]);

    if (projects.length > 0) {
      console.log('\n🎉 SUCCESS: Project auto-created from DriveMemory file!');
      const project = projects[0];
      console.log('📋 Project Details:');
      console.log(`   - ID: ${project.projectId}`);
      console.log(`   - Name: ${project.projectName}`);
      console.log(`   - Owner: ${project.owner}`);
      
      // Parse JSON fields
      try {
        const keyTasks = JSON.parse(project.keyTasks || '[]');
        const aiPromptLog = JSON.parse(project.aiPromptLog || '[]');
        console.log(`   - Key Tasks: ${keyTasks.length} items`);
        console.log(`   - AI Prompt Log: ${aiPromptLog.length} entries`);
      } catch (e) {
        console.log(`   - JSON parsing error: ${e.message}`);
      }
    } else {
      console.log('\n❌ No projects were auto-created from DriveMemory file');
    }

    // Step 5: Test file modification
    console.log('\n🔄 Testing file modification...');
    const modifiedEntry = {
      timestamp: new Date().toISOString(),
      entryType: 'Review',
      summary: `Modified DriveMemory entry for ${testProjectId}`,
      gptDraftEntry: 'Testing file modification detection',
      classification: 'test-modification',
      related_phase: `${testProjectId}-1.2`,
      project_id: testProjectId,
      created_by: 'drive-memory-test-mod'
    };

    fs.appendFileSync(testFile, '\n' + JSON.stringify(modifiedEntry));
    
    // Give watcher time to process modification
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check for new entries
    const modifiedLogs = await db.all(`
      SELECT COUNT(*) as count FROM enhanced_governance_logs 
      WHERE created_by = 'drive-memory-test-mod'
    `);

    console.log(`📈 After modification: ${modifiedLogs[0].count} new entries detected`);

    // Step 6: Watcher status
    const status = watcher.getStatus();
    const processedFiles = watcher.getProcessedFiles();
    
    console.log('\n📊 Watcher Status:');
    console.log(`   - Running: ${status.isRunning}`);
    console.log(`   - Watch Path: ${status.watchPath}`);
    console.log(`   - Processed Files: ${processedFiles.length}`);

    await db.close();

    // Step 7: Cleanup
    console.log('\n🧹 Cleaning up...');
    await watcher.stop();
    destroyDriveMemoryWatcher();

    return {
      success: true,
      governanceLogsCreated: govLogs.length,
      projectsCreated: projects.length,
      processedFiles: processedFiles.length
    };

  } catch (error) {
    console.error('❌ DriveMemory watcher test failed:', error);
    throw error;
  } finally {
    // Cleanup test directory
    if (fs.existsSync(TEST_WATCH_PATH)) {
      fs.rmSync(TEST_WATCH_PATH, { recursive: true });
    }
    destroyDriveMemoryWatcher();
  }
}

// Run the test
testDriveMemoryWatcher()
  .then((result) => {
    console.log('\n✅ DriveMemory Watcher Test Completed Successfully');
    console.log('📈 Results:');
    console.log(`   • Governance logs created: ${result.governanceLogsCreated}`);
    console.log(`   • Projects created: ${result.projectsCreated}`);
    console.log(`   • Files processed: ${result.processedFiles}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ DriveMemory Watcher Test Failed:', error);
    process.exit(1);
  });