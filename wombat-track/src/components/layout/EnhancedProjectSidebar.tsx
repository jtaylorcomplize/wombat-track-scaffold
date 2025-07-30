import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Filter, FolderOpen, Settings, Plus } from 'lucide-react';
import type { Project } from '../../types/phase';
import type { WorkSurface } from './AppLayout';
import { SubAppSelector } from './SubAppSelector';
import { mockPrograms } from '../../data/mockPrograms';
import { mockProjects } from '../../data/mockProjects';

interface EnhancedProjectSidebarProps {
  projects: Project[];
  currentProject: Project;
  selectedSurface: WorkSurface;
  collapsed: boolean;
  currentSubApp: string;
  onProjectChange: (project: Project) => void;
  onSurfaceChange: (surface: WorkSurface) => void;
  onToggleCollapse: () => void;
  onSubAppChange: (subAppId: string) => void;
}

interface FilterState {
  ragStatus: string;
  status: string;
  owner: string;
}

const WORK_SURFACES: { id: WorkSurface; label: string; icon: string; description: string }[] = [
  { id: 'plan', label: 'Plan', icon: '📋', description: 'Composer, phase setup, AI scaffold' },
  { id: 'execute', label: 'Execute', icon: '⚡', description: 'Track phases, trigger steps, flag blockers' },
  { id: 'document', label: 'Document', icon: '📝', description: 'Rich-text SOP + AI' },
  { id: 'govern', label: 'Govern', icon: '🛡️', description: 'Logs, reviews, AI audit trails' },
  { id: 'integrate', label: 'Integrate', icon: '🧬', description: 'Integration health monitoring' },
  { id: 'spqr-runtime', label: 'SPQR Runtime', icon: '📊', description: 'Live SPQR dashboards with UAT mode' }
];

const RAG_STATUS_OPTIONS = ['All', 'Red', 'Amber', 'Green'];
const STATUS_OPTIONS = ['All', 'Active', 'On Hold', 'Completed'];

