import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Layers, Rocket, LayoutGrid, Users, Target, ExternalLink, Wifi, WifiOff, Settings, Database, Activity } from 'lucide-react';
import { useNavigationContext, NavigationLevel, StrategicSurface } from '../../contexts/NavigationContext';
import { useNavigate } from 'react-router-dom';
import { useSubAppStatus } from '../../hooks/useSubAppStatus';
import { useAccordionState } from '../../hooks/useAccordionState';
import { governanceLogger } from '../../services/enhancedGovernanceLogger';
import { useSubApps, useRuntimeStatus } from '../../hooks/useOrbisAPI';

interface EnhancedSidebarV3Props {
  collapsed: boolean;
  onToggleCollapse: () => void;
  navigationState: any;
}

// Strategic surfaces configuration
const STRATEGIC_SURFACES: {
  id: StrategicSurface;
  label: string;
  icon: React.ReactNode;
  description: string;
}[] = [
  {
    id: 'all-projects',
    label: 'All Projects',
    icon: <LayoutGrid className="w-5 h-5" />,
    description: 'View all projects across sub-apps'
  },
  {
    id: 'dashboard',
    label: 'Project Analytics',
    icon: <Layers className="w-5 h-5" />,
    description: 'Cross-platform analytics & insights'
  },
  {
    id: 'teams',
    label: 'Team Overview',
    icon: <Users className="w-5 h-5" />,
    description: 'Team allocation & performance'
  },
  {
    id: 'strategy',
    label: 'Strategic Planning',
    icon: <Target className="w-5 h-5" />,
    description: 'Roadmaps & strategic initiatives'
  }
];

// System surfaces configuration
const SYSTEM_SURFACES = [
  {
    id: 'admin',
    label: 'Admin Dashboard',
    icon: <Settings className="w-5 h-5" />,
    description: 'Data Explorer, Import/Export, Runtime Panel',
    subSurfaces: [
      { id: 'admin-data-explorer', label: 'Data Explorer', description: 'Explore and analyze system data' },
      { id: 'admin-import-export', label: 'Import/Export', description: 'Data import and export tools' },
      { id: 'admin-runtime-panel', label: 'Runtime Panel', description: 'System runtime monitoring' },
      { id: 'admin-orphan-inspector', label: 'Orphan Inspector', description: 'Find and manage orphaned data' },
      { id: 'admin-secrets-manager', label: 'Secrets Manager', description: 'Manage system secrets and keys' }
    ]
  },
  {
    id: 'integrate',
    label: 'Integration Monitoring',
    icon: <Database className="w-5 h-5" />,
    description: 'Integration health and connectivity status'
  },
  {
    id: 'spqr-runtime',
    label: 'SPQR Runtime',
    icon: <Activity className="w-5 h-5" />,
    description: 'Live SPQR dashboards with UAT mode'
  }
];

const DEFAULT_ACCORDION_STATE = {
  'strategic-surfaces': true,
  'sub-apps': true,
  'system-surfaces': false
};

