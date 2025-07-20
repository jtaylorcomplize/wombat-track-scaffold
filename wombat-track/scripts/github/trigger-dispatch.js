#!/usr/bin/env node

import 'dotenv/config';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// ESM compatibility for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get phase_id from command line argument
const phase_id = process.argv[2];

if (!phase_id) {
  console.error('Error: phase_id is required as first argument');
  console.error('Usage: node trigger-dispatch.js <phase_id>');
  process.exit(1);
}

// Get GitHub token from environment variable
const token = process.env.GITHUB_TOKEN;

console.log('=== TRIGGER-DISPATCH DEBUG ===');
console.log('Phase ID:', phase_id);
console.log('GITHUB_TOKEN exists:', !!token);
console.log('GITHUB_TOKEN length:', token?.length || 0);
console.log('GITHUB_TOKEN first 10 chars:', token?.substring(0, 10) || 'N/A');
console.log('============================');

if (!token || token.length <= 30) {
  console.error('Missing or invalid GITHUB_TOKEN');
  process.exit(1);
}

// Function to write governance log
function writeGovernanceLog(logEntry) {
  const logsDir = path.join(__dirname, '../../logs');
  const logFile = path.join(logsDir, 'governance.jsonl');
  
  // Create logs directory if it doesn't exist
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  
  // Append log entry as JSONL
  fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
}

// Function for structured logging
function logStructured(logData) {
  // Console output
  console.log('=== GitHub Workflow Dispatch ===');
  console.log(`Phase ID: ${logData.phase_id}`);
  console.log(`Status Code: ${logData.status_code || 'N/A'}`);
  if (logData.workflow_run_url) {
    console.log(`Workflow Run URL: ${logData.workflow_run_url}`);
  }
  if (logData.error) {
    console.log(`Error: ${logData.error}`);
  }
  console.log('================================');
  
  // JSON output to stdout
  console.log(JSON.stringify(logData));
}

// GitHub API configuration
const options = {
  hostname: 'api.github.com',
  port: 443,
  path: '/repos/jtaylorcomplize/wombat-track-scaffold/actions/workflows/claude-scaffold.yml/dispatches',
  method: 'POST',
  headers: {
    'Accept': 'application/vnd.github+json',
    'Authorization': `Bearer ${token}`,
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'trigger-dispatch-script',
    'Content-Type': 'application/json'
  }
};

// Request body
const data = JSON.stringify({
  ref: 'feature/claude-scaffold',
  inputs: {
    phase_id: phase_id
  }
});

// Make the request
const req = https.request(options, (res) => {
  let responseData = '';
  
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  
  res.on('end', () => {
    const success = res.statusCode === 204;
    
    // Prepare governance log entry
    const logEntry = {
      entryType: 'Deployment',
      summary: `Triggered GitHub scaffold for PhaseStep ${phase_id}`,
      success: success,
      githubResponse: {
        statusCode: res.statusCode,
        body: responseData || null
      },
      timestamp: new Date().toISOString()
    };
    
    // Write governance log
    try {
      writeGovernanceLog(logEntry);
    } catch (logError) {
      console.error('Warning: Failed to write governance log:', logError.message);
    }
    
    if (success) {
      // Construct workflow run URL (approximate)
      const workflowRunUrl = `https://github.com/jtaylorcomplize/wombat-track-scaffold/actions/workflows/claude-scaffold.yml`;
      
      logStructured({
        phase_id: phase_id,
        status_code: res.statusCode,
        workflow_run_url: workflowRunUrl,
        success: true,
        timestamp: new Date().toISOString()
      });
    } else {
      let errorMessage = `Failed to dispatch workflow (HTTP ${res.statusCode})`;
      if (responseData) {
        try {
          const error = JSON.parse(responseData);
          errorMessage = error.message || responseData;
        } catch {
          errorMessage = responseData;
        }
      }
      
      logStructured({
        phase_id: phase_id,
        status_code: res.statusCode,
        error: errorMessage,
        success: false,
        timestamp: new Date().toISOString()
      });
      
      process.exit(1);
    }
  });
});

req.on('error', (e) => {
  // Log the error
  const logEntry = {
    entryType: 'Deployment',
    summary: `Triggered GitHub scaffold for PhaseStep ${phase_id}`,
    success: false,
    githubResponse: {
      statusCode: null,
      body: e.message
    },
    timestamp: new Date().toISOString()
  };
  
  try {
    writeGovernanceLog(logEntry);
  } catch (logError) {
    console.error('Warning: Failed to write governance log:', logError.message);
  }
  
  logStructured({
    phase_id: phase_id,
    status_code: null,
    error: `Request failed - ${e.message}`,
    success: false,
    timestamp: new Date().toISOString()
  });
  
  process.exit(1);
});

// Send the request
req.write(data);
req.end();