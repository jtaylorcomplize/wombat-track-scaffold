#!/usr/bin/env tsx

/**
 * WT-8.0.2: Create Schema Sync Report Database
 * 
 * Creates wt-schema-sync-report in Notion for tracking schema alignment
 * and migration issues during oApp backend integration.
 */

import { NotionDatabaseCreator } from '../src/utils/notionDatabaseCreator';
import { createNotionClient } from '../src/utils/notionClient';

// Sample schema sync entries to demonstrate the system
const SAMPLE_SYNC_ENTRIES = [
  {
    tableName: 'WT Projects',
    fieldName: 'projectType',
    issueType: 'Missing',
    resolution: 'Add',
    canonicalSource: 'wt-project-tracker',
    status: 'Resolved',
    notes: 'Field successfully added to maintain project categorization consistency',
  },
  {
    tableName: 'WT Phase Database', 
    fieldName: 'ragStatus',
    issueType: 'Type Mismatch',
    resolution: 'Map',
    canonicalSource: 'wt-phase-tracker',
    status: 'In Progress',
    notes: 'Converting from text field to select field for better data consistency',
  },
  {
    tableName: 'Sub-Apps',
    fieldName: 'legacyField',
    issueType: 'Deprecated',
    resolution: 'Deprecate',
    canonicalSource: 'wt-sub-apps-registry',
    status: 'Open',
    notes: 'Field no longer used in current architecture, safe to remove in next migration',
  },
  {
    tableName: 'MemSync Implementation',
    fieldName: 'syncStatus',
    issueType: 'Extra Field',
    resolution: 'Ignore',
    canonicalSource: 'wt-memory-sync',
    status: 'Deferred',
    notes: 'Custom field specific to memory sync, not needed in canonical schema',
  },
  {
    tableName: 'Tech Debt Register',
    fieldName: 'effortEstimate',
    issueType: 'Renamed',
    resolution: 'Map',
    canonicalSource: 'wt-tech-debt-register',
    status: 'Resolved',
    notes: 'Successfully mapped from estimatedEffort to effortEstimate for consistency',
  }
];

async function createSchemaSyncDatabase() {
  const token = process.env.NOTION_TOKEN;
  const parentPageId = process.env.NOTION_PARENT_PAGE_ID;

  if (!token || !parentPageId) {
    console.error('❌ Missing required environment variables:');
    console.error('   - NOTION_TOKEN');
    console.error('   - NOTION_PARENT_PAGE_ID');
    process.exit(1);
  }

  console.log('🏗️  Creating wt-schema-sync-report database...');

  try {
    // Create the database
    const creator = new NotionDatabaseCreator(token, parentPageId);
    const schema = NotionDatabaseCreator.getSchemaSyncReportSchema();
    
    const result = await creator.createDatabase(schema);
    
    if (!result.success) {
      throw new Error(result.error);
    }

    console.log(`✅ Database created successfully!`);
    console.log(`   Database ID: ${result.databaseId}`);
    console.log(`   URL: ${result.url}`);

    // Populate with sample entries
    console.log(`\\n📝 Populating with ${SAMPLE_SYNC_ENTRIES.length} sample sync entries...`);
    
    const client = createNotionClient(token);
    let successCount = 0;
    let errorCount = 0;

    for (const [index, entry] of SAMPLE_SYNC_ENTRIES.entries()) {
      try {
        await client.writePage({
          parent: { database_id: result.databaseId! },
          properties: {
            tableName: {
              title: [{ text: { content: entry.tableName } }],
            },
            fieldName: {
              rich_text: [{ text: { content: entry.fieldName } }],
            },
            issueType: {
              select: { name: entry.issueType },
            },
            resolution: {
              select: { name: entry.resolution },
            },
            canonicalSource: {
              rich_text: [{ text: { content: entry.canonicalSource } }],
            },
            status: {
              select: { name: entry.status },
            },
            notes: {
              rich_text: [{ text: { content: entry.notes } }],
            },
            linkedPhase: {
              rich_text: [{ text: { content: 'WT-8.0.2' } }],
            },
          },
        });

        successCount++;
        console.log(`   ✅ Added: ${entry.tableName} → ${entry.fieldName}`);
      } catch (error) {
        errorCount++;
        console.error(`   ❌ Failed to add: ${entry.tableName} → ${entry.fieldName}`);
        console.error(`      Error: ${error}`);
      }
    }

    console.log(`\\n📊 Summary:`);
    console.log(`   ✅ Successfully added: ${successCount} entries`);
    if (errorCount > 0) {
      console.log(`   ❌ Failed: ${errorCount} entries`);
    }
    console.log(`   🔗 Database URL: ${result.url}`);

    console.log(`\\n🎯 WT-8.0.2 Schema Sync Framework Ready:`);
    console.log(`   1. Schema sync tracking database created`);
    console.log(`   2. Sample issues documented for reference`);
    console.log(`   3. Integration points identified`);
    console.log(`   4. Ready for oApp backend migration`);

    console.log(`\\n📋 Next Actions:`);
    console.log(`   • Review sample entries in Notion`);
    console.log(`   • Configure automated schema monitoring`);
    console.log(`   • Set up oApp integration endpoints`);
    console.log(`   • Establish regular sync reporting schedule`);

  } catch (error) {
    console.error(`❌ Failed to create schema sync database:`, error);
    process.exit(1);
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  createSchemaSyncDatabase().catch(console.error);
}

export { createSchemaSyncDatabase, SAMPLE_SYNC_ENTRIES };