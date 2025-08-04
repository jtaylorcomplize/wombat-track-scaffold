import * as sqlite3 from 'sqlite3';
import type { Database} from 'sqlite';
import { open } from 'sqlite';
import * as path from 'path';
import { promises as fs } from 'fs';

interface DatabasePool {
  db: Database;
  transactions: Map<string, any>;
  connectionCount: number;
}

class DatabaseManager {
  private static instance: DatabaseManager;
  private pools: Map<string, DatabasePool> = new Map();

  static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  async getConnection(dbName: string = 'production'): Promise<Database> {
    let pool = this.pools.get(dbName);
    
    if (!pool) {
      // Create database directory if it doesn't exist
      const dbPath = path.join(process.cwd(), 'databases', `${dbName}.db`);
      await fs.mkdir(path.dirname(dbPath), { recursive: true });
      
      const db = await open({
        filename: dbPath,
        driver: sqlite3.default.Database
      });

      // Initialize schema if needed
      await this.initializeSchema(db);

      pool = {
        db,
        transactions: new Map(),
        connectionCount: 0
      };
      
      this.pools.set(dbName, pool);
    }

    pool.connectionCount++;
    return pool.db;
  }

  async beginTransaction(dbName: string = 'production'): Promise<string> {
    const db = await this.getConnection(dbName);
    const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      await db.exec('BEGIN TRANSACTION');
      const pool = this.pools.get(dbName)!;
      pool.transactions.set(transactionId, { startTime: new Date(), queries: [] });
      
      return transactionId;
    } catch (error) {
      console.error('Failed to begin transaction:', error);
      throw error;
    }
  }

  async commitTransaction(transactionId: string, dbName: string = 'production'): Promise<void> {
    const db = await this.getConnection(dbName);
    
    try {
      await db.exec('COMMIT');
      const pool = this.pools.get(dbName)!;
      pool.transactions.delete(transactionId);
    } catch (error) {
      console.error('Failed to commit transaction:', error);
      await this.rollbackTransaction(transactionId, dbName);
      throw error;
    }
  }

  async rollbackTransaction(transactionId: string, dbName: string = 'production'): Promise<void> {
    const db = await this.getConnection(dbName);
    
    try {
      await db.exec('ROLLBACK');
      const pool = this.pools.get(dbName)!;
      pool.transactions.delete(transactionId);
    } catch (error) {
      console.error('Failed to rollback transaction:', error);
      throw error;
    }
  }

  async executeQuery(query: string, params: any[] = [], transactionId?: string, dbName: string = 'production'): Promise<any> {
    const db = await this.getConnection(dbName);
    
    try {
      if (transactionId) {
        const pool = this.pools.get(dbName)!;
        const transaction = pool.transactions.get(transactionId);
        if (transaction) {
          transaction.queries.push({ query, params, timestamp: new Date() });
        }
      }

      if (query.trim().toUpperCase().startsWith('SELECT')) {
        return await db.all(query, params);
      } else {
        return await db.run(query, params);
      }
    } catch (error) {
      console.error('Database query failed:', error);
      if (transactionId) {
        await this.rollbackTransaction(transactionId, dbName);
      }
      throw error;
    }
  }

  private async initializeSchema(db: Database): Promise<void> {
    // Create tables if they don't exist
    const schema = `
      CREATE TABLE IF NOT EXISTS projects (
        projectId TEXT PRIMARY KEY,
        projectName TEXT NOT NULL,
        owner TEXT,
        status TEXT DEFAULT 'Planning',
        description TEXT,
        goals TEXT,
        scopeNotes TEXT,
        RAG TEXT DEFAULT 'Green',
        startDate DATE,
        endDate DATE,
        priority TEXT,
        budget REAL,
        actualCost REAL,
        estimatedHours INTEGER,
        actualHours INTEGER,
        completionPercentage INTEGER DEFAULT 0,
        risk TEXT,
        stakeholders TEXT,
        tags TEXT,
        category TEXT,
        department TEXT,
        isDraft INTEGER DEFAULT 0,
        draftEditedBy TEXT,
        draftEditedAt DATETIME,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS phases (
        phaseid TEXT PRIMARY KEY,
        phasename TEXT NOT NULL,
        project_ref TEXT,
        status TEXT DEFAULT 'Planned',
        startDate DATE,
        endDate DATE,
        RAG TEXT DEFAULT 'Green',
        notes TEXT,
        estimatedDuration INTEGER,
        actualDuration INTEGER,
        isDraft INTEGER DEFAULT 0,
        draftEditedBy TEXT,
        draftEditedAt DATETIME,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_ref) REFERENCES projects(projectId)
      );

      CREATE TABLE IF NOT EXISTS step_progress (
        stepId TEXT PRIMARY KEY,
        phaseId TEXT,
        stepName TEXT NOT NULL,
        status TEXT DEFAULT 'Pending',
        progress INTEGER DEFAULT 0,
        assignedTo TEXT,
        dueDate DATE,
        completedAt DATETIME,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (phaseId) REFERENCES phases(phaseid)
      );

      CREATE TABLE IF NOT EXISTS governance_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        event_type TEXT NOT NULL,
        user_id TEXT,
        user_role TEXT,
        resource_type TEXT,
        resource_id TEXT,
        action TEXT,
        success BOOLEAN DEFAULT 1,
        details TEXT,
        runtime_context TEXT
      );

      CREATE TABLE IF NOT EXISTS change_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        table_name TEXT NOT NULL,
        record_id TEXT NOT NULL,
        field_name TEXT NOT NULL,
        old_value TEXT,
        new_value TEXT,
        changed_by TEXT,
        changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        transaction_id TEXT,
        governance_log_id INTEGER,
        FOREIGN KEY (governance_log_id) REFERENCES governance_logs(id)
      );

      -- Indexes for performance
      CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner);
      CREATE INDEX IF NOT EXISTS idx_phases_project ON phases(project_ref);
      CREATE INDEX IF NOT EXISTS idx_step_progress_phase ON step_progress(phaseId);
      CREATE INDEX IF NOT EXISTS idx_governance_logs_type ON governance_logs(event_type);
      CREATE INDEX IF NOT EXISTS idx_governance_logs_user ON governance_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_change_history_table_record ON change_history(table_name, record_id);
    `;

    await db.exec(schema);
  }

  async getTransactionInfo(transactionId: string, dbName: string = 'production'): Promise<any> {
    const pool = this.pools.get(dbName);
    if (!pool) return null;
    
    return pool.transactions.get(transactionId) || null;
  }

  async closeAllConnections(): Promise<void> {
    this.pools.forEach(async (pool, dbName) => {
      try {
        await pool.db.close();
      } catch (error) {
        console.error(`Failed to close database ${dbName}:`, error);
      }
    });
    this.pools.clear();
  }
}

export default DatabaseManager;