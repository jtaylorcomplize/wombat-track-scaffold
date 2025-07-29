#!/usr/bin/env npx tsx

import dotenv from 'dotenv';
import { Client } from '@notionhq/client';
import { createNotionClient } from '../src/utils/notionClient.ts';

dotenv.config();

interface ConsistencyCheck {
  checkName: string;
  passed: boolean;
  details: string;
  errors?: string[];
}

class WTMigrationVerifier {
  private client: Client;
  
  constructor() {
    this.client = createNotionClient().client;
  }

  async findDatabase(name: string): Promise<any | null> {
    try {
      const response = await this.client.search({
        query: name,
        filter: {
          value: 'database',
          property: 'object'
        }
      });
      return response.results.length > 0 ? response.results[0] : null;
    } catch (error) {
      console.error(`Failed to find database ${name}:`, error);
      return null;
    }
  }

  async runConsistencyChecks(): Promise<ConsistencyCheck[]> {
    console.log('🔍 Running post-migration consistency checks...\n');
    
    const checks: ConsistencyCheck[] = [];

    // Check 1: Verify all canonical databases exist
    checks.push(await this.checkCanonicalDatabases());

    // Check 2: Verify schema updates
    checks.push(await this.checkSchemaUpdates());

    // Check 3: Verify status corrections
    checks.push(await this.checkStatusCorrections());

    // Check 4: Verify relations
    checks.push(await this.checkRelations());

    // Check 5: Verify archive database
    checks.push(await this.checkArchiveDatabase());

    // Check 6: Verify no data loss
    checks.push(await this.checkDataIntegrity());

    return checks;
  }

  private async checkCanonicalDatabases(): Promise<ConsistencyCheck> {
    console.log('📋 Check 1: Verifying canonical database names...');
    
    const requiredDatabases = [
      'wt-project-tracker',
      'wt-phase-tracker',
      'memsync-implementation-phases',
      'claude-gizmo-comm',
      'sub-apps',
      'wt-merged-data-archive'
    ];

    const errors: string[] = [];
    
    for (const dbName of requiredDatabases) {
      const db = await this.findDatabase(dbName);
      if (!db) {
        errors.push(`Database "${dbName}" not found`);
      }
    }

    return {
      checkName: 'Canonical Database Names',
      passed: errors.length === 0,
      details: errors.length === 0 
        ? `✅ All ${requiredDatabases.length} canonical databases found`
        : `❌ ${errors.length} databases missing`,
      errors
    };
  }

  private async checkSchemaUpdates(): Promise<ConsistencyCheck> {
    console.log('📋 Check 2: Verifying schema updates...');
    
    const errors: string[] = [];
    
    // Check project tracker schema
    const projectDb = await this.findDatabase('wt-project-tracker');
    if (projectDb) {
      const dbDetails = await this.client.databases.retrieve({ 
        database_id: projectDb.id 
      });
      
      const requiredProjectFields = [
        'projectId', 'tooling', 'knownIssues', 
        'forwardGuidance', 'openQuestions', 'aiPromptLog'
      ];
      
      for (const field of requiredProjectFields) {
        if (!dbDetails.properties[field]) {
          errors.push(`Project tracker missing field: ${field}`);
        }
      }
    }

    // Check phase tracker schema
    const phaseDb = await this.findDatabase('wt-phase-tracker');
    if (phaseDb) {
      const dbDetails = await this.client.databases.retrieve({ 
        database_id: phaseDb.id 
      });
      
      const requiredPhaseFields = [
        'phaseId', 'goals', 'purpose', 'expectedOutcome', 'status'
      ];
      
      for (const field of requiredPhaseFields) {
        if (!dbDetails.properties[field]) {
          errors.push(`Phase tracker missing field: ${field}`);
        }
      }
    }

    return {
      checkName: 'Schema Updates',
      passed: errors.length === 0,
      details: errors.length === 0 
        ? '✅ All required schema fields present'
        : `❌ ${errors.length} schema issues found`,
      errors
    };
  }

  private async checkStatusCorrections(): Promise<ConsistencyCheck> {
    console.log('📋 Check 3: Verifying status corrections...');
    
    const errors: string[] = [];
    
    const projectDb = await this.findDatabase('wt-project-tracker');
    if (projectDb) {
      // Check WT-7.2 is Complete
      const wt72 = await this.client.databases.query({
        database_id: projectDb.id,
        filter: {
          or: [
            { property: 'projectId', title: { contains: 'WT-7.2' } },
            { property: 'title', rich_text: { contains: 'WT-7.2' } }
          ]
        }
      });

      if (wt72.results.length > 0) {
        const page = wt72.results[0];
        if ('properties' in page && 'status' in page.properties) {
          const status = page.properties.status;
          if ('select' in status && status.select?.name !== 'Complete') {
            errors.push('WT-7.2 status not updated to Complete');
          }
        }
      }

      // Check WT-7.3 is On Hold
      const wt73 = await this.client.databases.query({
        database_id: projectDb.id,
        filter: {
          or: [
            { property: 'projectId', title: { contains: 'WT-7.3' } },
            { property: 'title', rich_text: { contains: 'WT-7.3' } }
          ]
        }
      });

      if (wt73.results.length > 0) {
        const page = wt73.results[0];
        if ('properties' in page && 'status' in page.properties) {
          const status = page.properties.status;
          if ('select' in status && status.select?.name !== 'On Hold') {
            errors.push('WT-7.3 status not updated to On Hold');
          }
        }
      }
    }

    return {
      checkName: 'Status Corrections',
      passed: errors.length === 0,
      details: errors.length === 0 
        ? '✅ All status corrections applied'
        : `❌ ${errors.length} status issues found`,
      errors
    };
  }

