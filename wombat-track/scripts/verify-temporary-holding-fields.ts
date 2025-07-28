#!/usr/bin/env npx tsx

/**
 * Verify Temporary Holding Table Field Compliance
 * 
 * This script verifies that all entries in the Temporary Holding Table
 * contain the required fields according to the workflow design specification
 */

import { createNotionClient } from '../src/utils/notionClient.js';
import dotenv from 'dotenv';

dotenv.config();

const TEMPORARY_HOLDING_TABLE_ID = process.env.NOTION_TEMPORARY_HOLDING_TABLE_ID || '23de1901-e36e-81e2-bff2-ca4451f734ec';

// Required fields according to workflow design
const REQUIRED_FIELDS = [
  'BlockTitle',
  'RawText', 
  'SourceDoc',
  'BlockID',
  'ParsePass',
  'BlockNumber',
  'BlockCategory',
  'ReadyForRouting',
  'Created'
];

class FieldComplianceVerifier {
  private notionClient: any;

  constructor() {
    this.notionClient = createNotionClient(process.env.NOTION_TOKEN);
  }

  async verifyAllEntries(): Promise<void> {
    try {
      console.log('🔍 Verifying field compliance for all Temporary Holding Table entries...');
      
      const response = await this.notionClient.client.databases.query({
        database_id: TEMPORARY_HOLDING_TABLE_ID,
        page_size: 100
      });

      const entries = response.results;
      console.log(`📊 Verifying ${entries.length} entries...`);

      let compliantEntries = 0;
      const issues: string[] = [];

      for (const entry of entries) {
        const entryTitle = entry.properties?.BlockTitle?.title?.[0]?.text?.content || 'Untitled';
        const blockId = entry.properties?.BlockID?.rich_text?.[0]?.text?.content || 'No ID';
        
        console.log(`\n📦 Checking entry: ${entryTitle} (${blockId})`);
        
        const missingFields = this.checkRequiredFields(entry);
        
        if (missingFields.length === 0) {
          console.log('   ✅ All required fields present');
          compliantEntries++;
        } else {
          console.log(`   ❌ Missing fields: ${missingFields.join(', ')}`);
          issues.push(`${entryTitle} (${blockId}): Missing ${missingFields.join(', ')}`);
        }

        // Verify specific field values
        this.verifyFieldValues(entry, entryTitle);
      }

      this.displayComplianceReport(entries.length, compliantEntries, issues);

    } catch (error) {
      console.error('❌ Error verifying field compliance:', error);
      throw error;
    }
  }

  private checkRequiredFields(entry: any): string[] {
    const missingFields: string[] = [];
    
    for (const field of REQUIRED_FIELDS) {
      const property = entry.properties?.[field];
      
      if (!property && field !== 'Created') {
        missingFields.push(field);
        continue;
      }

      // Check if field has content based on its type
      const isEmpty = this.isFieldEmpty(property, field, entry);
      if (isEmpty) {
        missingFields.push(field);
      }
    }

    return missingFields;
  }

  private isFieldEmpty(property: any, fieldName: string, entry?: any): boolean {
    switch (fieldName) {
      case 'BlockTitle':
        return !property.title || property.title.length === 0 || !property.title[0]?.text?.content;
      
      case 'RawText':
      case 'BlockID':
        return !property.rich_text || property.rich_text.length === 0 || !property.rich_text[0]?.text?.content;
      
      case 'ParsePass':
      case 'BlockNumber':
        return property.number === null || property.number === undefined;
      
      case 'BlockCategory':
        return !property.select || !property.select.name;
      
      case 'ReadyForRouting':
        return property.checkbox === null || property.checkbox === undefined;
      
      case 'SourceDoc':
        return !property.relation || property.relation.length === 0;
      
      case 'Created':
        return !entry?.created_time;
      
      default:
        return true;
    }
  }

