/**
 * API Endpoints for Governance-Project Integration
 * Handles governance log processing and project registration
 */

import express from 'express';
import GovernanceProjectIntegration from '../../services/governanceProjectIntegration';
import DatabaseManager from '../database/connection';

const router = express.Router();

// POST /api/admin/governance/process-entry
router.post('/process-entry', async (req, res) => {
  try {
    console.log('📥 Processing governance entry for project registration');
    
    const integration = new GovernanceProjectIntegration();
    const result = await integration.processGovernanceEntry(req.body);
    
    res.json({
      success: true,
      processed: result,
      message: result ? 'Project created/updated from governance log' : 'No project action needed'
    });
  } catch (error) {
    console.error('Error processing governance entry:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process governance entry'
    });
  }
});

// POST /api/admin/projects/backfill
router.post('/backfill', async (req, res) => {
  try {
    const { projectIds } = req.body;
    
    if (!Array.isArray(projectIds)) {
      return res.status(400).json({
        success: false,
        error: 'projectIds must be an array'
      });
    }
    
    console.log(`📦 Backfilling ${projectIds.length} projects`);
    
    const integration = new GovernanceProjectIntegration();
    await integration.backfillMissingProjects(projectIds);
    
    res.json({
      success: true,
      backfilled: projectIds.length,
      message: `Backfilled ${projectIds.length} projects from governance logs`
    });
  } catch (error) {
    console.error('Error backfilling projects:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to backfill projects'
    });
  }
});

// POST /api/admin/governance/process-all
router.post('/process-all', async (req, res) => {
  try {
    console.log('📄 Processing all governance logs for project registration');
    
    const integration = new GovernanceProjectIntegration();
    await integration.processAllGovernanceLogs();
    
    res.json({
      success: true,
      message: 'All governance logs processed for project registration'
    });
  } catch (error) {
    console.error('Error processing all governance logs:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process governance logs'
    });
  }
});

// GET /api/admin/governance/validate-integrity
router.get('/validate-integrity', async (req, res) => {
  try {
    console.log('🔍 Validating project registration integrity');
    
    const integration = new GovernanceProjectIntegration();
    await integration.validateProjectIntegrity();
    
    res.json({
      success: true,
      message: 'Project registration integrity validated'
    });
  } catch (error) {
    console.error('Error validating integrity:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to validate integrity'
    });
  }
});

// GET /api/admin/projects/missing
router.get('/missing', async (req, res) => {
  try {
    console.log('🔍 Finding missing projects referenced in governance logs');
    
    const dbManager = DatabaseManager.getInstance();
    const db = await dbManager.getConnection();
    
    // Get all project IDs from database
    const existingProjects = await db.all('SELECT projectId FROM projects');
    const existingIds = new Set(existingProjects.map((p: any) => p.projectId));
    
    // Find governance-referenced projects
    const { readdir, readFile } = require('fs/promises');
    const { join } = require('path');
    const governanceProjectIds = new Set<string>();
    
    const logsDir = join(process.cwd(), 'logs', 'governance');
    const files = await readdir(logsDir);
    const jsonlFiles = files.filter(f => f.endsWith('.jsonl') || f.endsWith('.json'));
    
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
          
          // Pattern matching for project IDs
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
    
    const missingProjects = Array.from(governanceProjectIds).filter(id => !existingIds.has(id));
    
    res.json({
      success: true,
      data: {
        existing: existingIds.size,
        governanceReferenced: governanceProjectIds.size,
        missing: missingProjects.length,
        missingProjectIds: missingProjects
      }
    });
  } catch (error) {
    console.error('Error finding missing projects:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to find missing projects'
    });
  }
});

// GET /api/admin/projects/stats
router.get('/stats', async (req, res) => {
  try {
    const dbManager = DatabaseManager.getInstance();
    const db = await dbManager.getConnection();
    
    const stats = await db.get(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN keyTasks IS NOT NULL THEN 1 END) as withKeyTasks,
        COUNT(CASE WHEN aiPromptLog IS NOT NULL THEN 1 END) as withAiPromptLog,
        COUNT(CASE WHEN updatedAt > datetime('now', '-24 hours') THEN 1 END) as recentlyUpdated
      FROM projects
    `);
    
    const recentProjects = await db.all(`
      SELECT projectId, projectName, status, updatedAt 
      FROM projects 
      WHERE updatedAt > datetime('now', '-7 days')
      ORDER BY updatedAt DESC
      LIMIT 10
    `);
    
    res.json({
      success: true,
      data: {
        statistics: stats,
        recentProjects
      }
    });
  } catch (error) {
    console.error('Error getting project stats:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get project statistics'
    });
  }
});

export default router;