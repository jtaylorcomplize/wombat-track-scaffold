import React, { useState, useEffect, lazy, Suspense } from 'react';
import { EnhancedSidebar } from './EnhancedSidebar';
import { BreadcrumbHeader } from './BreadcrumbHeader';
import { QuickSwitcherModal } from './QuickSwitcherModal';
import { SubAppDashboard } from '../SubAppDashboard';
import { AdminDashboard } from '../admin/AdminDashboard';

// Dynamic imports for better performance and loading states
const PlanSurface = lazy(() => import('../surfaces/PlanSurface'));
const ExecuteSurface = lazy(() => import('../surfaces/ExecuteSurface'));
const DocumentSurface = lazy(() => import('../surfaces/DocumentSurface'));
const GovernSurface = lazy(() => import('../surfaces/GovernSurface'));
const IntegrateSurface = lazy(() => import('../surfaces/IntegrateSurface'));
const CloudIDESurface = lazy(() => import('../surfaces/CloudIDESurface'));
const MultiAgentOrchestrationSurface = lazy(() => import('../surfaces/MultiAgentOrchestrationSurface'));
const SPQRRuntimeDashboard = lazy(() => import('../SPQR/SPQRRuntimeDashboard'));
import { AdminModeProvider } from '../../contexts/AdminModeContext';
import { ProjectProvider, useProjectContext } from '../../contexts/ProjectContext';
import { useSidebarState } from '../../hooks/useLocalStorage';
import AdminErrorBoundary from '../admin/AdminErrorBoundary';
import type { Project, Phase, PhaseStep as Step } from '../../types/phase';
import { mockPrograms } from '../../data/mockPrograms';
import { fetchProjectsFromOApp } from '../../services/oappAPI';

export type WorkSurface = 'plan' | 'execute' | 'document' | 'govern' | 'integrate' | 'cloud-ide' | 'multi-agent-orchestration' | 'spqr-runtime' | 'admin' | 'admin-data-explorer' | 'admin-import-export' | 'admin-orphan-inspector' | 'admin-runtime-panel' | 'admin-secrets-manager';

// Loading component for nested dashboards
const DashboardLoading: React.FC = () => (
  <div className="flex items-center justify-center min-h-96 wt-animate-fade-in">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <p className="text-gray-600">Loading dashboard...</p>
    </div>
  </div>
);

export interface AppLayoutProps {
  initialProjects?: Project[];
}

// Mock project data - in real app this would come from API
const mockProjects: Project[] = [
  {
    id: 'proj-1',
    name: 'Complize Platform',
    description: 'Main platform project',
    createdAt: new Date().toISOString(),
    createdBy: 'user',
    projectOwner: 'user',
    projectType: 'Platform',
    status: 'Active',
    completionPercentage: 65,
    currentPhase: 'Development',
    phases: [
      {
        id: 'phase-1',
        projectId: 'proj-1',
        name: 'Phase 1: Planning',
        description: 'Initial planning phase',
        order: 1,
        status: 'completed' as const,
        completionPercentage: 100,
        steps: []
      },
      {
        id: 'phase-2',
        projectId: 'proj-1',
        name: 'Phase 2: Development',
        description: 'Core development phase',
        order: 2,
        status: 'in_progress' as const,
        completionPercentage: 75,
        steps: [
          {
            id: 'step-1',
            phaseId: 'phase-2',
            name: 'Setup Development Environment',
            status: 'complete' as const,
            description: 'Set up development environment and tools',
            stepInstruction: 'Configure development environment',
            isSideQuest: false
          },
          {
            id: 'step-2',
            phaseId: 'phase-2',
            name: 'Implement Core Features',
            status: 'in_progress' as const,
            description: 'Implement main application features',
            stepInstruction: 'Develop core functionality',
            isSideQuest: false
          }
        ]
      }
    ]
  },
  {
    id: 'proj-2',
    name: 'Security Audit Platform',
    description: 'Compliance and security audit system',
    createdAt: new Date().toISOString(),
    createdBy: 'user',
    projectOwner: 'security-team',
    projectType: 'Security' as const,
    status: 'Active',
    completionPercentage: 30,
    currentPhase: 'Analysis',
    phases: [
      {
        id: 'phase-3',
        projectId: 'proj-2',
        name: 'Phase 1: Analysis',
        description: 'Security analysis and requirements',
        order: 1,
        status: 'in_progress' as const,
        completionPercentage: 45,
        steps: []
      }
    ]
  }
];

// Internal component that uses ProjectContext
const AppLayoutInner: React.FC<AppLayoutProps> = ({ initialProjects = mockProjects }) => {
  const projectContext = useProjectContext();
  const { projects, setProjects, activeProjectId, setActiveProjectId } = projectContext;
  
  // Derive current project from context
  const currentProject = projects.find(p => p.id === activeProjectId) || projects[0] || null;
  
  // Use persistent state hooks
  const { 
    collapsed: sidebarCollapsed, 
    setCollapsed: setSidebarCollapsed,
    selectedSurface, 
    setSelectedSurface,
    currentSubApp,
    setCurrentSubApp
  } = useSidebarState();

  const [showSubAppDashboard, setShowSubAppDashboard] = useState<boolean>(true);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [dataSource, setDataSource] = useState<'mock' | 'oapp'>('mock');
  const [currentPhase, setCurrentPhase] = useState<Phase | null>(
    currentProject?.phases.find(p => p.status === 'in_progress') || currentProject?.phases[0] || null
  );
  const [currentStep, setCurrentStep] = useState<Step | null>(
    currentPhase?.steps.find(s => s.status === 'in_progress') || currentPhase?.steps[0] || null
  );

  const [quickSwitcherOpen, setQuickSwitcherOpen] = useState(false);

  // Keyboard shortcut for quick switcher
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setQuickSwitcherOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Mock sub-app data for quick switcher
  const mockSubApps = [
    {
      id: 'prog-orbis-001',
      name: 'Orbis Intelligence',
      status: 'active' as const,
      lastUpdated: new Date(Date.now() - 2 * 60 * 1000),
      description: 'AI-powered business intelligence and analytics platform'
    },
    {
      id: 'prog-complize-001',
      name: 'Complize Platform',
      status: 'warning' as const,
      lastUpdated: new Date(Date.now() - 15 * 60 * 1000),
      description: 'Compliance management and regulatory tracking system'
    },
    {
      id: 'prog-spqr-001',
      name: 'SPQR Runtime',
      status: 'offline' as const,
      lastUpdated: new Date(Date.now() - 45 * 60 * 1000),
      description: 'Real-time system monitoring and performance dashboard'
    }
  ];

  // Load projects from oApp on mount
  useEffect(() => {
    const loadOAppProjects = async () => {
      console.log('🔍 Loading projects from oApp production database...');
      setLoadingProjects(true);
      
      try {
        const oappProjects = await fetchProjectsFromOApp();
        console.log(`✅ Successfully loaded ${oappProjects.length} projects from oApp`);
        
        setProjects(oappProjects);
        setDataSource('oapp');
        
        // Set first project as current if no active project
        if (!activeProjectId && oappProjects.length > 0) {
          setActiveProjectId(oappProjects[0].id);
        }
        
        // Log to governance for observability
        const governanceEntry = {
          timestamp: new Date().toISOString(),
          event_type: 'dev-server-fix',
          user_id: 'system',
          user_role: 'system',
          resource_type: 'development_environment',
          resource_id: 'wombat-track-dev-server',
          action: 'connect_to_oapp',
          success: true,
          details: {
            operation: 'Dev Server oApp Connection',
            projects_loaded: oappProjects.length,
            data_source: 'oApp production DB',
            status: 'projects_visible',
            previousDataSource: 'mock',
            newDataSource: 'oapp'
          }
        };
        
        console.log('📝 Dev Server Fix - oApp Connection:', governanceEntry);
        
      } catch (error) {
        console.error('❌ Failed to load projects from oApp:', error);
        console.log('🔄 Continuing with mock data for offline development');
        setDataSource('mock');
        
        // Log governance entry for fallback
        const fallbackEntry = {
          timestamp: new Date().toISOString(),
          event_type: 'dev-server-fallback',
          user_id: 'system',
          user_role: 'system',
          resource_type: 'development_environment',
          resource_id: 'wombat-track-dev-server',
          action: 'fallback_to_mock',
          success: false,
          details: {
            operation: 'Dev Server oApp Connection',
            error: error instanceof Error ? error.message : 'Unknown error',
            fallback_used: 'mock data',
            projects_count: initialProjects.length
          }
        };
        
        console.log('📝 Dev Server Fallback:', fallbackEntry);
      } finally {
        setLoadingProjects(false);
      }
    };

    // Initialize projects with mock data if context is empty
    if (projects.length === 0 && initialProjects.length > 0) {
      setProjects(initialProjects);
      if (!activeProjectId && initialProjects.length > 0) {
        setActiveProjectId(initialProjects[0].id);
      }
    }

    loadOAppProjects();
  }, [activeProjectId, initialProjects.length, projects.length, setProjects, setActiveProjectId]);

  const handleProjectChange = (project: Project) => {
    setActiveProjectId(project.id);
    const activePhase = project.phases.find(p => p.status === 'in_progress') || project.phases[0] || null;
    setCurrentPhase(activePhase);
    const activeStep = activePhase?.steps.find(s => s.status === 'in_progress') || activePhase?.steps[0] || null;
    setCurrentStep(activeStep);
  };

  const handlePhaseChange = (phase: Phase) => {
    setCurrentPhase(phase);
    const activeStep = phase.steps.find(s => s.status === 'in_progress') || phase.steps[0] || null;
    setCurrentStep(activeStep);
  };

  const handleWorkSurfaceSelect = (surface: string) => {
    setSelectedSurface(surface as WorkSurface);
    setShowSubAppDashboard(false);
  };

  const renderCurrentSurface = () => {
    const commonProps = {
      currentProject,
      currentPhase,
      currentStep,
      onPhaseChange: handlePhaseChange,
      onStepChange: setCurrentStep
    };

    switch (selectedSurface) {
      case 'plan':
        return (
          <Suspense fallback={<DashboardLoading />}>
            <PlanSurface {...commonProps} />
          </Suspense>
        );
      case 'execute':
        return (
          <Suspense fallback={<DashboardLoading />}>
            <ExecuteSurface {...commonProps} />
          </Suspense>
        );
      case 'document':
        return (
          <Suspense fallback={<DashboardLoading />}>
            <DocumentSurface {...commonProps} />
          </Suspense>
        );
      case 'govern':
        return (
          <Suspense fallback={<DashboardLoading />}>
            <GovernSurface {...commonProps} />
          </Suspense>
        );
      case 'integrate':
        return (
          <Suspense fallback={<DashboardLoading />}>
            <IntegrateSurface {...commonProps} />
          </Suspense>
        );
      case 'cloud-ide':
        return (
          <Suspense fallback={<DashboardLoading />}>
            <CloudIDESurface {...commonProps} />
          </Suspense>
        );
      case 'multi-agent-orchestration':
        return (
          <Suspense fallback={<DashboardLoading />}>
            <MultiAgentOrchestrationSurface {...commonProps} />
          </Suspense>
        );
      case 'spqr-runtime':
        return (
          <Suspense fallback={<DashboardLoading />}>
            <SPQRRuntimeDashboard />
          </Suspense>
        );
      case 'admin':
        // Auto-enable admin mode when accessing admin surfaces
        localStorage.setItem('wombat-track-admin-mode', 'true');
        return (
          <AdminModeProvider>
            <AdminErrorBoundary>
              <AdminDashboard initialView="overview" />
            </AdminErrorBoundary>
          </AdminModeProvider>
        );
      case 'admin-data-explorer':
        localStorage.setItem('wombat-track-admin-mode', 'true');
        return (
          <AdminModeProvider>
            <AdminErrorBoundary>
              <AdminDashboard initialView="data-explorer" />
            </AdminErrorBoundary>
          </AdminModeProvider>
        );
      case 'admin-import-export':
        localStorage.setItem('wombat-track-admin-mode', 'true');
        return (
          <AdminModeProvider>
            <AdminErrorBoundary>
              <AdminDashboard initialView="import-export" />
            </AdminErrorBoundary>
          </AdminModeProvider>
        );
      case 'admin-orphan-inspector':
        localStorage.setItem('wombat-track-admin-mode', 'true');
        return (
          <AdminModeProvider>
            <AdminErrorBoundary>
              <AdminDashboard initialView="orphan-inspector" />
            </AdminErrorBoundary>
          </AdminModeProvider>
        );
      case 'admin-runtime-panel':
        localStorage.setItem('wombat-track-admin-mode', 'true');
        return (
          <AdminModeProvider>
            <AdminErrorBoundary>
              <AdminDashboard initialView="runtime-panel" />
            </AdminErrorBoundary>
          </AdminModeProvider>
        );
      case 'admin-secrets-manager':
        localStorage.setItem('wombat-track-admin-mode', 'true');
        return (
          <AdminModeProvider>
            <AdminErrorBoundary>
              <AdminDashboard initialView="secrets-manager" />
            </AdminErrorBoundary>
          </AdminModeProvider>
        );
      default:
        return (
          <Suspense fallback={<DashboardLoading />}>
            <PlanSurface {...commonProps} />
          </Suspense>
        );
    }
  };

  if (!currentProject) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--wt-neutral-50)' }}>
        <div className="text-center wt-breathing-room">
          <h2 className="wt-heading-2 mb-4">No Projects Available</h2>
          <p className="wt-body-large">Create a project to get started with Wombat Track.</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen flex" 
      data-testid="app-layout"
      style={{ background: 'var(--wt-neutral-50)' }}
    >
      {/* Enhanced Sidebar v3.1 with Three-Tier Architecture */}
      <EnhancedSidebar
        projects={projects}
        currentProject={currentProject}
        selectedSurface={selectedSurface}
        collapsed={sidebarCollapsed}
        currentSubApp={currentSubApp}
        onProjectChange={handleProjectChange}
        onSurfaceChange={(surface) => {
          setSelectedSurface(surface);
          setShowSubAppDashboard(false);
        }}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        onSubAppChange={setCurrentSubApp}
      />

      {/* Main Content Area */}
      <div 
        className={`flex-1 flex flex-col`}
        style={{ 
          marginLeft: sidebarCollapsed ? 'var(--wt-sidebar-collapsed)' : 'var(--wt-sidebar-width)',
          transition: 'margin-left var(--wt-transition-normal)'
        }}
      >
        {/* Sticky Breadcrumb Header */}
        <BreadcrumbHeader
          currentProject={currentProject}
          currentPhase={currentPhase}
          currentStep={currentStep}
          selectedSurface={selectedSurface}
          onSurfaceChange={setSelectedSurface}
        />

        {/* Data Source Indicator */}
        {(loadingProjects || dataSource === 'oapp') && (
          <div className="bg-blue-50 border-b border-blue-200 px-4 py-2">
            <div className="flex items-center justify-between max-w-7xl mx-auto">
              <div className="flex items-center space-x-2">
                {loadingProjects ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span className="text-sm text-blue-700">Loading projects from oApp database...</span>
                  </>
                ) : (
                  <>
                    <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-blue-700">
                      Connected to oApp production database ({projects.length} projects)
                    </span>
                  </>
                )}
              </div>
              <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                Data Source: {dataSource === 'oapp' ? 'oApp Production' : 'Mock Data'}
              </span>
            </div>
          </div>
        )}

        {/* Work Surface Content or Sub-App Dashboard */}
        <main 
          className="flex-1 overflow-auto" 
          data-testid={showSubAppDashboard ? 'subapp-dashboard' : `${selectedSurface}-surface`}
        >
          <div className="wt-surface">
            {showSubAppDashboard ? (
            <SubAppDashboard 
              subApp={mockPrograms.find(p => p.id === currentSubApp) || mockPrograms[0]}
              onWorkSurfaceSelect={handleWorkSurfaceSelect}
            />
          ) : (
            <div 
              className={selectedSurface?.startsWith('admin') ? "w-full" : "wt-content-max-width"} 
              style={{ paddingTop: 'var(--wt-space-6)' }}
            >
              {renderCurrentSurface()}
            </div>
          )}
          </div>
        </main>
      </div>

      {/* Quick Switcher Modal */}
      <QuickSwitcherModal
        isOpen={quickSwitcherOpen}
        onClose={() => setQuickSwitcherOpen(false)}
        projects={projects}
        currentProject={currentProject}
        selectedSurface={selectedSurface}
        subApps={mockSubApps}
        onProjectChange={(project) => {
          handleProjectChange(project);
          setQuickSwitcherOpen(false);
        }}
        onSurfaceChange={(surface) => {
          setSelectedSurface(surface);
          setShowSubAppDashboard(false);
          setQuickSwitcherOpen(false);
        }}
        onSubAppChange={(subAppId) => {
          setCurrentSubApp(subAppId);
          setShowSubAppDashboard(true);
          setQuickSwitcherOpen(false);
        }}
      />
    </div>
  );
};

// Main exported component with ProjectProvider wrapper
export const AppLayout: React.FC<AppLayoutProps> = (props) => {
  return (
    <ProjectProvider 
      initialProjects={props.initialProjects}
      initialActiveProjectId={props.initialProjects?.[0]?.id}
    >
      <AppLayoutInner {...props} />
    </ProjectProvider>
  );
};