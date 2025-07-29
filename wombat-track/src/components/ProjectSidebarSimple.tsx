// ProjectSidebarSimple.tsx
// Restored from sidebar-recovery-branch commit 64a589c
// Adapted to work with current main branch types

import React from 'react';
import { ChevronRight, Folder, FolderOpen, CheckCircle, Clock, Circle, AlertCircle } from 'lucide-react';
import type { Phase } from '../types/models'; // no-unused-vars fix
import { getPhaseStatus } from '../utils/phaseStatus';

// FIXME: Temporarily using mock data structure until real project data is available
type MockProject = {
  id: string;
  name: string;
  description?: string;
  status: string;
  phases: Phase[];
};

interface ProjectSidebarSimpleProps {
  projects?: MockProject[];
  selectedProjectId?: string;
  onProjectSelect?: (projectId: string) => void;
  className?: string;
}

type SidebarItemProps = {
  name: string;
  children?: React.ReactNode;
  isOpen?: boolean;
  isSelected?: boolean;
  onClick?: () => void;
  status?: string;
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'Complete':
    case 'complete':
      return <CheckCircle className="w-4 h-4 text-emerald-500" />;
    case 'Active':
    case 'active':
    case 'In Progress':
    case 'in_progress':
      return <Clock className="w-4 h-4 text-amber-500" />;
    case 'Planned':
    case 'Not Started':
    case 'not_started':
      return <Circle className="w-4 h-4 text-slate-400" />;
    case 'Blocked':
    case 'blocked':
      return <AlertCircle className="w-4 h-4 text-red-500" />;
    default:
      return <Circle className="w-4 h-4 text-slate-400" />;
  }
};

const SidebarItem: React.FC<SidebarItemProps> = ({ 
  name, 
  children, 
  isOpen = false, 
  isSelected = false,
  onClick,
  status
}) => {
  return (
    <div className="space-y-1">
      <button
        onClick={onClick}
        className={`flex items-center justify-between w-full px-4 py-2 text-sm font-medium text-left rounded-md transition-colors hover:bg-gray-100 ${
          isSelected ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-500' : ''
        }`}
      >
        <div className="flex items-center space-x-2">
          {status ? getStatusIcon(status) : (isOpen ? <FolderOpen size={16} /> : <Folder size={16} />)}
          <span>{name}</span>
        </div>
        {children && (
          <ChevronRight
            className={`transform transition-transform ${isOpen ? 'rotate-90' : ''}`}
            size={16}
          />
        )}
      </button>
      {children && isOpen && <div className="pl-6">{children}</div>}
    </div>
  );
};

const ProjectSidebarSimple: React.FC<ProjectSidebarSimpleProps> = ({
  projects = [],
  selectedProjectId,
  onProjectSelect = () => {},
  className = ""
}) => {
  return (
    <div className={`w-64 bg-white border-r border-gray-200 ${className}`}>
      <div className="p-4">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Projects</h2>
        <div className="space-y-2">
          {projects.length === 0 ? (
            <div className="text-sm text-gray-500 italic">
              No projects available
            </div>
          ) : (
            projects.map((project) => (
              <SidebarItem
                key={project.id}
                name={project.name}
                isSelected={selectedProjectId === project.id}
                onClick={() => onProjectSelect(project.id)}
                status={project.status}
                isOpen={selectedProjectId === project.id}
              >
                {selectedProjectId === project.id && project.phases && (
                  <div className="space-y-1">
                    {project.phases.map((phase) => (
                      <SidebarItem
                        key={phase.id}
                        name={phase.name}
                        status={getPhaseStatus(phase)}
                      >
                        {phase.steps.map((step) => (
                          <SidebarItem
                            key={step.id}
                            name={step.stepInstruction.substring(0, 30) + '...'}
                            status={step.stepProgress?.status || 'Not Started'}
                          />
                        ))}
                      </SidebarItem>
                    ))}
                  </div>
                )}
              </SidebarItem>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectSidebarSimple;