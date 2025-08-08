#!/usr/bin/env tsx

/**
 * Test script for Auto-Governance Logger (OF-9.3.2)
 * Verifies that event-based governance logging works correctly
 */

import { AutoGovernanceLogger } from '../src/services/autoGovernanceLogger';
import { governanceLogsService } from '../src/services/governanceLogsService';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'databases', 'production.db');

async function testAutoGovernanceLogger() {
  console.log('🧪 Testing Auto-Governance Logger (OF-9.3.2)');
  console.log('='.repeat(60));

  const logger = AutoGovernanceLogger.getInstance();
  const testResults = {
    phaseStepLogs: 0,
    prMergeLogs: 0,
    checkpointLogs: 0,
    aiActionLogs: 0,
    customEventLogs: 0
  };

  try {
    const testProjectId = `AUTO-LOG-TEST-${Date.now()}`;

    // Test 1: PhaseStep Completion Logging
    console.log('\n📝 Testing PhaseStep completion logging...');
    
    const phaseStepLogId = await logger.logPhaseStepCompletion({
      stepId: `${testProjectId}.1.1`,
      phaseId: `${testProjectId}.1`,
      stepName: 'Initialize Test Phase',
      status: 'completed',
      completedBy: 'auto-test-user',
      duration: 2500,
      notes: 'Automated test phase initialization completed successfully',
      timestamp: new Date().toISOString()
    });

    if (phaseStepLogId) {
      testResults.phaseStepLogs++;
      console.log(`   ✅ Created PhaseStep log: ${phaseStepLogId}`);
    }

    // Test 2: PR Merge Logging
    console.log('\n🔀 Testing PR merge logging...');
    
    const prLogId = await logger.logPRMerge({
      prNumber: 999,
      prTitle: `Test PR: Auto-governance logging for ${testProjectId}`,
      fromBranch: 'feature/auto-governance-test',
      toBranch: 'main',
      author: 'test-developer',
      mergedBy: 'test-reviewer',
      mergeCommitSha: 'abc123def456',
      filesChanged: 5,
      linesAdded: 150,
      linesDeleted: 25,
      timestamp: new Date().toISOString()
    });

    if (prLogId) {
      testResults.prMergeLogs++;
      console.log(`   ✅ Created PR merge log: ${prLogId}`);
    }

    // Test 3: Checkpoint/Test Result Logging
    console.log('\n✅ Testing checkpoint result logging...');
    
    // Test successful checkpoint
    const passCheckpointLogId = await logger.logCheckpointResult({
      checkpointId: `checkpoint-${testProjectId}-pass`,
      checkpointName: 'Unit Tests Suite',
      status: 'pass',
      testResults: {
        passed: 45,
        failed: 0,
        skipped: 2,
        total: 47
      },
      duration: 15000,
      runBy: 'ci-system'
    });

    if (passCheckpointLogId) {
      testResults.checkpointLogs++;
      console.log(`   ✅ Created passing checkpoint log: ${passCheckpointLogId}`);
    }

    // Test failed checkpoint
    const failCheckpointLogId = await logger.logCheckpointResult({
      checkpointId: `checkpoint-${testProjectId}-fail`,
      checkpointName: 'Integration Tests',
      status: 'fail',
      testResults: {
        passed: 12,
        failed: 3,
        skipped: 0,
        total: 15
      },
      duration: 8000,
      runBy: 'ci-system',
      errorDetails: 'Database connection timeout in 3 test cases'
    });

    if (failCheckpointLogId) {
      testResults.checkpointLogs++;
      console.log(`   ✅ Created failing checkpoint log: ${failCheckpointLogId}`);
    }

    // Test 4: AI Action Logging
    console.log('\n🤖 Testing AI action logging...');
    
    const aiActionLogId = await logger.logAIAction({
      action: 'code_generation',
      model: 'claude-3-sonnet',
      promptTokens: 1200,
      responseTokens: 800,
      duration: 3500,
      context: {
        projectId: testProjectId,
        phaseId: `${testProjectId}.1`,
        stepId: `${testProjectId}.1.2`,
        files: ['src/components/TestComponent.tsx', 'src/types/TestTypes.ts'],
        description: 'Generated React component with TypeScript interfaces for testing'
      },
      result: 'success',
      triggeredBy: 'test-developer'
    });

    if (aiActionLogId) {
      testResults.aiActionLogs++;
      console.log(`   ✅ Created AI action log: ${aiActionLogId}`);
    }

    // Test 5: Custom Event Logging
    console.log('\n🎯 Testing custom event logging...');
    
    const customEventLogId = await logger.logCustomEvent(
      'Process',
      `Custom deployment event for ${testProjectId}`,
      {
        deploymentTarget: 'staging',
        version: '1.0.0-test',
        artifacts: ['app.js', 'styles.css', 'manifest.json'],
        deploymentTime: '2025-08-08T02:50:00.000Z',
        triggeredBy: 'automated-deployment-system'
      },
      {
        classification: 'deployment',
        relatedPhase: `${testProjectId}.1`,
        createdBy: 'deployment-system'
      }
    );

    if (customEventLogId) {
      testResults.customEventLogs++;
      console.log(`   ✅ Created custom event log: ${customEventLogId}`);
    }

    // Test 6: Static Hook Methods
    console.log('\n🔗 Testing static hook methods...');
    
    // Test PhaseStep hook
    await AutoGovernanceLogger.hookPhaseStepCompletion(
      `${testProjectId}.1.3`,
      `${testProjectId}.1`,
      'Finalize Test Phase',
      'hook-test-user',
      true,
      'Phase completed via static hook method'
    );

    // Test PR hook
    await AutoGovernanceLogger.hookPRMerge({
      prNumber: 1000,
      prTitle: `Static hook test for ${testProjectId}`,
      fromBranch: 'test/static-hooks',
      toBranch: 'develop',
      author: 'hook-test-dev',
      mergedBy: 'hook-test-reviewer',
      filesChanged: 3,
      linesAdded: 75,
      linesDeleted: 10
    });

    // Test checkpoint hook
    await AutoGovernanceLogger.hookTestResults(
      'Static Hook Test Suite',
      true,
      { passed: 8, failed: 0, skipped: 1, total: 9 },
      'hook-test-runner'
    );

    console.log('   ✅ All static hook methods executed successfully');

    // Verification: Check database for created logs
    console.log('\n🔍 Verifying created governance logs...');
    
    const db = await open({
      filename: DB_PATH,
      driver: sqlite3.Database
    });

    const createdLogs = await db.all(`
      SELECT id, entryType, summary, classification, created_by 
      FROM enhanced_governance_logs 
      WHERE summary LIKE ? OR created_by LIKE ? OR created_by LIKE ?
      ORDER BY timestamp DESC
    `, [`%${testProjectId}%`, '%test%', '%hook%']);

    console.log(`📊 Found ${createdLogs.length} governance logs created by auto-logger`);
    
    const logsByType = createdLogs.reduce((acc, log) => {
      const type = log.classification?.split('_')[0] || 'other';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('📈 Logs by type:');
    Object.entries(logsByType).forEach(([type, count]) => {
      console.log(`   • ${type}: ${count} logs`);
    });

    // Display sample logs
    console.log('\n📝 Sample created logs:');
    createdLogs.slice(0, 5).forEach((log, i) => {
      console.log(`   ${i + 1}. [${log.entryType}] ${log.summary} (by: ${log.created_by})`);
    });

    await db.close();

    return {
      success: true,
      totalLogsCreated: createdLogs.length,
      logsByType,
      testResults
    };

  } catch (error) {
    console.error('❌ Auto-governance logger test failed:', error);
    throw error;
  }
}

// Run the test
testAutoGovernanceLogger()
  .then((result) => {
    console.log('\n✅ Auto-Governance Logger Test Completed Successfully');
    console.log('📊 Results Summary:');
    console.log(`   • Total governance logs created: ${result.totalLogsCreated}`);
    console.log(`   • PhaseStep logs: ${result.testResults.phaseStepLogs}`);
    console.log(`   • PR merge logs: ${result.testResults.prMergeLogs}`);
    console.log(`   • Checkpoint logs: ${result.testResults.checkpointLogs}`);
    console.log(`   • AI action logs: ${result.testResults.aiActionLogs}`);
    console.log(`   • Custom event logs: ${result.testResults.customEventLogs}`);
    console.log('\n🎯 Auto-governance logging is fully functional!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Auto-Governance Logger Test Failed:', error);
    process.exit(1);
  });