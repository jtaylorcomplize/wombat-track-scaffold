#!/usr/bin/env tsx

/**
 * Build comprehensive internal model of all databases in Canonical Notion WT App
 * https://www.notion.so/roammigrationlaw/Canonical-Notion-WT-App-23ce1901e36e805bbf5ee42eb1204a13
 */

import { createNotionClient } from '../src/utils/notionClient';
import { writeFileSync } from 'fs';
import { join } from 'path';

interface DatabaseField {
  name: string;
  type: string;
  options?: string[];
  required?: boolean;
  emptyCount?: number;
  totalRecords?: number;
}

interface DatabaseModel {
  id: string;
  title: string;
  url: string;
  fields: DatabaseField[];
  recordCount: number;
  emptyFieldAnalysis: {
    fieldName: string;
    emptyCount: number;
    fillable: boolean;
    confidenceLevel: 'high' | 'medium' | 'low';
    suggestedValue?: string;
    reasoning: string;
  }[];
}

interface CanonicalModel {
  parentPageId: string;
  parentPageUrl: string;
  scannedAt: string;
  databases: DatabaseModel[];
  totalDatabases: number;
  totalRecords: number;
  fillableFields: number;
}

async function buildCanonicalDatabaseModel(): Promise<CanonicalModel> {
  const token = process.env.NOTION_TOKEN;
  const parentPageId = '23ce1901-e36e-805b-bf5e-e42eb1204a13';
  
  if (!token) {
    console.error('❌ Missing NOTION_TOKEN environment variable');
    process.exit(1);
  }
  
  const client = createNotionClient(token);
  
  console.log('🔍 Scanning Canonical Notion WT App page for all databases...');
  console.log(`📄 Page: https://www.notion.so/roammigrationlaw/Canonical-Notion-WT-App-23ce1901e36e805bbf5ee42eb1204a13\n`);
  
  const databases: DatabaseModel[] = [];
  let totalRecords = 0;
  let fillableFields = 0;
  
  try {
    // Get child blocks from the parent page
    const children = await client.client.blocks.children.list({
      block_id: parentPageId,
      page_size: 100
    });
    
    console.log(`📋 Found ${children.results.length} child blocks\n`);
    
    // Process each child block looking for databases
    for (const child of children.results) {
      if (child.type === 'child_database') {
        const dbModel = await analyzeDatabaseStructure(client, child.id);
        if (dbModel) {
          databases.push(dbModel);
          totalRecords += dbModel.recordCount;
          fillableFields += dbModel.emptyFieldAnalysis.filter(f => f.fillable).length;
          
          console.log(`✅ Analyzed: ${dbModel.title}`);
          console.log(`   📊 ${dbModel.recordCount} records, ${dbModel.fields.length} fields`);
          console.log(`   🔧 ${dbModel.emptyFieldAnalysis.filter(f => f.fillable).length} fillable empty fields\n`);
        }
      }
    }
    
    // Also check for inline databases by searching
    console.log('🔍 Searching for additional databases...');
    const searchResults = await client.client.search({
      filter: { property: 'object', value: 'database' },
      page_size: 50
    });
    
    for (const db of searchResults.results) {
      // Check if this database is already in our list
      if (!databases.find(d => d.id === db.id)) {
        // Check if it's related to our canonical page (basic heuristic)
        const dbModel = await analyzeDatabaseStructure(client, db.id);
        if (dbModel && (dbModel.title.toLowerCase().includes('wt') || dbModel.title.toLowerCase().includes('wombat'))) {
          databases.push(dbModel);
          totalRecords += dbModel.recordCount;
          fillableFields += dbModel.emptyFieldAnalysis.filter(f => f.fillable).length;
          
          console.log(`✅ Found additional: ${dbModel.title}`);
          console.log(`   📊 ${dbModel.recordCount} records, ${dbModel.fields.length} fields`);
          console.log(`   🔧 ${dbModel.emptyFieldAnalysis.filter(f => f.fillable).length} fillable empty fields\n`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error scanning canonical page:', error);
  }
  
  const canonicalModel: CanonicalModel = {
    parentPageId,
    parentPageUrl: 'https://www.notion.so/roammigrationlaw/Canonical-Notion-WT-App-23ce1901e36e805bbf5ee42eb1204a13',
    scannedAt: new Date().toISOString(),
    databases: databases.sort((a, b) => a.title.localeCompare(b.title)),
    totalDatabases: databases.length,
    totalRecords,
    fillableFields
  };
  
  // Save the model
  const modelPath = join(process.cwd(), 'canonical-db-model.json');
  writeFileSync(modelPath, JSON.stringify(canonicalModel, null, 2));
  
  console.log('📊 Canonical Database Model Summary:');
  console.log(`   🗄️  Total Databases: ${canonicalModel.totalDatabases}`);
  console.log(`   📋 Total Records: ${canonicalModel.totalRecords}`);
  console.log(`   🔧 Fillable Empty Fields: ${canonicalModel.fillableFields}`);
  console.log(`   💾 Model saved: ${modelPath}\n`);
  
  return canonicalModel;
}

async function analyzeDatabaseStructure(client: any, databaseId: string): Promise<DatabaseModel | null> {
  try {
    // Get database metadata
    const dbDetails = await client.client.databases.retrieve({ database_id: databaseId });
    const title = dbDetails.title[0]?.plain_text || 'Untitled Database';
    
    // Get all records to analyze field emptiness
    const records = await client.queryDatabase({
      database_id: databaseId,
      page_size: 100
    });
    
    const fields: DatabaseField[] = [];
    const emptyFieldAnalysis: DatabaseModel['emptyFieldAnalysis'] = [];
    
    // Analyze each field
    for (const [fieldName, fieldConfig] of Object.entries(dbDetails.properties)) {
      let emptyCount = 0;
      
      // Count empty fields across all records
      for (const record of records.results) {
        if (isFieldEmpty(record.properties[fieldName])) {
          emptyCount++;
        }
      }
      
      const field: DatabaseField = {
        name: fieldName,
        type: fieldConfig.type,
        required: fieldName.toLowerCase().includes('title') || fieldName.toLowerCase().includes('id'),
        emptyCount,
        totalRecords: records.results.length
      };
      
      // Add options for select fields
      if (fieldConfig.type === 'select' && fieldConfig.select?.options) {
        field.options = fieldConfig.select.options.map(opt => opt.name);
      } else if (fieldConfig.type === 'multi_select' && fieldConfig.multi_select?.options) {
        field.options = fieldConfig.multi_select.options.map(opt => opt.name);
      }
      
      fields.push(field);
      
      // Analyze if this field is fillable with high confidence
      if (emptyCount > 0) {
        const analysis = analyzeFieldFillability(fieldName, fieldConfig, title, emptyCount, records.results.length);
        emptyFieldAnalysis.push(analysis);
      }
    }
    
    return {
      id: databaseId,
      title,
      url: dbDetails.url,
      fields,
      recordCount: records.results.length,
      emptyFieldAnalysis
    };
    
  } catch (error) {
    console.error(`❌ Error analyzing database ${databaseId}:`, error.message);
    return null;
  }
}

function isFieldEmpty(fieldValue: any): boolean {
  if (!fieldValue) return true;
  
  switch (fieldValue.type) {
    case 'title':
      return !fieldValue.title || fieldValue.title.length === 0 || 
             !fieldValue.title[0]?.plain_text || fieldValue.title[0].plain_text.trim() === '';
    case 'rich_text':
      return !fieldValue.rich_text || fieldValue.rich_text.length === 0 || 
             !fieldValue.rich_text[0]?.plain_text || fieldValue.rich_text[0].plain_text.trim() === '';
    case 'select':
      return !fieldValue.select || !fieldValue.select.name;
    case 'multi_select':
      return !fieldValue.multi_select || fieldValue.multi_select.length === 0;
    case 'checkbox':
      return false; // Checkboxes always have a value
    case 'date':
      return !fieldValue.date || !fieldValue.date.start;
    case 'url':
      return !fieldValue.url || fieldValue.url.trim() === '';
    case 'relation':
      return !fieldValue.relation || fieldValue.relation.length === 0;
    case 'number':
      return fieldValue.number === null || fieldValue.number === undefined;
    default:
      return true;
  }
}

function analyzeFieldFillability(
  fieldName: string, 
  fieldConfig: any, 
  dbTitle: string, 
  emptyCount: number, 
  totalRecords: number
): DatabaseModel['emptyFieldAnalysis'][0] {
  
  let fillable = false;
  let confidenceLevel: 'high' | 'medium' | 'low' = 'low';
  let suggestedValue: string | undefined;
  let reasoning = '';
  
  const fieldLower = fieldName.toLowerCase();
  const dbTitleLower = dbTitle.toLowerCase();
  
  // High confidence deterministic fills
  if (fieldLower === 'status' && fieldConfig.type === 'select') {
    fillable = true;
    confidenceLevel = 'high';
    if (dbTitleLower.includes('project')) {
      suggestedValue = 'Active';
    } else if (dbTitleLower.includes('debt') || dbTitleLower.includes('tech')) {
      suggestedValue = 'Open';
    } else {
      suggestedValue = 'Active';
    }
    reasoning = 'Default status for new records based on database type';
  }
  
  else if (fieldLower === 'priority' && fieldConfig.type === 'select') {
    fillable = true;
    confidenceLevel = 'high';
    suggestedValue = 'Medium';
    reasoning = 'Default priority level for items without explicit priority';
  }
  
  else if (fieldLower === 'canonicaluse' && fieldConfig.type === 'checkbox') {
    fillable = true;
    confidenceLevel = 'high';
    suggestedValue = 'true';
    reasoning = 'All records in canonical databases should be marked as canonical';
  }
  
  else if (fieldLower.includes('assignee') && fieldConfig.type === 'rich_text') {
    fillable = true;
    confidenceLevel = 'high';
    suggestedValue = 'System';
    reasoning = 'Default assignee for system-generated or unassigned items';
  }
  
  // Medium confidence inferred fills
  else if (fieldLower.includes('projectid') && fieldConfig.type === 'rich_text') {
    fillable = true;
    confidenceLevel = 'medium';
    suggestedValue = `AUTO-${Date.now()}`;
    reasoning = 'Generate unique project identifier based on timestamp';
  }
  
  else if (fieldLower === 'category' && fieldConfig.type === 'select') {
    fillable = true;
    confidenceLevel = 'medium';
    if (dbTitleLower.includes('debt')) {
      suggestedValue = 'General';
    } else if (dbTitleLower.includes('sync')) {
      suggestedValue = 'Data Quality';
    } else {
      suggestedValue = 'General';
    }
    reasoning = 'Default category based on database context';
  }
  
  // Low confidence or manual review required
  else if (fieldLower.includes('owner') || fieldLower.includes('author')) {
    fillable = false;
    confidenceLevel = 'low';
    reasoning = 'Ownership assignment requires business judgment - manual review needed';
  }
  
  else if (fieldLower.includes('phase') || fieldLower.includes('pr') || fieldLower.includes('link')) {
    fillable = false;
    confidenceLevel = 'low';
    reasoning = 'Relationship or reference field requires contextual knowledge - manual review needed';
  }
  
  else {
    reasoning = `Unknown field pattern - requires manual review (${emptyCount}/${totalRecords} empty)`;
  }
  
  return {
    fieldName,
    emptyCount,
    fillable,
    confidenceLevel,
    suggestedValue,
    reasoning
  };
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  buildCanonicalDatabaseModel()
    .then((model) => {
      console.log('🎯 Database model build complete!');
      console.log('📄 Ready for high-confidence backfill execution');
    })
    .catch(console.error);
}

export { buildCanonicalDatabaseModel, type CanonicalModel, type DatabaseModel };