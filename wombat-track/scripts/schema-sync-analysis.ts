#!/usr/bin/env tsx

/**
 * WT-8.0.2: Schema Comparison & Sync Report
 * 
 * Compares schemas in Replicated-oApp-Databases against canonical databases
 * to prepare for oApp backend migration.
 */

import { createNotionClient } from '../src/utils/notionClient';

// Canonical database names for comparison
const CANONICAL_DATABASES = [
  'wt-project-tracker',
  'wt-phase-tracker', 
  'wt-governance-log',
  'wt-sdlc-guardrails',
  'wt-tech-debt-register',
  'wt-guardrail-trigger-log',
  'wt-recovery-log'
];

interface SchemaField {
  name: string;
  type: string;
  options?: string[];
  required?: boolean;
}

interface DatabaseSchema {
  name: string;
  databaseId: string;
  fields: SchemaField[];
  url?: string;
}

interface SyncIssue {
  tableName: string;
  fieldName: string;
  issueType: 'missing' | 'renamed' | 'deprecated' | 'type_mismatch' | 'extra_field';
  resolution: 'Map' | 'Add' | 'Ignore' | 'Deprecate';
  canonicalSource: string;
  details: string;
}

async function getReplicatedDatabases(token: string): Promise<DatabaseSchema[]> {
  console.log('🔍 Searching for Replicated-oApp-Databases page...');
  
  const client = createNotionClient(token);
  
  try {
    // Search for the Replicated-oApp-Databases page using the wrapper's search method
    const searchResults = await client.client.search({
      query: 'Replicated-oApp-Databases',
      filter: { property: 'object', value: 'page' }
    });

    if (!searchResults.results.length) {
      throw new Error('Replicated-oApp-Databases page not found');
    }

    const page = searchResults.results[0];
    console.log(`✅ Found page: ${page.id}`);

    // Get child databases
    const children = await client.client.blocks.children.list({
      block_id: page.id
    });

    const databases: DatabaseSchema[] = [];
    
    for (const child of children.results) {
      if (child.type === 'child_database') {
        const dbId = child.id;
        const dbDetails = await client.client.databases.retrieve({ database_id: dbId });
        
        const schema: DatabaseSchema = {
          name: dbDetails.title[0]?.plain_text || 'Untitled',
          databaseId: dbId,
          fields: [],
          url: dbDetails.url
        };

        // Extract field information
        for (const [propName, propConfig] of Object.entries(dbDetails.properties)) {
          const field: SchemaField = {
            name: propName,
            type: propConfig.type,
            required: propName === 'title' // Title fields are typically required
          };

          // Extract options for select/multi_select fields
          if (propConfig.type === 'select' && propConfig.select?.options) {
            field.options = propConfig.select.options.map(opt => opt.name);
          } else if (propConfig.type === 'multi_select' && propConfig.multi_select?.options) {
            field.options = propConfig.multi_select.options.map(opt => opt.name);
          }

          schema.fields.push(field);
        }

        databases.push(schema);
        console.log(`   📊 Database: ${schema.name} (${schema.fields.length} fields)`);
      }
    }

    return databases;
  } catch (error) {
    console.error('❌ Error accessing Replicated-oApp-Databases:', error);
    throw error;
  }
}

async function getCanonicalDatabaseSchemas(token: string): Promise<Record<string, DatabaseSchema>> {
  console.log('🔍 Retrieving canonical database schemas...');
  
  const client = createNotionClient(token);
  const canonicalSchemas: Record<string, DatabaseSchema> = {};

  // Get database IDs from environment or search
  const dbMappings = {
    'wt-project-tracker': process.env.NOTION_WT_PROJECT_DB_ID,
    'wt-phase-tracker': process.env.NOTION_WT_PHASE_DB_ID,
    'wt-governance-log': process.env.NOTION_WT_GOVERNANCE_DB_ID,
    'wt-tech-debt-register': '23fe1901-e36e-815b-890e-d32337b3ca8b' // From recent creation
  };

  for (const dbName of CANONICAL_DATABASES) {
    try {
      let dbId = dbMappings[dbName];
      
      if (!dbId) {
        // Search for the database by name
        console.log(`   🔍 Searching for ${dbName}...`);
        const searchResults = await client.client.search({
          query: dbName,
          filter: { property: 'object', value: 'database' }
        });

        if (searchResults.results.length > 0) {
          dbId = searchResults.results[0].id;
          console.log(`   ✅ Found ${dbName}: ${dbId}`);
        } else {
          console.log(`   ⚠️ ${dbName} not found, skipping...`);
          continue;
        }
      }

      // Get database schema
      const dbDetails = await client.client.databases.retrieve({ database_id: dbId });
      
      const schema: DatabaseSchema = {
        name: dbName,
        databaseId: dbId,
        fields: [],
        url: dbDetails.url
      };

      // Extract field information
      for (const [propName, propConfig] of Object.entries(dbDetails.properties)) {
        const field: SchemaField = {
          name: propName,
          type: propConfig.type,
          required: propName === 'title'
        };

        // Extract options for select fields
        if (propConfig.type === 'select' && propConfig.select?.options) {
          field.options = propConfig.select.options.map(opt => opt.name);
        } else if (propConfig.type === 'multi_select' && propConfig.multi_select?.options) {
          field.options = propConfig.multi_select.options.map(opt => opt.name);
        }

        schema.fields.push(field);
      }

      canonicalSchemas[dbName] = schema;
      console.log(`   ✅ ${dbName}: ${schema.fields.length} fields`);

    } catch (error) {
      console.error(`   ❌ Error retrieving ${dbName}:`, error);
    }
  }

  return canonicalSchemas;
}

