import React from 'react';
import { Settings, Database, Activity, BarChart3, GitBranch } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { WorkSurface } from './AppLayout';

interface SystemSurfacesSectionProps {
  selectedSurface: WorkSurface;
  collapsed?: boolean;
  onSurfaceChange: (surface: WorkSurface) => void;
}

type SystemSurface = 'integrate' | 'spqr-runtime' | 'admin';

const SYSTEM_SURFACES: { 
  id: SystemSurface; 
  label: string; 
  icon: string; 
  description: string;
  color: string;
  status?: 'operational' | 'maintenance' | 'warning';
}[] = [
  { 
    id: 'integrate', 
    label: 'Integration Monitoring', 
    icon: '🧬', 
    description: 'Integration health monitoring',
    color: 'text-cyan-600',
    status: 'operational'
  },
  { 
    id: 'spqr-runtime', 
    label: 'SPQR Runtime', 
    icon: '📊', 
    description: 'Live SPQR dashboards with UAT mode',
    color: 'text-indigo-600',
    status: 'operational'
  },
  { 
    id: 'admin', 
    label: 'Admin Dashboard', 
    icon: '🔧', 
    description: 'Data Explorer, Import/Export, Runtime Panel',
    color: 'text-slate-600',
    status: 'operational'
  }
];

export const SystemSurfacesSection: React.FC<SystemSurfacesSectionProps> = ({
  selectedSurface,
  collapsed = false,
  onSurfaceChange
}) => {
  const navigate = useNavigate();
  
  const handleSystemSurfaceClick = (surfaceId: SystemSurface) => {
    // Use React Router navigation instead of state-based surface switching
    navigate(`/orbis/${surfaceId}`);
    
    // Still call onSurfaceChange for any parent components that need state updates
    onSurfaceChange(surfaceId);
  };
  
  const isSystemSurface = (surface: WorkSurface): surface is SystemSurface => {
    return SYSTEM_SURFACES.some(s => s.id === surface);
  };

  const getSystemStatus = () => {
    const operational = SYSTEM_SURFACES.filter(s => s.status === 'operational').length;
    const maintenance = SYSTEM_SURFACES.filter(s => s.status === 'maintenance').length;
    const warning = SYSTEM_SURFACES.filter(s => s.status === 'warning').length;
    
    return { operational, maintenance, warning, total: SYSTEM_SURFACES.length };
  };

  const systemStatus = getSystemStatus();

  if (collapsed) {
    return (
      <div className="p-2 border-b border-gray-200">
        <div className="flex flex-col items-center space-y-2">
          <Settings className="w-5 h-5 text-gray-600" title="System Surfaces" />
          <div className="flex flex-col space-y-1">
            {SYSTEM_SURFACES.map((surface) => (
              <button
                key={surface.id}
                onClick={() => handleSystemSurfaceClick(surface.id)}
                className={`w-8 h-8 flex items-center justify-center rounded-md transition-colors ${
                  selectedSurface === surface.id
                    ? 'bg-slate-100 text-slate-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                title={surface.label}
              >
                <span className="text-sm">{surface.icon}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 border-b border-gray-200">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Settings className="w-5 h-5 text-gray-600" />
          <h3 className="text-sm font-semibold text-gray-900">System Surfaces</h3>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 bg-green-500 rounded-full" title={`${systemStatus.operational} operational`} />
          {systemStatus.warning > 0 && (
            <div className="w-2 h-2 bg-amber-500 rounded-full" title={`${systemStatus.warning} warnings`} />
          )}
          {systemStatus.maintenance > 0 && (
            <div className="w-2 h-2 bg-blue-500 rounded-full" title={`${systemStatus.maintenance} maintenance`} />
          )}
        </div>
      </div>

      {/* System Status Summary */}
      <div className="flex items-center space-x-3 mb-4 text-xs">
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 bg-green-500 rounded-full" />
          <span className="text-green-700">{systemStatus.operational} Operational</span>
        </div>
        {systemStatus.warning > 0 && (
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-amber-500 rounded-full" />
            <span className="text-amber-700">{systemStatus.warning} Warning</span>
          </div>
        )}
      </div>

      {/* System Surfaces */}
      <div className="space-y-1">
        {SYSTEM_SURFACES.map((surface) => {
          const isSelected = selectedSurface === surface.id;
          
          return (
            <button
              key={surface.id}
              data-testid={`system-surface-${surface.id}`}
              onClick={() => handleSystemSurfaceClick(surface.id)}
              className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 ${
                isSelected
                  ? 'bg-gray-100 text-gray-700 border border-gray-200 shadow-sm'
                  : 'text-gray-700 hover:bg-gray-50 border border-transparent'
              }`}
            >
              <span className={`text-lg ${isSelected ? 'scale-110' : ''} transition-transform`}>
                {surface.icon}
              </span>
              <div className="flex-1 text-left">
                <div className={`font-medium ${isSelected ? 'text-gray-700' : 'text-gray-900'}`}>
                  {surface.label}
                </div>
                <div className={`text-xs ${isSelected ? 'text-gray-600' : 'text-gray-500'}`}>
                  {surface.description}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {surface.status && (
                  <div className={`w-2 h-2 rounded-full ${
                    surface.status === 'operational' ? 'bg-green-400' :
                    surface.status === 'warning' ? 'bg-amber-400' : 'bg-blue-400'
                  }`} title={`Status: ${surface.status}`} />
                )}
                {isSelected && (
                  <div className="w-2 h-2 bg-gray-500 rounded-full" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Cross-System Context Hint */}
      {isSystemSurface(selectedSurface) && (
        <div className="mt-3 p-2 bg-gray-50 rounded-md border border-gray-200">
          <div className="text-xs text-gray-600 text-center">
            <span className="font-medium">
              {SYSTEM_SURFACES.find(s => s.id === selectedSurface)?.label}
            </span>
            {' '}operates at{' '}
            <span className="font-medium text-gray-900">
              platform level
            </span>
          </div>
        </div>
      )}

      {/* System Quick Actions */}
      <div className="mt-4 pt-3 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-2">
          <button 
            className="text-xs text-gray-600 hover:text-gray-700 py-1 px-2 border border-gray-200 rounded hover:bg-gray-50 transition-colors"
            onClick={() => {
              // Navigate to admin surface for system health
              handleSystemSurfaceClick('admin');
            }}
          >
            System Health
          </button>
          <button 
            className="text-xs text-gray-600 hover:text-gray-700 py-1 px-2 border border-gray-200 rounded hover:bg-gray-50 transition-colors"
            onClick={() => {
              // Navigate to SPQR runtime for monitoring
              handleSystemSurfaceClick('spqr-runtime');
            }}
          >
            Monitor All
          </button>
        </div>
      </div>

      {/* Integration Status Mini-Panel */}
      <div className="mt-3 p-2 bg-white rounded-md border border-gray-200">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <GitBranch className="w-3 h-3 text-cyan-600" />
            <span className="text-gray-700">Integrations</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-green-600">12 active</span>
            <div className="w-1 h-1 bg-green-500 rounded-full" />
          </div>
        </div>
        <div className="mt-1 text-xs text-gray-500">
          All systems synchronized
        </div>
      </div>
    </div>
  );
};