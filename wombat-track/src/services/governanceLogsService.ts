/**
 * Enhanced Governance Logs Service
 * First-class backend service for governance logs with cross-linking capabilities
 */

import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'databases', 'production.db');

export interface GovernanceLog {
  id: string;
  timestamp: string;
  entryType: 'Decision' | 'Change' | 'Review' | 'Architecture' | 'Process' | 'Risk' | 'Compliance' | 'Quality' | 'Security' | 'Performance';
  summary: string;
  gptDraftEntry?: string;
  classification?: string;
  related_phase?: string;
  related_step?: string;
  linked_anchor?: string;
  created_by: string;
  updated_at?: string;
  links?: LogLink[];
}

export interface LogLink {
  target_id: string;
  link_type: 'reference' | 'dependency' | 'impact' | 'follow_up';
  created_at?: string;
}

export interface CreateGovernanceLogRequest {
  entryType: GovernanceLog['entryType'];
  summary: string;
  gptDraftEntry?: string;
  classification?: string;
  related_phase?: string;
  related_step?: string;
  linked_anchor?: string;
  links?: Omit<LogLink, 'created_at'>[];
  created_by?: string;
}

export interface UpdateGovernanceLogRequest {
  summary?: string;
  gptDraftEntry?: string;
  classification?: string;
  related_phase?: string;
  related_step?: string;
  linked_anchor?: string;
}

export interface GovernanceLogsQuery {
  q?: string;
  phase_id?: string;
  step_id?: string;
  entryType?: string;
  classification?: string;
  from?: string;
  to?: string;
  page?: number;
  page_size?: number;
}

export interface PaginationResult<T> {
  data: T[];
  pagination: {
    page: number;
    page_size: number;
    total_pages: number;
    total_items: number;
    has_next: boolean;
    has_previous: boolean;
  };
}

export class GovernanceLogsService {
  private db: any = null;

  async init() {
    if (!this.db) {
      this.db = await open({
        filename: DB_PATH,
        driver: sqlite3.Database
      });
    }
    return this.db;
  }

