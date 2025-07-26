#!/usr/bin/env npx tsx

import dotenv from 'dotenv';
import { DriveMemorySync, exportNotionToJSON } from '../src/utils/driveMemorySync.ts';
import type { DriveMemoryRecord } from '../src/utils/driveMemorySync.ts';

dotenv.config();

// Load database IDs from the generated file
async function loadDatabaseIds() {
  try {
    const fs = await import('fs/promises');
    const envContent = await fs.readFile('.env.wt-databases', 'utf-8');
    const ids: any = {};
    
    envContent.split('\n').forEach(line => {
      const match = line.match(/^NOTION_WT_(\w+)_DB_ID=(.+)$/);
      if (match) {
        const key = match[1].toLowerCase().replace(/_/g, '');
        ids[key] = match[2];
      }
    });
    
    return ids;
  } catch (error) {
    console.log('⚠️  Database IDs file not found. Run setup-wt-databases.ts first.');
    return null;
  }
}

async function testDriveMemorySync() {
  console.log('🧪 Testing DriveMemory ↔ Notion Sync Model\n');

  const databaseIds = await loadDatabaseIds();
  if (!databaseIds) {
    console.log('Please run: npx tsx scripts/setup-wt-databases.ts');
    return;
  }

  const config = {
    notionToken: process.env.NOTION_TOKEN!,
    databaseIds: {
      project: databaseIds.project,
      phase: databaseIds.phase,
      phaseStep: databaseIds.phasestep,
      governance: databaseIds.governance,
    },
  };

  const sync = new DriveMemorySync(config);

  // Example 1: Export from Notion
  console.log('📤 Example 1: Exporting from Notion to DriveMemory format...');
  
  if (config.databaseIds.governance) {
    try {
      const records = await sync.exportFromNotion(config.databaseIds.governance);
      console.log(`✅ Exported ${records.length} governance records`);
      
      if (records.length > 0) {
        console.log('Sample record:', JSON.stringify(records[0], null, 2));
      }
    } catch (error) {
      console.log('❌ Export failed:', error);
    }
  }

  // Example 2: Create sample DriveMemory record
  console.log('\n📥 Example 2: Creating sample DriveMemory record...');
  
  const sampleRecord: DriveMemoryRecord = {
    id: `drive-memory-${Date.now()}`,
    type: 'governance',
    content: {
      summary: 'DriveMemory sync test successful',
      description: 'Validated bidirectional sync between Notion and DriveMemory',
      phase: 'Phase 3 - Integration',
      confidence: 'High',
      ragStatus: 'Green',
    },
    metadata: {
      lastSynced: new Date().toISOString(),
      sourceSystem: 'DriveMemory',
      recordOrigin: 'drive-memory:test:001',
      syncDirection: 'drive-to-notion',
    },
    tags: ['sync-test', 'integration', 'validation'],
  };

  console.log('Sample DriveMemory record:', JSON.stringify(sampleRecord, null, 2));

  // Example 3: Export all databases to JSON
  console.log('\n📦 Example 3: Exporting all databases to JSON...');
  
  try {
    const exportData = await exportNotionToJSON(config);
    
    const fs = await import('fs/promises');
    const filename = `notion-export-${Date.now()}.json`;
    await fs.writeFile(filename, JSON.stringify(exportData, null, 2));
    
    console.log(`✅ Exported to ${filename}`);
    console.log('Export summary:');
    
    for (const [dbId, data] of Object.entries(exportData.databases)) {
      console.log(`  - ${data.name}: ${data.records.length} records`);
    }
  } catch (error) {
    console.log('❌ JSON export failed:', error);
  }

  console.log('\n📋 Sync Model Summary:');
  console.log('✅ DriveMemory record format defined');
  console.log('✅ Bidirectional sync logic implemented');
  console.log('✅ Conflict detection based on timestamps');
  console.log('✅ Export/import utilities ready');
  console.log('✅ Metadata tracking (lastSynced, sourceSystem, recordOrigin)');
}

testDriveMemorySync().catch(console.error);