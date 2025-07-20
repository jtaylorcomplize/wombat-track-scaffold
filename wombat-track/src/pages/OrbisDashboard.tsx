import React, { useState } from 'react';
import type { Integration } from '../types/integration';
import { IntegrationCategory, IntegrationStatus } from '../types/integration';

const mockIntegrations: Integration[] = [
  {
    name: 'claude-api',
    status: IntegrationStatus.Working,
    lastChecked: new Date(Date.now() - 2 * 60 * 1000),
    isActive: true,
    category: IntegrationCategory.Claude,
    logURL: 'https://logs.example.com/claude-api'
  },
  {
    name: 'github-webhooks',
    status: IntegrationStatus.Working,
    lastChecked: new Date(Date.now() - 5 * 60 * 1000),
    isActive: true,
    category: IntegrationCategory.GitHub,
    logURL: 'https://logs.example.com/github-webhooks'
  },
  {
    name: 'ci-pipeline',
    status: IntegrationStatus.Degraded,
    lastChecked: new Date(Date.now() - 10 * 60 * 1000),
    isActive: true,
    category: IntegrationCategory.CI
  },
  {
    name: 'sync-service',
    status: IntegrationStatus.Broken,
    lastChecked: new Date(Date.now() - 30 * 60 * 1000),
    isActive: false,
    category: IntegrationCategory.Sync,
    logURL: 'https://logs.example.com/sync-service'
  },
  {
    name: 'memory-plugin',
    status: IntegrationStatus.Working,
    lastChecked: new Date(Date.now() - 1 * 60 * 1000),
    isActive: true,
    category: IntegrationCategory.MemoryPlugin
  },
  {
    name: 'bubble-connector',
    status: IntegrationStatus.Degraded,
    lastChecked: new Date(Date.now() - 15 * 60 * 1000),
    isActive: true,
    category: IntegrationCategory.Bubble,
    logURL: 'https://logs.example.com/bubble-connector'
  }
];

interface OrbisDashboardProps {
  onHealthCheck?: (integrationId: string) => Promise<void>;
}

export const OrbisDashboard: React.FC<OrbisDashboardProps> = ({ onHealthCheck }) => {
  const [integrations, setIntegrations] = useState<Integration[]>(mockIntegrations);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const filteredIntegrations = integrations.filter(integration => {
    const statusMatch = statusFilter === 'all' || integration.status === statusFilter;
    const categoryMatch = categoryFilter === 'all' || integration.category === categoryFilter;
    return statusMatch && categoryMatch;
  });

  const getOperationalStats = () => {
    const workingCount = integrations.filter(i => i.status === IntegrationStatus.Working && i.isActive).length;
    const totalActive = integrations.filter(i => i.isActive).length;
    const percentage = totalActive > 0 ? Math.round((workingCount / totalActive) * 100) : 0;
    
    return {
      working: workingCount,
      total: totalActive,
      percentage
    };
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      for (const integration of integrations) {
        if (onHealthCheck) {
          await onHealthCheck(integration.name);
        }
      }
      
      setIntegrations(prev => prev.map(integration => ({
        ...integration,
        lastChecked: new Date()
      })));
    } finally {
      setIsRefreshing(false);
    }
  };

  const runHealthCheck = async (integrationId: string) => {
    if (onHealthCheck) {
      await onHealthCheck(integrationId);
    }
    
    setIntegrations(prev => prev.map(integration => 
      integration.name === integrationId 
        ? { ...integration, lastChecked: new Date() }
        : integration
    ));
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

  const getStatusBadgeStyle = (status: IntegrationStatus) => {
    const baseStyle = {
      padding: '4px 8px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: '600',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.5px'
    };

    switch (status) {
      case IntegrationStatus.Working:
        return { ...baseStyle, backgroundColor: '#dcfce7', color: '#15803d' };
      case IntegrationStatus.Degraded:
        return { ...baseStyle, backgroundColor: '#fef3c7', color: '#d97706' };
      case IntegrationStatus.Broken:
        return { ...baseStyle, backgroundColor: '#fee2e2', color: '#dc2626' };
      default:
        return { ...baseStyle, backgroundColor: '#f3f4f6', color: '#6b7280' };
    }
  };

  const getCategoryChipStyle = () => {
    return {
      padding: '2px 6px',
      borderRadius: '4px',
      fontSize: '11px',
      backgroundColor: '#f8fafc',
      color: '#64748b',
      border: '1px solid #e2e8f0'
    };
  };

  const stats = getOperationalStats();

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '700', color: '#1f2937', marginBottom: '8px' }}>
          Orbis Health Overview
        </h1>
        <p style={{ color: '#6b7280', fontSize: '16px' }}>
          Monitor the status of core system integrations and SDLC control panel
        </p>
      </div>

      {/* Summary Row */}
      <div 
        data-testid="status-rollup"
        style={{ 
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#1f2937' }}>
            {stats.working} of {stats.total} integrations operational
          </div>
          <div style={{ color: '#6b7280', fontSize: '14px' }}>
            {stats.percentage}% system health
          </div>
        </div>
        <div style={{ 
          fontSize: '48px', 
          fontWeight: '700',
          color: stats.percentage >= 80 ? '#15803d' : stats.percentage >= 60 ? '#d97706' : '#dc2626'
        }}>
          {stats.percentage}%
        </div>
      </div>

      {/* Filters */}
      <div style={{ 
        display: 'flex', 
        gap: '16px', 
        marginBottom: '24px', 
        alignItems: 'center',
        flexWrap: 'wrap' as const
      }}>
        <select 
          data-testid="status-filter"
          value={statusFilter} 
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ 
            padding: '8px 12px', 
            border: '1px solid #d1d5db', 
            borderRadius: '6px',
            backgroundColor: 'white',
            fontSize: '14px'
          }}
        >
          <option value="all">All Status</option>
          <option value={IntegrationStatus.Working}>Working</option>
          <option value={IntegrationStatus.Degraded}>Degraded</option>
          <option value={IntegrationStatus.Broken}>Broken</option>
        </select>

        <select 
          data-testid="category-filter"
          value={categoryFilter} 
          onChange={(e) => setCategoryFilter(e.target.value)}
          style={{ 
            padding: '8px 12px', 
            border: '1px solid #d1d5db', 
            borderRadius: '6px',
            backgroundColor: 'white',
            fontSize: '14px'
          }}
        >
          <option value="all">All Categories</option>
          {Object.values(IntegrationCategory).map(category => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>

        <button 
          data-testid="refresh-button"
          onClick={handleRefresh}
          disabled={isRefreshing}
          style={{ 
            padding: '8px 16px', 
            backgroundColor: isRefreshing ? '#9ca3af' : '#3b82f6', 
            color: 'white', 
            border: 'none', 
            borderRadius: '6px',
            cursor: isRefreshing ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          {isRefreshing ? 'Refreshing...' : 'Refresh All'}
        </button>
      </div>

      {/* Integration List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filteredIntegrations.map((integration) => (
          <div 
            key={integration.name}
            data-testid={`integration-item-${integration.name}`}
            style={{ 
              backgroundColor: 'white',
              border: '1px solid #e5e7eb', 
              borderRadius: '8px',
              padding: '20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
              {/* Name and Category */}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937', marginBottom: '4px' }}>
                  {integration.name}
                </div>
                <div style={getCategoryChipStyle()}>
                  {integration.category}
                </div>
              </div>

              {/* Status Badge */}
              <div 
                data-testid={`status-badge-${integration.name}`}
                style={getStatusBadgeStyle(integration.status)}
              >
                {integration.status}
              </div>

              {/* Last Checked */}
              <div 
                data-testid={`last-checked-${integration.name}`}
                style={{ 
                  fontSize: '14px', 
                  color: '#6b7280',
                  minWidth: '120px',
                  textAlign: 'right' as const
                }}
              >
                {formatLastChecked(integration.lastChecked)}
              </div>
            </div>
            
            {/* Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: '16px' }}>
              {integration.logURL && (
                <a 
                  data-testid={`log-link-${integration.name}`}
                  href={integration.logURL}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ 
                    color: '#3b82f6', 
                    textDecoration: 'none',
                    fontSize: '14px',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    border: '1px solid #3b82f6',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = '#3b82f6';
                    e.currentTarget.style.color = 'white';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#3b82f6';
                  }}
                >
                  📋 Logs
                </a>
              )}
              
              <button
                onClick={() => runHealthCheck(integration.name)}
                style={{
                  padding: '4px 8px',
                  fontSize: '12px',
                  backgroundColor: '#f3f4f6',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  color: '#374151'
                }}
              >
                Check
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredIntegrations.length === 0 && (
        <div style={{ 
          textAlign: 'center', 
          padding: '60px 20px', 
          color: '#6b7280',
          backgroundColor: '#f9fafb',
          borderRadius: '8px',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ fontSize: '18px', marginBottom: '8px' }}>No integrations found</div>
          <div style={{ fontSize: '14px' }}>Try adjusting your filters to see more results.</div>
        </div>
      )}
    </div>
  );
};