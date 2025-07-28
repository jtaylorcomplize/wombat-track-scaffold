#!/usr/bin/env node

/**
 * Comprehensive Memory Sync Governance Database Automation
 * 
 * This script executes all 4 automated actions:
 * 1. Automated Step Numbering
 * 2. Description Enhancement
 * 3. Duplicate Detection
 * 4. Data Validation
 */

import dotenv from 'dotenv';
import { createNotionClient } from '../src/utils/notionClient.js';

dotenv.config();

const DATABASE_ID = '23ce1901e36e80709747d171d17c9ff4';

interface DatabaseEntry {
  id: string;
  action: string;
  phase: number | null;
  step: number | null;
  status: string;
  description: string;
  due: string | null;
  assignee: string[];
  created_time: string;
  last_edited_time: string;
}

interface AutomationReport {
  stepNumbering: {
    entriesFixed: number;
    assignedSteps: Array<{
      action: string;
      phase: number;
      oldStep: number | null;
      newStep: number;
    }>;
  };
  descriptionEnhancement: {
    emptyDescriptionsFixed: number;
    shortDescriptionsEnhanced: number;
    enhancedDescriptions: Array<{
      action: string;
      oldDescription: string;
      newDescription: string;
    }>;
  };
  duplicateDetection: {
    duplicatesFound: number;
    nearDuplicatesFound: number;
    issues: Array<{
      type: 'duplicate' | 'near_duplicate';
      entries: string[];
      reason: string;
    }>;
  };
  dataValidation: {
    validationErrors: number;
    fixedErrors: number;
    validationResults: Array<{
      type: 'error' | 'warning' | 'info';
      message: string;
      action?: string;
    }>;
  };
}

