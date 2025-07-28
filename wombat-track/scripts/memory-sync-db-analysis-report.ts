#!/usr/bin/env node

/**
 * Memory Sync Governance Database Analysis Report
 * 
 * This script provides detailed analysis of the Memory Sync database and identifies
 * specific issues with Phase/Step numbering, duplicates, and data quality issues.
 */

import dotenv from 'dotenv';
import { createNotionClient } from '../src/utils/notionClient.js';

dotenv.config();

const DATABASE_ID = '23ce1901e36e80709747d171d17c9ff4';

interface AnalysisReport {
  databaseInfo: {
    id: string;
    title: string;
    type: string;
    isInline: boolean;
    totalEntries: number;
  };
  issues: {
    phaseStepProblems: Array<{
      type: 'missing_step' | 'missing_phase' | 'inconsistent_numbering';
      entry: string;
      phase?: number;
      step?: number;
      description: string;
    }>;
    dataQualityProblems: Array<{
      type: 'empty_description' | 'short_description' | 'missing_assignment' | 'missing_due_date';
      entry: string;
      description: string;
    }>;
    duplicateIssues: Array<{
      type: 'duplicate_phase_step' | 'similar_action';
      entries: string[];
      description: string;
    }>;
  };
  recommendations: string[];
  summary: {
    totalIssues: number;
    criticalIssues: number;
    completionReadiness: 'low' | 'medium' | 'high';
  };
}

async function analyzeDatabase(): Promise<AnalysisReport> {
  const notion = createNotionClient();
  
  console.log('🔍 Starting comprehensive database analysis...\n');
  
  // Get database info
  const database = await notion.client.databases.retrieve({ database_id: DATABASE_ID });
  const response = await notion.queryDatabase({ database_id: DATABASE_ID, page_size: 100 });
  
  const entries = response.results.map((page: any) => {
    const props = page.properties;
    return {
      id: page.id,
      action: props.Action?.title?.[0]?.plain_text || '',
      phase: props.Phase?.number || null,
      step: props.Step?.number || null,
      status: props.Status?.status?.name || '',
      description: props.Description?.rich_text?.[0]?.plain_text || '',
      due: props.Due?.date?.start || null,
      assignee: props.Assignee?.people?.map((p: any) => p.name || p.person?.email || 'Unknown') || [],
      created_time: page.created_time,
      last_edited_time: page.last_edited_time
    };
  });

  const report: AnalysisReport = {
    databaseInfo: {
      id: DATABASE_ID,
      title: database.title?.[0]?.plain_text || 'MemSync Implementation Phases',
      type: database.object,
      isInline: database.parent?.type === 'page_id',
      totalEntries: entries.length
    },
    issues: {
      phaseStepProblems: [],
      dataQualityProblems: [],
      duplicateIssues: []
    },
    recommendations: [],
    summary: {
      totalIssues: 0,
      criticalIssues: 0,
      completionReadiness: 'low'
    }
  };

  console.log('📊 Analyzing Phase/Step numbering issues...');
  
  // 1. Check for missing phases or steps
  entries.forEach(entry => {
    if (!entry.phase && entry.action !== 'Data Mapping & Structure Design') {
      report.issues.phaseStepProblems.push({
        type: 'missing_phase',
        entry: entry.action,
        description: `Entry "${entry.action}" has no phase assigned`
      });
    }
    
    if (entry.phase && !entry.step) {
      report.issues.phaseStepProblems.push({
        type: 'missing_step',
        entry: entry.action,
        phase: entry.phase,
        description: `Entry "${entry.action}" in Phase ${entry.phase} has no step number`
      });
    }
  });

  // 2. Check for logical phase/step progression issues
  const phaseStepMap = new Map<string, number[]>();
  entries.filter(e => e.phase && e.step).forEach(entry => {
    const phaseKey = entry.phase!.toString();
    if (!phaseStepMap.has(phaseKey)) {
      phaseStepMap.set(phaseKey, []);
    }
    phaseStepMap.get(phaseKey)!.push(entry.step!);
  });

  // Check for gaps in step numbering within phases
  phaseStepMap.forEach((steps, phase) => {
    const uniqueSteps = [...new Set(steps)].sort((a, b) => a - b);
    const expectedSteps = Array.from({length: uniqueSteps.length}, (_, i) => i + 1);
    
    // Check if steps start from 1 and are sequential
    if (uniqueSteps[0] !== 1 || !uniqueSteps.every((step, index) => step === expectedSteps[index])) {
      const missingSteps = expectedSteps.filter(step => !uniqueSteps.includes(step));
      report.issues.phaseStepProblems.push({
        type: 'inconsistent_numbering',
        entry: `Phase ${phase}`,
        phase: parseInt(phase),
        description: `Phase ${phase} has non-sequential step numbering. Steps: [${uniqueSteps.join(', ')}]. Expected: [${expectedSteps.join(', ')}]`
      });
    }
  });

  console.log('📝 Analyzing data quality issues...');
  
  // 3. Data quality analysis
  entries.forEach(entry => {
    // Empty descriptions
    if (!entry.description.trim()) {
      report.issues.dataQualityProblems.push({
        type: 'empty_description',
        entry: entry.action,
        description: `"${entry.action}" has no description`
      });
    }
    
    // Short descriptions (less than 10 characters)
    else if (entry.description.trim().length < 10) {
      report.issues.dataQualityProblems.push({
        type: 'short_description',
        entry: entry.action,
        description: `"${entry.action}" has very short description: "${entry.description}"`
      });
    }
    
    // Missing assignments
    if (entry.assignee.length === 0) {
      report.issues.dataQualityProblems.push({
        type: 'missing_assignment',
        entry: entry.action,
        description: `"${entry.action}" has no assignee`
      });
    }
    
    // Missing due dates
    if (!entry.due) {
      report.issues.dataQualityProblems.push({
        type: 'missing_due_date',
        entry: entry.action,
        description: `"${entry.action}" has no due date`
      });
    }
  });

  console.log('🔍 Checking for duplicate issues...');
  
  // 4. Check for duplicates and similar entries
  const phaseStepCombos = new Map<string, string[]>();
  entries.filter(e => e.phase && e.step).forEach(entry => {
    const key = `${entry.phase}.${entry.step}`;
    if (!phaseStepCombos.has(key)) {
      phaseStepCombos.set(key, []);
    }
    phaseStepCombos.get(key)!.push(entry.action);
  });

  // Report duplicate phase.step combinations
  phaseStepCombos.forEach((actions, phaseStep) => {
    if (actions.length > 1) {
      report.issues.duplicateIssues.push({
        type: 'duplicate_phase_step',
        entries: actions,
        description: `Multiple entries with same Phase.Step (${phaseStep}): ${actions.join(', ')}`
      });
    }
  });

  // Check for similar action names (basic similarity check)
  const actionWords = entries.map(e => ({
    action: e.action,
    words: e.action.toLowerCase().split(/\s+/).filter(word => word.length > 3)
  }));

  for (let i = 0; i < actionWords.length; i++) {
    for (let j = i + 1; j < actionWords.length; j++) {
      const entry1 = actionWords[i];
      const entry2 = actionWords[j];
      const commonWords = entry1.words.filter(word => entry2.words.includes(word));
      
      if (commonWords.length >= 2 && entry1.action !== entry2.action) {
        report.issues.duplicateIssues.push({
          type: 'similar_action',
          entries: [entry1.action, entry2.action],
          description: `Potentially similar actions: "${entry1.action}" and "${entry2.action}" (common words: ${commonWords.join(', ')})`
        });
      }
    }
  }

  console.log('💡 Generating recommendations...');
  
  // 5. Generate recommendations
  const totalEntriesWithoutSteps = entries.filter(e => e.phase && !e.step).length;
  const totalEntriesWithoutPhases = entries.filter(e => !e.phase && e.action !== 'Data Mapping & Structure Design').length;
  const totalEmptyDescriptions = entries.filter(e => !e.description.trim()).length;
  
  if (totalEntriesWithoutSteps > 0) {
    report.recommendations.push(`🔢 Assign step numbers to ${totalEntriesWithoutSteps} entries that have phases but no steps`);
  }
  
  if (totalEntriesWithoutPhases > 0) {
    report.recommendations.push(`📋 Assign phase numbers to ${totalEntriesWithoutPhases} entries missing phase classification`);
  }
  
  if (totalEmptyDescriptions > 0) {
    report.recommendations.push(`📝 Add descriptions to ${totalEmptyDescriptions} entries with empty descriptions`);
  }
  
  if (entries.every(e => e.assignee.length === 0)) {
    report.recommendations.push(`👥 Assign owners to all tasks - currently no tasks have assignees`);
  }
  
  if (entries.every(e => !e.due)) {
    report.recommendations.push(`📅 Set due dates for time-sensitive tasks - currently no tasks have due dates`);
  }
  
  if (entries.every(e => e.status === 'Not started')) {
    report.recommendations.push(`🚀 Start working on tasks - all ${entries.length} tasks are marked as 'Not started'`);
  }

  // Consider the inline vs standalone database question
  if (!report.databaseInfo.isInline) {
    report.recommendations.push(`✅ Database is standalone (not inline), which is ideal for API access`);
  }

  // Summary calculation
  const totalIssues = 
    report.issues.phaseStepProblems.length + 
    report.issues.dataQualityProblems.length + 
    report.issues.duplicateIssues.length;
    
  const criticalIssues = 
    report.issues.phaseStepProblems.filter(i => i.type === 'missing_phase' || i.type === 'missing_step').length +
    report.issues.duplicateIssues.filter(i => i.type === 'duplicate_phase_step').length;

  report.summary.totalIssues = totalIssues;
  report.summary.criticalIssues = criticalIssues;
  
  if (criticalIssues === 0 && totalIssues < 10) {
    report.summary.completionReadiness = 'high';
  } else if (criticalIssues <= 2 && totalIssues < 20) {
    report.summary.completionReadiness = 'medium';
  } else {
    report.summary.completionReadiness = 'low';
  }

  return report;
}

async function printReport(report: AnalysisReport) {
  console.log('\n' + '='.repeat(60));
  console.log('📊 MEMORY SYNC GOVERNANCE DATABASE ANALYSIS REPORT');
  console.log('='.repeat(60));
  
  console.log(`\n📋 Database Information:`);
  console.log(`  Title: ${report.databaseInfo.title}`);
  console.log(`  ID: ${report.databaseInfo.id}`);
  console.log(`  Type: ${report.databaseInfo.type} (${report.databaseInfo.isInline ? 'inline' : 'standalone'})`);
  console.log(`  Total Entries: ${report.databaseInfo.totalEntries}`);
  
  console.log(`\n🚨 Issues Summary:`);
  console.log(`  Total Issues: ${report.summary.totalIssues}`);
  console.log(`  Critical Issues: ${report.summary.criticalIssues}`);
  console.log(`  Completion Readiness: ${report.summary.completionReadiness.toUpperCase()}`);
  
  if (report.issues.phaseStepProblems.length > 0) {
    console.log(`\n🔢 Phase/Step Numbering Issues (${report.issues.phaseStepProblems.length}):`);
    report.issues.phaseStepProblems.forEach((issue, index) => {
      console.log(`  ${index + 1}. [${issue.type.toUpperCase()}] ${issue.description}`);
    });
  }
  
  if (report.issues.dataQualityProblems.length > 0) {
    console.log(`\n📝 Data Quality Issues (${report.issues.dataQualityProblems.length}):`);
    const grouped = report.issues.dataQualityProblems.reduce((acc, issue) => {
      if (!acc[issue.type]) acc[issue.type] = [];
      acc[issue.type].push(issue);
      return acc;
    }, {} as Record<string, any[]>);
    
    Object.entries(grouped).forEach(([type, issues]) => {
      console.log(`  ${type.replace('_', ' ').toUpperCase()}: ${issues.length} issues`);
    });
  }
  
  if (report.issues.duplicateIssues.length > 0) {
    console.log(`\n🔍 Duplicate/Similar Issues (${report.issues.duplicateIssues.length}):`);
    report.issues.duplicateIssues.forEach((issue, index) => {
      console.log(`  ${index + 1}. [${issue.type.toUpperCase()}] ${issue.description}`);
    });
  }
  
  if (report.recommendations.length > 0) {
    console.log(`\n💡 Recommendations:`);
    report.recommendations.forEach((rec, index) => {
      console.log(`  ${index + 1}. ${rec}`);
    });
  }
  
  console.log(`\n✅ Analysis Complete!`);
  console.log(`\nDatabase is ${report.databaseInfo.isInline ? 'INLINE' : 'STANDALONE'} - ${report.databaseInfo.isInline ? 'may affect' : 'optimal for'} API access.`);
}

async function main() {
  try {
    const report = await analyzeDatabase();
    await printReport(report);
  } catch (error: any) {
    console.error('❌ Analysis failed:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);