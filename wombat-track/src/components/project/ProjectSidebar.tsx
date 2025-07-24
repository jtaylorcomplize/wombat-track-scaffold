import React, { useState, useMemo } from 'react';
import { Disclosure } from '@headlessui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronRight, 
  ChevronDown,
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
  AlertTriangle
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

const getStatusIcon = (status: string) => {
  const iconClass = "w-4 h-4";
  
  switch (status) {
    case 'complete':
    case 'Complete':
      return <CheckCircle className={cn(iconClass, "text-status-complete")} />;
    case 'in_progress':
    case 'Active':
      return <Clock className={cn(iconClass, "text-status-progress animate-pulse-slow")} />;
    case 'not_started':
    case 'Planned':
      return <Circle className={cn(iconClass, "text-status-pending")} />;
    case 'failed':
    case 'Blocked':
      return <XCircle className={cn(iconClass, "text-status-error")} />;
    case 'Paused':
      return <AlertCircle className={cn(iconClass, "text-status-blocked")} />;
    case 'Archived':
      return <Archive className={cn(iconClass, "text-gray-500")} />;
    default:
      return <Circle className={cn(iconClass, "text-status-pending")} />;
  }
};

const getRagBadge = (ragStatus?: 'red' | 'amber' | 'green' | 'blue') => {
  if (!ragStatus) return null;
  
  const colors = {
    red: 'bg-rag-red',
    amber: 'bg-rag-amber',
    green: 'bg-rag-green',
    blue: 'bg-rag-blue'
  };
  
  return (
    <div className={cn('w-2 h-2 rounded-full', colors[ragStatus])} />
  );
};

