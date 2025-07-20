import React, { useState } from 'react';

interface Integration {
  name: string;
  status: 'healthy' | 'warning' | 'error' | 'unknown';
  category: 'api' | 'database' | 'service' | 'monitoring';
  lastChecked: Date;
  logUrl?: string;
}

interface OrbisDashboardProps {
  onHealthCheck?: () => void;
}

const mockIntegrations: Integration[] = [
  {
    name: 'payments-api',
    status: 'healthy',
    category: 'api',
    lastChecked: new Date(Date.now() - 5 * 60 * 1000),
    logUrl: 'https://logs.example.com/payments-api'
  },
  {
    name: 'user-database',
    status: 'warning',
    category: 'database',
    lastChecked: new Date(Date.now() - 10 * 60 * 1000),
    logUrl: 'https://logs.example.com/user-database'
  },
  {
    name: 'notification-service',
    status: 'error',
    category: 'service',
    lastChecked: new Date(Date.now() - 2 * 60 * 1000)
  },
  {
    name: 'monitoring-dashboard',
    status: 'healthy',
    category: 'monitoring',
    lastChecked: new Date(Date.now() - 1 * 60 * 1000),
    logUrl: 'https://logs.example.com/monitoring'
  }
];

export const OrbisDashboard: React.FC<OrbisDashboardProps> = ({ onHealthCheck }) => {
  const [integrations, setIntegrations] = useState<Integration[]>(mockIntegrations);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const filteredIntegrations = integrations.filter(integration => {
    const statusMatch = statusFilter === 'all' || integration.status === statusFilter;
    const categoryMatch = categoryFilter === 'all' || integration.category === categoryFilter;
    return statusMatch && categoryMatch;
  });

  const getStatusCounts = () => {
    const counts = integrations.reduce((acc, integration) => {
      acc[integration.status] = (acc[integration.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return counts;
  };

  const handleRefresh = () => {
    if (onHealthCheck) {
      onHealthCheck();
    }
    setIntegrations([...integrations]);
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

  const statusCounts = getStatusCounts();

  return (
    <div data-testid="orbis-dashboard-page" style={{ padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1>Orbis Dashboard</h1>
        <p>Monitor integration status and health metrics</p>
      </div>

      <div data-testid="status-rollup" style={{ 
        display: 'flex', 
        gap: '16px', 
        marginBottom: '24px',
        padding: '16px',
        backgroundColor: '#f8fafc',
        borderRadius: '8px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#22c55e' }}>
            {statusCounts.healthy || 0}
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>Healthy</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>
            {statusCounts.warning || 0}
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>Warning</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ef4444' }}>
            {statusCounts.error || 0}
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>Error</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#6b7280' }}>
            {integrations.length}
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>Total</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', alignItems: 'center' }}>
        <select 
          data-testid="status-filter"
          value={statusFilter} 
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ 
            padding: '8px 12px', 
            border: '1px solid #d1d5db', 
            borderRadius: '6px',
            backgroundColor: 'white'
          }}
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
          style={{ 
            padding: '8px 12px', 
            border: '1px solid #d1d5db', 
            borderRadius: '6px',
            backgroundColor: 'white'
          }}
        >
          <option value="all">All Categories</option>
          <option value="api">API</option>
          <option value="database">Database</option>
          <option value="service">Service</option>
          <option value="monitoring">Monitoring</option>
        </select>

        <button 
          data-testid="refresh-button"
          onClick={handleRefresh}
          style={{ 
            padding: '8px 16px', 
            backgroundColor: '#3b82f6', 
            color: 'white', 
            border: 'none', 
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          Refresh
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filteredIntegrations.map((integration) => (
          <div 
            key={integration.name}
            data-testid={`integration-item-${integration.name}`}
            style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              padding: '16px', 
              backgroundColor: 'white',
              border: '1px solid #e5e7eb', 
              borderRadius: '8px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span 
                data-testid={`status-badge-${integration.name}`}
                style={{ 
                  width: '12px', 
                  height: '12px', 
                  borderRadius: '50%', 
                  backgroundColor: getStatusBadgeColor(integration.status)
                }}
              />
              <div>
                <div style={{ fontWeight: '600' }}>{integration.name}</div>
                <div style={{ fontSize: '14px', color: '#6b7280', textTransform: 'capitalize' }}>
                  {integration.category}
                </div>
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div 
                data-testid={`last-checked-${integration.name}`}
                style={{ fontSize: '14px', color: '#6b7280' }}
              >
                {formatLastChecked(integration.lastChecked)}
              </div>
              
              {integration.logUrl && (
                <a 
                  data-testid={`log-link-${integration.name}`}
                  href={integration.logUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ 
                    color: '#3b82f6', 
                    textDecoration: 'none',
                    fontSize: '14px'
                  }}
                >
                  📋 Logs
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredIntegrations.length === 0 && (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px', 
          color: '#6b7280' 
        }}>
          No integrations match the current filters.
        </div>
      )}
    </div>
  );
};