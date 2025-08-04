import React, { useState, useEffect } from 'react';
import { Rocket, RefreshCw, Settings, Eye } from 'lucide-react';
import type { SubAppStatusData } from './SubAppStatusBadge';
import { SubAppStatusBadge } from './SubAppStatusBadge';
import { StatusAPI } from '../../services/statusAPI';

interface OperatingSubAppsSectionProps {
  collapsed?: boolean;
  onSubAppClick?: (subApp: SubAppStatusData) => void;
  onSubAppStatusClick?: (subApp: SubAppStatusData) => void;
  onSurfaceChange?: (surface: string) => void;
}

export const OperatingSubAppsSection: React.FC<OperatingSubAppsSectionProps> = ({
  collapsed = false,
  onSubAppClick,
  onSubAppStatusClick,
  onSurfaceChange
}) => {
  const [subApps, setSubApps] = useState<SubAppStatusData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Mock sub-app data - in real implementation, fetch from API
  // const _mockSubApps: SubAppStatusData[] = [
  //   {
  //     id: 'prog-orbis-001',
  //     name: 'Orbis Intelligence',
  //     status: 'active',
  //     lastUpdated: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago
  //     uptime: '99.8%',
  //     healthScore: 95,
  //     activeUsers: 23,
  //     url: 'https://orbis.complize.com',
  //     description: 'Core program for recursive AI-native development and Sub-App orchestration; 3D printer engine for SDLC and governance.',
  //     version: 'v2.1.3'
  //   },
  //   {
  //     id: 'prog-complize-001',
  //     name: 'Complize Platform',
  //     status: 'warning',
  //     lastUpdated: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
  //     uptime: '98.2%',
  //     healthScore: 72,
  //     activeUsers: 8,
  //     url: 'https://app.complize.com',
  //     description: 'Compliance suite Sub-App; includes Visa Management, Knowledge Base, and RAG/Compliance Tracker modules.',
  //     version: 'v1.8.2'
  //   },
  //   {
  //     id: 'prog-spqr-001',
  //     name: 'SPQR',
  //     status: 'offline',
  //     lastUpdated: new Date(Date.now() - 45 * 60 * 1000), // 45 minutes ago
  //     uptime: '89.1%',
  //     healthScore: 0,
  //     activeUsers: 0,
  //     url: 'https://spqr.internal.com',
  //     description: 'Sub-App for reporting and Looker Studio integration within Orbis Intelligence ecosystem.',
  //     version: 'v3.0.1'
  //   },
  //   {
  //     id: 'prog-roam-001',
  //     name: 'Roam',
  //     status: 'active',
  //     lastUpdated: new Date(Date.now() - 1 * 60 * 1000), // 1 minute ago
  //     uptime: '99.9%',
  //     healthScore: 98,
  //     activeUsers: 156,
  //     url: 'https://roam.complize.com',
  //     description: 'Formerly VisaCalcPro; business migration planning and visa calculation tool.',
  //     version: 'v4.2.0'
  //   }
  // ];

  // Fetch live status using StatusAPI
  useEffect(() => {
    const fetchSubAppStatus = async () => {
      setIsLoading(true);
      try {
        const statusData = await StatusAPI.fetchSubAppStatus();
        setSubApps(statusData);
        setLastRefresh(new Date());
      } catch (error) {
        console.error('Failed to fetch sub-app status:', error);
        // StatusAPI handles fallback to mock data internally
        setSubApps([]);
      } finally {
        setIsLoading(false);
      }
    };

    // Initial fetch
    fetchSubAppStatus();
    
    // Set up real-time updates via WebSocket or polling
    const cleanup = StatusAPI.subscribeToStatusUpdates(
      (statusData) => {
        setSubApps(statusData);
        setLastRefresh(new Date());
      },
      (error) => {
        console.error('Real-time status update error:', error);
      }
    );
    
    return cleanup;
  }, []);

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      const statusData = await StatusAPI.fetchSubAppStatus();
      setSubApps(statusData);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Manual refresh failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusSummary = () => {
    const active = subApps.filter(app => app.status === 'active').length;
    const warning = subApps.filter(app => app.status === 'warning').length;
    const offline = subApps.filter(app => app.status === 'offline').length;
    
    return { active, warning, offline, total: subApps.length };
  };

  const statusSummary = getStatusSummary();

  if (collapsed) {
    return (
      <div className="p-2 border-b border-gray-200">
        <div className="flex flex-col items-center space-y-2">
          <Rocket className="w-5 h-5 text-gray-600" title="Operating Sub-Apps" />
          <div className="flex flex-col items-center space-y-1">
            {statusSummary.active > 0 && (
              <div className="w-2 h-2 bg-green-500 rounded-full" title={`${statusSummary.active} active`} />
            )}
            {statusSummary.warning > 0 && (
              <div className="w-2 h-2 bg-amber-500 rounded-full" title={`${statusSummary.warning} warnings`} />
            )}
            {statusSummary.offline > 0 && (
              <div className="w-2 h-2 bg-red-500 rounded-full" title={`${statusSummary.offline} offline`} />
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 border-b border-gray-200 bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Rocket className="w-5 h-5 text-blue-600" />
          <h3 className="text-sm font-semibold text-gray-900">Operating Sub-Apps</h3>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            title="Refresh status"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            title="Configure sub-apps"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Status Summary */}
      <div className="flex items-center space-x-4 mb-3 text-xs">
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 bg-green-500 rounded-full" />
          <span className="text-green-700">{statusSummary.active} Active</span>
        </div>
        {statusSummary.warning > 0 && (
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-amber-500 rounded-full" />
            <span className="text-amber-700">{statusSummary.warning} Warning</span>
          </div>
        )}
        {statusSummary.offline > 0 && (
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-red-500 rounded-full" />
            <span className="text-red-700">{statusSummary.offline} Offline</span>
          </div>
        )}
        <div className="text-gray-500 ml-auto">
          {statusSummary.total} total
        </div>
      </div>

      {/* Last Refresh Time */}
      <div className="text-xs text-gray-500 mb-3">
        Last updated: {lastRefresh.toLocaleTimeString()}
      </div>

      {/* Sub-App Status List */}
      <div className="space-y-2">
        {isLoading && subApps.length === 0 ? (
          <div className="flex items-center justify-center py-4">
            <RefreshCw className="w-4 h-4 animate-spin text-gray-400 mr-2" />
            <span className="text-sm text-gray-500">Loading sub-apps...</span>
          </div>
        ) : subApps.length === 0 ? (
          <div className="flex items-center justify-center py-4">
            <Eye className="w-4 h-4 text-gray-400 mr-2" />
            <span className="text-sm text-gray-500">No sub-apps found</span>
          </div>
        ) : (
          subApps.map((subApp) => (
            <SubAppStatusBadge
              key={subApp.id}
              subApp={subApp}
              onClick={onSubAppClick}
              onStatusClick={onSubAppStatusClick}
              compact={true}
              showActions={true}
            />
          ))
        )}
      </div>

      {/* Action Buttons */}
      <div className="mt-3 pt-3 border-t border-gray-200">
        <div className="flex space-x-2">
          <button 
            className="flex-1 text-xs text-blue-600 hover:text-blue-700 py-1 px-2 border border-blue-200 rounded hover:bg-blue-50 transition-colors"
            onClick={() => {
              // Navigate to admin surface instead of non-existent route
              onSurfaceChange?.('admin');
            }}
          >
            System Dashboard
          </button>
          <button 
            className="flex-1 text-xs text-gray-600 hover:text-gray-700 py-1 px-2 border border-gray-200 rounded hover:bg-gray-50 transition-colors"
            onClick={() => {
              // Navigate to admin surface for monitoring
              onSurfaceChange?.('spqr-runtime');
            }}
          >
            Monitor All
          </button>
        </div>
      </div>
    </div>
  );
};