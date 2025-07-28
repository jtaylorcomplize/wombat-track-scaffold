#!/usr/bin/env node

/**
 * Test Memory Sync Governance Database Access
 * 
 * This script tests access to the specific "Memory Sync Governance Sidequest" database
 * URL: https://www.notion.so/roammigrationlaw/23ce1901e36e80709747d171d17c9ff4
 * Database ID: 23ce1901e36e80709747d171d17c9ff4
 */

import dotenv from 'dotenv';
import { createNotionClient } from '../src/utils/notionClient.js';

// Load environment variables
dotenv.config();

// Extract database ID from the URL
const DATABASE_URL = 'https://www.notion.so/roammigrationlaw/23ce1901e36e80709747d171d17c9ff4?v=23de1901e36e805eacf3000c2116a63b&source=copy_link';
const DATABASE_ID = '23ce1901e36e80709747d171d17c9ff4';

interface MemorySyncEntry {
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

async function extractDatabaseIdFromUrl(url: string): Promise<string> {
  // Notion database URLs follow this pattern:
  // https://www.notion.so/workspace/database-id?v=view-id&other-params
  const match = url.match(/\/([a-f0-9]{32})\?/);
  if (!match) {
    throw new Error('Could not extract database ID from URL');
  }
  return match[1];
}

async function testDatabaseAccess() {
  console.log('🔍 Testing Memory Sync Governance Database Access\n');
  console.log(`Database URL: ${DATABASE_URL}`);
  console.log(`Extracted Database ID: ${DATABASE_ID}\n`);

  try {
    // Create Notion client
    const notion = createNotionClient();
    console.log('✅ Notion client created successfully');

    // Test basic connection
    console.log('🔗 Testing basic Notion API connection...');
    const user = await notion.getUser();
    console.log(`✅ Connected as: ${user.name || user.person?.email || 'Unknown User'}`);

    // Test database access
    console.log('\n📊 Testing database access...');
    const database = await notion.client.databases.retrieve({ 
      database_id: DATABASE_ID 
    });
    
    console.log('✅ Database access successful!');
    console.log(`Database Title: ${database.title?.[0]?.plain_text || 'Untitled'}`);
    console.log(`Database Type: ${database.object}`);
    console.log(`Is Inline: ${database.parent?.type === 'page_id' ? 'Yes (inline)' : 'No (standalone)'}`);
    
    // Analyze schema
    console.log('\n📋 Database Schema:');
    const properties = database.properties;
    for (const [name, property] of Object.entries(properties)) {
      console.log(`  - ${name}: ${property.type}`);
    }

    // Query database contents
    console.log('\n📖 Querying database contents...');
    const response = await notion.queryDatabase({
      database_id: DATABASE_ID,
      page_size: 100
    });

    console.log(`✅ Found ${response.results.length} entries`);

    // Parse and analyze entries
    const entries: MemorySyncEntry[] = response.results.map((page: any) => {
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

    // Analysis
    console.log('\n📊 Data Analysis:');
    
    // Status distribution
    const statusCounts = entries.reduce((acc, entry) => {
      acc[entry.status] = (acc[entry.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('\nStatus Distribution:');
    for (const [status, count] of Object.entries(statusCounts)) {
      console.log(`  - ${status}: ${count}`);
    }

    // Phase distribution
    const phaseCounts = entries.reduce((acc, entry) => {
      const phase = entry.phase?.toString() || 'No Phase';
      acc[phase] = (acc[phase] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('\nPhase Distribution:');
    for (const [phase, count] of Object.entries(phaseCounts)) {
      console.log(`  - Phase ${phase}: ${count}`);
    }

    // Check for step numbering issues
    console.log('\n🔍 Step Numbering Analysis:');
    const stepsWithPhases = entries.filter(e => e.phase && e.step);
    const stepsByPhase = stepsWithPhases.reduce((acc, entry) => {
      const phase = entry.phase!.toString();
      if (!acc[phase]) acc[phase] = [];
      acc[phase].push(entry.step!);
      return acc;
    }, {} as Record<string, number[]>);

    for (const [phase, steps] of Object.entries(stepsByPhase)) {
      const sortedSteps = steps.sort((a, b) => a - b);
      const uniqueSteps = [...new Set(sortedSteps)];
      const duplicates = steps.filter((step, index) => steps.indexOf(step) !== index);
      
      console.log(`  Phase ${phase}:`);
      console.log(`    - Total steps: ${steps.length}`);
      console.log(`    - Unique steps: ${uniqueSteps.length}`);
      console.log(`    - Step range: ${Math.min(...steps)} - ${Math.max(...steps)}`);
      console.log(`    - Steps: ${sortedSteps.join(', ')}`);
      if (duplicates.length > 0) {
        console.log(`    - ⚠️  Duplicate steps: ${[...new Set(duplicates)].join(', ')}`);
      }
      
      // Check for gaps in numbering
      const expectedSteps = Array.from({length: uniqueSteps.length}, (_, i) => i + 1);
      const missingSteps = expectedSteps.filter(step => !uniqueSteps.includes(step));
      if (missingSteps.length > 0) {
        console.log(`    - ⚠️  Missing sequential steps: ${missingSteps.join(', ')}`);
      }
    }

    // Check for entries without phase/step
    const entriesWithoutPhase = entries.filter(e => !e.phase).length;
    const entriesWithoutStep = entries.filter(e => !e.step).length;
    console.log(`\n📊 Completeness Check:`);
    console.log(`  - Entries without Phase: ${entriesWithoutPhase}`);
    console.log(`  - Entries without Step: ${entriesWithoutStep}`);

    // Check description quality
    console.log('\n📝 Description Quality Check:');
    const emptyDescriptions = entries.filter(e => !e.description.trim()).length;
    const shortDescriptions = entries.filter(e => e.description.trim().length < 10).length;
    
    console.log(`  - Empty descriptions: ${emptyDescriptions}`);
    console.log(`  - Short descriptions (<10 chars): ${shortDescriptions}`);

    // Assignment analysis
    console.log('\n👥 Assignment Analysis:');
    const assignedEntries = entries.filter(e => e.assignee.length > 0).length;
    const unassignedEntries = entries.filter(e => e.assignee.length === 0).length;
    console.log(`  - Assigned entries: ${assignedEntries}`);
    console.log(`  - Unassigned entries: ${unassignedEntries}`);
    
    // Due date analysis
    const entriesWithDueDate = entries.filter(e => e.due).length;
    const entriesWithoutDueDate = entries.filter(e => !e.due).length;
    console.log(`\n📅 Due Date Analysis:`);
    console.log(`  - Entries with due date: ${entriesWithDueDate}`);
    console.log(`  - Entries without due date: ${entriesWithoutDueDate}`);

    // Sample entries
    console.log('\n📋 Sample Entries:');
    entries.slice(0, 5).forEach((entry, index) => {
      console.log(`\n  ${index + 1}. ${entry.action}`);
      console.log(`     Phase: ${entry.phase || 'N/A'}, Step: ${entry.step || 'N/A'}`);
      console.log(`     Status: ${entry.status}`);
      console.log(`     Assignee: ${entry.assignee.length > 0 ? entry.assignee.join(', ') : 'Unassigned'}`);
      console.log(`     Due: ${entry.due || 'No due date'}`);
      console.log(`     Description: ${entry.description.substring(0, 100)}${entry.description.length > 100 ? '...' : ''}`);
    });

    // All entries summary
    console.log('\n📊 Complete Entry List:');
    entries.forEach((entry, index) => {
      console.log(`${index + 1}. [Phase ${entry.phase || '?'}.${entry.step || '?'}] ${entry.action} (${entry.status})`);
    });

    console.log('\n✅ Database access test completed successfully!');
    
    return {
      success: true,
      database_id: DATABASE_ID,
      entry_count: entries.length,
      entries: entries,
      schema: properties
    };

  } catch (error: any) {
    console.error('\n❌ Database access failed:', error.message);
    
    if (error.code === 'object_not_found') {
      console.log('\n💡 Possible solutions:');
      console.log('  1. Make sure the database ID is correct');
      console.log('  2. Ensure the Notion integration has access to this database');
      console.log('  3. Check if this is an inline database vs standalone database');
      console.log('  4. Verify the integration is shared with the workspace');
    }
    
    return {
      success: false,
      error: error.message,
      database_id: DATABASE_ID
    };
  }
}

async function main() {
  const result = await testDatabaseAccess();
  
  if (result.success) {
    console.log(`\n🎉 Successfully accessed "${DATABASE_ID}" database!`);
  } else {
    console.log(`\n💥 Failed to access database: ${result.error}`);
    process.exit(1);
  }
}

// Run the test
main().catch(console.error);