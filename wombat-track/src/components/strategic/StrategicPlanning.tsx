import React, { useState, useEffect } from 'react';
import { Target, Calendar, TrendingUp, AlertCircle, CheckCircle2, Clock, Users, DollarSign, Lightbulb, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { governanceLogger } from '../../services/governanceLogger';

interface StrategicInitiative {
  id: string;
  title: string;
  description: string;
  status: 'planning' | 'active' | 'on-hold' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  timeline: {
    startDate: Date;
    endDate: Date;
    milestones: {
      id: string;
      title: string;
      dueDate: Date;
      completed: boolean;
    }[];
  };
  budget: {
    allocated: number;
    spent: number;
  };
  teams: string[];
  relatedProjects: {
    projectId: string;
    projectName: string;
    subAppId: string;
    subAppName: string;
    contribution: number; // percentage
  }[];
  kpis: {
    metric: string;
    current: number;
    target: number;
    unit: string;
  }[];
  risks: {
    description: string;
    impact: 'low' | 'medium' | 'high';
    mitigation: string;
  }[];
}

interface RoadmapQuarter {
  quarter: string;
  year: number;
  initiatives: {
    id: string;
    title: string;
    status: string;
    priority: string;
  }[];
}

// Skeleton components
const InitiativeCardSkeleton: React.FC = () => (
  <div className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
    <div className="flex items-start justify-between mb-4">
      <div className="flex-1">
        <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-full"></div>
      </div>
      <div className="h-6 w-16 bg-gray-200 rounded-full ml-4"></div>
    </div>
    <div className="space-y-3">
      <div className="h-4 bg-gray-200 rounded w-2/3"></div>
      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
    </div>
  </div>
);

const RoadmapSkeleton: React.FC = () => (
  <div className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
    <div className="h-6 bg-gray-200 rounded w-48 mb-6"></div>
    <div className="grid grid-cols-4 gap-4">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="space-y-3">
          <div className="h-4 bg-gray-200 rounded w-20"></div>
          <div className="space-y-2">
            {[1, 2, 3].map(j => (
              <div key={j} className="h-8 bg-gray-100 rounded"></div>
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

const StrategicPlanning: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [selectedView, setSelectedView] = useState<'initiatives' | 'roadmap' | 'kpis'>('initiatives');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [initiatives, setInitiatives] = useState<StrategicInitiative[]>([]);
  const [roadmapData, setRoadmapData] = useState<RoadmapQuarter[]>([]);

  // Fetch strategic planning data
  useEffect(() => {
    const fetchStrategicData = async () => {
      setIsLoading(true);
      try {
        await new Promise(resolve => setTimeout(resolve, 1200));
        
        // Mock strategic initiatives
        const mockInitiatives: StrategicInitiative[] = [
          {
            id: 'init-001',
            title: 'AI-Powered Analytics Platform',
            description: 'Develop comprehensive AI analytics platform to provide intelligent insights across all sub-applications',
            status: 'active',
            priority: 'high',
            timeline: {
              startDate: new Date('2024-01-01'),
              endDate: new Date('2025-06-30'),
              milestones: [
                {
                  id: 'ms-001',
                  title: 'MVP Development Complete',
                  dueDate: new Date('2025-03-15'),
                  completed: false
                },
                {
                  id: 'ms-002',
                  title: 'Pilot Testing Phase',
                  dueDate: new Date('2025-04-30'),
                  completed: false
                },
                {
                  id: 'ms-003',
                  title: 'Full Platform Launch',
                  dueDate: new Date('2025-06-30'),
                  completed: false
                }
              ]
            },
            budget: {
              allocated: 2500000,
              spent: 1200000
            },
            teams: ['Data Science', 'Engineering', 'Product'],
            relatedProjects: [
              {
                projectId: 'proj-001',
                projectName: 'Market Analysis Platform',
                subAppId: 'prog-orbis-001',
                subAppName: 'Orbis Intelligence',
                contribution: 40
              },
              {
                projectId: 'proj-003',
                projectName: 'Predictive Analytics Engine',
                subAppId: 'prog-orbis-001',
                subAppName: 'Orbis Intelligence',
                contribution: 60
              }
            ],
            kpis: [
              {
                metric: 'User Adoption Rate',
                current: 35,
                target: 80,
                unit: '%'
              },
              {
                metric: 'Query Response Time',
                current: 2.3,
                target: 1.0,
                unit: 'seconds'
              },
              {
                metric: 'Cost Reduction',
                current: 15,
                target: 30,
                unit: '%'
              }
            ],
            risks: [
              {
                description: 'AI model accuracy below expectations',
                impact: 'high',
                mitigation: 'Enhanced training data and model validation processes'
              },
              {
                description: 'Integration complexity with legacy systems',
                impact: 'medium',
                mitigation: 'Phased rollout with compatibility layers'
              }
            ]
          },
          {
            id: 'init-002',
            title: 'Global Compliance Standardization',
            description: 'Standardize compliance processes across all international markets and regulatory frameworks',
            status: 'planning',
            priority: 'critical',
            timeline: {
              startDate: new Date('2025-02-01'),
              endDate: new Date('2025-12-31'),
              milestones: [
                {
                  id: 'ms-004',
                  title: 'Regulatory Assessment Complete',
                  dueDate: new Date('2025-04-15'),
                  completed: false
                },
                {
                  id: 'ms-005',
                  title: 'Framework Development',
                  dueDate: new Date('2025-08-30'),
                  completed: false
                },
                {
                  id: 'ms-006',
                  title: 'Global Implementation',
                  dueDate: new Date('2025-12-31'),
                  completed: false
                }
              ]
            },
            budget: {
              allocated: 1800000,
              spent: 150000
            },
            teams: ['Legal', 'Compliance', 'Engineering'],
            relatedProjects: [
              {
                projectId: 'proj-004',
                projectName: 'Regulatory Compliance Tracker',
                subAppId: 'prog-complize-001',
                subAppName: 'Complize Platform',
                contribution: 80
              },
              {
                projectId: 'proj-005',
                projectName: 'Audit Trail System',
                subAppId: 'prog-complize-001',
                subAppName: 'Complize Platform',
                contribution: 30
              }
            ],
            kpis: [
              {
                metric: 'Compliance Score',
                current: 78,
                target: 95,
                unit: '%'
              },
              {
                metric: 'Audit Findings',
                current: 12,
                target: 3,
                unit: 'issues'
              },
              {
                metric: 'Process Efficiency',
                current: 65,
                target: 90,
                unit: '%'
              }
            ],
            risks: [
              {
                description: 'Regulatory changes during implementation',
                impact: 'high',
                mitigation: 'Flexible framework design with rapid update capabilities'
              }
            ]
          },
          {
            id: 'init-003',
            title: 'Digital Transformation Initiative',
            description: 'Modernize legacy systems and migrate to cloud-native architecture across all platforms',
            status: 'active',
            priority: 'medium',
            timeline: {
              startDate: new Date('2024-06-01'),
              endDate: new Date('2026-03-31'),
              milestones: [
                {
                  id: 'ms-007',
                  title: 'Legacy System Assessment',
                  dueDate: new Date('2024-09-30'),
                  completed: true
                },
                {
                  id: 'ms-008',
                  title: 'Cloud Migration Phase 1',
                  dueDate: new Date('2025-06-30'),
                  completed: false
                },
                {
                  id: 'ms-009',
                  title: 'Full Platform Modernization',
                  dueDate: new Date('2026-03-31'),
                  completed: false
                }
              ]
            },
            budget: {
              allocated: 3200000,
              spent: 980000
            },
            teams: ['DevOps', 'Architecture', 'Engineering'],
            relatedProjects: [
              {
                projectId: 'proj-006',
                projectName: 'Visa Processing Automation',
                subAppId: 'prog-visacalc-001',
                subAppName: 'VisaCalc Pro',
                contribution: 50
              }
            ],
            kpis: [
              {
                metric: 'System Uptime',
                current: 99.2,
                target: 99.9,
                unit: '%'
              },
              {
                metric: 'Performance Improvement',
                current: 40,
                target: 200,
                unit: '%'
              },
              {
                metric: 'Cloud Migration Progress',
                current: 25,
                target: 100,
                unit: '%'
              }
            ],
            risks: [
              {
                description: 'Data migration complexity',
                impact: 'medium',
                mitigation: 'Comprehensive testing and rollback procedures'
              }
            ]
          }
        ];

        // Generate roadmap data
        const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
        const years = [2025, 2026];
        const mockRoadmap: RoadmapQuarter[] = [];

        years.forEach(year => {
          quarters.forEach(quarter => {
            const quarterInitiatives = mockInitiatives.filter(init => {
              const startYear = init.timeline.startDate.getFullYear();
              const endYear = init.timeline.endDate.getFullYear();
              return startYear <= year && endYear >= year;
            }).slice(0, 3); // Limit to 3 per quarter for display

            mockRoadmap.push({
              quarter,
              year,
              initiatives: quarterInitiatives.map(init => ({
                id: init.id,
                title: init.title,
                status: init.status,
                priority: init.priority
              }))
            });
          });
        });

        setInitiatives(mockInitiatives);
        setRoadmapData(mockRoadmap);

        // Log governance event
        governanceLogger.logSidebarInteraction({
          action: 'surface_switch',
          target: 'strategic-planning',
          context: 'sidebar_navigation',
          metadata: {
            view_type: selectedView,
            initiatives_count: mockInitiatives.length,
            status_filter: selectedStatus,
            priority_filter: selectedPriority
          }
        });
        
      } catch (error) {
        console.error('Failed to fetch strategic data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStrategicData();
  }, [selectedView, selectedStatus, selectedPriority]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planning': return 'bg-blue-100 text-blue-800';
      case 'active': return 'bg-green-100 text-green-800';
      case 'on-hold': return 'bg-amber-100 text-amber-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const navigateToProject = (subAppId: string, projectId: string, projectName: string) => {
    governanceLogger.logSidebarInteraction({
      action: 'project_switch',
      target: projectName,
      context: 'strategic_planning',
      metadata: {
        sub_app_id: subAppId,
        project_id: projectId,
        from_view: 'strategic-planning'
      }
    });
    
    navigate(`/orbis/sub-apps/${subAppId}/projects/${projectId}`);
  };

  // Filter initiatives
  const filteredInitiatives = initiatives.filter(initiative => {
    const matchesStatus = selectedStatus === 'all' || initiative.status === selectedStatus;
    const matchesPriority = selectedPriority === 'all' || initiative.priority === selectedPriority;
    return matchesStatus && matchesPriority;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Strategic Planning</h1>
          <p className="text-gray-600">
            Roadmaps and strategic initiatives across the organization
          </p>
        </div>

        {/* View Selector */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* View Tabs */}
            <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setSelectedView('initiatives')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  selectedView === 'initiatives'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Initiatives
              </button>
              <button
                onClick={() => setSelectedView('roadmap')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  selectedView === 'roadmap'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Roadmap
              </button>
              <button
                onClick={() => setSelectedView('kpis')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  selectedView === 'kpis'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                KPIs
              </button>
            </div>

            {/* Filters */}
            {selectedView === 'initiatives' && (
              <div className="flex space-x-4">
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="planning">Planning</option>
                  <option value="active">Active</option>
                  <option value="on-hold">On Hold</option>
                  <option value="completed">Completed</option>
                </select>
                <select
                  value={selectedPriority}
                  onChange={(e) => setSelectedPriority(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Priority</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Content based on selected view */}
        {selectedView === 'initiatives' && (
          <div className="space-y-6">
            {isLoading ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {[1, 2, 3, 4].map(i => (
                  <InitiativeCardSkeleton key={i} />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {filteredInitiatives.map((initiative) => (
                  <div key={initiative.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
                    {/* Initiative Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{initiative.title}</h3>
                        <p className="text-sm text-gray-600 mb-3">{initiative.description}</p>
                        <div className="flex space-x-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            getStatusColor(initiative.status)
                          }`}>
                            {initiative.status.charAt(0).toUpperCase() + initiative.status.slice(1)}
                          </span>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                            getPriorityColor(initiative.priority)
                          }`}>
                            {initiative.priority.charAt(0).toUpperCase() + initiative.priority.slice(1)} Priority
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Timeline and Budget */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <div className="flex items-center space-x-2 text-sm text-gray-600 mb-1">
                          <Calendar className="w-4 h-4" />
                          <span>Timeline</span>
                        </div>
                        <div className="text-sm text-gray-900">
                          {initiative.timeline.startDate.toLocaleDateString()} - {initiative.timeline.endDate.toLocaleDateString()}
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center space-x-2 text-sm text-gray-600 mb-1">
                          <DollarSign className="w-4 h-4" />
                          <span>Budget</span>
                        </div>
                        <div className="text-sm text-gray-900">
                          {formatCurrency(initiative.budget.spent)} / {formatCurrency(initiative.budget.allocated)}
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-600">Budget Progress</span>
                        <span className="font-medium">
                          {Math.round((initiative.budget.spent / initiative.budget.allocated) * 100)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${Math.min((initiative.budget.spent / initiative.budget.allocated) * 100, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Milestones */}
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Upcoming Milestones</h4>
                      <div className="space-y-2">
                        {initiative.timeline.milestones.slice(0, 2).map((milestone) => (
                          <div key={milestone.id} className="flex items-center space-x-2 text-sm">
                            {milestone.completed ? (
                              <CheckCircle2 className="w-4 h-4 text-green-600" />
                            ) : (
                              <Clock className="w-4 h-4 text-amber-600" />
                            )}
                            <span className={milestone.completed ? 'line-through text-gray-500' : 'text-gray-900'}>
                              {milestone.title}
                            </span>
                            <span className="text-gray-500">• {milestone.dueDate.toLocaleDateString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Related Projects */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Related Projects</h4>
                      <div className="space-y-1">
                        {initiative.relatedProjects.slice(0, 2).map((project) => (
                          <button
                            key={project.projectId}
                            onClick={() => navigateToProject(project.subAppId, project.projectId, project.projectName)}
                            className="block text-sm text-blue-600 hover:text-blue-700 truncate w-full text-left"
                          >
                            {project.projectName} ({project.contribution}% contribution)
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {selectedView === 'roadmap' && (
          <div>
            {isLoading ? (
              <RoadmapSkeleton />
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Strategic Roadmap</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {roadmapData.map((quarter) => (
                    <div key={`${quarter.year}-${quarter.quarter}`} className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4 text-blue-600" />
                        <h3 className="font-medium text-gray-900">{quarter.quarter} {quarter.year}</h3>
                      </div>
                      <div className="space-y-2">
                        {quarter.initiatives.map((initiative) => (
                          <div
                            key={initiative.id}
                            className={`p-3 rounded-lg border text-sm ${getPriorityColor(initiative.priority)}`}
                          >
                            <div className="font-medium mb-1">{initiative.title}</div>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              getStatusColor(initiative.status)
                            }`}>
                              {initiative.status}
                            </span>
                          </div>
                        ))}
                        {quarter.initiatives.length === 0 && (
                          <div className="p-3 text-center text-gray-500 text-sm italic border-2 border-dashed border-gray-200 rounded-lg">
                            No initiatives planned
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {selectedView === 'kpis' && (
          <div>
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <InitiativeCardSkeleton key={i} />
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                {filteredInitiatives.map((initiative) => (
                  <div key={initiative.id} className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">{initiative.title}</h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        getStatusColor(initiative.status)
                      }`}>
                        {initiative.status.charAt(0).toUpperCase() + initiative.status.slice(1)}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {initiative.kpis.map((kpi, index) => (
                        <div key={index} className="bg-gray-50 rounded-lg p-4">
                          <div className="flex items-center space-x-2 mb-2">
                            <TrendingUp className="w-4 h-4 text-blue-600" />
                            <h4 className="font-medium text-gray-900">{kpi.metric}</h4>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600">Current:</span>
                              <span className="font-semibold text-gray-900">{kpi.current} {kpi.unit}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600">Target:</span>
                              <span className="font-semibold text-green-600">{kpi.target} {kpi.unit}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                              <div
                                className={`h-2 rounded-full ${
                                  (kpi.current / kpi.target) >= 1 ? 'bg-green-500' :
                                  (kpi.current / kpi.target) >= 0.7 ? 'bg-amber-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${Math.min((kpi.current / kpi.target) * 100, 100)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StrategicPlanning;