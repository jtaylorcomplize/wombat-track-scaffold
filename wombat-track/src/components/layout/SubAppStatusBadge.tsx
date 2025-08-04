import React, { useState } from 'react';
import { ExternalLink, Activity, Wifi, WifiOff, RefreshCw } from 'lucide-react';

export type SubAppStatus = 'active' | 'warning' | 'offline' | 'loading';

export interface SubAppStatusData {
  id: string;
  name: string;
  status: SubAppStatus;
  lastUpdated: Date;
  uptime?: string;
  healthScore?: number;
  activeUsers?: number;
  url?: string;
  description?: string;
  version?: string;
}

interface SubAppStatusBadgeProps {
  subApp: SubAppStatusData;
  onClick?: (subApp: SubAppStatusData) => void;
  onStatusClick?: (subApp: SubAppStatusData) => void;
  showActions?: boolean;
  compact?: boolean;
}

export const SubAppStatusBadge: React.FC<SubAppStatusBadgeProps> = ({
  subApp,
  onClick,
  onStatusClick,
  showActions = true,
  compact = false
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const getStatusConfig = (status: SubAppStatus) => {
    switch (status) {
      case 'active':
        return {
          icon: '🟢',
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          label: 'Active'
        };
      case 'warning':
        return {
          icon: '🟡',
          color: 'text-amber-600',
          bgColor: 'bg-amber-50',
          borderColor: 'border-amber-200',
          label: 'Warning'
        };
      case 'offline':
        return {
          icon: '🔴',
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          label: 'Offline'
        };
      case 'loading':
        return {
          icon: '⚪',
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          label: 'Loading'
        };
    }
  };

  const statusConfig = getStatusConfig(subApp.status);
  const formatLastUpdated = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const handleMainClick = () => {
    if (onClick) {
      onClick(subApp);
    } else if (subApp.url) {
      window.open(subApp.url, '_blank');
    }
  };

  const handleStatusClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onStatusClick) {
      onStatusClick(subApp);
    }
  };

  if (compact) {
    return (
      <div 
        className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-50 cursor-pointer transition-colors"
        onClick={handleMainClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        title={`${subApp.name} - ${statusConfig.label} (Updated: ${formatLastUpdated(subApp.lastUpdated)})`}
      >
        <span 
          className="text-sm cursor-pointer"
          onClick={handleStatusClick}
        >
          {statusConfig.icon}
        </span>
        <span className="text-sm font-medium text-gray-900 truncate">
          {subApp.name}
        </span>
        {isHovered && subApp.url && (
          <ExternalLink className="w-3 h-3 text-gray-400" />
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <div 
        className={`p-3 rounded-lg border transition-all duration-200 cursor-pointer ${statusConfig.bgColor} ${statusConfig.borderColor} hover:shadow-md`}
        onClick={handleMainClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <span 
                className="text-base cursor-pointer hover:scale-110 transition-transform"
                onClick={handleStatusClick}
                title={`Status: ${statusConfig.label}`}
              >
                {statusConfig.icon}
              </span>
              <h4 className="text-sm font-medium text-gray-900 truncate">
                {subApp.name}
              </h4>
              {subApp.url && (
                <ExternalLink className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </div>
            
            {subApp.description && (
              <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                {subApp.description}
              </p>
            )}

            <div className="flex items-center space-x-4 text-xs text-gray-500">
              <span className="flex items-center space-x-1">
                <Activity className="w-3 h-3" />
                <span>{statusConfig.label}</span>
              </span>
              <span>
                {formatLastUpdated(subApp.lastUpdated)}
              </span>
            </div>

            {/* Health metrics when active */}
            {subApp.status === 'active' && (subApp.healthScore || subApp.activeUsers || subApp.uptime) && (
              <div className="mt-2 pt-2 border-t border-gray-200">
                <div className="flex items-center space-x-3 text-xs text-gray-600">
                  {subApp.healthScore && (
                    <span className="flex items-center space-x-1">
                      <span className={`w-2 h-2 rounded-full ${
                        subApp.healthScore >= 80 ? 'bg-green-400' :
                        subApp.healthScore >= 60 ? 'bg-amber-400' : 'bg-red-400'
                      }`} />
                      <span>{subApp.healthScore}% health</span>
                    </span>
                  )}
                  {subApp.activeUsers && (
                    <span>{subApp.activeUsers} users</span>
                  )}
                  {subApp.uptime && (
                    <span>{subApp.uptime} uptime</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {showActions && isHovered && (
            <div className="flex flex-col space-y-1 ml-2">
              {subApp.status === 'active' ? (
                <Wifi className="w-4 h-4 text-green-600" title="Connected" />
              ) : (
                <WifiOff className="w-4 h-4 text-gray-400" title="Disconnected" />
              )}
              {subApp.status === 'loading' && (
                <RefreshCw className="w-4 h-4 text-gray-400 animate-spin" />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Hover tooltip with detailed status */}
      {isHovered && (
        <div className="absolute z-50 left-full ml-2 top-0 w-64 p-3 bg-white border border-gray-200 rounded-lg shadow-lg">
          <div className="text-sm">
            <div className="font-medium text-gray-900 mb-2">
              {subApp.name} Status
            </div>
            <div className="space-y-1 text-xs text-gray-600">
              <div className="flex justify-between">
                <span>Status:</span>
                <span className={statusConfig.color}>{statusConfig.label}</span>
              </div>
              <div className="flex justify-between">
                <span>Last Updated:</span>
                <span>{formatLastUpdated(subApp.lastUpdated)}</span>
              </div>
              {subApp.version && (
                <div className="flex justify-between">
                  <span>Version:</span>
                  <span>{subApp.version}</span>
                </div>
              )}
              {subApp.healthScore && (
                <div className="flex justify-between">
                  <span>Health Score:</span>
                  <span className={
                    subApp.healthScore >= 80 ? 'text-green-600' :
                    subApp.healthScore >= 60 ? 'text-amber-600' : 'text-red-600'
                  }>
                    {subApp.healthScore}%
                  </span>
                </div>
              )}
              {subApp.activeUsers && (
                <div className="flex justify-between">
                  <span>Active Users:</span>
                  <span>{subApp.activeUsers}</span>
                </div>
              )}
              {subApp.uptime && (
                <div className="flex justify-between">
                  <span>Uptime:</span>
                  <span>{subApp.uptime}</span>
                </div>
              )}
            </div>
            
            {showActions && (
              <div className="mt-3 pt-2 border-t border-gray-200">
                <div className="flex space-x-2">
                  {subApp.url && (
                    <button 
                      className="text-xs text-blue-600 hover:text-blue-700"
                      onClick={handleMainClick}
                    >
                      Open App
                    </button>
                  )}
                  <button 
                    className="text-xs text-gray-600 hover:text-gray-700"
                    onClick={handleStatusClick}
                  >
                    View Details
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};