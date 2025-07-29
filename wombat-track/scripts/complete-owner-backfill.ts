#!/usr/bin/env tsx

/**
 * Complete the owner field backfill using the canonical user pool
 */

import { createNotionClient } from '../src/utils/notionClient';

const USER_POOL = ['Jackson', 'Gizmo', 'Claude', 'CC-UX Designer'];

async function completeOwnerBackfill() {
  const token = process.env.NOTION_TOKEN;
  
  if (!token) {
    console.error('❌ Missing NOTION_TOKEN environment variable');
    process.exit(1);
  }
  
  const client = createNotionClient(token);
  const wtProjectsDbId = '23ce1901-e36e-811b-946b-c3e7d764c335';
  
  console.log('🚀 Starting owner field backfill...\n');
  
  try {
    // Get all records
    const allRecords = await client.queryDatabase({
      database_id: wtProjectsDbId,
      page_size: 100
    });
    
    console.log(`📊 Found ${allRecords.results.length} total records\n`);
    
    let updatedCount = 0;
    let skippedCount = 0;
    
    for (const record of allRecords.results) {
      const title = record.properties.Title?.title?.[0]?.plain_text || 'Untitled';
      const currentOwner = record.properties.owner?.rich_text?.[0]?.plain_text || '';
      const projectID = record.properties.projectID?.rich_text?.[0]?.plain_text || '';
      
      console.log(`📋 Processing: ${title}`);
      console.log(`   - ProjectID: ${projectID}`);
      console.log(`   - Current owner: "${currentOwner}"`);
      
      if (currentOwner) {
        console.log(`   - ⏭️  Skipping: Already has owner\n`);
        skippedCount++;
        continue;
      }
      
      // Assign random user from pool
      const assignedOwner = USER_POOL[Math.floor(Math.random() * USER_POOL.length)];
      console.log(`   - 🎯 Assigning owner: ${assignedOwner}`);
      
      try {
        // Apply update
        const updateResult = await client.client.pages.update({
          page_id: record.id,
          properties: {
            owner: {
              rich_text: [{ text: { content: assignedOwner } }]
            }
          }
        });
        
        console.log(`   - ✅ Update successful at: ${updateResult.last_edited_time}`);
        
        // Verify immediately
        const verifyRecord = await client.client.pages.retrieve({ page_id: record.id });
        const newOwner = verifyRecord.properties.owner?.rich_text?.[0]?.plain_text || '';
        
        if (newOwner === assignedOwner) {
          console.log(`   - ✅ Verification successful: "${newOwner}"\n`);
          updatedCount++;
        } else {
          console.log(`   - ❌ Verification failed: Expected "${assignedOwner}", got "${newOwner}"\n`);
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
      console.log('\n✅ Owner field backfill completed successfully!');
      console.log('🔗 Check database: https://www.notion.so/roammigrationlaw/23ce1901e36e811b946bc3e7d764c335?v=23ce1901e36e8139b66a000c1383cfd2');
    } else {
      console.log('\n⚠️  No updates were made. All records already have owner values.');
    }
    
  } catch (error) {
    console.error('❌ Error during backfill:', error);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  completeOwnerBackfill().catch(console.error);
}