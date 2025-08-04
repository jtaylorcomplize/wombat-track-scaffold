import React, { useState, useEffect } from 'react';
import { Users, Star, TrendingUp, Clock, Award, AlertTriangle, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { governanceLogger } from '../../services/governanceLogger';

interface TeamMember {
  id: string;
  name: string;
  role: string;
  email: string;
  avatar?: string;
  skills: string[];
  currentProjects: {
    projectId: string;
    projectName: string;
    subAppId: string;
    subAppName: string;
    role: string;
    allocation: number; // percentage
  }[];
  performance: {
    velocity: number;
    quality: number;
    satisfaction: number;
    lastReview: Date;
  };
  availability: {
    status: 'available' | 'busy' | 'overloaded';
    utilization: number; // percentage
    nextAvailable?: Date;
  };
}

interface TeamMetrics {
  totalMembers: number;
  averageUtilization: number;
  averageVelocity: number;
  averageSatisfaction: number;
  skillGaps: string[];
  topPerformers: string[];
  atRiskMembers: string[];
}

// Skeleton components
const TeamCardSkeleton: React.FC = () => (
  <div className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
    <div className="flex items-center space-x-4 mb-4">
      <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
      <div className="flex-1">
        <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-24"></div>
      </div>
    </div>
    <div className="space-y-2">
      <div className="h-3 bg-gray-200 rounded w-full"></div>
      <div className="h-3 bg-gray-200 rounded w-3/4"></div>
    </div>
  </div>
);

const TeamOverview: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [sortBy, setSortBy] = useState('utilization');
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [teamMetrics, setTeamMetrics] = useState<TeamMetrics | null>(null);

  // Fetch team data
  useEffect(() => {
    const fetchTeamData = async () => {
      setIsLoading(true);
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Mock team data
        const mockTeamMembers: TeamMember[] = [
          {
            id: 'tm-001',
            name: 'Sarah Chen',
            role: 'Senior Product Manager',
            email: 'sarah.chen@company.com',
            skills: ['Product Strategy', 'Agile', 'Data Analysis', 'UI/UX'],
            currentProjects: [
              {
                projectId: 'proj-001',
                projectName: 'Market Analysis Platform',
                subAppId: 'prog-orbis-001',
                subAppName: 'Orbis Intelligence',
                role: 'Product Owner',
                allocation: 60
              },
              {
                projectId: 'proj-002',
                projectName: 'Customer Insights Dashboard',
                subAppId: 'prog-orbis-001',
                subAppName: 'Orbis Intelligence',
                role: 'Stakeholder',
                allocation: 20
              }
            ],
            performance: {
              velocity: 92,
              quality: 88,
              satisfaction: 4.5,
              lastReview: new Date('2024-12-15')
            },
            availability: {
              status: 'busy',
              utilization: 80,
              nextAvailable: new Date('2025-02-15')
            }
          },
          {
            id: 'tm-002',
            name: 'Michael Park',
            role: 'Full Stack Developer',
            email: 'michael.park@company.com',
            skills: ['React', 'Node.js', 'PostgreSQL', 'AWS', 'TypeScript'],
            currentProjects: [
              {
                projectId: 'proj-002',
                projectName: 'Customer Insights Dashboard',
                subAppId: 'prog-orbis-001',
                subAppName: 'Orbis Intelligence',
                role: 'Lead Developer',
                allocation: 90
              }
            ],
            performance: {
              velocity: 95,
              quality: 92,
              satisfaction: 4.3,
              lastReview: new Date('2024-11-30')
            },
            availability: {
              status: 'busy',
              utilization: 90
            }
          },
          {
            id: 'tm-003',
            name: 'Lisa Wang',
            role: 'Data Scientist',
            email: 'lisa.wang@company.com',
            skills: ['Python', 'Machine Learning', 'Statistics', 'SQL', 'TensorFlow'],
            currentProjects: [
              {
                projectId: 'proj-003',
                projectName: 'Predictive Analytics Engine',
                subAppId: 'prog-orbis-001',
                subAppName: 'Orbis Intelligence',
                role: 'Technical Lead',
                allocation: 50
              }
            ],
            performance: {
              velocity: 78,
              quality: 95,
              satisfaction: 4.1,
              lastReview: new Date('2024-10-20')
            },
            availability: {
              status: 'available',
              utilization: 50,
              nextAvailable: new Date('2025-01-15')
            }
          },
          {
            id: 'tm-004',
            name: 'James Wilson',
            role: 'DevOps Engineer',
            email: 'james.wilson@company.com',
            skills: ['Kubernetes', 'Docker', 'CI/CD', 'AWS', 'Terraform'],
            currentProjects: [
              {
                projectId: 'proj-004',
                projectName: 'Regulatory Compliance Tracker',
                subAppId: 'prog-complize-001',
                subAppName: 'Complize Platform',
                role: 'Infrastructure Lead',
                allocation: 70
              },
              {
                projectId: 'proj-006',
                projectName: 'Visa Processing Automation',
                subAppId: 'prog-visacalc-001',
                subAppName: 'VisaCalc Pro',
                role: 'DevOps Support',
                allocation: 40
              }
            ],
            performance: {
              velocity: 87,
              quality: 89,
              satisfaction: 4.0,
              lastReview: new Date('2024-12-01')
            },
            availability: {
              status: 'overloaded',
              utilization: 110
            }
          },
          {
            id: 'tm-005',
            name: 'Emma Thompson',
            role: 'QA Engineer',
            email: 'emma.thompson@company.com',
            skills: ['Test Automation', 'Selenium', 'Jest', 'Cypress', 'Quality Assurance'],
            currentProjects: [
              {
                projectId: 'proj-005',
                projectName: 'Audit Trail System',
                subAppId: 'prog-complize-001',
                subAppName: 'Complize Platform',
                role: 'QA Lead',
                allocation: 100
              }
            ],
            performance: {
              velocity: 91,
              quality: 96,
              satisfaction: 4.4,
              lastReview: new Date('2024-12-10')
            },
            availability: {
              status: 'busy',
              utilization: 100
            }
          }
        ];

        // Calculate team metrics
        const totalMembers = mockTeamMembers.length;
        const averageUtilization = Math.round(
          mockTeamMembers.reduce((sum, member) => sum + member.availability.utilization, 0) / totalMembers
        );
        const averageVelocity = Math.round(
          mockTeamMembers.reduce((sum, member) => sum + member.performance.velocity, 0) / totalMembers
        );
        const averageSatisfaction = Number(
          (mockTeamMembers.reduce((sum, member) => sum + member.performance.satisfaction, 0) / totalMembers).toFixed(1)
        );

        const topPerformers = mockTeamMembers
          .filter(member => member.performance.velocity >= 90 && member.performance.quality >= 90)
          .map(member => member.name);

        const atRiskMembers = mockTeamMembers
          .filter(member => 
            member.availability.utilization > 100 || 
            member.performance.satisfaction < 4.0 ||
            member.performance.velocity < 80
          )
          .map(member => member.name);

        const mockMetrics: TeamMetrics = {
          totalMembers,
          averageUtilization,
          averageVelocity,
          averageSatisfaction,
          skillGaps: ['UI/UX Design', 'Mobile Development', 'Security Engineering'],
          topPerformers,
          atRiskMembers
        };

        setTeamMembers(mockTeamMembers);
        setTeamMetrics(mockMetrics);

        // Log governance event
        governanceLogger.logSidebarInteraction({
          action: 'surface_switch',
          target: 'team-overview',
          context: 'sidebar_navigation',
          metadata: {
            total_members: totalMembers,
            department_filter: selectedDepartment,
            sort_by: sortBy
          }
        });
        
      } catch (error) {
        console.error('Failed to fetch team data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTeamData();
  }, [selectedDepartment, sortBy]);

  const getAvailabilityColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800';
      case 'busy': return 'bg-amber-100 text-amber-800';
      case 'overloaded': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getUtilizationColor = (utilization: number) => {
    if (utilization > 100) return 'text-red-600';
    if (utilization > 80) return 'text-amber-600';
    return 'text-green-600';
  };

  const navigateToProject = (subAppId: string, projectId: string, projectName: string) => {
    governanceLogger.logSidebarInteraction({
      action: 'project_switch',
      target: projectName,
      context: 'team_overview',
      metadata: {
        sub_app_id: subAppId,
        project_id: projectId,
        from_view: 'team-overview'
      }
    });
    
    navigate(`/orbis/sub-apps/${subAppId}/projects/${projectId}`);
  };

  // Sort team members
  const sortedMembers = [...teamMembers].sort((a, b) => {
    switch (sortBy) {
      case 'utilization':
        return b.availability.utilization - a.availability.utilization;
      case 'velocity':
        return b.performance.velocity - a.performance.velocity;
      case 'satisfaction':
        return b.performance.satisfaction - a.performance.satisfaction;
      case 'name':
        return a.name.localeCompare(b.name);
      default:
        return 0;
    }
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Team Overview</h1>
          <p className="text-gray-600">
            Team allocation and performance across all projects
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Department:</label>
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Departments</option>
                <option value="engineering">Engineering</option>
                <option value="product">Product</option>
                <option value="design">Design</option>
                <option value="qa">Quality Assurance</option>
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Sort by:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="utilization">Utilization</option>
                <option value="velocity">Velocity</option>
                <option value="satisfaction">Satisfaction</option>
                <option value="name">Name</option>
              </select>
            </div>
          </div>
        </div>

        {/* Team Metrics Summary */}
        {isLoading || !teamMetrics ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map(i => (
              <TeamCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {/* Total Members */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Total Members</span>
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{teamMetrics.totalMembers}</div>
              <div className="text-sm text-gray-500 mt-1">
                Active team members
              </div>
            </div>

            {/* Average Utilization */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Avg Utilization</span>
                <Clock className="w-5 h-5 text-purple-600" />
              </div>
              <div className={`text-2xl font-bold ${getUtilizationColor(teamMetrics.averageUtilization)}`}>
                {teamMetrics.averageUtilization}%
              </div>
              <div className="text-sm text-gray-500 mt-1">
                Team capacity used
              </div>
            </div>

            {/* Average Velocity */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Avg Velocity</span>
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{teamMetrics.averageVelocity}%</div>
              <div className="text-sm text-gray-500 mt-1">
                Performance score
              </div>
            </div>

            {/* Average Satisfaction */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Satisfaction</span>
                <Star className="w-5 h-5 text-amber-500" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{teamMetrics.averageSatisfaction}</div>
              <div className="text-sm text-gray-500 mt-1">
                Out of 5.0
              </div>
            </div>
          </div>
        )}

        {/* Alerts and Insights */}
        {!isLoading && teamMetrics && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Top Performers */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <div className="flex items-center space-x-2 mb-3">
                <Award className="w-5 h-5 text-green-600" />
                <h3 className="font-semibold text-green-900">Top Performers</h3>
              </div>
              <div className="space-y-1">
                {teamMetrics.topPerformers.length > 0 ? (
                  teamMetrics.topPerformers.map(name => (
                    <div key={name} className="text-sm text-green-800">{name}</div>
                  ))
                ) : (
                  <div className="text-sm text-green-700">No top performers this period</div>
                )}
              </div>
            </div>

            {/* At Risk Members */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <div className="flex items-center space-x-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <h3 className="font-semibold text-red-900">Needs Attention</h3>
              </div>
              <div className="space-y-1">
                {teamMetrics.atRiskMembers.length > 0 ? (
                  teamMetrics.atRiskMembers.map(name => (
                    <div key={name} className="text-sm text-red-800">{name}</div>
                  ))
                ) : (
                  <div className="text-sm text-red-700">All team members performing well</div>
                )}
              </div>
            </div>

            {/* Skill Gaps */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
              <div className="flex items-center space-x-2 mb-3">
                <TrendingUp className="w-5 h-5 text-amber-600" />
                <h3 className="font-semibold text-amber-900">Skill Gaps</h3>
              </div>
              <div className="space-y-1">
                {teamMetrics.skillGaps.map(skill => (
                  <div key={skill} className="text-sm text-amber-800">{skill}</div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Team Members Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <TeamCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedMembers.map((member) => (
              <div key={member.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
                {/* Member Header */}
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                    {member.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{member.name}</h3>
                    <p className="text-sm text-gray-500 truncate">{member.role}</p>
                    <a 
                      href={`mailto:${member.email}`}
                      className="text-xs text-blue-600 hover:text-blue-700 flex items-center space-x-1"
                    >
                      <Mail className="w-3 h-3" />
                      <span>Contact</span>
                    </a>
                  </div>
                </div>

                {/* Availability Status */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      getAvailabilityColor(member.availability.status)
                    }`}>
                      {member.availability.status}
                    </span>
                    <span className={`text-sm font-medium ${getUtilizationColor(member.availability.utilization)}`}>
                      {member.availability.utilization}% utilized
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        member.availability.utilization > 100 ? 'bg-red-500' :
                        member.availability.utilization > 80 ? 'bg-amber-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(member.availability.utilization, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Performance Metrics */}
                <div className="mb-4 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-lg font-semibold text-gray-900">{member.performance.velocity}%</div>
                    <div className="text-xs text-gray-500">Velocity</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-gray-900">{member.performance.quality}%</div>
                    <div className="text-xs text-gray-500">Quality</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-gray-900">{member.performance.satisfaction}</div>
                    <div className="text-xs text-gray-500">Satisfaction</div>
                  </div>
                </div>

                {/* Current Projects */}
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Current Projects</h4>
                  <div className="space-y-2">
                    {member.currentProjects.map((project) => (
                      <div key={project.projectId} className="text-sm">
                        <button
                          onClick={() => navigateToProject(project.subAppId, project.projectId, project.projectName)}
                          className="text-blue-600 hover:text-blue-700 font-medium truncate block w-full text-left"
                        >
                          {project.projectName}
                        </button>
                        <div className="text-xs text-gray-500">
                          {project.role} • {project.allocation}% allocation
                        </div>
                      </div>
                    ))}
                    {member.currentProjects.length === 0 && (
                      <div className="text-sm text-gray-500 italic">No active projects</div>
                    )}
                  </div>
                </div>

                {/* Skills */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Key Skills</h4>
                  <div className="flex flex-wrap gap-1">
                    {member.skills.slice(0, 4).map((skill) => (
                      <span
                        key={skill}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {skill}
                      </span>
                    ))}
                    {member.skills.length > 4 && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        +{member.skills.length - 4} more
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamOverview;