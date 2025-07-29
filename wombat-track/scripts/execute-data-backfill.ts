#!/usr/bin/env tsx

/**
 * WT-8.0.4: Data Backfill Execution
 * 
 * Systematically applies backfill patches to canonical Notion databases
 * based on the reconciliation analysis and task tracker.
 */

import { createNotionClient } from '../src/utils/notionClient';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface BackfillTask {
  taskId: string;
  databaseName: string;
  recordId: string;
  fieldName: string;
  issueType: string;
  currentValue: string;
  suggestedValue: string;
  priority: string;
  autoExecutable: boolean;
  manualReviewReason?: string;
}

interface BackfillResult {
  taskId: string;
  success: boolean;
  action: 'updated' | 'created' | 'skipped' | 'manual_review_required';
  details: string;
  error?: string;
}

// Load issues from the reconciliation analysis
function loadReconciliationIssues() {
  try {
    const jsonPath = join(process.cwd(), 'unlinked-artefact-log.json');
    const reportData = JSON.parse(readFileSync(jsonPath, 'utf8'));
    return reportData.issues || [];
  } catch (error) {
    console.error('❌ Could not load reconciliation issues:', error);
    return [];
  }
}

// Determine if a task can be auto-executed or needs manual review
function classifyTask(issue: any): BackfillTask {
  const autoExecutable = determineAutoExecutability(issue);
  
  return {
    taskId: `${issue.databaseName}-${issue.recordId}-${issue.fieldName}`,
    databaseName: issue.databaseName,
    recordId: issue.recordId,
    fieldName: issue.fieldName,
    issueType: issue.issueType,
    currentValue: issue.currentValue,
    suggestedValue: generateSuggestedValue(issue),
    priority: issue.priority,
    autoExecutable,
    manualReviewReason: !autoExecutable ? getManualReviewReason(issue) : undefined
  };
}

function determineAutoExecutability(issue: any): boolean {
  // Auto-executable scenarios
  if (issue.issueType === 'missing_field' && issue.fieldName === 'status') {
    return true; // Can auto-populate with default status
  }
  
  if (issue.issueType === 'missing_field' && issue.fieldName === 'priority') {
    return true; // Can auto-populate with default priority
  }
  
  if (issue.issueType === 'missing_field' && issue.fieldName === 'category') {
    return true; // Can infer category from database type
  }
  
  // Manual review required scenarios
  if (issue.fieldName.includes('Phase') || issue.fieldName.includes('phase')) {
    return false; // Phase IDs need human verification
  }
  
  if (issue.fieldName.includes('PR') || issue.fieldName.includes('linkedPR')) {
    return false; // PR links need verification
  }
  
  if (issue.fieldName.includes('owner') || issue.fieldName.includes('Author')) {
    return false; // Ownership requires human assignment
  }
  
  return true; // Default to auto-executable for simple fields
}

function getManualReviewReason(issue: any): string {
  if (issue.fieldName.includes('Phase') || issue.fieldName.includes('phase')) {
    return 'Legacy phases may have inconsistent tags - requires human verification';
  }
  
  if (issue.fieldName.includes('PR') || issue.fieldName.includes('linkedPR')) {
    return 'PR links applied outside GitHub UI need manual verification';
  }
  
  if (issue.fieldName.includes('owner') || issue.fieldName.includes('Author')) {
    return 'Ownership assignment requires human decision';
  }
  
  if (issue.fieldName.includes('Memory') || issue.fieldName.includes('anchor')) {
    return 'Memory plugin anchors may be mislinked - requires verification';
  }
  
  return 'Complex business logic requires human review';
}

function generateSuggestedValue(issue: any): string {
  const { fieldName, databaseName, issueType } = issue;
  
  // Default status values by database
  if (fieldName === 'status') {
    const statusMappings = {
      'wt-project-tracker': 'Active',
      'wt-tech-debt-register': 'Open',
      'wt-claude-gizmo-comm': 'New',
      'wt-backfill-task-tracker': 'Open'
    };
    return statusMappings[databaseName] || 'Active';
  }
  
  // Default priority values
  if (fieldName === 'priority') {
    return 'Medium';
  }
  
  // Default category by database type
  if (fieldName === 'category') {
    const categoryMappings = {
      'wt-tech-debt-register': 'Lint',
      'wt-claude-gizmo-comm': 'Decision',
      'wt-schema-sync-report': 'Data Quality'
    };
    return categoryMappings[databaseName] || 'General';
  }
  
  // Default author for communication logs
  if (fieldName === 'Author' || fieldName === 'author') {
    return 'System';
  }
  
  // Default assignee
  if (fieldName === 'assignee') {
    return 'Unassigned';
  }
  
  // Default effort estimate
  if (fieldName === 'effortEstimate' || fieldName === 'estimatedEffort') {
    return '<30min';
  }
  
  return 'Auto-generated';
}

async function executeBackfillTask(client: any, task: BackfillTask): Promise<BackfillResult> {
  const { taskId, databaseName, recordId, fieldName, suggestedValue, autoExecutable } = task;
  
  if (!autoExecutable) {
    return {
      taskId,
      success: false,
      action: 'manual_review_required',
      details: `Manual review required: ${task.manualReviewReason}`,
    };
  }
  
  try {
    console.log(`🔧 Executing: ${taskId}`);
    
    // Determine the correct property structure based on field type
    const propertyValue = buildPropertyValue(fieldName, suggestedValue);
    
    // Update the record
    await client.client.pages.update({
      page_id: recordId,
      properties: {
        [fieldName]: propertyValue
      }
    });
    
    return {
      taskId,
      success: true,
      action: 'updated',
      details: `Updated ${fieldName} to "${suggestedValue}"`,
    };
    
  } catch (error) {
    return {
      taskId,
      success: false,
      action: 'skipped',
      details: `Failed to update ${fieldName}`,
      error: error.toString(),
    };
  }
}

function buildPropertyValue(fieldName: string, value: string) {
  // Determine property type based on field name patterns
  if (fieldName === 'status' || fieldName === 'priority' || fieldName === 'category') {
    return { select: { name: value } };
  }
  
  if (fieldName.includes('title') || fieldName === 'projectId') {
    return { title: [{ text: { content: value } }] };
  }
  
  if (fieldName.includes('url') || fieldName.includes('URL')) {
    return { url: value };
  }
  
  if (fieldName.includes('date') || fieldName.includes('time')) {
    return { date: { start: new Date().toISOString().split('T')[0] } };
  }
  
  if (fieldName.includes('checkbox') || fieldName === 'canonicalUse') {
    return { checkbox: value.toLowerCase() === 'true' };
  }
  
  // Default to rich text
  return { rich_text: [{ text: { content: value } }] };
}

async function updateBackfillTracker(client: any, results: BackfillResult[]) {
  const trackerId = '23fe1901-e36e-8182-a7ab-dbf4441d82f0';
  
  try {
    console.log('📊 Updating backfill task tracker...');
    
    // Get current tasks from tracker
    const trackerTasks = await client.queryDatabase({
      database_id: trackerId
    });
    
    for (const trackerTask of trackerTasks.results) {
      const taskTitle = trackerTask.properties.taskTitle?.title?.[0]?.plain_text || '';
      
      // Count completed tasks for this tracker entry
      const relatedResults = results.filter(r => 
        r.taskId.includes(taskTitle.toLowerCase()) || 
        taskTitle.toLowerCase().includes(r.taskId.split('-')[0])
      );
      
      const completedCount = relatedResults.filter(r => r.success).length;
      const totalCount = relatedResults.length;
      
      if (totalCount > 0) {
        const newStatus = completedCount === totalCount ? 'Resolved' : 
                         completedCount > 0 ? 'In Progress' : 'Open';
        
        await client.client.pages.update({
          page_id: trackerTask.id,
          properties: {
            status: { select: { name: newStatus } },
            notes: { 
              rich_text: [{ 
                text: { 
                  content: `Updated: ${completedCount}/${totalCount} tasks completed. Last run: ${new Date().toISOString()}` 
                } 
              }] 
            }
          }
        });
      }
    }
    
    console.log('✅ Backfill tracker updated');
    
  } catch (error) {
    console.error('❌ Error updating backfill tracker:', error);
  }
}

async function executeDataBackfill() {
  const token = process.env.NOTION_TOKEN;
  
  if (!token) {
    console.error('❌ Missing NOTION_TOKEN environment variable');
    process.exit(1);
  }
  
  const client = createNotionClient(token);
  
  console.log('🚀 Starting WT-8.0.4 Data Backfill Execution...\n');
  
  // Load reconciliation issues
  const issues = loadReconciliationIssues();
  console.log(`📋 Loaded ${issues.length} issues for processing`);
  
  // Classify tasks
  const tasks = issues.map(classifyTask);
  const autoTasks = tasks.filter(t => t.autoExecutable);
  const manualTasks = tasks.filter(t => !t.autoExecutable);
  
  console.log(`🤖 Auto-executable tasks: ${autoTasks.length}`);
  console.log(`👥 Manual review required: ${manualTasks.length}\n`);
  
  // Execute auto-executable tasks
  const results: BackfillResult[] = [];
  
  for (const task of autoTasks) {
    const result = await executeBackfillTask(client, task);
    results.push(result);
    
    if (result.success) {
      console.log(`   ✅ ${result.details}`);
    } else {
      console.log(`   ❌ ${result.details}`);
    }
  }
  
  // Process manual review tasks
  for (const task of manualTasks) {
    const result: BackfillResult = {
      taskId: task.taskId,
      success: false,
      action: 'manual_review_required',
      details: task.manualReviewReason || 'Manual review required'
    };
    results.push(result);
    console.log(`   ⚠️  Manual review: ${task.fieldName} in ${task.databaseName}`);
  }
  
  // Update backfill tracker
  await updateBackfillTracker(client, results);
  
  // Generate execution report
  const successCount = results.filter(r => r.success).length;
  const manualCount = results.filter(r => r.action === 'manual_review_required').length;
  const errorCount = results.filter(r => !r.success && r.action !== 'manual_review_required').length;
  
  console.log('\n📊 Execution Summary:');
  console.log(`   ✅ Successfully updated: ${successCount} fields`);
  console.log(`   ⚠️  Manual review required: ${manualCount} items`);
  console.log(`   ❌ Errors: ${errorCount} items`);
  
  // Save execution log
  const executionLog = {
    timestamp: new Date().toISOString(),
    phase: 'WT-8.0.4',
    totalTasks: results.length,
    successCount,
    manualCount,
    errorCount,
    results: results.map(r => ({
      taskId: r.taskId,
      action: r.action,
      success: r.success,
      details: r.details
    }))
  };
  
  const logPath = join(process.cwd(), 'wt-8.0.4-execution-log.json');
  writeFileSync(logPath, JSON.stringify(executionLog, null, 2));
  console.log(`\n📄 Execution log saved: ${logPath}`);
  
  return { results, executionLog };
}

// Export for use in other scripts
export { executeDataBackfill, type BackfillTask, type BackfillResult };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  executeDataBackfill()
    .then(({ results }) => {
      console.log('\n🎯 WT-8.0.4 Data Backfill Execution Complete!');
      console.log('✅ Ready for manual review of flagged items');
      console.log('📊 Check wt-backfill-task-tracker for updated status');
    })
    .catch(console.error);
}