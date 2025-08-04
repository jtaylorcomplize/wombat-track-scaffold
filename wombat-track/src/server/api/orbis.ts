/**
 * Enhanced Sidebar v3.1 Phase 2: Data Integration & Governance
 * Orbis API endpoints for cross-sub-app data aggregation
 */

import { Request, Response } from 'express';

// Types for API responses
export interface Project {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'on-hold' | 'completed' | 'planning';
  priority: 'low' | 'medium' | 'high' | 'critical';
  completionPercentage: number;
  owner: string;
  teamSize: number;
  startDate: string;
  endDate: string;
  lastUpdated: string;
  subAppId: string;
  subAppName: string;
  budget: {
    allocated: number;
    spent: number;
  };
  tags: string[];
}

export interface SubApp {
  id: string;
  name: string;
  description: string;
  version: string;
  status: 'active' | 'warning' | 'error';
  launchUrl: string;
  lastUpdated: string;
  metrics: {
    totalProjects: number;
    activeProjects: number;
    totalUsers: number;
    uptime: number;
    avgResponseTime: number;
  };
}

export interface RuntimeStatus {
  subAppId: string;
  status: 'active' | 'warning' | 'error';
  uptime: number;
  responseTime: number;
  lastChecked: string;
  metrics: {
    activeConnections: number;
    memoryUsage: number;
    cpuUsage: number;
  };
}

// Mock data store (in production, this would connect to databases)
const mockProjects: Project[] = [
  {
    id: 'proj-001',
    name: 'Market Analysis Platform',
    description: 'Advanced market research and competitive analysis dashboard with real-time data integration',
    status: 'active',
    priority: 'high',
    completionPercentage: 75,
    owner: 'Sarah Chen',
    teamSize: 8,
    startDate: '2024-01-15',
    endDate: '2025-04-30',
    lastUpdated: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    subAppId: 'prog-orbis-001',
    subAppName: 'Orbis Intelligence',
    budget: {
      allocated: 500000,
      spent: 375000
    },
    tags: ['Analytics', 'Dashboard', 'Real-time']
  },
  {
    id: 'proj-002',
    name: 'Customer Insights Dashboard',
    description: 'Comprehensive customer behavior analysis and segmentation platform',
    status: 'active',
    priority: 'medium',
    completionPercentage: 90,
    owner: 'Michael Park',
    teamSize: 5,
    startDate: '2024-03-01',
    endDate: '2025-02-28',
    lastUpdated: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    subAppId: 'prog-orbis-001',
    subAppName: 'Orbis Intelligence',
    budget: {
      allocated: 320000,
      spent: 288000
    },
    tags: ['Customer Analytics', 'Segmentation', 'ML']
  },
  {
    id: 'proj-003',
    name: 'Predictive Analytics Engine',
    description: 'Machine learning-powered predictive analytics for business forecasting',
    status: 'on-hold',
    priority: 'high',
    completionPercentage: 40,
    owner: 'Lisa Wang',
    teamSize: 12,
    startDate: '2024-05-01',
    endDate: '2025-08-31',
    lastUpdated: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    subAppId: 'prog-orbis-001',
    subAppName: 'Orbis Intelligence',
    budget: {
      allocated: 750000,
      spent: 300000
    },
    tags: ['Machine Learning', 'Forecasting', 'AI']
  },
  {
    id: 'proj-004',
    name: 'Regulatory Compliance Tracker',
    description: 'Automated regulatory compliance monitoring and reporting system',
    status: 'active',
    priority: 'critical',
    completionPercentage: 60,
    owner: 'James Wilson',
    teamSize: 6,
    startDate: '2024-06-01',
    endDate: '2025-05-31',
    lastUpdated: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    subAppId: 'prog-complize-001',
    subAppName: 'Complize Platform',
    budget: {
      allocated: 450000,
      spent: 270000
    },
    tags: ['Compliance', 'Automation', 'Reporting']
  },
  {
    id: 'proj-005',
    name: 'Audit Trail System',
    description: 'Comprehensive audit logging and trail management system',
    status: 'completed',
    priority: 'medium',
    completionPercentage: 100,
    owner: 'Emma Thompson',
    teamSize: 4,
    startDate: '2024-02-01',
    endDate: '2024-11-30',
    lastUpdated: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    subAppId: 'prog-complize-001',
    subAppName: 'Complize Platform',
    budget: {
      allocated: 280000,
      spent: 275000
    },
    tags: ['Audit', 'Logging', 'Security']
  },
  {
    id: 'proj-006',
    name: 'Visa Processing Automation',
    description: 'Automated visa application processing and workflow management',
    status: 'active',
    priority: 'high',
    completionPercentage: 85,
    owner: 'Roberto Silva',
    teamSize: 10,
    startDate: '2024-03-01',
    endDate: '2025-02-28',
    lastUpdated: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    subAppId: 'prog-roam-001',
    subAppName: 'Roam',
    budget: {
      allocated: 750000,
      spent: 637500
    },
    tags: ['Automation', 'Workflow', 'Government']
  },
  {
    id: 'proj-007',
    name: 'Document Verification System',
    description: 'AI-powered document verification and fraud detection system',
    status: 'active',
    priority: 'medium',
    completionPercentage: 70,
    owner: 'Anna Petrova',
    teamSize: 7,
    startDate: '2024-04-01',
    endDate: '2025-03-31',
    lastUpdated: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    subAppId: 'prog-roam-001',
    subAppName: 'Roam',
    budget: {
      allocated: 540000,
      spent: 378000
    },
    tags: ['AI', 'Verification', 'Security']
  },
  {
    id: 'proj-008',
    name: 'Multi-Country Support',
    description: 'Internationalization and multi-country visa processing support',
    status: 'planning',
    priority: 'medium',
    completionPercentage: 30,
    owner: 'David Kim',
    teamSize: 15,
    startDate: '2024-08-01',
    endDate: '2025-12-31',
    lastUpdated: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    subAppId: 'prog-roam-001',
    subAppName: 'Roam',
    budget: {
      allocated: 850000,
      spent: 255000
    },
    tags: ['Internationalization', 'Localization', 'Scale']
  },
  {
    id: 'proj-009',
    name: 'Mobile App Development',
    description: 'Mobile application for visa status tracking and document submission',
    status: 'on-hold',
    priority: 'low',
    completionPercentage: 20,
    owner: 'Maria Garcia',
    teamSize: 5,
    startDate: '2024-07-01',
    endDate: '2025-06-30',
    lastUpdated: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    subAppId: 'prog-roam-001',
    subAppName: 'Roam',
    budget: {
      allocated: 420000,
      spent: 84000
    },
    tags: ['Mobile', 'React Native', 'User Experience']
  }
];

