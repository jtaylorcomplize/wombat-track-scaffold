import React, { useState, useEffect } from 'react';
import { Outlet, useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { ExternalLink, Activity, Users, Calendar, AlertTriangle, TrendingUp, Folder, Plus, Settings, FileText, Clock, DollarSign, Target } from 'lucide-react';
import { useNavigationContext } from '../../contexts/NavigationContext';
import { governanceLogger } from '../../services/governanceLogger';

// Icon mapping to prevent object-to-primitive conversion errors
const iconMap: Record<string, React.ReactNode> = {
  externalLink: <ExternalLink className="w-4 h-4" />,
  folder: <Folder className="w-4 h-4" />,
  plus: <Plus className="w-4 h-4" />,
  settings: <Settings className="w-4 h-4" />,
  fileText: <FileText className="w-4 h-4" />,
  clock: <Clock className="w-4 h-4" />,
  dollarSign: <DollarSign className="w-4 h-4" />,
  target: <Target className="w-4 h-4" />
};

interface ProjectSummary {
  projectId: string;
  projectName: string;
  status: string;
  RAG: string;
  priority: string;
  owner: string;
  startDate?: string;
  endDate?: string;
  completionPercentage: number;
  budget?: number;
  actualCost?: number;
  lastUpdated: Date;
  subAppContext: string;
}

interface SubAppInfo {
  id: string;
  name: string;
  description: string;
  version: string;
  status: 'active' | 'warning' | 'error';
  launchUrl: string;
  lastUpdated: Date;
  metrics: {
    totalProjects: number;
    activeProjects: number;
    totalUsers: number;
    uptime: number;
    avgResponseTime: number;
  };
  recentActivity: {
    id: string;
    type: 'project_update' | 'user_action' | 'system_event';
    description: string;
    timestamp: Date;
    user?: string;
  }[];
  quickActions: {
    id: string;
    label: string;
    icon: string;
    action: string;
    url?: string;
  }[];
  projects: ProjectSummary[];
}

// Skeleton component
const SubAppOverviewSkeleton: React.FC = () => (
  <div className="min-h-screen bg-gray-50">
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header Skeleton */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6 animate-pulse">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="h-8 bg-gray-200 rounded w-64 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-96 mb-4"></div>
            <div className="flex space-x-2">
              <div className="h-6 bg-gray-200 rounded-full w-16"></div>
              <div className="h-6 bg-gray-200 rounded-full w-20"></div>
            </div>
          </div>
          <div className="h-10 w-32 bg-gray-200 rounded"></div>
        </div>
      </div>

      {/* Metrics Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded w-16"></div>
          </div>
        ))}
      </div>

      {/* Content Skeleton */}
      <div className="h-96 bg-white rounded-lg border border-gray-200 animate-pulse"></div>
    </div>
  </div>
);

const SubAppOverview: React.FC = () => {
  const { subAppId } = useParams<{ subAppId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { state: navState } = useNavigationContext();
  const [isLoading, setIsLoading] = useState(true);
  const [subAppInfo, setSubAppInfo] = useState<SubAppInfo | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Determine if we're in a nested route
  const isNestedRoute = location.pathname !== `/orbis/sub-apps/${subAppId}`;

  // Fetch sub-app information
  useEffect(() => {
    const fetchSubAppInfo = async () => {
      if (!subAppId) return;
      
      setIsLoading(true);
      try {
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Mock sub-app data
        const subAppMap: Record<string, SubAppInfo> = {
          'prog-orbis-001': {
            id: 'prog-orbis-001',
            name: 'Orbis Intelligence',
            description: 'Advanced analytics and business intelligence platform for market research and competitive analysis',
            version: 'v2.1.3',
            status: 'active',
            launchUrl: 'https://orbis.intelligence.app',
            lastUpdated: new Date(Date.now() - 2 * 60 * 60 * 1000),
            metrics: {
              totalProjects: 3,
              activeProjects: 2,
              totalUsers: 47,
              uptime: 99.8,
              avgResponseTime: 340
            },
            recentActivity: [
              {
                id: 'act-001',
                type: 'project_update',
                description: 'Market Analysis Platform milestone completed',
                timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
                user: 'Sarah Chen'
              },
              {
                id: 'act-002',
                type: 'user_action',
                description: 'New dashboard created for Q1 analysis',
                timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
                user: 'Michael Park'
              },
              {
                id: 'act-003',
                type: 'system_event',
                description: 'Performance optimization deployed',
                timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000)
              }
            ],
            quickActions: [
              {
                id: 'qa-001',
                label: 'Launch App',
                icon: 'externalLink',
                action: 'launch_app',
                url: 'https://orbis.intelligence.app'
              },
              {
                id: 'qa-002',
                label: 'View Projects',
                icon: 'folder',
                action: 'view_projects'
              },
              {
                id: 'qa-003',
                label: 'New Project',
                icon: 'plus',
                action: 'new_project'
              },
              {
                id: 'qa-004',
                label: 'Settings',
                icon: 'settings',
                action: 'settings'
              }
            ],
            projects: [
              {
                projectId: 'ORB-2025-001',
                projectName: 'Market Intelligence Dashboard',
                status: 'Active',
                RAG: 'Green',
                priority: 'High',
                owner: 'Sarah Chen',
                startDate: '2025-01-15',
                endDate: '2025-06-30',
                completionPercentage: 75,
                budget: 150000,
                actualCost: 95000,
                lastUpdated: new Date(Date.now() - 2 * 60 * 60 * 1000),
                subAppContext: 'orbis-intelligence'
              },
              {
                projectId: 'ORB-2025-002',
                projectName: 'Competitive Analysis Toolkit',
                status: 'Planning',
                RAG: 'Amber',
                priority: 'Medium',
                owner: 'Michael Park',
                startDate: '2025-03-01',
                endDate: '2025-09-15',
                completionPercentage: 25,
                budget: 120000,
                actualCost: 15000,
                lastUpdated: new Date(Date.now() - 5 * 60 * 60 * 1000),
                subAppContext: 'orbis-intelligence'
              },
              {
                projectId: 'ORB-2024-015',
                projectName: 'Data Pipeline Optimization',
                status: 'Completed',
                RAG: 'Green',
                priority: 'High',
                owner: 'Alex Rodriguez',
                startDate: '2024-09-01',
                endDate: '2025-01-31',
                completionPercentage: 100,
                budget: 80000,
                actualCost: 76000,
                lastUpdated: new Date(Date.now() - 24 * 60 * 60 * 1000),
                subAppContext: 'orbis-intelligence'
              }
            ]
          },
          'prog-complize-001': {
            id: 'prog-complize-001',
            name: 'Complize Platform',
            description: 'Comprehensive compliance management and regulatory tracking system',
            version: 'v1.8.2',
            status: 'warning',
            launchUrl: 'https://complize.platform.app',
            lastUpdated: new Date(Date.now() - 4 * 60 * 60 * 1000),
            metrics: {
              totalProjects: 2,
              activeProjects: 1,
              totalUsers: 23,
              uptime: 98.5,
              avgResponseTime: 520
            },
            recentActivity: [
              {
                id: 'act-004',
                type: 'project_update',
                description: 'Audit Trail System deployment completed',
                timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
                user: 'Emma Thompson'
              },
              {
                id: 'act-005',
                type: 'system_event',
                description: 'Regulatory update processed',
                timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000)
              }
            ],
            quickActions: [
              {
                id: 'qa-005',
                label: 'Launch App',
                icon: 'externalLink',
                action: 'launch_app',
                url: 'https://complize.platform.app'
              },
              {
                id: 'qa-006',
                label: 'View Projects',
                icon: 'folder',
                action: 'view_projects'
              }
            ],
            projects: [
              {
                projectId: 'COM-2025-003',
                projectName: 'Regulatory Compliance Automation',
                status: 'Active',
                RAG: 'Amber',
                priority: 'High',
                owner: 'Emma Thompson',
                startDate: '2025-01-01',
                endDate: '2025-08-15',
                completionPercentage: 60,
                budget: 200000,
                actualCost: 135000,
                lastUpdated: new Date(Date.now() - 3 * 60 * 60 * 1000),
                subAppContext: 'complize-platform'
              },
              {
                projectId: 'COM-2024-018',
                projectName: 'Audit Trail Enhancement',
                status: 'On Hold',
                RAG: 'Red',
                priority: 'Medium',
                owner: 'David Wilson',
                startDate: '2024-10-01',
                endDate: '2025-03-30',
                completionPercentage: 35,
                budget: 95000,
                actualCost: 42000,
                lastUpdated: new Date(Date.now() - 12 * 60 * 60 * 1000),
                subAppContext: 'complize-platform'
              }
            ]
          },
          'prog-visacalc-001': {
            id: 'prog-visacalc-001',
            name: 'VisaCalc Pro',
            description: 'Advanced visa processing and immigration document management system',
            version: 'v3.0.1',
            status: 'active',
            launchUrl: 'https://visacalc.pro.app',
            lastUpdated: new Date(Date.now() - 1 * 60 * 60 * 1000),
            metrics: {
              totalProjects: 4,
              activeProjects: 3,
              totalUsers: 156,
              uptime: 99.9,
              avgResponseTime: 280
            },
            recentActivity: [
              {
                id: 'act-006',
                type: 'project_update',
                description: 'Visa Processing Automation feature released',
                timestamp: new Date(Date.now() - 30 * 60 * 1000),
                user: 'Roberto Silva'
              },
              {
                id: 'act-007',
                type: 'user_action',
                description: 'Document verification workflow updated',
                timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
                user: 'Anna Petrova'
              }
            ],
            quickActions: [
              {
                id: 'qa-007',
                label: 'Launch App',
                icon: 'externalLink',
                action: 'launch_app',
                url: 'https://visacalc.pro.app'
              },
              {
                id: 'qa-008',
                label: 'View Projects',
                icon: 'folder',
                action: 'view_projects'
              }
            ],
            projects: [
              {
                projectId: 'VIS-2025-001',
                projectName: 'Automated Visa Processing',
                status: 'Active',
                RAG: 'Green',
                priority: 'High',
                owner: 'Roberto Silva',
                startDate: '2024-11-01',
                endDate: '2025-05-30',
                completionPercentage: 85,
                budget: 180000,
                actualCost: 142000,
                lastUpdated: new Date(Date.now() - 1 * 60 * 60 * 1000),
                subAppContext: 'visacalc-pro'
              },
              {
                projectId: 'VIS-2025-002',
                projectName: 'Document Management System',
                status: 'Active',
                RAG: 'Green',
                priority: 'Medium',
                owner: 'Anna Petrova',
                startDate: '2025-01-15',
                endDate: '2025-07-31',
                completionPercentage: 45,
                budget: 120000,
                actualCost: 58000,
                lastUpdated: new Date(Date.now() - 4 * 60 * 60 * 1000),
                subAppContext: 'visacalc-pro'
              },
              {
                projectId: 'VIS-2024-019',
                projectName: 'Client Portal Enhancement',
                status: 'Completed',
                RAG: 'Green',
                priority: 'Medium',
                owner: 'Maria Lopez',
                startDate: '2024-08-01',
                endDate: '2024-12-31',
                completionPercentage: 100,
                budget: 75000,
                actualCost: 71000,
                lastUpdated: new Date(Date.now() - 7 * 60 * 60 * 1000),
                subAppContext: 'visacalc-pro'
              },
              {
                projectId: 'VIS-2025-003',
                projectName: 'Mobile App Development',
                status: 'Planning',
                RAG: 'Amber',
                priority: 'Low',
                owner: 'James Chen',
                startDate: '2025-04-01',
                endDate: '2025-11-30',
                completionPercentage: 10,
                budget: 220000,
                actualCost: 8000,
                lastUpdated: new Date(Date.now() - 8 * 60 * 60 * 1000),
                subAppContext: 'visacalc-pro'
              }
            ]
          }
        };

        const mockSubApp = subAppMap[subAppId];
        setSubAppInfo(mockSubApp || null);

        // Log governance event
        if (mockSubApp) {
          governanceLogger.logSidebarInteraction({
            action: 'sub_app_switch',
            target: mockSubApp.name,
            context: 'sub_app_overview',
            metadata: {
              sub_app_id: subAppId,
              projects_count: mockSubApp.metrics.totalProjects,
              status: mockSubApp.status
            }
          });
        }
        
      } catch (error) {
        console.error('Failed to fetch sub-app info:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubAppInfo();
  }, [subAppId]);

  const handleQuickAction = (action: string, url?: string) => {
    try {
      switch (action) {
        case 'launch_app':
          if (url && subAppId && subAppInfo?.name) {
            window.open(url, '_blank');
            governanceLogger.logSubAppLaunch(subAppId, url, subAppInfo.name);
          }
          break;
        case 'view_projects':
          if (subAppId) {
            navigate(`/orbis/sub-apps/${subAppId}/projects`);
          }
          break;
        case 'new_project':
          // Would typically open a project creation modal
          break;
        case 'settings':
          // Would typically navigate to settings
          break;
      }
    } catch (error) {
      console.error('Error handling quick action:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'warning': return 'bg-amber-100 text-amber-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Activity className="w-4 h-4 text-green-600" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-amber-600" />;
      case 'error': return <AlertTriangle className="w-4 h-4 text-red-600" />;
      default: return <Activity className="w-4 h-4 text-gray-600" />;
    }
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

  const getProjectStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'planning': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'on hold': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getProjectRAGColor = (rag: string) => {
    switch (rag.toLowerCase()) {
      case 'green': return 'bg-green-100 text-green-800 border-green-300';
      case 'amber': return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'red': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high': return 'text-red-600 font-semibold';
      case 'medium': return 'text-yellow-600 font-medium';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading) {
    return <SubAppOverviewSkeleton />;
  }

  if (!subAppInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Sub-App Not Found</h2>
          <p className="text-gray-600 mb-4">The requested sub-application could not be found.</p>
          <button
            onClick={() => navigate('/orbis')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // If we're in a nested route, render the outlet
  if (isNestedRoute) {
    return <Outlet />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Sub-App Header */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <h1 className="text-2xl font-bold text-gray-900">{subAppInfo.name}</h1>
                <span className="text-sm text-gray-500">v{subAppInfo.version}</span>
                {getStatusIcon(subAppInfo.status)}
              </div>
              <p className="text-gray-600 mb-4">{subAppInfo.description}</p>
              <div className="flex items-center space-x-4">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  getStatusColor(subAppInfo.status)
                }`}>
                  {subAppInfo.status.charAt(0).toUpperCase() + subAppInfo.status.slice(1)}
                </span>
                <span className="text-sm text-gray-500">
                  Updated {formatRelativeTime(subAppInfo.lastUpdated)}
                </span>
              </div>
            </div>
            <div className="flex space-x-2">
              {subAppInfo.quickActions.map((action) => (
                <button
                  key={action.id}
                  onClick={() => handleQuickAction(action.action, action.url)}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  {iconMap[action.icon] || iconMap.externalLink}
                  <span>{action.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Metrics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Total Projects</span>
              <Folder className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{subAppInfo.metrics.totalProjects}</div>
            <div className="text-sm text-gray-500">
              {subAppInfo.metrics.activeProjects} active
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Total Users</span>
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{subAppInfo.metrics.totalUsers}</div>
            <div className="text-sm text-gray-500">Active users</div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Uptime</span>
              <Activity className="w-5 h-5 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{subAppInfo.metrics.uptime}%</div>
            <div className="text-sm text-gray-500">Last 30 days</div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Response Time</span>
              <TrendingUp className="w-5 h-5 text-amber-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{subAppInfo.metrics.avgResponseTime}ms</div>
            <div className="text-sm text-gray-500">Average</div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Last Updated</span>
              <Calendar className="w-5 h-5 text-gray-600" />
            </div>
            <div className="text-sm font-bold text-gray-900">
              {formatRelativeTime(subAppInfo.lastUpdated)}
            </div>
            <div className="text-sm text-gray-500">System update</div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Activity */}
          <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
            <div className="space-y-4">
              {subAppInfo.recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg border border-gray-100">
                  <div className={`w-2 h-2 rounded-full mt-2 ${
                    activity.type === 'project_update' ? 'bg-blue-500' :
                    activity.type === 'user_action' ? 'bg-green-500' : 'bg-gray-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">{activity.description}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-xs text-gray-500">
                        {formatRelativeTime(activity.timestamp)}
                      </span>
                      {activity.user && (
                        <>
                          <span className="text-xs text-gray-400">•</span>
                          <span className="text-xs text-gray-600">{activity.user}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="space-y-3">
              {subAppInfo.quickActions.map((action) => (
                <button
                  key={action.id}
                  onClick={() => handleQuickAction(action.action, action.url)}
                  className="w-full flex items-center space-x-3 p-3 text-left border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                >
                  {iconMap[action.icon] || iconMap.externalLink}
                  <span className="font-medium text-gray-900">{action.label}</span>
                </button>
              ))}
            </div>

            {/* Navigation to Projects */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <button
                onClick={() => navigate(`/orbis/sub-apps/${subAppId}/projects`)}
                className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                <Folder className="w-4 h-4" />
                <span>View All Projects</span>
              </button>
            </div>
          </div>
        </div>

        {/* Projects Overview */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mt-6">
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
                  {Math.round(subAppInfo.projects.reduce((acc, p) => acc + p.completionPercentage, 0) / subAppInfo.projects.length)}%
                </div>
                <div className="text-xs text-gray-600">Avg Progress</div>
              </div>
            </div>
          )}

          {subAppInfo.projects.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Folder className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p>No projects found for this sub-app.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {subAppInfo.projects.map((project) => (
                <div key={project.projectId} className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-gray-50">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <Link
                        to={`/orbis/sub-apps/${subAppId}/projects/${project.projectId}`}
                        className="text-sm font-semibold text-gray-900 hover:text-blue-600 block truncate"
                      >
                        {project.projectName}
                      </Link>
                      <p className="text-xs text-gray-500 mt-1">{project.projectId}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 mb-3">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${
                      getProjectStatusColor(project.status)
                    }`}>
                      {project.status}
                    </span>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${
                      getProjectRAGColor(project.RAG)
                    }`}>
                      {project.RAG}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs text-gray-600">
                    <div className="flex items-center justify-between">
                      <span>Owner:</span>
                      <span className="font-medium">{project.owner}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Priority:</span>
                      <span className={getPriorityColor(project.priority)}>{project.priority}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Progress:</span>
                      <span className="font-medium">{project.completionPercentage}%</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${project.completionPercentage}%` }}
                      ></div>
                    </div>

                    {project.budget && project.actualCost && (
                      <div className="flex items-center justify-between">
                        <span>Budget:</span>
                        <span className="font-medium">
                          {formatCurrency(project.actualCost)} / {formatCurrency(project.budget)}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span>Updated:</span>
                      <span>{formatRelativeTime(project.lastUpdated)}</span>
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
          )}
        </div>
      </div>
    </div>
  );
};

export default SubAppOverview;