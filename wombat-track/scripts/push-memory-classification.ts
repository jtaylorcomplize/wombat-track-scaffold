import * as fs from 'fs';
import * as path from 'path';
import * as url from 'url';
import dotenv from 'dotenv';
import { createNotionClient } from '../src/utils/notionClient';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

interface MemoryEntry {
  entry: string;
  tags: string[];
  destinationDB: string[];
  notes: string;
}

// Database ID mapping for Notion databases - using the canonical communication DB
const COMMUNICATION_DB_ID = process.env.NOTION_CLAUDE_GIZMO_DB_ID || '23ce1901-e36e-81bb-b7d6-f033af88c8e9';

const DATABASE_MAPPING = {
  'WT Governance Memory': COMMUNICATION_DB_ID,
  'PhaseStep DB': COMMUNICATION_DB_ID,
  'DriveMemory Anchors': COMMUNICATION_DB_ID,
  'Claude-Gizmo Comms DB': COMMUNICATION_DB_ID,
  'WT Project Tracker': COMMUNICATION_DB_ID,
  'Memory Backlog': COMMUNICATION_DB_ID,
  'Governance Memory': COMMUNICATION_DB_ID,
  'Project Tracker': COMMUNICATION_DB_ID,
  'Design UX System': COMMUNICATION_DB_ID,
  'Claude-Gizmo Communication DB': COMMUNICATION_DB_ID,
  'Governance Memory (Strategy)': COMMUNICATION_DB_ID
};

function parseCSV(content: string): MemoryEntry[] {
  const lines = content.trim().split('\n');
  const header = lines[0];
  const entries: MemoryEntry[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const parts = parseCSVLine(line);
    
    if (parts.length >= 4) {
      const tags = parts[1].replace(/"/g, '').split(',').map(t => t.trim());
      const destinationDBs = parts[2].replace(/"/g, '').split('+').map(db => db.trim());
      
      entries.push({
        entry: parts[0].replace(/"/g, ''),
        tags,
        destinationDB: destinationDBs,
        notes: parts[3].replace(/"/g, '')
      });
    }
  }

  return entries;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result;
}

async function pushToNotion(entry: MemoryEntry): Promise<void> {
  const notionClient = createNotionClient();
  const timestamp = new Date().toISOString();
  
  for (const dbName of entry.destinationDB) {
    const dbId = DATABASE_MAPPING[dbName as keyof typeof DATABASE_MAPPING];
    
    if (!dbId) {
      console.warn(`⚠️  Database mapping not found for: ${dbName}`);
      continue;
    }

    try {
      // Construct message content for Claude-Gizmo Communication DB format
      const messageContent = `📋 Memory Classification Entry: ${entry.entry}\n\n🏷️ Tags: ${entry.tags.join(', ')}\n📝 Notes: ${entry.notes}\n🎯 Target DB: ${dbName}\n⏰ Timestamp: ${timestamp}`;
      
      const result = await notionClient.writePage({
        parent: { database_id: dbId },
        properties: {
          'Message': {
            title: [
              {
                text: {
                  content: `📋 Memory: ${entry.entry}`
                }
              }
            ]
          },
          'Full Content': {
            rich_text: [
              {
                text: {
                  content: messageContent
                }
              }
            ]
          },
          'Context': {
            rich_text: [
              {
                text: {
                  content: `Phase 1.1A Memory Classification - Target: ${dbName}`
                }
              }
            ]
          },
          'Sender': {
            select: {
              name: 'Claude'
            }
          },
          'Priority': {
            select: {
              name: 'medium'
            }
          },
          'Status': {
            select: {
              name: 'unread'
            }
          },
          'Expects Response': {
            checkbox: false
          },
          'Timestamp': {
            date: {
              start: timestamp
            }
          }
        }
      });

      console.log(`✅ Pushed to ${dbName}: ${entry.entry}`);
      console.log(`   Page ID: ${result.id}`);
      console.log(`   URL: ${result.url || 'N/A'}`);
      
    } catch (error) {
      console.error(`❌ Failed to push to ${dbName}:`, error);
      console.error(`   Error details:`, (error as any).body || error);
    }
  }
}

async function main() {
  try {
    console.log('🚀 Starting WT Phase 1.1A Memory Classification Push...\n');
    
    const csvPath = path.join(__dirname, '..', 'wt-phase-1.1a-memory-classification.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    
    const entries = parseCSV(csvContent);
    console.log(`📊 Parsed ${entries.length} memory entries\n`);
    
    // Track statistics
    const dbStats: Record<string, number> = {};
    
    for (const entry of entries) {
      console.log(`📝 Processing: ${entry.entry}`);
      console.log(`   Tags: ${entry.tags.join(', ')}`);
      console.log(`   Destinations: ${entry.destinationDB.join(', ')}`);
      
      // Update statistics
      for (const db of entry.destinationDB) {
        dbStats[db] = (dbStats[db] || 0) + 1;
      }
      
      await pushToNotion(entry);
      console.log('');
      
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('📊 Final Statistics:');
    console.log('===================');
    for (const [db, count] of Object.entries(dbStats)) {
      console.log(`${db}: ${count} entries`);
    }
    
    console.log('\n✅ Memory classification push completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during memory classification push:', error);
    process.exit(1);
  }
}

// Run main function if this is the entry point
main();