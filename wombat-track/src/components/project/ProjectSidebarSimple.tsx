import React from 'react';
import { ChevronRight, Folder, FolderOpen, CheckCircle, Clock, Circle } from 'lucide-react';
import { Disclosure } from '@headlessui/react';
import { cn } from '../../utils/classNames';
import type { Project, Phase, PhaseStep } from '../../types/phase';

interface ProjectSidebarSimpleProps {
  projects: Project[];
  selectedProjectId?: string;
  onProjectSelect: (projectId: string) => void;
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

const getPhaseStatus = (phase: Phase): string => {
  if (!phase.steps || phase.steps.length === 0) {
    return 'not_started';
  }
  
  const stepStatuses = phase.steps.map(step => step.status);
  
  // If any step has error, phase has error
  if (stepStatuses.includes('error')) {
    return 'error';
  }
  
  // If all steps are complete, phase is complete
  if (stepStatuses.every(status => status === 'complete')) {
    return 'complete';
  }
  
  // If any step is in progress, phase is in progress
  if (stepStatuses.includes('in_progress')) {
    return 'in_progress';
  }
  
  // If all steps are not started, phase is not started
  if (stepStatuses.every(status => status === 'not_started')) {
    return 'not_started';
  }
  
  // Mixed states mean in progress
  return 'in_progress';
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'Complete':
    case 'complete':
      return <CheckCircle className="w-4 h-4 text-emerald-500" />;
    case 'Active':
    case 'active':
    case 'in_progress':
      return <Clock className="w-4 h-4 text-amber-500" />;
    case 'Planned':
    case 'not_started':
      return <Circle className="w-4 h-4 text-slate-400" />;
    case 'error':
      return <Circle className="w-4 h-4 text-red-500" />;
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
    <Disclosure defaultOpen={isOpen}>
      {({ open }) => (
        <div className="space-y-1">
          <Disclosure.Button
            onClick={onClick}
            className={cn(
              'flex items-center justify-between w-full px-4 py-2 text-sm font-medium text-left rounded-md transition-colors',
              'hover:bg-gray-100',
              isSelected && 'bg-blue-50 text-blue-700 border-r-2 border-blue-500'
            )}
          >
            <div className="flex items-center space-x-2">
              {status ? getStatusIcon(status) : (open ? <FolderOpen size={16} /> : <Folder size={16} />)}
              <span>{name}</span>
            </div>
            {children && (
              <ChevronRight
                className={cn('transform transition-transform', open && 'rotate-90')}
                size={16}
              />
            )}
          </Disclosure.Button>
          {children && <Disclosure.Panel className="pl-6">{children}</Disclosure.Panel>}
        </div>
      )}
    </Disclosure>
  );
};

const ProjectSidebarSimple: React.FC<ProjectSidebarSimpleProps> = ({
  projects,
  selectedProjectId,
  onProjectSelect,
  className
}) => {
  return (
    <div className={cn("w-64 bg-white border-r border-gray-200", className)}>
      <div className="p-4">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Projects</h2>
        <div className="space-y-2">
          {projects.map((project) => (
            <SidebarItem
              key={project.id}
              name={project.name}
              isSelected={selectedProjectId === project.id}
              onClick={() => onProjectSelect(project.id)}
              status={project.status}
              isOpen={selectedProjectId === project.id}
            >
              {selectedProjectId === project.id && (
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
                          name={step.name}
                          status={step.status}
                        />
                      ))}
                    </SidebarItem>
                  ))}
                </div>
              )}
            </SidebarItem>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProjectSidebarSimple;