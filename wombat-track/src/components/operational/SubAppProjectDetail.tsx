import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Calendar, User, DollarSign, TrendingUp, AlertTriangle } from 'lucide-react';

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
  projects: ProjectSummary[];
}

const SubAppProjectDetail: React.FC = () => {
  const { subAppId, projectId } = useParams<{ subAppId: string; projectId: string }>();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [project, setProject] = useState<ProjectSummary | null>(null);
  const [subAppName, setSubAppName] = useState('');

  useEffect(() => {
    const fetchProjectDetail = async () => {
      if (!subAppId || !projectId) return;
      
      setIsLoading(true);
      try {
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Mock sub-app data (same as SubAppOverview)
        const subAppMap: Record<string, SubAppInfo> = {
          'prog-orbis-001': {
            id: 'prog-orbis-001',
            name: 'Orbis Intelligence',
            description: 'Advanced analytics and business intelligence platform',
            version: 'v2.1.3',
            status: 'active',
            launchUrl: 'https://orbis.intelligence.app',
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

        const subApp = subAppMap[subAppId];
        if (subApp) {
          setSubAppName(subApp.name);
          const foundProject = subApp.projects.find(p => p.projectId === projectId);
          setProject(foundProject || null);
        }
        
      } catch (error) {
        console.error('Failed to fetch project details:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjectDetail();
  }, [subAppId, projectId]);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'planning': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'on hold': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRAGColor = (rag: string) => {
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="h-10 bg-gray-200 rounded w-2/3 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-full mb-4"></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="h-20 bg-gray-200 rounded"></div>
                <div className="h-20 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <button
            onClick={() => navigate(`/orbis/sub-apps/${subAppId}`)}
            className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to {subAppName}</span>
          </button>

          <div className="text-center py-12">
            <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Project Not Found</h2>
            <p className="text-gray-600 mb-4">The requested project could not be found in this sub-application.</p>
            <Link
              to={`/orbis/sub-apps/${subAppId}`}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Return to Sub-App Overview
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Navigation */}
        <button
          onClick={() => navigate(`/orbis/sub-apps/${subAppId}`)}
          className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to {subAppName}</span>
        </button>

        {/* Project Header */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{project.projectName}</h1>
              <p className="text-sm text-gray-500 mb-4">{project.projectId}</p>
              
              <div className="flex items-center space-x-4 mb-4">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(project.status)}`}>
                  {project.status}
                </span>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getRAGColor(project.RAG)}`}>
                  RAG: {project.RAG}
                </span>
                <span className={`text-sm ${getPriorityColor(project.priority)}`}>
                  {project.priority} Priority
                </span>
              </div>

              <div className="text-sm text-gray-600">
                Last updated {formatRelativeTime(project.lastUpdated)}
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Progress</span>
              <span className="text-sm text-gray-600">{project.completionPercentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${project.completionPercentage}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Project Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <User className="w-5 h-5 text-blue-600 mr-2" />
              Team Information
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Project Owner:</span>
                <span className="text-sm font-medium text-gray-900">{project.owner}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Sub-App Context:</span>
                <span className="text-sm text-gray-900">{subAppName}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Calendar className="w-5 h-5 text-green-600 mr-2" />
              Timeline
            </h2>
            <div className="space-y-3">
              {project.startDate && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Start Date:</span>
                  <span className="text-sm font-medium text-gray-900">
                    {new Date(project.startDate).toLocaleDateString()}
                  </span>
                </div>
              )}
              {project.endDate && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">End Date:</span>
                  <span className="text-sm font-medium text-gray-900">
                    {new Date(project.endDate).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Financial Information */}
        {project.budget && project.actualCost && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <DollarSign className="w-5 h-5 text-yellow-600 mr-2" />
              Budget & Costs
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{formatCurrency(project.budget)}</div>
                <div className="text-sm text-gray-600">Total Budget</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{formatCurrency(project.actualCost)}</div>
                <div className="text-sm text-gray-600">Actual Cost</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${project.actualCost > project.budget ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(project.budget - project.actualCost)}
                </div>
                <div className="text-sm text-gray-600">Remaining</div>
              </div>
            </div>
            
            {/* Budget Progress Bar */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Budget Utilization</span>
                <span className="text-sm text-gray-600">
                  {Math.round((project.actualCost / project.budget) * 100)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className={`h-3 rounded-full transition-all duration-300 ${
                    (project.actualCost / project.budget) > 0.9 ? 'bg-red-600' : 
                    (project.actualCost / project.budget) > 0.7 ? 'bg-yellow-600' : 'bg-green-600'
                  }`}
                  style={{ width: `${Math.min((project.actualCost / project.budget) * 100, 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="flex space-x-4">
            <Link
              to={`/orbis/sub-apps/${subAppId}/projects`}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <TrendingUp className="w-4 h-4" />
              <span>View All Projects</span>
            </Link>
            <button
              onClick={() => window.open(`https://${project.subAppContext}.app/projects/${project.projectId}`, '_blank')}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Open in {subAppName}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubAppProjectDetail;