import React, { useState, useEffect } from 'react';
import { EnhancedProjectSidebar } from './EnhancedProjectSidebar';
import { BreadcrumbHeader } from './BreadcrumbHeader';
import { PlanSurface } from '../surfaces/PlanSurface';
import { ExecuteSurface } from '../surfaces/ExecuteSurface';
import { DocumentSurface } from '../surfaces/DocumentSurface';
import { GovernSurface } from '../surfaces/GovernSurface';
import { IntegrateSurface } from '../surfaces/IntegrateSurface';
import { SPQRRuntimeDashboard } from '../SPQR/SPQRRuntimeDashboard';
import { SubAppDashboard } from '../SubAppDashboard';
import { AdminDashboard } from '../admin/AdminDashboard';
import { AdminModeProvider } from '../../contexts/AdminModeContext';
import AdminErrorBoundary from '../admin/AdminErrorBoundary';
import type { Project, Phase, PhaseStep as Step } from '../../types/phase';
import { mockPrograms } from '../../data/mockPrograms';
import { fetchProjectsFromOApp } from '../../services/oappAPI';

export type WorkSurface = 'plan' | 'execute' | 'document' | 'govern' | 'integrate' | 'spqr-runtime' | 'admin' | 'admin-data-explorer' | 'admin-import-export' | 'admin-orphan-inspector' | 'admin-runtime-panel' | 'admin-secrets-manager';

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

export const AppLayout: React.FC<AppLayoutProps> = ({ initialProjects = mockProjects }) => {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [currentProject, setCurrentProject] = useState<Project | null>(initialProjects[0] || null);
  const [currentSubApp, setCurrentSubApp] = useState<string>(mockPrograms[0]?.id || 'prog-orbis-001');
  const [showSubAppDashboard, setShowSubAppDashboard] = useState<boolean>(true);
  const [selectedSurface, setSelectedSurface] = useState<WorkSurface>('plan');
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [dataSource, setDataSource] = useState<'mock' | 'oapp'>('mock');
  const [currentPhase, setCurrentPhase] = useState<Phase | null>(
    currentProject?.phases.find(p => p.status === 'in_progress') || currentProject?.phases[0] || null
  );
  const [currentStep, setCurrentStep] = useState<Step | null>(
    currentPhase?.steps.find(s => s.status === 'in_progress') || currentPhase?.steps[0] || null
  );

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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
        
        // Set first project as current if no current project
        if (!currentProject && oappProjects.length > 0) {
          setCurrentProject(oappProjects[0]);
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

    loadOAppProjects();
  }, [currentProject, initialProjects.length]);

  const handleProjectChange = (project: Project) => {
    setCurrentProject(project);
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
        return <PlanSurface {...commonProps} />;
      case 'execute':
        return <ExecuteSurface {...commonProps} />;
      case 'document':
        return <DocumentSurface {...commonProps} />;
      case 'govern':
        return <GovernSurface {...commonProps} />;
      case 'integrate':
        return <IntegrateSurface {...commonProps} />;
      case 'spqr-runtime':
        return <SPQRRuntimeDashboard />;
      case 'admin':
        return (
          <AdminModeProvider>
            <AdminErrorBoundary>
              <AdminDashboard initialView="overview" />
            </AdminErrorBoundary>
          </AdminModeProvider>
        );
      case 'admin-data-explorer':
        return (
          <AdminModeProvider>
            <AdminErrorBoundary>
              <AdminDashboard initialView="data-explorer" />
            </AdminErrorBoundary>
          </AdminModeProvider>
        );
      case 'admin-import-export':
        return (
          <AdminModeProvider>
            <AdminErrorBoundary>
              <AdminDashboard initialView="import-export" />
            </AdminErrorBoundary>
          </AdminModeProvider>
        );
      case 'admin-orphan-inspector':
        return (
          <AdminModeProvider>
            <AdminErrorBoundary>
              <AdminDashboard initialView="orphan-inspector" />
            </AdminErrorBoundary>
          </AdminModeProvider>
        );
      case 'admin-runtime-panel':
        return (
          <AdminModeProvider>
            <AdminErrorBoundary>
              <AdminDashboard initialView="runtime-panel" />
            </AdminErrorBoundary>
          </AdminModeProvider>
        );
      case 'admin-secrets-manager':
        return (
          <AdminModeProvider>
            <AdminErrorBoundary>
              <AdminDashboard initialView="secrets-manager" />
            </AdminErrorBoundary>
          </AdminModeProvider>
        );
      default:
        return <PlanSurface {...commonProps} />;
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
      {/* Enhanced Sidebar with Sub-App Support */}
      <EnhancedProjectSidebar
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
        onSubAppChange={(subAppId) => {
          setCurrentSubApp(subAppId);
          setShowSubAppDashboard(true);
        }}
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
            <div className="wt-content-max-width" style={{ paddingTop: 'var(--wt-space-6)' }}>
              {renderCurrentSurface()}
            </div>
          )}
          </div>
        </main>
      </div>
    </div>
  );
};