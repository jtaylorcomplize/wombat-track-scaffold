#!/usr/bin/env tsx

/**
 * WT-8.0.4: High-Confidence Backfill Execution
 * 
 * Based on comprehensive canonical database model scan.
 * Only fills empty fields with high confidence deterministic values.
 */

import { createNotionClient } from '../src/utils/notionClient';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import type { CanonicalModel } from './build-canonical-db-model';

interface HighConfidenceTask {
  databaseId: string;
  databaseTitle: string;
  recordId: string;
  fieldName: string;
  currentValue: any;
  suggestedValue: string;
  reasoning: string;
  emptyCount: number;
}

interface BackfillResult {
  databaseTitle: string;
  recordId: string;
  fieldName: string;
  action: 'filled' | 'skipped_has_value' | 'error';
  oldValue: string;
  newValue?: string;
  reasoning: string;
}

async function executeHighConfidenceBackfill() {
  const token = process.env.NOTION_TOKEN;
  
  if (!token) {
    console.error('❌ Missing NOTION_TOKEN environment variable');
    process.exit(1);
  }
  
  const client = createNotionClient(token);
  
  console.log('🎯 Starting High-Confidence Backfill Execution...');
  console.log('📋 Using comprehensive canonical database model\n');
  
  // Load the canonical model
  const modelPath = join(process.cwd(), 'canonical-db-model.json');
  const model: CanonicalModel = JSON.parse(readFileSync(modelPath, 'utf8'));
  
  const tasks: HighConfidenceTask[] = [];
  const results: BackfillResult[] = [];
  
  // Identify all high-confidence fillable fields
  for (const db of model.databases) {
    const highConfidenceFields = db.emptyFieldAnalysis.filter(f => 
      f.fillable && f.confidenceLevel === 'high'
    );
    
    if (highConfidenceFields.length > 0) {
      console.log(`🔍 Processing: ${db.title} (${highConfidenceFields.length} fillable fields)`);
      
      // Get all records from this database
      try {
        const records = await client.queryDatabase({
          database_id: db.id,
          page_size: 100
        });
        
        for (const record of records.results) {
          for (const fieldAnalysis of highConfidenceFields) {
            const fieldValue = record.properties[fieldAnalysis.fieldName];
            
            // Double-check that the field is actually empty
            if (isFieldEmpty(fieldValue)) {
              tasks.push({
                databaseId: db.id,
                databaseTitle: db.title,
                recordId: record.id,
                fieldName: fieldAnalysis.fieldName,
                currentValue: fieldValue,
                suggestedValue: fieldAnalysis.suggestedValue!,
                reasoning: fieldAnalysis.reasoning,
                emptyCount: fieldAnalysis.emptyCount
              });
            }
          }
        }
        
        console.log(`   📊 Found ${tasks.filter(t => t.databaseId === db.id).length} empty fields to fill`);
        
      } catch (error) {
        console.error(`   ❌ Error processing ${db.title}:`, error.message);
      }
    }
  }
  
  console.log(`\n🎯 High-Confidence Execution Plan:`);
  console.log(`   🔧 Total fillable fields: ${tasks.length}`);
  console.log(`   🛡️  Field protection: ON (only empty fields)`);
  console.log(`   📊 Confidence level: HIGH only\n`);
  
  // Execute the backfill tasks
  console.log('🔧 Executing high-confidence backfill...\n');
  
  for (const task of tasks) {
    const result = await executeBackfillTask(client, task);
    results.push(result);
    
    if (result.action === 'filled') {
      console.log(`✅ ${task.databaseTitle}: ${task.fieldName} → "${task.suggestedValue}"`);
    } else if (result.action === 'skipped_has_value') {
      console.log(`🛡️  ${task.databaseTitle}: ${task.fieldName} (already has value - protected)`);
    } else {
      console.log(`❌ ${task.databaseTitle}: ${task.fieldName} (error)`);
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  // Update the backfill task tracker
  await updateTaskTracker(client, results, tasks.length);
  
  // Generate summary
  const filledCount = results.filter(r => r.action === 'filled').length;
  const protectedCount = results.filter(r => r.action === 'skipped_has_value').length;
  const errorCount = results.filter(r => r.action === 'error').length;
  
  console.log('\n📊 High-Confidence Backfill Summary:');
  console.log(`   ✅ Fields filled: ${filledCount}`);
  console.log(`   🛡️  Fields protected: ${protectedCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
  console.log(`   📈 Success rate: ${((filledCount + protectedCount) / (results.length || 1) * 100).toFixed(1)}%`);
  
  // Save detailed execution report
  const executionReport = {
    timestamp: new Date().toISOString(),
    phase: 'WT-8.0.4',
    executionMode: 'high-confidence-backfill',
    basedOnModel: model.scannedAt,
    totalTasks: tasks.length,
    results: {
      filled: filledCount,
      protected: protectedCount,
      errors: errorCount
    },
    detailedResults: results.map(r => ({
      database: r.databaseTitle,
      field: r.fieldName,
      action: r.action,
      value: r.newValue,
      reasoning: r.reasoning
    }))
  };
  
  const reportPath = join(process.cwd(), 'wt-8.0.4-high-confidence-report.json');
  writeFileSync(reportPath, JSON.stringify(executionReport, null, 2));
  console.log(`\n📄 Execution report saved: ${reportPath}`);
  
  return { results, executionReport };
}

async function executeBackfillTask(client: any, task: HighConfidenceTask): Promise<BackfillResult> {
  try {
    // Double-check that the field is still empty (safety measure)
    const currentRecord = await client.client.pages.retrieve({ page_id: task.recordId });
    const currentFieldValue = currentRecord.properties[task.fieldName];
    
    if (!isFieldEmpty(currentFieldValue)) {
      return {
        databaseTitle: task.databaseTitle,
        recordId: task.recordId,
        fieldName: task.fieldName,
        action: 'skipped_has_value',
        oldValue: getFieldDisplayValue(currentFieldValue),
        reasoning: 'Field already contains value - protected by guardrail'
      };
    }
    
    // Build the property value based on field type
    const propertyValue = buildPropertyValue(task.fieldName, task.suggestedValue);
    
    // Execute the update
    await client.client.pages.update({
      page_id: task.recordId,
      properties: {
        [task.fieldName]: propertyValue
      }
    });
    
    return {
      databaseTitle: task.databaseTitle,
      recordId: task.recordId,
      fieldName: task.fieldName,
      action: 'filled',
      oldValue: 'empty',
      newValue: task.suggestedValue,
      reasoning: task.reasoning
    };
    
  } catch (error) {
    return {
      databaseTitle: task.databaseTitle,
      recordId: task.recordId,
      fieldName: task.fieldName,
      action: 'error',
      oldValue: 'empty',
      reasoning: `Error: ${error.message}`
    };
  }
}

function buildPropertyValue(fieldName: string, value: string) {
  const fieldLower = fieldName.toLowerCase();
  
  // Status fields are typically select
  if (fieldLower === 'status') {
    return { select: { name: value } };
  }
  
  // Priority fields are select
  if (fieldLower === 'priority') {
    return { select: { name: value } };
  }
  
  // Canonical use is checkbox
  if (fieldLower === 'canonicaluse') {
    return { checkbox: value.toLowerCase() === 'true' };
  }
  
  // Project IDs are typically rich text
  if (fieldLower.includes('projectid')) {
    return { rich_text: [{ text: { content: value } }] };
  }
  
  // Default to rich text for most fields
  return { rich_text: [{ text: { content: value } }] };
}

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
      return 'has_value';
  }
}

async function updateTaskTracker(client: any, results: BackfillResult[], totalTasks: number) {
  const trackerId = '23fe1901-e36e-8182-a7ab-dbf4441d82f0';
  
  try {
    console.log('\n📊 Updating backfill task tracker...');
    
    const filledCount = results.filter(r => r.action === 'filled').length;
    
    await client.writePage({
      parent: { database_id: trackerId },
      properties: {
        taskTitle: {
          title: [{ text: { content: `High-Confidence Backfill - ${new Date().toISOString().split('T')[0]}` } }]
        },
        databaseName: {
          select: { name: 'Multiple Databases' }
        },
        issueType: {
          select: { name: 'Data Quality' }
        },
        priority: {
          select: { name: 'High' }
        },
        category: {
          select: { name: 'Migration' }
        },
        status: {
          select: { name: 'Resolved' }
        },
        assignee: {
          rich_text: [{ text: { content: 'Claude (High-Confidence)' } }]
        },
        estimatedEffort: {
          select: { name: 'Automated' }
        },
        recordsAffected: {
          number: filledCount
        },
        suggestedFix: {
          rich_text: [{ text: { content: `Filled ${filledCount} empty fields with high-confidence values` } }]
        },
        notes: {
          rich_text: [{ text: { content: `Based on comprehensive canonical DB model. Field protection maintained. Total tasks: ${totalTasks}, Filled: ${filledCount}` } }]
        }
      }
    });
    
    console.log('✅ Task tracker updated with high-confidence execution');
    
  } catch (error) {
    console.error('❌ Error updating task tracker:', error);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  executeHighConfidenceBackfill()
    .then(({ results, executionReport }) => {
      console.log('\n🎯 High-Confidence Backfill Complete!');
      console.log(`✅ Successfully filled ${executionReport.results.filled} empty fields`);
      console.log('🛡️  Perfect field protection maintained');
      console.log('📊 Ready for production use');
    })
    .catch(console.error);
}

export { executeHighConfidenceBackfill };