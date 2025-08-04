import { useState, useEffect } from 'react';

export interface SubApp {
  id: string;
  name: string;
  status: 'active' | 'warning' | 'offline';
  lastUpdated: Date;
  launchUrl: string;
  description?: string;
}

interface UseSubAppStatusReturn {
  subApps: SubApp[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export const useSubAppStatus = (): UseSubAppStatusReturn => {
  const [subApps, setSubApps] = useState<SubApp[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubAppStatus = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      // In development mode, return mock data
      if (import.meta.env.DEV) {
        const mockSubApps = generateMockSubApps();
        setSubApps(mockSubApps);
        return;
      }

      // Production API call
      const response = await fetch('/api/admin/runtime/status');
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      const transformedSubApps = transformAPIResponse(data.subApps || data);
      
      setSubApps(transformedSubApps);
      
    } catch (err) {
      console.error('Failed to fetch sub-app status:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      
      // Fallback to mock data on error
      const fallbackSubApps = generateMockSubApps();
      setSubApps(fallbackSubApps);
      
    } finally {
      setIsLoading(false);
    }
  };

  // Transform API response to SubApp interface
  const transformAPIResponse = (apiData: Record<string, unknown>[]): SubApp[] => {
    return apiData.map((item: Record<string, unknown>) => ({
      id: String(item.id || item.subapp_id || ''),
      name: String(item.name || item.display_name || ''),
      status: normalizeStatus(String(item.status || 'offline')),
      lastUpdated: new Date(String(item.last_updated || item.updated_at) || Date.now()),
      launchUrl: String(item.launch_url || item.url || `https://${String(item.name || '').toLowerCase().replace(/\s+/g, '-')}.app.com`),
      description: String(item.description || '')
    }));
  };

  // Normalize various status formats to our enum
  const normalizeStatus = (apiStatus: string): 'active' | 'warning' | 'offline' => {
    const status = apiStatus?.toLowerCase();
    
    switch (status) {
      case 'online':
      case 'running':
      case 'healthy':
      case 'operational':
      case 'active':
        return 'active';
      case 'degraded':
      case 'slow':
      case 'unstable':
      case 'warning':
        return 'warning';
      case 'offline':
      case 'down':
      case 'stopped':
      case 'failed':
      default:
        return 'offline';
    }
  };

  // Generate realistic mock data for development
  const generateMockSubApps = (): SubApp[] => {
    const now = Date.now();
    
    return [
      {
        id: 'prog-orbis-001',
        name: 'Orbis Intelligence',
        status: 'active',
        lastUpdated: new Date(now - Math.random() * 5 * 60 * 1000), // Last 5 minutes
        launchUrl: 'https://orbis.complize.com',
        description: 'Core program for recursive AI-native development and Sub-App orchestration; 3D printer engine for SDLC and governance.'
      },
      {
        id: 'prog-complize-001',
        name: 'Complize Platform',
        status: Math.random() > 0.7 ? 'warning' : 'active',
        lastUpdated: new Date(now - Math.random() * 30 * 60 * 1000), // Last 30 minutes
        launchUrl: 'https://app.complize.com',
        description: 'Compliance suite Sub-App; includes Visa Management, Knowledge Base, and RAG/Compliance Tracker modules.'
      },
      {
        id: 'prog-spqr-001',
        name: 'SPQR',
        status: Math.random() > 0.8 ? 'offline' : 'active',
        lastUpdated: new Date(now - Math.random() * 60 * 60 * 1000), // Last hour
        launchUrl: 'https://spqr.internal.com',
        description: 'Sub-App for reporting and Looker Studio integration within Orbis Intelligence ecosystem.'
      },
      {
        id: 'prog-roam-001',
        name: 'Roam',
        status: 'active',
        lastUpdated: new Date(now - Math.random() * 2 * 60 * 1000), // Last 2 minutes
        launchUrl: 'https://roam.complize.com',
        description: 'Formerly VisaCalcPro; business migration planning and visa calculation tool.'
      },
      {
        id: 'prog-dealflow-001',
        name: 'DealFlow Manager',
        status: Math.random() > 0.9 ? 'warning' : 'active',
        lastUpdated: new Date(now - Math.random() * 10 * 60 * 1000), // Last 10 minutes
        launchUrl: 'https://dealflow.app.com',
        description: 'Investment deal tracking and portfolio management'
      }
    ];
  };

  // Set up real-time polling
  useEffect(() => {
    // Initial fetch
    fetchSubAppStatus();

    // Set up polling interval (30 seconds)
    const interval = setInterval(() => {
      fetchSubAppStatus();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Manual refresh function
  const refresh = async (): Promise<void> => {
    await fetchSubAppStatus();
  };

  return {
    subApps,
    isLoading,
    error,
    refresh
  };
};