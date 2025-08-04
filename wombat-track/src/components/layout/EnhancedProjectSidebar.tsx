import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Rocket, Layers, Settings } from 'lucide-react';
import type { Project } from '../../types/phase';
import type { WorkSurface } from './AppLayout';
import { ProjectHeader } from './ProjectHeader';
import { useSubAppStatus } from '../../hooks/useSubAppStatus';
import { useAccordionState } from '../../hooks/useAccordionState';
import { governanceLogger } from '../../services/governanceLogger';

interface EnhancedProjectSidebarProps {
  projects: Project[];
  currentProject: Project;
  selectedSurface: WorkSurface;
  collapsed: boolean;
  onProjectChange: (project: Project) => void;
  onSurfaceChange: (surface: WorkSurface) => void;
  onToggleCollapse: () => void;
}

// Define accordion sections with default states
const DEFAULT_ACCORDION_STATE = {
  'operating-subapps': true,     // Expanded by default
  'project-surfaces': true,      // Expanded by default  
  'system-surfaces': false       // Collapsed by default
};

const PROJECT_SURFACES: { id: WorkSurface; label: string; icon: string; description: string }[] = [
  { id: 'plan', label: 'Plan', icon: '📋', description: 'Composer, phase setup, AI scaffold' },
  { id: 'execute', label: 'Execute', icon: '⚡', description: 'Track phases, trigger steps, flag blockers' },
  { id: 'document', label: 'Document', icon: '📝', description: 'Rich-text SOP + AI' },
  { id: 'govern', label: 'Govern', icon: '🛡️', description: 'Logs, reviews, AI audit trails' }
];

const SYSTEM_SURFACES: { id: WorkSurface; label: string; icon: string; description: string }[] = [
  { id: 'integrate', label: 'Integrate', icon: '🧬', description: 'Integration health monitoring' },
  { id: 'spqr-runtime', label: 'SPQR Runtime', icon: '📊', description: 'Live SPQR dashboards with UAT mode' },
  { id: 'admin', label: 'Admin', icon: '🔧', description: 'Data Explorer, Import/Export, Runtime Panel' }
];

