import React from 'react';
import { Circle, Activity, CheckCircle, AlertCircle } from 'lucide-react';

interface SubApp {
  id: string;
  name: string;
  status: 'active' | 'deploying' | 'offline' | 'maintenance';
  icon: string;
  description: string;
  agentEnabled?: boolean;
  healthStatus?: 'healthy' | 'degraded' | 'error';
}

interface SubAppsSectionProps {
  subApps: SubApp[];
  isAdminMode?: boolean;
  onSubAppSelect?: (subAppId: string) => void;
  selectedSubApp?: string;
}

export const SubAppsSection: React.FC<SubAppsSectionProps> = ({
  subApps,
  isAdminMode = false,
  onSubAppSelect,
  selectedSubApp
}) => {
  const getStatusIcon = (status: SubApp['status'], healthStatus?: SubApp['healthStatus']) => {
    switch (status) {
      case 'active':
        if (healthStatus === 'healthy') return <CheckCircle size={12} className="text-green-500" />;
        if (healthStatus === 'degraded') return <AlertCircle size={12} className="text-yellow-500" />;
        if (healthStatus === 'error') return <AlertCircle size={12} className="text-red-500" />;
        return <Circle size={12} className="text-green-500 fill-current" />;
      case 'deploying':
        return <Activity size={12} className="text-blue-500 animate-pulse" />;
      case 'offline':
        return <Circle size={12} className="text-gray-400" />;
      case 'maintenance':
        return <AlertCircle size={12} className="text-orange-500" />;
      default:
        return <Circle size={12} className="text-gray-400" />;
    }
  };

  const getStatusText = (status: SubApp['status']) => {
    switch (status) {
      case 'active': return 'Active';
      case 'deploying': return 'Deploying';
      case 'offline': return 'Offline';
      case 'maintenance': return 'Maintenance';
      default: return 'Unknown';
    }
  };

  const getSubAppThemeColor = (subAppId: string) => {
    const themeColors: Record<string, string> = {
      'orbis-intelligence': 'border-l-purple-500 bg-purple-50 hover:bg-purple-100',
      'complize': 'border-l-red-500 bg-red-50 hover:bg-red-100',
      'meta-platform': 'border-l-green-500 bg-green-50 hover:bg-green-100',
      'spqr': 'border-l-amber-500 bg-amber-50 hover:bg-amber-100'
    };
    
    if (isAdminMode) {
      return 'border-l-gray-500 bg-gray-700 hover:bg-gray-600 text-white';
    }
    
    return themeColors[subAppId] || 'border-l-blue-500 bg-blue-50 hover:bg-blue-100';
  };

  return (
    <div className="space-y-2">
      {subApps.map((subApp) => (
        <button
          key={subApp.id}
          onClick={() => onSubAppSelect?.(subApp.id)}
          className={`w-full text-left p-3 rounded-lg border-l-4 transition-all ${
            selectedSubApp === subApp.id
              ? isAdminMode 
                ? 'bg-gray-600 border-l-red-500' 
                : 'bg-blue-100 border-l-blue-600'
              : getSubAppThemeColor(subApp.id)
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-lg">{subApp.icon}</span>
              <div className="flex-1">
                <div className={`font-medium text-sm ${
                  isAdminMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {subApp.name}
                </div>
                <div className={`text-xs ${
                  isAdminMode ? 'text-gray-300' : 'text-gray-600'
                }`}>
                  {subApp.description}
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end space-y-1">
              <div className="flex items-center space-x-1">
                {getStatusIcon(subApp.status, subApp.healthStatus)}
                <span className={`text-xs ${
                  isAdminMode ? 'text-gray-300' : 'text-gray-600'
                }`}>
                  {getStatusText(subApp.status)}
                </span>
              </div>
              {subApp.agentEnabled && (
                <div className={`text-xs px-2 py-1 rounded-full ${
                  isAdminMode 
                    ? 'bg-gray-600 text-gray-200' 
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  AI Agent
                </div>
              )}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
};

export default SubAppsSection;