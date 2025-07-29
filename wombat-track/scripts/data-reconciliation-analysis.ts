#!/usr/bin/env tsx

/**
 * WT-8.0.3: Canonical Data Reconciliation & Governance Backfill
 * 
 * Scans all canonical Notion databases for missing fields, orphaned entries,
 * and relationship inconsistencies to generate comprehensive backfill report.
 */

import { createNotionClient } from '../src/utils/notionClient';

interface DatabaseRecord {
  id: string;
  properties: Record<string, any>;
  url: string;
  created_time: string;
  last_edited_time: string;
}

interface ReconciliationIssue {
  databaseName: string;
  recordId: string;
  recordTitle: string;
  issueType: 'missing_field' | 'orphaned_entry' | 'relationship_mismatch' | 'invalid_value';
  fieldName: string;
  currentValue: string;
  suggestedFix: string;
  priority: 'High' | 'Medium' | 'Low';
  category: 'Data Quality' | 'Relationships' | 'Governance' | 'Migration';
}

// Target databases for reconciliation
const TARGET_DATABASES = {
  'wt-project-tracker': '23ce1901-e36e-811b-946b-c3e7d764c335',
  'wt-claude-gizmo-comm': '23ce1901-e36e-81bb-b7d6-f033af88c8e9',
  'wt-tech-debt-register': '23fe1901-e36e-815b-890e-d32337b3ca8b',
  'wt-schema-sync-report': '23fe1901-e36e-819a-8dc3-dd45deaae36e'
};

// Required fields for each database type
const REQUIRED_FIELDS = {
  'wt-project-tracker': ['projectId', 'title', 'description', 'status', 'owner'],
  'wt-claude-gizmo-comm': ['Event ID', 'Event Type', 'Summary', 'Timestamp', 'Author'],
  'wt-tech-debt-register': ['title', 'category', 'priority', 'status', 'originFile'],
  'wt-schema-sync-report': ['tableName', 'fieldName', 'issueType', 'resolution', 'status']
};

// Relationship fields that should link to other databases
const RELATIONSHIP_FIELDS = {
  'linkedPhase': 'wt-phase-tracker',
  'projectId': 'wt-project-tracker',
  'linkedPR': 'external-github',
  'parentPhase': 'wt-phase-tracker'
};

async function scanDatabase(client: any, databaseId: string, databaseName: string): Promise<{
  records: DatabaseRecord[];
  issues: ReconciliationIssue[];
}> {
  const issues: ReconciliationIssue[] = [];
  const records: DatabaseRecord[] = [];

  try {
    console.log(`🔍 Scanning ${databaseName} (${databaseId})...`);
    
    // Query all records in the database
    let hasMore = true;
    let startCursor: string | undefined;
    
    while (hasMore) {
      const response = await client.queryDatabase({
        database_id: databaseId,
        start_cursor: startCursor,
        page_size: 100
      });

      for (const record of response.results) {
        const dbRecord: DatabaseRecord = {
          id: record.id,
          properties: record.properties,
          url: record.url,
          created_time: record.created_time,
          last_edited_time: record.last_edited_time
        };
        records.push(dbRecord);

        // Analyze this record for issues
        const recordIssues = analyzeRecord(dbRecord, databaseName);
        issues.push(...recordIssues);
      }

      hasMore = response.has_more;
      startCursor = response.next_cursor;
    }

    console.log(`   ✅ Found ${records.length} records, ${issues.length} issues`);
    return { records, issues };

  } catch (error) {
    console.error(`   ❌ Error scanning ${databaseName}:`, error);
    return { records: [], issues: [] };
  }
}

