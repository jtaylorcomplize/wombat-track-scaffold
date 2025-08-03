#!/usr/bin/env tsx

import DatabaseManager from '../src/server/database/connection';

async function verifyArchive() {
  const dbManager = DatabaseManager.getInstance();
  const db = await dbManager.getConnection('production');
  
  console.log('🔍 WT-DBM-2.0 Archive Verification');
  console.log('==================================');
  
  // List all tables
  const tables = await db.all(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name LIKE 'Archive_%'
    ORDER BY name;
  `);
  
  console.log('\n📦 Archive Tables Created:');
  tables.forEach(table => {
    console.log(`   ✓ ${table.name}`);
  });
  
  // Verify main tables are empty
  const projectsCount = await db.get('SELECT COUNT(*) as count FROM projects');
  const phasesCount = await db.get('SELECT COUNT(*) as count FROM phases');
  const stepsCount = await db.get('SELECT COUNT(*) as count FROM step_progress');
  
  console.log('\n🗑️  Live Tables Status:');
  console.log(`   • projects: ${projectsCount?.count || 0} records`);
  console.log(`   • phases: ${phasesCount?.count || 0} records`);
  console.log(`   • step_progress: ${stepsCount?.count || 0} records`);
  
  const allEmpty = (projectsCount?.count || 0) === 0 && 
                   (phasesCount?.count || 0) === 0 && 
                   (stepsCount?.count || 0) === 0;
  
  if (allEmpty) {
    console.log('\n✅ Database ready for canonical CSV import');
  } else {
    console.log('\n❌ Database not ready - tables not empty');
  }
}

// Execute
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  verifyArchive()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Verification failed:', error);
      process.exit(1);
    });
}