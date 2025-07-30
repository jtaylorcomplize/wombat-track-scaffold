import { Request, Response } from 'express';
import fs from 'fs/promises';
import path from 'path';

interface GovernanceLogEntry {
  timestamp: string;
  event_type: string;
  user_id: string;
  user_role: string;
  resource_type: 'dashboard' | 'card' | 'filter' | 'data' | 'auth';
  resource_id: string;
  action: string;
  success: boolean;
  details: Record<string, unknown>;
  session_id?: string;
  ip_address?: string;
  user_agent?: string;
  performance_metrics?: {
    load_time_ms?: number;
    query_time_ms?: number;
    data_size_bytes?: number;
    error_count?: number;
    memory_usage_mb?: number;
    cpu_usage_percent?: number;
  };
  security_context?: {
    auth_method: string;
    permissions_checked: string[];
    access_restrictions: string[];
  };
  runtime_context?: {
    browser?: string;
    viewport_size?: { width: number; height: number };
    connection_type?: string;
    phase?: string;
    environment?: string;
    page_type?: string;
    mode?: string;
  };
  rag_metrics?: {
    score: 'red' | 'amber' | 'green' | 'blue';
    performance_grade: 'A' | 'B' | 'C' | 'D' | 'F';
    health_factors: {
      load_performance: number;
      error_rate: number;
      user_engagement: number;
      data_freshness: number;
    };
  };
}

// Ensure logs directory exists
const ensureLogsDirectory = async (): Promise<void> => {
  const logsDir = path.join(process.cwd(), 'logs');
  try {
    await fs.access(logsDir);
  } catch {
    await fs.mkdir(logsDir, { recursive: true });
  }
};

/**
 * POST /api/governance/log
 * Receives governance logs from browser clients and persists them to file
 */
export const handleGovernanceLog = async (req: Request, res: Response): Promise<void> => {
  try {
    const { logs } = req.body as { logs: GovernanceLogEntry[] };
    
    if (!Array.isArray(logs) || logs.length === 0) {
      res.status(400).json({ 
        success: false, 
        error: 'Invalid request: logs array is required and must not be empty' 
      });
      return;
    }

    // Validate log entries
    const validLogs = logs.filter(log => {
      return log.timestamp && log.event_type && log.user_id && log.resource_id;
    });

    if (validLogs.length === 0) {
      res.status(400).json({ 
        success: false, 
        error: 'No valid log entries found' 
      });
      return;
    }

    // Ensure logs directory exists
    await ensureLogsDirectory();

    // Append client IP and user agent from request
    const enrichedLogs = validLogs.map(log => ({
      ...log,
      ip_address: log.ip_address || req.ip || req.connection.remoteAddress,
      user_agent: log.user_agent || req.get('User-Agent'),
      server_received_at: new Date().toISOString()
    }));

    // Write to governance log file
    const logFilePath = path.join(process.cwd(), 'logs', 'governance.jsonl');
    const logLines = enrichedLogs.map(log => JSON.stringify(log)).join('\\n') + '\\n';
    
    await fs.appendFile(logFilePath, logLines);

    // Log summary for monitoring
    const summary = {
      timestamp: new Date().toISOString(),
      phase: 'Phase5–GovernanceRefactor',
      action: 'governance_logs_received',
      entries_count: enrichedLogs.length,
      unique_users: new Set(enrichedLogs.map(l => l.user_id)).size,
      unique_resources: new Set(enrichedLogs.map(l => l.resource_id)).size,
      client_ip: req.ip,
      user_agent: req.get('User-Agent')
    };

    console.log('📊 Governance logs persisted:', summary);

    res.status(200).json({ 
      success: true, 
      message: `Successfully persisted ${enrichedLogs.length} governance log entries`,
      entries_processed: enrichedLogs.length,
      entries_filtered: logs.length - enrichedLogs.length
    });

  } catch (error) {
    console.error('❌ Failed to persist governance logs:', error);
    
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error while persisting logs',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * GET /api/governance/health
 * Returns health status of governance logging system
 */
export const handleGovernanceHealth = async (req: Request, res: Response): Promise<void> => {
  try {
    const logFilePath = path.join(process.cwd(), 'logs', 'governance.jsonl');
    
    let logFileStats = null;
    let logFileExists = false;
    
    try {
      logFileStats = await fs.stat(logFilePath);
      logFileExists = true;
    } catch {
      // File doesn't exist yet - this is normal for new installations
    }

    const health = {
      timestamp: new Date().toISOString(),
      status: 'healthy',
      governance_logging: {
        enabled: true,
        log_file_exists: logFileExists,
        log_file_path: logFilePath,
        log_file_size_bytes: logFileStats?.size || 0,
        log_file_modified: logFileStats?.mtime?.toISOString() || null
      },
      phase: 'Phase5–GovernanceRefactor',
      api_version: '1.0.0'
    };

    res.status(200).json(health);
    
  } catch (error) {
    console.error('❌ Failed to check governance health:', error);
    
    res.status(500).json({
      timestamp: new Date().toISOString(),
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      phase: 'Phase5–GovernanceRefactor'
    });
  }
};

export default {
  handleGovernanceLog,
  handleGovernanceHealth
};