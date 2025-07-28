#!/usr/bin/env node

/**
 * Fix Memory Sync Database Issues
 * 
 * This script can help automatically fix some of the identified issues in the
 * Memory Sync Governance database, such as assigning step numbers.
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
    };
  });
}

async function fixStepNumbering(dryRun: boolean = true): Promise<void> {
  console.log('🔢 Analyzing step numbering issues...\n');
  
  const notion = createNotionClient();
  const entries = await getCurrentEntries();
  
  // Group entries by phase
  const entriesByPhase = entries.reduce((acc, entry) => {
    if (entry.phase) {
      const phaseKey = entry.phase.toString();
      if (!acc[phaseKey]) acc[phaseKey] = [];
      acc[phaseKey].push(entry);
    }
    return acc;
  }, {} as Record<string, DatabaseEntry[]>);
  
  console.log('📊 Current phase/step status:');
  Object.entries(entriesByPhase).forEach(([phase, phaseEntries]) => {
    const withSteps = phaseEntries.filter(e => e.step !== null);
    const withoutSteps = phaseEntries.filter(e => e.step === null);
    
    console.log(`\nPhase ${phase}: ${phaseEntries.length} total entries`);
    console.log(`  ✅ With steps: ${withSteps.length}`);
    console.log(`  ❌ Without steps: ${withoutSteps.length}`);
    
    if (withoutSteps.length > 0) {
      console.log(`  Entries needing step numbers:`);
      withoutSteps.forEach(entry => {
        console.log(`    - "${entry.action}"`);
      });
    }
  });
  
  if (dryRun) {
    console.log('\n🔍 DRY RUN MODE - No changes will be made');
    console.log('💡 Suggested step numbering strategy:');
    
    Object.entries(entriesByPhase).forEach(([phase, phaseEntries]) => {
      const withoutSteps = phaseEntries.filter(e => e.step === null);
      const existingSteps = phaseEntries.filter(e => e.step !== null).map(e => e.step!).sort((a, b) => a - b);
      
      if (withoutSteps.length > 0) {
        const nextStepNumber = existingSteps.length > 0 ? Math.max(...existingSteps) + 1 : 1;
        
        console.log(`\nPhase ${phase} - Assign steps starting from ${nextStepNumber}:`);
        withoutSteps.forEach((entry, index) => {
          console.log(`  ${nextStepNumber + index}. "${entry.action}"`);
        });
      }
    });
    
    console.log('\n🚀 Run with --apply flag to make actual changes');
    return;
  }
  
  // Apply fixes
  console.log('\n🔧 Applying step number fixes...');
  
  for (const [phase, phaseEntries] of Object.entries(entriesByPhase)) {
    const withoutSteps = phaseEntries.filter(e => e.step === null);
    const existingSteps = phaseEntries.filter(e => e.step !== null).map(e => e.step!).sort((a, b) => a - b);
    
    if (withoutSteps.length > 0) {
      const nextStepNumber = existingSteps.length > 0 ? Math.max(...existingSteps) + 1 : 1;
      
      console.log(`\nFixing Phase ${phase} (${withoutSteps.length} entries):`);
      
      for (let i = 0; i < withoutSteps.length; i++) {
        const entry = withoutSteps[i];
        const newStepNumber = nextStepNumber + i;
        
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
        } catch (error) {
          console.log(`  ❌ Failed to update "${entry.action}": ${error}`);
        }
      }
    }
  }
  
  console.log('\n✅ Step numbering fixes completed!');
}

async function addDefaultDescriptions(dryRun: boolean = true): Promise<void> {
  console.log('📝 Analyzing description issues...\n');
  
  const notion = createNotionClient();
  const entries = await getCurrentEntries();
  
  const entriesWithoutDesc = entries.filter(e => !e.description.trim());
  
  console.log(`Found ${entriesWithoutDesc.length} entries without descriptions:`);
  entriesWithoutDesc.forEach(entry => {
    console.log(`  - [Phase ${entry.phase || '?'}.${entry.step || '?'}] "${entry.action}"`);
  });
  
  if (dryRun) {
    console.log('\n🔍 DRY RUN MODE - No changes will be made');
    console.log('💡 Would add placeholder descriptions for entries without them');
    console.log('🚀 Run with --apply flag to make actual changes');
    return;
  }
  
  console.log('\n🔧 Adding placeholder descriptions...');
  
  for (const entry of entriesWithoutDesc) {
    const placeholderDesc = `[TODO: Add detailed description for "${entry.action}" - Phase ${entry.phase || '?'}, Step ${entry.step || '?'}]`;
    
    try {
      await notion.client.pages.update({
        page_id: entry.id,
        properties: {
          Description: {
            rich_text: [
              {
                type: 'text',
                text: {
                  content: placeholderDesc
                }
              }
            ]
          }
        }
      });
      
      console.log(`  ✅ Added description to "${entry.action}"`);
    } catch (error) {
      console.log(`  ❌ Failed to update "${entry.action}": ${error}`);
    }
  }
  
  console.log('\n✅ Description fixes completed!');
}

function printUsage() {
  console.log(`
🔧 Memory Sync Database Fix Utility

Commands:
  fix-steps [--apply]        - Fix missing step numbers
  fix-descriptions [--apply] - Add placeholder descriptions
  all [--apply]             - Run all fixes

Options:
  --apply                   - Actually make changes (default is dry-run)

Examples:
  npx tsx scripts/fix-memory-sync-db-issues.ts fix-steps
  npx tsx scripts/fix-memory-sync-db-issues.ts fix-steps --apply
  npx tsx scripts/fix-memory-sync-db-issues.ts all --apply

Safety:
  - By default, all commands run in DRY RUN mode
  - Use --apply flag to make actual changes
  - Always review the proposed changes before applying
`);
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const shouldApply = args.includes('--apply');
  
  if (!command) {
    printUsage();
    return;
  }
  
  console.log('🔍 Memory Sync Database Fix Utility');
  console.log(`Database ID: ${DATABASE_ID}`);
  console.log(`Mode: ${shouldApply ? 'APPLY CHANGES' : 'DRY RUN'}\n`);
  
  try {
    switch (command) {
      case 'fix-steps':
        await fixStepNumbering(!shouldApply);
        break;
      case 'fix-descriptions':
        await addDefaultDescriptions(!shouldApply);
        break;
      case 'all':
        await fixStepNumbering(!shouldApply);
        console.log('\n' + '-'.repeat(50));
        await addDefaultDescriptions(!shouldApply);
        break;
      default:
        console.log(`❌ Unknown command: ${command}`);
        printUsage();
        break;
    }
  } catch (error: any) {
    console.error('❌ Fix utility failed:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);