function compareSchemas(
  replicatedDbs: DatabaseSchema[], 
  canonicalDbs: Record<string, DatabaseSchema>
): SyncIssue[] {
  console.log('🔄 Comparing schemas...');
  
  const issues: SyncIssue[] = [];

  for (const replicatedDb of replicatedDbs) {
    console.log(`\n📊 Analyzing: ${replicatedDb.name}`);
    
    // Find closest canonical match
    let canonicalMatch = canonicalDbs[replicatedDb.name];
    
    if (!canonicalMatch) {
      // Try fuzzy matching
      const fuzzyMatches = Object.keys(canonicalDbs).filter(name => 
        name.includes(replicatedDb.name.toLowerCase()) || 
        replicatedDb.name.toLowerCase().includes(name.replace('wt-', ''))
      );
      
      if (fuzzyMatches.length > 0) {
        canonicalMatch = canonicalDbs[fuzzyMatches[0]];
        console.log(`   🔗 Fuzzy matched to: ${fuzzyMatches[0]}`);
      }
    }

    if (!canonicalMatch) {
      issues.push({
        tableName: replicatedDb.name,
        fieldName: '*',
        issueType: 'missing',
        resolution: 'Add',
        canonicalSource: 'None',
        details: `Replicated database ${replicatedDb.name} has no canonical equivalent`
      });
      continue;
    }

    // Compare fields
    const canonicalFieldNames = canonicalMatch.fields.map(f => f.name.toLowerCase());
    const replicatedFieldNames = replicatedDb.fields.map(f => f.name.toLowerCase());

    // Check for missing fields in canonical
    for (const repField of replicatedDb.fields) {
      const canonicalField = canonicalMatch.fields.find(f => 
        f.name.toLowerCase() === repField.name.toLowerCase()
      );

      if (!canonicalField) {
        issues.push({
          tableName: replicatedDb.name,
          fieldName: repField.name,
          issueType: 'extra_field',
          resolution: 'Ignore',
          canonicalSource: canonicalMatch.name,
          details: `Field exists in replicated but not in canonical database`
        });
      } else if (canonicalField.type !== repField.type) {
        issues.push({
          tableName: replicatedDb.name,
          fieldName: repField.name,
          issueType: 'type_mismatch',
          resolution: 'Map',
          canonicalSource: canonicalMatch.name,
          details: `Type mismatch: replicated(${repField.type}) vs canonical(${canonicalField.type})`
        });
      }
    }

    // Check for missing fields in replicated
    for (const canonicalField of canonicalMatch.fields) {
      const replicatedField = replicatedDb.fields.find(f => 
        f.name.toLowerCase() === canonicalField.name.toLowerCase()
      );

      if (!replicatedField) {
        issues.push({
          tableName: replicatedDb.name,
          fieldName: canonicalField.name,
          issueType: 'missing',
          resolution: 'Add',
          canonicalSource: canonicalMatch.name,
          details: `Field exists in canonical but missing in replicated database`
        });
      }
    }

    console.log(`   📋 ${issues.filter(i => i.tableName === replicatedDb.name).length} issues found`);
  }

  return issues;
}

function generateSyncReport(
  replicatedDbs: DatabaseSchema[],
  canonicalDbs: Record<string, DatabaseSchema>,
  issues: SyncIssue[]
): string {
  const report = `# WT-8.0.2 Schema Sync Report

**Generated**: ${new Date().toISOString()}  
**Purpose**: Compare Replicated-oApp-Databases against canonical schema  
**Scope**: ${replicatedDbs.length} replicated databases vs ${Object.keys(canonicalDbs).length} canonical databases

---

## 📊 Executive Summary

- **Total Issues Found**: ${issues.length}
- **Missing Fields**: ${issues.filter(i => i.issueType === 'missing').length}
- **Extra Fields**: ${issues.filter(i => i.issueType === 'extra_field').length}
- **Type Mismatches**: ${issues.filter(i => i.issueType === 'type_mismatch').length}
- **Unmatched Tables**: ${issues.filter(i => i.fieldName === '*').length}

---

## 🔍 Database Comparison Matrix

| Replicated Database | Canonical Match | Status | Issues |
|-------------------|----------------|---------|--------|
${replicatedDbs.map(db => {
  const dbIssues = issues.filter(i => i.tableName === db.name);
  const canonicalMatch = Object.values(canonicalDbs).find(cdb => 
    cdb.name === db.name || 
    cdb.name.includes(db.name.toLowerCase()) ||
    db.name.toLowerCase().includes(cdb.name.replace('wt-', ''))
  );
  
  const status = dbIssues.length === 0 ? '✅ Ready' : 
                dbIssues.find(i => i.issueType === 'missing' && i.fieldName === '*') ? '🔴 No Match' :
                dbIssues.length > 5 ? '🟡 Needs Review' : '🟢 Minor Issues';
  
  return `| ${db.name} | ${canonicalMatch?.name || 'None'} | ${status} | ${dbIssues.length} |`;
}).join('\n')}

---

## 🔧 Detailed Issue Analysis

${Object.entries(
  issues.reduce((acc, issue) => {
    if (!acc[issue.tableName]) acc[issue.tableName] = [];
    acc[issue.tableName].push(issue);
    return acc;
  }, {} as Record<string, SyncIssue[]>)
).map(([tableName, tableIssues]) => `
### 📊 ${tableName}

${tableIssues.map(issue => `
**Field**: \`${issue.fieldName}\`  
**Issue**: ${issue.issueType.replace('_', ' ')}  
**Resolution**: ${issue.resolution}  
**Details**: ${issue.details}  
**Canonical Source**: ${issue.canonicalSource}

`).join('')}
`).join('')}

---

## 🎯 Recommended Actions

### Immediate (High Priority)
${issues.filter(i => i.resolution === 'Add' && i.issueType === 'missing').map(i => 
`- **${i.tableName}**: Add missing field \`${i.fieldName}\` from ${i.canonicalSource}`
).join('\n')}

### Medium Priority  
${issues.filter(i => i.resolution === 'Map').map(i =>
`- **${i.tableName}**: Map field \`${i.fieldName}\` (${i.details})`
).join('\n')}

### Low Priority
${issues.filter(i => i.resolution === 'Ignore').map(i =>
`- **${i.tableName}**: Review extra field \`${i.fieldName}\` for deprecation`
).join('\n')}

---

## 📋 Migration Checklist

- [ ] Review all "No Match" databases for deprecation vs new canonical creation
- [ ] Create migration scripts for type mismatches
- [ ] Update replicated schemas with missing canonical fields
- [ ] Validate data integrity post-migration
- [ ] Update oApp backend to use canonical database IDs

---

*Generated as part of WT-8.0.2 Schema Alignment & Canonical Migration*
`;

  return report;
}

async function analyzeSchemasAndGenerateReport() {
  const token = process.env.NOTION_TOKEN;
  
  if (!token) {
    console.error('❌ Missing NOTION_TOKEN environment variable');
    process.exit(1);
  }

  try {
    console.log('🚀 Starting WT-8.0.2 Schema Sync Analysis...\n');

    // Step 1: Get replicated databases
    const replicatedDbs = await getReplicatedDatabases(token);
    console.log(`\n✅ Found ${replicatedDbs.length} replicated databases`);

    // Step 2: Get canonical database schemas
    const canonicalDbs = await getCanonicalDatabaseSchemas(token);
    console.log(`\n✅ Found ${Object.keys(canonicalDbs).length} canonical databases`);

    // Step 3: Compare schemas
    const issues = compareSchemas(replicatedDbs, canonicalDbs);
    console.log(`\n✅ Identified ${issues.length} schema issues`);

    // Step 4: Generate report
    const report = generateSyncReport(replicatedDbs, canonicalDbs, issues);
    
    return { replicatedDbs, canonicalDbs, issues, report };

  } catch (error) {
    console.error('❌ Schema analysis failed:', error);
    throw error;
  }
}

// Export for use in other scripts
export { 
  analyzeSchemasAndGenerateReport, 
  type SyncIssue, 
  type DatabaseSchema 
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  analyzeSchemasAndGenerateReport()
    .then(({ report }) => {
      console.log('\n📄 Generating sync-report.md...');
      // Report will be saved by the main script
      console.log('✅ Analysis complete!');
    })
    .catch(console.error);
}