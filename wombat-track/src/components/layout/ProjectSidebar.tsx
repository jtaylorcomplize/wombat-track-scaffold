import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Filter, FolderOpen, Settings, User } from 'lucide-react';
import type { Project } from '../../types/phase';
import type { WorkSurface } from './AppLayout';

interface ProjectSidebarProps {
  projects: Project[];
  currentProject: Project;
  selectedSurface: WorkSurface;
  collapsed: boolean;
  onProjectChange: (project: Project) => void;
  onSurfaceChange: (surface: WorkSurface) => void;
  onToggleCollapse: () => void;
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
  { id: 'integrate', label: 'Integrate', icon: '🧬', description: 'Integration health monitoring' }
];

const RAG_STATUS_OPTIONS = ['All', 'Red', 'Amber', 'Green'];
const STATUS_OPTIONS = ['All', 'Active', 'On Hold', 'Completed'];

export const ProjectSidebar: React.FC<ProjectSidebarProps> = ({
  projects,
  currentProject,
  selectedSurface,
  collapsed,
  onProjectChange,
  onSurfaceChange,
  onToggleCollapse
}) => {
  const [showProjectSelector, setShowProjectSelector] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    ragStatus: 'All',
    status: 'All',
    owner: 'All'
  });

  const uniqueOwners = ['All', ...new Set(projects.map(p => p.projectOwner))];

  // Project status color utility for RAG visual indicators
  const getProjectStatusColor = (project: Project) => {
    const percentage = project.completionPercentage || 0;
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 50) return 'text-amber-600';
    return 'text-red-600';
  };

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
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-gray-900">Wombat Track</h1>
          <button
            onClick={onToggleCollapse}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
            data-testid="sidebar-collapse"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Project Selector */}
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
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
              <div className="p-2">
                {projects.map((project) => (
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
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Project Metadata */}
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Project Status</h3>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Completion</span>
            <span className={`text-sm font-medium ${getProjectStatusColor(currentProject)}`}>
              {currentProject.completionPercentage || 0}%
            </span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                (currentProject.completionPercentage || 0) >= 80 ? 'bg-green-500' :
                (currentProject.completionPercentage || 0) >= 50 ? 'bg-amber-500' : 'bg-red-500'
              }`}
              style={{ width: `${currentProject.completionPercentage || 0}%` }}
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Current Phase</span>
            <span className="text-sm font-medium text-gray-900">{currentProject.currentPhase}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">RAG Status</span>
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
              getProjectRAGStatus(currentProject) === 'Green' ? 'bg-green-100 text-green-700' :
              getProjectRAGStatus(currentProject) === 'Amber' ? 'bg-amber-100 text-amber-700' :
              'bg-red-100 text-red-700'
            }`}>
              {getProjectRAGStatus(currentProject)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Owner</span>
            <div className="flex items-center space-x-1">
              <User className="w-3 h-3 text-gray-400" />
              <span className="text-sm text-gray-900">{currentProject.projectOwner}</span>
            </div>
          </div>
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