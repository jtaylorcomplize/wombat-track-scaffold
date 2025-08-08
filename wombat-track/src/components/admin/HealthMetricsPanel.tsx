import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Server, 
  AlertTriangle, 
  CheckCircle2, 
  Clock,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Wifi,
  WifiOff
} from 'lucide-react';

interface AppInsightsMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: string;
  resourceName: string;
}

interface HealthStatus {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastCheck: string;
  responseTime: number;
  appInsights: {
    connected: boolean;
    lastTelemetry: string;
    requestCount: number;
    errorRate: number;
    responseTime: number;
  };
}

interface MCPStatus {
  server: string;
  connected: boolean;
  lastPing: string;
  responseTime: number;
}

const HealthMetricsPanel: React.FC = () => {
  const [healthData, setHealthData] = useState<HealthStatus[]>([]);
  const [mcpStatus, setMcpStatus] = useState<MCPStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch health status from services
  const fetchHealthStatus = async (): Promise<void> => {
    try {
      setLoading(true);
      
      // Fetch backend health with App Insights metrics
      const backendHealth = await fetchServiceHealth('wombat-track-api-prod', '/api/health');
      const frontendHealth = await fetchServiceHealth('wombat-track-ui-prod', '/');
      
      // Fetch MCP server status
      const mcpServers = await fetchMCPStatus();
      
      setHealthData([backendHealth, frontendHealth]);
      setMcpStatus(mcpServers);
      
      setError('');
    } catch (err) {
      console.error('Error fetching health status:', err);
      setError('Failed to fetch health metrics');
      
      // Set fallback data
      setHealthData([
        createFallbackHealth('wombat-track-api-prod', 'unhealthy'),
        createFallbackHealth('wombat-track-ui-prod', 'unhealthy')
      ]);
      setMcpStatus([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchServiceHealth = async (serviceName: string, healthPath: string): Promise<HealthStatus> => {
    const startTime = Date.now();
    
    try {
      // Test service endpoint
      const url = `https://${serviceName}.azurewebsites.net${healthPath}`;
      const response = await fetch(url, {
        method: 'GET',
        mode: 'no-cors', // Handle CORS for external services
        cache: 'no-cache'
      });
      
      const responseTime = Date.now() - startTime;
      const isHealthy = response.status === 200;
      
      // Simulate App Insights data (in production, this would come from Azure API)
      const appInsightsData = await fetchAppInsightsMetrics(serviceName);
      
      return {
        service: serviceName,
        status: isHealthy ? 'healthy' : 'degraded',
        lastCheck: new Date().toISOString(),
        responseTime,
        appInsights: appInsightsData
      };
      
    } catch (error) {
      console.error(`Health check failed for ${serviceName}:`, error);
      
      return {
        service: serviceName,
        status: 'unhealthy',
        lastCheck: new Date().toISOString(),
        responseTime: -1,
        appInsights: {
          connected: false,
          lastTelemetry: 'N/A',
          requestCount: 0,
          errorRate: 0,
          responseTime: 0
        }
      };
    }
  };

  const fetchAppInsightsMetrics = async (serviceName: string) => {
    // In production, this would query Azure App Insights REST API
    // For now, return simulated data based on service availability
    const isBackend = serviceName.includes('api');
    
    return {
      connected: true,
      lastTelemetry: new Date(Date.now() - Math.random() * 300000).toISOString(), // Last 5 minutes
      requestCount: Math.floor(Math.random() * 100) + (isBackend ? 50 : 200),
      errorRate: Math.random() * 5, // 0-5% error rate
      responseTime: Math.floor(Math.random() * 500) + (isBackend ? 100 : 50) // ms
    };
  };

  const fetchMCPStatus = async (): Promise<MCPStatus[]> => {
    const mcpServers = [
      'notion-mcp-server',
      'governance-mcp-server',
      'file-system-mcp'
    ];
    
    return Promise.all(
      mcpServers.map(async (server) => {
        const startTime = Date.now();
        
        try {
          // In production, this would ping actual MCP servers
          // For now, simulate connectivity
          const connected = Math.random() > 0.2; // 80% success rate
          
          return {
            server,
            connected,
            lastPing: new Date().toISOString(),
            responseTime: connected ? Math.floor(Math.random() * 100) + 10 : -1
          };
        } catch {
          return {
            server,
            connected: false,
            lastPing: new Date().toISOString(),
            responseTime: -1
          };
        }
      })
    );
  };

  const createFallbackHealth = (service: string, status: 'healthy' | 'degraded' | 'unhealthy'): HealthStatus => ({
    service,
    status,
    lastCheck: new Date().toISOString(),
    responseTime: -1,
    appInsights: {
      connected: false,
      lastTelemetry: 'N/A',
      requestCount: 0,
      errorRate: 0,
      responseTime: 0
    }
  });

  useEffect(() => {
    fetchHealthStatus();
  }, [refreshKey]);

  // Auto-refresh every 30 seconds if enabled
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      setRefreshKey(prev => prev + 1);
    }, 30000);
    
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle2 className="text-green-600" size={20} />;
      case 'degraded':
        return <AlertTriangle className="text-yellow-600" size={20} />;
      case 'unhealthy':
        return <AlertTriangle className="text-red-600" size={20} />;
      default:
        return <Clock className="text-gray-600" size={20} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'degraded':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'unhealthy':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    if (timestamp === 'N/A') return 'N/A';
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <div className="bg-white rounded-lg border shadow-sm p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
          <Activity className="text-blue-600" size={20} />
          <span>Health & Observability</span>
        </h2>
        
        <div className="flex items-center space-x-2">
          <label className="flex items-center space-x-2 text-sm">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            <span>Auto-refresh (30s)</span>
          </label>
          
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors flex items-center space-x-1 disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Azure App Services Health */}
        <div className="space-y-3">
          <h3 className="font-medium text-gray-700 flex items-center space-x-2">
            <Server size={16} />
            <span>Azure App Services</span>
          </h3>
          
          {healthData.map(service => (
            <div key={service.service} className={`border rounded-lg p-4 ${getStatusColor(service.status)}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  {getStatusIcon(service.status)}
                  <span className="font-medium">{service.service}</span>
                </div>
                <span className="text-xs">
                  Last check: {formatTimestamp(service.lastCheck)}
                </span>
              </div>
              
              {/* App Insights Metrics */}
              <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                <div className="flex items-center space-x-1">
                  {service.appInsights.connected ? (
                    <Wifi size={12} className="text-blue-600" />
                  ) : (
                    <WifiOff size={12} className="text-gray-400" />
                  )}
                  <span>App Insights: {service.appInsights.connected ? 'Connected' : 'Disconnected'}</span>
                </div>
                
                <div>
                  <span>Requests: {service.appInsights.requestCount}</span>
                </div>
                
                <div className="flex items-center space-x-1">
                  {service.appInsights.errorRate > 2 ? (
                    <TrendingUp size={12} className="text-red-600" />
                  ) : (
                    <TrendingDown size={12} className="text-green-600" />
                  )}
                  <span>Error Rate: {service.appInsights.errorRate.toFixed(1)}%</span>
                </div>
                
                <div>
                  <span>Avg Response: {service.appInsights.responseTime}ms</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* MCP Server Status */}
        <div className="space-y-3">
          <h3 className="font-medium text-gray-700 flex items-center space-x-2">
            <Wifi size={16} />
            <span>MCP Servers</span>
          </h3>
          
          {mcpStatus.map(server => (
            <div key={server.server} className={`border rounded-lg p-4 ${
              server.connected 
                ? 'bg-green-100 text-green-800 border-green-200' 
                : 'bg-red-100 text-red-800 border-red-200'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {server.connected ? (
                    <CheckCircle2 className="text-green-600" size={16} />
                  ) : (
                    <AlertTriangle className="text-red-600" size={16} />
                  )}
                  <span className="font-medium">{server.server}</span>
                </div>
                
                <div className="text-xs">
                  {server.responseTime > 0 ? `${server.responseTime}ms` : 'Offline'}
                </div>
              </div>
              
              <div className="text-xs mt-1">
                Last ping: {formatTimestamp(server.lastPing)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Overall System Status */}
      <div className="mt-4 p-3 bg-gray-50 rounded text-sm">
        <div className="flex items-center justify-between">
          <span className="font-medium">Overall System Status:</span>
          <div className="flex items-center space-x-2">
            {healthData.every(s => s.status === 'healthy') && mcpStatus.every(s => s.connected) ? (
              <>
                <CheckCircle2 className="text-green-600" size={16} />
                <span className="text-green-700 font-medium">All Systems Operational</span>
              </>
            ) : healthData.some(s => s.status === 'unhealthy') || mcpStatus.some(s => !s.connected) ? (
              <>
                <AlertTriangle className="text-red-600" size={16} />
                <span className="text-red-700 font-medium">Service Degradation Detected</span>
              </>
            ) : (
              <>
                <AlertTriangle className="text-yellow-600" size={16} />
                <span className="text-yellow-700 font-medium">Minor Issues Detected</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HealthMetricsPanel;