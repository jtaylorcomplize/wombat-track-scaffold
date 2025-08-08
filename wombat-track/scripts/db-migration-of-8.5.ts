/**
 * OF-8.5 Database Migration Script
 * Canonical DB migration for Continuous Orchestration tables
 */

import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'databases', 'production.db');
const BACKUP_PATH = path.join(process.cwd(), 'databases', `production-backup-${Date.now()}.db`);

interface MigrationStep {
  id: string;
  description: string;
  sql: string;
  rollback?: string;
}

const MIGRATION_STEPS: MigrationStep[] = [
  {
    id: 'create_phases_table',
    description: 'Create Phases table for project phase management',
    sql: `
      CREATE TABLE IF NOT EXISTS Phases (
        phaseId TEXT PRIMARY KEY,
        projectId TEXT NOT NULL,
        phaseName TEXT NOT NULL,
        phaseDescription TEXT,
        phaseOrder INTEGER DEFAULT 0,
        status TEXT DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'completed', 'on_hold')),
        startDate TEXT,
        endDate TEXT,
        memoryAnchor TEXT,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (projectId) REFERENCES Projects (projectId) ON DELETE CASCADE
      );
    `,
    rollback: 'DROP TABLE IF EXISTS Phases;'
  },
  {
    id: 'create_phase_steps_table',
    description: 'Create PhaseSteps table for granular step tracking',
    sql: `
      CREATE TABLE IF NOT EXISTS PhaseSteps (
        stepId TEXT PRIMARY KEY,
        phaseId TEXT NOT NULL,
        projectId TEXT NOT NULL,
        stepName TEXT NOT NULL,
        stepDescription TEXT,
        stepOrder INTEGER DEFAULT 0,
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'blocked')),
        assignedTo TEXT,
        estimatedHours REAL,
        actualHours REAL,
        startDate TEXT,
        endDate TEXT,
        completionPercentage INTEGER DEFAULT 0 CHECK (completionPercentage >= 0 AND completionPercentage <= 100),
        memoryAnchor TEXT,
        governanceLogRef TEXT,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (phaseId) REFERENCES Phases (phaseId) ON DELETE CASCADE,
        FOREIGN KEY (projectId) REFERENCES Projects (projectId) ON DELETE CASCADE
      );
    `,
    rollback: 'DROP TABLE IF EXISTS PhaseSteps;'
  },
  {
    id: 'create_step_progress_table',
    description: 'Create StepProgress table for progress tracking',
    sql: `
      CREATE TABLE IF NOT EXISTS StepProgress (
        progressId TEXT PRIMARY KEY,
        stepId TEXT NOT NULL,
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
        progressType TEXT NOT NULL CHECK (progressType IN ('status_change', 'percentage_update', 'time_logged', 'note_added')),
        previousValue TEXT,
        newValue TEXT,
        notes TEXT,
        createdBy TEXT,
        memoryAnchor TEXT,
        FOREIGN KEY (stepId) REFERENCES PhaseSteps (stepId) ON DELETE CASCADE
      );
    `,
    rollback: 'DROP TABLE IF EXISTS StepProgress;'
  },
  {
    id: 'create_governance_events_table',
    description: 'Create GovernanceEvents table for enhanced event tracking',
    sql: `
      CREATE TABLE IF NOT EXISTS GovernanceEvents (
        eventId TEXT PRIMARY KEY,
        event TEXT NOT NULL,
        entityId TEXT NOT NULL,
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
        userId TEXT,
        sessionId TEXT,
        context TEXT,
        metadata TEXT,
        memoryAnchor TEXT,
        processed BOOLEAN DEFAULT FALSE,
        processingResult TEXT,
        INDEX (event),
        INDEX (entityId),
        INDEX (timestamp),
        INDEX (processed)
      );
    `,
    rollback: 'DROP TABLE IF EXISTS GovernanceEvents;'
  },
  {
    id: 'create_memory_anchors_table',
    description: 'Create MemoryAnchors table for anchor management',
    sql: `
      CREATE TABLE IF NOT EXISTS MemoryAnchors (
        anchorId TEXT PRIMARY KEY,
        anchorType TEXT NOT NULL,
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
        context TEXT,
        linkedEntities TEXT,
        projectId TEXT,
        phaseId TEXT,
        stepId TEXT,
        filePath TEXT,
        INDEX (anchorType),
        INDEX (timestamp),
        INDEX (projectId),
        FOREIGN KEY (projectId) REFERENCES Projects (projectId) ON DELETE SET NULL,
        FOREIGN KEY (phaseId) REFERENCES Phases (phaseId) ON DELETE SET NULL,
        FOREIGN KEY (stepId) REFERENCES PhaseSteps (stepId) ON DELETE SET NULL
      );
    `,
    rollback: 'DROP TABLE IF EXISTS MemoryAnchors;'
  },
  {
    id: 'create_checkpoint_reviews_table',
    description: 'Create CheckpointReviews table for RAG audit integration',
    sql: `
      CREATE TABLE IF NOT EXISTS CheckpointReviews (
        reviewId TEXT PRIMARY KEY,
        stepId TEXT NOT NULL,
        reviewType TEXT NOT NULL CHECK (reviewType IN ('milestone', 'quality', 'governance', 'technical', 'stakeholder')),
        title TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'requires_action')),
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        completedAt TEXT,
        reviewer TEXT,
        ragAuditResults TEXT,
        memoryAnchor TEXT,
        relatedDocuments TEXT,
        stakeholders TEXT,
        FOREIGN KEY (stepId) REFERENCES PhaseSteps (stepId) ON DELETE CASCADE
      );
    `,
    rollback: 'DROP TABLE IF EXISTS CheckpointReviews;'
  },
  {
    id: 'create_narrative_entries_table',
    description: 'Create NarrativeEntries table for step commentary',
    sql: `
      CREATE TABLE IF NOT EXISTS NarrativeEntries (
        entryId TEXT PRIMARY KEY,
        stepId TEXT NOT NULL,
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
        author TEXT NOT NULL CHECK (author IN ('human', 'ai', 'system')),
        authorName TEXT NOT NULL,
        content TEXT NOT NULL,
        entryType TEXT DEFAULT 'comment' CHECK (entryType IN ('comment', 'insight', 'recommendation', 'checkpoint', 'status_update')),
        metadata TEXT,
        memoryAnchor TEXT,
        FOREIGN KEY (stepId) REFERENCES PhaseSteps (stepId) ON DELETE CASCADE
      );
    `,
    rollback: 'DROP TABLE IF EXISTS NarrativeEntries;'
  },
  {
    id: 'create_cloud_executions_table',
    description: 'Create CloudExecutions table for agentic workflow tracking',
    sql: `
      CREATE TABLE IF NOT EXISTS CloudExecutions (
        executionId TEXT PRIMARY KEY,
        workflowId TEXT NOT NULL,
        projectId TEXT,
        phaseId TEXT,
        stepId TEXT,
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
        startTime TEXT DEFAULT CURRENT_TIMESTAMP,
        endTime TEXT,
        provider TEXT,
        outputs TEXT,
        artifacts TEXT,
        logs TEXT,
        governanceEvents TEXT,
        memoryAnchors TEXT,
        error TEXT,
        FOREIGN KEY (projectId) REFERENCES Projects (projectId) ON DELETE SET NULL,
        FOREIGN KEY (phaseId) REFERENCES Phases (phaseId) ON DELETE SET NULL,
        FOREIGN KEY (stepId) REFERENCES PhaseSteps (stepId) ON DELETE SET NULL
      );
    `,
    rollback: 'DROP TABLE IF EXISTS CloudExecutions;'
  },
  {
    id: 'create_indexes',
    description: 'Create performance indexes for continuous orchestration',
    sql: `
      CREATE INDEX IF NOT EXISTS idx_phases_project_status ON Phases (projectId, status);
      CREATE INDEX IF NOT EXISTS idx_phasesteps_phase_status ON PhaseSteps (phaseId, status);
      CREATE INDEX IF NOT EXISTS idx_phasesteps_project_completion ON PhaseSteps (projectId, completionPercentage);
      CREATE INDEX IF NOT EXISTS idx_stepprogress_step_timestamp ON StepProgress (stepId, timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_narrativeentries_step_timestamp ON NarrativeEntries (stepId, timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_checkpointreviews_step_status ON CheckpointReviews (stepId, status);
      CREATE INDEX IF NOT EXISTS idx_cloudexecutions_workflow_status ON CloudExecutions (workflowId, status);
      CREATE INDEX IF NOT EXISTS idx_memoryanchors_type_timestamp ON MemoryAnchors (anchorType, timestamp DESC);
    `,
    rollback: `
      DROP INDEX IF EXISTS idx_phases_project_status;
      DROP INDEX IF EXISTS idx_phasesteps_phase_status;
      DROP INDEX IF EXISTS idx_phasesteps_project_completion;
      DROP INDEX IF EXISTS idx_stepprogress_step_timestamp;
      DROP INDEX IF EXISTS idx_narrativeentries_step_timestamp;
      DROP INDEX IF EXISTS idx_checkpointreviews_step_status;
      DROP INDEX IF EXISTS idx_cloudexecutions_workflow_status;
      DROP INDEX IF EXISTS idx_memoryanchors_type_timestamp;
    `
  },
  {
    id: 'insert_sample_data',
    description: 'Insert sample data for OF-8.5 initialization',
    sql: `
      INSERT OR IGNORE INTO Phases (phaseId, projectId, phaseName, phaseDescription, phaseOrder, status, memoryAnchor) VALUES
      ('of-8.5-init', 'OF-SDLC-IMP2', 'OF-8.5 Initialization', 'Continuous Orchestration & Cloud Migration initialization phase', 1, 'active', 'of-8.5-init-phase-20250805'),
      ('of-8.5-orchestration', 'OF-SDLC-IMP2', 'Continuous Orchestration', 'Auto-detection and creation of PhaseSteps from governance logs', 2, 'planning', 'of-8.5-orchestration-phase-20250805'),
      ('of-8.5-cloud-migration', 'OF-SDLC-IMP2', 'Cloud Migration', 'Azure OpenAI + Claude Enterprise integration', 3, 'planning', 'of-8.5-cloud-migration-phase-20250805');
      
      INSERT OR IGNORE INTO PhaseSteps (stepId, phaseId, projectId, stepName, stepDescription, stepOrder, status, completionPercentage, memoryAnchor) VALUES
      ('step-continuous-orchestrator', 'of-8.5-orchestration', 'OF-SDLC-IMP2', 'Deploy Continuous Orchestrator', 'Implement auto-detection of governance logs and Memory Anchors', 1, 'completed', 100, 'step-continuous-orchestrator-20250805'),
      ('step-narrative-mode', 'of-8.5-orchestration', 'OF-SDLC-IMP2', 'Implement Narrative Mode', 'Add PhaseStep narrative panels with AI commentary', 2, 'completed', 100, 'step-narrative-mode-20250805'),
      ('step-checkpoint-reviews', 'of-8.5-orchestration', 'OF-SDLC-IMP2', 'Deploy Checkpoint Reviews', 'RAG audit integration for checkpoint reviews', 3, 'completed', 100, 'step-checkpoint-reviews-20250805'),
      ('step-agentic-cloud', 'of-8.5-cloud-migration', 'OF-SDLC-IMP2', 'Deploy Agentic Cloud Orchestrator', 'Azure OpenAI + Claude Enterprise integration', 1, 'completed', 100, 'step-agentic-cloud-20250805'),
      ('step-github-integration', 'of-8.5-cloud-migration', 'OF-SDLC-IMP2', 'GitHub Integration & Cloud Push', 'Feature branch and PR creation with cloud CI/CD', 2, 'in_progress', 75, 'step-github-integration-20250805');
    `,
    rollback: `
      DELETE FROM PhaseSteps WHERE phaseId IN ('of-8.5-init', 'of-8.5-orchestration', 'of-8.5-cloud-migration');
      DELETE FROM Phases WHERE phaseId IN ('of-8.5-init', 'of-8.5-orchestration', 'of-8.5-cloud-migration');
    `
  }
];

class DatabaseMigrator {
  private db: any = null;

  async connect(): Promise<void> {
    this.db = await open({
      filename: DB_PATH,
      driver: sqlite3.Database
    });
  }

  async disconnect(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
    }
  }

  async createBackup(): Promise<void> {
    if (fs.existsSync(DB_PATH)) {
      fs.copyFileSync(DB_PATH, BACKUP_PATH);
      console.log(`✅ Database backup created: ${BACKUP_PATH}`);
    }
  }

  async runMigration(): Promise<void> {
    console.log('🚀 Starting OF-8.5 Database Migration...');
    
    await this.createBackup();
    await this.connect();

    try {
      // Enable foreign keys
      await this.db.exec('PRAGMA foreign_keys = ON;');
      
      // Begin transaction
      await this.db.exec('BEGIN TRANSACTION;');

      for (const step of MIGRATION_STEPS) {
        console.log(`🔄 Executing: ${step.description}`);
        await this.db.exec(step.sql);
        console.log(`✅ Completed: ${step.id}`);
      }

      // Commit transaction
      await this.db.exec('COMMIT;');
      
      console.log('✅ OF-8.5 Database Migration completed successfully!');
      
      // Log migration to governance
      await this.logMigrationEvent('completed');
      
    } catch (error) {
      console.error('❌ Migration failed:', error);
      
      try {
        await this.db.exec('ROLLBACK;');
        console.log('🔄 Transaction rolled back');
      } catch (rollbackError) {
        console.error('❌ Rollback failed:', rollbackError);
      }
      
      await this.logMigrationEvent('failed', error);
      throw error;
    } finally {
      await this.disconnect();
    }
  }

  async rollbackMigration(): Promise<void> {
    console.log('🔄 Starting OF-8.5 Migration Rollback...');
    
    await this.connect();

    try {
      await this.db.exec('BEGIN TRANSACTION;');

      // Execute rollback steps in reverse order
      for (const step of MIGRATION_STEPS.reverse()) {
        if (step.rollback) {
          console.log(`🔄 Rolling back: ${step.description}`);
          await this.db.exec(step.rollback);
          console.log(`✅ Rolled back: ${step.id}`);
        }
      }

      await this.db.exec('COMMIT;');
      console.log('✅ Migration rollback completed');
      
      await this.logMigrationEvent('rolled_back');
      
    } catch (error) {
      console.error('❌ Rollback failed:', error);
      await this.db.exec('ROLLBACK;');
      throw error;
    } finally {
      await this.disconnect();
    }
  }

  async verifyMigration(): Promise<boolean> {
    await this.connect();
    
    try {
      const tables = [
        'Phases', 'PhaseSteps', 'StepProgress', 'GovernanceEvents',
        'MemoryAnchors', 'CheckpointReviews', 'NarrativeEntries', 'CloudExecutions'
      ];

      for (const table of tables) {
        const result = await this.db.get(
          "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
          [table]
        );
        
        if (!result) {
          console.log(`❌ Table missing: ${table}`);
          return false;
        }
        
        console.log(`✅ Table verified: ${table}`);
      }

      // Check sample data
      const phaseCount = await this.db.get('SELECT COUNT(*) as count FROM Phases WHERE phaseId LIKE "of-8.5-%"');
      const stepCount = await this.db.get('SELECT COUNT(*) as count FROM PhaseSteps WHERE phaseId LIKE "of-8.5-%"');
      
      console.log(`✅ OF-8.5 Phases: ${phaseCount.count}`);
      console.log(`✅ OF-8.5 Steps: ${stepCount.count}`);
      
      return true;
      
    } catch (error) {
      console.error('❌ Migration verification failed:', error);
      return false;
    } finally {
      await this.disconnect();
    }
  }

  private async logMigrationEvent(status: string, error?: unknown): Promise<void> {
    const event = {
      event: 'database_migration',
      entityId: 'of-8.5-migration',
      timestamp: new Date().toISOString(),
      context: {
        migration_id: 'of-8.5-continuous-orchestration',
        status,
        tables_affected: MIGRATION_STEPS.length,
        error: error ? String(error) : undefined
      },
      memoryAnchor: `db_migration_${status}_${Date.now()}`
    };

    // Write to governance log
    const logPath = path.join(process.cwd(), 'logs', 'governance', `migration-${Date.now()}.jsonl`);
    fs.appendFileSync(logPath, JSON.stringify(event) + '\n');
    
    console.log(`📝 Migration event logged: ${status}`);
  }

  async generateMigrationReport(): Promise<void> {
    await this.connect();
    
    const report = {
      migration_id: 'of-8.5-continuous-orchestration',
      timestamp: new Date().toISOString(),
      database_path: DB_PATH,
      backup_path: BACKUP_PATH,
      tables_created: MIGRATION_STEPS.filter(s => s.id.includes('create')).length,
      indexes_created: 8,
      sample_data: true,
      verification_passed: await this.verifyMigration()
    };

    const reportPath = path.join(process.cwd(), 'DriveMemory', 'OF-8.5', 'migration-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`📊 Migration report generated: ${reportPath}`);
    
    await this.disconnect();
  }
}

// CLI interface
async function main() {
  const migrator = new DatabaseMigrator();
  const command = process.argv[2];

  try {
    switch (command) {
      case 'migrate':
        await migrator.runMigration();
        await migrator.generateMigrationReport();
        break;
      case 'rollback':
        await migrator.rollbackMigration();
        break;
      case 'verify':
        const isValid = await migrator.verifyMigration();
        process.exit(isValid ? 0 : 1);
        break;
      default:
        console.log('Usage: npx tsx scripts/db-migration-of-8.5.ts [migrate|rollback|verify]');
        process.exit(1);
    }
  } catch (error) {
    console.error('Migration script failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { DatabaseMigrator, MIGRATION_STEPS };
export default DatabaseMigrator;