  async createGovernanceLog(data: CreateGovernanceLogRequest): Promise<GovernanceLog> {
    const db = await this.init();
    const id = this.generateId();
    const timestamp = new Date().toISOString();
    const created_by = data.created_by || 'system';

    await db.run(`
      INSERT INTO enhanced_governance_logs (
        id, timestamp, entryType, summary, gptDraftEntry, classification,
        related_phase, related_step, linked_anchor, created_by, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id, timestamp, data.entryType, data.summary, data.gptDraftEntry,
      data.classification, data.related_phase, data.related_step,
      data.linked_anchor, created_by, timestamp
    ]);

    // Create links if provided
    if (data.links && data.links.length > 0) {
      await this.createLinks(id, data.links);
    }

    return await this.getGovernanceLog(id) as GovernanceLog;
  }

  async getGovernanceLog(id: string): Promise<GovernanceLog | null> {
    const db = await this.init();
    
    const log = await db.get(`
      SELECT * FROM enhanced_governance_logs WHERE id = ?
    `, id);

    if (!log) return null;

    const links = await db.all(`
      SELECT target_id, link_type, created_at 
      FROM enhanced_log_links 
      WHERE source_log = ?
    `, id);

    return { ...log, links };
  }

  async updateGovernanceLog(id: string, data: UpdateGovernanceLogRequest): Promise<GovernanceLog | null> {
    const db = await this.init();
    const updated_at = new Date().toISOString();

    const updates: string[] = [];
    const values: any[] = [];

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        updates.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (updates.length === 0) {
      return await this.getGovernanceLog(id);
    }

    updates.push('updated_at = ?');
    values.push(updated_at, id);

    await db.run(`
      UPDATE enhanced_governance_logs 
      SET ${updates.join(', ')}
      WHERE id = ?
    `, values);

    return await this.getGovernanceLog(id);
  }

  async archiveGovernanceLog(id: string): Promise<boolean> {
    const db = await this.init();
    
    // Soft delete by marking as archived
    const result = await db.run(`
      UPDATE enhanced_governance_logs 
      SET classification = 'archived', updated_at = ?
      WHERE id = ?
    `, [new Date().toISOString(), id]);

    return result.changes > 0;
  }

  async listGovernanceLogs(query: GovernanceLogsQuery = {}): Promise<PaginationResult<GovernanceLog>> {
    const db = await this.init();
    const page = query.page || 1;
    const page_size = Math.min(query.page_size || 50, 200);
    const offset = (page - 1) * page_size;

    let whereClause = "WHERE classification != 'archived' OR classification IS NULL";
    const params: any[] = [];

    // Build where clause based on query parameters
    if (query.phase_id) {
      whereClause += " AND related_phase = ?";
      params.push(query.phase_id);
    }

    if (query.step_id) {
      whereClause += " AND related_step = ?";
      params.push(query.step_id);
    }

    if (query.entryType) {
      whereClause += " AND entryType = ?";
      params.push(query.entryType);
    }

    if (query.classification) {
      whereClause += " AND classification = ?";
      params.push(query.classification);
    }

    if (query.from) {
      whereClause += " AND timestamp >= ?";
      params.push(query.from);
    }

    if (query.to) {
      whereClause += " AND timestamp <= ?";
      params.push(query.to);
    }

    if (query.q) {
      whereClause += " AND (summary LIKE ? OR gptDraftEntry LIKE ?)";
      const searchTerm = `%${query.q}%`;
      params.push(searchTerm, searchTerm);
    }

    // Get total count
    const totalResult = await db.get(`
      SELECT COUNT(*) as total FROM enhanced_governance_logs ${whereClause}
    `, params);
    const total_items = totalResult.total;

    // Get paginated results
    const logs = await db.all(`
      SELECT * FROM enhanced_governance_logs ${whereClause}
      ORDER BY timestamp DESC
      LIMIT ? OFFSET ?
    `, [...params, page_size, offset]);

    // Add links to each log
    const logsWithLinks = await Promise.all(logs.map(async (log: any) => {
      const links = await db.all(`
        SELECT target_id, link_type, created_at 
        FROM enhanced_log_links 
        WHERE source_log = ?
      `, log.id);
      return { ...log, links };
    }));

    const total_pages = Math.ceil(total_items / page_size);

    return {
      data: logsWithLinks,
      pagination: {
        page,
        page_size,
        total_pages,
        total_items,
        has_next: page < total_pages,
        has_previous: page > 1
      }
    };
  }

  async searchGovernanceLogs(searchQuery: string, limit = 20): Promise<GovernanceLog[]> {
    const db = await this.init();
    
    // Simple text search - can be enhanced with vector search later
    const logs = await db.all(`
      SELECT *, 
             (CASE 
               WHEN summary LIKE ? THEN 1.0
               WHEN gptDraftEntry LIKE ? THEN 0.8
               WHEN classification LIKE ? THEN 0.6
               ELSE 0.4
             END) as relevance_score
      FROM enhanced_governance_logs 
      WHERE (summary LIKE ? OR gptDraftEntry LIKE ? OR classification LIKE ?)
        AND (classification != 'archived' OR classification IS NULL)
      ORDER BY relevance_score DESC, timestamp DESC
      LIMIT ?
    `, [
      `%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`,
      `%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`,
      limit
    ]);

    // Add links to each log
    const logsWithLinks = await Promise.all(logs.map(async (log: any) => {
      const links = await db.all(`
        SELECT target_id, link_type, created_at 
        FROM enhanced_log_links 
        WHERE source_log = ?
      `, log.id);
      return { ...log, links };
    }));

    return logsWithLinks;
  }

  async createLinks(sourceLogId: string, links: Omit<LogLink, 'created_at'>[]): Promise<void> {
    const db = await this.init();
    const created_at = new Date().toISOString();

    const stmt = await db.prepare(`
      INSERT OR REPLACE INTO enhanced_log_links (source_log, target_id, link_type, created_at)
      VALUES (?, ?, ?, ?)
    `);

    for (const link of links) {
      await stmt.run(sourceLogId, link.target_id, link.link_type, created_at);
    }

    await stmt.finalize();
  }

  async getLinkedLogs(targetId: string): Promise<GovernanceLog[]> {
    const db = await this.init();
    
    const logs = await db.all(`
      SELECT gl.* FROM enhanced_governance_logs gl
      INNER JOIN enhanced_log_links ll ON gl.id = ll.source_log
      WHERE ll.target_id = ?
      ORDER BY gl.timestamp DESC
    `, targetId);

    return logs;
  }

  private generateId(): string {
    return `govlog-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const governanceLogsService = new GovernanceLogsService();