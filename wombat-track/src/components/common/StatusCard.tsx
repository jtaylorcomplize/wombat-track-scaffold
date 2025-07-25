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
    bg: 'bg-green-50',
    border: 'border-green-200',
    icon: 'text-green-500',
    title: 'text-green-900',
    value: 'text-green-700'
  },
  warning: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    icon: 'text-amber-500',
    title: 'text-amber-900',
    value: 'text-amber-700'
  },
  error: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    icon: 'text-red-500',
    title: 'text-red-900',
    value: 'text-red-700'
  },
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    icon: 'text-blue-500',
    title: 'text-blue-900',
    value: 'text-blue-700'
  },
  in_progress: {
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    icon: 'text-purple-500',
    title: 'text-purple-900',
    value: 'text-purple-700'
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
        return <span className="text-green-500">↗</span>;
      case 'down':
        return <span className="text-red-500">↘</span>;
      case 'stable':
        return <span className="text-gray-500">→</span>;
      default:
        return null;
    }
  };

  return (
    <div
      className={`p-4 rounded-lg border-2 transition-all duration-200 ${
        styles.bg
      } ${styles.border} ${
        onClick ? 'cursor-pointer hover:shadow-md hover:scale-105' : ''
      } ${className}`}
      onClick={onClick}
      data-testid={testId}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            <IconComponent className={`w-4 h-4 ${styles.icon}`} />
            <h3 className={`text-sm font-medium ${styles.title}`}>{title}</h3>
          </div>
          
          {value && (
            <div className={`text-2xl font-bold ${styles.value} mb-1`}>
              {value}
            </div>
          )}
          
          {description && (
            <p className="text-sm text-gray-600 mb-2">
              {description}
            </p>
          )}
          
          {trend && trendValue && (
            <div className="flex items-center space-x-1 text-xs">
              {getTrendIcon()}
              <span className="text-gray-600">{trendValue}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};