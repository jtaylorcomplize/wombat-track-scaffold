import express from 'express';
import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';
import fs from 'fs/promises';
dotenv.config();

// ESM compatibility for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS middleware (adjust origin as needed)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// POST /api/github/trigger
app.post('/api/github/trigger', (req, res) => {
  const { phase_id } = req.body;
  
  if (!phase_id) {
    return res.status(400).json({ error: 'phase_id is required' });
  }
  
  // Debug: Check GITHUB_TOKEN
  console.log('=== SERVER DEBUG ===');
  console.log('GITHUB_TOKEN exists:', !!process.env.GITHUB_TOKEN);
  console.log('GITHUB_TOKEN length:', process.env.GITHUB_TOKEN?.length || 0);
  console.log('GITHUB_TOKEN first 10 chars:', process.env.GITHUB_TOKEN?.substring(0, 10) || 'N/A');
  console.log('==================');
  
  // Check for GITHUB_TOKEN
  if (!process.env.GITHUB_TOKEN) {
    return res.status(500).json({ error: 'GITHUB_TOKEN not configured' });
  }
  
  // Path to trigger-dispatch.js
  const scriptPath = path.join(__dirname, 'scripts', 'github', 'trigger-dispatch.js');
  
  // Execute trigger-dispatch.js with phase_id
  console.log('Executing:', scriptPath, 'with phase_id:', phase_id);
  const result = spawnSync('node', [scriptPath, phase_id], {
    env: {
      ...process.env,
      GITHUB_TOKEN: process.env.GITHUB_TOKEN
    },
    encoding: 'utf8'
  });
  
  console.log('=== SPAWN RESULT ===');
  console.log('Exit code:', result.status);
  console.log('Error:', result.error?.message || 'none');
  console.log('STDOUT:', result.stdout || 'empty');
  console.log('STDERR:', result.stderr || 'empty');
  console.log('==================');  
  
  // Check if the command executed successfully
  if (result.error) {
    console.error('Failed to execute trigger-dispatch.js:', result.error);
    return res.status(500).json({ 
      error: 'Failed to trigger workflow',
      details: result.error.message 
    });
  }
  
  // Check exit code
  if (result.status !== 0) {
    console.error('trigger-dispatch.js failed:', result.stderr);
    return res.status(500).json({ 
      error: 'Workflow dispatch failed',
      details: result.stderr || result.stdout
    });
  }
  
  // Success
  console.log('Workflow dispatched successfully:', result.stdout);
  return res.status(200).json({ 
    success: true,
    message: 'Workflow dispatched successfully',
    output: result.stdout
  });
});

// Governance Logging API Endpoints

// Ensure logs directory exists
const ensureLogsDirectory = async () => {
  const logsDir = path.join(__dirname, 'logs');
  try {
    await fs.access(logsDir);
  } catch {
    await fs.mkdir(logsDir, { recursive: true });
  }
};

// POST /api/governance/log - Receive governance logs from browser clients
app.post('/api/governance/log', async (req, res) => {
  try {
    const { logs } = req.body;
    
    if (!Array.isArray(logs) || logs.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid request: logs array is required and must not be empty' 
      });
    }

    // Validate log entries
    const validLogs = logs.filter(log => {
      return log.timestamp && log.event_type && log.user_id && log.resource_id;
    });

    if (validLogs.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'No valid log entries found' 
      });
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
    const logFilePath = path.join(__dirname, 'logs', 'governance.jsonl');
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
      message: error.message
    });
  }
});

// GET /api/governance/health - Governance logging system health
app.get('/api/governance/health', async (req, res) => {
  try {
    const logFilePath = path.join(__dirname, 'logs', 'governance.jsonl');
    
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
      error: error.message,
      phase: 'Phase5–GovernanceRefactor'
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`POST /api/github/trigger - Trigger GitHub workflow`);
  console.log(`POST /api/governance/log - Receive governance logs from browser`);
  console.log(`GET  /api/governance/health - Governance logging health check`);
  console.log(`GET  /health - Health check`);
});