const mockSubApps: SubApp[] = [
  {
    id: 'prog-orbis-001',
    name: 'Orbis Intelligence',
    description: 'Core program for recursive AI-native development and Sub-App orchestration; 3D printer engine for SDLC and governance.',
    version: 'v2.1.3',
    status: 'active',
    launchUrl: 'https://orbis.intelligence.app',
    lastUpdated: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    metrics: {
      totalProjects: 3,
      activeProjects: 2,
      totalUsers: 47,
      uptime: 99.8,
      avgResponseTime: 340
    }
  },
  {
    id: 'prog-complize-001',
    name: 'Complize Platform',
    description: 'Compliance suite Sub-App; includes Visa Management, Knowledge Base, and RAG/Compliance Tracker modules.',
    version: 'v1.8.2',
    status: 'warning',
    launchUrl: 'https://complize.platform.app',
    lastUpdated: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    metrics: {
      totalProjects: 2,
      activeProjects: 1,
      totalUsers: 23,
      uptime: 98.5,
      avgResponseTime: 520
    }
  },
  {
    id: 'prog-roam-001',
    name: 'Roam',
    description: 'Formerly VisaCalcPro; business migration planning and visa calculation tool.',
    version: 'v4.2.0',
    status: 'active',
    launchUrl: 'https://roam.complize.com',
    lastUpdated: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    metrics: {
      totalProjects: 4,
      activeProjects: 3,
      totalUsers: 156,
      uptime: 99.9,
      avgResponseTime: 280
    }
  },
  {
    id: 'prog-spqr-001',
    name: 'SPQR',
    description: 'Sub-App for reporting and Looker Studio integration within Orbis Intelligence ecosystem.',
    version: 'v1.2.0',
    status: 'active',
    launchUrl: 'https://spqr.runtime.app',
    lastUpdated: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    metrics: {
      totalProjects: 1,
      activeProjects: 1,
      totalUsers: 8,
      uptime: 99.5,
      avgResponseTime: 450
    }
  },
  {
    id: 'prog-dealflow-001',
    name: 'DealFlow Management',
    description: 'Investment deal pipeline and portfolio management system',
    version: 'v2.3.1',
    status: 'warning',
    launchUrl: 'https://dealflow.management.app',
    lastUpdated: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    metrics: {
      totalProjects: 5,
      activeProjects: 4,
      totalUsers: 32,
      uptime: 97.8,
      avgResponseTime: 680
    }
  }
];

// API Endpoints

/**
 * GET /api/orbis/projects/all
 * Returns aggregated projects across all sub-applications
 */
export const getAllProjects = (req: Request, res: Response) => {
  try {
    const { 
      status, 
      priority, 
      subAppId, 
      search,
      limit = '50',
      offset = '0',
      sortBy = 'lastUpdated',
      sortOrder = 'desc'
    } = req.query;

    let filteredProjects = [...mockProjects];

    // Apply filters
    if (status && status !== 'all') {
      filteredProjects = filteredProjects.filter(p => p.status === status);
    }

    if (priority && priority !== 'all') {
      filteredProjects = filteredProjects.filter(p => p.priority === priority);
    }

    if (subAppId && subAppId !== 'all') {
      filteredProjects = filteredProjects.filter(p => p.subAppId === subAppId);
    }

    if (search) {
      const searchLower = (search as string).toLowerCase();
      filteredProjects = filteredProjects.filter(p => 
        p.name.toLowerCase().includes(searchLower) ||
        p.description.toLowerCase().includes(searchLower) ||
        p.owner.toLowerCase().includes(searchLower) ||
        p.tags.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }

    // Apply sorting
    filteredProjects.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name;
          bValue = b.name;
          break;
        case 'completion':
          aValue = a.completionPercentage;
          bValue = b.completionPercentage;
          break;
        case 'priority':
          const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
          aValue = priorityOrder[a.priority as keyof typeof priorityOrder];
          bValue = priorityOrder[b.priority as keyof typeof priorityOrder];
          break;
        case 'lastUpdated':
        default:
          aValue = new Date(a.lastUpdated).getTime();
          bValue = new Date(b.lastUpdated).getTime();
          break;
      }

      if (sortOrder === 'desc') {
        return bValue > aValue ? 1 : bValue < aValue ? -1 : 0;
      } else {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      }
    });

    // Apply pagination
    const limitNum = parseInt(limit as string);
    const offsetNum = parseInt(offset as string);
    const paginatedProjects = filteredProjects.slice(offsetNum, offsetNum + limitNum);

    // Calculate summary statistics
    const summary = {
      total: filteredProjects.length,
      active: filteredProjects.filter(p => p.status === 'active').length,
      completed: filteredProjects.filter(p => p.status === 'completed').length,
      onHold: filteredProjects.filter(p => p.status === 'on-hold').length,
      planning: filteredProjects.filter(p => p.status === 'planning').length,
      totalBudget: filteredProjects.reduce((sum, p) => sum + p.budget.allocated, 0),
      totalSpent: filteredProjects.reduce((sum, p) => sum + p.budget.spent, 0),
      averageCompletion: filteredProjects.length > 0 
        ? Math.round(filteredProjects.reduce((sum, p) => sum + p.completionPercentage, 0) / filteredProjects.length)
        : 0
    };

    res.json({
      success: true,
      data: {
        projects: paginatedProjects,
        pagination: {
          total: filteredProjects.length,
          limit: limitNum,
          offset: offsetNum,
          hasMore: offsetNum + limitNum < filteredProjects.length
        },
        summary,
        filters: {
          status: status || 'all',
          priority: priority || 'all',
          subAppId: subAppId || 'all',
          search: search || '',
          sortBy,
          sortOrder
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching all projects:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch projects',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * GET /api/orbis/sub-apps
 * Returns list of all sub-applications with metadata
 */
export const getSubApps = (req: Request, res: Response) => {
  try {
    const { includeProjects = 'false' } = req.query;

    let subAppsWithData = mockSubApps.map(subApp => {
      const subAppProjects = mockProjects.filter(p => p.subAppId === subApp.id);
      
      return {
        ...subApp,
        ...(includeProjects === 'true' && {
          projects: {
            total: subAppProjects.length,
            active: subAppProjects.filter(p => p.status === 'active').length,
            recent: subAppProjects
              .sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime())
              .slice(0, 3)
              .map(p => ({
                id: p.id,
                name: p.name,
                status: p.status,
                completionPercentage: p.completionPercentage,
                lastUpdated: p.lastUpdated
              }))
          }
        })
      };
    });

    res.json({
      success: true,
      data: subAppsWithData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching sub-apps:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sub-apps',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * GET /api/orbis/sub-apps/:id/projects/recent
 * Returns recent projects for a specific sub-application
 */
export const getSubAppRecentProjects = (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { limit = '5', status = 'all' } = req.query;

    const subApp = mockSubApps.find(s => s.id === id);
    if (!subApp) {
      return res.status(404).json({
        success: false,
        error: `Sub-app with ID ${id} not found`,
        timestamp: new Date().toISOString()
      });
    }

    let subAppProjects = mockProjects.filter(p => p.subAppId === id);

    // Apply status filter
    if (status && status !== 'all') {
      subAppProjects = subAppProjects.filter(p => p.status === status);
    }

    // Sort by last updated and limit
    const recentProjects = subAppProjects
      .sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime())
      .slice(0, parseInt(limit as string));

    res.json({
      success: true,
      data: {
        subApp: {
          id: subApp.id,
          name: subApp.name,
          status: subApp.status
        },
        projects: recentProjects,
        summary: {
          total: subAppProjects.length,
          returned: recentProjects.length
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching sub-app recent projects:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recent projects',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * GET /api/orbis/runtime/status
 * Returns live runtime status for all sub-applications
 */
export const getRuntimeStatus = (req: Request, res: Response) => {
  try {
    // Simulate live runtime data with some variance
    const runtimeStatuses: RuntimeStatus[] = mockSubApps.map(subApp => {
      const baseUptime = subApp.metrics.uptime;
      const baseResponseTime = subApp.metrics.avgResponseTime;
      
      // Add some realistic variance
      const uptimeVariance = (Math.random() - 0.5) * 0.2; // ±0.1%
      const responseVariance = (Math.random() - 0.5) * 100; // ±50ms
      
      return {
        subAppId: subApp.id,
        status: subApp.status,
        uptime: Math.max(0, Math.min(100, baseUptime + uptimeVariance)),
        responseTime: Math.max(50, baseResponseTime + responseVariance),
        lastChecked: new Date().toISOString(),
        metrics: {
          activeConnections: Math.floor(Math.random() * 100) + 10,
          memoryUsage: Math.floor(Math.random() * 40) + 30, // 30-70%
          cpuUsage: Math.floor(Math.random() * 30) + 10 // 10-40%
        }
      };
    });

    // Calculate overall health
    const overallHealth = {
      totalSubApps: runtimeStatuses.length,
      healthy: runtimeStatuses.filter(s => s.status === 'active' && s.uptime > 99).length,
      warning: runtimeStatuses.filter(s => s.status === 'warning' || (s.uptime <= 99 && s.uptime > 95)).length,
      critical: runtimeStatuses.filter(s => s.status === 'error' || s.uptime <= 95).length,
      averageUptime: runtimeStatuses.reduce((sum, s) => sum + s.uptime, 0) / runtimeStatuses.length,
      averageResponseTime: runtimeStatuses.reduce((sum, s) => sum + s.responseTime, 0) / runtimeStatuses.length
    };

    res.json({
      success: true,
      data: {
        runtimeStatuses,
        overallHealth,
        lastUpdated: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching runtime status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch runtime status',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * GET /api/orbis/projects/:id
 * Returns detailed project information
 */
export const getProjectById = (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const project = mockProjects.find(p => p.id === id);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: `Project with ID ${id} not found`,
        timestamp: new Date().toISOString()
      });
    }

    // Add additional details for single project view
    const projectDetails = {
      ...project,
      milestones: [
        {
          id: 'ms-001',
          title: 'Requirements Gathering',
          dueDate: '2024-02-15',
          completed: true,
          completedDate: '2024-02-12'
        },
        {
          id: 'ms-002',
          title: 'MVP Development',
          dueDate: '2024-06-30',
          completed: true,
          completedDate: '2024-06-28'
        },
        {
          id: 'ms-003',
          title: 'Beta Testing',
          dueDate: '2024-09-15',
          completed: false
        },
        {
          id: 'ms-004',
          title: 'Production Release',
          dueDate: '2024-12-01',
          completed: false
        }
      ],
      team: [
        {
          id: 'user-001',
          name: project.owner,
          role: 'Project Lead',
          allocation: 100
        }
      ],
      recentActivity: [
        {
          id: 'act-001',
          type: 'milestone_completed',
          description: 'MVP Development milestone completed',
          timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          user: project.owner
        },
        {
          id: 'act-002',
          type: 'status_update',
          description: 'Project status updated to active',
          timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          user: project.owner
        }
      ]
    };

    res.json({
      success: true,
      data: projectDetails,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching project by ID:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch project',
      timestamp: new Date().toISOString()
    });
  }
};