export const EnhancedSidebarV3: React.FC<EnhancedSidebarV3Props> = ({
  collapsed,
  onToggleCollapse,
  navigationState
}) => {
  // Debug logging removed - was causing object conversion issues
  
  const { navigateToStrategic, navigateToSubApp } = useNavigationContext();
  const navigate = useNavigate();
  const { expandedSections, toggleSection } = useAccordionState(DEFAULT_ACCORDION_STATE);
  
  // Use real API data for sub-apps with live status
  const { 
    data: subApps, 
    loading: subAppsLoading, 
    refresh: refreshSubApps,
    isLive: subAppsLive
  } = useSubApps(true);
  
  // Debug logging removed - was causing object conversion issues
  
  // Get runtime status for live health indicators
  const { 
    data: runtimeStatus, 
    isLive: runtimeLive 
  } = useRuntimeStatus();

  const handleAccordionToggle = (sectionId: string) => {
    const willBeExpanded = !expandedSections[sectionId];
    const action = willBeExpanded ? 'expand' : 'collapse';
    
    // Enhanced governance logging with full context
    governanceLogger.logAccordionToggle(
      sectionId,
      action,
      Object.keys(expandedSections).filter(key => 
        key === sectionId ? willBeExpanded : expandedSections[key]
      )
    );
    
    toggleSection(sectionId);
  };

  const handleViewAllProjects = (subAppId: string, subAppName: string) => {
    const subApp = subApps?.find(s => s.id === subAppId);
    const projectCount = subApp?.projects?.total || 0;
    
    // Enhanced governance logging for view all projects
    governanceLogger.logViewAllProjects(
      subAppId,
      subAppName,
      projectCount,
      'sidebar_click'
    );
    
    navigateToSubApp(subAppId);
  };

  const handleSubAppSelect = (subAppId: string, subAppName: string) => {
    const subApp = subApps?.find(s => s.id === subAppId);
    const projectCount = subApp?.projects?.total || 0;
    const recentProjects = subApp?.projects?.recent || [];
    
    // Enhanced governance logging for sub-app selection
    governanceLogger.logSubAppSelect(
      subAppId,
      subAppName,
      projectCount,
      recentProjects.map(p => p?.name || 'Unknown').slice(0, 3),
      'sidebar_navigation'
    );
    
    navigateToSubApp(subAppId);
  };

  const handleStrategicSurfaceSelect = (surface: StrategicSurface) => {
    // Enhanced governance logging for strategic surface selection
    governanceLogger.logProjectSurfaceSelect(
      surface,
      navigationState.strategicSurface,
      'sidebar_click'
    );
    
    navigateToStrategic(surface);
  };

  const handleSubAppLaunch = (subAppId: string, subAppName: string, launchUrl: string) => {
    // Enhanced governance logging for sub-app launch
    governanceLogger.logSubAppLaunch(
      subAppId,
      subAppName,
      launchUrl,
      'sidebar_button'
    );
    
    window.open(launchUrl, '_blank');
  };

  const handleSystemSurfaceSelect = (surfaceId: string, action?: string, url?: string, route?: string) => {
    // Enhanced governance logging for system surface selection
    governanceLogger.logSidebarInteraction({
      action: 'surface_switch',
      target: surfaceId,
      context: 'sidebar_navigation',
      metadata: {
        navigation_type: 'system',
        surface_type: 'system_surface',
        action_type: action
      }
    });

    if (action === 'external' && url) {
      // External link - open in new tab
      window.open(url, '_blank');
    } else if (action === 'navigate' && route) {
      // Internal navigation using React Router
      navigate(route);
    } else {
      // Default system surface navigation using React Router
      navigate(`/orbis/${surfaceId}`);
    }
  };

  const handleAdminSubSurfaceSelect = (subSurfaceId: string) => {
    // Enhanced governance logging for admin sub-surface selection
    governanceLogger.logSidebarInteraction({
      action: 'surface_switch',
      target: subSurfaceId,
      context: 'sidebar_navigation',
      metadata: {
        navigation_type: 'system',
        surface_type: 'admin_subsurface',
        parent_surface: 'admin'
      }
    });

    // Navigate to admin sub-surface using React Router
    // Convert admin-data-explorer format to admin/data-explorer
    const routePath = subSurfaceId.replace('admin-', 'admin/');
    navigate(`/orbis/${routePath}`);
  };

  const handleSidebarToggle = () => {
    const action = collapsed ? 'expand' : 'collapse';
    
    // Enhanced governance logging for sidebar toggle
    governanceLogger.logSidebarToggle(
      action,
      window.location.pathname
    );
    
    onToggleCollapse();
  };

  // Get enhanced sub-app status with runtime data
  const getSubAppStatus = (subAppId: string) => {
    const runtimeSubApp = runtimeStatus?.runtimeStatuses?.find(r => r.subAppId === subAppId);
    const subAppData = subApps?.find(s => s.id === subAppId);
    
    return {
      status: runtimeSubApp?.status || subAppData?.status || 'warning',
      uptime: runtimeSubApp?.uptime || subAppData?.metrics?.uptime || 0,
      responseTime: runtimeSubApp?.responseTime || subAppData?.metrics?.avgResponseTime || 0,
      lastUpdated: runtimeSubApp ? new Date(runtimeSubApp.lastChecked) : new Date(subAppData?.lastUpdated || 0)
    };
  };

  // Collapsed view
  if (collapsed) {
    return (
      <div className="fixed left-0 top-0 h-screen w-16 bg-white border-r border-gray-200 shadow-lg z-[9999] flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <button
            onClick={handleSidebarToggle}
            className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
            aria-label="Expand sidebar"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        
        <div className="flex-1 flex flex-col space-y-4 px-2 py-4">
          <div className="flex flex-col items-center space-y-2">
            <Layers className="w-5 h-5 text-blue-600" title="Project Surfaces" />
            <div className="w-2 h-2 bg-blue-500 rounded-full" />
          </div>
          
          <div className="flex flex-col items-center space-y-2">
            <Rocket className="w-5 h-5 text-purple-600" title="Sub-Apps" />
            <div className="w-2 h-2 bg-purple-500 rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed left-0 top-0 h-screen w-80 bg-white border-r border-gray-200 shadow-lg z-[9999] flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold text-gray-900">🏢 Orbis Platform</h1>
          <button
            onClick={handleSidebarToggle}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-white/50 rounded-md transition-colors"
            aria-label="Collapse sidebar"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm text-gray-600">Strategic & Operational Navigation</p>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto">
        {/* Strategic Project Surfaces */}
        <div className="border-b border-gray-200">
          <button
            onClick={() => handleAccordionToggle('strategic-surfaces')}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
            aria-expanded={expandedSections['strategic-surfaces']}
          >
            <div className="flex items-center space-x-3">
              <Layers className="w-5 h-5 text-blue-600" />
              <div>
                <h3 className="font-semibold text-gray-900">Project Surfaces</h3>
                <p className="text-xs text-gray-500">Strategic Level</p>
              </div>
            </div>
            {expandedSections['strategic-surfaces'] ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </button>

          <div
            className={`overflow-hidden transition-all duration-300 ease-in-out ${
              expandedSections['strategic-surfaces'] ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            <div className="px-4 pb-4 space-y-1">
              {STRATEGIC_SURFACES.map((surface) => {
                const isSelected = navigationState.level === 'strategic' && 
                                 navigationState.strategicSurface === surface.id;
                
                return (
                  <button
                    key={String(surface.id)}
                    onClick={() => handleStrategicSurfaceSelect(surface.id)}
                    className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-all ${
                      isSelected
                        ? 'bg-blue-100 text-blue-700 border border-blue-200'
                        : 'text-gray-700 hover:bg-gray-50 border border-transparent'
                    }`}
                  >
                    {surface.icon}
                    <div className="flex-1 text-left">
                      <div className={`font-medium ${isSelected ? 'text-blue-700' : 'text-gray-900'}`}>
                        {surface.label}
                      </div>
                      <div className={`text-xs ${isSelected ? 'text-blue-600' : 'text-gray-500'}`}>
                        {surface.description}
                      </div>
                    </div>
                    {isSelected && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full" aria-hidden="true" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sub-Apps Section */}
        <div className="border-b border-gray-200">
          <button
            onClick={() => handleAccordionToggle('sub-apps')}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
            aria-expanded={expandedSections['sub-apps']}
          >
            <div className="flex items-center space-x-3">
              <Rocket className="w-5 h-5 text-purple-600" />
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-semibold text-gray-900">Sub-Apps</h3>
                  {subAppsLive ? (
                    <Wifi className="w-3 h-3 text-green-600" title="Live data connection" />
                  ) : (
                    <WifiOff className="w-3 h-3 text-amber-600" title="Polling mode" />
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  {subAppsLoading ? 'Loading...' : `${subApps?.length || 0} applications`}
                </p>
              </div>
            </div>
            {expandedSections['sub-apps'] ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </button>

          <div
            className={`overflow-hidden transition-all duration-300 ease-in-out ${
              expandedSections['sub-apps'] ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            <div className="px-4 pb-4 space-y-3">
              {subAppsLoading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
                </div>
              ) : !subApps || subApps.length === 0 ? (
                <div className="text-center py-4 text-gray-500 text-sm">
                  No sub-apps available
                </div>
              ) : (
                subApps.map((subApp) => {
                  // Debug logging removed - was causing object conversion issues
                  
                  const isSelected = navigationState.level === 'operational' && 
                                   navigationState.subAppId === subApp.id;
                  const subAppStatus = getSubAppStatus(subApp.id);
                  const projectCount = subApp.projects?.total || 0;
                  const recentProjects = subApp.projects?.recent || [];
                  
                  // Debug logging removed - was causing object conversion issues
                  
                  return (
                    <div
                      key={String(subApp.id)}
                      className={`border rounded-lg p-4 transition-all ${
                        isSelected 
                          ? 'border-purple-300 bg-purple-50' 
                          : 'border-gray-200 hover:border-purple-200 hover:bg-gray-50'
                      }`}
                    >
                      {/* Sub-App Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${
                            subAppStatus.status === 'active' ? 'bg-green-500' :
                            subAppStatus.status === 'warning' ? 'bg-amber-500' : 'bg-red-500'
                          }`} title={`Status: ${subAppStatus.status} | Uptime: ${(subAppStatus.uptime || 0).toFixed(1)}%`} />
                          <div>
                            <h4 className="font-medium text-gray-900">{subApp.name}</h4>
                            <p className="text-xs text-gray-500">
                              v{subApp.version} • {(subAppStatus.responseTime || 0).toFixed(0)}ms
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleSubAppLaunch(subApp.id, subApp.name, subApp.launchUrl)}
                          className="p-1 text-gray-400 hover:text-purple-600 transition-colors"
                          title="Open sub-app in new tab"
                          aria-label={`Open ${subApp.name} in new tab`}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Project Summary */}
                      <div className="bg-white rounded-md p-3 border border-gray-100">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">
                            {projectCount} {projectCount === 1 ? 'project' : 'projects'}
                          </span>
                          <button
                            onClick={() => handleViewAllProjects(subApp.id, subApp.name)}
                            className="text-xs text-purple-600 hover:text-purple-700 font-medium"
                          >
                            View All →
                          </button>
                        </div>
                        
                        {/* Recent Projects Preview (real data) */}
                        {recentProjects.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {recentProjects.slice(0, 2).map((project, index) => (
                              <div key={String(project?.id || `project-${index}`)} className="text-xs text-gray-500 truncate">
                                • {project?.name || 'Unknown Project'} ({project?.completionPercentage || 0}%)
                              </div>
                            ))}
                            {projectCount > 2 && (
                              <div className="text-xs text-gray-400 italic">
                                +{projectCount - 2} more...
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {isSelected && (
                        <div className="mt-2 text-xs text-purple-600 font-medium">
                          Currently viewing
                        </div>
                      )}
                    </div>
                  );
                })
              )}
              
              {/* Refresh Button */}
              <div className="pt-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    refreshSubApps();
                  }}
                  className="w-full text-xs text-purple-600 hover:text-purple-700 py-2 px-3 border border-purple-200 rounded-md hover:bg-purple-50 transition-colors"
                >
                  Refresh Status
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* System Surfaces Section */}
      <div className="border-b border-gray-200">
        <button
          onClick={() => handleAccordionToggle('system-surfaces')}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
          aria-expanded={expandedSections['system-surfaces']}
        >
          <div className="flex items-center space-x-3">
            <Settings className="w-5 h-5 text-orange-600" />
            <div>
              <h3 className="font-semibold text-gray-900">System Surfaces</h3>
              <p className="text-xs text-gray-500">Platform Level</p>
            </div>
          </div>
          {expandedSections['system-surfaces'] ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </button>

        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            expandedSections['system-surfaces'] ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="px-4 pb-4 space-y-1">
              {SYSTEM_SURFACES.map((surface) => {
                const isSelected = false; // We can add selection logic later if needed
                
                return (
                  <div key={String(surface.id)} className="space-y-1">
                    <button
                      onClick={() => handleSystemSurfaceSelect(
                        surface.id, 
                        surface.action, 
                        surface.url, 
                        surface.route
                      )}
                      className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-all ${
                        isSelected
                          ? 'bg-orange-100 text-orange-700 border border-orange-200'
                          : 'text-gray-700 hover:bg-gray-50 border border-transparent'
                      }`}
                    >
                      {surface.icon}
                      <div className="flex-1 text-left">
                        <div className={`font-medium ${isSelected ? 'text-orange-700' : 'text-gray-900'}`}>
                          {surface.label}
                        </div>
                        <div className={`text-xs ${isSelected ? 'text-orange-600' : 'text-gray-500'}`}>
                          {surface.description}
                        </div>
                      </div>
                      {isSelected && (
                        <div className="w-2 h-2 bg-orange-500 rounded-full" aria-hidden="true" />
                      )}
                    </button>

                    {/* Admin Sub-Surfaces */}
                    {surface.id === 'admin' && surface.subSurfaces && (
                      <div className="ml-8 space-y-1 border-l-2 border-gray-200 pl-3">
                        {surface.subSurfaces.map((subSurface) => (
                          <button
                            key={String(subSurface.id)}
                            onClick={() => handleAdminSubSurfaceSelect(subSurface.id)}
                            className="w-full flex items-center space-x-2 p-1.5 text-left rounded-md hover:bg-gray-50 transition-colors group"
                            title={subSurface.description}
                          >
                            <div className="w-2 h-2 bg-gray-300 rounded-full group-hover:bg-gray-400"></div>
                            <span className="text-xs font-medium text-gray-600 group-hover:text-gray-800">
                              {subSurface.label}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="text-xs text-gray-500 text-center">
          Enhanced Sidebar v3.1 • SDLC-Ready
        </div>
      </div>
    </div>
  );
};