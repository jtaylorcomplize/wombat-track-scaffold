/**
 * Projects Database Service
 * Provides database operations for Projects with SubApp relationships
 */

import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'databases', 'production.db');

export interface DBProject {
  projectId: string;
  projectName: string;
  owner?: string;
  status?: string;
  description?: string;
  goals?: string;
  scopeNotes?: string;
  RAG?: string;
  startDate?: string;
  endDate?: string;
  priority?: string;
  budget?: number;
  actualCost?: number;
  estimatedHours?: number;
  actualHours?: number;
  completionPercentage?: number;
  risk?: string;
  stakeholders?: string;
  tags?: string;
  category?: string;
  department?: string;
  subApp_ref?: string;
  editableByAdmin?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface DBSubApp {
  subAppId: string;
  subAppName: string;
  owner?: string;
  purpose?: string;
}

export interface ProjectsQuery {
  status?: string;
  priority?: string;
  subAppId?: string;
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

class ProjectsDBService {
  private db: any = null;

  async connect() {
    if (!this.db) {
      this.db = await open({
        filename: DB_PATH,
        driver: sqlite3.Database
      });
    }
    return this.db;
  }

  async disconnect() {
    if (this.db) {
      await this.db.close();
      this.db = null;
    }
  }

  async getAllProjects(query: ProjectsQuery = {}): Promise<DBProject[]> {
    const db = await this.connect();
    
    let sql = `
      SELECT 
        projectId, projectName, owner, status, description, goals, scopeNotes,
        RAG, startDate, endDate, priority, budget, actualCost, estimatedHours,
        actualHours, completionPercentage, risk, stakeholders, tags, category,
        department, subApp_ref, editableByAdmin, createdAt, updatedAt
      FROM Projects
      WHERE 1=1
    `;
    
    const params: any[] = [];
    
    // Apply filters
    if (query.status && query.status !== 'all') {
      sql += ' AND status = ?';
      params.push(query.status);
    }
    
    if (query.priority && query.priority !== 'all') {
      sql += ' AND priority = ?';
      params.push(query.priority);
    }
    
    if (query.subAppId && query.subAppId !== 'all') {
      sql += ' AND subApp_ref = ?';
      params.push(query.subAppId);
    }
    
    if (query.search) {
      sql += ' AND (projectName LIKE ? OR description LIKE ? OR owner LIKE ?)';
      const searchTerm = `%${query.search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    
    // Apply sorting
    const validSortFields = ['projectName', 'status', 'priority', 'owner', 'updatedAt', 'startDate'];
    const sortBy = validSortFields.includes(query.sortBy || '') ? query.sortBy : 'projectName';
    const sortOrder = query.sortOrder === 'desc' ? 'DESC' : 'ASC';
    sql += ` ORDER BY ${sortBy} ${sortOrder}`;
    
    // Apply pagination
    if (query.limit) {
      sql += ' LIMIT ?';
      params.push(query.limit);
      
      if (query.offset) {
        sql += ' OFFSET ?';
        params.push(query.offset);
      }
    }
    
    try {
      const projects = await db.all(sql, params);
      return projects;
    } catch (error) {
      console.error('Error fetching projects:', error);
      throw error;
    }
  }

  async getProjectById(projectId: string): Promise<DBProject | null> {
    const db = await this.connect();
    
    try {
      const project = await db.get(`
        SELECT 
          projectId, projectName, owner, status, description, goals, scopeNotes,
          RAG, startDate, endDate, priority, budget, actualCost, estimatedHours,
          actualHours, completionPercentage, risk, stakeholders, tags, category,
          department, subApp_ref, editableByAdmin, createdAt, updatedAt
        FROM Projects 
        WHERE projectId = ?
      `, [projectId]);
      
      return project || null;
    } catch (error) {
      console.error('Error fetching project by ID:', error);
      throw error;
    }
  }

  async getProjectsBySubApp(subAppId: string): Promise<DBProject[]> {
    const db = await this.connect();
    
    try {
      const projects = await db.all(`
        SELECT 
          projectId, projectName, owner, status, description, goals, scopeNotes,
          RAG, startDate, endDate, priority, budget, actualCost, estimatedHours,
          actualHours, completionPercentage, risk, stakeholders, tags, category,
          department, subApp_ref, editableByAdmin, createdAt, updatedAt
        FROM Projects 
        WHERE subApp_ref = ?
        ORDER BY projectName ASC
      `, [subAppId]);
      
      return projects;
    } catch (error) {
      console.error('Error fetching projects by SubApp:', error);
      throw error;
    }
  }

  async getAllSubApps(): Promise<DBSubApp[]> {
    // For now, return the known SubApps from production data
    // This could be enhanced to query a SubApps table if one exists
    return [
      { subAppId: 'MetaPlatform', subAppName: 'MetaPlatform', purpose: 'Universal platform integration' },
      { subAppId: 'Complize', subAppName: 'Complize', purpose: 'Immigration compliance platform' },
      { subAppId: 'Orbis', subAppName: 'Orbis', purpose: 'Core governance platform' },
      { subAppId: 'Roam', subAppName: 'Roam', purpose: 'Knowledge management' }
    ];
  }

  async getProjectStats(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    bySubApp: Record<string, number>;
    byPriority: Record<string, number>;
  }> {
    const db = await this.connect();
    
    try {
      const [totalResult] = await Promise.all([
        db.get('SELECT COUNT(*) as count FROM Projects'),
      ]);
      
      const [statusStats, subAppStats, priorityStats] = await Promise.all([
        db.all(`
          SELECT status, COUNT(*) as count 
          FROM Projects 
          WHERE status IS NOT NULL 
          GROUP BY status
        `),
        db.all(`
          SELECT subApp_ref, COUNT(*) as count 
          FROM Projects 
          WHERE subApp_ref IS NOT NULL 
          GROUP BY subApp_ref
        `),
        db.all(`
          SELECT priority, COUNT(*) as count 
          FROM Projects 
          WHERE priority IS NOT NULL 
          GROUP BY priority
        `)
      ]);
      
      return {
        total: totalResult.count,
        byStatus: statusStats.reduce((acc: any, row: any) => {
          acc[row.status] = row.count;
          return acc;
        }, {}),
        bySubApp: subAppStats.reduce((acc: any, row: any) => {
          acc[row.subApp_ref] = row.count;
          return acc;
        }, {}),
        byPriority: priorityStats.reduce((acc: any, row: any) => {
          acc[row.priority] = row.count;
          return acc;
        }, {})
      };
    } catch (error) {
      console.error('Error fetching project stats:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const projectsDB = new ProjectsDBService();
export default projectsDB;