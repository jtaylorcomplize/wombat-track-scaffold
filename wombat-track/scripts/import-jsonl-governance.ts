import fs from 'fs/promises';
import path from 'path';
import DatabaseManager from '../src/server/database/connection';

async function importGovernanceLogsFromJSONL() {
  console.log('📝 Importing governance logs from JSONL to database...');
  const dbManager = DatabaseManager.getInstance();
  
  try {
    // Read JSONL file
    const jsonlPath = path.join(process.cwd(), 'logs/governance.jsonl');
    const fileContent = await fs.readFile(jsonlPath, 'utf-8');
    const lines = fileContent.trim().split('\n').filter(line => line.trim());
    
    console.log(`Found ${lines.length} entries in governance.jsonl`);
    
    let imported = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        
        // Skip if already exists (check by timestamp and event_type)
        const existing = await dbManager.executeQuery(
          'SELECT id FROM governance_logs WHERE timestamp = ? AND event_type = ? AND user_id = ?',
          [entry.timestamp, entry.event_type, entry.user_id || 'system']
        );
        
        if (existing.length > 0) {
          skipped++;
          continue;
        }
        
        // Insert into database
        const query = `
          INSERT INTO governance_logs (
            timestamp, event_type, user_id, user_role, resource_type, 
            resource_id, action, success, details, runtime_context
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const params = [
          entry.timestamp,
          entry.event_type || 'unknown',
          entry.user_id || 'system',
          entry.user_role || 'system', 
          entry.resource_type || 'unknown',
          entry.resource_id || '',
          entry.action || 'unknown',
          entry.success !== false ? 1 : 0, // Default to success if not specified
          JSON.stringify(entry.details || {}),
          JSON.stringify(entry.runtime_context || {})
        ];
        
        await dbManager.executeQuery(query, params);
        imported++;
        
      } catch (parseError) {
        console.warn(`Error parsing line: ${line.substring(0, 100)}...`);
        errors++;
      }
    }
    
    console.log(`✅ Import complete: ${imported} imported, ${skipped} skipped, ${errors} errors`);
    
    // Verify final count
    const finalCount = await dbManager.executeQuery('SELECT COUNT(*) as count FROM governance_logs');
    console.log(`📊 Total governance logs in database: ${finalCount[0].count}`);
    
    return { imported, skipped, errors, total: finalCount[0].count };
    
  } catch (error) {
    console.error('❌ Error importing governance logs:', error);
    throw error;
  }
}

// Run the import
importGovernanceLogsFromJSONL().then((result) => {
  console.log('✅ JSONL import completed successfully');
  console.log(`📈 Final stats: ${result.total} total logs in database`);
  process.exit(0);
}).catch((error) => {
  console.error('❌ JSONL import failed:', error);
  process.exit(1);
});