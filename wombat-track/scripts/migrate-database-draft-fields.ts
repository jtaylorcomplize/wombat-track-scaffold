#!/usr/bin/env tsx

import DatabaseManager from '../src/server/database/connection.js';

class DatabaseMigration {
  private dbManager: DatabaseManager;

  constructor() {
    this.dbManager = DatabaseManager.getInstance();
  }

  async run() {
    console.log('🔄 Starting database migration: Adding draft fields');
    
    try {
      const db = await this.dbManager.getConnection();
      
      // Check if migrations are needed by inspecting table schema
      console.log('📊 Checking current table schema...');
      
      const projectsSchema = await db.all("PRAGMA table_info(projects)");
      const phasesSchema = await db.all("PRAGMA table_info(phases)");
      
      console.log(`Projects table has ${projectsSchema.length} columns`);
      console.log(`Phases table has ${phasesSchema.length} columns`);
      
      // Check for missing columns in projects table
      const projectColumns = projectsSchema.map(col => col.name);
      const missingProjectColumns = [
        'description', 'goals', 'scopeNotes', 'RAG', 'startDate', 'endDate', 
        'priority', 'budget', 'actualCost', 'estimatedHours', 'actualHours', 
        'completionPercentage', 'risk', 'stakeholders', 'tags', 'category', 
        'department', 'isDraft', 'draftEditedBy', 'draftEditedAt'
      ].filter(col => !projectColumns.includes(col));
      
      // Check for missing columns in phases table
      const phaseColumns = phasesSchema.map(col => col.name);
      const missingPhaseColumns = [
        'estimatedDuration', 'actualDuration', 'isDraft', 'draftEditedBy', 'draftEditedAt'
      ].filter(col => !phaseColumns.includes(col));
      
      console.log(`Missing project columns: ${missingProjectColumns.join(', ')}`);
      console.log(`Missing phase columns: ${missingPhaseColumns.join(', ')}`);
      
      // Add missing columns to projects table
      if (missingProjectColumns.length > 0) {
        console.log('➕ Adding missing columns to projects table...');
        
        const projectColumnMigrations = [
          'ALTER TABLE projects ADD COLUMN description TEXT',
          'ALTER TABLE projects ADD COLUMN goals TEXT',
          'ALTER TABLE projects ADD COLUMN scopeNotes TEXT',
          'ALTER TABLE projects ADD COLUMN RAG TEXT DEFAULT "Green"',
          'ALTER TABLE projects ADD COLUMN startDate DATE',
          'ALTER TABLE projects ADD COLUMN endDate DATE',
          'ALTER TABLE projects ADD COLUMN priority TEXT',
          'ALTER TABLE projects ADD COLUMN budget REAL',
          'ALTER TABLE projects ADD COLUMN actualCost REAL',
          'ALTER TABLE projects ADD COLUMN estimatedHours INTEGER',
          'ALTER TABLE projects ADD COLUMN actualHours INTEGER',
          'ALTER TABLE projects ADD COLUMN completionPercentage INTEGER DEFAULT 0',
          'ALTER TABLE projects ADD COLUMN risk TEXT',
          'ALTER TABLE projects ADD COLUMN stakeholders TEXT',
          'ALTER TABLE projects ADD COLUMN tags TEXT',
          'ALTER TABLE projects ADD COLUMN category TEXT',
          'ALTER TABLE projects ADD COLUMN department TEXT',
          'ALTER TABLE projects ADD COLUMN isDraft INTEGER DEFAULT 0',
          'ALTER TABLE projects ADD COLUMN draftEditedBy TEXT',
          'ALTER TABLE projects ADD COLUMN draftEditedAt DATETIME'
        ];
        
        for (const migration of projectColumnMigrations) {
          try {
            await db.exec(migration);
            console.log(`  ✅ ${migration}`);
          } catch (error) {
            if (error instanceof Error && error.message.includes('duplicate column name')) {
              console.log(`  ⏭️  Column already exists: ${migration}`);
            } else {
              console.error(`  ❌ Failed: ${migration} - ${error}`);
            }
          }
        }
      }
      
      // Add missing columns to phases table
      if (missingPhaseColumns.length > 0) {
        console.log('➕ Adding missing columns to phases table...');
        
        const phaseColumnMigrations = [
          'ALTER TABLE phases ADD COLUMN estimatedDuration INTEGER',
          'ALTER TABLE phases ADD COLUMN actualDuration INTEGER',
          'ALTER TABLE phases ADD COLUMN isDraft INTEGER DEFAULT 0',
          'ALTER TABLE phases ADD COLUMN draftEditedBy TEXT',
          'ALTER TABLE phases ADD COLUMN draftEditedAt DATETIME'
        ];
        
        for (const migration of phaseColumnMigrations) {
          try {
            await db.exec(migration);
            console.log(`  ✅ ${migration}`);
          } catch (error) {
            if (error instanceof Error && error.message.includes('duplicate column name')) {
              console.log(`  ⏭️  Column already exists: ${migration}`);
            } else {
              console.error(`  ❌ Failed: ${migration} - ${error}`);
            }
          }
        }
      }
      
      // Verify schema after migration
      console.log('🔍 Verifying schema after migration...');
      const newProjectsSchema = await db.all("PRAGMA table_info(projects)");
      const newPhasesSchema = await db.all("PRAGMA table_info(phases)");
      
      console.log(`✅ Projects table now has ${newProjectsSchema.length} columns`);
      console.log(`✅ Phases table now has ${newPhasesSchema.length} columns`);
      
      console.log('\n✅ Database migration completed successfully!');
      return true;
      
    } catch (error) {
      console.error('❌ Database migration failed:', error);
      return false;
    } finally {
      await this.dbManager.closeAllConnections();
    }
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const migration = new DatabaseMigration();
  migration.run().then(success => {
    process.exit(success ? 0 : 1);
  });
}

export default DatabaseMigration;