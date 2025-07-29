#!/usr/bin/env tsx

/**
 * Verify what updates were actually made to the databases
 */

import { createNotionClient } from '../src/utils/notionClient';

async function verifyDatabaseUpdates() {
  const token = process.env.NOTION_TOKEN;
  
  if (!token) {
    console.error('❌ Missing NOTION_TOKEN environment variable');
    process.exit(1);
  }
  
  const client = createNotionClient(token);
  
  // The specific database you're checking
  const wtProjectsDbId = '23ce1901-e36e-811b-946b-c3e7d764c335';
  
  console.log('🔍 Verifying WT Projects database updates...');
  console.log(`📄 Database: https://www.notion.so/roammigrationlaw/23ce1901e36e811b946bc3e7d764c335\n`);
  
  try {
    // Get all records from the database
    const records = await client.queryDatabase({
      database_id: wtProjectsDbId,
      page_size: 100
    });
    
    console.log(`📊 Total records: ${records.results.length}\n`);
    
    let emptyProjectIDCount = 0;
    let filledProjectIDCount = 0;
    let emptyOwnerCount = 0;
    let filledOwnerCount = 0;
    
    console.log('🔍 Checking each record for projectID and owner fields:\n');
    
    for (const record of records.results) {
      const title = record.properties.Title?.title?.[0]?.plain_text || 'Untitled';
      const projectID = record.properties.projectID?.rich_text?.[0]?.plain_text || '';
      const owner = record.properties.owner?.rich_text?.[0]?.plain_text || '';
      const status = record.properties.status?.select?.name || '';
      const createdAt = record.properties.createdAt?.created_time || '';
      const updatedAt = record.properties.updatedAt?.last_edited_time || '';
      
      // Check if this was updated today
      const wasUpdatedToday = updatedAt && new Date(updatedAt).toDateString() === new Date().toDateString();
      
      console.log(`📋 Record: ${title}`);
      console.log(`   - projectID: ${projectID || '❌ EMPTY'}`);
      console.log(`   - owner: ${owner || '❌ EMPTY'}`);
      console.log(`   - status: ${status || '❌ EMPTY'}`);
      console.log(`   - Updated today: ${wasUpdatedToday ? '✅ YES' : '❌ NO'}`);
      console.log(`   - Last updated: ${updatedAt ? new Date(updatedAt).toLocaleString() : 'Never'}\n`);
      
      if (!projectID) emptyProjectIDCount++;
      else filledProjectIDCount++;
      
      if (!owner) emptyOwnerCount++;
      else filledOwnerCount++;
    }
    
    console.log('📊 Summary:');
    console.log(`   - projectID: ${filledProjectIDCount} filled, ${emptyProjectIDCount} empty`);
    console.log(`   - owner: ${filledOwnerCount} filled, ${emptyOwnerCount} empty`);
    
    // Also check other key databases
    console.log('\n🔍 Checking other databases for recent updates...\n');
    
    const otherDatabases = [
      { id: '23ce1901-e36e-81be-b6b8-e576174024e5', name: 'WT Phase Database' },
      { id: '23fe1901-e36e-815b-890e-d32337b3ca8b', name: 'wt-tech-debt-register' },
      { id: '23fe1901-e36e-8182-a7ab-dbf4441d82f0', name: 'wt-backfill-task-tracker' }
    ];
    
    for (const db of otherDatabases) {
      try {
        const dbRecords = await client.queryDatabase({
          database_id: db.id,
          page_size: 10,
          sorts: [{ property: 'updatedAt', direction: 'descending' }]
        });
        
        let updatedToday = 0;
        for (const record of dbRecords.results) {
          const updatedAt = record.properties.updatedAt?.last_edited_time || 
                           record.properties['Last edited time']?.last_edited_time;
          if (updatedAt && new Date(updatedAt).toDateString() === new Date().toDateString()) {
            updatedToday++;
          }
        }
        
        console.log(`📊 ${db.name}: ${updatedToday} records updated today`);
        
      } catch (error) {
        console.log(`   ❌ Error checking ${db.name}: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error verifying database:', error);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  verifyDatabaseUpdates().catch(console.error);
}