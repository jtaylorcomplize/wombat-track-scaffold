import { Client } from '@notionhq/client';
import type { DatabaseObjectResponse } from '@notionhq/client/build/src/api-endpoints';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const PARENT_PAGE_URL = 'https://www.notion.so/roammigrationlaw/Replicated-oApp-Databases-23de1901e36e8082a619c72ebfc05f84';

if (!NOTION_TOKEN) {
  throw new Error('NOTION_TOKEN is required in .env file');
}

const notion = new Client({ auth: NOTION_TOKEN });

// Expected schemas for validation
const EXPECTED_SCHEMAS = {
  'wt-governance-memory': [
    'eventId', 'eventType', 'projectId', 'phaseId', 'agent', 
    'decision', 'confidence', 'timestamp', 'RAG'
  ],
  'wt-project-tracker': [
    'projectId', 'projectName', 'currentPhase', 'status', 'owner', 'lastUpdated'
  ],
  'drive-memory-anchors': [
    'anchorId', 'memoryType', 'content', 'sourceProject', 'createdBy', 'timestamp'
  ],
  'claude-gizmo-exchange': [
    'exchangeId', 'fromAgent', 'toAgent', 'messageType', 'content', 
    'projectContext', 'timestamp'
  ],
  'memory-backlog': [
    'memoryId', 'memoryContent', 'priority', 'targetTable', 'status', 'createdDate'
  ]
};

async function findDatabase(name: string): Promise<DatabaseObjectResponse | null> {
  try {
    const response = await notion.search({
      query: name,
      filter: {
        value: 'database',
        property: 'object'
      },
      page_size: 100
    });

    const databases = response.results.filter(
      (result): result is DatabaseObjectResponse => 
        result.object === 'database' && 
        'title' in result && 
        result.title.length > 0 &&
        result.title[0].type === 'text' &&
        result.title[0].text.content === name
    );

    return databases.length > 0 ? databases[0] : null;
  } catch (error) {
    console.error(`Error searching for database ${name}:`, error);
    return null;
  }
}

async function getTableRowCount(databaseId: string): Promise<number> {
  try {
    const response = await notion.databases.query({
      database_id: databaseId,
      page_size: 100
    });
    return response.results.length;
  } catch (error) {
    console.error(`Error querying database:`, error);
    return 0;
  }
}

async function validateTableSchema(database: DatabaseObjectResponse, expectedFields: string[]): Promise<{
  valid: boolean;
  missingFields: string[];
  extraFields: string[];
  propertyDetails: Record<string, { type: string; options?: any }>;
}> {
  const actualFields = Object.keys(database.properties);
  const missingFields = expectedFields.filter(field => !actualFields.includes(field));
  const extraFields = actualFields.filter(field => !expectedFields.includes(field));
  
  const propertyDetails: Record<string, { type: string; options?: any }> = {};
  
  for (const [key, prop] of Object.entries(database.properties)) {
    const propType = prop.type;
    propertyDetails[key] = { type: propType };
    
    if (propType === 'select' && 'select' in prop && prop.select) {
      propertyDetails[key].options = prop.select.options.map(opt => opt.name);
    } else if (propType === 'multi_select' && 'multi_select' in prop && prop.multi_select) {
      propertyDetails[key].options = prop.multi_select.options.map(opt => opt.name);
    } else if (propType === 'relation' && 'relation' in prop && prop.relation) {
      propertyDetails[key].options = { database_id: prop.relation.database_id };
    }
  }
  
  return {
    valid: missingFields.length === 0,
    missingFields,
    extraFields,
    propertyDetails
  };
}

async function main() {
  console.log('🔍 RAG Memory Tables Verification Report\n');
  console.log(`📅 Date: ${new Date().toISOString()}`);
  console.log(`🔗 Parent Page: ${PARENT_PAGE_URL}\n`);
  console.log('=' .repeat(80));
  
  const report = {
    totalTables: 0,
    foundTables: 0,
    missingTables: [] as string[],
    schemaValidations: {} as Record<string, any>,
    rowCounts: {} as Record<string, number>,
    databaseUrls: {} as Record<string, string>
  };
  
  for (const [tableName, expectedFields] of Object.entries(EXPECTED_SCHEMAS)) {
    report.totalTables++;
    console.log(`\n📊 ${tableName}`);
    console.log('-'.repeat(40));
    
    const database = await findDatabase(tableName);
    
    if (database) {
      report.foundTables++;
      report.databaseUrls[tableName] = database.url;
      
      console.log(`✅ Status: Found`);
      console.log(`🔗 URL: ${database.url}`);
      console.log(`🆔 ID: ${database.id}`);
      
      // Get row count
      const rowCount = await getTableRowCount(database.id);
      report.rowCounts[tableName] = rowCount;
      console.log(`📝 Rows: ${rowCount}`);
      
      // Validate schema
      const validation = await validateTableSchema(database, expectedFields);
      report.schemaValidations[tableName] = validation;
      
      console.log(`\n📋 Schema Validation:`);
      console.log(`   • Valid: ${validation.valid ? '✅ Yes' : '❌ No'}`);
      
      if (validation.missingFields.length > 0) {
        console.log(`   • Missing Fields: ${validation.missingFields.join(', ')}`);
      }
      
      if (validation.extraFields.length > 0) {
        console.log(`   • Extra Fields: ${validation.extraFields.join(', ')}`);
      }
      
      console.log(`\n📋 Property Details:`);
      for (const [field, details] of Object.entries(validation.propertyDetails)) {
        if (expectedFields.includes(field)) {
          console.log(`   • ${field}: ${details.type}`);
          if (details.options) {
            if (Array.isArray(details.options)) {
              console.log(`     Options: ${details.options.join(', ')}`);
            } else if (details.options.database_id) {
              console.log(`     Related to: ${details.options.database_id}`);
            }
          }
        }
      }
    } else {
      report.missingTables.push(tableName);
      console.log(`❌ Status: Not Found`);
    }
  }
  
  // Summary Report
  console.log('\n' + '='.repeat(80));
  console.log('📊 SUMMARY REPORT');
  console.log('='.repeat(80));
  
  console.log(`\n✅ Tables Found: ${report.foundTables}/${report.totalTables}`);
  
  if (report.missingTables.length > 0) {
    console.log(`\n❌ Missing Tables:`);
    report.missingTables.forEach(table => console.log(`   • ${table}`));
  }
  
  console.log(`\n📋 Schema Compliance:`);
  let allSchemasValid = true;
  for (const [table, validation] of Object.entries(report.schemaValidations)) {
    const status = validation.valid ? '✅' : '❌';
    console.log(`   ${status} ${table}`);
    if (!validation.valid) allSchemasValid = false;
  }
  
  console.log(`\n📝 Row Counts:`);
  let totalRows = 0;
  for (const [table, count] of Object.entries(report.rowCounts)) {
    console.log(`   • ${table}: ${count} rows`);
    totalRows += count;
  }
  console.log(`   • Total: ${totalRows} rows`);
  
  console.log(`\n🔗 Database URLs:`);
  for (const [table, url] of Object.entries(report.databaseUrls)) {
    console.log(`   • ${table}:`);
    console.log(`     ${url}`);
  }
  
  // Final Status
  console.log('\n' + '='.repeat(80));
  const overallStatus = report.foundTables === report.totalTables && allSchemasValid;
  if (overallStatus) {
    console.log('✅ ALL RAG MEMORY TABLES ARE PROPERLY CONFIGURED');
  } else {
    console.log('⚠️  SOME ISSUES NEED ATTENTION');
  }
  console.log('='.repeat(80));
}

// Execute verification
main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});