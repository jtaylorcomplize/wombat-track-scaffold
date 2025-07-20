import React from 'react';
import type { Integration } from '../../types/integration';
import { IntegrationStatus, DispatchStatus } from '../../types/integration';

interface IntegrationCardProps {
  integration: Integration;
  onHealthCheck?: (integrationId: string) => void;
  onLogClick?: (logURL: string) => void;
  onDispatch?: (integrationId: string) => void;
  dispatchStatus?: DispatchStatus;
}

export const IntegrationCard: React.FC<IntegrationCardProps> = ({ 
  integration, 
  onHealthCheck,
  onLogClick,
  onDispatch,
  dispatchStatus = DispatchStatus.Idle
}) => {
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

  const getDispatchStatusBadgeStyle = (status: DispatchStatus) => {
    const baseStyle = {
      padding: '2px 6px',
      borderRadius: '8px',
      fontSize: '10px',
      fontWeight: '600',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.5px',
      marginLeft: '4px'
    };

    switch (status) {
      case DispatchStatus.Queued:
        return { ...baseStyle, backgroundColor: '#fef3c7', color: '#d97706' };
      case DispatchStatus.Done:
        return { ...baseStyle, backgroundColor: '#dcfce7', color: '#15803d' };
      case DispatchStatus.Idle:
      default:
        return { ...baseStyle, backgroundColor: '#f3f4f6', color: '#6b7280' };
    }
  };

  const handleLogClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (integration.logURL) {
      if (onLogClick) {
        onLogClick(integration.logURL);
      } else {
        window.open(integration.logURL, '_blank', 'noopener,noreferrer');
      }
    }
  };

  const handleHealthCheck = () => {
    if (onHealthCheck) {
      onHealthCheck(integration.name);
    }
  };

  const handleDispatch = () => {
    if (onDispatch && integration.isActive) {
      onDispatch(integration.name);
    }
  };

  return (
    <div 
      data-testid={`integration-item-${integration.name}`}
      style={{ 
        backgroundColor: 'white',
        border: '1px solid #e5e7eb', 
        borderRadius: '8px',
        padding: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        transition: 'box-shadow 0.2s',
        cursor: 'default'
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
        {/* Name and Category */}
        <div style={{ flex: 1 }}>
          <div style={{ 
            fontSize: '16px', 
            fontWeight: '600', 
            color: '#1f2937', 
            marginBottom: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            {integration.name}
            {!integration.isActive && (
              <span style={{ 
                fontSize: '10px', 
                color: '#dc2626', 
                backgroundColor: '#fee2e2',
                padding: '2px 4px',
                borderRadius: '2px'
              }}>
                INACTIVE
              </span>
            )}
          </div>
          <div style={getCategoryChipStyle()}>
            {integration.category}
          </div>
          <div 
            data-testid={`template-label-${integration.name}`}
            style={{ 
              fontSize: '12px', 
              color: '#6b7280', 
              marginTop: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            📦 Template: {integration.templateName}
            {integration.templateId && (
              <button
                data-testid={`template-view-${integration.name}`}
                onClick={() => console.log(`View template: ${integration.templateId}`)}
                style={{
                  fontSize: '10px',
                  color: '#3b82f6',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  marginLeft: '4px'
                }}
              >
                🔍 View
              </button>
            )}
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
          <button
            data-testid={`log-link-${integration.name}`}
            onClick={handleLogClick}
            style={{ 
              color: '#3b82f6', 
              backgroundColor: 'transparent',
              border: '1px solid #3b82f6',
              fontSize: '14px',
              padding: '4px 8px',
              borderRadius: '4px',
              cursor: 'pointer',
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
          </button>
        )}
        
        <button
          onClick={handleHealthCheck}
          style={{
            padding: '4px 8px',
            fontSize: '12px',
            backgroundColor: '#f3f4f6',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            cursor: 'pointer',
            color: '#374151',
            transition: 'all 0.2s'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = '#e5e7eb';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = '#f3f4f6';
          }}
        >
          Check
        </button>

        <div style={{ display: 'flex', alignItems: 'center' }}>
          <button
            data-testid={`dispatch-button-${integration.name}`}
            onClick={handleDispatch}
            disabled={!integration.isActive}
            style={{
              padding: '4px 8px',
              fontSize: '12px',
              backgroundColor: integration.isActive ? '#3b82f6' : '#f3f4f6',
              border: `1px solid ${integration.isActive ? '#3b82f6' : '#d1d5db'}`,
              borderRadius: '4px',
              cursor: integration.isActive ? 'pointer' : 'not-allowed',
              color: integration.isActive ? 'white' : '#9ca3af',
              transition: 'all 0.2s',
              opacity: integration.isActive ? 1 : 0.6
            }}
            onMouseOver={(e) => {
              if (integration.isActive) {
                e.currentTarget.style.backgroundColor = '#2563eb';
              }
            }}
            onMouseOut={(e) => {
              if (integration.isActive) {
                e.currentTarget.style.backgroundColor = '#3b82f6';
              }
            }}
          >
            Dispatch
          </button>
          
          <span 
            data-testid={`dispatch-status-${integration.name}`}
            style={getDispatchStatusBadgeStyle(dispatchStatus)}
          >
            {dispatchStatus}
          </span>
        </div>
      </div>
    </div>
  );
};