#!/usr/bin/env tsx

/**
 * JSONL to Canonical Migration Script - OF-8.6
 * Migrates all JSONL files to canonical database and Complize systems
 */

import { jsonlMigrationService } from '../src/services/jsonlMigrationService';
import { enhancedGovernanceLogger } from '../src/services/enhancedGovernanceLogger';

async function main() {
  console.log('🚀 Starting JSONL to Canonical Migration - OF-8.6');
  console.log('=' .repeat(60));

  try {
    // Initialize migration service
    console.log('📋 Initializing migration service...');
    await jsonlMigrationService.initialize();

    // Execute migration for OF-8.6 project
    console.log('🔄 Executing migration for OF-8.6 project...');
    const migrationIds = await jsonlMigrationService.executeMigrationForProject('OF-8.6');

    console.log(`✅ Migration initiated with ${migrationIds.length} plans`);
    console.log('Migration IDs:', migrationIds);

    // Wait for migrations to complete
    console.log('⏳ Waiting for migrations to complete...');
    await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds

    // Get migration results
    console.log('📊 Migration Results:');
    console.log('=' .repeat(40));

    for (const migrationId of migrationIds) {
      const result = await jsonlMigrationService.getMigrationResult(migrationId);
      if (result) {
        console.log(`
Migration ID: ${migrationId}
Plan: ${result.planId}
Status: ${result.status}
Records Processed: ${result.statistics.recordsProcessed}
Records Migrated: ${result.statistics.recordsMigrated}
Records Failed: ${result.statistics.recordsFailed}
Canonical DB: ${result.targets.canonicalDB.migrated} migrated, ${result.targets.canonicalDB.failed} failed
Complize System: ${result.targets.complizeSystem.migrated} migrated, ${result.targets.complizeSystem.failed} failed
Azure Storage: ${result.targets.azureStorage.migrated} migrated, ${result.targets.azureStorage.failed} failed
Memory Anchors: ${result.targets.memoryAnchors.created} created, ${result.targets.memoryAnchors.failed} failed
Duration: ${new Date(result.endTime).getTime() - new Date(result.startTime).getTime()}ms
        `);

        if (result.errors.length > 0) {
          console.log('❌ Errors:');
          result.errors.forEach(error => console.log(`  - ${error}`));
        }

        if (result.warnings.length > 0) {
          console.log('⚠️ Warnings:');
          result.warnings.forEach(warning => console.log(`  - ${warning}`));
        }

        if (result.recommendations.length > 0) {
          console.log('💡 Recommendations:');
          result.recommendations.forEach(rec => console.log(`  - ${rec}`));
        }
      }
    }

    // Validate migration integrity
    console.log('🔍 Validating migration integrity...');
    const integrity = await jsonlMigrationService.validateMigrationIntegrity();
    
    console.log('📋 Integrity Check Results:');
    console.log(`  Canonical DB: ${integrity.canonicalDBIntegrity ? '✅' : '❌'}`);
    console.log(`  Complize System: ${integrity.complizeIntegrity ? '✅' : '❌'}`);
    console.log(`  Azure Storage: ${integrity.azureStorageIntegrity ? '✅' : '❌'}`);
    console.log(`  Memory Anchors: ${integrity.memoryAnchorsIntegrity ? '✅' : '❌'}`);
    console.log(`  Overall: ${integrity.overallIntegrity ? '✅' : '❌'}`);

    // Create governance log for migration completion
    enhancedGovernanceLogger.createPhaseAnchor('of-8.6-jsonl-migration-complete', 'migration');

    console.log('=' .repeat(60));
    console.log('✅ JSONL to Canonical Migration completed successfully!');
    
    if (integrity.overallIntegrity) {
      console.log('🎉 All systems validated - JSONL can now be deprecated');
    } else {
      console.log('⚠️ Some integrity checks failed - review before deprecating JSONL');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    
    // Create error governance log
    enhancedGovernanceLogger.createPhaseAnchor('of-8.6-jsonl-migration-error', 'error');
    
    process.exit(1);
  }
}

// Execute main function
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});