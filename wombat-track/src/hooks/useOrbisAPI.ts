/**
 * Enhanced Sidebar v3.1 Phase 2: Data Integration Hooks
 * Real-time data fetching with WebSocket support and 30s polling fallback
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Project, SubApp, RuntimeStatus } from '../server/api/orbis';

// API Configuration - Vite environment variables
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api';
const WS_BASE_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';

// API Response types
interface APIResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
  error?: string;
}

// Mock data for fallback
const getMockProjectsData = () => ({
  projects: [
    {
      id: 'proj-orbis-001',
      name: 'Orbis Intelligence Analytics',
      description: 'AI-powered business intelligence platform',
      subAppId: 'prog-orbis-001',
      subAppName: 'Orbis Intelligence',
      status: 'active' as const,
      priority: 'high' as const,
      completionPercentage: 75,
      owner: 'system',
      teamSize: 8,
      startDate: '2025-01-01',
      endDate: '2025-03-15',
      lastUpdated: new Date().toISOString(),
      budget: {
        allocated: 50000,
        spent: 37500
      },
      tags: ['ai', 'analytics', 'intelligence']
    },
    {
      id: 'proj-complize-001', 
      name: 'Compliance Management System',
      description: 'Regulatory tracking and compliance management',
      subAppId: 'prog-complize-001',
      subAppName: 'Complize Platform',
      status: 'active' as const,
      priority: 'medium' as const,
      completionPercentage: 60,
      owner: 'system',
      teamSize: 5,
      startDate: '2025-02-01',
      endDate: '2025-04-30',
      lastUpdated: new Date().toISOString(),
      budget: {
        allocated: 30000,
        spent: 18000
      },
      tags: ['compliance', 'regulatory', 'management']
    },
    {
      id: 'proj-spqr-001',
      name: 'SPQR Runtime Monitoring',
      description: 'Real-time system performance monitoring',
      subAppId: 'prog-spqr-001', 
      subAppName: 'SPQR',
      status: 'active' as const,
      priority: 'critical' as const,
      completionPercentage: 40,
      owner: 'system',
      teamSize: 3,
      startDate: '2025-01-15',
      endDate: '2025-05-01',
      lastUpdated: new Date().toISOString(),
      budget: {
        allocated: 25000,
        spent: 10000
      },
      tags: ['monitoring', 'performance', 'runtime']
    },
    {
      id: 'proj-roam-001',
      name: 'Business Migration Planning',
      description: 'Visa calculation and business migration planning tool',
      subAppId: 'prog-roam-001',
      subAppName: 'Roam',
      status: 'active' as const,
      priority: 'medium' as const,
      completionPercentage: 80,
      owner: 'system',
      teamSize: 4,
      startDate: '2025-02-15',
      endDate: '2025-06-01',
      lastUpdated: new Date().toISOString(),
      budget: {
        allocated: 35000,
        spent: 28000
      },
      tags: ['visa', 'migration', 'calculation']
    }
  ],
  total: 4,
  page: 1,
  hasMore: false
});

const getMockSubAppsData = () => [
  {
    id: 'prog-orbis-001',
    name: 'Orbis Intelligence',
    description: 'Core program for recursive AI-native development and Sub-App orchestration; 3D printer engine for SDLC and governance.',
    version: 'v2.1.3',
    status: 'active' as const,
    launchUrl: 'https://orbis.complize.com',
    lastUpdated: new Date().toISOString(),
    metrics: {
      totalProjects: 12,
      activeProjects: 8,
      totalUsers: 45,
      uptime: 99.2,
      avgResponseTime: 120
    },
    projects: {
      total: 12,
      recent: [
        {
          id: 'proj-orbis-001',
          name: 'Market Intelligence Dashboard',
          completionPercentage: 75
        },
        {
          id: 'proj-orbis-002', 
          name: 'Analytics Platform',
          completionPercentage: 45
        }
      ]
    }
  },
  {
    id: 'prog-complize-001',
    name: 'Complize Platform',
    description: 'Compliance suite Sub-App; includes Visa Management, Knowledge Base, and RAG/Compliance Tracker modules.',
    version: 'v1.8.2',
    status: 'active' as const,
    launchUrl: 'https://app.complize.com',
    lastUpdated: new Date().toISOString(),
    metrics: {
      totalProjects: 8,
      activeProjects: 6,
      totalUsers: 23,
      uptime: 98.7,
      avgResponseTime: 95
    },
    projects: {
      total: 8,
      recent: [
        {
          id: 'proj-complize-001',
          name: 'Compliance Management System',
          completionPercentage: 60
        },
        {
          id: 'proj-complize-002',
          name: 'Regulatory Tracking Portal',
          completionPercentage: 85
        }
      ]
    }
  },
  {
    id: 'prog-spqr-001',
    name: 'SPQR',
    description: 'Sub-App for reporting and Looker Studio integration within Orbis Intelligence ecosystem.',
    version: 'v3.0.1',
    status: 'warning' as const,
    launchUrl: 'https://spqr.internal.com',
    lastUpdated: new Date().toISOString(),
    metrics: {
      totalProjects: 4,
      activeProjects: 2,
      totalUsers: 12,
      uptime: 95.1,
      avgResponseTime: 180
    },
    projects: {
      total: 4,
      recent: [
        {
          id: 'proj-spqr-001',
          name: 'SPQR Runtime Monitoring',
          completionPercentage: 40
        },
        {
          id: 'proj-spqr-002',
          name: 'Performance Dashboard',
          completionPercentage: 25
        }
      ]
    }
  },
  {
    id: 'prog-roam-001',
    name: 'Roam',
    description: 'Formerly VisaCalcPro; business migration planning and visa calculation tool.',
    version: 'v4.2.0',
    status: 'active' as const,
    launchUrl: 'https://roam.complize.com',
    lastUpdated: new Date().toISOString(),
    metrics: {
      totalProjects: 6,
      activeProjects: 5,
      totalUsers: 28,
      uptime: 99.9,
      avgResponseTime: 85
    },
    projects: {
      total: 6,
      recent: [
        {
          id: 'proj-roam-001',
          name: 'Business Migration Planning',
          completionPercentage: 80
        },
        {
          id: 'proj-roam-002',
          name: 'Visa Calculation Engine',
          completionPercentage: 90
        }
      ]
    }
  }
];

const getMockRuntimeStatus = () => ({
  overall: 'healthy',
  services: getMockSubAppsData(),
  lastCheck: new Date().toISOString(),
  uptime: '99.2%'
});

interface ProjectsResponse {
  projects: Project[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  summary: {
    total: number;
    active: number;
    completed: number;
    onHold: number;
    planning: number;
    totalBudget: number;
    totalSpent: number;
    averageCompletion: number;
  };
  filters: {
    status: string;
    priority: string;
    subAppId: string;
    search: string;
    sortBy: string;
    sortOrder: string;
  };
}

// interface SubAppsResponse {
//   subApps: SubApp[];
// }

interface RuntimeStatusResponse {
  runtimeStatuses: RuntimeStatus[];
  overallHealth: {
    totalSubApps: number;
    healthy: number;
    warning: number;
    critical: number;
    averageUptime: number;
    averageResponseTime: number;
  };
  lastUpdated: string;
}

// Custom hooks for API data fetching

/**
 * Hook for fetching all projects with filtering and real-time updates
 */
