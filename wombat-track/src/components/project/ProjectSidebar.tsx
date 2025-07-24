import React, { useState, useMemo } from 'react';
import { Disclosure } from '@headlessui/react';
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
      return <CheckCircle className={cn(className, 'text-emerald-500')} />;
    case 'in_progress':
    case 'Active':
      return <Clock className={cn(className, 'text-amber-500')} />;
    case 'not_started':
    case 'Planned':
      return <Circle className={cn(className, 'text-slate-400')} />;
    case 'failed':
    case 'Blocked':
      return <XCircle className={cn(className, 'text-red-500')} />;
    case 'Paused':
      return <AlertCircle className={cn(className, 'text-orange-500')} />;
    case 'Archived':
      return <Archive className={cn(className, 'text-slate-500')} />;
    default:
      return <Circle className={cn(className, 'text-slate-400')} />;
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

// Step Item Component
const StepItem: React.FC<{ step: PhaseStep }> = ({ step }) => (
  <div className="flex items-center gap-2 px-4 py-1.5 text-sm text-slate-600 hover:bg-slate-50 rounded">
    {getStatusIcon(step.status || 'not_started', 'w-3 h-3')}
    <span className="truncate">{step.name}</span>
  </div>
);

// Phase Item Component
const PhaseItem: React.FC<{ phase: Phase }> = ({ phase }) => {
  const isSideQuest = phase.name.toLowerCase().includes('side quest');
  
  return (
    <Disclosure>
      {({ open }) => (
        <div className="space-y-1">
          <Disclosure.Button className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium text-left hover:bg-slate-50 rounded-md transition-colors">
            <div className="flex items-center gap-2 min-w-0">
              <ChevronRight
                className={cn('w-4 h-4 text-slate-400 transition-transform flex-shrink-0', open && 'rotate-90')}
              />
              {isSideQuest && <Sword className="w-4 h-4 text-purple-500 flex-shrink-0" />}
              <span className="truncate">{phase.name}</span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {getRagBadge(phase.ragStatus)}
              {phase.steps && (
                <span className="text-xs text-slate-400">{phase.steps.length}</span>
              )}
            </div>
          </Disclosure.Button>
          {phase.steps && phase.steps.length > 0 && (
            <Disclosure.Panel className="pl-6 space-y-0.5">
              {phase.steps.map(step => (
                <StepItem key={step.id} step={step} />
              ))}
            </Disclosure.Panel>
          )}
        </div>
      )}
    </Disclosure>
  );
};

// Project Item Component
const ProjectItem: React.FC<{ 
  project: Project; 
  isSelected: boolean;
  onSelect: () => void;
}> = ({ project, isSelected, onSelect }) => {
  const hasUnknownStatus = !project.wtTag || project.wtTag === 'wtPhaseUnknown';
  
  return (
    <Disclosure>
      {({ open }) => (
        <div className={cn(
          'mb-2 rounded-lg border transition-colors',
          isSelected ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300'
        )}>
          <Disclosure.Button
            onClick={onSelect}
            className={cn(
              'flex items-center justify-between w-full px-4 py-3 text-left rounded-lg',
              'hover:bg-opacity-50 transition-colors'
            )}
          >
            <div className="flex items-center gap-2 min-w-0">
              {open ? (
                <FolderOpen className="w-5 h-5 text-slate-600 flex-shrink-0" />
              ) : (
                <Folder className="w-5 h-5 text-slate-500 flex-shrink-0" />
              )}
              <div className="min-w-0">
                <h3 className={cn(
                  'font-semibold truncate',
                  isSelected ? 'text-blue-900' : 'text-slate-900'
                )}>
                  {project.name}
                </h3>
                {project.description && (
                  <p className="text-xs text-slate-500 truncate">{project.description}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {hasUnknownStatus && <AlertTriangle className="w-4 h-4 text-amber-500" />}
              {getStatusIcon(project.status || 'Planned')}
            </div>
          </Disclosure.Button>
          {project.phases && project.phases.length > 0 && (
            <Disclosure.Panel className="px-3 pb-3">
              <div className="pl-2 space-y-1">
                {project.phases
                  .sort((a, b) => a.order - b.order)
                  .map(phase => (
                    <PhaseItem key={phase.id} phase={phase} />
                  ))}
              </div>
            </Disclosure.Panel>
          )}
        </div>
      )}
    </Disclosure>
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
                              project.description?.toLowerCase().includes(query);
        
        const matchesPhase = project.phases?.some(phase =>
          phase.name.toLowerCase().includes(query)
        );
        
        const matchesStep = project.phases?.some(phase =>
          phase.steps?.some(step =>
            step.name.toLowerCase().includes(query)
          )
        );
        
        if (!matchesProject && !matchesPhase && !matchesStep) {
          return false;
        }
      }
      
      // RAG filter
      if (showOnlyRag && !project.phases?.some(phase => phase.ragStatus)) {
        return false;
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
  
  const renderProjects = (projectList: Project[]) => (
    <div className="space-y-2">
      {projectList.map(project => (
        <ProjectItem
          key={project.id}
          project={project}
          isSelected={project.id === selectedProjectId}
          onSelect={() => onProjectSelect(project.id)}
        />
      ))}
    </div>
  );
  
  return (
    <div className={cn('w-64 h-full bg-slate-50 border-r border-slate-200 flex flex-col', className)}>
      {/* Header */}
      <div className="p-4 bg-white border-b border-slate-200">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Projects</h2>
        
        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projects..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        {/* Filters */}
        <div className="flex items-center gap-2">
          <select
            value={showLifecycle}
            onChange={(e) => setShowLifecycle(e.target.value as ProjectLifecycle | 'all')}
            className="flex-1 text-sm bg-white border border-slate-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Projects</option>
            <option value="current">Current</option>
            <option value="completed">Completed</option>
            <option value="future">Future</option>
          </select>
          
          <button
            onClick={() => setShowOnlyRag(!showOnlyRag)}
            className={cn(
              'px-3 py-1.5 text-sm font-medium border rounded-md transition-colors',
              showOnlyRag
                ? 'bg-blue-100 border-blue-300 text-blue-700'
                : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
            )}
          >
            <Filter className="w-3.5 h-3.5 inline mr-1" />
            RAG
          </button>
        </div>
      </div>
      
      {/* Project List */}
      <div className="flex-1 overflow-y-auto p-4">
        {showLifecycle === 'all' ? (
          <>
            {projectsByLifecycle.current.length > 0 && (
              <div className="mb-6">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Current Projects
                </h3>
                {renderProjects(projectsByLifecycle.current)}
              </div>
            )}
            {projectsByLifecycle.completed.length > 0 && (
              <div className="mb-6">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Completed Projects
                </h3>
                {renderProjects(projectsByLifecycle.completed)}
              </div>
            )}
            {projectsByLifecycle.future.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Future Projects
                </h3>
                {renderProjects(projectsByLifecycle.future)}
              </div>
            )}
          </>
        ) : (
          renderProjects(filteredProjects)
        )}
        
        {filteredProjects.length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm text-slate-500">No projects found</p>
          </div>
        )}
      </div>
      
      {/* Footer */}
      <div className="p-3 bg-white border-t border-slate-200">
        <button className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors">
          <Plus className="w-4 h-4" />
          New Project
        </button>
      </div>
    </div>
  );
};

export default ProjectSidebar;