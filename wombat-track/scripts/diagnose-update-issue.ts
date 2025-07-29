#!/usr/bin/env tsx

/**
 * Diagnose why Notion API updates aren't being applied
 * Test single field update with detailed logging
 */

import { createNotionClient } from '../src/utils/notionClient';

async function diagnoseUpdateIssue() {
  const token = process.env.NOTION_TOKEN;
  
  if (!token) {
    console.error('❌ Missing NOTION_TOKEN environment variable');
    process.exit(1);
  }
  
  const client = createNotionClient(token);
  
  const wtProjectsDbId = '23ce1901-e36e-811b-946b-c3e7d764c335';
  
  console.log('🔍 Diagnosing Notion API update issue...\n');
  
  try {
    // Step 1: Get records from the database
    console.log('📄 Step 1: Querying database for records...');
    const allRecords = await client.queryDatabase({
      database_id: wtProjectsDbId,
      page_size: 10
    });
    
    console.log(`✅ Found ${allRecords.results.length} records`);
    
    // Find a record with empty projectID
    let testRecord = null;
    for (const record of allRecords.results) {
      const title = record.properties.Title?.title?.[0]?.plain_text || 'Untitled';
      const projectID = record.properties.projectID?.rich_text?.[0]?.plain_text || '';
      
      console.log(`   - ${title}: projectID = "${projectID}"`);
      
      if (!projectID && !testRecord) {
        testRecord = record;
        console.log(`     → Using this record for testing`);
      }
    }
    
    if (!testRecord) {
      console.log('❌ No records with empty projectID found!');
      console.log('All records already have projectID values.');
      return;
    }
    
    // Step 2: Retrieve the test record details
    console.log('\n📄 Step 2: Retrieving test record details...');
    const currentRecord = await client.client.pages.retrieve({ page_id: testRecord.id });
    
    console.log('✅ Record retrieved successfully');
    console.log(`   - Title: ${currentRecord.properties.Title?.title?.[0]?.plain_text || 'Untitled'}`);
    console.log(`   - Current projectID: "${currentRecord.properties.projectID?.rich_text?.[0]?.plain_text || ''}"`)
    console.log(`   - Field type: ${currentRecord.properties.projectID?.type}`);
    console.log(`   - Full projectID property:`, JSON.stringify(currentRecord.properties.projectID, null, 2));
    
    // Step 3: Attempt a simple update
    console.log('\n🔧 Step 3: Attempting to update projectID...');
    const testValue = 'WT-TEST1';
    
    console.log(`   - Setting projectID to: "${testValue}"`);
    console.log('   - Update payload:', JSON.stringify({
      page_id: currentRecord.id,
      properties: {
        projectID: {
          rich_text: [{ text: { content: testValue } }]
        }
      }
    }, null, 2));
    
    const updateResponse = await client.client.pages.update({
      page_id: currentRecord.id,
      properties: {
        projectID: {
          rich_text: [{ text: { content: testValue } }]
        }
      }
    });
    
    console.log('\n✅ Update API call completed');
    console.log(`   - Response status: Success`);
    console.log(`   - Updated at: ${updateResponse.last_edited_time}`);
    
    // Step 4: Verify the update
    console.log('\n🔍 Step 4: Verifying update...');
    const verifyRecord = await client.client.pages.retrieve({ page_id: currentRecord.id });
    const newProjectID = verifyRecord.properties.projectID?.rich_text?.[0]?.plain_text || '';
    
    console.log(`   - New projectID value: "${newProjectID}"`);
    console.log(`   - Update successful? ${newProjectID === testValue ? '✅ YES' : '❌ NO'}`);
    
    if (newProjectID !== testValue) {
      console.log('\n❌ UPDATE FAILED - Value not persisted!');
      console.log('   Possible causes:');
      console.log('   1. Permission issues with the integration');
      console.log('   2. Field is locked or has validation rules');
      console.log('   3. Database has restrictions on this field');
      console.log('   4. API token lacks write permissions');
      
      // Check integration capabilities
      console.log('\n🔐 Step 5: Checking integration permissions...');
      try {
        const user = await client.client.users.me({});
        console.log(`   - Bot type: ${user.type}`);
        console.log(`   - Bot name: ${user.name || 'Unknown'}`);
        console.log(`   - Bot ID: ${user.id}`);
      } catch (error) {
        console.log('   ❌ Could not retrieve bot info:', error.message);
      }
      
      // Try updating a different field
      console.log('\n🔧 Step 6: Testing update on owner field...');
      try {
        await client.client.pages.update({
          page_id: currentRecord.id,
          properties: {
            owner: {
              rich_text: [{ text: { content: 'Test Owner' } }]
            }
          }
        });
        
        const verifyOwner = await client.client.pages.retrieve({ page_id: currentRecord.id });
        const newOwner = verifyOwner.properties.owner?.rich_text?.[0]?.plain_text || '';
        console.log(`   - Owner update successful? ${newOwner === 'Test Owner' ? '✅ YES' : '❌ NO'}`);
        
        if (newOwner !== 'Test Owner') {
          console.log('   ❌ Owner field also failed to update!');
          console.log('   → This suggests a general permission issue');
        }
      } catch (error) {
        console.log('   ❌ Error updating owner field:', error.message);
      }
    } else {
      console.log('\n✅ UPDATE SUCCESSFUL!');
      console.log('   The update mechanism is working correctly.');
      console.log('   Previous scripts may have had issues with:');
      console.log('   - Field name case sensitivity');
      console.log('   - Property type mismatches');
      console.log('   - Incorrect record IDs');
      
      // Clean up test value
      console.log('\n🧹 Cleaning up test value...');
      await client.client.pages.update({
        page_id: currentRecord.id,
        properties: {
          projectID: {
            rich_text: []
          }
        }
      });
      console.log('   ✅ Test value removed');
    }
    
    // Additional diagnostics
    console.log('\n📋 Additional Database Info:');
    const dbInfo = await client.client.databases.retrieve({ database_id: wtProjectsDbId });
    const projectIDProp = dbInfo.properties.projectID;
    console.log(`   - projectID property type: ${projectIDProp?.type}`);
    console.log(`   - projectID property ID: ${projectIDProp?.id}`);
    console.log(`   - Full property config:`, JSON.stringify(projectIDProp, null, 2));
    
  } catch (error) {
    console.error('\n❌ Error during diagnosis:', error);
    console.error('Full error details:', JSON.stringify(error, null, 2));
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  diagnoseUpdateIssue().catch(console.error);
}