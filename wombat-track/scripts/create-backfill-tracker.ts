#!/usr/bin/env tsx

/**
 * WT-8.0.3: Create Backfill Task Tracker Database
 * 
 * Creates wt-backfill-task-tracker in Notion and populates it with
 * high-priority data reconciliation issues from the analysis.
 */

import { NotionDatabaseCreator } from '../src/utils/notionDatabaseCreator';
import { createNotionClient } from '../src/utils/notionClient';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load the reconciliation issues from the JSON report
function loadReconciliationIssues() {
  try {
    const jsonPath = join(process.cwd(), 'unlinked-artefact-log.json');
    const reportData = JSON.parse(readFileSync(jsonPath, 'utf8'));
    return reportData.issues || [];
  } catch (error) {
    console.log('⚠️  Could not load existing reconciliation issues, creating with sample data');
    return [];
  }
}

// Convert reconciliation issues to backfill tasks
function convertToBackfillTasks(issues: any[]) {
  // Group issues by type and database for better task organization
  const taskGroups = issues.reduce((acc, issue) => {
    const key = `${issue.databaseName}-${issue.issueType}-${issue.priority}`;
    if (!acc[key]) {
      acc[key] = {
        databaseName: issue.databaseName,
        issueType: issue.issueType,
        priority: issue.priority,
        category: issue.category,
        issues: []
      };
    }
    acc[key].issues.push(issue);
    return acc;
  }, {});

  // Convert groups to individual tasks
  const tasks = Object.values(taskGroups).map((group: any) => {
    const sampleIssue = group.issues[0];
    const isMultipleRecords = group.issues.length > 1;
    
    return {
      taskTitle: isMultipleRecords 
        ? `Fix ${group.issues.length} ${group.issueType.replace('_', ' ')} issues in ${group.databaseName}`
        : `${sampleIssue.suggestedFix}`,
      databaseName: group.databaseName,
      issueType: group.issueType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      priority: group.priority,
      category: group.category,
      status: 'Open',
      assignee: 'Gizmo',
      estimatedEffort: group.priority === 'High' ? '1-2 hours' : '<30min',
      recordsAffected: group.issues.length,
      suggestedFix: isMultipleRecords 
        ? `Bulk update ${group.issues.length} records with missing ${sampleIssue.fieldName} fields`
        : sampleIssue.suggestedFix,
      notes: isMultipleRecords 
        ? `Affects ${group.issues.length} records. Sample fields: ${group.issues.slice(0, 3).map(i => i.fieldName).join(', ')}`
        : `Specific issue: ${sampleIssue.currentValue} → needs proper value`,
    };
  });

  // Sort by priority (High first) and affected records count
  return tasks.sort((a, b) => {
    if (a.priority !== b.priority) {
      return a.priority === 'High' ? -1 : 1;
    }
    return b.recordsAffected - a.recordsAffected;
  });
}

async function createBackfillTracker() {
  const token = process.env.NOTION_TOKEN;
  const parentPageId = process.env.NOTION_PARENT_PAGE_ID;

  if (!token || !parentPageId) {
    console.error('❌ Missing required environment variables:');
    console.error('   - NOTION_TOKEN');
    console.error('   - NOTION_PARENT_PAGE_ID');
    process.exit(1);
  }

  console.log('🏗️  Creating wt-backfill-task-tracker database...');

  try {
    // Create the database
    const creator = new NotionDatabaseCreator(token, parentPageId);
    const schema = NotionDatabaseCreator.getBackfillTaskTrackerSchema();
    
    const result = await creator.createDatabase(schema);
    
    if (!result.success) {
      throw new Error(result.error);
    }

    console.log(`✅ Database created successfully!`);
    console.log(`   Database ID: ${result.databaseId}`);
    console.log(`   URL: ${result.url}`);

    // Load and convert reconciliation issues to tasks
    const issues = loadReconciliationIssues();
    const tasks = convertToBackfillTasks(issues);
    
    console.log(`\\n📝 Populating with ${tasks.length} backfill tasks...`);
    
    const client = createNotionClient(token);
    let successCount = 0;
    let errorCount = 0;

    for (const [index, task] of tasks.entries()) {
      try {
        await client.writePage({
          parent: { database_id: result.databaseId! },
          properties: {
            taskTitle: {
              title: [{ text: { content: task.taskTitle } }],
            },
            databaseName: {
              select: { name: task.databaseName },
            },
            issueType: {
              select: { name: task.issueType },
            },
            priority: {
              select: { name: task.priority },
            },
            category: {
              select: { name: task.category },
            },
            status: {
              select: { name: task.status },
            },
            assignee: {
              rich_text: [{ text: { content: task.assignee } }],
            },
            estimatedEffort: {
              select: { name: task.estimatedEffort },
            },
            recordsAffected: {
              number: task.recordsAffected,
            },
            suggestedFix: {
              rich_text: [{ text: { content: task.suggestedFix } }],
            },
            notes: {
              rich_text: [{ text: { content: task.notes } }],
            },
            linkedPhase: {
              rich_text: [{ text: { content: 'WT-8.0.3' } }],
            },
          },
        });

        successCount++;
        console.log(`   ✅ Added: ${task.taskTitle.substring(0, 60)}...`);
      } catch (error) {
        errorCount++;
        console.error(`   ❌ Failed to add: ${task.taskTitle.substring(0, 60)}...`);
        console.error(`      Error: ${error}`);
      }
    }

    console.log(`\\n📊 Summary:`);
    console.log(`   ✅ Successfully added: ${successCount} tasks`);
    if (errorCount > 0) {
      console.log(`   ❌ Failed: ${errorCount} tasks`);
    }
    console.log(`   🔗 Database URL: ${result.url}`);

    // Generate summary statistics
    const priorityStats = tasks.reduce((acc, task) => {
      acc[task.priority] = (acc[task.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const categoryStats = tasks.reduce((acc, task) => {
      acc[task.category] = (acc[task.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log(`\\n🎯 WT-8.0.3 Backfill Task Tracker Ready:`);
    console.log(`   📋 Total Tasks: ${tasks.length}`);
    console.log(`   🔴 High Priority: ${priorityStats.High || 0}`);
    console.log(`   🟡 Medium Priority: ${priorityStats.Medium || 0}`);
    console.log(`   🟢 Low Priority: ${priorityStats.Low || 0}`);
    
    console.log(`\\n   📂 By Category:`);
    Object.entries(categoryStats).forEach(([category, count]) => {
      console.log(`   - ${category}: ${count} tasks`);
    });

    console.log(`\\n📋 Next Actions for Gizmo:`);
    console.log(`   1. Review high-priority tasks in Notion database`);
    console.log(`   2. Assign specific team members to backfill categories`);
    console.log(`   3. Create automated scripts for bulk data updates`);
    console.log(`   4. Establish validation checkpoints`);
    console.log(`   5. Monitor progress and update task status`);

  } catch (error) {
    console.error(`❌ Failed to create backfill task tracker:`, error);
    process.exit(1);
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  createBackfillTracker().catch(console.error);
}

export { createBackfillTracker };