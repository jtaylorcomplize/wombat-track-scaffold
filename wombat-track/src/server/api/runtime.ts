import express from 'express';
import fs from 'fs/promises';
import path from 'path';

const router = express.Router();

interface RuntimeJob {
  id: string;
  type: 'claude_job' | 'github_dispatch' | 'data_sync';
  status: 'queued' | 'running' | 'completed' | 'failed';
  name: string;
  startTime?: string;
  endTime?: string;
  duration?: number;
  user?: string;
  details?: any;
}

interface OrphanedTable {
  table: string;
  orphanCount: number;
  severity: 'high' | 'medium' | 'low';
  lastChecked: string;
}

// Mock data for runtime status - in production this would query actual job queues
async function getRuntimeStatus() {
  // Parse recent governance logs to extract job information
  const governanceLogPath = path.join(process.cwd(), 'logs/governance.jsonl');
  const recentJobs: RuntimeJob[] = [];
  
  try {
    const logContent = await fs.readFile(governanceLogPath, 'utf-8');
    const lines = logContent.trim().split('\n').filter(line => line.trim());
    
    // Get last 20 entries for recent activity
    const recentEntries = lines.slice(-20).map(line => {
      try {
        return JSON.parse(line);
      } catch (e) {
        return null;
      }
    }).filter(entry => entry !== null);

    // Extract job-like activities from governance logs
    recentEntries.forEach((entry, index) => {
      if (entry.event_type && entry.timestamp) {
        const job: RuntimeJob = {
          id: `job-${entry.timestamp}-${index}`,
          type: entry.event_type.includes('claude') ? 'claude_job' : 
                entry.event_type.includes('github') ? 'github_dispatch' : 'data_sync',
          status: entry.success ? 'completed' : 'failed',
          name: entry.details?.operation || entry.event_type,
          startTime: entry.timestamp,
          endTime: entry.timestamp,
          duration: Math.floor(Math.random() * 30000) + 1000, // Mock duration
          user: entry.user_id || 'system',
          details: entry.details
        };
        recentJobs.push(job);
      }
    });
  } catch (error) {
    console.error('Error reading governance logs:', error);
  }

  // Get orphaned data information from recent audit
  const orphanedTables: OrphanedTable[] = [
    {
      table: 'phases',
      orphanCount: 31,
      severity: 'high',
      lastChecked: new Date().toISOString()
    },
    {
      table: 'projects',
      orphanCount: 81,
      severity: 'high', 
      lastChecked: new Date().toISOString()
    }
  ];

  // Mock active and queued jobs
  const activeJobs: RuntimeJob[] = [
    {
      id: 'active-1',
      type: 'claude_job',
      status: 'running',
      name: 'OF-BEV Phase 2 Implementation',
      startTime: new Date(Date.now() - 120000).toISOString(),
      user: 'claude'
    }
  ];

  const queuedJobs: RuntimeJob[] = [
    {
      id: 'queued-1',
      type: 'github_dispatch',
      status: 'queued',
      name: 'Deploy runtime status panel',
      user: 'system'
    }
  ];

  // Get last sync information
  const lastSync = {
    timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    status: 'success' as const,
    recordsProcessed: 413
  };

  // System health check
  const systemHealth = {
    aiAvailable: true,
    githubConnected: true,
    databaseStatus: 'healthy' as const
  };

  return {
    activeJobs,
    queuedJobs,
    completedJobs: recentJobs.filter(j => j.status === 'completed').slice(0, 10),
    orphanedTables,
    lastSync,
    systemHealth
  };
}

// Get runtime status endpoint
router.get('/status', async (req, res) => {
  try {
    const statusData = await getRuntimeStatus();
    
    res.json({
      timestamp: new Date().toISOString(),
      ...statusData
    });

  } catch (error) {
    console.error('Error fetching runtime status:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to fetch runtime status'
    });
  }
});

// Get specific job details
router.get('/job/:jobId', async (req, res) => {
  const { jobId } = req.params;
  
  try {
    const statusData = await getRuntimeStatus();
    const allJobs = [
      ...statusData.activeJobs,
      ...statusData.queuedJobs,
      ...statusData.completedJobs
    ];
    
    const job = allJobs.find(j => j.id === jobId);
    
    if (!job) {
      return res.status(404).json({ 
        error: 'Job not found',
        jobId 
      });
    }

    res.json({
      timestamp: new Date().toISOString(),
      job
    });

  } catch (error) {
    console.error('Error fetching job details:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to fetch job details'
    });
  }
});

// Trigger manual sync endpoint (mock)
router.post('/sync', async (req, res) => {
  try {
    // Log the sync trigger to governance
    const governanceEntry = {
      timestamp: new Date().toISOString(),
      event_type: 'manual_sync_triggered',
      user_id: req.body.userId || 'admin',
      user_role: 'admin',
      resource_type: 'data_sync',
      resource_id: 'manual-sync',
      action: 'sync_initiate',
      success: true,
      details: {
        operation: 'Manual Data Sync',
        triggered_by: req.body.userId || 'admin',
        tables: ['projects', 'phases', 'governance_logs', 'sub_apps']
      },
      runtime_context: {
        phase: 'OF-BEV-2.1',
        environment: 'runtime_monitoring'
      }
    };

    // Append to governance log
    const governanceLogPath = path.join(process.cwd(), 'logs/governance.jsonl');
    await fs.appendFile(governanceLogPath, JSON.stringify(governanceEntry) + '\n');

    res.json({
      success: true,
      message: 'Sync initiated',
      jobId: `sync-${Date.now()}`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error triggering sync:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to trigger sync'
    });
  }
});

export default router;