import React, { useState, useMemo } from 'react';
import { Disclosure, Transition } from '@headlessui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronRight,
  CheckCircle,
  Circle,
  AlertCircle,
  XCircle,
  Clock,
  Archive,
  Plus,
  Search,
  Filter,
  Beaker,
  Briefcase,
  Sword,
  AlertTriangle,
  Folder,
  FolderOpen
} from 'lucide-react';
import type { Project, Phase, PhaseStep } from '../../types/phase';
import { cn } from '../../utils/classNames';

interface ProjectSidebarProps {
  projects: Project[];
  selectedProjectId?: string;
  onProjectSelect: (projectId: string) => void;
  className?: string;
}

type ProjectLifecycle = 'current' | 'completed' | 'future';

const getProjectLifecycle = (project: Project): ProjectLifecycle => {
  if (project.status === 'Complete') return 'completed';
  if (project.status === 'Planned' || project.status === 'Paused') return 'future';
  return 'current';
};

const getStatusIcon = (status: string, className = 'w-4 h-4') => {
  switch (status) {
    case 'complete':
    case 'Complete':
      return (
        <span title="Complete">
          <CheckCircle className={cn(className, 'text-emerald-500')} />
        </span>
      );
    case 'in_progress':
    case 'Active':
      return (
        <span title="In Progress">
          <Clock className={cn(className, 'text-amber-500 animate-pulse')} />
        </span>
      );
    case 'not_started':
    case 'Planned':
      return (
        <span title="Not Started">
          <Circle className={cn(className, 'text-slate-400')} />
        </span>
      );
    case 'failed':
    case 'Blocked':
      return (
        <span title="Failed/Blocked">
          <XCircle className={cn(className, 'text-red-500')} />
        </span>
      );
    case 'Paused':
      return (
        <span title="Paused">
          <AlertCircle className={cn(className, 'text-orange-500')} />
        </span>
      );
    case 'Archived':
      return (
        <span title="Archived">
          <Archive className={cn(className, 'text-slate-500')} />
        </span>
      );
    default:
      return (
        <span title="Unknown Status">
          <Circle className={cn(className, 'text-slate-400')} />
        </span>
      );
  }
};

const getRagBadge = (ragStatus?: 'red' | 'amber' | 'green' | 'blue') => {
  if (!ragStatus) return null;
  
  const colors = {
    red: 'bg-red-500',
    amber: 'bg-amber-500',
    green: 'bg-emerald-500',
    blue: 'bg-blue-500'
  };
  
  return (
    <div 
      className={cn('w-2 h-2 rounded-full', colors[ragStatus])} 
      title={`RAG Status: ${ragStatus.toUpperCase()}`}
    />
  );
};

const getProjectTypeIcon = (projectType: string, className = 'w-4 h-4') => {
  const icons: Record<string, { icon: React.ElementType; className: string }> = {
    'R&D': { icon: Beaker, className: 'text-purple-500' },
    'Platform': { icon: Briefcase, className: 'text-blue-500' },
    'execution-console': { icon: Briefcase, className: 'text-indigo-500' },
    'Other': { icon: Circle, className: 'text-slate-500' }
  };
  
  const config = icons[projectType] || icons.Other;
  const Icon = config.icon;
  
  return (
    <span title={`Type: ${projectType}`}>
      <Icon className={cn(className, config.className)} />
    </span>
  );
};

const ProjectSidebar: React.FC<ProjectSidebarProps> = ({
  projects,
  selectedProjectId,
  onProjectSelect,
  className
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showLifecycle, setShowLifecycle] = useState<ProjectLifecycle | 'all'>('all');
  const [showOnlyRag, setShowOnlyRag] = useState(false);
  
  const filteredProjects = useMemo(() => {
    return projects.filter(project => {
      // Lifecycle filter
      if (showLifecycle !== 'all' && getProjectLifecycle(project) !== showLifecycle) {
        return false;
      }
      
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesProject = project.name.toLowerCase().includes(query) ||
                              project.description?.toLowerCase().includes(query) ||
                              project.wtTag?.toLowerCase().includes(query);
        
        const matchesPhase = project.phases?.some(phase =>
          phase.name.toLowerCase().includes(query) ||
          phase.description?.toLowerCase().includes(query)
        );
        
        const matchesStep = project.phases?.some(phase =>
          phase.steps?.some(step =>
            step.name.toLowerCase().includes(query) ||
            step.description?.toLowerCase().includes(query)
          )
        );
        
        if (!matchesProject && !matchesPhase && !matchesStep) {
          return false;
        }
      }
      
      // RAG filter
      if (showOnlyRag) {
        const hasRagPhase = project.phases?.some(phase => phase.ragStatus);
        if (!hasRagPhase) return false;
      }
      
      return true;
    });
  }, [projects, searchQuery, showLifecycle, showOnlyRag]);
  
  const projectsByLifecycle = useMemo(() => {
    const grouped = {
      current: [] as Project[],
      completed: [] as Project[],
      future: [] as Project[]
    };
    
    filteredProjects.forEach(project => {
      const lifecycle = getProjectLifecycle(project);
      grouped[lifecycle].push(project);
    });
    
    return grouped;
  }, [filteredProjects]);
  
  // Step Component with proper indentation
  const StepComponent: React.FC<{ step: PhaseStep }> = ({ step }) => (
    <div className="flex items-center gap-3 py-2 pl-12 pr-3 text-sm text-slate-600 hover:bg-slate-50 rounded-md transition-colors group">
      <div className="flex-shrink-0">
        {getStatusIcon(step.status || 'not_started', 'w-3.5 h-3.5')}
      </div>
      <span className="flex-1 truncate group-hover:text-slate-900 transition-colors">
        {step.name}
      </span>
    </div>
  );
  
  // Phase Component with better visual hierarchy
  const PhaseComponent: React.FC<{ phase: Phase; projectId: string }> = ({ phase, projectId }) => {
    const isSideQuest = phase.name.toLowerCase().includes('side quest');
    
    return (
      <Disclosure>
        {({ open }) => (
          <div className="border-l-2 border-slate-100 ml-6">
            <Disclosure.Button className="w-full flex items-center gap-3 py-2.5 pl-4 pr-3 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-md transition-all duration-200 group focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset">
              <div className="flex items-center gap-2">
                <ChevronRight 
                  className={cn(
                    'w-4 h-4 text-slate-400 transition-transform duration-200 flex-shrink-0',
                    open && 'rotate-90 text-slate-600'
                  )} 
                />
                {isSideQuest && (
                  <span title="Side Quest">
                    <Sword className="w-4 h-4 text-purple-500 flex-shrink-0" />
                  </span>
                )}
              </div>
              <span className="flex-1 text-left truncate group-hover:text-slate-900 transition-colors">
                {phase.name}
              </span>
              <div className="flex items-center gap-2">
                {getRagBadge(phase.ragStatus)}
                {phase.steps && (
                  <span className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                    {phase.steps.length}
                  </span>
                )}
              </div>
            </Disclosure.Button>
            
            <Transition
              show={open}
              enter="transition duration-200 ease-out"
              enterFrom="transform scale-95 opacity-0"
              enterTo="transform scale-100 opacity-100"
              leave="transition duration-150 ease-in"
              leaveFrom="transform scale-100 opacity-100"
              leaveTo="transform scale-95 opacity-0"
            >
              <Disclosure.Panel className="mt-1 space-y-1">
                {phase.steps?.map(step => (
                  <StepComponent key={step.id} step={step} />
                ))}
              </Disclosure.Panel>
            </Transition>
          </div>
        )}
      </Disclosure>
    );
  };
  
  // Project Component with enhanced visual structure
  const ProjectComponent: React.FC<{ project: Project }> = ({ project }) => {
    const isSelected = project.id === selectedProjectId;
    const hasUnknownStatus = !project.wtTag || project.wtTag === 'wtPhaseUnknown';
    
    return (
      <Disclosure>
        {({ open }) => (
          <div className={cn(
            'mb-2 rounded-lg border transition-all duration-200',
            isSelected 
              ? 'border-blue-200 bg-blue-50 shadow-sm' 
              : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
          )}>
            <Disclosure.Button
              onClick={() => onProjectSelect(project.id)}
              className={cn(
                'w-full flex items-center gap-3 p-3 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset',
                isSelected 
                  ? 'bg-blue-50 hover:bg-blue-100' 
                  : 'bg-white hover:bg-slate-50'
              )}
            >
              <div className="flex items-center gap-2">
                {open ? (
                  <FolderOpen className="w-5 h-5 text-slate-600 flex-shrink-0" />
                ) : (
                  <Folder className="w-5 h-5 text-slate-500 flex-shrink-0" />
                )}
                {getProjectTypeIcon(project.projectType || 'Other', 'w-4 h-4')}
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className={cn(
                  'font-semibold text-left truncate transition-colors',
                  isSelected ? 'text-blue-900' : 'text-slate-900'
                )}>
                  {project.name}
                </h3>
                {project.description && (
                  <p className="text-xs text-slate-500 truncate mt-0.5">
                    {project.description}
                  </p>
                )}
              </div>
              
              <div className="flex items-center gap-2 flex-shrink-0">
                {hasUnknownStatus && (
                  <span title="Needs Review">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                  </span>
                )}
                {project.archived && (
                  <span title="Archived">
                    <Archive className="w-4 h-4 text-slate-400" />
                  </span>
                )}
                {getStatusIcon(project.status || 'Planned')}
                {project.phases && (
                  <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                    {project.phases.length} phases
                  </span>
                )}
              </div>
            </Disclosure.Button>
            
            <Transition
              show={open}
              enter="transition duration-300 ease-out"
              enterFrom="transform scale-95 opacity-0"
              enterTo="transform scale-100 opacity-100"
              leave="transition duration-200 ease-in"
              leaveFrom="transform scale-100 opacity-100"
              leaveTo="transform scale-95 opacity-0"
            >
              <Disclosure.Panel className="pb-3 px-3">
                <div className="space-y-2">
                  {project.phases
                    ?.sort((a, b) => a.order - b.order)
                    .map(phase => (
                      <PhaseComponent key={phase.id} phase={phase} projectId={project.id} />
                    ))}
                </div>
              </Disclosure.Panel>
            </Transition>
          </div>
        )}
      </Disclosure>
    );
  };
  
  // Lifecycle Section with proper visual separation
  const LifecycleSectionComponent: React.FC<{ 
    title: string; 
    icon: React.ReactNode; 
    projects: Project[];
    isLast?: boolean;
  }> = ({ title, icon, projects, isLast = false }) => {
    if (projects.length === 0) return null;
    
    return (
      <div className={cn('mb-6', !isLast && 'pb-6 border-b border-slate-200')}>
        <div className="flex items-center gap-2 px-1 py-2 mb-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-600 uppercase tracking-wide">
            {icon}
            <span>{title}</span>
          </div>
          <div className="flex-1 h-px bg-slate-200" />
          <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
            {projects.length}
          </span>
        </div>
        <div className="space-y-2">
          {projects.map(project => (
            <ProjectComponent key={project.id} project={project} />
          ))}
        </div>
      </div>
    );
  };
  
  return (
    <div className={cn(
      'flex flex-col h-full bg-slate-50 border-r border-slate-200 shadow-sm',
      className
    )}>
      {/* Header */}
      <div className="flex-shrink-0 p-4 bg-white border-b border-slate-200">
        <div className="flex items-center gap-2 mb-4">
          <Folder className="w-5 h-5 text-slate-600" />
          <h2 className="text-lg font-bold text-slate-900">Projects</h2>
        </div>
        
        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projects, phases, steps..."
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors placeholder-slate-400"
            aria-label="Search projects"
          />
        </div>
        
        {/* Filters */}
        <div className="flex items-center gap-2 mb-4">
          <select
            value={showLifecycle}
            onChange={(e) => setShowLifecycle(e.target.value as ProjectLifecycle | 'all')}
            className="flex-1 text-sm bg-white border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            aria-label="Filter by project lifecycle"
          >
            <option value="all">All Projects</option>
            <option value="current">Current</option>
            <option value="completed">Completed</option>
            <option value="future">Future</option>
          </select>
          
          <button
            onClick={() => setShowOnlyRag(!showOnlyRag)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 text-sm font-medium border rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500',
              showOnlyRag
                ? 'bg-blue-100 border-blue-300 text-blue-700 shadow-sm'
                : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
            )}
            aria-label="Filter by RAG status"
            aria-pressed={showOnlyRag}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>RAG</span>
          </button>
        </div>
        
        {/* Quick Actions */}
        <button className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500">
          <Plus className="w-4 h-4" />
          <span>New Project</span>
        </button>
      </div>
      
      {/* Project List */}
      <div className="flex-1 overflow-y-auto p-4">
        {showLifecycle === 'all' ? (
          <>
            <LifecycleSectionComponent
              title="Current Projects"
              icon={<Clock className="w-4 h-4 text-amber-500" />}
              projects={projectsByLifecycle.current}
            />
            <LifecycleSectionComponent
              title="Completed Projects"
              icon={<CheckCircle className="w-4 h-4 text-emerald-500" />}
              projects={projectsByLifecycle.completed}
            />
            <LifecycleSectionComponent
              title="Future Projects"
              icon={<Beaker className="w-4 h-4 text-purple-500" />}
              projects={projectsByLifecycle.future}
              isLast={true}
            />
          </>
        ) : (
          <div className="space-y-2">
            {filteredProjects.map(project => (
              <ProjectComponent key={project.id} project={project} />
            ))}
          </div>
        )}
        
        {filteredProjects.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <Search className="w-6 h-6 text-slate-400" />
            </div>
            <h3 className="text-sm font-medium text-slate-900 mb-1">No projects found</h3>
            <p className="text-xs text-slate-500">
              Try adjusting your search or filter criteria
            </p>
          </div>
        )}
      </div>
      
      {/* Footer Stats */}
      <div className="flex-shrink-0 px-4 py-3 bg-white border-t border-slate-200">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <span className="text-slate-500">Total:</span>
              <span className="font-semibold text-slate-900">{projects.length}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-slate-500">Active:</span>
              <span className="font-semibold text-slate-900">
                {projects.filter(p => p.status === 'Active').length}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-emerald-500 rounded-full" title="Healthy" />
            <span className="text-slate-500">System</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectSidebar;