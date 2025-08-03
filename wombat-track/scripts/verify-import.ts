import DatabaseManager from '../src/server/database/connection';

async function verifyData() {
  console.log('🔍 Verifying imported data integrity...');
  const dbManager = DatabaseManager.getInstance();
  
  try {
    // Check projects
    const projectCount = await dbManager.executeQuery('SELECT COUNT(*) as count FROM projects');
    console.log(`\n📊 Projects: ${projectCount[0].count} total`);
    
    const sampleProjects = await dbManager.executeQuery(
      'SELECT projectId, projectName, status, owner FROM projects LIMIT 5'
    );
    console.log('Sample projects:');
    sampleProjects.forEach((p: any) => {
      console.log(`  - ${p.projectId}: ${p.projectName} (${p.status}, owner: ${p.owner})`);
    });
    
    // Check phases
    const phaseCount = await dbManager.executeQuery('SELECT COUNT(*) as count FROM phases');
    console.log(`\n📊 Phases: ${phaseCount[0].count} total`);
    
    const samplePhases = await dbManager.executeQuery(
      'SELECT phaseid, phasename, project_ref, status FROM phases LIMIT 5'
    );
    console.log('Sample phases:');
    samplePhases.forEach((p: any) => {
      console.log(`  - ${p.phaseid}: ${p.phasename} (project: ${p.project_ref}, status: ${p.status})`);
    });
    
    // Check relationships
    const orphanPhases = await dbManager.executeQuery(`
      SELECT COUNT(*) as count FROM phases 
      WHERE project_ref NOT IN (SELECT projectId FROM projects)
      AND project_ref IS NOT NULL 
      AND project_ref != ''
    `);
    console.log(`\n🔗 Orphaned phases: ${orphanPhases[0].count}`);
    
    // Check canonical properties
    const projectWithAllProps = await dbManager.executeQuery(`
      SELECT projectId, goals, scopeNotes, RAG 
      FROM projects 
      WHERE goals IS NOT NULL 
      AND goals != ''
      LIMIT 1
    `);
    
    if (projectWithAllProps.length > 0) {
      console.log('\n✅ Canonical properties verified:');
      console.log(`  Project ${projectWithAllProps[0].projectId} has:`);
      console.log(`  - Goals: ${projectWithAllProps[0].goals ? '✓' : '✗'}`);
      console.log(`  - Scope Notes: ${projectWithAllProps[0].scopeNotes ? '✓' : '✗'}`);
      console.log(`  - RAG: ${projectWithAllProps[0].RAG}`);
    }
    
    console.log('\n✅ Data verification complete!');
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
    throw error;
  }
}

// Run verification
verifyData().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('Failed:', error);
  process.exit(1);
});