export const EnhancedProjectSidebar: React.FC<EnhancedProjectSidebarProps> = ({
  _projects, // eslint-disable-line @typescript-eslint/no-unused-vars
  currentProject,
  selectedSurface,
  collapsed,
  currentSubApp,
  onProjectChange,
  onSurfaceChange,
  onToggleCollapse,
  onSubAppChange
}) => {
  const [showProjectSelector, setShowProjectSelector] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    ragStatus: 'All',
    status: 'All',
    owner: 'All'
  });

  // Filter projects by current Sub-App
  const filteredProjects = useMemo(() => {
    // Get mock projects for demo purposes, filtered by linkedProgramId
    const subAppProjects = mockProjects.filter(p => p.linkedProgramId === currentSubApp);
    
    // Map to match expected Project type structure
    return subAppProjects.map(p => ({
      id: p.id,
      name: p.title,
      projectType: 'Development',
      projectOwner: 'Team Lead',
      currentPhase: 'Phase 1',
      completionPercentage: Math.floor(Math.random() * 100),
      phases: []
    })) as Project[];
  }, [currentSubApp]);

  const currentProgram = mockPrograms.find(p => p.id === currentSubApp);
  const uniqueOwners = ['All', ...new Set(filteredProjects.map(p => p.projectOwner))];

  // Project status color utility removed - unused in this component

  const getProjectRAGStatus = (project: Project) => {
    const percentage = project.completionPercentage || 0;
    if (percentage >= 80) return 'Green';
    if (percentage >= 50) return 'Amber';
    return 'Red';
  };

  if (collapsed) {
    return (
      <div className="fixed left-0 top-0 h-full w-16 bg-white border-r border-gray-200 shadow-sm z-40">
        <div className="p-4">
          <button
            onClick={onToggleCollapse}
            className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
            data-testid="sidebar-expand"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        
        <nav className="mt-8 space-y-2 px-2">
          {WORK_SURFACES.map((surface) => (
            <button
              key={surface.id}
              onClick={() => onSurfaceChange(surface.id)}
              className={`w-12 h-12 flex items-center justify-center rounded-lg transition-colors ${
                selectedSurface === surface.id
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              title={surface.label}
              data-testid={`surface-${surface.id}-collapsed`}
            >
              <span className="text-lg">{surface.icon}</span>
            </button>
          ))}
        </nav>
      </div>
    );
  }

  return (
    <div className="fixed left-0 top-0 h-full w-80 bg-white border-r border-gray-200 shadow-sm z-40 flex flex-col">
      {/* Header with Platform Title */}
      <div className="p-6 pb-0 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-gray-900">Orbis Platform</h1>
          <button
            onClick={onToggleCollapse}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
            data-testid="sidebar-collapse"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Sub-App Selector */}
      <SubAppSelector
        currentSubApp={currentSubApp}
        onSubAppChange={onSubAppChange}
        availableSubApps={mockPrograms}
        showBranding={true}
      />

      {/* Project Selector (Scoped to Sub-App) */}
      <div className="p-6 pt-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-700">
            {currentProgram?.name} Projects
          </h3>
          <button className="p-1 text-gray-400 hover:text-gray-600">
            <Plus className="w-4 h-4" />
          </button>
        </div>
        
        <div className="relative">
          <button
            onClick={() => setShowProjectSelector(!showProjectSelector)}
            className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
            data-testid="project-selector-trigger"
          >
            <div className="flex items-center space-x-3">
              <FolderOpen className="w-5 h-5 text-gray-500" />
              <div className="text-left">
                <div className="font-medium text-gray-900 truncate">{currentProject.name}</div>
                <div className="text-sm text-gray-500">{currentProject.projectType}</div>
              </div>
            </div>
            <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${
              showProjectSelector ? 'rotate-90' : ''
            }`} />
          </button>

          {showProjectSelector && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
              <div className="p-2">
                {filteredProjects.length > 0 ? (
                  filteredProjects.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => {
                        onProjectChange(project);
                        setShowProjectSelector(false);
                      }}
                      className={`w-full flex items-center space-x-3 p-3 rounded-md transition-colors ${
                        project.id === currentProject.id
                          ? 'bg-blue-50 text-blue-700'
                          : 'hover:bg-gray-50'
                      }`}
                      data-testid={`project-option-${project.id}`}
                    >
                      <FolderOpen className="w-4 h-4" />
                      <div className="flex-1 text-left">
                        <div className="font-medium truncate">{project.name}</div>
                        <div className="text-sm text-gray-500">{project.projectType}</div>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        getProjectRAGStatus(project) === 'Green' ? 'bg-green-100 text-green-700' :
                        getProjectRAGStatus(project) === 'Amber' ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {getProjectRAGStatus(project)}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="p-4 text-center text-gray-500 text-sm">
                    No projects in {currentProgram?.name}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Work Surfaces Navigation */}
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Work Surfaces</h3>
        <nav className="space-y-1">
          {WORK_SURFACES.map((surface) => (
            <button
              key={surface.id}
              onClick={() => onSurfaceChange(surface.id)}
              className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                selectedSurface === surface.id
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              data-testid={`surface-${surface.id}`}
            >
              <span className="text-lg">{surface.icon}</span>
              <div className="flex-1 text-left">
                <div className="font-medium">{surface.label}</div>
                <div className="text-xs text-gray-500">{surface.description}</div>
              </div>
            </button>
          ))}
        </nav>
      </div>

      {/* Filters */}
      <div className="flex-1 p-6">
        <div className="flex items-center space-x-2 mb-3">
          <Filter className="w-4 h-4 text-gray-500" />
          <h3 className="text-sm font-medium text-gray-900">Filters</h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">RAG Status</label>
            <select
              value={filters.ragStatus}
              onChange={(e) => setFilters(prev => ({ ...prev, ragStatus: e.target.value }))}
              className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              data-testid="filter-rag-status"
            >
              {RAG_STATUS_OPTIONS.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              data-testid="filter-status"
            >
              {STATUS_OPTIONS.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Owner</label>
            <select
              value={filters.owner}
              onChange={(e) => setFilters(prev => ({ ...prev, owner: e.target.value }))}
              className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              data-testid="filter-owner"
            >
              {uniqueOwners.map(owner => (
                <option key={owner} value={owner}>{owner}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-6 border-t border-gray-200">
        <button className="w-full flex items-center space-x-3 p-3 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
          <Settings className="w-4 h-4" />
          <span className="text-sm font-medium">Settings</span>
        </button>
      </div>
    </div>
  );
};