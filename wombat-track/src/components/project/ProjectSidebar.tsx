import React, { useState, useMemo } from 'react';
import { 
  ChevronRight, 
  ChevronDown,
  CheckCircle,
  Circle,
  AlertCircle,
  XCircle,
  ChevronUp,
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
  switch (status) {
    case 'complete':
    case 'Complete':
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case 'in_progress':
    case 'Active':
      return <Clock className="w-4 h-4 text-yellow-500 animate-pulse" />;
    case 'not_started':
    case 'Planned':
      return <Circle className="w-4 h-4 text-gray-400" />;
    case 'failed':
    case 'Blocked':
      return <XCircle className="w-4 h-4 text-red-500" />;
    case 'Paused':
      return <AlertCircle className="w-4 h-4 text-orange-500" />;
    case 'Archived':
      return <Archive className="w-4 h-4 text-gray-500" />;
    default:
      return <Circle className="w-4 h-4 text-gray-400" />;
  }
};

const getRagBadge = (ragStatus?: 'red' | 'amber' | 'green' | 'blue') => {
  if (!ragStatus) return null;
  
  const colors = {
    red: 'bg-red-500',
    amber: 'bg-amber-500',
    green: 'bg-green-500',
    blue: 'bg-blue-500'
  };
  
  return (
    <div className={cn(
      'w-2 h-2 rounded-full',
      colors[ragStatus]
    )} />
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
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [showLifecycle, setShowLifecycle] = useState<ProjectLifecycle | 'all'>('all');
  const [showOnlyRag, setShowOnlyRag] = useState(false);
  
  const toggleProject = (projectId: string) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
    } else {
      newExpanded.add(projectId);
    }
    setExpandedProjects(newExpanded);
  };
  
  const togglePhase = (phaseId: string) => {
    const newExpanded = new Set(expandedPhases);
    if (newExpanded.has(phaseId)) {
      newExpanded.delete(phaseId);
    } else {
      newExpanded.add(phaseId);
    }
    setExpandedPhases(newExpanded);
  };
  
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
  
  const renderStep = (step: PhaseStep) => (
    <div
      key={step.id}
      className="flex items-center gap-2 py-1 px-8 text-xs text-gray-600 hover:bg-gray-50"
    >
      {getStatusIcon(step.status || 'not_started')}
      <span className="truncate">{step.name}</span>
    </div>
  );
  
  const renderPhase = (phase: Phase, projectId: string) => {
    const isExpanded = expandedPhases.has(phase.id);
    const isSideQuest = phase.name.toLowerCase().includes('side quest');
    
    return (
      <div key={phase.id}>
        <button
          onClick={() => togglePhase(phase.id)}
          className="w-full flex items-center gap-2 py-1 px-4 text-sm hover:bg-gray-50"
        >
          <div className="flex items-center gap-1">
            {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            {isSideQuest && <Sword className="w-3 h-3 text-purple-500" />}
          </div>
          <span className="flex-1 text-left truncate">{phase.name}</span>
          {getRagBadge(phase.ragStatus)}
        </button>
        
        {isExpanded && phase.steps && (
          <div>
            {phase.steps.map(step => renderStep(step))}
          </div>
        )}
      </div>
    );
  };
  
  const renderProject = (project: Project) => {
    const isExpanded = expandedProjects.has(project.id);
    const isSelected = project.id === selectedProjectId;
    const hasUnknownStatus = !project.wtTag || project.wtTag === 'wtPhaseUnknown';
    
    return (
      <div key={project.id} className="border-b border-gray-100">
        <button
          onClick={() => {
            onProjectSelect(project.id);
            toggleProject(project.id);
          }}
          className={cn(
            'w-full flex items-center gap-2 py-2 px-2 hover:bg-gray-50',
            isSelected && 'bg-blue-50'
          )}
        >
          <div className="flex items-center gap-1">
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            {getProjectTypeBadge(project.projectType || 'Other')}
          </div>
          <span className="flex-1 text-left font-medium truncate">{project.name}</span>
          <div className="flex items-center gap-1">
            {hasUnknownStatus && <AlertTriangle className="w-4 h-4 text-yellow-500" />}
            {project.archived && <Archive className="w-4 h-4 text-gray-400" />}
            {getStatusIcon(project.status || 'Planned')}
          </div>
        </button>
        
        {isExpanded && project.phases && (
          <div className="bg-gray-50">
            {project.phases
              .sort((a, b) => a.order - b.order)
              .map(phase => renderPhase(phase, project.id))}
          </div>
        )}
      </div>
    );
  };
  
  const renderLifecycleSection = (title: string, icon: React.ReactNode, projects: Project[]) => {
    if (projects.length === 0) return null;
    
    return (
      <div className="mb-4">
        <div className="flex items-center gap-2 px-2 py-1 text-xs font-semibold text-gray-500 uppercase">
          {icon}
          <span>{title}</span>
          <span className="text-gray-400">({projects.length})</span>
        </div>
        <div>
          {projects.map(project => renderProject(project))}
        </div>
      </div>
    );
  };
  
  return (
    <div className={cn('flex flex-col h-full bg-white border-r border-gray-200', className)}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold mb-3">Projects</h2>
        
        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projects, phases, steps..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        {/* Filters */}
        <div className="flex items-center gap-2 mb-3">
          <select
            value={showLifecycle}
            onChange={(e) => setShowLifecycle(e.target.value as ProjectLifecycle | 'all')}
            className="text-sm border border-gray-200 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Projects</option>
            <option value="current">Current</option>
            <option value="completed">Completed</option>
            <option value="future">Future</option>
          </select>
          
          <button
            onClick={() => setShowOnlyRag(!showOnlyRag)}
            className={cn(
              'flex items-center gap-1 px-2 py-1 text-sm border rounded-md',
              showOnlyRag
                ? 'bg-blue-50 border-blue-300 text-blue-700'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            )}
          >
            <Filter className="w-3 h-3" />
            RAG
          </button>
        </div>
        
        {/* Quick Actions */}
        <button className="w-full flex items-center justify-center gap-2 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-md">
          <Plus className="w-4 h-4" />
          New Project
        </button>
      </div>
      
      {/* Project List */}
      <div className="flex-1 overflow-y-auto">
        {showLifecycle === 'all' ? (
          <>
            {renderLifecycleSection(
              'Current Projects',
              <Clock className="w-4 h-4" />,
              projectsByLifecycle.current
            )}
            {renderLifecycleSection(
              'Completed Projects',
              <CheckCircle className="w-4 h-4" />,
              projectsByLifecycle.completed
            )}
            {renderLifecycleSection(
              'Future Projects',
              <Beaker className="w-4 h-4" />,
              projectsByLifecycle.future
            )}
          </>
        ) : (
          <div className="p-2">
            {filteredProjects.map(project => renderProject(project))}
          </div>
        )}
        
        {filteredProjects.length === 0 && (
          <div className="p-4 text-center text-sm text-gray-500">
            No projects found
          </div>
        )}
      </div>
      
      {/* Footer Stats */}
      <div className="p-4 border-t border-gray-200 text-xs text-gray-500">
        <div className="flex justify-between">
          <span>Total Projects:</span>
          <span className="font-medium">{projects.length}</span>
        </div>
        <div className="flex justify-between mt-1">
          <span>Active:</span>
          <span className="font-medium">{projects.filter(p => p.status === 'Active').length}</span>
        </div>
      </div>
    </div>
  );
};

export default ProjectSidebar;