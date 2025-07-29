#!/usr/bin/env tsx

import { createNotionClient } from '../src/utils/notionClient';

const notion = createNotionClient();

const SUB_APPS_DB_ID = '23ee1901-e36e-81de-ba63-ce1abf2ed31e';

async function verifySubAppsDatabase() {
  console.log('🔍 Verifying Sub-Apps database functionality...');
  
  try {
    // Query the database to verify it works
    const response = await notion.queryDatabase({
      database_id: SUB_APPS_DB_ID,
    });
    
    console.log(`✅ Database query successful - found ${response.results.length} entries`);
    
    // Verify each sample entry
    for (const page of response.results) {
      if ('properties' in page) {
        const name = page.properties.subAppName?.type === 'title' ? 
          page.properties.subAppName.title[0]?.plain_text : 'Unknown';
        const status = page.properties.status?.type === 'select' ? 
          page.properties.status.select?.name : 'No status';
        const programType = page.properties.programType?.type === 'select' ? 
          page.properties.programType.select?.name : 'No type';
        const usesOrbis = page.properties.usesOrbisEngine?.type === 'checkbox' ? 
          page.properties.usesOrbisEngine.checkbox : false;
        
        console.log(`📊 ${name}: ${status} | ${programType} | Orbis: ${usesOrbis ? '✅' : '❌'}`);
      }
    }
    
    // Verify database structure
    const dbInfo = await notion.client.databases.retrieve({ database_id: SUB_APPS_DB_ID });
    
    console.log('\n🏗️  Database structure verification:');
    console.log(`📊 Title: ${dbInfo.title[0]?.plain_text}`);
    
    const expectedFields = [
      'subAppName', 'description', 'status', 'linkedProjects', 
      'primaryLead', 'programType', 'platformIntegration', 
      'launchDate', 'usesOrbisEngine', 'orbisDependencyLevel', 'notes'
    ];
    
    const actualFields = Object.keys(dbInfo.properties);
    
    for (const field of expectedFields) {
      if (actualFields.includes(field)) {
        const fieldType = dbInfo.properties[field].type;
        console.log(`✅ ${field}: ${fieldType}`);
      } else {
        console.log(`❌ Missing field: ${field}`);
      }
    }
    
    console.log('\n🎯 Sub-Apps database verification complete!');
    console.log(`📍 Access database: https://notion.so/${SUB_APPS_DB_ID.replace(/-/g, '')}`);
    
  } catch (error) {
    console.error('❌ Error verifying Sub-Apps database:', error);
    throw error;
  }
}

// Execute if run directly
verifySubAppsDatabase().catch(console.error);

export { verifySubAppsDatabase };