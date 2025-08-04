/**
 * Import API Router
 * Combines all SDLC import endpoints
 */

import express from 'express';
import projectImportRouter from './projectImport';
import phaseImportRouter from './phaseImport';
import phaseStepImportRouter from './phaseStepImport';
import governanceLogImportRouter from './governanceLogImport';
import memoryAnchorImportRouter from './memoryAnchorImport';
import { DriveMemoryLogger } from './driveMemoryLogger';

const router = express.Router();

// Import endpoint routes
router.use('/projects', projectImportRouter);
router.use('/phases', phaseImportRouter);
router.use('/phase-steps', phaseStepImportRouter);
router.use('/governance-logs', governanceLogImportRouter);
router.use('/memory-anchors', memoryAnchorImportRouter);

// GET /api/admin/import/status - Get import system status
router.get('/status', async (req, res) => {
  try {
    const driveMemoryLogger = DriveMemoryLogger.getInstance();
    const recentImports = await driveMemoryLogger.getImportHistory(10);
    
    const importStats = {
      totalImports: recentImports.length,
      successfulImports: recentImports.filter(i => i.status === 'success').length,
      failedImports: recentImports.filter(i => i.status === 'error').length,
      lastImport: recentImports.length > 0 ? recentImports[recentImports.length - 1] : null
    };

    res.json({
      success: true,
      status: 'operational',
      endpoints: [
        'POST /api/admin/import/projects - Import canonical project JSON',
        'POST /api/admin/import/phases - Import phases for a project',
        'POST /api/admin/import/phase-steps - Import phase steps with SDLC fields',
        'POST /api/admin/import/governance-logs - Import governance log entries',
        'POST /api/admin/import/memory-anchors - Import memory anchors (QA-complete only)'
      ],
      statistics: importStats,
      recentImports: recentImports.slice(-5), // Last 5 imports
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Import status check failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get import system status',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/admin/import/history - Get import history
router.get('/history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const driveMemoryLogger = DriveMemoryLogger.getInstance();
    const importHistory = await driveMemoryLogger.getImportHistory(limit);
    
    res.json({
      success: true,
      data: importHistory,
      count: importHistory.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to get import history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get import history',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Health check for import system
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'sdlc-import-api',
    version: '1.0.0',
    features: [
      'Canonical project import',
      'Phase and step import',
      'Governance log import',
      'Memory anchor import (QA-restricted)',
      'DriveMemory logging',
      'Agent trigger integration',
      'SDLC hygiene validation'
    ],
    timestamp: new Date().toISOString()
  });
});

export default router;