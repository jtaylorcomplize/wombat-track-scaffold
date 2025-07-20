import express from 'express';
import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';
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

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`POST /api/github/trigger - Trigger GitHub workflow`);
  console.log(`GET  /health - Health check`);
});