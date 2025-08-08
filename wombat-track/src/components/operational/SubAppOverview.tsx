import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Building,
  Users,
  FileText,
  Folder,
  Target,
  Shield,
  BarChart3,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ExternalLink,
  Settings,
  TrendingUp,
  Activity
} from 'lucide-react';

interface Project {
  projectId: string;
  projectName: string;
  name?: string;
  description?: string;
  goals?: string;
  owner?: string;
  status?: string;
  completionPercentage?: number;
  lastUpdated?: string;
  endDate?: string;
  RAG?: string;
}

interface SubAppInfo {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'warning' | 'error';
  lastUpdated: string;
  version: string;
  launchUrl: string;
  metrics: {
    totalProjects: number;
    activeProjects: number;
    completedProjects: number;
    totalUsers: number;
    uptime: number;
    avgResponseTime: number;
  };
  projects: Project[];
  recentActivity: Array<{
    id: string;
    type: string;
    description: string;
    timestamp: Date;
    user: string;
  }>;
  quickActions: Array<{
    id: string;
    label: string;
    icon: string;
    action: string;
    url: string;
  }>;
}

const SubAppOverview: React.FC = () => {
  const { subAppId } = useParams<{ subAppId: string }>();
  const navigate = useNavigate();
  const [subAppInfo, setSubAppInfo] = useState<SubAppInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'overview' | 'projects' | 'team' | 'planning' | 'governance'>('overview');

  // Fetch SubApp data from canonical API
  useEffect(() => {
    const fetchSubAppData = async () => {
      if (!subAppId) {
        setError('SubApp ID is required');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const response = await fetch(`/api/orbis/sub-apps/${subAppId}?includeDetails=true`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch SubApp data');
        }
        
        setSubAppInfo(result.data);
      } catch (err) {
        console.error('Error fetching SubApp data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load SubApp data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubAppData();
  }, [subAppId]);

  const formatRelativeTime = (dateString: string | Date) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'text-green-600 bg-green-100';
      case 'warning':
        return 'text-amber-600 bg-amber-100';
      case 'error':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-gray-100 rounded-lg h-24"></div>
          ))}
        </div>
        <div className="bg-gray-100 rounded-lg h-96"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center space-x-2 text-red-700 mb-2">
          <XCircle size={20} />
          <h3 className="font-semibold">Error Loading SubApp</h3>
        </div>
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-md transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!subAppInfo) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">SubApp Not Found</h3>
        <p className="text-gray-600">The requested SubApp could not be found.</p>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'projects', label: 'Projects', icon: Folder },
    { id: 'team', label: 'Team', icon: Users },
    { id: 'planning', label: 'Strategic Planning', icon: Target },
    { id: 'governance', label: 'Governance & Audit', icon: Shield },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
              <Building className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{subAppInfo.name}</h1>
              <p className="text-gray-600">{subAppInfo.description}</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(subAppInfo.status)}`}>
              {subAppInfo.status}
            </span>
            <a
              href={subAppInfo.launchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ExternalLink size={16} />
              <span>Launch</span>
            </a>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Projects</p>
              <p className="text-2xl font-bold text-gray-900">{subAppInfo.metrics.totalProjects}</p>
            </div>
            <Folder className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Projects</p>
              <p className="text-2xl font-bold text-green-600">{subAppInfo.metrics.activeProjects}</p>
            </div>
            <Activity className="w-8 h-8 text-green-600" />
          </div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Users</p>
              <p className="text-2xl font-bold text-purple-600">{subAppInfo.metrics.totalUsers}</p>
            </div>
            <Users className="w-8 h-8 text-purple-600" />
          </div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Uptime</p>
              <p className="text-2xl font-bold text-emerald-600">{subAppInfo.metrics.uptime.toFixed(1)}%</p>
            </div>
            <TrendingUp className="w-8 h-8 text-emerald-600" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex items-center space-x-2 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon size={16} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Project Analytics Card */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Project Analytics</h3>
                    <BarChart3 className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Completion Rate:</span>
                      <span className="text-sm font-medium text-gray-900">
                        {subAppInfo.metrics.totalProjects > 0 
                          ? Math.round((subAppInfo.metrics.completedProjects / subAppInfo.metrics.totalProjects) * 100)
                          : 0}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Response Time:</span>
                      <span className="text-sm font-medium text-gray-900">{subAppInfo.metrics.avgResponseTime}ms</span>
                    </div>
                  </div>
                </div>

                {/* Team Overview Card */}
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Team Overview</h3>
                    <Users className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Active Users:</span>
                      <span className="text-sm font-medium text-gray-900">{subAppInfo.metrics.totalUsers}</span>
                    </div>
                    <div className="text-center py-4">
                      <p className="text-sm text-gray-600">Team management features coming soon</p>
                    </div>
                  </div>
                </div>

                {/* Strategic Planning Card */}
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Strategic Planning</h3>
                    <Target className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-600">Strategic planning integration in development</p>
                    <p className="text-xs text-gray-500 mt-1">Roadmaps, initiatives, and milestone tracking</p>
                  </div>
                </div>

                {/* Governance Card */}
                <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Governance & Audit</h3>
                    <Shield className="w-6 h-6 text-amber-600" />
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Version:</span>
                      <span className="text-sm font-medium text-gray-900">{subAppInfo.version}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Last Updated:</span>
                      <span className="text-sm font-medium text-gray-900">
                        {formatRelativeTime(subAppInfo.lastUpdated)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Projects Tab */}
          {activeTab === 'projects' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                  <Folder className="w-5 h-5 text-blue-600" />
                  <span>Projects ({subAppInfo.projects.length})</span>
                </h2>
                <button
                  onClick={() => navigate(`/orbis/sub-apps/${subAppId}/projects`)}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  View All Projects →
                </button>
              </div>

              {/* Project Status Summary */}
              {subAppInfo.projects.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <div className="text-lg font-semibold text-blue-600">
                      {subAppInfo.projects.filter(p => p.status?.toLowerCase() === 'active').length}
                    </div>
                    <div className="text-xs text-gray-600">Active</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-green-600">
                      {subAppInfo.projects.filter(p => p.status?.toLowerCase() === 'completed').length}
                    </div>
                    <div className="text-xs text-gray-600">Completed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-red-600">
                      {subAppInfo.projects.filter(p => p.RAG?.toLowerCase() === 'red').length}
                    </div>
                    <div className="text-xs text-gray-600">At Risk</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-gray-900">
                      {subAppInfo.projects.length > 0 
                        ? Math.round(subAppInfo.projects.reduce((acc, p) => acc + (p.completionPercentage || 0), 0) / subAppInfo.projects.length)
                        : 0}%
                    </div>
                    <div className="text-xs text-gray-600">Avg Progress</div>
                  </div>
                </div>
              )}

              {/* Recent Projects Grid */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {subAppInfo.projects.slice(0, 6).map((project: any) => (
                  <div key={project.projectId} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-gray-900 truncate">
                        {project.projectName || project.name}
                      </h4>
                      <div className="flex space-x-1">
                        {project.RAG && (
                          <span className={`inline-block w-2 h-2 rounded-full ${
                            project.RAG === 'Green' ? 'bg-green-500' :
                            project.RAG === 'Amber' ? 'bg-amber-500' : 'bg-red-500'
                          }`}></span>
                        )}
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {project.description || project.goals || 'No description available'}
                    </p>

                    {/* Progress Bar */}
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>Progress</span>
                        <span>{project.completionPercentage || 0}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${project.completionPercentage || 0}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Meta Information */}
                    <div className="text-xs text-gray-500 space-y-1">
                      <div className="flex justify-between">
                        <span>Owner:</span>
                        <span>{project.owner || 'Unassigned'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Status:</span>
                        <span className="capitalize">{project.status || 'Unknown'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Updated:</span>
                        <span>{formatRelativeTime(project.lastUpdated || new Date())}</span>
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-between">
                      <Link
                        to={`/orbis/sub-apps/${subAppId}/projects/${project.projectId}/plan`}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        View Details
                      </Link>
                      <span className="text-xs text-gray-400">
                        {project.endDate ? new Date(project.endDate).toLocaleDateString() : 'No end date'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Team Tab */}
          {activeTab === 'team' && (
            <div className="space-y-6">
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Team Overview</h3>
                <p className="text-gray-600 mb-4">
                  Team management features will be available once team API integration is complete.
                </p>
                <div className="text-sm text-gray-500">
                  Features planned: Team allocation, performance tracking, resource utilization
                </div>
              </div>
            </div>
          )}

          {/* Strategic Planning Tab */}
          {activeTab === 'planning' && (
            <div className="space-y-6">
              <div className="text-center py-12">
                <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Strategic Planning</h3>
                <p className="text-gray-600 mb-4">
                  Strategic planning features will show roadmaps and initiatives for this SubApp.
                </p>
                <div className="text-sm text-gray-500">
                  Features planned: Roadmaps, strategic initiatives, milestone tracking
                </div>
              </div>
            </div>
          )}

          {/* Governance Tab */}
          {activeTab === 'governance' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Governance Snapshot</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">SubApp ID:</span>
                      <span className="text-sm font-medium text-gray-900">{subAppInfo.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Status:</span>
                      <span className={`text-sm font-medium ${subAppInfo.status === 'active' ? 'text-green-600' : 'text-amber-600'}`}>
                        {subAppInfo.status}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Last Updated:</span>
                      <span className="text-sm font-medium text-gray-900">
                        {formatRelativeTime(subAppInfo.lastUpdated)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Projects:</span>
                      <span className="text-sm font-medium text-gray-900">{subAppInfo.metrics.totalProjects}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Audit Trail</h3>
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm">Governance logs and audit trails</p>
                    <p className="text-xs text-gray-400 mt-1">Integration with governance logging system</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubAppOverview;