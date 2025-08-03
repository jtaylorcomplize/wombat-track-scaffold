#!/usr/bin/env tsx

/**
 * WT-DBM-2.0 Canonical Rebuild - Step 1 & 2
 * Archive current data and truncate live tables
 * 
 * Operations:
 * 1. Create archive tables with timestamp suffix
 * 2. Backup current Projects and Phases data
 * 3. Verify archive counts
 * 4. Truncate live tables
 * 5. Confirm readiness for CSV import
 */

import DatabaseManager from '../src/server/database/connection';

async function archiveAndTruncate() {
  console.log('🎯 WT-DBM-2.0 Canonical Rebuild - Archive & Truncate');
  console.log('================================================');
  
  const dbManager = DatabaseManager.getInstance();
  const db = await dbManager.getConnection('production');
  
  try {
    // Step 1: Create archive tables with timestamp
    const timestamp = '20250803';
    console.log(`\n📦 Step 1: Creating archive tables with timestamp ${timestamp}`);
    
    // SQLite doesn't have schema support like MySQL/PostgreSQL, so we'll use table prefixes
    const archiveProjectsTable = `Archive_Projects_${timestamp}`;
    const archivePhasesTable = `Archive_Phases_${timestamp}`;
    
    // Create archive tables by copying structure and data
    await db.exec(`
      CREATE TABLE IF NOT EXISTS ${archiveProjectsTable} AS 
      SELECT * FROM projects;
    `);
    console.log(`   ✓ Created ${archiveProjectsTable}`);
    
    await db.exec(`
      CREATE TABLE IF NOT EXISTS ${archivePhasesTable} AS 
      SELECT * FROM phases;
    `);
    console.log(`   ✓ Created ${archivePhasesTable}`);
    
    // Step 2: Verify archive counts
    console.log('\n🔍 Step 2: Verifying archive table counts');
    
    const projectsCount = await db.get(`SELECT COUNT(*) as count FROM ${archiveProjectsTable}`);
    const phasesCount = await db.get(`SELECT COUNT(*) as count FROM ${archivePhasesTable}`);
    
    console.log(`   📊 Projects archived: ${projectsCount?.count || 0} records`);
    console.log(`   📊 Phases archived: ${phasesCount?.count || 0} records`);
    
    // Step 3: Verify original table counts before truncation
    const originalProjectsCount = await db.get(`SELECT COUNT(*) as count FROM projects`);
    const originalPhasesCount = await db.get(`SELECT COUNT(*) as count FROM phases`);
    
    console.log(`\n📋 Original table counts before truncation:`);
    console.log(`   📊 Projects: ${originalProjectsCount?.count || 0} records`);
    console.log(`   📊 Phases: ${originalPhasesCount?.count || 0} records`);
    
    // Verify archive integrity
    if (projectsCount?.count !== originalProjectsCount?.count) {
      throw new Error(`Projects archive count mismatch: ${projectsCount?.count} vs ${originalProjectsCount?.count}`);
    }
    if (phasesCount?.count !== originalPhasesCount?.count) {
      throw new Error(`Phases archive count mismatch: ${phasesCount?.count} vs ${originalPhasesCount?.count}`);
    }
    
    console.log('   ✅ Archive integrity verified - counts match original tables');
    
    // Step 4: Truncate live tables
    console.log('\n🗑️  Step 3: Truncating live tables');
    
    // SQLite doesn't support TRUNCATE, so we use DELETE
    // First disable foreign key constraints temporarily
    await db.exec('PRAGMA foreign_keys = OFF;');
    
    await db.exec('DELETE FROM step_progress;');
    console.log('   ✓ Truncated step_progress table');
    
    await db.exec('DELETE FROM phases;');
    console.log('   ✓ Truncated phases table');
    
    await db.exec('DELETE FROM projects;');
    console.log('   ✓ Truncated projects table');
    
    // Re-enable foreign key constraints
    await db.exec('PRAGMA foreign_keys = ON;');
    
    // Step 5: Verify truncation
    console.log('\n🔍 Step 4: Verifying truncation success');
    
    const projectsAfter = await db.get('SELECT COUNT(*) as count FROM projects');
    const phasesAfter = await db.get('SELECT COUNT(*) as count FROM phases');
    const stepsAfter = await db.get('SELECT COUNT(*) as count FROM step_progress');
    
    console.log(`   📊 Projects remaining: ${projectsAfter?.count || 0} records`);
    console.log(`   📊 Phases remaining: ${phasesAfter?.count || 0} records`);
    console.log(`   📊 Steps remaining: ${stepsAfter?.count || 0} records`);
    
    if (projectsAfter?.count !== 0 || phasesAfter?.count !== 0 || stepsAfter?.count !== 0) {
      throw new Error('Truncation failed - tables not empty');
    }
    
    console.log('   ✅ Truncation successful - all tables empty');
    
    // Step 6: Final verification and readiness check
    console.log('\n✅ Step 5: Readiness verification');
    console.log('================================================');
    console.log('🎯 WT-DBM-2.0 Steps 1 & 2 COMPLETED SUCCESSFULLY');
    console.log('');
    console.log('📦 Archive Summary:');
    console.log(`   • ${archiveProjectsTable}: ${projectsCount?.count || 0} records`);
    console.log(`   • ${archivePhasesTable}: ${phasesCount?.count || 0} records`);
    console.log('');
    console.log('🗑️  Truncation Summary:');
    console.log('   • projects: EMPTY (ready for import)');
    console.log('   • phases: EMPTY (ready for import)');
    console.log('   • step_progress: EMPTY (ready for import)');
    console.log('');
    console.log('🚀 Database ready for canonical CSV import (Step 3)');
    console.log('');
    
    return {
      success: true,
      archiveTables: {
        projects: archiveProjectsTable,
        phases: archivePhasesTable
      },
      archivedCounts: {
        projects: projectsCount?.count || 0,
        phases: phasesCount?.count || 0
      },
      truncationSuccess: true,
      readyForImport: true
    };
    
  } catch (error) {
    console.error('❌ Archive and truncate operation failed:', error);
    throw error;
  }
}

// Execute if run directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  archiveAndTruncate()
    .then(result => {
      console.log('\n🎉 Operation completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Operation failed:', error);
      process.exit(1);
    });
}

export default archiveAndTruncate;