async function getCurrentEntries(): Promise<DatabaseEntry[]> {
  const notion = createNotionClient();
  const response = await notion.queryDatabase({ database_id: DATABASE_ID, page_size: 100 });
  
  return response.results.map((page: any) => {
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
}

/**
 * Action 1: Automated Step Numbering
 */
async function automateStepNumbering(entries: DatabaseEntry[], dryRun: boolean = false): Promise<AutomationReport['stepNumbering']> {
  console.log('🔢 Starting Automated Step Numbering...\n');
  
  const notion = createNotionClient();
  const result: AutomationReport['stepNumbering'] = {
    entriesFixed: 0,
    assignedSteps: []
  };

  // Group entries by phase
  const entriesByPhase = entries.reduce((acc, entry) => {
    if (entry.phase) {
      const phaseKey = entry.phase.toString();
      if (!acc[phaseKey]) acc[phaseKey] = [];
      acc[phaseKey].push(entry);
    }
    return acc;
  }, {} as Record<string, DatabaseEntry[]>);

  console.log('📊 Phase Analysis:');
  Object.entries(entriesByPhase).forEach(([phase, phaseEntries]) => {
    const withoutSteps = phaseEntries.filter(e => e.step === null);
    console.log(`  Phase ${phase}: ${phaseEntries.length} total, ${withoutSteps.length} missing steps`);
  });

  // Assign step numbers logically
  for (const [phase, phaseEntries] of Object.entries(entriesByPhase)) {
    const withoutSteps = phaseEntries.filter(e => e.step === null);
    const existingSteps = phaseEntries.filter(e => e.step !== null).map(e => e.step!).sort((a, b) => a - b);
    
    if (withoutSteps.length > 0) {
      // Sort entries without steps by creation time for logical ordering
      const sortedEntries = withoutSteps.sort((a, b) => 
        new Date(a.created_time).getTime() - new Date(b.created_time).getTime()
      );
      
      const nextStepNumber = existingSteps.length > 0 ? Math.max(...existingSteps) + 1 : 1;
      
      console.log(`\n🔧 Assigning steps for Phase ${phase}:`);
      
      for (let i = 0; i < sortedEntries.length; i++) {
        const entry = sortedEntries[i];
        const newStepNumber = nextStepNumber + i;
        
        const stepAssignment = {
          action: entry.action,
          phase: entry.phase!,
          oldStep: entry.step,
          newStep: newStepNumber
        };
        
        result.assignedSteps.push(stepAssignment);
        
        if (!dryRun) {
          try {
            await notion.client.pages.update({
              page_id: entry.id,
              properties: {
                Step: {
                  number: newStepNumber
                }
              }
            });
            console.log(`  ✅ "${entry.action}" → Step ${newStepNumber}`);
            result.entriesFixed++;
          } catch (error) {
            console.log(`  ❌ Failed to update "${entry.action}": ${error}`);
          }
        } else {
          console.log(`  📋 Would assign "${entry.action}" → Step ${newStepNumber}`);
        }
      }
    }
  }

  return result;
}

/**
 * Action 2: Description Enhancement
 */
async function enhanceDescriptions(entries: DatabaseEntry[], dryRun: boolean = false): Promise<AutomationReport['descriptionEnhancement']> {
  console.log('\n📝 Starting Description Enhancement...\n');
  
  const notion = createNotionClient();
  const result: AutomationReport['descriptionEnhancement'] = {
    emptyDescriptionsFixed: 0,
    shortDescriptionsEnhanced: 0,
    enhancedDescriptions: []
  };

  const entriesNeedingDescriptions = entries.filter(e => 
    !e.description.trim() || e.description.trim().length < 10
  );

  console.log(`Found ${entriesNeedingDescriptions.length} entries needing description enhancement:`);

  for (const entry of entriesNeedingDescriptions) {
    const isEmpty = !entry.description.trim();
    const newDescription = generateMeaningfulDescription(entry);
    
    const enhancement = {
      action: entry.action,
      oldDescription: entry.description,
      newDescription: newDescription
    };
    
    result.enhancedDescriptions.push(enhancement);
    
    if (isEmpty) {
      result.emptyDescriptionsFixed++;
    } else {
      result.shortDescriptionsEnhanced++;
    }
    
    console.log(`  ${isEmpty ? '📝' : '✏️'} "${entry.action}"`);
    console.log(`    Old: "${entry.description || '(empty)'}"`);
    console.log(`    New: "${newDescription}"`);
    
    if (!dryRun) {
      try {
        await notion.client.pages.update({
          page_id: entry.id,
          properties: {
            Description: {
              rich_text: [
                {
                  type: 'text',
                  text: {
                    content: newDescription
                  }
                }
              ]
            }
          }
        });
        console.log(`    ✅ Updated successfully`);
      } catch (error) {
        console.log(`    ❌ Failed to update: ${error}`);
      }
    } else {
      console.log(`    📋 Would update description`);
    }
    console.log('');
  }

  return result;
}

/**
 * Generate meaningful descriptions based on action titles and phase context
 */
function generateMeaningfulDescription(entry: DatabaseEntry): string {
  const action = entry.action.toLowerCase();
  const phase = entry.phase;
  
  // Phase-specific context
  const phaseContext = {
    1: 'foundation and planning',
    2: 'core implementation',
    3: 'integration and testing',
    4: 'deployment and optimization',
    5: 'monitoring and maintenance'
  };
  
  const context = phaseContext[phase as keyof typeof phaseContext] || 'project execution';
  
  // Action-specific descriptions based on common patterns
  if (action.includes('setup') || action.includes('configure')) {
    return `Configure and establish the necessary ${action.replace(/setup|configure/gi, '').trim()} components for ${context}. This task involves initial configuration, parameter setting, and environment preparation to ensure proper functionality.`;
  }
  
  if (action.includes('implement') || action.includes('develop')) {
    return `Develop and implement the ${action.replace(/implement|develop/gi, '').trim()} functionality as part of ${context}. This includes coding, testing, and integration of the required features according to specifications.`;
  }
  
  if (action.includes('test') || action.includes('validate')) {
    return `Perform comprehensive testing and validation of ${action.replace(/test|validate/gi, '').trim()} to ensure quality and functionality. This includes unit testing, integration testing, and validation against requirements.`;
  }
  
  if (action.includes('deploy') || action.includes('release')) {
    return `Deploy and release the ${action.replace(/deploy|release/gi, '').trim()} components to the target environment. This includes deployment procedures, environment configuration, and post-deployment verification.`;
  }
  
  if (action.includes('monitor') || action.includes('maintain')) {
    return `Monitor and maintain the ${action.replace(/monitor|maintain/gi, '').trim()} systems to ensure ongoing performance and reliability. This includes performance monitoring, issue resolution, and preventive maintenance.`;
  }
  
  if (action.includes('design') || action.includes('architect')) {
    return `Design and architect the ${action.replace(/design|architect/gi, '').trim()} solution structure for ${context}. This involves creating technical specifications, defining interfaces, and establishing architectural patterns.`;
  }
  
  if (action.includes('sync') || action.includes('synchroniz')) {
    return `Establish and maintain synchronization mechanisms for ${action.replace(/sync|synchroniz\w*/gi, '').trim()}. This ensures data consistency, proper timing, and reliable communication between system components.`;
  }
  
  if (action.includes('integration') || action.includes('integrate')) {
    return `Integrate ${action.replace(/integration|integrate/gi, '').trim()} components with existing systems for ${context}. This involves API connections, data flow establishment, and compatibility verification.`;
  }
  
  if (action.includes('optimization') || action.includes('optimize')) {
    return `Optimize ${action.replace(/optimization|optimize/gi, '').trim()} performance and efficiency for ${context}. This includes performance tuning, resource optimization, and scalability improvements.`;
  }
  
  // Generic fallback based on action content
  const cleanAction = entry.action.replace(/^\w+:\s*/, ''); // Remove prefixes like "WT-1:"
  return `Execute ${cleanAction.toLowerCase()} as part of ${context} phase. This task contributes to the overall project objectives by addressing specific requirements and ensuring proper implementation of the designated functionality.`;
}

/**
 * Action 3: Duplicate Detection
 */
async function detectDuplicates(entries: DatabaseEntry[]): Promise<AutomationReport['duplicateDetection']> {
  console.log('\n🔍 Starting Duplicate Detection...\n');
  
  const result: AutomationReport['duplicateDetection'] = {
    duplicatesFound: 0,
    nearDuplicatesFound: 0,
    issues: []
  };

  // 1. Check for exact phase/step duplicates
  const phaseStepMap = new Map<string, DatabaseEntry[]>();
  entries.filter(e => e.phase && e.step).forEach(entry => {
    const key = `${entry.phase}.${entry.step}`;
    if (!phaseStepMap.has(key)) {
      phaseStepMap.set(key, []);
    }
    phaseStepMap.get(key)!.push(entry);
  });

  phaseStepMap.forEach((entriesWithSameStep, phaseStep) => {
    if (entriesWithSameStep.length > 1) {
      result.duplicatesFound++;
      result.issues.push({
        type: 'duplicate',
        entries: entriesWithSameStep.map(e => e.action),
        reason: `Multiple entries assigned to Phase.Step ${phaseStep}`
      });
    }
  });

  // 2. Check for similar action names (improved algorithm)
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const entry1 = entries[i];
      const entry2 = entries[j];
      
      const similarity = calculateActionSimilarity(entry1.action, entry2.action);
      
      if (similarity.score >= 0.7) { // High similarity threshold
        result.nearDuplicatesFound++;
        result.issues.push({
          type: 'near_duplicate',
          entries: [entry1.action, entry2.action],
          reason: `High similarity (${Math.round(similarity.score * 100)}%): ${similarity.reason}`
        });
      }
    }
  }

  // Report findings
  console.log(`📊 Duplicate Detection Results:`);
  console.log(`  Exact duplicates (same Phase.Step): ${result.duplicatesFound}`);
  console.log(`  Near duplicates (similar actions): ${result.nearDuplicatesFound}`);
  
  if (result.issues.length > 0) {
    console.log(`\n🚨 Issues Found:`);
    result.issues.forEach((issue, index) => {
      console.log(`  ${index + 1}. [${issue.type.toUpperCase()}] ${issue.reason}`);
      console.log(`      Entries: ${issue.entries.join(' | ')}`);
    });
  } else {
    console.log(`  ✅ No duplicates found!`);
  }

  return result;
}

/**
 * Calculate similarity between two action names
 */
function calculateActionSimilarity(action1: string, action2: string): { score: number; reason: string } {
  const normalize = (str: string) => str.toLowerCase().replace(/[^\w\s]/g, '').trim();
  const a1 = normalize(action1);
  const a2 = normalize(action2);
  
  // Exact match
  if (a1 === a2) {
    return { score: 1.0, reason: 'Identical text' };
  }
  
  // Word overlap analysis
  const words1 = a1.split(/\s+/).filter(w => w.length > 2);
  const words2 = a2.split(/\s+/).filter(w => w.length > 2);
  
  const commonWords = words1.filter(w => words2.includes(w));
  const totalWords = new Set([...words1, ...words2]).size;
  const wordOverlapScore = commonWords.length / Math.max(words1.length, words2.length);
  
  // Length similarity
  const lengthRatio = Math.min(a1.length, a2.length) / Math.max(a1.length, a2.length);
  
  // Levenshtein distance for character-level similarity
  const levenshteinScore = 1 - (levenshteinDistance(a1, a2) / Math.max(a1.length, a2.length));
  
  // Combined score
  const finalScore = (wordOverlapScore * 0.5) + (levenshteinScore * 0.3) + (lengthRatio * 0.2);
  
  let reason = '';
  if (commonWords.length >= 3) {
    reason = `Many shared words: ${commonWords.join(', ')}`;
  } else if (commonWords.length >= 2) {
    reason = `Shared words: ${commonWords.join(', ')}`;
  } else if (levenshteinScore > 0.8) {
    reason = 'Very similar text structure';
  } else {
    reason = 'Similar overall pattern';
  }
  
  return { score: finalScore, reason };
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
  
  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      );
    }
  }
  
  return matrix[str2.length][str1.length];
}