const getProjectTypeBadge = (projectType: string) => {
  const badges: Record<string, { icon: React.ElementType; className: string }> = {
    'R&D': { icon: Beaker, className: 'text-purple-500' },
    'Platform': { icon: Briefcase, className: 'text-blue-500' },
    'execution-console': { icon: Briefcase, className: 'text-indigo-500' },
    'Other': { icon: Circle, className: 'text-gray-500' }
  };
  
  const badge = badges[projectType] || badges.Other;
  const Icon = badge.icon;
  
  return <Icon className={cn('w-3 h-3', badge.className)} />;
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
  
  const StepComponent: React.FC<{ step: PhaseStep }> = ({ step }) => (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      className="flex items-center gap-2 py-1 px-8 text-xs text-gray-600 hover:bg-gray-50 rounded-md mx-2"
    >
      {getStatusIcon(step.status || 'not_started')}
      <span className="truncate flex-1">{step.name}</span>
    </motion.div>
  );
  
  const PhaseComponent: React.FC<{ phase: Phase; projectId: string }> = ({ phase, projectId }) => {
    const isSideQuest = phase.name.toLowerCase().includes('side quest');
    
    return (
      <Disclosure>
        {({ open }) => (
          <>
            <Disclosure.Button className="w-full flex items-center gap-2 py-2 px-4 text-sm hover:bg-gray-50 rounded-md mx-2 group focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset">
              <div className="flex items-center gap-1">
                <ChevronRight 
                  className={cn(
                    'w-3 h-3 transition-transform duration-200',
                    open && 'rotate-90'
                  )} 
                />
                {isSideQuest && <Sword className="w-3 h-3 text-purple-500" />}
              </div>
              <span className="flex-1 text-left truncate group-hover:text-gray-900">{phase.name}</span>
              {getRagBadge(phase.ragStatus)}
            </Disclosure.Button>
            
            <AnimatePresence>
              {open && (
                <Disclosure.Panel
                  as={motion.div}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  {phase.steps?.map(step => (
                    <StepComponent key={step.id} step={step} />
                  ))}
                </Disclosure.Panel>
              )}
            </AnimatePresence>
          </>
        )}
      </Disclosure>
    );
  };
  
  const ProjectComponent: React.FC<{ project: Project }> = ({ project }) => {
    const isSelected = project.id === selectedProjectId;
    const hasUnknownStatus = !project.wtTag || project.wtTag === 'wtPhaseUnknown';
    
    return (
      <Disclosure>
        {({ open }) => (
          <div className={cn(
            'border-b border-gray-100 last:border-b-0',
            isSelected && 'bg-blue-50'
          )}>
            <Disclosure.Button
              onClick={() => onProjectSelect(project.id)}
              className={cn(
                'w-full flex items-center gap-2 py-3 px-3 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset rounded-md mx-1',
                isSelected && 'bg-blue-50 hover:bg-blue-100'
              )}
            >
              <div className="flex items-center gap-1">
                <ChevronRight 
                  className={cn(
                    'w-4 h-4 transition-transform duration-200',
                    open && 'rotate-90'
                  )} 
                />
                {getProjectTypeBadge(project.projectType || 'Other')}
              </div>
              <span className="flex-1 text-left font-medium truncate text-gray-900">{project.name}</span>
              <div className="flex items-center gap-1">
                {hasUnknownStatus && (
                  <AlertTriangle 
                    className="w-4 h-4 text-yellow-500" 
                    aria-label="Needs Review"
                  />
                )}
                {project.archived && <Archive className="w-4 h-4 text-gray-400" />}
                {getStatusIcon(project.status || 'Planned')}
              </div>
            </Disclosure.Button>
            
            <AnimatePresence>
              {open && (
                <Disclosure.Panel
                  as={motion.div}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden bg-gray-50"
                >
                  {project.phases
                    ?.sort((a, b) => a.order - b.order)
                    .map(phase => (
                      <PhaseComponent key={phase.id} phase={phase} projectId={project.id} />
                    ))}
                </Disclosure.Panel>
              )}
            </AnimatePresence>
          </div>
        )}
      </Disclosure>
    );
  };
  
  const LifecycleSectionComponent: React.FC<{ 
    title: string; 
    icon: React.ReactNode; 
    projects: Project[] 
  }> = ({ title, icon, projects }) => {
    if (projects.length === 0) return null;
    
    return (
      <div className="mb-6">
        <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
          {icon}
          <span>{title}</span>
          <span className="text-gray-400">({projects.length})</span>
        </div>
        <div className="space-y-1">
          {projects.map(project => (
            <ProjectComponent key={project.id} project={project} />
          ))}
        </div>
      </div>
    );
  };
  
  return (
    <div className={cn(
      'flex flex-col h-full bg-white border-r border-gray-200 shadow-sm',
      className
    )}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Projects</h2>
        
        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projects, phases, steps..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            aria-label="Search projects"
          />
        </div>
        
        {/* Filters */}
        <div className="flex items-center gap-2 mb-3">
          <select
            value={showLifecycle}
            onChange={(e) => setShowLifecycle(e.target.value as ProjectLifecycle | 'all')}
            className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
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
              'flex items-center gap-1 px-2 py-1 text-sm border rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500',
              showOnlyRag
                ? 'bg-blue-50 border-blue-300 text-blue-700'
                : 'border-gray-300 text-gray-600 hover:bg-gray-50'
            )}
            aria-label="Filter by RAG status"
            aria-pressed={showOnlyRag}
          >
            <Filter className="w-3 h-3" />
            RAG
          </button>
        </div>
        
        {/* Quick Actions */}
        <button className="w-full flex items-center justify-center gap-2 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500">
          <Plus className="w-4 h-4" />
          New Project
        </button>
      </div>
      
      {/* Project List */}
      <div className="flex-1 overflow-y-auto">
        {showLifecycle === 'all' ? (
          <div className="p-2">
            <LifecycleSectionComponent
              title="Current Projects"
              icon={<Clock className="w-4 h-4" />}
              projects={projectsByLifecycle.current}
            />
            <LifecycleSectionComponent
              title="Completed Projects"
              icon={<CheckCircle className="w-4 h-4" />}
              projects={projectsByLifecycle.completed}
            />
            <LifecycleSectionComponent
              title="Future Projects"
              icon={<Beaker className="w-4 h-4" />}
              projects={projectsByLifecycle.future}
            />
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {filteredProjects.map(project => (
              <ProjectComponent key={project.id} project={project} />
            ))}
          </div>
        )}
        
        {filteredProjects.length === 0 && (
          <div className="p-4 text-center text-sm text-gray-500">
            <div className="text-2xl mb-2">🔍</div>
            No projects found
          </div>
        )}
      </div>
      
      {/* Footer Stats */}
      <div className="p-4 border-t border-gray-200 text-xs text-gray-500 bg-gray-50">
        <div className="flex justify-between">
          <span>Total Projects:</span>
          <span className="font-medium text-gray-900">{projects.length}</span>
        </div>
        <div className="flex justify-between mt-1">
          <span>Active:</span>
          <span className="font-medium text-gray-900">
            {projects.filter(p => p.status === 'Active').length}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ProjectSidebar;