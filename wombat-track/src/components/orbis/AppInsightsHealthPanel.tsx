import React, { useState, useEffect } from 'react';
import { getAllServicesHealth, type AppInsightsServiceHealth } from '../../api/appInsightsAPI';

interface AppInsightsMetric {
  name: string;
  value: number | string;
  unit?: string;
  status: 'healthy' | 'warning' | 'error' | 'unknown';
  timestamp: string;
}

interface AppInsightsHealth {
  serviceName: string;
  status: 'healthy' | 'warning' | 'error' | 'unknown';
  availability: number;
  responseTime: number;
  requestRate: number;
  errorRate: number;
  lastUpdated: string;
  metrics: AppInsightsMetric[];
}

interface AppInsightsHealthPanelProps {
  className?: string;
}

export const AppInsightsHealthPanel: React.FC<AppInsightsHealthPanelProps> = ({ 
  className = '' 
}) => {
  const [healthData, setHealthData] = useState<AppInsightsServiceHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<string>('');

  // Mock data for development - replace with actual App Insights API calls
  const mockHealthData: AppInsightsHealth[] = [
    {
      serviceName: 'WT-Backend-API',
      status: 'healthy',
      availability: 99.8,
      responseTime: 145,
      requestRate: 42,
      errorRate: 0.2,
      lastUpdated: new Date().toISOString(),
      metrics: [
        { name: 'CPU Usage', value: 23, unit: '%', status: 'healthy', timestamp: new Date().toISOString() },
        { name: 'Memory Usage', value: 67, unit: '%', status: 'warning', timestamp: new Date().toISOString() },
        { name: 'Active Connections', value: 84, status: 'healthy', timestamp: new Date().toISOString() },
        { name: 'Queue Length', value: 2, status: 'healthy', timestamp: new Date().toISOString() }
      ]
    },
    {
      serviceName: 'WT-Frontend-UI',
      status: 'healthy',
      availability: 99.9,
      responseTime: 89,
      requestRate: 156,
      errorRate: 0.1,
      lastUpdated: new Date().toISOString(),
      metrics: [
        { name: 'Page Load Time', value: 1.2, unit: 's', status: 'healthy', timestamp: new Date().toISOString() },
        { name: 'JS Errors', value: 1, status: 'healthy', timestamp: new Date().toISOString() },
        { name: 'User Sessions', value: 23, status: 'healthy', timestamp: new Date().toISOString() },
        { name: 'Bounce Rate', value: 12, unit: '%', status: 'healthy', timestamp: new Date().toISOString() }
      ]
    }
  ];

  // Fetch health data from App Insights API
  const fetchHealthData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await getAllServicesHealth();
      setHealthData(data);
      setLastRefresh(new Date().toLocaleString());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch health data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchHealthData, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100 border-green-200';
      case 'warning': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'error': return 'text-red-600 bg-red-100 border-red-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return '🟢';
      case 'warning': return '🟡';
      case 'error': return '🔴';
      default: return '⚫';
    }
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          📊 App Insights Health
        </h3>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-gray-600">Loading metrics...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          📊 App Insights Health
        </h3>
        <div className="bg-red-50 border border-red-200 rounded p-4">
          <span className="text-red-700">Error: {error}</span>
          <button 
            onClick={fetchHealthData}
            className="ml-4 text-red-600 hover:text-red-800 underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          📊 App Insights Health
        </h3>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">
            Last updated: {lastRefresh}
          </span>
          <button 
            onClick={fetchHealthData}
            className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {healthData.map((service) => (
          <div key={service.serviceName} className="border border-gray-100 rounded-lg p-4">
            {/* Service Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-lg">{getStatusIcon(service.status)}</span>
                <h4 className="font-semibold text-gray-900">{service.serviceName}</h4>
                <span className={`px-2 py-1 text-xs rounded-full border ${getStatusColor(service.status)}`}>
                  {service.status.toUpperCase()}
                </span>
              </div>
              <span className="text-xs text-gray-500">
                {service.availability}% uptime
              </span>
            </div>

            {/* Key Performance Indicators */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div className="text-center p-3 bg-gray-50 rounded">
                <div className="text-xl font-bold text-blue-600">
                  {service.responseTime}ms
                </div>
                <div className="text-xs text-gray-600">Avg Response</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded">
                <div className="text-xl font-bold text-green-600">
                  {service.requestRate}/min
                </div>
                <div className="text-xs text-gray-600">Request Rate</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded">
                <div className="text-xl font-bold text-red-600">
                  {service.errorRate}%
                </div>
                <div className="text-xs text-gray-600">Error Rate</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded">
                <div className="text-xl font-bold text-purple-600">
                  {service.availability}%
                </div>
                <div className="text-xs text-gray-600">Availability</div>
              </div>
            </div>

            {/* Detailed Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {service.metrics.map((metric, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-white border border-gray-100 rounded">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{getStatusIcon(metric.status)}</span>
                      <span className="text-sm font-medium text-gray-700">
                        {metric.name}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {metric.value}{metric.unit || ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* MCP Status Integration */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
          🔗 MCP Integration Status
        </h4>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
            <span className="text-sm text-gray-700">GovernanceLog Forwarder</span>
            <div className="flex items-center gap-2">
              <span className="text-green-600">🟢</span>
              <span className="text-xs text-gray-600">Active</span>
            </div>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
            <span className="text-sm text-gray-700">Telemetry Pipeline</span>
            <div className="flex items-center gap-2">
              <span className="text-green-600">🟢</span>
              <span className="text-xs text-gray-600">Flowing</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};