/**
 * Action 4: Data Validation
 */
async function validateData(entries: DatabaseEntry[]): Promise<AutomationReport['dataValidation']> {
  console.log('\n✅ Starting Data Validation...\n');
  
  const result: AutomationReport['dataValidation'] = {
    validationErrors: 0,
    fixedErrors: 0,
    validationResults: []
  };

  // Validate required fields
  entries.forEach(entry => {
    // Check for missing action
    if (!entry.action.trim()) {
      result.validationErrors++;
      result.validationResults.push({
        type: 'error',
        message: `Entry with ID ${entry.id} has no action title`,
        action: entry.id
      });
    }
    
    // Check for missing phase
    if (!entry.phase) {
      result.validationErrors++;
      result.validationResults.push({
        type: 'error',
        message: `"${entry.action}" has no phase assigned`,
        action: entry.action
      });
    }
    
    // Check for missing step (if phase exists)
    if (entry.phase && !entry.step) {
      result.validationResults.push({
        type: 'warning',
        message: `"${entry.action}" (Phase ${entry.phase}) has no step number`,
        action: entry.action
      });
    }
    
    // Check for empty descriptions
    if (!entry.description.trim()) {
      result.validationResults.push({
        type: 'warning',
        message: `"${entry.action}" has no description`,
        action: entry.action
      });
    }
  });

  // Validate phase/step consistency
  const phaseStepMap = new Map<number, number[]>();
  entries.filter(e => e.phase && e.step).forEach(entry => {
    if (!phaseStepMap.has(entry.phase!)) {
      phaseStepMap.set(entry.phase!, []);
    }
    phaseStepMap.get(entry.phase!)!.push(entry.step!);
  });

  phaseStepMap.forEach((steps, phase) => {
    const uniqueSteps = [...new Set(steps)].sort((a, b) => a - b);
    
    // Check for gaps in numbering
    for (let i = 1; i < uniqueSteps.length; i++) {
      if (uniqueSteps[i] - uniqueSteps[i-1] > 1) {
        result.validationResults.push({
          type: 'warning',
          message: `Phase ${phase} has gaps in step numbering: ${uniqueSteps.join(', ')}`,
        });
        break;
      }
    }
    
    // Check if steps start from 1
    if (uniqueSteps[0] !== 1) {
      result.validationResults.push({
        type: 'warning',
        message: `Phase ${phase} steps don't start from 1: ${uniqueSteps.join(', ')}`,
      });
    }
  });

  // Check for orphaned phases (phases with no steps)
  const phasesWithSteps = new Set(Array.from(phaseStepMap.keys()));
  const allPhases = new Set(entries.filter(e => e.phase).map(e => e.phase!));
  
  allPhases.forEach(phase => {
    if (!phasesWithSteps.has(phase)) {
      const entriesInPhase = entries.filter(e => e.phase === phase);
      result.validationResults.push({
        type: 'info',
        message: `Phase ${phase} has ${entriesInPhase.length} entries but no step numbers assigned`,
      });
    }
  });

  // Report validation results
  const errors = result.validationResults.filter(r => r.type === 'error');
  const warnings = result.validationResults.filter(r => r.type === 'warning');
  const info = result.validationResults.filter(r => r.type === 'info');

  console.log(`📊 Data Validation Results:`);
  console.log(`  Errors: ${errors.length}`);
  console.log(`  Warnings: ${warnings.length}`);
  console.log(`  Info: ${info.length}`);
  
  if (result.validationResults.length > 0) {
    console.log(`\n📋 Validation Details:`);
    result.validationResults.forEach((item, index) => {
      const icon = item.type === 'error' ? '❌' : item.type === 'warning' ? '⚠️' : 'ℹ️';
      console.log(`  ${index + 1}. ${icon} ${item.message}`);
    });
  } else {
    console.log(`  ✅ All validation checks passed!`);
  }

  return result;
}

