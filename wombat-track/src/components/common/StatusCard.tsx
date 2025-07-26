import React from 'react';
import { AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react';

export interface StatusCardProps {
  title: string;
  status: 'success' | 'warning' | 'error' | 'info' | 'in_progress';
  value?: string | number;
  description?: string;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  onClick?: () => void;
  className?: string;
  testId?: string;
}

const STATUS_STYLES = {
  success: {
    cssClass: 'wt-status-success',
    iconColor: 'var(--wt-success-600)',
    valueColor: 'var(--wt-success-700)'
  },
  warning: {
    cssClass: 'wt-status-warning',
    iconColor: 'var(--wt-warning-600)',
    valueColor: 'var(--wt-warning-700)'
  },
  error: {
    cssClass: 'wt-status-error',
    iconColor: 'var(--wt-error-600)',
    valueColor: 'var(--wt-error-700)'
  },
  info: {
    cssClass: 'wt-status-info',
    iconColor: 'var(--wt-primary-600)',
    valueColor: 'var(--wt-primary-700)'
  },
  in_progress: {
    cssClass: 'wt-status-info',
    iconColor: 'var(--wt-primary-600)',
    valueColor: 'var(--wt-primary-700)'
  }
};

const STATUS_ICONS = {
  success: CheckCircle,
  warning: AlertCircle,
  error: XCircle,
  info: AlertCircle,
  in_progress: Clock
};

export const StatusCard: React.FC<StatusCardProps> = ({
  title,
  status,
  value,
  description,
  trend,
  trendValue,
  onClick,
  className = '',
  testId
}) => {
  const styles = STATUS_STYLES[status];
  const IconComponent = STATUS_ICONS[status];

  const getTrendIcon = () => {
    if (!trend) return null;
    switch (trend) {
      case 'up':
        return <span style={{ color: 'var(--wt-success-600)' }}>↗</span>;
      case 'down':
        return <span style={{ color: 'var(--wt-error-600)' }}>↘</span>;
      case 'stable':
        return <span style={{ color: 'var(--wt-neutral-500)' }}>→</span>;
      default:
        return null;
    }
  };

  return (
    <div
      className={`wt-card ${styles.cssClass} ${
        onClick ? 'wt-interactive wt-focus-ring' : ''
      } ${className} wt-animate-fade-in`}
      style={{ 
        padding: 'var(--wt-space-5)'
      }}
      onClick={onClick}
      data-testid={testId}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      } : undefined}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center mb-2" style={{ gap: 'var(--wt-space-2)' }}>
            <IconComponent 
              className="w-4 h-4" 
              style={{ color: styles.iconColor }}
            />
            <h3 className="wt-caption">{title}</h3>
          </div>
          
          {value && (
            <div 
              className="wt-heading-3 mb-2"
              style={{ color: styles.valueColor }}
            >
              {value}
            </div>
          )}
          
          {description && (
            <p className="wt-body-small mb-3">
              {description}
            </p>
          )}
          
          {trend && trendValue && (
            <div className="flex items-center wt-caption" style={{ gap: 'var(--wt-space-1)' }}>
              {getTrendIcon()}
              <span>{trendValue}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};