#!/usr/bin/env tsx

/**
 * Simple projectID backfill with detailed logging to understand why previous scripts failed
 */

import { createNotionClient } from '../src/utils/notionClient';

async function simpleProjectIDBackfill() {
  const token = process.env.NOTION_TOKEN;
  
  if (!token) {
    console.error('❌ Missing NOTION_TOKEN environment variable');
    process.exit(1);
  }
  
  const client = createNotionClient(token);
  const wtProjectsDbId = '23ce1901-e36e-811b-946b-c3e7d764c335';
  
  console.log('🚀 Starting simple projectID backfill...\n');
  
  try {
    // Get all records
    const allRecords = await client.queryDatabase({
      database_id: wtProjectsDbId,
      page_size: 100
    });
    
    console.log(`📊 Found ${allRecords.results.length} total records\n`);
    
    let counter = 1;
    let updatedCount = 0;
    let skippedCount = 0;
    
    for (const record of allRecords.results) {
      const title = record.properties.Title?.title?.[0]?.plain_text || 'Untitled';
      const currentProjectID = record.properties.projectID?.rich_text?.[0]?.plain_text || '';
      
      console.log(`📋 Processing: ${title}`);
      console.log(`   - Current projectID: "${currentProjectID}"`);
      
      if (currentProjectID) {
        console.log(`   - ⏭️  Skipping: Already has value\n`);
        skippedCount++;
        continue;
      }
      
      // Generate projectID using the same logic as WT-8.0.5
      const projectID = `WT-UX${counter}`;
      console.log(`   - 🎯 Generating projectID: ${projectID}`);
      
      try {
        // Apply update
        const updateResult = await client.client.pages.update({
          page_id: record.id,
          properties: {
            projectID: {
              rich_text: [{ text: { content: projectID } }]
            }
          }
        });
        
        console.log(`   - ✅ Update successful at: ${updateResult.last_edited_time}`);
        
        // Verify immediately
        const verifyRecord = await client.client.pages.retrieve({ page_id: record.id });
        const newProjectID = verifyRecord.properties.projectID?.rich_text?.[0]?.plain_text || '';
        
        if (newProjectID === projectID) {
          console.log(`   - ✅ Verification successful: "${newProjectID}"\n`);
          updatedCount++;
          counter++;
        } else {
          console.log(`   - ❌ Verification failed: Expected "${projectID}", got "${newProjectID}"\n`);
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error) {
        console.log(`   - ❌ Update failed: ${error.message}\n`);
      }
    }
    
    console.log('📊 Final Results:');
    console.log(`   - Total records: ${allRecords.results.length}`);
    console.log(`   - Successfully updated: ${updatedCount}`);
    console.log(`   - Skipped (had values): ${skippedCount}`);
    console.log(`   - Success rate: ${Math.round((updatedCount / (updatedCount + skippedCount)) * 100)}%`);
    
    if (updatedCount > 0) {
      console.log('\n✅ ProjectID backfill completed successfully!');
      console.log('🔗 Check database: https://www.notion.so/roammigrationlaw/23ce1901e36e811b946bc3e7d764c335?v=23ce1901e36e8139b66a000c1383cfd2');
    } else {
      console.log('\n⚠️  No updates were made. All records already have projectID values.');
    }
    
  } catch (error) {
    console.error('❌ Error during backfill:', error);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  simpleProjectIDBackfill().catch(console.error);
}