/**
 * Generate comprehensive report
 */
function generateComprehensiveReport(report: AutomationReport, totalEntries: number, dryRun: boolean): void {
  console.log('\n' + '='.repeat(80));
  console.log('📊 COMPREHENSIVE MEMORY SYNC AUTOMATION REPORT');
  console.log('='.repeat(80));
  
  console.log(`\n📋 Database: Memory Sync Governance Sidequest (${DATABASE_ID})`);
  console.log(`   Total Entries: ${totalEntries}`);
  console.log(`   Mode: ${dryRun ? 'DRY RUN (no changes made)' : 'LIVE EXECUTION (changes applied)'}`);
  
  // Action 1: Step Numbering
  console.log(`\n🔢 1. AUTOMATED STEP NUMBERING:`);
  console.log(`   ✅ Entries processed: ${report.stepNumbering.assignedSteps.length}`);
  console.log(`   🔧 Steps assigned: ${report.stepNumbering.entriesFixed}`);
  
  if (report.stepNumbering.assignedSteps.length > 0) {
    console.log(`   📝 Details:`);
    report.stepNumbering.assignedSteps.forEach(step => {
      console.log(`      Phase ${step.phase}.${step.newStep}: "${step.action}"`);
    });
  }
  
  // Action 2: Description Enhancement
  console.log(`\n📝 2. DESCRIPTION ENHANCEMENT:`);
  console.log(`   📄 Empty descriptions fixed: ${report.descriptionEnhancement.emptyDescriptionsFixed}`);
  console.log(`   ✏️ Short descriptions enhanced: ${report.descriptionEnhancement.shortDescriptionsEnhanced}`);
  console.log(`   📊 Total descriptions improved: ${report.descriptionEnhancement.enhancedDescriptions.length}`);
  
  // Action 3: Duplicate Detection
  console.log(`\n🔍 3. DUPLICATE DETECTION:`);
  console.log(`   🔴 Exact duplicates found: ${report.duplicateDetection.duplicatesFound}`);
  console.log(`   🟡 Near duplicates found: ${report.duplicateDetection.nearDuplicatesFound}`);
  console.log(`   📊 Total issues identified: ${report.duplicateDetection.issues.length}`);
  
  if (report.duplicateDetection.issues.length > 0) {
    console.log(`   🚨 Duplicate Issues:`);
    report.duplicateDetection.issues.forEach((issue, index) => {
      console.log(`      ${index + 1}. [${issue.type.toUpperCase()}] ${issue.reason}`);
    });
  }
  
  // Action 4: Data Validation
  console.log(`\n✅ 4. DATA VALIDATION:`);
  console.log(`   ❌ Errors found: ${report.dataValidation.validationResults.filter(r => r.type === 'error').length}`);
  console.log(`   ⚠️ Warnings found: ${report.dataValidation.validationResults.filter(r => r.type === 'warning').length}`);
  console.log(`   ℹ️ Info items: ${report.dataValidation.validationResults.filter(r => r.type === 'info').length}`);
  
  // Summary
  const totalIssuesFound = 
    report.duplicateDetection.issues.length + 
    report.dataValidation.validationResults.filter(r => r.type === 'error' || r.type === 'warning').length;
    
  const totalImprovements = 
    report.stepNumbering.entriesFixed + 
    report.descriptionEnhancement.enhancedDescriptions.length;
  
  console.log(`\n📈 SUMMARY:`);
  console.log(`   🔧 Total improvements made: ${totalImprovements}`);
  console.log(`   🚨 Total issues identified: ${totalIssuesFound}`);
  console.log(`   📊 Database quality score: ${calculateQualityScore(report, totalEntries)}%`);
  
  console.log(`\n✅ Automation completed successfully!`);
  if (dryRun) {
    console.log(`\n🚀 Run with --apply flag to execute changes`);
  }
}