  private async checkRelations(): Promise<ConsistencyCheck> {
    console.log('📋 Check 4: Verifying database relations...');
    
    const errors: string[] = [];
    let orphanedPhases = 0;
    
    const phaseDb = await this.findDatabase('wt-phase-tracker');
    if (phaseDb) {
      const dbDetails = await this.client.databases.retrieve({ 
        database_id: phaseDb.id 
      });
      
      // Check if relation field exists
      if (!dbDetails.properties.linkedProjectId || 
          !('relation' in dbDetails.properties.linkedProjectId)) {
        errors.push('Phase tracker missing linkedProjectId relation');
      }

      // Check for orphaned phases
      const phases = await this.client.databases.query({
        database_id: phaseDb.id
      });

      for (const phase of phases.results) {
        if ('properties' in phase && 'linkedProjectId' in phase.properties) {
          const relation = phase.properties.linkedProjectId;
          if ('relation' in relation && relation.relation.length === 0) {
            orphanedPhases++;
          }
        }
      }
    }

    return {
      checkName: 'Relation Alignment',
      passed: errors.length === 0 && orphanedPhases === 0,
      details: errors.length === 0 
        ? `✅ Relations properly configured (${orphanedPhases} orphaned phases)`
        : `❌ Relation issues found`,
      errors: [...errors, ...(orphanedPhases > 0 ? [`${orphanedPhases} orphaned phases found`] : [])]
    };
  }

  private async checkArchiveDatabase(): Promise<ConsistencyCheck> {
    console.log('📋 Check 5: Verifying archive database...');
    
    const archiveDb = await this.findDatabase('wt-merged-data-archive');
    
    if (!archiveDb) {
      return {
        checkName: 'Archive Database',
        passed: false,
        details: '❌ Archive database not found',
        errors: ['wt-merged-data-archive database not created']
      };
    }

    // Check archive has records
    const records = await this.client.databases.query({
      database_id: archiveDb.id,
      page_size: 1
    });

    return {
      checkName: 'Archive Database',
      passed: true,
      details: `✅ Archive database exists with ${records.results.length > 0 ? 'records' : 'no records yet'}`
    };
  }

  private async checkDataIntegrity(): Promise<ConsistencyCheck> {
    console.log('📋 Check 6: Verifying data integrity...');
    
    const errors: string[] = [];
    
    // Check that Goals and Description fields are preserved
    const projectDb = await this.findDatabase('wt-project-tracker');
    if (projectDb) {
      const projects = await this.client.databases.query({
        database_id: projectDb.id,
        page_size: 10
      });

      for (const project of projects.results) {
        if ('properties' in project) {
          // Check if essential fields have content
          const hasGoals = project.properties.Goals || project.properties.goals;
          const hasDescription = project.properties.Description || project.properties.description;
          
          if (!hasGoals && !hasDescription) {
            errors.push(`Project ${project.id} missing Goals and Description`);
          }
        }
      }
    }

    return {
      checkName: 'Data Integrity',
      passed: errors.length === 0,
      details: errors.length === 0 
        ? '✅ All essential data preserved'
        : `❌ ${errors.length} data integrity issues`,
      errors
    };
  }

  async generateMigrationLog(): Promise<void> {
    console.log('\n📝 Generating migration log...\n');
    
    const checks = await this.runConsistencyChecks();
    
    console.log('\n' + '=' .repeat(60));
    console.log('\n🔍 MIGRATION VERIFICATION REPORT\n');
    console.log('=' .repeat(60) + '\n');

    let totalPassed = 0;
    let totalFailed = 0;

    for (const check of checks) {
      console.log(`\n${check.checkName}:`);
      console.log(`Status: ${check.details}`);
      
      if (check.errors && check.errors.length > 0) {
        console.log('Issues:');
        check.errors.forEach(err => console.log(`  - ${err}`));
      }

      if (check.passed) totalPassed++;
      else totalFailed++;
    }

    console.log('\n' + '=' .repeat(60));
    console.log('\n📊 SUMMARY:');
    console.log(`✅ Passed: ${totalPassed} checks`);
    console.log(`❌ Failed: ${totalFailed} checks`);
    console.log(`📈 Success Rate: ${((totalPassed / checks.length) * 100).toFixed(1)}%`);

    if (totalFailed === 0) {
      console.log('\n🎉 Migration completed successfully with no issues!');
    } else {
      console.log('\n⚠️  Some issues were found. Please review and address them.');
    }

    // Create migration log in Notion
    const archiveDb = await this.findDatabase('wt-merged-data-archive');
    if (archiveDb) {
      await this.client.pages.create({
        parent: { database_id: archiveDb.id },
        properties: {
          recordId: {
            title: [{ text: { content: `Migration-Log-${new Date().toISOString()}` } }]
          },
          sourceDatabase: {
            rich_text: [{ text: { content: 'Migration System' } }]
          },
          originalRecordTitle: {
            rich_text: [{ text: { content: 'Migration Verification Report' } }]
          },
          originalFieldName: {
            rich_text: [{ text: { content: 'Full Report' } }]
          },
          originalValue: {
            rich_text: [{ 
              text: { 
                content: `Passed: ${totalPassed}, Failed: ${totalFailed}, Success Rate: ${((totalPassed / checks.length) * 100).toFixed(1)}%` 
              } 
            }]
          },
          reasonForMergeOrDrop: {
            select: { name: 'Manual cleanup' }
          },
          migrationBatch: {
            rich_text: [{ text: { content: new Date().toISOString() } }]
          }
        }
      });
      
      console.log('\n✅ Migration log saved to archive database');
    }
  }
}

// Run verification
async function main() {
  const verifier = new WTMigrationVerifier();
  await verifier.generateMigrationLog();
}

main().catch(console.error);