function analyzeRecord(record: DatabaseRecord, databaseName: string): ReconciliationIssue[] {
  const issues: ReconciliationIssue[] = [];
  const properties = record.properties;
  
  // Get record title for reference
  const titleProp = properties.title || properties['Event ID'] || properties.tableName || properties.projectId;
  const recordTitle = titleProp?.title?.[0]?.plain_text || 
                     titleProp?.rich_text?.[0]?.plain_text || 
                     'Untitled Record';

  // Check for missing required fields
  const requiredFields = REQUIRED_FIELDS[databaseName] || [];
  for (const fieldName of requiredFields) {
    const fieldValue = properties[fieldName];
    
    if (!fieldValue) {
      issues.push({
        databaseName,
        recordId: record.id,
        recordTitle,
        issueType: 'missing_field',
        fieldName,
        currentValue: 'null',
        suggestedFix: `Add required ${fieldName} field to record`,
        priority: 'High',
        category: 'Data Quality'
      });
    } else {
      // Check if field has actual content
      const hasContent = checkFieldHasContent(fieldValue);
      if (!hasContent) {
        issues.push({
          databaseName,
          recordId: record.id,
          recordTitle,
          issueType: 'missing_field',
          fieldName,
          currentValue: 'empty',
          suggestedFix: `Populate empty ${fieldName} field`,
          priority: 'Medium',
          category: 'Data Quality'
        });
      }
    }
  }

  // Check for orphaned relationship fields
  for (const [fieldName, targetDb] of Object.entries(RELATIONSHIP_FIELDS)) {
    const fieldValue = properties[fieldName];
    if (fieldValue && !checkRelationshipValidity(fieldValue, targetDb)) {
      issues.push({
        databaseName,
        recordId: record.id,
        recordTitle,
        issueType: 'relationship_mismatch',
        fieldName,
        currentValue: getFieldDisplayValue(fieldValue),
        suggestedFix: `Verify ${fieldName} links to valid ${targetDb} record`,
        priority: 'Medium',
        category: 'Relationships'
      });
    }
  }

  // Check for governance-specific issues
  if (databaseName === 'wt-governance-log') {
    issues.push(...analyzeGovernanceRecord(record, recordTitle));
  }

  // Check for tech debt specific issues
  if (databaseName === 'wt-tech-debt-register') {
    issues.push(...analyzeTechDebtRecord(record, recordTitle));
  }

  return issues;
}

function checkFieldHasContent(field: any): boolean {
  if (!field) return false;
  
  switch (field.type) {
    case 'title':
      return field.title && field.title.length > 0 && field.title[0].plain_text.trim() !== '';
    case 'rich_text':
      return field.rich_text && field.rich_text.length > 0 && field.rich_text[0].plain_text.trim() !== '';
    case 'select':
      return field.select && field.select.name && field.select.name.trim() !== '';
    case 'multi_select':
      return field.multi_select && field.multi_select.length > 0;
    case 'checkbox':
      return true; // Checkboxes always have a value (true/false)
    case 'date':
      return field.date && field.date.start;
    case 'url':
      return field.url && field.url.trim() !== '';
    case 'relation':
      return field.relation && field.relation.length > 0;
    default:
      return true; // Assume other types are valid if they exist
  }
}

function checkRelationshipValidity(field: any, targetDb: string): boolean {
  // For now, just check if the relation field has content
  // In a full implementation, we'd verify the target record exists
  if (field.type === 'relation') {
    return field.relation && field.relation.length > 0;
  }
  if (field.type === 'rich_text') {
    return field.rich_text && field.rich_text.length > 0;
  }
  return true;
}

function getFieldDisplayValue(field: any): string {
  if (!field) return 'null';
  
  switch (field.type) {
    case 'title':
      return field.title?.[0]?.plain_text || 'empty';
    case 'rich_text':
      return field.rich_text?.[0]?.plain_text || 'empty';
    case 'select':
      return field.select?.name || 'empty';
    case 'multi_select':
      return field.multi_select?.map(s => s.name).join(', ') || 'empty';
    case 'checkbox':
      return field.checkbox.toString();
    case 'date':
      return field.date?.start || 'empty';
    case 'url':
      return field.url || 'empty';
    case 'relation':
      return `${field.relation?.length || 0} relations`;
    default:
      return 'unknown type';
  }
}

function analyzeGovernanceRecord(record: DatabaseRecord, recordTitle: string): ReconciliationIssue[] {
  const issues: ReconciliationIssue[] = [];
  const props = record.properties;

  // Check for missing governance-specific fields
  if (!props['RAG Status'] || !checkFieldHasContent(props['RAG Status'])) {
    issues.push({
      databaseName: 'wt-governance-log',
      recordId: record.id,
      recordTitle,
      issueType: 'missing_field',
      fieldName: 'RAG Status',
      currentValue: getFieldDisplayValue(props['RAG Status']),
      suggestedFix: 'Add RAG Status (Red/Amber/Green) for governance tracking',
      priority: 'High',
      category: 'Governance'
    });
  }

  // Check for missing memory plugin tags
  if (!props['MemoryPlugin Tags'] || !checkFieldHasContent(props['MemoryPlugin Tags'])) {
    issues.push({
      databaseName: 'wt-governance-log',
      recordId: record.id,
      recordTitle,
      issueType: 'missing_field',
      fieldName: 'MemoryPlugin Tags',
      currentValue: getFieldDisplayValue(props['MemoryPlugin Tags']),
      suggestedFix: 'Add appropriate tags (decision, technical, governance, etc.)',
      priority: 'Medium',
      category: 'Governance'
    });
  }

  return issues;
}

