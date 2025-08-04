import React, { useState } from 'react';
import { FolderOpen, ChevronRight, Layers, ArrowRight } from 'lucide-react';
import type { Project } from '../../types/phase';
import type { WorkSurface } from './AppLayout';

interface ProjectSurfacesSectionProps {
  currentProject: Project;
  selectedSurface: WorkSurface;
  collapsed?: boolean;
  onProjectChange?: (project: Project) => void;
  onSurfaceChange: (surface: WorkSurface) => void;
  availableProjects?: Project[];
}

type ProjectWorkSurface = 'plan' | 'execute' | 'document' | 'govern';

const PROJECT_WORK_SURFACES: { 
  id: ProjectWorkSurface; 
  label: string; 
  icon: string; 
  description: string;
  color: string;
}[] = [
  { 
    id: 'plan', 
    label: 'Plan', 
    icon: '📋', 
    description: 'Composer, phase setup, AI scaffold',
    color: 'text-blue-600'
  },
  { 
    id: 'execute', 
    label: 'Execute', 
    icon: '⚡', 
    description: 'Track phases, trigger steps, flag blockers',
    color: 'text-green-600'
  },
  { 
    id: 'document', 
    label: 'Document', 
    icon: '📝', 
    description: 'Rich-text SOP + AI',
    color: 'text-purple-600'
  },
  { 
    id: 'govern', 
    label: 'Govern', 
    icon: '🛡️', 
    description: 'Logs, reviews, AI audit trails',
    color: 'text-amber-600'
  }
];

export const ProjectSurfacesSection: React.FC<ProjectSurfacesSectionProps> = ({
  currentProject,
  selectedSurface,
  collapsed = false,
  onProjectChange,
  onSurfaceChange,
  availableProjects = []
}) => {
  const [showProjectSelector, setShowProjectSelector] = useState(false);

  const getProjectProgress = (project: Project) => {
    return project.completionPercentage || 0;
  };

  const getProjectRAGStatus = (project: Project) => {
    const percentage = getProjectProgress(project);
    if (percentage >= 80) return { label: 'Green', color: 'bg-green-500' };
    if (percentage >= 50) return { label: 'Amber', color: 'bg-amber-500' };
    return { label: 'Red', color: 'bg-red-500' };
  };

  const ragStatus = getProjectRAGStatus(currentProject);
  const progress = getProjectProgress(currentProject);

  const isProjectSurface = (surface: WorkSurface): surface is ProjectWorkSurface => {
    return PROJECT_WORK_SURFACES.some(s => s.id === surface);
  };

  if (collapsed) {
    return (
      <div className="p-2 border-b border-gray-200">
        <div className="flex flex-col items-center space-y-2">
          <Layers className="w-5 h-5 text-gray-600" title="Project Surfaces" />
          <div className="flex flex-col space-y-1">
            {PROJECT_WORK_SURFACES.map((surface) => (
              <button
                key={surface.id}
                onClick={() => onSurfaceChange(surface.id)}
                className={`w-8 h-8 flex items-center justify-center rounded-md transition-colors ${
                  selectedSurface === surface.id
                    ? 'bg-blue-100 text-blue-700'
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
          <Layers className="w-5 h-5 text-gray-600" />
          <h3 className="text-sm font-semibold text-gray-900">Project Surfaces</h3>
        </div>
      </div>

      {/* Current Project Display */}
      <div className="mb-4">
        <div className="relative">
          <button
            onClick={() => setShowProjectSelector(!showProjectSelector)}
            className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
            disabled={availableProjects.length === 0}
          >
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <FolderOpen className="w-5 h-5 text-gray-500 flex-shrink-0" />
              <div className="text-left flex-1 min-w-0">
                <div className="font-medium text-gray-900 truncate">
                  {currentProject.name}
                </div>
                <div className="text-sm text-gray-500 truncate">
                  {currentProject.projectType || 'Project'}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${ragStatus.color}`} 
                     title={`${ragStatus.label} status`} />
                <span className="text-xs text-gray-500">
                  {progress}%
                </span>
              </div>
            </div>
            {availableProjects.length > 0 && (
              <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${
                showProjectSelector ? 'rotate-90' : ''
              }`} />
            )}
          </button>

          {/* Project Selector Dropdown */}
          {showProjectSelector && availableProjects.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
              <div className="p-2">
                {availableProjects.map((project) => {
                  const projectRag = getProjectRAGStatus(project);
                  const projectProgress = getProjectProgress(project);
                  
                  return (
                    <button
                      key={project.id}
                      onClick={() => {
                        if (onProjectChange) {
                          onProjectChange(project);
                        }
                        setShowProjectSelector(false);
                      }}
                      className={`w-full flex items-center space-x-3 p-3 rounded-md transition-colors ${
                        project.id === currentProject.id
                          ? 'bg-blue-50 text-blue-700'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <FolderOpen className="w-4 h-4 flex-shrink-0" />
                      <div className="flex-1 text-left min-w-0">
                        <div className="font-medium truncate">{project.name}</div>
                        <div className="text-sm text-gray-500 truncate">
                          {project.projectType || 'Project'}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${projectRag.color}`} />
                        <span className="text-xs text-gray-500">
                          {projectProgress}%
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Project Context Info */}
        <div className="mt-3 px-3 py-2 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between text-xs">
            <span className="text-blue-700">
              Context: {currentProject.name}
            </span>
            <span className="text-blue-600">
              {currentProject.phases?.length || 0} phases
            </span>
          </div>
          {currentProject.currentPhase && (
            <div className="mt-1 text-xs text-blue-600">
              Active: {currentProject.currentPhase}
            </div>
          )}
        </div>
      </div>

      {/* Project Work Surfaces */}
      <div className="space-y-1">
        <div className="flex items-center space-x-2 mb-2">
          <span className="text-xs font-medium text-gray-700">Work Surfaces</span>
          <ArrowRight className="w-3 h-3 text-gray-400" />
          <span className="text-xs text-gray-500">Project Context</span>
        </div>
        
        {PROJECT_WORK_SURFACES.map((surface) => {
          const isSelected = selectedSurface === surface.id;
          
          return (
            <button
              key={surface.id}
              onClick={() => onSurfaceChange(surface.id)}
              className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 ${
                isSelected
                  ? 'bg-blue-100 text-blue-700 border border-blue-200 shadow-sm'
                  : 'text-gray-700 hover:bg-gray-50 border border-transparent'
              }`}
            >
              <span className={`text-lg ${isSelected ? 'scale-110' : ''} transition-transform`}>
                {surface.icon}
              </span>
              <div className="flex-1 text-left">
                <div className={`font-medium ${isSelected ? 'text-blue-700' : 'text-gray-900'}`}>
                  {surface.label}
                </div>
                <div className={`text-xs ${isSelected ? 'text-blue-600' : 'text-gray-500'}`}>
                  {surface.description}
                </div>
              </div>
              {isSelected && (
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* Surface Context Hint */}
      {isProjectSurface(selectedSurface) && (
        <div className="mt-3 p-2 bg-gray-50 rounded-md border border-gray-200">
          <div className="text-xs text-gray-600 text-center">
            <span className="font-medium">
              {PROJECT_WORK_SURFACES.find(s => s.id === selectedSurface)?.label}
            </span>
            {' '}surface scoped to{' '}
            <span className="font-medium text-gray-900">
              {currentProject.name}
            </span>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="mt-4 pt-3 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-2">
          <button 
            className="text-xs text-gray-600 hover:text-gray-700 py-1 px-2 border border-gray-200 rounded hover:bg-gray-50 transition-colors"
            onClick={() => {
              // Quick project overview
              onSurfaceChange('execute'); // Default to execute surface
            }}
          >
            Project Overview
          </button>
          <button 
            className="text-xs text-blue-600 hover:text-blue-700 py-1 px-2 border border-blue-200 rounded hover:bg-blue-50 transition-colors"
            onClick={() => {
              // Switch project modal or quick switcher
              setShowProjectSelector(true);
            }}
          >
            Switch Project
          </button>
        </div>
      </div>
    </div>
  );
};