export const EnhancedProjectSidebar: React.FC<EnhancedProjectSidebarProps> = ({
  projects,
  currentProject,
  selectedSurface,
  collapsed,
  onProjectChange,
  onSurfaceChange,
  onToggleCollapse
}) => {
  const { subApps, isLoading: subAppsLoading, refresh: refreshSubApps } = useSubAppStatus();
  const { expandedSections, toggleSection } = useAccordionState(DEFAULT_ACCORDION_STATE);
  const [previousSurface, setPreviousSurface] = useState<WorkSurface>(selectedSurface);

  // Handle sub-app launch with governance logging
  const handleSubAppLaunch = (subApp: unknown) => {
    try {
      window.open(subApp.launchUrl, '_blank');
      governanceLogger.logSubAppLaunch(subApp.id, subApp.launchUrl, subApp.name);
    } catch (error) {
      console.error('Failed to launch sub-app:', error);
    }
  };

  // Handle surface change with governance logging
  const handleSurfaceChange = (surface: WorkSurface) => {
    governanceLogger.logSurfaceSwitch(previousSurface, surface, currentProject.id);
    setPreviousSurface(surface);
    onSurfaceChange(surface);
  };

  // Handle project change with governance logging
  const handleProjectChange = (project: Project) => {
    governanceLogger.logProjectSwitch(currentProject.id, project.id, project.name);
    onProjectChange(project);
  };

  // Handle accordion toggle with governance logging
  const handleAccordionToggle = (sectionId: string) => {
    const willBeExpanded = !expandedSections[sectionId];
    governanceLogger.logAccordionToggle(sectionId, willBeExpanded);
    toggleSection(sectionId);
  };

  // Handle settings access
  const handleProjectSettings = () => {
    governanceLogger.logSettingsAccess('project_configuration');
    // Navigate to admin surface for settings
    handleSurfaceChange('admin');
  };

  // Collapsed sidebar view
  if (collapsed) {
    return (
      <div className="fixed left-0 top-0 h-screen w-16 bg-white border-r border-gray-200 shadow-lg z-[9999] flex flex-col">
        <div className="p-4">
          <button
            onClick={onToggleCollapse}
            className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
            aria-label="Expand sidebar"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        
        {/* Collapsed section indicators */}
        <div className="flex-1 flex flex-col space-y-4 px-2">
          <div className="flex flex-col items-center space-y-1">
            <Rocket className="w-5 h-5 text-blue-600" title="Operating Sub-Apps" />
            <div className="w-2 h-2 bg-green-500 rounded-full" title={`${subApps.filter(s => s.status === 'active').length} active`} />
          </div>
          
          <div className="flex flex-col items-center space-y-1">
            <Layers className="w-5 h-5 text-gray-600" title="Project Surfaces" />
            <div className="w-2 h-2 bg-blue-500 rounded-full" title="Current surface" />
          </div>
          
          <div className="flex flex-col items-center space-y-1">
            <Settings className="w-5 h-5 text-gray-600" title="System Surfaces" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed left-0 top-0 h-screen w-80 bg-white border-r border-gray-200 shadow-lg z-[9999] flex flex-col">
      {/* Project Header */}
      <ProjectHeader
        currentProject={currentProject}
        selectedSurface={selectedSurface}
        subApps={subApps}
        availableProjects={projects}
        onProjectChange={handleProjectChange}
        onProjectSettings={handleProjectSettings}
      />

      {/* Collapse Button */}
      <div className="px-4 py-2 border-b border-gray-200">
        <button
          onClick={onToggleCollapse}
          className="w-full flex items-center justify-between p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors text-sm"
          aria-label="Collapse sidebar"
        >
          <span>Collapse Sidebar</span>
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Accordion Sections */}
      <div className="flex-1 overflow-y-auto">
        {/* Operating Sub-Apps Section */}
        <div className="border-b border-gray-200">
          <button
            onClick={() => handleAccordionToggle('operating-subapps')}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
            aria-expanded={expandedSections['operating-subapps']}
            aria-controls="operating-subapps-content"
          >
            <div className="flex items-center space-x-3">
              <Rocket className="w-5 h-5 text-blue-600" />
              <div>
                <h3 className="font-semibold text-gray-900">Operating Sub-Apps</h3>
                <p className="text-xs text-gray-500">
                  {subAppsLoading ? 'Loading...' : `${subApps.length} applications`}
                </p>
              </div>
            </div>
            {expandedSections['operating-subapps'] ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </button>

          <div
            id="operating-subapps-content"
            className={`overflow-hidden transition-all duration-300 ease-in-out ${
              expandedSections['operating-subapps'] ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            <div className="px-4 pb-4 space-y-2">
              {subAppsLoading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              ) : subApps.length === 0 ? (
                <div className="text-center py-4 text-gray-500 text-sm">
                  No sub-apps available
                </div>
              ) : (
                subApps.map((subApp) => (
                  <div
                    key={subApp.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all cursor-pointer group"
                    onClick={() => handleSubAppLaunch(subApp)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleSubAppLaunch(subApp);
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-label={`Launch ${subApp.name}`}
                    title={`Click to launch ${subApp.name} in new tab`}
                  >
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div className={`w-3 h-3 rounded-full ${
                        subApp.status === 'active' ? 'bg-green-500' :
                        subApp.status === 'warning' ? 'bg-amber-500' : 'bg-red-500'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate group-hover:text-blue-700">
                          {subApp.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {subApp.lastUpdated.toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
                  </div>
                ))
              )}
              
              {/* Refresh Button */}
              <div className="pt-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    refreshSubApps();
                  }}
                  className="w-full text-xs text-blue-600 hover:text-blue-700 py-2 px-3 border border-blue-200 rounded-md hover:bg-blue-50 transition-colors"
                >
                  Refresh Status
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Project Work Surfaces Section */}
        <div className="border-b border-gray-200">
          <button
            onClick={() => handleAccordionToggle('project-surfaces')}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
            aria-expanded={expandedSections['project-surfaces']}
            aria-controls="project-surfaces-content"
          >
            <div className="flex items-center space-x-3">
              <Layers className="w-5 h-5 text-green-600" />
              <div>
                <h3 className="font-semibold text-gray-900">Project Work Surfaces</h3>
                <p className="text-xs text-gray-500">Plan → Execute → Document → Govern</p>
              </div>
            </div>
            {expandedSections['project-surfaces'] ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </button>

          <div
            id="project-surfaces-content"
            className={`overflow-hidden transition-all duration-300 ease-in-out ${
              expandedSections['project-surfaces'] ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            <div className="px-4 pb-4 space-y-1">
              {PROJECT_SURFACES.map((surface) => {
                const isSelected = selectedSurface === surface.id;
                
                return (
                  <button
                    key={surface.id}
                    onClick={() => handleSurfaceChange(surface.id)}
                    className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-all ${
                      isSelected
                        ? 'bg-green-100 text-green-700 border border-green-200'
                        : 'text-gray-700 hover:bg-gray-50 border border-transparent'
                    }`}
                    aria-pressed={isSelected}
                  >
                    <span className="text-lg">{surface.icon}</span>
                    <div className="flex-1 text-left">
                      <div className={`font-medium ${isSelected ? 'text-green-700' : 'text-gray-900'}`}>
                        {surface.label}
                      </div>
                      <div className={`text-xs ${isSelected ? 'text-green-600' : 'text-gray-500'}`}>
                        {surface.description}
                      </div>
                    </div>
                    {isSelected && (
                      <div className="w-2 h-2 bg-green-500 rounded-full" aria-hidden="true" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* System Surfaces Section */}
        <div className="border-b border-gray-200">
          <button
            onClick={() => handleAccordionToggle('system-surfaces')}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
            aria-expanded={expandedSections['system-surfaces']}
            aria-controls="system-surfaces-content"
          >
            <div className="flex items-center space-x-3">
              <Settings className="w-5 h-5 text-slate-600" />
              <div>
                <h3 className="font-semibold text-gray-900">System Surfaces</h3>
                <p className="text-xs text-gray-500">Platform-level tools & monitoring</p>
              </div>
            </div>
            {expandedSections['system-surfaces'] ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </button>

          <div
            id="system-surfaces-content"
            className={`overflow-hidden transition-all duration-300 ease-in-out ${
              expandedSections['system-surfaces'] ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            <div className="px-4 pb-4 space-y-1">
              {SYSTEM_SURFACES.map((surface) => {
                const isSelected = selectedSurface === surface.id;
                
                return (
                  <button
                    key={surface.id}
                    onClick={() => handleSurfaceChange(surface.id)}
                    className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-all ${
                      isSelected
                        ? 'bg-slate-100 text-slate-700 border border-slate-200'
                        : 'text-gray-700 hover:bg-gray-50 border border-transparent'
                    }`}
                    aria-pressed={isSelected}
                  >
                    <span className="text-lg">{surface.icon}</span>
                    <div className="flex-1 text-left">
                      <div className={`font-medium ${isSelected ? 'text-slate-700' : 'text-gray-900'}`}>
                        {surface.label}
                      </div>
                      <div className={`text-xs ${isSelected ? 'text-slate-600' : 'text-gray-500'}`}>
                        {surface.description}
                      </div>
                    </div>
                    {isSelected && (
                      <div className="w-2 h-2 bg-slate-500 rounded-full" aria-hidden="true" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="text-xs text-gray-500 text-center">
          Enhanced Sidebar v2.0 • Accordion Navigation
        </div>
      </div>
    </div>
  );
};