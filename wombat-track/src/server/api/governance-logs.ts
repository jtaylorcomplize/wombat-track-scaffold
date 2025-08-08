/**
 * Enhanced Governance Logs API Routes
 * RESTful API endpoints for governance logs management
 */

import express from 'express';
import { governanceLogsService, GovernanceLog, CreateGovernanceLogRequest, UpdateGovernanceLogRequest, GovernanceLogsQuery } from '../../services/governanceLogsService';

const router = express.Router();

// Middleware for error handling
const asyncHandler = (fn: Function) => (req: express.Request, res: express.Response, next: express.NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// GET /api/admin/governance_logs - List governance logs with filtering and pagination
router.get('/', asyncHandler(async (req: express.Request, res: express.Response) => {
  try {
    const query: GovernanceLogsQuery = {
      q: req.query.q as string,
      phase_id: req.query.phase_id as string,
      step_id: req.query.step_id as string,
      entryType: req.query.entryType as string,
      classification: req.query.classification as string,
      from: req.query.from as string,
      to: req.query.to as string,
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      page_size: req.query.page_size ? parseInt(req.query.page_size as string) : undefined
    };

    const result = await governanceLogsService.listGovernanceLogs(query);
    res.json(result);
  } catch (error) {
    console.error('Error listing governance logs:', error);
    res.status(500).json({
      error: 'Failed to retrieve governance logs',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

// POST /api/admin/governance_logs - Create new governance log
router.post('/', asyncHandler(async (req: express.Request, res: express.Response) => {
  try {
    const data: CreateGovernanceLogRequest = req.body;
    
    // Validate required fields
    if (!data.entryType || !data.summary) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['entryType', 'summary']
      });
    }

    // Validate entryType
    const validEntryTypes = ['Decision', 'Change', 'Review', 'Architecture', 'Process', 'Risk', 'Compliance', 'Quality', 'Security', 'Performance'];
    if (!validEntryTypes.includes(data.entryType)) {
      return res.status(400).json({
        error: 'Invalid entryType',
        validTypes: validEntryTypes
      });
    }

    // Add created_by from request headers or default
    data.created_by = req.headers['x-user-id'] as string || 'system';

    const governanceLog = await governanceLogsService.createGovernanceLog(data);
    res.status(201).json(governanceLog);
  } catch (error) {
    console.error('Error creating governance log:', error);
    res.status(500).json({
      error: 'Failed to create governance log',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

// GET /api/admin/governance_logs/search - Search governance logs
router.get('/search', asyncHandler(async (req: express.Request, res: express.Response) => {
  try {
    const q = req.query.q as string;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;

    if (!q) {
      return res.status(400).json({
        error: 'Missing required parameter',
        required: ['q']
      });
    }

    const results = await governanceLogsService.searchGovernanceLogs(q, limit);
    res.json({
      data: results,
      total: results.length
    });
  } catch (error) {
    console.error('Error searching governance logs:', error);
    res.status(500).json({
      error: 'Failed to search governance logs',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

// GET /api/admin/governance_logs/:id - Get specific governance log
router.get('/:id', asyncHandler(async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    const governanceLog = await governanceLogsService.getGovernanceLog(id);

    if (!governanceLog) {
      return res.status(404).json({
        error: 'Governance log not found',
        id
      });
    }

    res.json(governanceLog);
  } catch (error) {
    console.error('Error retrieving governance log:', error);
    res.status(500).json({
      error: 'Failed to retrieve governance log',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

// PUT /api/admin/governance_logs/:id - Update governance log
router.put('/:id', asyncHandler(async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    const data: UpdateGovernanceLogRequest = req.body;

    const governanceLog = await governanceLogsService.updateGovernanceLog(id, data);

    if (!governanceLog) {
      return res.status(404).json({
        error: 'Governance log not found',
        id
      });
    }

    res.json(governanceLog);
  } catch (error) {
    console.error('Error updating governance log:', error);
    res.status(500).json({
      error: 'Failed to update governance log',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

// DELETE /api/admin/governance_logs/:id - Archive governance log
router.delete('/:id', asyncHandler(async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    const success = await governanceLogsService.archiveGovernanceLog(id);

    if (!success) {
      return res.status(404).json({
        error: 'Governance log not found',
        id
      });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error archiving governance log:', error);
    res.status(500).json({
      error: 'Failed to archive governance log',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

// GET /api/admin/governance_logs/links/:targetId - Get logs linked to a specific target
router.get('/links/:targetId', asyncHandler(async (req: express.Request, res: express.Response) => {
  try {
    const { targetId } = req.params;
    const logs = await governanceLogsService.getLinkedLogs(targetId);
    res.json({
      data: logs,
      total: logs.length,
      targetId
    });
  } catch (error) {
    console.error('Error retrieving linked logs:', error);
    res.status(500).json({
      error: 'Failed to retrieve linked logs',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

// Error handling middleware for this router
router.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Governance Logs API Error:', err);
  
  if (res.headersSent) {
    return next(err);
  }
  
  res.status(500).json({
    error: 'Internal server error in governance logs API',
    message: err.message || 'Unknown error',
    timestamp: new Date().toISOString()
  });
});

export default router;