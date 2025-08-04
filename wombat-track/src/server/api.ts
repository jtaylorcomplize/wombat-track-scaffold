/**
 * Simple API Server for oApp Data Access
 * Provides REST endpoints for dev server integration
 */

import express from 'express';
import { readFileSync } from 'fs';
import { join } from 'path';
import sdlcRouter from './api/sdlc/index';

const app = express();
const PORT = process.env.API_PORT || 3001;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// CORS for dev environment
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  next();
});

// SDLC API routes
app.use('/api/sdlc', sdlcRouter);

interface OAppProject {
  projectName: string;
  projectId: string;
  owner: string;
  status: string;
}

/**
 * Parse CSV data from oApp production
 */
function parseProjectsCSV(csvText: string): OAppProject[] {
  const lines = csvText.split('\n');
  const projects: OAppProject[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Handle CSV parsing with potential commas in quoted fields
    const values = parseCSVLine(line);
    if (values.length < 4) continue;
    
    const [projectName, projectId, owner, status] = values;
    
    if (!projectName || !projectId) continue;
    
    projects.push({
      projectName: projectName.trim(),
      projectId: projectId.trim(),
      owner: owner.trim() || 'Unassigned',
      status: status.trim() || 'Unknown'
    });
  }
  
  return projects;
}

/**
 * Parse a CSV line handling quoted fields with commas
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

/**
 * GET /api/projects - Fetch all projects from oApp production
 */
app.get('/api/projects', (req, res) => {
  try {
    console.log('📊 API Request: GET /api/projects');
    
    // Read CSV from public directory
    const csvPath = join(process.cwd(), 'public', 'cleaned-projects-snapshot.csv');
    const csvText = readFileSync(csvPath, 'utf-8');
    
    const oappProjects = parseProjectsCSV(csvText);
    
    // Convert to frontend format
    const projects = oappProjects.map(project => ({
      id: project.projectId,
      title: project.projectName,
      description: `Project ${project.projectId} - ${project.status}`,
      projectOwner: project.owner || 'Unassigned',
      status: mapOAppStatusToProjectStatus(project.status),
      phases: [
        {
          id: `${project.projectId}-phase-1`,
          name: 'Implementation',
          description: `Implementation phase for ${project.projectName}`,
          status: 'not_started',
          steps: [
            {
              id: `${project.projectId}-step-1`,
              name: 'Setup',
              description: 'Initial project setup',
              status: 'not_started',
              assignedTo: project.owner || 'Unassigned'
            }
          ]
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));
    
    console.log(`✅ API Response: ${projects.length} projects from oApp production`);
    
    res.json({
      success: true,
      data: projects,
      meta: {
        total: projects.length,
        source: 'oApp production database',
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ API Error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch projects from oApp database',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/projects/stats - Get project statistics
 */
app.get('/api/projects/stats', (req, res) => {
  try {
    console.log('📊 API Request: GET /api/projects/stats');
    
    const csvPath = join(process.cwd(), 'public', 'cleaned-projects-snapshot.csv');
    const csvText = readFileSync(csvPath, 'utf-8');
    const oappProjects = parseProjectsCSV(csvText);
    
    const stats = {
      total: oappProjects.length,
      byStatus: {} as Record<string, number>,
      byOwner: {} as Record<string, number>
    };
    
    oappProjects.forEach(project => {
      // Count by status
      stats.byStatus[project.status] = (stats.byStatus[project.status] || 0) + 1;
      
      // Count by owner
      const owner = project.owner || 'Unassigned';
      stats.byOwner[owner] = (stats.byOwner[owner] || 0) + 1;
    });
    
    console.log(`✅ API Stats: ${stats.total} projects analyzed`);
    
    res.json({
      success: true,
      data: stats,
      source: 'oApp production database',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ API Stats Error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to get project statistics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/health - Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'wombat-track-api',
    version: '1.0.0',
    oapp_connection: 'active'
  });
});

/**
 * Map oApp status to Project status
 */
function mapOAppStatusToProjectStatus(oappStatus: string): string {
  const statusMap: Record<string, string> = {
    'Planning': 'planning',
    'Completed': 'completed',
    'In Progress': 'in_progress',
    'On Hold': 'on_hold',
    'tools': 'planning',
    'APIs': 'planning',
    'Dynamic Component (React)': 'in_progress'
  };
  
  return statusMap[oappStatus] || 'planning';
}

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 oApp API Server running on http://localhost:${PORT}`);
    console.log(`📊 Serving projects from oApp production database`);
    console.log(`🔗 Available endpoints:`);
    console.log(`   GET /api/projects - Fetch all projects`);
    console.log(`   GET /api/projects/stats - Get project statistics`);
    console.log(`   GET /api/health - Health check`);
    console.log(`   /api/sdlc/* - SDLC governance and management endpoints`);
  });
}

export default app;