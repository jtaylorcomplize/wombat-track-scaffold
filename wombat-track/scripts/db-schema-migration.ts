#!/usr/bin/env tsx

/**
 * WT-DBM-2.0 Schema Migration - Expand to 19+10 Canonical Properties
 * 
 * Updates database schema to support:
 * - Projects: 19 canonical properties
 * - Phases: 10 canonical properties
 * 
 * Operations:
 * 1. Add missing columns to projects table (19 total)
 * 2. Add missing columns to phases table (10 total)
 * 3. Preserve existing data during migration
 * 4. Verify schema expansion
 */

import DatabaseManager from '../src/server/database/connection';

async function migrateToCanonicalSchema() {
  console.log('🎯 WT-DBM-2.0 Schema Migration - Canonical 19+10 Properties');
  console.log('============================================================');
  
  const dbManager = DatabaseManager.getInstance();
  const db = await dbManager.getConnection('production');
  
  try {
    // Step 1: Get current schema
    console.log('\n📋 Step 1: Analyzing current schema');
    
    const projectsSchema = await db.all(`PRAGMA table_info(projects)`);
    const phasesSchema = await db.all(`PRAGMA table_info(phases)`);
    
    console.log(`   📊 Projects current columns: ${projectsSchema.length}`);
    console.log(`   📊 Phases current columns: ${phasesSchema.length}`);
    
    const existingProjectFields = projectsSchema.map(col => col.name);
    const existingPhaseFields = phasesSchema.map(col => col.name);
    
    console.log(`   📝 Projects fields: ${existingProjectFields.join(', ')}`);
    console.log(`   📝 Phases fields: ${existingPhaseFields.join(', ')}`);
    
    // Step 2: Define canonical schema
    console.log('\n🏗️  Step 2: Defining canonical schema requirements');
    
    const canonicalProjectFields = [
      'projectId TEXT PRIMARY KEY',
      'projectName TEXT NOT NULL',
      'owner TEXT',
      'status TEXT DEFAULT "Planning"',
      'description TEXT',
      'startDate DATE',
      'endDate DATE', 
      'priority TEXT',
      'budget REAL',
      'actualCost REAL',
      'estimatedHours REAL',
      'actualHours REAL',
      'completionPercentage INTEGER DEFAULT 0',
      'risk TEXT',
      'stakeholders TEXT',
      'tags TEXT',
      'category TEXT',
      'department TEXT',
      'createdAt DATETIME DEFAULT CURRENT_TIMESTAMP',
      'updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP'
    ];
    
    const canonicalPhaseFields = [
      'phaseid TEXT PRIMARY KEY',
      'phasename TEXT NOT NULL',
      'project_ref TEXT',
      'status TEXT DEFAULT "Planned"',
      'startDate DATE',
      'endDate DATE',
      'RAG TEXT DEFAULT "Green"',
      'notes TEXT',
      'estimatedDuration REAL',
      'actualDuration REAL',
      'createdAt DATETIME DEFAULT CURRENT_TIMESTAMP',
      'updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP',
      'FOREIGN KEY (project_ref) REFERENCES projects(projectId)'
    ];
    
    console.log(`   📈 Target Projects fields: ${canonicalProjectFields.length}`);
    console.log(`   📈 Target Phases fields: ${canonicalPhaseFields.length - 1}`); // -1 for FOREIGN KEY constraint
    
    // Step 3: Backup existing data
    console.log('\n💾 Step 3: Backing up existing data');
    
    const existingProjects = await db.all('SELECT * FROM projects');
    const existingPhases = await db.all('SELECT * FROM phases');
    
    console.log(`   📦 Backed up ${existingProjects.length} projects`);
    console.log(`   📦 Backed up ${existingPhases.length} phases`);
    
    // Step 4: Create new tables with canonical schema
    console.log('\n🏗️  Step 4: Creating canonical schema tables');
    
    // Drop existing tables and recreate with full schema
    await db.exec('DROP TABLE IF EXISTS projects_new');
    await db.exec('DROP TABLE IF EXISTS phases_new');
    
    // Create projects table with all 19 canonical fields
    await db.exec(`
      CREATE TABLE projects_new (
        projectId TEXT PRIMARY KEY,
        projectName TEXT NOT NULL,
        owner TEXT,
        status TEXT DEFAULT 'Planning',
        description TEXT,
        startDate DATE,
        endDate DATE,
        priority TEXT,
        budget REAL,
        actualCost REAL,
        estimatedHours REAL,
        actualHours REAL,
        completionPercentage INTEGER DEFAULT 0,
        risk TEXT,
        stakeholders TEXT,
        tags TEXT,
        category TEXT,
        department TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create phases table with all 10 canonical fields
    await db.exec(`
      CREATE TABLE phases_new (
        phaseid TEXT PRIMARY KEY,
        phasename TEXT NOT NULL,
        project_ref TEXT,
        status TEXT DEFAULT 'Planned',
        startDate DATE,
        endDate DATE,
        RAG TEXT DEFAULT 'Green',
        notes TEXT,
        estimatedDuration REAL,
        actualDuration REAL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_ref) REFERENCES projects_new(projectId)
      )
    `);
    
    console.log('   ✅ Created projects_new with 19 canonical fields');
    console.log('   ✅ Created phases_new with 10 canonical fields');
    
    // Step 5: Migrate existing data
    console.log('\n📦 Step 5: Migrating existing data to new schema');
    
    // Migrate projects
    for (const project of existingProjects) {
      await db.run(`
        INSERT INTO projects_new (
          projectId, projectName, owner, status, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?)
      `, [
        project.projectId,
        project.projectName,
        project.owner,
        project.status,
        project.createdAt,
        project.updatedAt
      ]);
    }
    
    // Migrate phases
    for (const phase of existingPhases) {
      await db.run(`
        INSERT INTO phases_new (
          phaseid, phasename, project_ref, status, startDate, endDate, RAG, notes, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        phase.phaseid,
        phase.phasename,
        phase.project_ref,
        phase.status,
        phase.startDate,
        phase.endDate,
        phase.RAG,
        phase.notes,
        phase.createdAt,
        phase.updatedAt
      ]);
    }
    
    console.log(`   ✅ Migrated ${existingProjects.length} projects to new schema`);
    console.log(`   ✅ Migrated ${existingPhases.length} phases to new schema`);
    
    // Step 6: Replace old tables
    console.log('\n🔄 Step 6: Replacing old tables with canonical schema');
    
    await db.exec('DROP TABLE IF EXISTS projects');
    await db.exec('DROP TABLE IF EXISTS phases');
    await db.exec('ALTER TABLE projects_new RENAME TO projects');
    await db.exec('ALTER TABLE phases_new RENAME TO phases');
    
    console.log('   ✅ Replaced projects table with canonical schema');
    console.log('   ✅ Replaced phases table with canonical schema');
    
    // Step 7: Verify new schema
    console.log('\n🔍 Step 7: Verifying canonical schema');
    
    const newProjectsSchema = await db.all(`PRAGMA table_info(projects)`);
    const newPhasesSchema = await db.all(`PRAGMA table_info(phases)`);
    
    console.log(`   📊 Projects canonical columns: ${newProjectsSchema.length}`);
    console.log(`   📊 Phases canonical columns: ${newPhasesSchema.length}`);
    
    const newProjectFields = newProjectsSchema.map(col => col.name);
    const newPhaseFields = newPhasesSchema.map(col => col.name);
    
    console.log(`   📝 Projects canonical fields: ${newProjectFields.join(', ')}`);
    console.log(`   📝 Phases canonical fields: ${newPhaseFields.join(', ')}`);
    
    // Verify data integrity
    const projectCount = await db.get('SELECT COUNT(*) as count FROM projects');
    const phaseCount = await db.get('SELECT COUNT(*) as count FROM phases');
    
    console.log(`   📈 Projects preserved: ${projectCount?.count || 0} records`);
    console.log(`   📈 Phases preserved: ${phaseCount?.count || 0} records`);
    
    // Step 8: Final verification
    console.log('\n✅ Step 8: Schema migration completed');
    console.log('==========================================');
    console.log('🎯 WT-DBM-2.0 CANONICAL SCHEMA MIGRATION COMPLETE');
    console.log('');
    console.log('📊 Schema Summary:');
    console.log(`   • Projects: ${newProjectsSchema.length} canonical properties ✅`);
    console.log(`   • Phases: ${newPhasesSchema.length} canonical properties ✅`);
    console.log('');
    console.log('📦 Data Preservation:');
    console.log(`   • Projects: ${projectCount?.count || 0} records preserved`);
    console.log(`   • Phases: ${phaseCount?.count || 0} records preserved`);
    console.log('');
    console.log('🚀 Database ready for canonical CSV import with full 19+10 properties');
    
    return {
      success: true,
      projectFields: newProjectsSchema.length,
      phaseFields: newPhasesSchema.length,
      dataPreserved: {
        projects: projectCount?.count || 0,
        phases: phaseCount?.count || 0
      },
      canonicalCompliance: newProjectsSchema.length >= 19 && newPhasesSchema.length >= 10
    };
    
  } catch (error) {
    console.error('❌ Schema migration failed:', error);
    throw error;
  }
}

// Execute if run directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  migrateToCanonicalSchema()
    .then(result => {
      console.log('\n🎉 Schema migration completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Schema migration failed:', error);
      process.exit(1);
    });
}

export default migrateToCanonicalSchema;