import React from 'react';
import { Activity, Shield, FileText, Grid3x3, Layers } from 'lucide-react';
import { Outlet, useNavigate, useParams } from 'react-router-dom';
import type { Program } from '../types/models';
import { mockProjects } from '../data/mockProjects';

interface SubAppDashboardProps {
  subApp: Program;
  onWorkSurfaceSelect: (surface: string) => void;
}

interface ProgramMetrics {
  activeProjects: number;
  activePhases: number;
  blockedSteps: number;
  governanceLogs: number;
  templates: number;
  documents: number;
}

interface DashboardCard {
  id: string;
  title: string;
  icon: React.ReactNode;
  primaryMetric: string;
  primaryValue: number;
  secondaryMetric?: string;
  secondaryValue?: number;
  urgency: 'low' | 'medium' | 'high';
  accentColor: string;
  bgColor: string;
  action: string;
}

// Sub-App brand theming
const subAppThemes: Record<string, { accent: string; bgLight: string; bgDark: string }> = {
  'prog-orbis-001': {
    accent: '#8B5CF6',
    bgLight: '#EDE9FE',
    bgDark: '#7C3AED'
  },
  'prog-complize-001': {
    accent: '#DC2626',
    bgLight: '#FEE2E2',
    bgDark: '#B91C1C'
  },
  'prog-metaplatform-001': {
    accent: '#059669',
    bgLight: '#D1FAE5',
    bgDark: '#047857'
  }
};

export const SubAppDashboard: React.FC<SubAppDashboardProps> = ({ 
  subApp, 
  onWorkSurfaceSelect 
}) => {
  const navigate = useNavigate();
  const { subAppId } = useParams<{ subAppId: string }>();
  const theme = subAppThemes[subApp.id] || subAppThemes['prog-orbis-001'];
  
  // Calculate program metrics
  const metrics: ProgramMetrics = React.useMemo(() => {
    const projects = mockProjects.filter(p => p.linkedProgramId === subApp.id);
    return {
      activeProjects: projects.length,
      activePhases: projects.reduce((sum, p) => sum + (p.phaseSteps?.length || 0), 0),
      blockedSteps: Math.floor(Math.random() * 5), // Mock data
      governanceLogs: Math.floor(Math.random() * 20) + 10,
      templates: 12,
      documents: 45
    };
  }, [subApp.id]);

  // Generate dashboard cards with contextual data
  const dashboardCards: DashboardCard[] = [
    {
      id: 'plan',
      title: 'Plan',
      icon: <Layers className="w-5 h-5" />,
      primaryMetric: 'Active Phases',
      primaryValue: metrics.activePhases,
      secondaryMetric: 'Blocked Steps',
      secondaryValue: metrics.blockedSteps,
      urgency: metrics.blockedSteps > 2 ? 'high' : 'low',
      accentColor: theme.accent,
      bgColor: theme.bgLight,
      action: 'View Planning Board'
    },
    {
      id: 'govern',
      title: 'Govern',
      icon: <Shield className="w-5 h-5" />,
      primaryMetric: 'Governance Logs',
      primaryValue: metrics.governanceLogs,
      secondaryMetric: 'Pending Reviews',
      secondaryValue: 3,
      urgency: 'medium',
      accentColor: theme.accent,
      bgColor: theme.bgLight,
      action: 'Review Governance'
    },
    {
      id: 'document',
      title: 'Document',
      icon: <FileText className="w-5 h-5" />,
      primaryMetric: 'Documents',
      primaryValue: metrics.documents,
      urgency: 'low',
      accentColor: theme.accent,
      bgColor: theme.bgLight,
      action: 'Browse Documents'
    },
    {
      id: 'templates',
      title: 'Templates',
      icon: <Grid3x3 className="w-5 h-5" />,
      primaryMetric: 'Template Sets',
      primaryValue: metrics.templates,
      urgency: 'low',
      accentColor: theme.accent,
      bgColor: theme.bgLight,
      action: 'Manage Templates'
    }
  ];

  // Program health calculation
  const programHealth = metrics.blockedSteps === 0 ? 'healthy' : 
                       metrics.blockedSteps <= 2 ? 'warning' : 'critical';

  return (
    <div className="wt-surface wt-animate-fade-in min-h-screen bg-gray-50 p-8">
      {/* Welcome Header with Program Context */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-200">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Welcome to {subApp.name}
              </h1>
              <p className="text-lg text-gray-600">{subApp.description}</p>
              
              <div className="flex items-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Status:</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    subApp.status === 'Active' ? 'bg-green-100 text-green-700' :
                    subApp.status === 'Planning' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {subApp.status}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Type:</span>
                  <span className="text-sm font-medium text-gray-900">{subApp.programType}</span>
                </div>
              </div>
            </div>

            {/* Program Health Indicator */}
            <div className="text-center">
              <div className="text-sm text-gray-500 mb-2">Program Health</div>
              <div className="relative">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center ${
                  programHealth === 'healthy' ? 'bg-green-100' :
                  programHealth === 'warning' ? 'bg-amber-100' : 'bg-red-100'
                }`}>
                  <Activity className={`w-10 h-10 ${
                    programHealth === 'healthy' ? 'text-green-600' :
                    programHealth === 'warning' ? 'text-amber-600' : 'text-red-600'
                  }`} />
                </div>
                <div className={`mt-2 text-sm font-medium ${
                  programHealth === 'healthy' ? 'text-green-600' :
                  programHealth === 'warning' ? 'text-amber-600' : 'text-red-600'
                }`}>
                  {programHealth === 'healthy' ? 'All Systems Go' :
                   programHealth === 'warning' ? 'Needs Attention' : 'Critical Issues'}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-4 gap-4 mt-8 pt-8 border-t border-gray-200">
            <div>
              <div className="text-2xl font-bold" style={{ color: theme.accent }}>
                {metrics.activeProjects}
              </div>
              <div className="text-sm text-gray-500">Active Projects</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{metrics.activePhases}</div>
              <div className="text-sm text-gray-500">Active Phases</div>
            </div>
            <div>
              <div className={`text-2xl font-bold ${
                metrics.blockedSteps > 0 ? 'text-red-600' : 'text-green-600'
              }`}>
                {metrics.blockedSteps}
              </div>
              <div className="text-sm text-gray-500">Blocked Steps</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {Math.floor((metrics.activePhases - metrics.blockedSteps) / metrics.activePhases * 100)}%
              </div>
              <div className="text-sm text-gray-500">Progress Rate</div>
            </div>
          </div>
        </div>
      </div>

      {/* Work Surface Cards Grid */}
      <div className="max-w-6xl mx-auto">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Work Surfaces</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sub-app-landing-grid">
          {dashboardCards.map((card) => (
            <button
              key={card.id}
              onClick={() => {
                if (card.id === 'dashboard' || card.id === 'analytics') {
                  navigate(`/subapps/${subApp.id}/${card.id}`);
                } else {
                  onWorkSurfaceSelect(card.id);
                }
              }}
              className="bg-white rounded-xl shadow-sm hover:shadow-lg border border-gray-200 p-6 
                       transition-all duration-300 hover:-translate-y-1 text-left group 
                       wt-interactive overflow-hidden"
              style={{ borderLeftWidth: '4px', borderLeftColor: card.accentColor }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-12 h-12 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: card.bgColor, color: card.accentColor }}
                  >
                    {card.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">{card.title}</h3>
                </div>
                
                {card.urgency === 'high' && (
                  <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                    Urgent
                  </span>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-gray-500">{card.primaryMetric}</span>
                  <span className="text-2xl font-bold text-gray-900">{card.primaryValue}</span>
                </div>
                
                {card.secondaryMetric && (
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm text-gray-500">{card.secondaryMetric}</span>
                    <span className={`text-lg font-semibold ${
                      card.secondaryValue && card.secondaryValue > 0 ? 'text-red-600' : 'text-gray-900'
                    }`}>
                      {card.secondaryValue}
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100">
                <span className="text-sm font-medium group-hover:underline" style={{ color: card.accentColor }}>
                  {card.action} →
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Recent Activity (Optional Enhancement) */}
      <div className="max-w-6xl mx-auto mt-8">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-gray-600">Phase "Design System Integration" completed</span>
              <span className="text-gray-400 ml-auto">2 hours ago</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="w-2 h-2 rounded-full bg-amber-500"></div>
              <span className="text-gray-600">New blocker in "API Integration" phase</span>
              <span className="text-gray-400 ml-auto">5 hours ago</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              <span className="text-gray-600">Governance review scheduled for tomorrow</span>
              <span className="text-gray-400 ml-auto">Yesterday</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Outlet for nested routes (SubApp dashboard views) */}
      <Outlet />
    </div>
  );
};