function analyzeTechDebtRecord(record: DatabaseRecord, recordTitle: string): ReconciliationIssue[] {
  const issues: ReconciliationIssue[] = [];
  const props = record.properties;

  // Check for missing effort estimates
  if (!props.effortEstimate || !checkFieldHasContent(props.effortEstimate)) {
    issues.push({
      databaseName: 'wt-tech-debt-register',
      recordId: record.id,
      recordTitle,
      issueType: 'missing_field',
      fieldName: 'effortEstimate',
      currentValue: getFieldDisplayValue(props.effortEstimate),
      suggestedFix: 'Add effort estimate (e.g., "<30min", "1-2 hours", "1+ days")',
      priority: 'Medium',
      category: 'Migration'
    });
  }

  // Check for missing origin file references
  if (!props.originFile || !checkFieldHasContent(props.originFile)) {
    issues.push({
      databaseName: 'wt-tech-debt-register',
      recordId: record.id,
      recordTitle,
      issueType: 'missing_field',
      fieldName: 'originFile',
      currentValue: getFieldDisplayValue(props.originFile),
      suggestedFix: 'Add source file path where the technical debt originated',
      priority: 'High',
      category: 'Migration'
    });
  }

  return issues;
}

function generateBackfillReport(allIssues: ReconciliationIssue[], allRecords: Record<string, DatabaseRecord[]>): string {
  const totalRecords = Object.values(allRecords).reduce((sum, records) => sum + records.length, 0);
  const issuesByDatabase = allIssues.reduce((acc, issue) => {
    if (!acc[issue.databaseName]) acc[issue.databaseName] = [];
    acc[issue.databaseName].push(issue);
    return acc;
  }, {} as Record<string, ReconciliationIssue[]>);

  const issuesByPriority = allIssues.reduce((acc, issue) => {
    if (!acc[issue.priority]) acc[issue.priority] = 0;
    acc[issue.priority]++;
    return acc;
  }, {} as Record<string, number>);

  const issuesByCategory = allIssues.reduce((acc, issue) => {
    if (!acc[issue.category]) acc[issue.category] = 0;
    acc[issue.category]++;
    return acc;
  }, {} as Record<string, number>);

  return `# WT-8.0.3 Data Reconciliation & Governance Backfill Report

**Generated**: ${new Date().toISOString()}  
**Scope**: Canonical database data quality analysis  
**Total Records Analyzed**: ${totalRecords}  
**Total Issues Found**: ${allIssues.length}

---

## 📊 Executive Summary

### **Issue Distribution by Priority**
- **High Priority**: ${issuesByPriority.High || 0} issues
- **Medium Priority**: ${issuesByPriority.Medium || 0} issues  
- **Low Priority**: ${issuesByPriority.Low || 0} issues

### **Issue Distribution by Category**
- **Data Quality**: ${issuesByCategory['Data Quality'] || 0} issues
- **Relationships**: ${issuesByCategory.Relationships || 0} issues
- **Governance**: ${issuesByCategory.Governance || 0} issues
- **Migration**: ${issuesByCategory.Migration || 0} issues

### **Database Health Overview**
| Database | Records | Issues | Health Score |
|----------|---------|--------|--------------|
${Object.entries(allRecords).map(([dbName, records]) => {
  const dbIssues = issuesByDatabase[dbName] || [];
  const healthScore = records.length > 0 ? Math.max(0, 100 - Math.round((dbIssues.length / records.length) * 100)) : 100;
  return `| ${dbName} | ${records.length} | ${dbIssues.length} | ${healthScore}% |`;
}).join('\n')}

---

## 🔍 Detailed Issue Analysis

${Object.entries(issuesByDatabase).map(([dbName, issues]) => `
### **${dbName}**

**Total Issues**: ${issues.length}  
**Records Affected**: ${new Set(issues.map(i => i.recordId)).size}

${issues.slice(0, 10).map(issue => `
**Record**: ${issue.recordTitle}  
**Field**: \`${issue.fieldName}\`  
**Issue**: ${issue.issueType.replace('_', ' ')}  
**Current**: ${issue.currentValue}  
**Fix**: ${issue.suggestedFix}  
**Priority**: ${issue.priority} | **Category**: ${issue.category}

`).join('')}

${issues.length > 10 ? `*...and ${issues.length - 10} more issues*\n` : ''}
`).join('')}

---

## 🎯 Recommended Backfill Actions

### **Immediate (High Priority)**
${allIssues.filter(i => i.priority === 'High').slice(0, 10).map(issue => 
`- **${issue.databaseName}**: ${issue.suggestedFix} (${issue.fieldName})`
).join('\n')}

### **Short Term (Medium Priority)**
${allIssues.filter(i => i.priority === 'Medium').slice(0, 10).map(issue =>
`- **${issue.databaseName}**: ${issue.suggestedFix} (${issue.fieldName})`
).join('\n')}

### **Long Term (Low Priority)**
${allIssues.filter(i => i.priority === 'Low').slice(0, 5).map(issue =>
`- **${issue.databaseName}**: ${issue.suggestedFix} (${issue.fieldName})`
).join('\n')}

---

## 📋 Backfill Implementation Plan

### **Phase 1: Critical Data Quality (Week 1)**
1. **Missing Required Fields**: Focus on high-priority missing fields
2. **Governance Compliance**: Ensure all governance logs have RAG status
3. **Tech Debt Documentation**: Complete origin file references

### **Phase 2: Relationship Integrity (Week 2)**
4. **Link Validation**: Verify all relationship fields point to valid records
5. **Orphaned Record Resolution**: Address records without proper parent links
6. **Cross-Database Consistency**: Ensure data consistency across related databases

### **Phase 3: Enhancement & Optimization (Week 3)**
7. **Optional Field Population**: Complete non-critical missing fields
8. **Data Standardization**: Normalize data formats and conventions
9. **Quality Assurance**: Final validation and cleanup

---

## 🔧 Technical Implementation

### **Automated Backfill Scripts Needed**
- \`populate-missing-fields.ts\` - Bulk field population
- \`validate-relationships.ts\` - Relationship integrity checker
- \`governance-compliance.ts\` - Governance field standardization
- \`data-migration-validator.ts\` - Pre/post migration validation

### **Manual Review Required**
- Complex relationship mappings
- Business logic for default values
- Governance classification decisions
- Priority and effort estimations

---

## 📈 Success Metrics

- **Data Completeness**: Target 95% field population
- **Relationship Integrity**: 100% valid cross-database links
- **Governance Compliance**: All entries have required governance fields
- **Migration Readiness**: Zero blocking data quality issues

---

## 🚨 Critical Findings

${allIssues.filter(i => i.priority === 'High').length > 0 ? `
### **High Priority Issues Require Immediate Attention**
- ${allIssues.filter(i => i.priority === 'High').length} critical data quality issues identified
- Focus on governance compliance and required field population
- Some records may be unusable until backfill is completed
` : '### **No Critical Issues Found**\nData quality is within acceptable parameters for migration.'}

---

*This report provides the foundation for WT-8.0.3 data reconciliation and governance backfill activities. All identified issues should be addressed before proceeding to production oApp integration.*`;
}

