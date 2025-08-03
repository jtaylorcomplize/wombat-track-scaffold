import React, { useState, useEffect, useMemo } from 'react';
import { Folder, ExternalLink, Clock, Users, TrendingUp, Filter, Search, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { governanceLogger } from '../../services/enhancedGovernanceLogger';
import { useAllProjects } from '../../hooks/useOrbisAPI';

interface ProjectData {
  id: string;
  name: string;
  subAppId: string;
  subAppName: string;
  status: 'active' | 'on-hold' | 'completed' | 'planning';
  completionPercentage: number;
  owner: string;
  lastUpdated: Date;
  teamSize: number;
}

interface SubAppProjectGroup {
  subAppId: string;
  subAppName: string;
  projectCount: number;
  projects: ProjectData[];
}

// Skeleton loading component
const ProjectCardSkeleton: React.FC = () => (
  <div className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
    <div className="flex items-start justify-between mb-4">
      <div className="flex-1">
        <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
      <div className="h-8 w-8 bg-gray-200 rounded"></div>
    </div>
    <div className="space-y-3">
      <div className="h-4 bg-gray-200 rounded w-full"></div>
      <div className="h-4 bg-gray-200 rounded w-2/3"></div>
    </div>
  </div>
);

const AllProjectsDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('lastUpdated');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Memoize filters to prevent infinite re-renders
  const filters = useMemo(() => ({
    search: searchQuery || undefined,
    status: filterStatus !== 'all' ? filterStatus : undefined,
    priority: filterPriority !== 'all' ? filterPriority : undefined,
    sortBy,
    sortOrder: 'desc' as const,
    limit: 100
  }), [searchQuery, filterStatus, filterPriority, sortBy]);

  // Use real API data with live updates
  const { 
    data: projectsData, 
    loading: isLoading, 
    error, 
    lastUpdated,
    refresh,
    isLive 
  } = useAllProjects(filters);

  // Group projects by sub-app
  const projectGroups = React.useMemo(() => {
    if (!projectsData?.projects) return [];
    
    const groups = new Map<string, SubAppProjectGroup>();
    
    projectsData.projects.forEach(project => {
      if (!groups.has(project.subAppId)) {
        groups.set(project.subAppId, {
          subAppId: project.subAppId,
          subAppName: project.subAppName,
          projectCount: 0,
          projects: []
        });
      }
      
      const group = groups.get(project.subAppId)!;
      group.projects.push({
        id: project.id,
        name: project.name,
        subAppId: project.subAppId,
        subAppName: project.subAppName,
        status: project.status,
        completionPercentage: project.completionPercentage,
        owner: project.owner,
        lastUpdated: new Date(project.lastUpdated),
        teamSize: project.teamSize
      });
      group.projectCount = group.projects.length;
    });
    
    return Array.from(groups.values());
  }, [projectsData?.projects]);

  // Log governance event on component mount
  useEffect(() => {
    governanceLogger.logProjectSurfaceSelect('all-projects', undefined, 'direct_url');
  }, []);

  // Auto-expand groups with 3 or fewer projects
  useEffect(() => {
    if (projectGroups.length > 0) {
      const autoExpanded = new Set<string>();
      projectGroups.forEach(group => {
        if (group.projectCount <= 3) {
          autoExpanded.add(group.subAppId);
        }
      });
      setExpandedGroups(autoExpanded);
    }
  }, [projectGroups]);

  // Handle search with debouncing
  const [searchDebounce, setSearchDebounce] = useState<NodeJS.Timeout | null>(null);
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    
    if (searchDebounce) {
      clearTimeout(searchDebounce);
    }
    
    setSearchDebounce(setTimeout(() => {
      // The useAllProjects hook will automatically refetch with new search
    }, 500));
  };

  // Handle filter changes
  const handleStatusChange = (status: string) => {
    setFilterStatus(status);
    governanceLogger.logProjectSurfaceSelect('all-projects', 'all-projects', 'sidebar_click');
  };

  const handlePriorityChange = (priority: string) => {
    setFilterPriority(priority);
  };

  const handleSortChange = (newSortBy: string) => {
    setSortBy(newSortBy);
  };

  const navigateToProject = (subAppId: string, projectId: string, projectName: string) => {
    governanceLogger.logProjectSelect(
      projectId,
      subAppId,
      projectGroups.find(g => g.subAppId === subAppId)?.subAppName || 'Unknown',
      projectName,
      'all_projects'
    );
    
    navigate(`/orbis/sub-apps/${subAppId}/projects/${projectId}`);
  };

  const toggleGroupExpansion = (subAppId: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      const action = newSet.has(subAppId) ? 'collapse' : 'expand';
      
      if (newSet.has(subAppId)) {
        newSet.delete(subAppId);
      } else {
        newSet.add(subAppId);
      }
      
      // Log accordion interaction
      governanceLogger.logAccordionToggle(
        subAppId,
        action,
        Array.from(newSet)
      );
      
      return newSet;
    });
  };

  // Handle error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <TrendingUp className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Failed to Load Projects</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={refresh}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Calculate filtered projects count
  const totalProjects = projectGroups.reduce((sum, g) => sum + g.projects.length, 0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'on-hold': return 'bg-amber-100 text-amber-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'planning': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 50) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const formatRelativeTime = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return `${diffMinutes} minutes ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hours ago`;
    } else {
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays} days ago`;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-gray-900">All Projects</h1>
            <div className="flex items-center space-x-3">
              {/* Live Status Indicator */}
              <div className="flex items-center space-x-2 text-sm">
                {isLive ? (
                  <>
                    <Wifi className="w-4 h-4 text-green-600" />
                    <span className="text-green-600 font-medium">Live</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-4 h-4 text-amber-600" />
                    <span className="text-amber-600 font-medium">Polling</span>
                  </>
                )}
              </div>
              {/* Refresh Button */}
              <button
                onClick={refresh}
                disabled={isLoading}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50"
                title="Refresh data"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-gray-600">
              View and manage all projects across your sub-applications
            </p>
            {lastUpdated && (
              <p className="text-sm text-gray-500">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search projects or owners..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Filter className="w-5 h-5 text-gray-400" />
                <select
                  value={filterStatus}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="planning">Planning</option>
                  <option value="on-hold">On Hold</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div>
                <select
                  value={filterPriority}
                  onChange={(e) => handlePriorityChange(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Priority</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <div>
                <select
                  value={sortBy}
                  onChange={(e) => handleSortChange(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="lastUpdated">Last Updated</option>
                  <option value="name">Name</option>
                  <option value="completion">Completion</option>
                  <option value="priority">Priority</option>
                </select>
              </div>
            </div>
          </div>
          
          {/* Results Summary */}
          <div className="mt-4 text-sm text-gray-600">
            Showing {totalProjects} projects across {projectGroups.length} sub-applications
            {projectsData?.summary && (
              <span className="ml-4">
                • {projectsData.summary.active} active
                • {projectsData.summary.completed} completed
                • {projectsData.summary.onHold} on hold
              </span>
            )}
          </div>
        </div>

        {/* Project Groups */}
        {isLoading ? (
          <div className="space-y-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="space-y-4">
                <div className="h-8 bg-gray-200 rounded w-1/4 animate-pulse"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3].map(j => (
                    <ProjectCardSkeleton key={j} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : projectGroups.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <Folder className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No projects found</h3>
            <p className="text-gray-500">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="space-y-8">
            {projectGroups.map((group) => (
              <div key={group.subAppId}>
                {/* Sub-App Group Header */}
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={() => toggleGroupExpansion(group.subAppId)}
                    className="flex items-center space-x-3 text-left hover:text-blue-600 transition-colors"
                  >
                    <h2 className="text-xl font-semibold text-gray-900">
                      {group.subAppName}
                    </h2>
                    <span className="text-sm text-gray-500">
                      ({group.projects.length} {group.projects.length === 1 ? 'project' : 'projects'})
                    </span>
                    <svg
                      className={`w-5 h-5 text-gray-400 transition-transform ${
                        expandedGroups.has(group.subAppId) ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => navigate(`/orbis/sub-apps/${group.subAppId}`)}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    View in {group.subAppName} →
                  </button>
                </div>

                {/* Project Cards */}
                {expandedGroups.has(group.subAppId) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {group.projects.map((project) => (
                      <div
                        key={project.id}
                        className="bg-white rounded-lg border border-gray-200 p-6 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                        onClick={() => navigateToProject(project.subAppId, project.id, project.name)}
                      >
                        {/* Project Header */}
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-medium text-gray-900 truncate">
                              {project.name}
                            </h3>
                            <p className="text-sm text-gray-500">{project.owner}</p>
                          </div>
                          <ExternalLink className="w-5 h-5 text-gray-400 ml-2" />
                        </div>

                        {/* Status and Progress */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              getStatusColor(project.status)
                            }`}>
                              {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                            </span>
                            <div className="flex items-center space-x-1 text-sm text-gray-500">
                              <Users className="w-4 h-4" />
                              <span>{project.teamSize}</span>
                            </div>
                          </div>

                          {/* Progress Bar */}
                          <div>
                            <div className="flex items-center justify-between text-sm mb-1">
                              <span className="text-gray-600">Progress</span>
                              <span className="font-medium">{project.completionPercentage}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all ${getProgressColor(project.completionPercentage)}`}
                                style={{ width: `${project.completionPercentage}%` }}
                              />
                            </div>
                          </div>

                          {/* Last Updated */}
                          <div className="flex items-center space-x-1 text-xs text-gray-500">
                            <Clock className="w-3 h-3" />
                            <span>Updated {formatRelativeTime(project.lastUpdated)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AllProjectsDashboard;