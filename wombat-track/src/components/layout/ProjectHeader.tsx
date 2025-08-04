import React, { useState } from 'react';
import { ChevronRight, FolderOpen, Settings, Rocket } from 'lucide-react';
import type { Project } from '../../types/phase';
import type { WorkSurface } from './AppLayout';

interface SubApp {
  id: string;
  name: string;
  status: 'active' | 'warning' | 'offline';
  lastUpdated: Date;
  launchUrl: string;
  description?: string;
}

interface ProjectHeaderProps {
  currentProject: Project;
  selectedSurface: WorkSurface;
  subApps: SubApp[];
  availableProjects: Project[];
  onProjectChange: (project: Project) => void;
  onProjectSettings?: () => void;
}

const SURFACE_LABELS: Record<WorkSurface, { icon: string; label: string }> = {
  plan: { icon: '📋', label: 'Plan' },
  execute: { icon: '⚡', label: 'Execute' },
  document: { icon: '📝', label: 'Document' },
  govern: { icon: '🛡️', label: 'Govern' },
  integrate: { icon: '🧬', label: 'Integrate' },
  'spqr-runtime': { icon: '📊', label: 'SPQR Runtime' },
  admin: { icon: '🔧', label: 'Admin' },
  'admin-data-explorer': { icon: '🔧', label: 'Data Explorer' },
  'admin-import-export': { icon: '🔧', label: 'Import/Export' },
  'admin-orphan-inspector': { icon: '🔧', label: 'Orphan Inspector' },
  'admin-runtime-panel': { icon: '🔧', label: 'Runtime Panel' },
  'admin-secrets-manager': { icon: '🔧', label: 'Secrets Manager' }
};

export const ProjectHeader: React.FC<ProjectHeaderProps> = ({
  currentProject,
  selectedSurface,
  subApps,
  availableProjects,
  onProjectChange,
  onProjectSettings
}) => {
  const [showProjectSelector, setShowProjectSelector] = useState(false);

  // Calculate sub-app status summary
  const getSubAppSummary = () => {
    const active = subApps.filter(app => app.status === 'active').length;
    const warning = subApps.filter(app => app.status === 'warning').length;
    const offline = subApps.filter(app => app.status === 'offline').length;
    
    return { active, warning, offline, total: subApps.length };
  };

  const subAppSummary = getSubAppSummary();
  const currentSurface = SURFACE_LABELS[selectedSurface];

  // Project RAG status calculation
  const getProjectRAGStatus = (project: Project) => {
    const percentage = project.completionPercentage || 0;
    if (percentage >= 80) return { label: 'Green', color: 'bg-green-500' };
    if (percentage >= 50) return { label: 'Amber', color: 'bg-amber-500' };
    return { label: 'Red', color: 'bg-red-500' };
  };

  const ragStatus = getProjectRAGStatus(currentProject);

  return (
    <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
      {/* Platform Title */}
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-lg font-bold text-gray-900">Orbis Platform</h1>
        <div className="text-xs text-gray-500">v2.0</div>
      </div>

      {/* Project Selector */}
      <div className="relative mb-3">
        <button
          onClick={() => setShowProjectSelector(!showProjectSelector)}
          className="w-full flex items-center justify-between p-3 bg-white hover:bg-gray-50 rounded-lg transition-colors border border-gray-200 shadow-sm"
          aria-expanded={showProjectSelector}
          aria-haspopup="listbox"
          role="combobox"
        >
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <FolderOpen className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <div className="text-left flex-1 min-w-0">
              <div className="font-semibold text-gray-900 truncate">
                {currentProject.name}
              </div>
              <div className="text-sm text-gray-600 truncate">
                {currentProject.projectType || 'Project'} • {currentProject.completionPercentage || 0}% complete
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div 
                className={`w-3 h-3 rounded-full ${ragStatus.color}`} 
                title={`${ragStatus.label} status`}
              />
              <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${
                showProjectSelector ? 'rotate-90' : ''
              }`} />
            </div>
          </div>
        </button>

        {/* Project Dropdown */}
        {showProjectSelector && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
            <div className="p-2">
              {availableProjects.map((project) => {
                const projectRag = getProjectRAGStatus(project);
                
                return (
                  <button
                    key={project.id}
                    onClick={() => {
                      onProjectChange(project);
                      setShowProjectSelector(false);
                    }}
                    className={`w-full flex items-center space-x-3 p-3 rounded-md transition-colors ${
                      project.id === currentProject.id
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'hover:bg-gray-50'
                    }`}
                    role="option"
                    aria-selected={project.id === currentProject.id}
                  >
                    <FolderOpen className="w-4 h-4 flex-shrink-0" />
                    <div className="flex-1 text-left min-w-0">
                      <div className="font-medium truncate">{project.name}</div>
                      <div className="text-sm text-gray-500 truncate">
                        {project.projectType || 'Project'} • {project.completionPercentage || 0}%
                      </div>
                    </div>
                    <div className={`w-2 h-2 rounded-full ${projectRag.color}`} />
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Context Status Bar */}
      <div className="flex items-center justify-between">
        {/* Current Surface Indicator */}
        <div className="flex items-center space-x-2 px-3 py-1.5 bg-white rounded-md border border-gray-200 shadow-sm">
          <span className="text-sm">{currentSurface?.icon}</span>
          <span className="text-sm font-medium text-gray-700">{currentSurface?.label}</span>
        </div>

        {/* Sub-App Summary */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1 px-2 py-1 bg-white rounded-md border border-gray-200 shadow-sm">
            <Rocket className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-medium text-gray-700">{subAppSummary.total}</span>
            {subAppSummary.active > 0 && (
              <span className="text-xs text-green-600">{subAppSummary.active}🟢</span>
            )}
            {subAppSummary.warning > 0 && (
              <span className="text-xs text-amber-600">{subAppSummary.warning}🟡</span>
            )}
            {subAppSummary.offline > 0 && (
              <span className="text-xs text-red-600">{subAppSummary.offline}🔴</span>
            )}
          </div>

          {/* Settings Button */}
          <button
            onClick={onProjectSettings}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white rounded-md transition-colors"
            title="Project Settings"
            aria-label="Project Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Project Context Info */}
      <div className="mt-3 px-3 py-2 bg-white/60 rounded-md border border-gray-200/50">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-600">
            Active: <span className="font-medium text-gray-900">{currentProject.currentPhase || 'Planning'}</span>
          </span>
          <span className="text-gray-600">
            Owner: <span className="font-medium text-gray-900">{currentProject.projectOwner}</span>
          </span>
        </div>
      </div>
    </div>
  );
};