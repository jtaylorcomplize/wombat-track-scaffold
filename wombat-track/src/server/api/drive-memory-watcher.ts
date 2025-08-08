/**
 * DriveMemory Watcher API Routes
 * Endpoints for monitoring and controlling the DriveMemory file watcher
 */

import express from 'express';
import DriveMemoryWatcherService from '../services/driveMemoryWatcherService';

const router = express.Router();

// Middleware for error handling
const asyncHandler = (fn: Function) => (req: express.Request, res: express.Response, next: express.NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// GET /api/admin/drive-memory-watcher/status - Get watcher status
router.get('/status', asyncHandler(async (req: express.Request, res: express.Response) => {
  try {
    const watcherService = DriveMemoryWatcherService.getInstance();
    const info = watcherService.getWatcherInfo();
    
    res.json({
      success: true,
      watcher: info,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting DriveMemory watcher status:', error);
    res.status(500).json({
      error: 'Failed to get watcher status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

// POST /api/admin/drive-memory-watcher/start - Start the watcher
router.post('/start', asyncHandler(async (req: express.Request, res: express.Response) => {
  try {
    const watcherService = DriveMemoryWatcherService.getInstance();
    await watcherService.initialize();
    
    const info = watcherService.getWatcherInfo();
    
    res.json({
      success: true,
      message: 'DriveMemory watcher started successfully',
      watcher: info,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error starting DriveMemory watcher:', error);
    res.status(500).json({
      error: 'Failed to start watcher',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

// POST /api/admin/drive-memory-watcher/stop - Stop the watcher
router.post('/stop', asyncHandler(async (req: express.Request, res: express.Response) => {
  try {
    const watcherService = DriveMemoryWatcherService.getInstance();
    await watcherService.shutdown();
    
    res.json({
      success: true,
      message: 'DriveMemory watcher stopped successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error stopping DriveMemory watcher:', error);
    res.status(500).json({
      error: 'Failed to stop watcher',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

// GET /api/admin/drive-memory-watcher/files - Get processed files list
router.get('/files', asyncHandler(async (req: express.Request, res: express.Response) => {
  try {
    const watcherService = DriveMemoryWatcherService.getInstance();
    const watcher = watcherService.getWatcher();
    
    if (!watcher) {
      return res.json({
        success: false,
        message: 'Watcher not initialized',
        processedFiles: []
      });
    }
    
    const processedFiles = watcher.getProcessedFiles();
    const status = watcher.getStatus();
    
    res.json({
      success: true,
      processedFiles,
      totalFiles: processedFiles.length,
      watcherStatus: status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting processed files:', error);
    res.status(500).json({
      error: 'Failed to get processed files',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

// Error handling middleware for this router
router.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('DriveMemory Watcher API Error:', err);
  
  if (res.headersSent) {
    return next(err);
  }
  
  res.status(500).json({
    error: 'Internal server error in DriveMemory watcher API',
    message: err.message || 'Unknown error',
    timestamp: new Date().toISOString()
  });
});

export default router;