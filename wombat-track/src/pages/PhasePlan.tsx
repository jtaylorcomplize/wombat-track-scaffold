// wombat-track/src/pages/PhasePlan.tsx
// WT-2.9: Updated to use PhasePlanDashboard for consistent project management experience
import React, { useState } from 'react';
import { ProjectDashboard } from '../components/project/PhasePlanDashboard';
import ProjectSidebarSimple from '../components/ProjectSidebarSimple';
import type { Project, Phase, PhaseStep } from '../types/phase';
import { getPhaseStatus } from '../utils/phaseStatus';
import './PhasePlan.css';

// Mock project data for dashboard demonstration
const mockProjects: Project[] = [
  {
    id: 'complize-ui-retrofit',
    name: 'Complize UI Retrofit',
    description: 'Sidebar recovery and dashboard restoration',
    createdAt: '2025-07-24T10:00:00Z',
    createdBy: 'jtaylor',
    projectOwner: 'jtaylor',
    projectType: 'Platform',
    status: 'Active',
    phases: [
      {
        id: 'wt-5.1-sidebar-ui',
        projectId: 'complize-ui-retrofit',
        name: 'WT 5.1 – Sidebar UX + Status Logic',
        description: 'Restore sidebar functionality',
        order: 1,
        steps: [
          {
            id: 'step-1',
            phaseId: 'wt-5.1-sidebar-ui',
            name: 'Restore getPhaseStatus() logic',
            status: 'complete',
            stepInstruction: 'Restore getPhaseStatus() logic',
            isSideQuest: false
          },
          {
            id: 'step-2', 
            phaseId: 'wt-5.1-sidebar-ui',
            name: 'Re-integrate ProjectSidebarSimple.tsx',
            status: 'complete',
            stepInstruction: 'Re-integrate ProjectSidebarSimple.tsx',
            isSideQuest: false
          }
        ]
      }
    ]
  }
];

export const PhasePlan: React.FC = () => {
  const [projects] = useState(mockProjects);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(mockProjects[0]?.id || '');
  const [showSidebar, setShowSidebar] = useState(true); // Show sidebar by default
  
  // Convert projects to sidebar-compatible format
  const sidebarProjects = projects.map(project => ({
    id: project.id,
    name: project.name,
    description: project.description,
    status: project.status,
    phases: project.phases
  }));
  
  const selectedProject = projects.find(p => p.id === selectedProjectId);

  const handleStepUpdate = (projectId: string, phaseId: string, stepId: string, updates: Partial<PhaseStep>) => {
    console.log(`[WT] Updating step ${stepId} in phase ${phaseId} of project ${projectId}:`, updates);
    // For now, just log the update since we're using static mock data
  };

  const handleViewLogs = (executionId: string) => {
    console.log(`[WT] Viewing logs for execution: ${executionId}`);
    // Enhanced log viewing with user feedback
    alert(`📊 Viewing execution logs for: ${executionId}\n\nIn a production environment, this would:\n- Open detailed execution logs\n- Show real-time status updates\n- Display performance metrics\n- Provide error diagnostics\n\nCheck console for current log details.`);
  };

  return (
    <div className="phase-plan" style={{ display: 'flex', height: '100vh' }}>
      {/* Sidebar Panel */}
      {showSidebar && (
        <div style={{ width: '300px', flexShrink: 0 }}>
          <ProjectSidebarSimple
            projects={sidebarProjects}
            selectedProjectId={selectedProjectId}
            onProjectSelect={setSelectedProjectId}
          />
        </div>
      )}
      
      {/* Main Dashboard Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div className="phase-plan-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1>📊 Project Dashboard</h1>
              <p>Strategic project planning with tactical execution tracking</p>
            </div>
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              style={{
                padding: '8px 12px',
                backgroundColor: '#f3f4f6',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '12px',
                cursor: 'pointer',
                color: '#374151'
              }}
            >
              {showSidebar ? '← Hide Sidebar' : 'Show Sidebar →'}
            </button>
          </div>
        </div>

        <div className="phase-plan-content-vertical" style={{ flex: 1, overflow: 'auto' }}>
          {/* Phase Plan Dashboard */}
          <div className="dashboard-container">
            {selectedProject ? (
              <ProjectDashboard
                project={selectedProject}
                onStepUpdate={handleStepUpdate}
                onViewLogs={handleViewLogs}
                readOnly={false}
              />
            ) : (
              <div style={{
                textAlign: 'center',
                padding: '60px 20px',
                color: '#6b7280',
                backgroundColor: '#f9fafb',
                borderRadius: '8px',
                border: '1px solid #e5e7eb'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📑</div>
                <h2 style={{ fontSize: '24px', marginBottom: '8px', color: '#1f2937' }}>No Projects Available</h2>
                <p style={{ fontSize: '16px' }}>
                  Create a project to start planning and tracking your phases.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
