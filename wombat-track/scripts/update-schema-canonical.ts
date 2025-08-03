import DatabaseManager from '../src/server/database/connection';

async function updateSchema() {
  console.log('🔧 Updating database schema to canonical structure...');
  const dbManager = DatabaseManager.getInstance();
  const db = await dbManager.getConnection('production');
  
  try {
    // Add missing columns to projects table
    const projectColumns = [
      'ALTER TABLE projects ADD COLUMN description TEXT',
      'ALTER TABLE projects ADD COLUMN goals TEXT',
      'ALTER TABLE projects ADD COLUMN scopeNotes TEXT',
      'ALTER TABLE projects ADD COLUMN RAG TEXT DEFAULT "Green"',
      'ALTER TABLE projects ADD COLUMN startDate DATE',
      'ALTER TABLE projects ADD COLUMN endDate DATE',
      'ALTER TABLE projects ADD COLUMN priority TEXT DEFAULT "Medium"',
      'ALTER TABLE projects ADD COLUMN budget REAL DEFAULT 0',
      'ALTER TABLE projects ADD COLUMN actualCost REAL DEFAULT 0',
      'ALTER TABLE projects ADD COLUMN estimatedHours REAL DEFAULT 0',
      'ALTER TABLE projects ADD COLUMN actualHours REAL DEFAULT 0',
      'ALTER TABLE projects ADD COLUMN completionPercentage REAL DEFAULT 0',
      'ALTER TABLE projects ADD COLUMN risk TEXT DEFAULT "Medium"',
      'ALTER TABLE projects ADD COLUMN stakeholders TEXT',
      'ALTER TABLE projects ADD COLUMN tags TEXT',
      'ALTER TABLE projects ADD COLUMN category TEXT',
      'ALTER TABLE projects ADD COLUMN department TEXT'
    ];
    
    for (const query of projectColumns) {
      try {
        await dbManager.executeQuery(query);
        console.log(`✅ Added column: ${query.match(/COLUMN (\w+)/)?.[1]}`);
      } catch (error: any) {
        if (error.message.includes('duplicate column')) {
          console.log(`⏭️  Column already exists: ${query.match(/COLUMN (\w+)/)?.[1]}`);
        } else {
          throw error;
        }
      }
    }
    
    // Add missing columns to phases table
    const phaseColumns = [
      'ALTER TABLE phases ADD COLUMN estimatedDuration REAL DEFAULT 0',
      'ALTER TABLE phases ADD COLUMN actualDuration REAL DEFAULT 0'
    ];
    
    for (const query of phaseColumns) {
      try {
        await dbManager.executeQuery(query);
        console.log(`✅ Added column: ${query.match(/COLUMN (\w+)/)?.[1]}`);
      } catch (error: any) {
        if (error.message.includes('duplicate column')) {
          console.log(`⏭️  Column already exists: ${query.match(/COLUMN (\w+)/)?.[1]}`);
        } else {
          throw error;
        }
      }
    }
    
    console.log('\n✅ Schema update complete!');
    
  } catch (error) {
    console.error('❌ Schema update failed:', error);
    throw error;
  }
}

// Run the update
updateSchema().then(() => {
  console.log('Done!');
  process.exit(0);
}).catch((error) => {
  console.error('Failed:', error);
  process.exit(1);
});