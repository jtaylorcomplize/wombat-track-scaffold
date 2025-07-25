// wombat-track/src/pages/PhasePlan.tsx
// WT-3.7: Integrated with shared ProjectContext for synchronized planning and execution
import React, { useState } from 'react';
import { ProjectDashboard } from '../components/ProjectDashboard';
import { PhasePlanView } from '../components/PhasePlanView';
import { GovernanceLogViewer } from '../components/GovernanceLogViewer';
import ProjectSidebarSimple from '../components/ProjectSidebarSimple';
import { ProjectProvider, useProjectContext } from '../contexts/ProjectContext';
import type { Project, PhaseStep } from '../types/phase';

// Mock project data for dashboard demonstration
const mockProjects: Project[] = [
  {
    id: 'complize-ui-retrofit',
    name: 'Complize UI Retrofit',
    description: 'Sidebar recovery and dashboard restoration for WT-3.3.1',
    createdAt: '2025-07-24T10:00:00Z',
    createdBy: 'jtaylor',
    projectOwner: 'jtaylor',
    projectType: 'Platform',
    status: 'Active',
    colorTag: 'purple',
    phases: [
      {
        id: 'wt-3.3.1-dashboard-restore',
        projectId: 'complize-ui-retrofit',
        name: 'WT-3.3.1 – Project Dashboard Layout Restoration',
        description: 'Reconstruct dashboard UI to match WT-2.9 reference',
        order: 1,
        ragStatus: 'green',
        phaseType: 'Development',
        steps: [
          {
            id: 'step-1',
            phaseId: 'wt-3.3.1-dashboard-restore',
            name: 'Restore ProjectDashboard.tsx with proper layout',
            status: 'complete',
            description: 'Reconstruct main dashboard component with sidebar integration',
            stepInstruction: 'Restore ProjectDashboard.tsx with proper layout',
            startedAt: '2025-07-24T10:00:00Z',
            completedAt: '2025-07-24T10:30:00Z',
            isSideQuest: false
          },
          {
            id: 'step-2', 
            phaseId: 'wt-3.3.1-dashboard-restore',
            name: 'Integrate ProjectSwitcher in header',
            status: 'in_progress',
            description: 'Add project switcher component to dashboard header',
            stepInstruction: 'Integrate ProjectSwitcher in header',
            startedAt: '2025-07-24T10:30:00Z',
            isSideQuest: false
          },
          {
            id: 'step-3',
            phaseId: 'wt-3.3.1-dashboard-restore',
            name: 'Add RAG status badges and phase hierarchy',
            status: 'not_started',
            description: 'Implement visual status indicators and nested phase structure',
            stepInstruction: 'Add RAG status badges and phase hierarchy',
            isSideQuest: false
          }
        ]
      },
      {
        id: 'wt-3.3.2-testing',
        projectId: 'complize-ui-retrofit',
        name: 'WT-3.3.2 – Puppeteer Visual Testing',
        description: 'Add automated visual regression tests',
        order: 2,
        ragStatus: 'amber',
        phaseType: 'Testing',
        steps: [
          {
            id: 'step-4',
            phaseId: 'wt-3.3.2-testing',
            name: 'Create project_dashboard_ui.spec.js',
            status: 'not_started',
            description: 'Puppeteer test for dashboard rendering and layout',
            stepInstruction: 'Create project_dashboard_ui.spec.js',
            templateId: 'puppeteer-ui-test',
            isSideQuest: false
          },
          {
            id: 'step-5',
            phaseId: 'wt-3.3.2-testing',
            name: 'Capture baseline screenshots',
            status: 'not_started',
            description: 'Generate reference screenshots for regression testing',
            stepInstruction: 'Capture baseline screenshots',
            isSideQuest: true
          }
        ]
      }
    ]
  },
  {
    id: 'metaplatform-migration',
    name: 'MetaPlatform – Migration Console',
    description: 'Legacy system migration and data transformation',
    createdAt: '2025-07-20T14:00:00Z',
    createdBy: 'system',
    projectOwner: 'migration-team',
    projectType: 'Migration',
    status: 'Paused',
    colorTag: 'blue',
    wtTag: 'WT-META-CONSOLE',
    phases: [
      {
        id: 'meta-phase-1',
        projectId: 'metaplatform-migration',
        name: 'Data Analysis & Schema Mapping',
        description: 'Analyze existing data structures and create migration schemas',
        order: 1,
        ragStatus: 'red',
        phaseType: 'Infrastructure',
        steps: [
          {
            id: 'meta-step-1',
            phaseId: 'meta-phase-1',
            name: 'Legacy system audit',
            status: 'complete',
            description: 'Complete inventory of existing data structures',
            stepInstruction: 'Legacy system audit',
            completedAt: '2025-07-21T16:00:00Z',
            isSideQuest: false
          },
          {
            id: 'meta-step-2',
            phaseId: 'meta-phase-1',
            name: 'Schema transformation design',
            status: 'error',
            description: 'Design new schema structure - blocked on API changes',
            stepInstruction: 'Schema transformation design',
            startedAt: '2025-07-22T09:00:00Z',
            isSideQuest: false
          }
        ]
      }
    ]
  }
];

export const PhasePlan: React.FC = () => {
  const [showSidebar, setShowSidebar] = useState(true); // Show sidebar by default
  const [viewMode, setViewMode] = useState<'dashboard' | 'planning'>('dashboard');
  
  const handleViewLogs = (executionId: string) => {
    console.log(`[WT] Viewing logs for execution: ${executionId}`);
    // Enhanced log viewing with user feedback
    alert(`📊 Viewing execution logs for: ${executionId}\n\nIn a production environment, this would:\n- Open detailed execution logs\n- Show real-time status updates\n- Display performance metrics\n- Provide error diagnostics\n\nCheck console for current log details.`);
  };

  return (
    <ProjectProvider initialProjects={mockProjects} initialActiveProjectId={mockProjects[0]?.id}>
      <PhasePlanContent 
        showSidebar={showSidebar}
        setShowSidebar={setShowSidebar}
        viewMode={viewMode}
        setViewMode={setViewMode}
        handleViewLogs={handleViewLogs}
      />
    </ProjectProvider>
  );
};

// Separate component to use context
const PhasePlanContent: React.FC<{
  showSidebar: boolean;
  setShowSidebar: (show: boolean) => void;
  viewMode: 'dashboard' | 'planning';
  setViewMode: (mode: 'dashboard' | 'planning') => void;
  handleViewLogs: (executionId: string) => void;
}> = ({ showSidebar, setShowSidebar, viewMode, setViewMode, handleViewLogs }) => {
  const [showGovernanceLog, setShowGovernanceLog] = useState(false);
  const { projects, activeProjectId, setActiveProjectId } = useProjectContext();
  
  // Convert projects to sidebar-compatible format
  const sidebarProjects = projects.map(project => ({
    id: project.id,
    name: project.name,
    description: project.description,
    status: project.status,
    phases: project.phases
  }));
  
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar Panel */}
      {showSidebar && (
        <div className="w-80 flex-shrink-0">
          <ProjectSidebarSimple
            projects={sidebarProjects}
            selectedProjectId={activeProjectId || ''}
            onProjectSelect={setActiveProjectId}
          />
        </div>
      )}
      
      {/* Main Dashboard Area */}
      <div className="flex-1 flex flex-col">
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">
                {viewMode === 'dashboard' ? '📊 Project Dashboard' : '📝 Phase Planning'}
              </h1>
              <p className="text-gray-600">
                {viewMode === 'dashboard' 
                  ? 'Strategic project planning with tactical execution tracking'
                  : 'Edit and organize project phases and steps'
                }
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="bg-gray-100 p-1 rounded-md flex">
                <button
                  onClick={() => setViewMode('dashboard')}
                  className={`px-3 py-1 text-sm rounded transition-colors ${
                    viewMode === 'dashboard'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => setViewMode('planning')}
                  className={`px-3 py-1 text-sm rounded transition-colors ${
                    viewMode === 'planning'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Planning
                </button>
              </div>
              <button
                onClick={() => setShowGovernanceLog(!showGovernanceLog)}
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-md text-sm text-gray-700 transition-colors duration-200"
              >
                📋 Governance Log
              </button>
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-md text-sm text-gray-700 transition-colors duration-200"
              >
                {showSidebar ? '← Hide Sidebar' : 'Show Sidebar →'}
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <div className="h-full p-6">
            <div className={showGovernanceLog ? "grid grid-cols-3 gap-6" : ""}>
              <div className={showGovernanceLog ? "col-span-2" : ""}>
                {viewMode === 'dashboard' ? (
                  <ProjectDashboard
                    onViewLogs={handleViewLogs}
                    readOnly={false}
                  />
                ) : activeProjectId ? (
                  <PhasePlanView projectId={activeProjectId} />
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    Select a project to start planning
                  </div>
                )}
              </div>
              {showGovernanceLog && (
                <div className="col-span-1">
                  <GovernanceLogViewer />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
