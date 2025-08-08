import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Users, BarChart3, AlertTriangle, ArrowRight, ExternalLink } from 'lucide-react';
import { governanceLogger } from '../../services/governanceLogger';

interface SubAppOverviewData {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'warning' | 'error';
  launchUrl: string;
  metrics: {
    totalProjects: number;
    activeProjects: number;
    totalUsers: number;
    uptime: number;
    avgResponseTime: number;
  };
  projects?: {
    total: number;
    active: number;
    recent: Array<{
      id: string;
      name: string;
      status: string;
      completionPercentage: number;
      lastUpdated: string;
    }>;
  };
}

const LoadingSkeleton: React.FC = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {[1, 2, 3, 4].map(i => (
      <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
        <div className="flex items-center justify-between mb-4">
          <div className="h-6 bg-gray-200 rounded w-32"></div>
          <div className="h-3 w-3 bg-gray-200 rounded-full"></div>
        </div>
        <div className="h-4 bg-gray-200 rounded w-full mb-3"></div>
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
        <div className="space-y-2">
          <div className="h-3 bg-gray-200 rounded w-20"></div>
          <div className="h-3 bg-gray-200 rounded w-24"></div>
        </div>
      </div>
    ))}
  </div>
);

const SubAppsOverview: React.FC = () => {
  const navigate = useNavigate();
  const [subApps, setSubApps] = useState<SubAppOverviewData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const fetchSubApps = async () => {
      setIsLoading(true);
      setError('');
      
      try {
        // Fetch SubApps with project data from canonical API
        const response = await fetch('/api/orbis/sub-apps?includeProjects=true');
        
        if (!response.ok) {
          throw new Error(`Failed to fetch SubApps: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch SubApps data');
        }
        
        setSubApps(result.data);
        
        // Log governance event
        governanceLogger.logSidebarInteraction({
          action: 'surface_switch',
          target: 'sub-apps-overview',
          context: 'sidebar_navigation',
          metadata: {
            sub_apps_count: result.data.length,
            data_source: result.dataSource || 'canonical_database'
          }
        });
        
      } catch (err) {
        console.error('Error fetching SubApps:', err);
        setError(err instanceof Error ? err.message : 'Failed to load SubApps');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubApps();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'warning': return 'bg-amber-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusTextColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600';
      case 'warning': return 'text-amber-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const handleSubAppClick = (subAppId: string, subAppName: string) => {
    // Log navigation event
    governanceLogger.logSidebarInteraction({
      action: 'sub_app_navigation',
      target: subAppName,
      context: 'sub_apps_overview',
      metadata: {
        sub_app_id: subAppId,
        navigation_target: `/orbis/sub-apps/${subAppId}`
      }
    });
    
    navigate(`/orbis/sub-apps/${subAppId}`);
  };

  const handleViewAllProjects = () => {
    navigate('/orbis/projects/all-projects');
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg border border-red-200 p-6 max-w-md mx-auto">
          <div className="flex items-center space-x-2 text-red-600 mb-4">
            <AlertTriangle size={20} />
            <h2 className="text-lg font-semibold">Error Loading SubApps</h2>
          </div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Calculate summary metrics
  const totalProjects = subApps.reduce((sum, subApp) => sum + (subApp.metrics?.totalProjects || 0), 0);
  const totalActiveProjects = subApps.reduce((sum, subApp) => sum + (subApp.metrics?.activeProjects || 0), 0);
  const totalUsers = subApps.reduce((sum, subApp) => sum + (subApp.metrics?.totalUsers || 0), 0);
  const averageUptime = subApps.length > 0 
    ? subApps.reduce((sum, subApp) => sum + (subApp.metrics?.uptime || 0), 0) / subApps.length 
    : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-gray-900">Sub-Apps Overview</h1>
            <button
              onClick={handleViewAllProjects}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <BarChart3 size={16} />
              <span>View All Projects</span>
              <ArrowRight size={16} />
            </button>
          </div>
          <p className="text-gray-600">
            Unified view of all Sub-Apps with live metrics and project counts
          </p>
        </div>

        {/* Summary Metrics */}
        {!isLoading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Total SubApps</span>
                <Activity className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{subApps.length}</div>
              <div className="text-sm text-gray-500 mt-1">
                {subApps.filter(sa => sa.status === 'active').length} active
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Total Projects</span>
                <BarChart3 className="w-5 h-5 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{totalProjects}</div>
              <div className="text-sm text-gray-500 mt-1">
                {totalActiveProjects} active
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Total Users</span>
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{totalUsers}</div>
              <div className="text-sm text-gray-500 mt-1">
                Across all SubApps
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Avg Uptime</span>
                <Activity className="w-5 h-5 text-amber-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{averageUptime.toFixed(1)}%</div>
              <div className="text-sm text-gray-500 mt-1">
                System health
              </div>
            </div>
          </div>
        )}

        {/* SubApps Grid */}
        {isLoading ? (
          <LoadingSkeleton />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {subApps.map((subApp) => (
              <div
                key={subApp.id}
                className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => handleSubAppClick(subApp.id, subApp.name)}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${getStatusColor(subApp.status)}`} />
                    <h3 className="text-lg font-semibold text-gray-900">{subApp.name}</h3>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(subApp.launchUrl, '_blank');
                    }}
                    className="text-gray-400 hover:text-blue-600 transition-colors"
                    title="Launch SubApp"
                  >
                    <ExternalLink size={16} />
                  </button>
                </div>

                {/* Description */}
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {subApp.description}
                </p>

                {/* Status */}
                <div className="flex items-center justify-between mb-4">
                  <span className={`text-sm font-medium capitalize ${getStatusTextColor(subApp.status)}`}>
                    {subApp.status}
                  </span>
                  <span className="text-sm text-gray-500">
                    {subApp.metrics?.uptime?.toFixed(1)}% uptime
                  </span>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Projects:</span>
                    <div className="font-medium text-gray-900">
                      {subApp.metrics?.activeProjects || 0} active / {subApp.metrics?.totalProjects || 0} total
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">Users:</span>
                    <div className="font-medium text-gray-900">
                      {subApp.metrics?.totalUsers || 0}
                    </div>
                  </div>
                </div>

                {/* Recent Projects Preview */}
                {subApp.projects && subApp.projects.recent && subApp.projects.recent.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Recent Projects</h4>
                    <div className="space-y-1">
                      {subApp.projects.recent.slice(0, 2).map((project) => (
                        <div key={project.id} className="flex items-center justify-between text-xs">
                          <span className="text-gray-600 truncate">{project.name}</span>
                          <span className="text-gray-500 ml-2">{project.completionPercentage}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Hint */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Click to view details</span>
                    <ArrowRight size={16} className="text-gray-400" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && subApps.length === 0 && (
          <div className="text-center py-12">
            <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No SubApps Found</h3>
            <p className="text-gray-600 mb-4">
              No SubApps are currently configured in the system.
            </p>
            <button
              onClick={() => navigate('/orbis/admin')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go to Admin
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubAppsOverview;