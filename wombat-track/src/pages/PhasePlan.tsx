// wombat-track/src/pages/PhasePlan.tsx
// WT-2.9: Updated to use PhasePlanDashboard for consistent project management experience
import React, { useState } from 'react';
import { PhasePlanDashboard } from '../components/project/PhasePlanDashboard';
import { ProjectSwitcher } from '../components/project/ProjectSwitcher';
import type { Project } from '../types/phase';
import { mockProjects } from '../data/mockProjects';
import './PhasePlan.css';

export const PhasePlan: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>(mockProjects);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(mockProjects[0]?.id || '');
  
  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const activeProjects = projects.filter(p => !p.archived);

  const handleStartStep = (stepId: string) => {
    console.log(`[WT] Starting step execution: ${stepId}`);
    // TODO: Implement step execution start logic
  };

  const handleViewLogs = (executionId: string) => {
    console.log(`[WT] Viewing logs for execution: ${executionId}`);
    // TODO: Implement log viewing logic
  };

  const handleProjectsUpdate = (updatedProjects: Project[]) => {
    setProjects(updatedProjects);
  };

  return (
    <div className="phase-plan">
      <div className="phase-plan-header">
        <h1>📑 Phase Plan Dashboard</h1>
        <p>Strategic project planning with tactical execution tracking</p>
      </div>

      <div className="phase-plan-content">
        {/* Project Selector */}
        <div style={{ marginBottom: '24px' }}>
          <ProjectSwitcher
            projects={activeProjects}
            selectedProjectId={selectedProjectId}
            onProjectSelect={setSelectedProjectId}
            onProjectsUpdate={handleProjectsUpdate}
          />
        </div>

        {/* Phase Plan Dashboard */}
        {selectedProject ? (
          <PhasePlanDashboard
            project={selectedProject}
            onStartStep={handleStartStep}
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
  );
};