  private verifyFieldValues(entry: any, entryTitle: string): void {
    const properties = entry.properties;
    
    // Verify BlockID format
    const blockId = properties?.BlockID?.rich_text?.[0]?.text?.content;
    if (blockId && !blockId.match(/^\$wt_unsorted_block_\d+_parse_\d+$/)) {
      console.log(`   ⚠️  BlockID format issue: ${blockId}`);
    }

    // Verify ParsePass is 1
    const parsePass = properties?.ParsePass?.number;
    if (parsePass !== 1) {
      console.log(`   ⚠️  ParsePass should be 1, found: ${parsePass}`);
    }

    // Verify BlockNumber is between 1-10
    const blockNumber = properties?.BlockNumber?.number;
    if (blockNumber && (blockNumber < 1 || blockNumber > 10)) {
      console.log(`   ⚠️  BlockNumber out of range (1-10): ${blockNumber}`);
    }

    // Verify BlockCategory is valid
    const category = properties?.BlockCategory?.select?.name;
    const validCategories = ['GovernanceLog', 'PhaseStep', 'WT Docs Artefact'];
    if (category && !validCategories.includes(category)) {
      console.log(`   ⚠️  Invalid BlockCategory: ${category}`);
    }

    // Verify SourceDoc relation exists
    const sourceDoc = properties?.SourceDoc?.relation;
    if (!sourceDoc || sourceDoc.length === 0) {
      console.log(`   ⚠️  Missing SourceDoc relation`);
    }
  }

  private displayComplianceReport(totalEntries: number, compliantEntries: number, issues: string[]): void {
    console.log('\n' + '='.repeat(80));
    console.log('📊 TEMPORARY HOLDING TABLE FIELD COMPLIANCE REPORT');
    console.log('='.repeat(80));
    
    console.log(`\n📈 Compliance Summary:`);
    console.log(`   Total Entries: ${totalEntries}`);
    console.log(`   Compliant Entries: ${compliantEntries}`);
    console.log(`   Non-Compliant Entries: ${totalEntries - compliantEntries}`);
    console.log(`   Compliance Rate: ${totalEntries > 0 ? Math.round((compliantEntries / totalEntries) * 100) : 0}%`);

    console.log(`\n✅ Required Fields (${REQUIRED_FIELDS.length}):`);
    REQUIRED_FIELDS.forEach((field, index) => {
      console.log(`   ${index + 1}. ${field}`);
    });

    if (issues.length > 0) {
      console.log(`\n❌ Issues Found (${issues.length}):`);
      issues.forEach((issue, index) => {
        console.log(`   ${index + 1}. ${issue}`);
      });
    } else {
      console.log(`\n🎉 No compliance issues found!`);
    }

    console.log(`\n📋 Field Specifications Verified:`);
    console.log(`   ✅ BlockTitle (title field)`);
    console.log(`   ✅ RawText (rich text field with full content)`);
    console.log(`   ✅ BlockID (text field with format $wt_unsorted_block_<#>_parse_1)`);
    console.log(`   ✅ BlockNumber (number field, 1-10)`);
    console.log(`   ✅ ParsePass (number field, value: 1)`);
    console.log(`   ✅ SourceDoc (relation to Unsorted Content Register)`);
    console.log(`   ✅ BlockCategory (select: GovernanceLog, PhaseStep, WT Docs Artefact)`);
    console.log(`   ✅ ReadyForRouting (checkbox field)`);
    console.log(`   ✅ Created (automatic date field)`);
  }
}

async function main() {
  console.log('🔍 Starting Field Compliance Verification');
  console.log(`📍 Database: https://www.notion.so/roammigrationlaw/${TEMPORARY_HOLDING_TABLE_ID}`);
  console.log('🎯 Checking all required fields per workflow design\n');
  
  const verifier = new FieldComplianceVerifier();
  
  try {
    await verifier.verifyAllEntries();
    console.log('\n🎉 Field compliance verification completed!');
    
  } catch (error) {
    console.error('💥 Verification failed:', error);
    process.exit(1);
  }
}

// Execute if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { FieldComplianceVerifier };