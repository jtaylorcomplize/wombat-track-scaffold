import React, { useState, useEffect } from 'react';
import { BarChart3, AlertCircle, Calendar, DollarSign, Users, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { governanceLogger } from '../../services/governanceLogger';

interface ProjectMetrics {
  id: string;
  name: string;
  subAppId: string;
  subAppName: string;
  budget: {
    allocated: number;
    spent: number;
    projected: number;
  };
  timeline: {
    startDate: Date;
    endDate: Date;
    daysRemaining: number;
    completionPercentage: number;
  };
  team: {
    size: number;
    velocity: number;
    satisfaction: number;
  };
  risks: {
    level: 'low' | 'medium' | 'high';
    count: number;
    topRisk?: string;
  };
}

interface SubAppMetrics {
  subAppId: string;
  subAppName: string;
  totalProjects: number;
  activeProjects: number;
  totalBudget: number;
  averageCompletion: number;
  overallHealth: 'healthy' | 'warning' | 'critical';
}

// Skeleton components
const MetricCardSkeleton: React.FC = () => (
  <div className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
    <div className="flex items-center justify-between mb-4">
      <div className="h-4 bg-gray-200 rounded w-24"></div>
      <div className="h-8 w-8 bg-gray-200 rounded"></div>
    </div>
    <div className="space-y-2">
      <div className="h-8 bg-gray-200 rounded w-20"></div>
      <div className="h-4 bg-gray-200 rounded w-32"></div>
    </div>
  </div>
);

const ChartSkeleton: React.FC = () => (
  <div className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
    <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
    <div className="h-64 bg-gray-100 rounded"></div>
  </div>
);

const ProjectAnalyticsDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState('30d');
  const [projectMetrics, setProjectMetrics] = useState<ProjectMetrics[]>([]);
  const [subAppMetrics, setSubAppMetrics] = useState<SubAppMetrics[]>([]);
  
  // Fetch analytics data
  useEffect(() => {
    const fetchAnalytics = async () => {
      setIsLoading(true);
      try {
        await new Promise(resolve => setTimeout(resolve, 1200));
        
        // Mock project metrics
        const mockProjectMetrics: ProjectMetrics[] = [
          {
            id: 'proj-001',
            name: 'Market Analysis Platform',
            subAppId: 'prog-orbis-001',
            subAppName: 'Orbis Intelligence',
            budget: {
              allocated: 500000,
              spent: 375000,
              projected: 480000
            },
            timeline: {
              startDate: new Date('2024-01-15'),
              endDate: new Date('2025-04-30'),
              daysRemaining: 87,
              completionPercentage: 75
            },
            team: {
              size: 8,
              velocity: 85,
              satisfaction: 4.2
            },
            risks: {
              level: 'medium',
              count: 3,
              topRisk: 'Third-party API dependencies'
            }
          },
          {
            id: 'proj-006',
            name: 'Visa Processing Automation',
            subAppId: 'prog-visacalc-001',
            subAppName: 'VisaCalc Pro',
            budget: {
              allocated: 750000,
              spent: 637500,
              projected: 735000
            },
            timeline: {
              startDate: new Date('2024-03-01'),
              endDate: new Date('2025-02-28'),
              daysRemaining: 27,
              completionPercentage: 85
            },
            team: {
              size: 10,
              velocity: 92,
              satisfaction: 4.5
            },
            risks: {
              level: 'low',
              count: 1,
              topRisk: 'Timeline constraints'
            }
          },
          {
            id: 'proj-004',
            name: 'Regulatory Compliance Tracker',
            subAppId: 'prog-complize-001',
            subAppName: 'Complize Platform',
            budget: {
              allocated: 450000,
              spent: 270000,
              projected: 425000
            },
            timeline: {
              startDate: new Date('2024-06-01'),
              endDate: new Date('2025-05-31'),
              daysRemaining: 120,
              completionPercentage: 60
            },
            team: {
              size: 6,
              velocity: 78,
              satisfaction: 3.9
            },
            risks: {
              level: 'high',
              count: 5,
              topRisk: 'Regulatory changes mid-project'
            }
          }
        ];

        // Aggregate sub-app metrics
        const subAppMap = new Map<string, SubAppMetrics>();
        
        mockProjectMetrics.forEach(project => {
          if (!subAppMap.has(project.subAppId)) {
            subAppMap.set(project.subAppId, {
              subAppId: project.subAppId,
              subAppName: project.subAppName,
              totalProjects: 0,
              activeProjects: 0,
              totalBudget: 0,
              averageCompletion: 0,
              overallHealth: 'healthy'
            });
          }
          
          const metrics = subAppMap.get(project.subAppId)!;
          metrics.totalProjects++;
          if (project.timeline.completionPercentage < 100) {
            metrics.activeProjects++;
          }
          metrics.totalBudget += project.budget.allocated;
          metrics.averageCompletion += project.timeline.completionPercentage;
        });

        // Calculate averages and health
        subAppMap.forEach(metrics => {
          metrics.averageCompletion = Math.round(metrics.averageCompletion / metrics.totalProjects);
          
          // Determine overall health
          const hasHighRisk = mockProjectMetrics.some(p => 
            p.subAppId === metrics.subAppId && p.risks.level === 'high'
          );
          const budgetOverrun = mockProjectMetrics.some(p => 
            p.subAppId === metrics.subAppId && p.budget.projected > p.budget.allocated
          );
          
          if (hasHighRisk || budgetOverrun) {
            metrics.overallHealth = 'critical';
          } else if (metrics.averageCompletion < 70) {
            metrics.overallHealth = 'warning';
          }
        });

        setProjectMetrics(mockProjectMetrics);
        setSubAppMetrics(Array.from(subAppMap.values()));

        // Log governance event
        governanceLogger.logSidebarInteraction({
          action: 'surface_switch',
          target: 'project-analytics',
          context: 'sidebar_navigation',
          metadata: {
            time_range: selectedTimeRange,
            projects_analyzed: mockProjectMetrics.length,
            sub_apps_count: subAppMap.size
          }
        });
        
      } catch (error) {
        console.error('Failed to fetch analytics:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, [selectedTimeRange]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-amber-600 bg-amber-100';
      case 'high': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'bg-green-500';
      case 'warning': return 'bg-amber-500';
      case 'critical': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const navigateToProject = (subAppId: string, projectId: string, projectName: string) => {
    governanceLogger.logSidebarInteraction({
      action: 'project_switch',
      target: projectName,
      context: 'analytics_dashboard',
      metadata: {
        sub_app_id: subAppId,
        project_id: projectId,
        from_view: 'project-analytics'
      }
    });
    
    navigate(`/orbis/sub-apps/${subAppId}/projects/${projectId}`);
  };

  // Calculate summary metrics
  const totalBudget = projectMetrics.reduce((sum, p) => sum + p.budget.allocated, 0);
  const totalSpent = projectMetrics.reduce((sum, p) => sum + p.budget.spent, 0);
  const averageCompletion = projectMetrics.length > 0 
    ? Math.round(projectMetrics.reduce((sum, p) => sum + p.timeline.completionPercentage, 0) / projectMetrics.length)
    : 0;
  const totalTeamSize = projectMetrics.reduce((sum, p) => sum + p.team.size, 0);
  const highRiskProjects = projectMetrics.filter(p => p.risks.level === 'high').length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-gray-900">Project Analytics</h1>
            <select
              value={selectedTimeRange}
              onChange={(e) => setSelectedTimeRange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
            </select>
          </div>
          <p className="text-gray-600">
            Cross-platform analytics and insights for all projects
          </p>
        </div>

        {/* Summary Metrics */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            {[1, 2, 3, 4, 5].map(i => (
              <MetricCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            {/* Total Budget */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Total Budget</span>
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{formatCurrency(totalBudget)}</div>
              <div className="text-sm text-gray-500 mt-1">
                {formatCurrency(totalSpent)} spent ({Math.round((totalSpent / totalBudget) * 100)}%)
              </div>
            </div>

            {/* Average Completion */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Avg Completion</span>
                <BarChart3 className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{averageCompletion}%</div>
              <div className="text-sm text-gray-500 mt-1">
                Across {projectMetrics.length} projects
              </div>
            </div>

            {/* Total Team Size */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Total Team Size</span>
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{totalTeamSize}</div>
              <div className="text-sm text-gray-500 mt-1">
                Active members
              </div>
            </div>

            {/* Active Projects */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Active Projects</span>
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {projectMetrics.filter(p => p.timeline.completionPercentage < 100).length}
              </div>
              <div className="text-sm text-gray-500 mt-1">
                In progress
              </div>
            </div>

            {/* High Risk Projects */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">High Risk</span>
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{highRiskProjects}</div>
              <div className="text-sm text-gray-500 mt-1">
                Need attention
              </div>
            </div>
          </div>
        )}

        {/* Sub-App Overview */}
        {isLoading ? (
          <div className="mb-8">
            <ChartSkeleton />
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Sub-App Performance</h2>
            <div className="space-y-4">
              {subAppMetrics.map((metrics) => (
                <div key={metrics.subAppId} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${getHealthColor(metrics.overallHealth)}`} />
                      <h3 className="font-medium text-gray-900">{metrics.subAppName}</h3>
                      <span className="text-sm text-gray-500">
                        {metrics.activeProjects} active / {metrics.totalProjects} total
                      </span>
                    </div>
                    <button
                      onClick={() => navigate(`/orbis/sub-apps/${metrics.subAppId}`)}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      View Details →
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Budget:</span>
                      <span className="ml-2 font-medium">{formatCurrency(metrics.totalBudget)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Avg Progress:</span>
                      <span className="ml-2 font-medium">{metrics.averageCompletion}%</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Health:</span>
                      <span className={`ml-2 font-medium capitalize ${
                        metrics.overallHealth === 'healthy' ? 'text-green-600' :
                        metrics.overallHealth === 'warning' ? 'text-amber-600' : 'text-red-600'
                      }`}>
                        {metrics.overallHealth}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Project Details Table */}
        {isLoading ? (
          <ChartSkeleton />
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Project Details</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Project
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Progress
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Budget
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Team
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Risk
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Days Left
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {projectMetrics.map((project) => (
                    <tr key={project.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{project.name}</div>
                          <div className="text-sm text-gray-500">{project.subAppName}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-1 mr-3">
                            <div className="w-32 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full"
                                style={{ width: `${project.timeline.completionPercentage}%` }}
                              />
                            </div>
                          </div>
                          <span className="text-sm text-gray-700">{project.timeline.completionPercentage}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">
                          <div className="text-gray-900">{formatCurrency(project.budget.spent)}</div>
                          <div className="text-gray-500">of {formatCurrency(project.budget.allocated)}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Users className="w-4 h-4 text-gray-400 mr-1" />
                          <span className="text-sm text-gray-900">{project.team.size}</span>
                          <span className="ml-2 text-sm text-gray-500">({project.team.velocity}% velocity)</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          getRiskColor(project.risks.level)
                        }`}>
                          {project.risks.level} ({project.risks.count})
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm">
                          <Calendar className="w-4 h-4 text-gray-400 mr-1" />
                          <span className={`${project.timeline.daysRemaining < 30 ? 'text-red-600' : 'text-gray-900'}`}>
                            {project.timeline.daysRemaining} days
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => navigateToProject(project.subAppId, project.id, project.name)}
                          className="text-blue-600 hover:text-blue-700 font-medium"
                        >
                          View →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectAnalyticsDashboard;