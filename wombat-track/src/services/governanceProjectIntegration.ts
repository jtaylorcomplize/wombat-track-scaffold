/**
 * Integration Layer: Governance Logging ↔ Project Registration
 * Monitors governance logs and triggers project creation/updates
 */

import { GovernanceProjectHooks } from './governanceProjectHooks';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

export class GovernanceProjectIntegration {
  private hooks: GovernanceProjectHooks;
  private isProcessing = false;

  constructor() {
    this.hooks = GovernanceProjectHooks.getInstance();
  }

  /**
   * Initialize the integration system
   */
  async initialize(): Promise<void> {
    await this.hooks.ensureDatabaseSchema();
    console.log('✅ Governance Project Integration initialized');
  }

  /**
   * Process all governance logs and update projects
   */
  async processAllGovernanceLogs(): Promise<void> {
    if (this.isProcessing) {
      console.log('⏳ Governance log processing already in progress');
      return;
    }

    this.isProcessing = true;
    try {
      console.log('🔄 Processing all governance logs for project registration...');
      
      const logsDir = join(process.cwd(), 'logs', 'governance');
      let processedCount = 0;
      let createdCount = 0;
      let updatedCount = 0;

      try {
        const files = await readdir(logsDir);
        const jsonlFiles = files.filter(f => f.endsWith('.jsonl') || f.endsWith('.json'));

        for (const file of jsonlFiles) {
          const filePath = join(logsDir, file);
          const result = await this.processGovernanceFile(filePath);
          processedCount += result.processed;
          createdCount += result.created;
          updatedCount += result.updated;
        }

        console.log(`✅ Governance log processing complete:`);
        console.log(`   📄 Processed ${processedCount} log entries`);
        console.log(`   ✨ Created ${createdCount} new projects`);
        console.log(`   🔄 Updated ${updatedCount} existing projects`);
      } catch (error) {
        console.error('Error processing governance logs:', error);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single governance log file
   */
  private async processGovernanceFile(filePath: string): Promise<{processed: number, created: number, updated: number}> {
    let processed = 0;
    let created = 0;
    let updated = 0;

    try {
      const content = await readFile(filePath, 'utf-8');
      const lines = content.trim().split('\n').filter(line => line.trim());

      for (const line of lines) {
        try {
          const logEntry = JSON.parse(line);
          processed++;
          
          const result = await this.hooks.processGovernanceEntry(logEntry);
          if (result) {
            // Check if this was creation or update by looking at log entry
            if (logEntry.action === 'create' || logEntry.event_type === 'phase_initialization') {
              created++;
            } else {
              updated++;
            }
          }
        } catch (parseError) {
          // Skip invalid JSON lines
          continue;
        }
      }
    } catch (error) {
      console.warn(`Failed to process governance file ${filePath}:`, error);
    }

    return { processed, created, updated };
  }

  /**
   * Process a single governance log entry (for real-time integration)
   */
  async processGovernanceEntry(logEntry: any): Promise<boolean> {
    return await this.hooks.processGovernanceEntry(logEntry);
  }

  /**
   * Backfill specific missing projects from governance logs
   */
  async backfillMissingProjects(projectIds: string[]): Promise<void> {
    console.log(`🔄 Backfilling ${projectIds.length} missing projects...`);
    
    for (const projectId of projectIds) {
      await this.backfillSingleProject(projectId);
    }
    
    console.log('✅ Backfill complete');
  }

  /**
   * Backfill a single project from governance logs
   */
  private async backfillSingleProject(projectId: string): Promise<void> {
    try {
      const logsDir = join(process.cwd(), 'logs', 'governance');
      const files = await readdir(logsDir);
      const jsonlFiles = files.filter(f => f.endsWith('.jsonl') || f.endsWith('.json'));

      const foundReferences = [];

      // Search all governance logs for this project ID
      for (const file of jsonlFiles) {
        const filePath = join(logsDir, file);
        const content = await readFile(filePath, 'utf-8');
        const lines = content.trim().split('\n').filter(line => line.trim());

        for (const line of lines) {
          try {
            const logEntry = JSON.parse(line);
            if (JSON.stringify(logEntry).includes(projectId)) {
              foundReferences.push(logEntry);
            }
          } catch (e) {
            continue;
          }
        }
      }

      if (foundReferences.length > 0) {
        // Use the first reference to create the project
        const result = await this.hooks.processGovernanceEntry(foundReferences[0]);
        if (result) {
          console.log(`✅ Backfilled project: ${projectId} (found ${foundReferences.length} references)`);
        }
      } else {
        console.log(`⚠️  No governance references found for project: ${projectId}`);
      }
    } catch (error) {
      console.error(`Failed to backfill project ${projectId}:`, error);
    }
  }

  /**
   * Validate project registration integrity
   */
  async validateProjectIntegrity(): Promise<void> {
    console.log('🔍 Validating project registration integrity...');
    
    const missingProjects = await this.findMissingProjects();
    
    if (missingProjects.length > 0) {
      console.log(`⚠️  Found ${missingProjects.length} missing projects:`);
      missingProjects.forEach(id => console.log(`   - ${id}`));
      
      const shouldBackfill = true; // Auto-backfill as per instructions
      if (shouldBackfill) {
        await this.backfillMissingProjects(missingProjects);
      }
    } else {
      console.log('✅ All governance-referenced projects exist in database');
    }
  }

  /**
   * Find project IDs referenced in governance logs but missing from database
   */
  private async findMissingProjects(): Promise<string[]> {
    const governanceProjectIds = new Set<string>();
    const logsDir = join(process.cwd(), 'logs', 'governance');
    
    try {
      const files = await readdir(logsDir);
      const jsonlFiles = files.filter(f => f.endsWith('.jsonl') || f.endsWith('.json'));
      
      // Extract project IDs from governance logs
      for (const file of jsonlFiles) {
        const filePath = join(logsDir, file);
        const content = await readFile(filePath, 'utf-8');
        const lines = content.trim().split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          try {
            const logEntry = JSON.parse(line);
            const projectId = logEntry.project_id || logEntry.projectId;
            if (projectId) {
              governanceProjectIds.add(projectId);
            }
            
            // Also check for pattern-matching project IDs in other fields
            const projectIdPattern = /\b(OF-|WT-|[A-Z]+-)[A-Z0-9.-]+\b/g;
            const entryText = JSON.stringify(logEntry);
            const matches = entryText.match(projectIdPattern);
            if (matches) {
              matches.forEach(match => governanceProjectIds.add(match));
            }
          } catch (e) {
            continue;
          }
        }
      }
      
      // Check which ones are missing from database
      const dbManagerModule = await import('../server/database/connection.js');
      const dbManager = dbManagerModule.default.getInstance();
      const db = await dbManager.getConnection();
      const existingProjects = await db.all('SELECT projectId FROM projects');
      const existingIds = new Set(existingProjects.map((p: any) => p.projectId));
      
      return Array.from(governanceProjectIds).filter(id => !existingIds.has(id));
    } catch (error) {
      console.error('Error finding missing projects:', error);
      return [];
    }
  }
}

export default GovernanceProjectIntegration;