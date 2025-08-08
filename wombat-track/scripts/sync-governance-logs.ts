#!/usr/bin/env tsx
/**
 * Governance Log Sync Script
 * Syncs logs/governance/*.jsonl files to the database governance_logs table
 */

import { readdir, readFile, stat } from 'fs/promises';
import { join } from 'path';
import sqlite3 from 'sqlite3';
import { promisify } from 'util';

interface GovernanceLogEntry {
  timestamp: string;
  phase_id?: string;
  step_id?: string;
  actor: string;
  action: string;
  status: string;
  description?: string;
  metadata?: Record<string, any>;
  event_type?: string;
  user_id?: string;
  user_role?: string;
  resource_type?: string;
  resource_id?: string;
  success?: boolean;
  details?: any;
  runtime_context?: string;
}

class GovernanceSyncService {
  private db: sqlite3.Database;
  private dbRun: (sql: string, params?: any[]) => Promise<any>;
  private dbGet: (sql: string, params?: any[]) => Promise<any>;
  private dbAll: (sql: string, params?: any[]) => Promise<any[]>;

  constructor(dbPath: string) {
    this.db = new sqlite3.Database(dbPath);
    this.dbRun = promisify(this.db.run.bind(this.db));
    this.dbGet = promisify(this.db.get.bind(this.db));
    this.dbAll = promisify(this.db.all.bind(this.db));
  }

  async syncGovernanceLogs(): Promise<void> {
    console.log('🔄 Starting governance logs sync...');
    
    const logsDir = join(process.cwd(), 'logs', 'governance');
    const files = await this.getJsonlFiles(logsDir);
    
    let totalSynced = 0;
    let totalSkipped = 0;
    
    for (const file of files) {
      console.log(`📄 Processing: ${file}`);
      const { synced, skipped } = await this.processJsonlFile(file);
      totalSynced += synced;
      totalSkipped += skipped;
    }
    
    console.log(`✅ Sync complete: ${totalSynced} synced, ${totalSkipped} skipped`);
    
    // Update step_governance linkages
    await this.linkStepsToGovernance();
  }

  private async getJsonlFiles(dir: string): Promise<string[]> {
    try {
      const files = await readdir(dir);
      const jsonlFiles: string[] = [];
      
      for (const file of files) {
        const filePath = join(dir, file);
        const stats = await stat(filePath);
        if (stats.isFile() && file.endsWith('.jsonl')) {
          jsonlFiles.push(filePath);
        }
      }
      
      return jsonlFiles;
    } catch (error) {
      console.error('❌ Error reading logs directory:', error);
      return [];
    }
  }

  private async processJsonlFile(filePath: string): Promise<{ synced: number; skipped: number }> {
    try {
      const content = await readFile(filePath, 'utf-8');
      const lines = content.trim().split('\n').filter(line => line.trim());
      
      let synced = 0;
      let skipped = 0;
      
      for (const line of lines) {
        try {
          const entry = JSON.parse(line) as GovernanceLogEntry;
          
          // Check if entry already exists
          const exists = await this.checkEntryExists(entry);
          if (exists) {
            skipped++;
            continue;
          }
          
          // Insert into database
          await this.insertGovernanceEntry(entry);
          synced++;
          
        } catch (parseError) {
          console.warn(`⚠️  Skipped malformed line: ${line.substring(0, 100)}...`);
          skipped++;
        }
      }
      
      return { synced, skipped };
    } catch (error) {
      console.error(`❌ Error processing file ${filePath}:`, error);
      return { synced: 0, skipped: 0 };
    }
  }

  private async checkEntryExists(entry: GovernanceLogEntry): Promise<boolean> {
    const existing = await this.dbGet(
      'SELECT id FROM governance_logs WHERE timestamp = ? AND actor = ? AND action = ?',
      [entry.timestamp, entry.actor, entry.action]
    );
    return !!existing;
  }

  private async insertGovernanceEntry(entry: GovernanceLogEntry): Promise<void> {
    // Map JSONL entry to database schema
    const eventType = entry.event_type || entry.action || 'governance_activity';
    const userId = entry.user_id || entry.actor;
    const userRole = entry.user_role || 'system';
    const resourceType = entry.resource_type || (entry.phase_id ? 'phase' : (entry.step_id ? 'step' : 'system'));
    const resourceId = entry.resource_id || entry.step_id || entry.phase_id;
    const success = entry.success !== undefined ? entry.success : (entry.status === 'completed' || entry.status === 'success' ? 1 : 0);
    
    // Combine metadata and details
    const details = {
      original_entry: entry,
      phase_id: entry.phase_id,
      step_id: entry.step_id,
      status: entry.status,
      description: entry.description,
      metadata: entry.metadata,
      synced_at: new Date().toISOString()
    };

    const runtimeContext = entry.runtime_context || JSON.stringify({
      phase: entry.phase_id,
      environment: 'governance_sync',
      script: 'sync-governance-logs.ts'
    });

    const sql = `
      INSERT INTO governance_logs (
        timestamp, event_type, user_id, user_role, resource_type, 
        resource_id, action, success, details, runtime_context
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await this.dbRun(sql, [
      entry.timestamp,
      eventType,
      userId,
      userRole,
      resourceType,
      resourceId,
      entry.action,
      success,
      JSON.stringify(details),
      runtimeContext
    ]);
  }

  private async linkStepsToGovernance(): Promise<void> {
    console.log('🔗 Linking steps to governance logs...');
    
    // Find governance logs that have step_id in details
    const logsWithSteps = await this.dbAll(`
      SELECT id, details 
      FROM governance_logs 
      WHERE details LIKE '%step_id%'
    `);
    
    let linked = 0;
    
    for (const log of logsWithSteps) {
      try {
        const details = JSON.parse(log.details);
        const stepId = details.step_id || details.original_entry?.step_id;
        
        if (stepId) {
          // Check if step exists
          const stepExists = await this.dbGet(
            'SELECT stepId FROM phase_steps WHERE stepId = ?',
            [stepId]
          );
          
          if (stepExists) {
            // Check if link already exists
            const linkExists = await this.dbGet(
              'SELECT * FROM step_governance WHERE stepId = ? AND governanceLogId = ?',
              [stepId, log.id]
            );
            
            if (!linkExists) {
              await this.dbRun(
                'INSERT INTO step_governance (stepId, governanceLogId, autoLinked, linkedAt) VALUES (?, ?, ?, ?)',
                [stepId, log.id, 1, new Date().toISOString()]
              );
              linked++;
            }
          }
        }
      } catch (error) {
        console.warn(`⚠️  Could not process governance log ${log.id}:`, error);
      }
    }
    
    console.log(`✅ Linked ${linked} governance entries to steps`);
  }

  async close(): Promise<void> {
    return new Promise((resolve) => {
      this.db.close(() => {
        resolve();
      });
    });
  }
}

// Main execution
async function main() {
  const dbPath = join(process.cwd(), 'databases', 'production.db');
  const syncService = new GovernanceSyncService(dbPath);
  
  try {
    await syncService.syncGovernanceLogs();
    console.log('🎉 Governance sync completed successfully');
  } catch (error) {
    console.error('💥 Governance sync failed:', error);
    process.exit(1);
  } finally {
    await syncService.close();
  }
}

// Run if this is the main module
main().catch(console.error);

export { GovernanceSyncService };