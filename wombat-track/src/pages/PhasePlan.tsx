// wombat-track/src/pages/PhasePlan.tsx
// WT-2.9: Updated to use PhasePlanDashboard for consistent project management experience
import React, { useState } from 'react';
import { ProjectDashboard } from '../components/project/PhasePlanDashboard';
import { ProjectSwitcher } from '../components/project/ProjectSwitcher';
import type { Project, PhaseStep } from '../types/phase';
import { mockProjects } from '../data/mockProjects';
import './PhasePlan.css';

export const PhasePlan: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>(mockProjects);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(mockProjects[0]?.id || '');
  
  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const activeProjects = projects.filter(p => !p.archived);

  const handleStepUpdate = (projectId: string, phaseId: string, stepId: string, updates: Partial<PhaseStep>) => {
    console.log(`[WT] Updating step ${stepId} in phase ${phaseId} of project ${projectId}:`, updates);
    
    const updatedProjects = projects.map(project => {
      if (project.id !== projectId) return project;
      
      return {
        ...project,
        phases: project.phases.map(phase => {
          if (phase.id !== phaseId) return phase;
          
          return {
            ...phase,
            steps: phase.steps.map(step => {
              if (step.id !== stepId) return step;
              return { ...step, ...updates };
            })
          };
        }),
        updatedAt: new Date().toISOString()
      };
    });
    
    setProjects(updatedProjects);
  };

  const handleViewLogs = (executionId: string) => {
    console.log(`[WT] Viewing logs for execution: ${executionId}`);
    // Enhanced log viewing with user feedback
    alert(`📊 Viewing execution logs for: ${executionId}\n\nIn a production environment, this would:\n- Open detailed execution logs\n- Show real-time status updates\n- Display performance metrics\n- Provide error diagnostics\n\nCheck console for current log details.`);
  };

  const handleProjectsUpdate = (updatedProjects: Project[]) => {
    setProjects(updatedProjects);
  };

  return (
    <div className="phase-plan">
      <div className="phase-plan-header">
        <h1>📊 Project Dashboard</h1>
        <p>Strategic project planning with tactical execution tracking</p>
      </div>

      <div className="phase-plan-content-vertical">
        {/* Project Selector */}
        <div className="project-selector-container">
          <ProjectSwitcher
            projects={activeProjects}
            selectedProjectId={selectedProjectId}
            onProjectSelect={setSelectedProjectId}
            onProjectsUpdate={handleProjectsUpdate}
          />
        </div>

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
  );
};
