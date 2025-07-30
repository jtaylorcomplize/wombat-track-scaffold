/**
 * oApp Database API Service
 * Connects to live oApp production data for dev server
 */

import type { Project } from '../types/models';

export interface OAppProject {
  projectName: string;
  projectId: string;
  owner: string;
  status: string;
}

/**
 * Fetch projects from oApp production database
 */
export async function fetchProjectsFromOApp(): Promise<Project[]> {
  try {
    // Try API endpoint first
    console.log('🔍 Attempting to fetch from API endpoint...');
    const apiResponse = await fetch('/api/projects');
    
    if (apiResponse.ok) {
      const responseText = await apiResponse.text();
      console.log('📝 API Response preview:', responseText.substring(0, 200));
      
      try {
        const apiData = JSON.parse(responseText);
        if (apiData.success && apiData.data) {
          console.log(`✅ API: Loaded ${apiData.data.length} projects from oApp via API`);
          return apiData.data;
        }
      } catch (jsonError) {
        console.warn('⚠️ API response is not valid JSON, response preview:', responseText.substring(0, 100));
        console.warn('JSON parse error:', jsonError);
      }
    } else {
      console.warn(`⚠️ API endpoint returned ${apiResponse.status}: ${apiResponse.statusText}`);
    }
    
    // Fallback to direct CSV fetch
    console.log('🔄 API unavailable, fetching CSV directly...');
    const csvResponse = await fetch('/cleaned-projects-snapshot.csv');
    if (!csvResponse.ok) {
      throw new Error(`Failed to fetch projects: ${csvResponse.statusText}`);
    }
    
    const csvText = await csvResponse.text();
    const projects = parseProjectsCSV(csvText);
    
    console.log(`📊 CSV: Loaded ${projects.length} projects from oApp production data`);
    return projects;
  } catch (error) {
    console.error('Failed to fetch projects from oApp:', error);
    // Fallback to mock data for offline development
    const { mockProjects } = await import('../data/mockProjects');
    console.log('🔄 Falling back to mock data for offline development');
    return convertMockProjects(mockProjects);
  }
}

/**
 * Parse CSV data into Project objects
 */
function parseProjectsCSV(csvText: string): Project[] {
  const lines = csvText.split('\n');
  
  const projects: Project[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Handle CSV parsing with potential commas in quoted fields
    const values = parseCSVLine(line);
    if (values.length < 4) continue;
    
    const [projectName, projectId, owner, status] = values;
    
    if (!projectName || !projectId) continue;
    
    // Convert to Project format
    const project: Project = {
      id: projectId.trim(),
      title: projectName.trim(),
      description: `Project ${projectId} - ${status || 'Unknown Status'}`,
      projectOwner: owner.trim() || 'Unassigned',
      status: mapOAppStatusToProjectStatus(status?.trim() || ''),
      phases: [
        {
          id: `${projectId}-phase-1`,
          name: 'Implementation',
          description: `Implementation phase for ${projectName}`,
          status: 'not_started',
          steps: [
            {
              id: `${projectId}-step-1`,
              name: 'Setup',
              description: 'Initial project setup',
              status: 'not_started',
              assignedTo: owner.trim() || 'Unassigned'
            }
          ]
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    projects.push(project);
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
 * Map oApp status to Project status
 */
function mapOAppStatusToProjectStatus(oappStatus: string): Project['status'] {
  const statusMap: Record<string, Project['status']> = {
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

/**
 * Convert mock projects for fallback compatibility
 */
function convertMockProjects(mockProjects: { id: string; title: string; description?: string; phaseSteps?: { id: string; stepInstruction: string }[] }[]): Project[] {
  return mockProjects.map(mock => ({
    id: mock.id,
    title: mock.title,
    description: mock.description || `Mock project ${mock.id}`,
    projectOwner: 'Mock User',
    status: 'planning' as const,
    phases: [
      {
        id: `${mock.id}-phase-1`,
        name: 'Mock Phase',
        description: 'Mock implementation phase',
        status: 'not_started' as const,
        steps: mock.phaseSteps?.map((step) => ({
          id: step.id,
          name: step.stepInstruction,
          description: step.stepInstruction,
          status: 'not_started' as const,
          assignedTo: 'Mock User'
        })) || []
      }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }));
}

/**
 * Get project statistics from oApp data
 */
export async function getOAppProjectStats(): Promise<{
  total: number;
  byStatus: Record<string, number>;
  byOwner: Record<string, number>;
}> {
  try {
    const projects = await fetchProjectsFromOApp();
    
    const stats = {
      total: projects.length,
      byStatus: {} as Record<string, number>,
      byOwner: {} as Record<string, number>
    };
    
    projects.forEach(project => {
      // Count by status
      stats.byStatus[project.status] = (stats.byStatus[project.status] || 0) + 1;
      
      // Count by owner
      stats.byOwner[project.projectOwner] = (stats.byOwner[project.projectOwner] || 0) + 1;
    });
    
    return stats;
  } catch (error) {
    console.error('Failed to get oApp project stats:', error);
    return { total: 0, byStatus: {}, byOwner: {} };
  }
}