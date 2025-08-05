#!/usr/bin/env tsx

/**
 * Database migration to add subApp_ref and editableByAdmin columns to Projects table
 * This enables proper Sub-App → Project relationship and admin editing capability
 */

import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'databases', 'production.db');

interface MigrationResult {
  success: boolean;
  message: string;
  changes?: number;
}

async function runMigration(): Promise<MigrationResult> {
  let db: any = null;
  
  try {
    console.log('🔧 Starting Projects table migration...');
    console.log(`📁 Database path: ${DB_PATH}`);
    
    // Open database connection
    db = await open({
      filename: DB_PATH,
      driver: sqlite3.Database
    });
    
    // Check if columns already exist
    const columns = await db.all("PRAGMA table_info(Projects)");
    const hasSubAppRef = columns.some((col: any) => col.name === 'subApp_ref');
    const hasEditableByAdmin = columns.some((col: any) => col.name === 'editableByAdmin');
    
    console.log(`📊 Current columns check:`);
    console.log(`   - subApp_ref exists: ${hasSubAppRef ? '✅' : '❌'}`);
    console.log(`   - editableByAdmin exists: ${hasEditableByAdmin ? '✅' : '❌'}`);
    
    let changesCount = 0;
    
    // Add subApp_ref column if it doesn't exist
    if (!hasSubAppRef) {
      console.log('🔄 Adding subApp_ref column...');
      await db.run(`
        ALTER TABLE Projects 
        ADD COLUMN subApp_ref VARCHAR(50) DEFAULT NULL;
      `);
      changesCount++;
      console.log('✅ subApp_ref column added successfully');
    }
    
    // Add editableByAdmin column if it doesn't exist
    if (!hasEditableByAdmin) {
      console.log('🔄 Adding editableByAdmin column...');
      await db.run(`
        ALTER TABLE Projects 
        ADD COLUMN editableByAdmin BOOLEAN DEFAULT TRUE;
      `);
      changesCount++;
      console.log('✅ editableByAdmin column added successfully');
    }
    
    // Create index on subApp_ref for better query performance
    console.log('🔄 Creating index on subApp_ref...');
    try {
      await db.run(`
        CREATE INDEX IF NOT EXISTS idx_projects_subapp_ref 
        ON Projects(subApp_ref);
      `);
      console.log('✅ Index created successfully');
    } catch (error) {
      console.log('⚠️  Index creation skipped (may already exist)');
    }
    
    // Verify the changes
    const updatedColumns = await db.all("PRAGMA table_info(Projects)");
    const finalHasSubAppRef = updatedColumns.some((col: any) => col.name === 'subApp_ref');
    const finalHasEditableByAdmin = updatedColumns.some((col: any) => col.name === 'editableByAdmin');
    
    console.log(`\n📋 Final verification:`);
    console.log(`   - subApp_ref column: ${finalHasSubAppRef ? '✅' : '❌'}`);
    console.log(`   - editableByAdmin column: ${finalHasEditableByAdmin ? '✅' : '❌'}`);
    
    // Get total projects count
    const totalProjects = await db.get("SELECT COUNT(*) as count FROM Projects");
    console.log(`   - Total projects in database: ${totalProjects.count}`);
    
    return {
      success: true,
      message: `Migration completed successfully. ${changesCount} columns added.`,
      changes: changesCount
    };
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    return {
      success: false,
      message: `Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  } finally {
    if (db) {
      await db.close();
      console.log('📫 Database connection closed');
    }
  }
}

// Execute migration if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigration()
    .then(result => {
      console.log(`\n🎯 Migration Result:`);
      console.log(`   Status: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
      console.log(`   Message: ${result.message}`);
      
      if (!result.success) {
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ Unexpected error:', error);
      process.exit(1);
    });
}

export { runMigration };