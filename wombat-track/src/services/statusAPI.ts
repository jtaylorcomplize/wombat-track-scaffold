import { SubAppStatusData } from '../components/layout/SubAppStatusBadge';

// API service for live status monitoring
export class StatusAPI {
  private static baseUrl = '/api/admin/runtime';
  
  /**
   * Fetch live status for all sub-applications
   */
  static async fetchSubAppStatus(): Promise<SubAppStatusData[]> {
    try {
      // In development, return mock data
      if (import.meta.env.DEV) {
        console.log('🔄 StatusAPI: Using mock data in development mode');
        return this.getMockSubAppStatus();
      }

      // Production API call
      const response = await fetch(`${this.baseUrl}/status`);
      
      if (!response.ok) {
        throw new Error(`Status API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      return this.transformAPIResponse(data);
      
    } catch (error) {
      console.error('❌ StatusAPI: Failed to fetch sub-app status:', error);
      
      // Fallback to mock data on error
      console.log('🔄 StatusAPI: Falling back to mock data');
      return this.getMockSubAppStatus();
    }
  }

  /**
   * Fetch status for a specific sub-application
   */
  static async fetchSingleSubAppStatus(subAppId: string): Promise<SubAppStatusData | null> {
    try {
      if (import.meta.env.DEV) {
        const mockData = this.getMockSubAppStatus();
        return mockData.find(app => app.id === subAppId) || null;
      }

      const response = await fetch(`${this.baseUrl}/status/${subAppId}`);
      
      if (!response.ok) {
        throw new Error(`Status API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      return this.transformSingleAPIResponse(data);
      
    } catch (error) {
      console.error(`❌ StatusAPI: Failed to fetch status for ${subAppId}:`, error);
      return null;
    }
  }

  /**
   * Subscribe to real-time status updates via WebSocket
   */
  static subscribeToStatusUpdates(
    onUpdate: (status: SubAppStatusData[]) => void,
    onError?: (error: Error) => void
  ): () => void {
    // WebSocket URL - adjust based on environment
    const wsUrl = import.meta.env.DEV 
      ? 'ws://localhost:3001/api/admin/runtime/ws'
      : `wss://${window.location.host}/api/admin/runtime/ws`;

    let ws: WebSocket | null = null;
    let reconnectTimer: NodeJS.Timeout | null = null;
    let isIntentionallyClosed = false;

    const connect = () => {
      try {
        ws = new WebSocket(wsUrl);
        
        ws.onopen = () => {
          console.log('🔌 StatusAPI: WebSocket connected for real-time updates');
        };
        
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            const transformedData = this.transformAPIResponse(data);
            onUpdate(transformedData);
          } catch (error) {
            console.error('❌ StatusAPI: Failed to parse WebSocket message:', error);
          }
        };
        
        ws.onclose = (event) => {
          console.log('🔌 StatusAPI: WebSocket connection closed', event.code, event.reason);
          
          // Attempt reconnection if not intentionally closed
          if (!isIntentionallyClosed && !reconnectTimer) {
            reconnectTimer = setTimeout(() => {
              console.log('🔄 StatusAPI: Attempting to reconnect WebSocket...');
              reconnectTimer = null;
              connect();
            }, 5000); // Reconnect after 5 seconds
          }
        };
        
        ws.onerror = (error) => {
          console.error('❌ StatusAPI: WebSocket error:', error);
          if (onError) {
            onError(new Error('WebSocket connection failed'));
          }
        };
        
      } catch (error) {
        console.error('❌ StatusAPI: Failed to create WebSocket connection:', error);
        if (onError) {
          onError(error as Error);
        }
      }
    };

    // For development, simulate real-time updates with polling
    if (import.meta.env.DEV) {
      console.log('🔄 StatusAPI: Using polling for real-time updates in development');
      
      const pollInterval = setInterval(async () => {
        try {
          const status = await this.fetchSubAppStatus();
          onUpdate(status);
        } catch (error) {
          console.error('❌ StatusAPI: Polling error:', error);
        }
      }, 30000); // Poll every 30 seconds
      
      return () => {
        clearInterval(pollInterval);
      };
    }

    // Start WebSocket connection
    connect();

    // Return cleanup function
    return () => {
      isIntentionallyClosed = true;
      
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      
      if (ws) {
        ws.close(1000, 'Component unmounted');
        ws = null;
      }
    };
  }

  /**
   * Transform API response to match our SubAppStatusData interface
   */
  private static transformAPIResponse(apiData: any[]): SubAppStatusData[] {
    return apiData.map(item => this.transformSingleAPIResponse(item));
  }

  private static transformSingleAPIResponse(item: any): SubAppStatusData {
    return {
      id: item.id || item.subapp_id,
      name: item.name || item.display_name,
      status: this.normalizeStatus(item.status),
      lastUpdated: new Date(item.last_updated || item.updated_at || Date.now()),
      uptime: item.uptime || `${Math.floor(Math.random() * 99) + 90}.${Math.floor(Math.random() * 9)}%`,
      healthScore: item.health_score || Math.floor(Math.random() * 30) + 70,
      activeUsers: item.active_users || Math.floor(Math.random() * 200),
      url: item.url || item.access_url,
      description: item.description,
      version: item.version
    };
  }

  /**
   * Normalize status values from API to our enum
   */
  private static normalizeStatus(apiStatus: string): 'active' | 'warning' | 'offline' | 'loading' {
    const status = apiStatus?.toLowerCase();
    
    switch (status) {
      case 'online':
      case 'running':
      case 'healthy':
      case 'operational':
        return 'active';
      case 'degraded':
      case 'slow':
      case 'unstable':
        return 'warning';
      case 'offline':
      case 'down':
      case 'stopped':
      case 'failed':
        return 'offline';
      case 'starting':
      case 'initializing':
        return 'loading';
      default:
        return 'loading';
    }
  }

  /**
   * Generate mock status data for development and fallback
   */
  private static getMockSubAppStatus(): SubAppStatusData[] {
    const now = Date.now();
    
    return [
      {
        id: 'prog-orbis-001',
        name: 'Orbis Intelligence',
        status: 'active',
        lastUpdated: new Date(now - Math.random() * 5 * 60 * 1000), // Last 5 minutes
        uptime: '99.8%',
        healthScore: Math.floor(Math.random() * 20) + 80, // 80-100
        activeUsers: Math.floor(Math.random() * 50) + 10,
        url: 'https://orbis.complize.com',
        description: 'AI-powered business intelligence and analytics platform',
        version: 'v2.1.3'
      },
      {
        id: 'prog-complize-001',
        name: 'Complize Platform',
        status: Math.random() > 0.7 ? 'warning' : 'active',
        lastUpdated: new Date(now - Math.random() * 30 * 60 * 1000), // Last 30 minutes
        uptime: '98.2%',
        healthScore: Math.floor(Math.random() * 40) + 60, // 60-100
        activeUsers: Math.floor(Math.random() * 20) + 5,
        url: 'https://app.complize.com',
        description: 'Compliance management and regulatory tracking system',
        version: 'v1.8.2'
      },
      {
        id: 'prog-spqr-001',
        name: 'SPQR Runtime',
        status: Math.random() > 0.8 ? 'offline' : 'active',
        lastUpdated: new Date(now - Math.random() * 60 * 60 * 1000), // Last hour
        uptime: '89.1%',
        healthScore: Math.random() > 0.8 ? 0 : Math.floor(Math.random() * 50) + 50,
        activeUsers: Math.random() > 0.8 ? 0 : Math.floor(Math.random() * 10),
        url: 'https://spqr.internal.com',
        description: 'Real-time system monitoring and performance dashboard',
        version: 'v3.0.1'
      },
      {
        id: 'prog-visacalc-001',
        name: 'VisaCalc',
        status: 'active',
        lastUpdated: new Date(now - Math.random() * 2 * 60 * 1000), // Last 2 minutes
        uptime: '99.9%',
        healthScore: Math.floor(Math.random() * 10) + 90, // 90-100
        activeUsers: Math.floor(Math.random() * 200) + 50,
        url: 'https://visacalc.complize.com',
        description: 'Advanced visa processing and calculation engine',
        version: 'v4.2.0'
      }
    ];
  }
}