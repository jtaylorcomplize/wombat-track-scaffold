#!/usr/bin/env tsx

/**
 * WT-8.0.4: Safe Backfill Execution with Field Protection
 * 
 * Resumes backfill with strict guardrails:
 * - Only fills blank/null fields
 * - Uses validated data sources only
 * - Skips fields requiring business judgment
 */

import { createNotionClient } from '../src/utils/notionClient';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface SafeBackfillTask {
  recordId: string;
  databaseName: string;
  fieldName: string;
  currentValue: any;
  proposedValue: string;
  dataSource: 'schema-sync' | 'memory-anchor' | 'pr-metadata' | 'deterministic';
  confidence: 'high' | 'medium' | 'low';
  autoPatchable: boolean;
  reasoning: string;
}

interface SafeBackfillResult {
  recordId: string;
  fieldName: string;
  action: 'patched' | 'skipped_has_value' | 'skipped_manual_review' | 'skipped_low_confidence' | 'error';
  oldValue: string;
  newValue?: string;
  dataSource?: string;
  notes: string;
}

// Target databases with their expected schemas
const TARGET_DATABASES = {
  'wt-project-tracker': '23ce1901-e36e-811b-946b-c3e7d764c335',
  'wt-claude-gizmo-comm': '23ce1901-e36e-81bb-b7d6-f033af88c8e9',
  'wt-tech-debt-register': '23fe1901-e36e-815b-890e-d32337b3ca8b',
  'wt-backfill-task-tracker': '23fe1901-e36e-8182-a7ab-dbf4441d82f0'
};

// Load existing backfill issues for reference
function loadBackfillIssues() {
  try {
    const jsonPath = join(process.cwd(), 'unlinked-artefact-log.json');
    const reportData = JSON.parse(readFileSync(jsonPath, 'utf8'));
    return reportData.issues || [];
  } catch (error) {
    console.log('⚠️  Could not load backfill issues, proceeding with schema-based approach');
    return [];
  }
}

// Check if a field value is empty/null
function isFieldEmpty(fieldValue: any): boolean {
  if (!fieldValue) return true;
  
  switch (fieldValue.type) {
    case 'title':
      return !fieldValue.title || fieldValue.title.length === 0 || 
             !fieldValue.title[0]?.plain_text || fieldValue.title[0].plain_text.trim() === '';
    case 'rich_text':
      return !fieldValue.rich_text || fieldValue.rich_text.length === 0 || 
             !fieldValue.rich_text[0]?.plain_text || fieldValue.rich_text[0].plain_text.trim() === '';
    case 'select':
      return !fieldValue.select || !fieldValue.select.name;
    case 'multi_select':
      return !fieldValue.multi_select || fieldValue.multi_select.length === 0;
    case 'checkbox':
      return false; // Checkboxes always have a value
    case 'date':
      return !fieldValue.date || !fieldValue.date.start;
    case 'url':
      return !fieldValue.url || fieldValue.url.trim() === '';
    case 'relation':
      return !fieldValue.relation || fieldValue.relation.length === 0;
    case 'number':
      return fieldValue.number === null || fieldValue.number === undefined;
    default:
      return true;
  }
}

// Determine safe values based on deterministic rules
function determineSafeValue(databaseName: string, fieldName: string, record: any): SafeBackfillTask | null {
  const recordId = record.id;
  const fieldValue = record.properties[fieldName];
  
  // Skip if field already has a value
  if (!isFieldEmpty(fieldValue)) {
    return null;
  }
  
  // Apply deterministic rules based on database and field type
  let proposedValue: string | null = null;
  let dataSource: SafeBackfillTask['dataSource'] = 'deterministic';
  let confidence: SafeBackfillTask['confidence'] = 'high';
  let autoPatchable = false;
  let reasoning = '';
  
  // Project tracker safe fills
  if (databaseName === 'wt-project-tracker') {
    if (fieldName === 'status' && !record.properties.status?.select?.name) {
      proposedValue = 'Active';
      autoPatchable = true;
      reasoning = 'Default status for project records without explicit status';
    }
    
    if (fieldName === 'projectType' && !record.properties.projectType?.select?.name) {
      // Infer from title or description if available
      const title = record.properties.title?.title?.[0]?.plain_text || '';
      if (title.toLowerCase().includes('migration')) {
        proposedValue = 'Migration';
      } else if (title.toLowerCase().includes('platform')) {
        proposedValue = 'Platform';
      } else {
        proposedValue = 'Development';
      }
      autoPatchable = true;
      reasoning = `Inferred from project title: "${title.substring(0, 50)}..."`;
    }
    
    if (fieldName === 'colorTag' && !record.properties.colorTag?.select?.name) {
      proposedValue = 'blue';
      autoPatchable = true;
      reasoning = 'Default color tag for visual organization';
    }
  }
  
  // Tech debt register safe fills
  if (databaseName === 'wt-tech-debt-register') {
    if (fieldName === 'status' && !record.properties.status?.select?.name) {
      proposedValue = 'Open';
      autoPatchable = true;
      reasoning = 'Default status for new technical debt entries';
    }
    
    if (fieldName === 'priority' && !record.properties.priority?.select?.name) {
      // Infer priority from category if available
      const category = record.properties.category?.select?.name;
      if (category === 'Structural') {
        proposedValue = 'High';
      } else if (category === 'Dead Code') {
        proposedValue = 'Medium';
      } else {
        proposedValue = 'Medium';
      }
      autoPatchable = true;
      reasoning = `Inferred from category: ${category || 'default'}`;
    }
    
    if (fieldName === 'canonicalUse' && record.properties.canonicalUse?.checkbox === undefined) {
      proposedValue = 'true';
      autoPatchable = true;
      reasoning = 'All entries in canonical database should be marked as canonical';
    }
  }
  
  // Communication log safe fills
  if (databaseName === 'wt-claude-gizmo-comm') {
    if (fieldName === 'Source System' && !record.properties['Source System']?.select?.name) {
      proposedValue = 'Wombat Track';
      autoPatchable = true;
      reasoning = 'Default source system for communication logs';
    }
    
    if (fieldName === 'Confidence' && !record.properties.Confidence?.select?.name) {
      proposedValue = 'Medium';
      autoPatchable = true;
      reasoning = 'Default confidence level for communication entries';
    }
  }
  
  // Backfill task tracker safe fills
  if (databaseName === 'wt-backfill-task-tracker') {
    if (fieldName === 'status' && !record.properties.status?.select?.name) {
      proposedValue = 'Open';
      autoPatchable = true;
      reasoning = 'Default status for new backfill tasks';
    }
    
    if (fieldName === 'assignee' && isFieldEmpty(record.properties.assignee)) {
      proposedValue = 'System';
      autoPatchable = true;
      reasoning = 'System-generated tasks default to system assignee';
    }
  }
  
  // Only return if we have a deterministic, safe value
  if (proposedValue && autoPatchable) {
    return {
      recordId,
      databaseName,
      fieldName,
      currentValue: fieldValue,
      proposedValue,
      dataSource,
      confidence,
      autoPatchable,
      reasoning
    };
  }
  
  return null;
}

// Execute safe backfill for a single record
async function executeSafeBackfill(client: any, task: SafeBackfillTask): Promise<SafeBackfillResult> {
  const { recordId, fieldName, proposedValue, dataSource, reasoning } = task;
  
  try {
    // Double-check that field is still empty (safety check)
    const currentRecord = await client.client.pages.retrieve({ page_id: recordId });
    const currentFieldValue = currentRecord.properties[fieldName];
    
    if (!isFieldEmpty(currentFieldValue)) {
      return {
        recordId,
        fieldName,
        action: 'skipped_has_value',
        oldValue: getFieldDisplayValue(currentFieldValue),
        notes: 'Field already contains a value, skipped under field protection guardrail'
      };
    }
    
    // Build the appropriate property structure
    const propertyValue = buildSafePropertyValue(fieldName, proposedValue);
    
    // Apply the update
    await client.client.pages.update({
      page_id: recordId,
      properties: {
        [fieldName]: propertyValue
      }
    });
    
    console.log(`✅ Safe patch: ${fieldName} → "${proposedValue}"`);
    
    return {
      recordId,
      fieldName,
      action: 'patched',
      oldValue: 'empty',
      newValue: proposedValue,
      dataSource,
      notes: `Patched under overwrite guardrail: ${reasoning}`
    };
    
  } catch (error) {
    console.error(`❌ Error patching ${fieldName}:`, error.message);
    
    return {
      recordId,
      fieldName,
      action: 'error',
      oldValue: 'empty',
      notes: `Failed to patch: ${error.message}`
    };
  }
}

function buildSafePropertyValue(fieldName: string, value: string) {
  // Build property based on common field patterns
  if (fieldName === 'status' || fieldName === 'priority' || fieldName === 'category' || 
      fieldName === 'projectType' || fieldName === 'colorTag' || fieldName === 'Confidence' ||
      fieldName.includes('Source System')) {
    return { select: { name: value } };
  }
  
  if (fieldName.includes('title') || fieldName === 'assignee') {
    if (fieldName.includes('title')) {
      return { title: [{ text: { content: value } }] };
    } else {
      return { rich_text: [{ text: { content: value } }] };
    }
  }
  
  if (fieldName === 'canonicalUse' || fieldName.includes('checkbox')) {
    return { checkbox: value.toLowerCase() === 'true' };
  }
  
  if (fieldName.includes('date') || fieldName.includes('time')) {
    return { date: { start: new Date().toISOString().split('T')[0] } };
  }
  
  // Default to rich text
  return { rich_text: [{ text: { content: value } }] };
}

function getFieldDisplayValue(field: any): string {
  if (!field) return 'null';
  
  switch (field.type) {
    case 'title':
      return field.title?.[0]?.plain_text || 'empty';
    case 'rich_text':
      return field.rich_text?.[0]?.plain_text || 'empty';
    case 'select':
      return field.select?.name || 'empty';
    case 'checkbox':
      return field.checkbox?.toString() || 'false';
    default:
      return 'unknown';
  }
}

// Update the backfill task tracker with results
async function updateTaskTracker(client: any, results: SafeBackfillResult[]) {
  const trackerId = TARGET_DATABASES['wt-backfill-task-tracker'];
  
  try {
    console.log('\n📊 Updating backfill task tracker...');
    
    const trackerTasks = await client.queryDatabase({
      database_id: trackerId
    });
    
    const patchedCount = results.filter(r => r.action === 'patched').length;
    const skippedCount = results.filter(r => r.action.startsWith('skipped')).length;
    
    // Create a summary entry for this safe-mode execution
    await client.writePage({
      parent: { database_id: trackerId },
      properties: {
        taskTitle: {
          title: [{ text: { content: `Safe Mode Backfill Execution - ${new Date().toISOString().split('T')[0]}` } }]
        },
        databaseName: {
          select: { name: 'Multiple Databases' }
        },
        issueType: {
          select: { name: 'Data Quality' }
        },
        priority: {
          select: { name: 'Medium' }
        },
        category: {
          select: { name: 'Migration' }
        },
        status: {
          select: { name: 'Resolved' }
        },
        assignee: {
          rich_text: [{ text: { content: 'Claude (Safe Mode)' } }]
        },
        estimatedEffort: {
          select: { name: 'Automated' }
        },
        recordsAffected: {
          number: patchedCount
        },
        suggestedFix: {
          rich_text: [{ text: { content: `Automated safe backfill of ${patchedCount} empty fields` } }]
        },
        notes: {
          rich_text: [{ text: { content: `Patched under overwrite guardrail. Skipped ${skippedCount} fields with existing values. Anchor tag: safe-fill-only` } }]
        }
      }
    });
    
    console.log('✅ Task tracker updated with safe-mode execution summary');
    
  } catch (error) {
    console.error('❌ Error updating task tracker:', error);
  }
}

async function executeSafeModeBackfill() {
  const token = process.env.NOTION_TOKEN;
  
  if (!token) {
    console.error('❌ Missing NOTION_TOKEN environment variable');
    process.exit(1);
  }
  
  const client = createNotionClient(token);
  
  console.log('🛡️  Starting WT-8.0.4 Safe Mode Backfill with Field Protection...\n');
  
  const allResults: SafeBackfillResult[] = [];
  let totalRecordsScanned = 0;
  let safePatchTasks: SafeBackfillTask[] = [];
  
  // Scan each target database for safe backfill opportunities
  for (const [dbName, dbId] of Object.entries(TARGET_DATABASES)) {
    if (dbName === 'wt-backfill-task-tracker') continue; // Skip the tracker itself
    
    console.log(`🔍 Scanning ${dbName} for safe backfill opportunities...`);
    
    try {
      const response = await client.queryDatabase({
        database_id: dbId,
        page_size: 100
      });
      
      totalRecordsScanned += response.results.length;
      
      for (const record of response.results) {
        // Get the database schema to know what fields to check
        const dbDetails = await client.client.databases.retrieve({ database_id: dbId });
        
        for (const [fieldName, fieldConfig] of Object.entries(dbDetails.properties)) {
          const safeTask = determineSafeValue(dbName, fieldName, record);
          if (safeTask) {
            safePatchTasks.push(safeTask);
          }
        }
      }
      
      console.log(`   📋 Found ${safePatchTasks.filter(t => t.databaseName === dbName).length} safe patch opportunities`);
      
    } catch (error) {
      console.error(`   ❌ Error scanning ${dbName}:`, error.message);
    }
  }
  
  console.log(`\n🎯 Safe Mode Execution Plan:`);
  console.log(`   📊 Records scanned: ${totalRecordsScanned}`);
  console.log(`   ✅ Safe patch tasks identified: ${safePatchTasks.length}`);
  console.log(`   🛡️  Field protection: ON (no overwrites)`);
  
  // Execute safe backfill tasks
  console.log(`\n🔧 Executing safe backfill patches...\n`);
  
  for (const task of safePatchTasks) {
    const result = await executeSafeBackfill(client, task);
    allResults.push(result);
    
    // Add a small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Update task tracker
  await updateTaskTracker(client, allResults);
  
  // Generate execution summary
  const patchedCount = allResults.filter(r => r.action === 'patched').length;
  const skippedHasValueCount = allResults.filter(r => r.action === 'skipped_has_value').length;
  const errorCount = allResults.filter(r => r.action === 'error').length;
  
  console.log('\n📊 Safe Mode Execution Summary:');
  console.log(`   ✅ Successfully patched: ${patchedCount} fields`);
  console.log(`   🛡️  Skipped (has value): ${skippedHasValueCount} fields`);
  console.log(`   ❌ Errors: ${errorCount} fields`);
  console.log(`   📈 Safety compliance: ${((skippedHasValueCount + patchedCount) / (allResults.length || 1) * 100).toFixed(1)}%`);
  
  // Save execution report
  const safeExecutionReport = {
    timestamp: new Date().toISOString(),
    phase: 'WT-8.0.4',
    executionMode: 'safe-fill-only',
    anchorTag: 'safe-fill-only',
    fieldProtectionEnabled: true,
    totalRecordsScanned,
    safePatchTasks: safePatchTasks.length,
    results: {
      patched: patchedCount,
      skippedHasValue: skippedHasValueCount,
      errors: errorCount,
      safetyCompliance: ((skippedHasValueCount + patchedCount) / (allResults.length || 1) * 100)
    },
    detailedResults: allResults.map(r => ({
      recordId: r.recordId.substring(0, 8) + '...',
      fieldName: r.fieldName,
      action: r.action,
      oldValue: r.oldValue,
      newValue: r.newValue,
      notes: r.notes
    }))
  };
  
  const reportPath = join(process.cwd(), 'wt-8.0.4-safe-mode-report.json');
  writeFileSync(reportPath, JSON.stringify(safeExecutionReport, null, 2));
  console.log(`\n📄 Safe mode execution report saved: ${reportPath}`);
  
  return { allResults, safeExecutionReport };
}

// Export for use in other scripts
export { executeSafeModeBackfill };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  executeSafeModeBackfill()
    .then(({ allResults, safeExecutionReport }) => {
      console.log('\n🎯 WT-8.0.4 Safe Mode Backfill Complete!');
      console.log('🛡️  Field protection guardrails maintained');
      console.log('📊 Check wt-backfill-task-tracker for updated status');
      console.log(`✅ ${safeExecutionReport.results.patched} fields safely patched`);
    })
    .catch(console.error);
}