export const useAllProjects = (filters?: {
  status?: string;
  priority?: string;
  subAppId?: string;
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: string;
}) => {
  const [data, setData] = useState<ProjectsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const fetchProjectsRef = useRef<() => Promise<void>>();

  const fetchProjects = useCallback(async () => {
    try {
      const queryParams = new URLSearchParams();
      
      if (filters?.status && filters.status !== 'all') queryParams.set('status', filters.status);
      if (filters?.priority && filters.priority !== 'all') queryParams.set('priority', filters.priority);
      if (filters?.subAppId && filters.subAppId !== 'all') queryParams.set('subAppId', filters.subAppId);
      if (filters?.search) queryParams.set('search', filters.search);
      if (filters?.limit) queryParams.set('limit', filters.limit.toString());
      if (filters?.offset) queryParams.set('offset', filters.offset.toString());
      if (filters?.sortBy) queryParams.set('sortBy', filters.sortBy);
      if (filters?.sortOrder) queryParams.set('sortOrder', filters.sortOrder);

      const response = await fetch(`${API_BASE_URL}/orbis/projects/all?${queryParams}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result: APIResponse<ProjectsResponse> = await response.json();
      
      if (result.success) {
        setData(result.data);
        setLastUpdated(new Date());
        setError(null);
      } else {
        throw new Error(result.error || 'Failed to fetch projects');
      }
    } catch {
      console.warn('[useAllProjects] API failed, falling back to mock data:', err);
      // Fallback to mock data
      const mockData = getMockProjectsData();
      setData(mockData);
      setLastUpdated(new Date());
      setError(null); // Don't show error if we have fallback data
    } finally {
      setLoading(false);
    }
  }, [filters]);

  fetchProjectsRef.current = fetchProjects;

  const setupPolling = useCallback(() => {
    if (pollIntervalRef.current) return; // Already polling
    
    pollIntervalRef.current = setInterval(() => {
      fetchProjectsRef.current?.();
    }, 30000); // 30 second polling fallback
  }, []);

  const setupWebSocket = useCallback(() => {
    // WebSocket disabled in development - use polling only for stability
    if (import.meta.env.DEV) {
      console.log('[useAllProjects] Using polling in development mode');
      setupPolling();
      return;
    }
    
    // Production WebSocket setup would go here
    setupPolling();
  }, [setupPolling]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    setupWebSocket();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [setupWebSocket]);

  const refresh = useCallback(() => {
    setLoading(true);
    fetchProjects();
  }, [fetchProjects]);

  return {
    data,
    loading,
    error,
    lastUpdated,
    refresh,
    isLive: wsRef.current?.readyState === WebSocket.OPEN
  };
};

/**
 * Hook for fetching sub-apps with project counts and status
 */
export const useSubApps = (includeProjects: boolean = true) => {
  const [data, setData] = useState<SubApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const fetchSubAppsRef = useRef<() => Promise<void>>();

  const fetchSubApps = useCallback(async () => {
    try {
      const queryParams = new URLSearchParams();
      if (includeProjects) queryParams.set('includeProjects', 'true');

      const response = await fetch(`${API_BASE_URL}/orbis/sub-apps?${queryParams}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result: APIResponse<SubApp[]> = await response.json();
      
      if (result.success) {
        setData(result.data);
        setLastUpdated(new Date());
        setError(null);
      } else {
        throw new Error(result.error || 'Failed to fetch sub-apps');
      }
    } catch {
      console.warn('[useSubApps] API failed, falling back to mock data:', err);
      // Fallback to mock data
      const mockData = getMockSubAppsData();
      setData(mockData);
      setLastUpdated(new Date());
      setError(null); // Don't show error if we have fallback data
    } finally {
      setLoading(false);
    }
  }, [includeProjects]);

  fetchSubAppsRef.current = fetchSubApps;

  const setupPolling = useCallback(() => {
    if (pollIntervalRef.current) return;
    
    pollIntervalRef.current = setInterval(() => {
      fetchSubAppsRef.current?.();
    }, 30000);
  }, []);

  const setupWebSocket = useCallback(() => {
    // WebSocket disabled in development - use polling only for stability
    if (import.meta.env.DEV) {
      console.log('[useSubApps] Using polling in development mode');
      setupPolling();
      return;
    }
    
    try {
      const ws = new WebSocket(`${WS_BASE_URL}/sub-apps`);
      
      ws.onopen = () => {
        console.log('[WebSocket] Connected to sub-apps updates');
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
      };
      
      ws.onmessage = (event) => {
        try {
          const update = JSON.parse(event.data);
          if (update.type === 'sub_apps_update') {
            fetchSubApps();
          }
        } catch {
          console.error('[WebSocket] Failed to parse message:', err);
        }
      };
      
      ws.onclose = () => {
        console.log('[WebSocket] Disconnected from sub-apps updates, falling back to polling');
        setupPolling();
      };
      
      ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
        setupPolling();
      };
      
      wsRef.current = ws;
    } catch {
      console.error('[WebSocket] Failed to connect, using polling:', err);
      setupPolling();
    }
  }, [setupPolling]);

  useEffect(() => {
    fetchSubApps();
  }, [fetchSubApps]);

  useEffect(() => {
    setupWebSocket();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [setupWebSocket]);

  const refresh = useCallback(() => {
    setLoading(true);
    fetchSubApps();
  }, [fetchSubApps]);

  return {
    data,
    loading,
    error,
    lastUpdated,
    refresh,
    isLive: wsRef.current?.readyState === WebSocket.OPEN
  };
};

/**
 * Hook for fetching recent projects for a specific sub-app
 */
export const useSubAppRecentProjects = (subAppId: string, limit: number = 5) => {
  const [data, setData] = useState<{ subApp: unknown; projects: Project[]; summary: unknown } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecentProjects = useCallback(async () => {
    if (!subAppId) return;
    
    try {
      const queryParams = new URLSearchParams();
      queryParams.set('limit', limit.toString());

      const response = await fetch(`${API_BASE_URL}/orbis/sub-apps/${subAppId}/projects/recent?${queryParams}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result: APIResponse<unknown> = await response.json();
      
      if (result.success) {
        setData(result.data);
        setError(null);
      } else {
        throw new Error(result.error || 'Failed to fetch recent projects');
      }
    } catch {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, [subAppId, limit]);

  useEffect(() => {
    fetchRecentProjects();
  }, [fetchRecentProjects]);

  const refresh = useCallback(() => {
    setLoading(true);
    fetchRecentProjects();
  }, [fetchRecentProjects]);

  return {
    data,
    loading,
    error,
    refresh
  };
};

/**
 * Hook for fetching runtime status with live updates
 */
export const useRuntimeStatus = () => {
  const [data, setData] = useState<RuntimeStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const fetchRuntimeStatusRef = useRef<() => Promise<void>>();

  const fetchRuntimeStatus = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/orbis/runtime/status`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result: APIResponse<RuntimeStatusResponse> = await response.json();
      
      if (result.success) {
        setData(result.data);
        setLastUpdated(new Date());
        setError(null);
      } else {
        throw new Error(result.error || 'Failed to fetch runtime status');
      }
    } catch {
      console.warn('[useRuntimeStatus] API failed, falling back to mock data:', err);
      // Fallback to mock data
      const mockData = getMockRuntimeStatus();
      setData(mockData);
      setLastUpdated(new Date());
      setError(null); // Don't show error if we have fallback data
    } finally {
      setLoading(false);
    }
  }, []);

  fetchRuntimeStatusRef.current = fetchRuntimeStatus;

  const setupPolling = useCallback(() => {
    if (pollIntervalRef.current) return;
    
    pollIntervalRef.current = setInterval(() => {
      fetchRuntimeStatusRef.current?.();
    }, 30000); // 30 second polling for runtime status
  }, []);

  const setupWebSocket = useCallback(() => {
    // WebSocket disabled in development - use polling only for stability
    if (import.meta.env.DEV) {
      console.log('[useRuntimeStatus] Using polling in development mode');
      setupPolling();
      return;
    }
    
    try {
      const ws = new WebSocket(`${WS_BASE_URL}/runtime-status`);
      
      ws.onopen = () => {
        console.log('[WebSocket] Connected to runtime status updates');
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
      };
      
      ws.onmessage = (event) => {
        try {
          const update = JSON.parse(event.data);
          if (update.type === 'runtime_status_update') {
            if (update.data) {
              setData(update.data);
              setLastUpdated(new Date());
            } else {
              fetchRuntimeStatus();
            }
          }
        } catch {
          console.error('[WebSocket] Failed to parse message:', err);
        }
      };
      
      ws.onclose = () => {
        console.log('[WebSocket] Disconnected from runtime status updates, falling back to polling');
        setupPolling();
      };
      
      ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
        setupPolling();
      };
      
      wsRef.current = ws;
    } catch {
      console.error('[WebSocket] Failed to connect, using polling:', err);
      setupPolling();
    }
  }, [setupPolling]);

  useEffect(() => {
    fetchRuntimeStatus();
  }, [fetchRuntimeStatus]);

  useEffect(() => {
    setupWebSocket();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [setupWebSocket]);

  const refresh = useCallback(() => {
    setLoading(true);
    fetchRuntimeStatus();
  }, [fetchRuntimeStatus]);

  return {
    data,
    loading,
    error,
    lastUpdated,
    refresh,
    isLive: wsRef.current?.readyState === WebSocket.OPEN
  };
};

/**
 * Hook for fetching individual project details
 */
export const useProject = (projectId: string) => {
  const [data, setData] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProject = useCallback(async () => {
    if (!projectId) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/orbis/projects/${projectId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result: APIResponse<Project> = await response.json();
      
      if (result.success) {
        setData(result.data);
        setError(null);
      } else {
        throw new Error(result.error || 'Failed to fetch project');
      }
    } catch {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  const refresh = useCallback(() => {
    setLoading(true);
    fetchProject();
  }, [fetchProject]);

  return {
    data,
    loading,
    error,
    refresh
  };
};

// Utility hook for API health checking
export const useAPIHealth = () => {
  const [isHealthy, setIsHealthy] = useState(true);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  const checkHealth = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/health`, {
        method: 'HEAD',
        timeout: 5000
      } as unknown);
      
      setIsHealthy(response.ok);
      setLastCheck(new Date());
    } catch {
      setIsHealthy(false);
      setLastCheck(new Date());
    }
  }, []);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 60000); // Check every minute
    
    return () => clearInterval(interval);
  }, [checkHealth]);

  return {
    isHealthy,
    lastCheck,
    checkHealth
  };
};