#!/usr/bin/env tsx

import DatabaseManager from '../src/server/database/connection';

async function verifyCanonicalProperties() {
  console.log('🔍 WT-DBM-2.0 Canonical Properties Verification');
  console.log('==============================================');
  
  const dbManager = DatabaseManager.getInstance();
  const db = await dbManager.getConnection('production');
  
  // Get schema info
  const projectsSchema = await db.all(`PRAGMA table_info(projects)`);
  const phasesSchema = await db.all(`PRAGMA table_info(phases)`);
  
  console.log('\n📊 Database Schema Verification:');
  console.log(`   Projects table: ${projectsSchema.length} properties`);
  console.log(`   Phases table: ${phasesSchema.length} properties`);
  
  // Expected canonical properties
  const expectedProjectProperties = [
    'projectId', 'projectName', 'owner', 'status', 'description', 'startDate', 'endDate',
    'priority', 'budget', 'actualCost', 'estimatedHours', 'actualHours', 'completionPercentage',
    'risk', 'stakeholders', 'tags', 'category', 'department', 'createdAt', 'updatedAt'
  ];
  
  const expectedPhaseProperties = [
    'phaseid', 'phasename', 'project_ref', 'status', 'startDate', 'endDate',
    'RAG', 'notes', 'estimatedDuration', 'actualDuration', 'createdAt', 'updatedAt'
  ];
  
  console.log('\n📋 Projects Properties Analysis:');
  const actualProjectProps = projectsSchema.map(col => col.name);
  console.log(`   Expected: ${expectedProjectProperties.length} properties`);
  console.log(`   Actual: ${actualProjectProps.length} properties`);
  console.log(`   Status: ${actualProjectProps.length >= 19 ? '✅ COMPLIANT' : '❌ MISSING PROPERTIES'}`);
  
  console.log('\n📋 Phases Properties Analysis:');
  const actualPhaseProps = phasesSchema.map(col => col.name);
  console.log(`   Expected: ${expectedPhaseProperties.length} properties`);
  console.log(`   Actual: ${actualPhaseProps.length} properties`);
  console.log(`   Status: ${actualPhaseProps.length >= 10 ? '✅ COMPLIANT' : '❌ MISSING PROPERTIES'}`);
  
  // Check specific canonical properties
  console.log('\n🔍 Canonical Property Check:');
  
  const missingProjectProps = expectedProjectProperties.filter(prop => !actualProjectProps.includes(prop));
  const missingPhaseProps = expectedPhaseProperties.filter(prop => !actualPhaseProps.includes(prop));
  
  if (missingProjectProps.length === 0) {
    console.log('   ✅ All 19+ required Project properties present');
  } else {
    console.log(`   ❌ Missing Project properties: ${missingProjectProps.join(', ')}`);
  }
  
  if (missingPhaseProps.length === 0) {
    console.log('   ✅ All 10+ required Phase properties present');
  } else {
    console.log(`   ❌ Missing Phase properties: ${missingPhaseProps.join(', ')}`);
  }
  
  // Sample data verification
  const sampleProject = await db.get('SELECT * FROM projects LIMIT 1');
  const samplePhase = await db.get('SELECT * FROM phases LIMIT 1');
  
  console.log('\n📋 Sample Data Verification:');
  if (sampleProject) {
    console.log('   Projects sample record:');
    console.log(`     • Core: ${sampleProject.projectName} (${sampleProject.status})`);
    console.log(`     • Budget: $${sampleProject.budget || 'N/A'} / $${sampleProject.actualCost || 'N/A'}`);
    console.log(`     • Progress: ${sampleProject.completionPercentage || 0}%`);
    console.log(`     • Priority: ${sampleProject.priority || 'N/A'}`);
    console.log(`     • Department: ${sampleProject.department || 'N/A'}`);
  }
  
  if (samplePhase) {
    console.log('   Phases sample record:');
    console.log(`     • Core: ${samplePhase.phasename} → ${samplePhase.project_ref}`);
    console.log(`     • Duration: ${samplePhase.estimatedDuration || 'N/A'} est / ${samplePhase.actualDuration || 'N/A'} actual`);
    console.log(`     • Status: ${samplePhase.RAG} (${samplePhase.status})`);
  }
  
  // Final compliance check
  const projectsCompliant = actualProjectProps.length >= 19;
  const phasesCompliant = actualPhaseProps.length >= 10;
  const overallCompliant = projectsCompliant && phasesCompliant;
  
  console.log('\n✅ Final Canonical Compliance Report:');
  console.log('====================================');
  console.log(`📊 Projects: ${actualProjectProps.length}/19+ properties ${projectsCompliant ? '✅' : '❌'}`);
  console.log(`📊 Phases: ${actualPhaseProps.length}/10+ properties ${phasesCompliant ? '✅' : '❌'}`);
  console.log(`🎯 Overall Status: ${overallCompliant ? '✅ CANONICAL COMPLIANT' : '❌ NON-COMPLIANT'}`);
  
  if (overallCompliant) {
    console.log('\n🚀 Database meets WT-DBM-2.0 canonical requirements');
    console.log('   Ready for Data Explorer with full property visibility');
  }
  
  return {
    projectProperties: actualProjectProps.length,
    phaseProperties: actualPhaseProps.length,
    canonical: overallCompliant,
    missingProjectProps,
    missingPhaseProps
  };
}

const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  verifyCanonicalProperties()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Verification failed:', error);
      process.exit(1);
    });
}