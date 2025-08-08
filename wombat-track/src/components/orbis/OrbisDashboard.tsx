import React, { useState, useEffect, useCallback } from 'react';

import { 
  getIntegrationsHealth, 
  refreshIntegrationsHealth, 
  analyzeIntegrationWithClaude
} from '../../api/integrationHealthAPI';
import type { IntegrationHealth } from '../../lib/getIntegrationHealth';
import { ClaudePromptButton } from '../common/ClaudePromptButton';
import { AppInsightsHealthPanel } from './AppInsightsHealthPanel';

// Legacy interface for backward compatibility
interface Integration {
  name: string;
  status: 'healthy' | 'warning' | 'error' | 'unknown';
  category: 'AI' | 'CI/CD' | 'Test' | 'Data' | 'API' | 'Database' | 'Service' | 'Monitoring';
  lastChecked: Date;
  logUrl?: string;
  type: 'AI' | 'CI/CD' | 'Test' | 'Data';
}

interface OrbisDashboardProps {
  onHealthCheck?: () => void;
}

// Convert IntegrationHealth to legacy Integration format for UI compatibility
const mapHealthToIntegration = (health: IntegrationHealth): Integration => ({
  name: health.id,
  status: health.status,
  category: health.category,
  type: health.type,
  lastChecked: new Date(health.lastChecked),
  logUrl: health.logUrl
});

export const OrbisDashboard: React.FC<OrbisDashboardProps> = ({ onHealthCheck }) => {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [analysisStates, setAnalysisStates] = useState<Record<string, { loading: boolean; response?: string }>>({});

  // Load integration health data on component mount
  const loadIntegrationHealth = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await getIntegrationsHealth();
      const mappedIntegrations = response.data.map(mapHealthToIntegration);
      
      setIntegrations(mappedIntegrations);
      setLastUpdated(response.timestamp);
      
      // Call the optional onHealthCheck callback
      if (onHealthCheck) {
        onHealthCheck();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load integration health data');
      console.error('Failed to load integration health:', err);
    } finally {
      setIsLoading(false);
    }
  }, [onHealthCheck]);

  // Initial load
  useEffect(() => {
    loadIntegrationHealth();
  }, [loadIntegrationHealth]);

  const filteredIntegrations = integrations.filter(integration => {
    const statusMatch = statusFilter === 'all' || integration.status === statusFilter;
    const categoryMatch = categoryFilter === 'all' || integration.type === categoryFilter;
    return statusMatch && categoryMatch;
  });

  const getStatusCounts = () => {
    const counts = integrations.reduce((acc, integration) => {
      acc[integration.status] = (acc[integration.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return counts;
  };

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      setError(null);
      
      const response = await refreshIntegrationsHealth();
      const mappedIntegrations = response.data.map(mapHealthToIntegration);
      
      setIntegrations(mappedIntegrations);
      setLastUpdated(response.timestamp);
      
      if (onHealthCheck) {
        onHealthCheck();
      }
      
      console.log(`🔄 Refreshed ${response.refreshed.length} integrations`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh integration health');
      console.error('Failed to refresh health data:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleClaudeAnalysis = async (integrationName: string, prompt: string): Promise<string> => {
    try {
      setAnalysisStates(prev => ({
        ...prev,
        [integrationName]: { loading: true }
      }));

      const response = await analyzeIntegrationWithClaude(integrationName, prompt);
      const analysisResult = `**Analysis for ${response.data.integration?.label}**\n\n${response.data.analysis}\n\n**Risk Level**: ${response.data.riskLevel.toUpperCase()}\n\n**Recommendations**:\n${response.data.recommendations.map((rec, idx) => `${idx + 1}. ${rec}`).join('\n')}`;
      
      setAnalysisStates(prev => ({
        ...prev,
        [integrationName]: { loading: false, response: analysisResult }
      }));

      return analysisResult;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to analyze integration';
      setAnalysisStates(prev => ({
        ...prev,
        [integrationName]: { loading: false, response: `Error: ${errorMessage}` }
      }));
      throw err;
    }
  };

  const formatLastChecked = (date: Date) => {
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes === 1) return '1 minute ago';
    if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours === 1) return '1 hour ago';
    if (diffHours < 24) return `${diffHours} hours ago`;
    
    return date.toLocaleDateString();
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'healthy': return '#22c55e';
      case 'warning': return '#f59e0b';
      case 'error': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getTypeTagStyle = (type: string) => {
    switch (type) {
      case 'AI':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'CI/CD':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Test':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Data':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCategoryIcon = (type: string) => {
    switch (type) {
      case 'AI':
        return '🧠';
      case 'CI/CD':
        return '🔧';
      case 'Test':
        return '🧪';
      case 'Data':
        return '💾';
      default:
        return '⚙️';
    }
  };

  const groupIntegrationsByType = () => {
    const groups = filteredIntegrations.reduce((acc, integration) => {
      if (!acc[integration.type]) {
        acc[integration.type] = [];
      }
      acc[integration.type].push(integration);
      return acc;
    }, {} as Record<string, Integration[]>);
    
    return groups;
  };

  const statusCounts = getStatusCounts();
  const groupedIntegrations = groupIntegrationsByType();

  if (isLoading) {
    return (
      <div data-testid="orbis-dashboard-loading" className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <div className="text-gray-600">Loading integration health data...</div>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="orbis-dashboard-page" className="space-y-6">
      {/* App Insights Health Panel */}
      <AppInsightsHealthPanel className="mb-6" />

      {/* Status Rollup */}
      <div data-testid="status-rollup" className="grid grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg border">
        {lastUpdated && (
          <div className="col-span-4 text-xs text-gray-500 mb-2">
            Last updated: {new Date(lastUpdated).toLocaleString()}
          </div>
        )}
        <div className="text-center">
          <div className="text-2xl font-bold text-green-500">
            {statusCounts.healthy || 0}
          </div>
          <div className="text-xs text-gray-600">Healthy</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-amber-500">
            {statusCounts.warning || 0}
          </div>
          <div className="text-xs text-gray-600">Warning</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-500">
            {statusCounts.error || 0}
          </div>
          <div className="text-xs text-gray-600">Error</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-600">
            {integrations.length}
          </div>
          <div className="text-xs text-gray-600">Total</div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <span className="text-red-500 text-sm font-medium">⚠️ Error:</span>
            <span className="text-red-700 text-sm">{error}</span>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <select 
          data-testid="status-filter"
          value={statusFilter} 
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md bg-white text-sm"
        >
          <option value="all">All Status</option>
          <option value="healthy">Healthy</option>
          <option value="warning">Warning</option>
          <option value="error">Error</option>
          <option value="unknown">Unknown</option>
        </select>

        <select 
          data-testid="category-filter"
          value={categoryFilter} 
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md bg-white text-sm"
        >
          <option value="all">All Types</option>
          <option value="AI">AI Services</option>
          <option value="CI/CD">CI/CD</option>
          <option value="Test">Testing</option>
          <option value="Data">Data Services</option>
        </select>

        <button 
          data-testid="refresh-button"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isRefreshing ? 'Refreshing...' : 'Refresh All'}
        </button>
      </div>

      {/* Grouped Integrations */}
      <div className="space-y-6">
        {Object.entries(groupedIntegrations).map(([type, integrations]) => (
          <div key={type} className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <span className="text-xl">{getCategoryIcon(type)}</span>
              {type === 'AI' && '🧠 AI Services'}
              {type === 'CI/CD' && '🔧 CI/CD'}
              {type === 'Test' && '🧪 Testing + Data'}
              {type === 'Data' && '💾 Data Services'}
            </h3>
            
            <div className="grid gap-3">
              {integrations.map((integration) => (
                <div 
                  key={integration.name}
                  data-testid={`integration-item-${integration.name}`}
                  className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-3">
                    <span 
                      data-testid={`status-badge-${integration.name}`}
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: getStatusBadgeColor(integration.status) }}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900">{integration.name}</span>
                        <span 
                          className={`text-xs px-2 py-0.5 rounded-full border ${getTypeTagStyle(integration.type)}`}
                        >
                          {integration.type}
                        </span>
                      </div>
                      <p 
                        data-testid={`last-checked-${integration.name}`}
                        className="text-xs text-gray-500"
                      >
                        Last checked: {integration.lastChecked.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500">
                      {formatLastChecked(integration.lastChecked)}
                    </span>
                    {integration.logUrl && (
                      <a 
                        data-testid={`log-link-${integration.name}`}
                        href={integration.logUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-sm underline"
                      >
                        📋 Logs
                      </a>
                    )}
                    <ClaudePromptButton
                      type="analyze"
                      label="Analyze"
                      prompt={`Analyze integration status for ${integration.name}`}
                      context={{ integration }}
                      loading={analysisStates[integration.name]?.loading || false}
                      onPrompt={(prompt) => handleClaudeAnalysis(integration.name, prompt)}
                      className="scale-75 origin-right"
                      testId={`claude-analysis-${integration.name}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {filteredIntegrations.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <div className="text-lg font-medium mb-2">No integrations found</div>
          <p>Try adjusting your filters to see more results.</p>
        </div>
      )}
    </div>
  );
};