async function performDataReconciliation() {
  const token = process.env.NOTION_TOKEN;
  
  if (!token) {
    console.error('❌ Missing NOTION_TOKEN environment variable');
    process.exit(1);
  }

  const client = createNotionClient(token);
  
  console.log('🚀 Starting WT-8.0.3 Data Reconciliation Analysis...\n');

  const allIssues: ReconciliationIssue[] = [];
  const allRecords: Record<string, DatabaseRecord[]> = {};

  // Scan each target database
  for (const [dbName, dbId] of Object.entries(TARGET_DATABASES)) {
    if (dbId) {
      const { records, issues } = await scanDatabase(client, dbId, dbName);
      allRecords[dbName] = records;
      allIssues.push(...issues);
    } else {
      console.log(`⚠️  Skipping ${dbName} - no database ID configured`);
    }
  }

  console.log(`\n✅ Analysis complete!`);
  console.log(`   📊 Total records analyzed: ${Object.values(allRecords).reduce((sum, records) => sum + records.length, 0)}`);
  console.log(`   🔍 Total issues found: ${allIssues.length}`);

  // Generate the backfill report
  const report = generateBackfillReport(allIssues, allRecords);
  
  return { allIssues, allRecords, report };
}

// Export for use in other scripts
export { 
  performDataReconciliation, 
  type ReconciliationIssue, 
  type DatabaseRecord 
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  performDataReconciliation()
    .then(({ report }) => {
      console.log('\n📄 Data reconciliation analysis complete!');
      console.log('   Report generated and ready for export');
    })
    .catch(console.error);
}