/**
 * Calculate database quality score
 */
function calculateQualityScore(report: AutomationReport, totalEntries: number): number {
  let score = 100;
  
  // Deduct for missing step numbers
  const missingSteps = report.stepNumbering.assignedSteps.length;
  score -= (missingSteps / totalEntries) * 20;
  
  // Deduct for poor descriptions
  const poorDescriptions = report.descriptionEnhancement.enhancedDescriptions.length;
  score -= (poorDescriptions / totalEntries) * 15;
  
  // Deduct for duplicates
  score -= report.duplicateDetection.duplicatesFound * 5;
  score -= report.duplicateDetection.nearDuplicatesFound * 2;
  
  // Deduct for validation errors
  const errors = report.dataValidation.validationResults.filter(r => r.type === 'error').length;
  const warnings = report.dataValidation.validationResults.filter(r => r.type === 'warning').length;
  score -= errors * 10;
  score -= warnings * 2;
  
  return Math.max(0, Math.round(score));
}

/**
 * Main execution function
 */
async function executeComprehensiveAutomation(dryRun: boolean = true): Promise<void> {
  console.log('🚀 Starting Comprehensive Memory Sync Governance Automation...\n');
  console.log(`Database ID: ${DATABASE_ID}`);
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE EXECUTION'}\n`);
  
  try {
    // Get current database state
    const entries = await getCurrentEntries();
    console.log(`📊 Found ${entries.length} entries in database\n`);
    
    // Initialize report
    const report: AutomationReport = {
      stepNumbering: { entriesFixed: 0, assignedSteps: [] },
      descriptionEnhancement: { emptyDescriptionsFixed: 0, shortDescriptionsEnhanced: 0, enhancedDescriptions: [] },
      duplicateDetection: { duplicatesFound: 0, nearDuplicatesFound: 0, issues: [] },
      dataValidation: { validationErrors: 0, fixedErrors: 0, validationResults: [] }
    };
    
    // Execute all 4 actions
    report.stepNumbering = await automateStepNumbering(entries, dryRun);
    
    // Get updated entries for description enhancement (in case step numbers were added)
    const updatedEntries = dryRun ? entries : await getCurrentEntries();
    report.descriptionEnhancement = await enhanceDescriptions(updatedEntries, dryRun);
    
    // Final entries state for validation and duplicate detection
    const finalEntries = dryRun ? updatedEntries : await getCurrentEntries();
    report.duplicateDetection = await detectDuplicates(finalEntries);
    report.dataValidation = await validateData(finalEntries);
    
    // Generate comprehensive report
    generateComprehensiveReport(report, entries.length, dryRun);
    
  } catch (error: any) {
    console.error('❌ Automation failed:', error.message);
    throw error;
  }
}

/**
 * CLI interface
 */
function printUsage(): void {
  console.log(`
🤖 Comprehensive Memory Sync Governance Database Automation

This script executes all 4 automated actions:
1. 🔢 Automated Step Numbering - Assign logical step numbers within phases
2. 📝 Description Enhancement - Generate meaningful descriptions for empty/short fields
3. 🔍 Duplicate Detection - Identify duplicate and near-duplicate entries
4. ✅ Data Validation - Ensure data integrity and consistency

Usage:
  npx tsx scripts/comprehensive-memory-sync-automation.ts [--apply]

Options:
  --apply    Execute changes (default is dry-run mode)
  --help     Show this help message

Examples:
  npx tsx scripts/comprehensive-memory-sync-automation.ts
  npx tsx scripts/comprehensive-memory-sync-automation.ts --apply

Safety:
  - By default, runs in DRY RUN mode to preview changes
  - Use --apply flag to execute actual database changes
  - Always review the analysis before applying changes

Database: Memory Sync Governance Sidequest (${DATABASE_ID})
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    printUsage();
    return;
  }
  
  const shouldApply = args.includes('--apply');
  
  try {
    await executeComprehensiveAutomation(!shouldApply);
  } catch (error: any) {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);