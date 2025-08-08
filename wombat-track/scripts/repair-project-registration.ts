#!/usr/bin/env npx tsx

/**
 * Project Registration Repair Script
 * Fixes broken link between GovernanceLog activity and Projects table
 */

import GovernanceProjectIntegration from '../src/services/governanceProjectIntegration';
import DatabaseManager from '../src/server/database/connection';

async function repairProjectRegistration() {
  console.log('🔧 Starting Project Registration Repair...');
  console.log('=' .repeat(60));

  const integration = new GovernanceProjectIntegration();
  const dbManager = DatabaseManager.getInstance();

  try {
    // Step 1: Initialize and ensure schema
    console.log('\n📋 Step 1: Initialize and ensure database schema');
    await integration.initialize();

    // Step 2: Check current state
    console.log('\n📊 Step 2: Check current project count');
    const db = await dbManager.getConnection();
    const beforeCount = await db.get('SELECT COUNT(*) as count FROM projects');
    console.log(`   Current projects in database: ${beforeCount.count}`);

    // Step 3: Validate project integrity
    console.log('\n🔍 Step 3: Validate project registration integrity');
    await integration.validateProjectIntegrity();

    // Step 4: Process all governance logs
    console.log('\n📄 Step 4: Process all governance logs');
    await integration.processAllGovernanceLogs();

    // Step 5: Check final state
    console.log('\n📈 Step 5: Check final project count');
    const afterCount = await db.get('SELECT COUNT(*) as count FROM projects');
    const newProjects = afterCount.count - beforeCount.count;
    console.log(`   Final projects in database: ${afterCount.count}`);
    console.log(`   Projects added: ${newProjects}`);

    // Step 6: Verify specific missing projects
    console.log('\n🎯 Step 6: Verify specific high-priority projects');
    const highPriorityProjects = ['OF-GOVLOG', 'OF-9.0', 'OF-9.1', 'OF-9.2'];
    
    for (const projectId of highPriorityProjects) {
      const project = await db.get('SELECT projectId, projectName, status FROM projects WHERE projectId = ?', [projectId]);
      if (project) {
        console.log(`   ✅ ${projectId}: ${project.projectName} (${project.status})`);
      } else {
        console.log(`   ❌ ${projectId}: Missing - attempting manual backfill`);
        await integration.backfillMissingProjects([projectId]);
      }
    }

    // Step 7: Display final summary
    console.log('\n📋 Step 7: Final Summary');
    const finalProjects = await db.all(`
      SELECT projectId, projectName, status, updatedAt 
      FROM projects 
      WHERE updatedAt > datetime('now', '-1 hour')
      ORDER BY updatedAt DESC
    `);
    
    if (finalProjects.length > 0) {
      console.log(`   Recently updated projects (${finalProjects.length}):`);
      finalProjects.forEach((p: any) => {
        console.log(`   - ${p.projectId}: ${p.projectName} (${p.status})`);
      });
    }

    console.log('\n✅ Project Registration Repair Complete!');
    console.log('=' .repeat(60));

  } catch (error) {
    console.error('\n❌ Project Registration Repair Failed:');
    console.error(error);
    process.exit(1);
  }
}

// Run the repair if this script is executed directly
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

if (import.meta.url === `file://${process.argv[1]}`) {
  repairProjectRegistration().then(() => {
    console.log('\n🎉 All done! The project registration system has been repaired.');
    process.exit(0);
  }).catch(error => {
    console.error('\n💥 Fatal error during repair:', error);
    process.exit(1);
  });
}

export default repairProjectRegistration;