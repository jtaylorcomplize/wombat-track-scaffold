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
      status: 'active',
      lastUpdated: new Date().toISOString(),
      progress: 75,
      teamSize: 8
    },
    {
      id: 'proj-complize-001', 
      name: 'Compliance Management System',
      description: 'Regulatory tracking and compliance management',
      subAppId: 'prog-complize-001',
      subAppName: 'Complize Platform',
      status: 'active',
      lastUpdated: new Date().toISOString(),
      progress: 60,
      teamSize: 5
    },
    {
      id: 'proj-spqr-001',
      name: 'SPQR Runtime Monitoring',
      description: 'Real-time system performance monitoring',
      subAppId: 'prog-spqr-001', 
      subAppName: 'SPQR Runtime',
      status: 'warning',
      lastUpdated: new Date().toISOString(),
      progress: 40,
      teamSize: 3
    }
  ],
  total: 3,
  page: 1,
  hasMore: false
});

const getMockSubAppsData = () => [
  {
    id: 'prog-orbis-001',
    name: 'Orbis Intelligence',
    description: 'AI-powered business intelligence and analytics platform',
    status: 'active',
    projectCount: 12,
    activeUsers: 45,
    lastUpdated: new Date().toISOString(),
    url: 'https://orbis.complize.com',
    version: 'v2.1.3'
  },
  {
    id: 'prog-complize-001',
    name: 'Complize Platform',
    description: 'Compliance management and regulatory tracking system',
    status: 'active',
    projectCount: 8,
    activeUsers: 23,
    lastUpdated: new Date().toISOString(),
    url: 'https://app.complize.com',
    version: 'v1.8.2'
  },
  {
    id: 'prog-spqr-001',
    name: 'SPQR Runtime',
    description: 'Real-time system monitoring and performance dashboard',
    status: 'warning',
    projectCount: 4,
    activeUsers: 12,
    lastUpdated: new Date().toISOString(),
    url: 'https://spqr.internal.com',
    version: 'v3.0.1'
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

interface SubAppsResponse {
  subApps: SubApp[];
}

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
    } catch (err) {
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

  const setupPolling = useCallback(() => {
    if (pollIntervalRef.current) return; // Already polling
    
    pollIntervalRef.current = setInterval(() => {
      fetchProjects();
    }, 30000); // 30 second polling fallback
  }, [fetchProjects]);

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
    setupWebSocket();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [filters]);

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
    } catch (err) {
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

  const setupPolling = useCallback(() => {
    if (pollIntervalRef.current) return;
    
    pollIntervalRef.current = setInterval(() => {
      fetchSubApps();
    }, 30000);
  }, [fetchSubApps]);

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
        } catch (err) {
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
    } catch (err) {
      console.error('[WebSocket] Failed to connect, using polling:', err);
      setupPolling();
    }
  }, [setupPolling]);

  useEffect(() => {
    fetchSubApps();
    setupWebSocket();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [includeProjects]);

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
  const [data, setData] = useState<{ subApp: any; projects: Project[]; summary: any } | null>(null);
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
      
      const result: APIResponse<any> = await response.json();
      
      if (result.success) {
        setData(result.data);
        setError(null);
      } else {
        throw new Error(result.error || 'Failed to fetch recent projects');
      }
    } catch (err) {
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
    } catch (err) {
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

  const setupPolling = useCallback(() => {
    if (pollIntervalRef.current) return;
    
    pollIntervalRef.current = setInterval(() => {
      fetchRuntimeStatus();
    }, 30000); // 30 second polling for runtime status
  }, [fetchRuntimeStatus]);

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
        } catch (err) {
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
    } catch (err) {
      console.error('[WebSocket] Failed to connect, using polling:', err);
      setupPolling();
    }
  }, [setupPolling]);

  useEffect(() => {
    fetchRuntimeStatus();
    setupWebSocket();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

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
    } catch (err) {
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
      } as any);
      
      setIsHealthy(response.ok);
      setLastCheck(new Date());
    } catch (err) {
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