import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ExternalLink, Users, Calendar, Filter, Search, Plus, ArrowLeft } from 'lucide-react';
import { governanceLogger } from '../../services/governanceLogger';

interface Project {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'on-hold' | 'completed' | 'planning';
  priority: 'low' | 'medium' | 'high' | 'critical';
  completionPercentage: number;
  owner: string;
  teamSize: number;
  startDate: Date;
  endDate: Date;
  budget: {
    allocated: number;
    spent: number;
  };
  tags: string[];
  lastUpdated: Date;
}

// Skeleton component
const ProjectCardSkeleton: React.FC = () => (
  <div className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
    <div className="flex items-start justify-between mb-4">
      <div className="flex-1">
        <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
      </div>
      <div className="h-8 w-8 bg-gray-200 rounded ml-4"></div>
    </div>
    <div className="space-y-3">
      <div className="h-4 bg-gray-200 rounded w-full"></div>
      <div className="h-4 bg-gray-200 rounded w-2/3"></div>
    </div>
  </div>
);

const SubAppProjectsList: React.FC = () => {
  const { subAppId } = useParams<{ subAppId: string }>();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [subAppName, setSubAppName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [sortBy, setSortBy] = useState('lastUpdated');

  // Fetch projects for this sub-app
  useEffect(() => {
    const fetchProjects = async () => {
      if (!subAppId) return;
      
      setIsLoading(true);
      try {
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Mock project data by sub-app
        const projectData: Record<string, { name: string; projects: Project[] }> = {
          'prog-orbis-001': {
            name: 'Orbis Intelligence',
            projects: [
              {
                id: 'proj-001',
                name: 'Market Analysis Platform',
                description: 'Advanced market research and competitive analysis dashboard with real-time data integration',
                status: 'active',
                priority: 'high',
                completionPercentage: 75,
                owner: 'Sarah Chen',
                teamSize: 8,
                startDate: new Date('2024-01-15'),
                endDate: new Date('2025-04-30'),
                budget: {
                  allocated: 500000,
                  spent: 375000
                },
                tags: ['Analytics', 'Dashboard', 'Real-time'],
                lastUpdated: new Date(Date.now() - 2 * 60 * 60 * 1000)
              },
              {
                id: 'proj-002',
                name: 'Customer Insights Dashboard',
                description: 'Comprehensive customer behavior analysis and segmentation platform',
                status: 'active',
                priority: 'medium',
                completionPercentage: 90,
                owner: 'Michael Park',
                teamSize: 5,
                startDate: new Date('2024-03-01'),
                endDate: new Date('2025-02-28'),
                budget: {
                  allocated: 320000,
                  spent: 288000
                },
                tags: ['Customer Analytics', 'Segmentation', 'ML'],
                lastUpdated: new Date(Date.now() - 24 * 60 * 60 * 1000)
              },
              {
                id: 'proj-003',
                name: 'Predictive Analytics Engine',
                description: 'Machine learning-powered predictive analytics for business forecasting',
                status: 'on-hold',
                priority: 'high',
                completionPercentage: 40,
                owner: 'Lisa Wang',
                teamSize: 12,
                startDate: new Date('2024-05-01'),
                endDate: new Date('2025-08-31'),
                budget: {
                  allocated: 750000,
                  spent: 300000
                },
                tags: ['Machine Learning', 'Forecasting', 'AI'],
                lastUpdated: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
              }
            ]
          },
          'prog-complize-001': {
            name: 'Complize Platform',
            projects: [
              {
                id: 'proj-004',
                name: 'Regulatory Compliance Tracker',
                description: 'Automated regulatory compliance monitoring and reporting system',
                status: 'active',
                priority: 'critical',
                completionPercentage: 60,
                owner: 'James Wilson',
                teamSize: 6,
                startDate: new Date('2024-06-01'),
                endDate: new Date('2025-05-31'),
                budget: {
                  allocated: 450000,
                  spent: 270000
                },
                tags: ['Compliance', 'Automation', 'Reporting'],
                lastUpdated: new Date(Date.now() - 4 * 60 * 60 * 1000)
              },
              {
                id: 'proj-005',
                name: 'Audit Trail System',
                description: 'Comprehensive audit logging and trail management system',
                status: 'completed',
                priority: 'medium',
                completionPercentage: 100,
                owner: 'Emma Thompson',
                teamSize: 4,
                startDate: new Date('2024-02-01'),
                endDate: new Date('2024-11-30'),
                budget: {
                  allocated: 280000,
                  spent: 275000
                },
                tags: ['Audit', 'Logging', 'Security'],
                lastUpdated: new Date(Date.now() - 48 * 60 * 60 * 1000)
              }
            ]
          },
          'prog-visacalc-001': {
            name: 'VisaCalc Pro',
            projects: [
              {
                id: 'proj-006',
                name: 'Visa Processing Automation',
                description: 'Automated visa application processing and workflow management',
                status: 'active',
                priority: 'high',
                completionPercentage: 85,
                owner: 'Roberto Silva',
                teamSize: 10,
                startDate: new Date('2024-03-01'),
                endDate: new Date('2025-02-28'),
                budget: {
                  allocated: 750000,
                  spent: 637500
                },
                tags: ['Automation', 'Workflow', 'Government'],
                lastUpdated: new Date(Date.now() - 1 * 60 * 60 * 1000)
              },
              {
                id: 'proj-007',
                name: 'Document Verification System',
                description: 'AI-powered document verification and fraud detection system',
                status: 'active',
                priority: 'medium',
                completionPercentage: 70,
                owner: 'Anna Petrova',
                teamSize: 7,
                startDate: new Date('2024-04-01'),
                endDate: new Date('2025-03-31'),
                budget: {
                  allocated: 540000,
                  spent: 378000
                },
                tags: ['AI', 'Verification', 'Security'],
                lastUpdated: new Date(Date.now() - 6 * 60 * 60 * 1000)
              },
              {
                id: 'proj-008',
                name: 'Multi-Country Support',
                description: 'Internationalization and multi-country visa processing support',
                status: 'planning',
                priority: 'medium',
                completionPercentage: 30,
                owner: 'David Kim',
                teamSize: 15,
                startDate: new Date('2024-08-01'),
                endDate: new Date('2025-12-31'),
                budget: {
                  allocated: 850000,
                  spent: 255000
                },
                tags: ['Internationalization', 'Localization', 'Scale'],
                lastUpdated: new Date(Date.now() - 12 * 60 * 60 * 1000)
              },
              {
                id: 'proj-009',
                name: 'Mobile App Development',
                description: 'Mobile application for visa status tracking and document submission',
                status: 'on-hold',
                priority: 'low',
                completionPercentage: 20,
                owner: 'Maria Garcia',
                teamSize: 5,
                startDate: new Date('2024-07-01'),
                endDate: new Date('2025-06-30'),
                budget: {
                  allocated: 420000,
                  spent: 84000
                },
                tags: ['Mobile', 'React Native', 'User Experience'],
                lastUpdated: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
              }
            ]
          }
        };

        const data = projectData[subAppId];
        if (data) {
          setSubAppName(data.name);
          setProjects(data.projects);

          // Log governance event
          governanceLogger.logSidebarInteraction({
            action: 'projects_list_view',
            target: data.name,
            context: 'sub_app_projects',
            metadata: {
              sub_app_id: subAppId,
              projects_count: data.projects.length,
              active_projects: data.projects.filter(p => p.status === 'active').length
            }
          });
        }
        
      } catch (error) {
        console.error('Failed to fetch projects:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjects();
  }, [subAppId]);

  const navigateToProject = (projectId: string, projectName: string) => {
    governanceLogger.logSidebarInteraction({
      action: 'project_switch',
      target: projectName,
      context: 'sub_app_projects_list',
      metadata: {
        sub_app_id: subAppId,
        project_id: projectId,
        from_view: 'projects_list'
      }
    });
    
    navigate(`/orbis/sub-apps/${subAppId}/projects/${projectId}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'on-hold': return 'bg-amber-100 text-amber-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'planning': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 50) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatRelativeTime = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return `${diffMinutes}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else {
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    }
  };

  // Filter and sort projects
  const filteredProjects = projects
    .filter(project => {
      const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          project.owner.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          project.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || project.priority === priorityFilter;
      return matchesSearch && matchesStatus && matchesPriority;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'priority': {
          const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
          return (priorityOrder[b.priority as keyof typeof priorityOrder] || 0) - 
                 (priorityOrder[a.priority as keyof typeof priorityOrder] || 0);
        }
        case 'completion':
          return b.completionPercentage - a.completionPercentage;
        case 'lastUpdated':
        default:
          return b.lastUpdated.getTime() - a.lastUpdated.getTime();
      }
    });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <button
              onClick={() => navigate(`/orbis/sub-apps/${subAppId}`)}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              aria-label="Back to sub-app overview"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{subAppName} Projects</h1>
              <p className="text-gray-600">
                Manage all projects within {subAppName}
              </p>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing {filteredProjects.length} of {projects.length} projects
            </div>
            <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <Plus className="w-4 h-4" />
              <span>New Project</span>
            </button>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search projects, owners, or descriptions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="planning">Planning</option>
                <option value="active">Active</option>
                <option value="on-hold">On Hold</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            {/* Priority Filter */}
            <div>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Priority</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            {/* Sort */}
            <div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="lastUpdated">Last Updated</option>
                <option value="name">Name</option>
                <option value="priority">Priority</option>
                <option value="completion">Completion</option>
              </select>
            </div>
          </div>
        </div>

        {/* Projects Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <ProjectCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <div className="text-gray-400 mb-4">
              <Search className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No projects found</h3>
            <p className="text-gray-500 mb-4">Try adjusting your search or filters</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
                setPriorityFilter('all');
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <div
                key={project.id}
                className="bg-white rounded-lg border border-gray-200 p-6 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                onClick={() => navigateToProject(project.id, project.name)}
              >
                {/* Project Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-medium text-gray-900 truncate mb-1">
                      {project.name}
                    </h3>
                    <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                      {project.description}
                    </p>
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        getStatusColor(project.status)
                      }`}>
                        {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                        getPriorityColor(project.priority)
                      }`}>
                        {project.priority.charAt(0).toUpperCase() + project.priority.slice(1)}
                      </span>
                    </div>
                  </div>
                  <ExternalLink className="w-5 h-5 text-gray-400 ml-2 flex-shrink-0" />
                </div>

                {/* Progress */}
                <div className="mb-4">
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

                {/* Project Details */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Owner:</span>
                    <span className="font-medium text-gray-900">{project.owner}</span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-1 text-gray-600">
                      <Users className="w-4 h-4" />
                      <span>Team Size:</span>
                    </div>
                    <span className="font-medium text-gray-900">{project.teamSize}</span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Budget:</span>
                    <span className="font-medium text-gray-900">
                      {formatCurrency(project.budget.spent)} / {formatCurrency(project.budget.allocated)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-1 text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span>End Date:</span>
                    </div>
                    <span className="font-medium text-gray-900">
                      {project.endDate.toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Updated:</span>
                    <span className="text-gray-500">{formatRelativeTime(project.lastUpdated)}</span>
                  </div>
                </div>

                {/* Tags */}
                {project.tags.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex flex-wrap gap-1">
                      {project.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600"
                        >
                          {tag}
                        </span>
                      ))}
                      {project.tags.length > 3 && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                          +{project.tags.length - 3} more
                        </span>
                      )}
                    </div>
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

export default SubAppProjectsList;