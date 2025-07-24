// wombat-track/src/pages/PhasePlan.tsx
// WT-2.9: Updated to use PhasePlanDashboard for consistent project management experience
import React, { useState } from 'react';
import { ProjectDashboard } from '../components/project/PhasePlanDashboard';
import ProjectSidebarSimple from '../components/project/ProjectSidebarSimple';
import type { Project, Phase, PhaseStep } from '../types/phase';
import { harmonisedProjects } from '../data/harmonisedProjects';
import { logPhaseMetadataChange } from '../api/governanceLogAPI';
import './PhasePlan.css';

export const PhasePlan: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>(harmonisedProjects);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(harmonisedProjects[0]?.id || '');
  
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

  const handlePhaseUpdate = async (projectId: string, phaseId: string, updates: Partial<Phase>) => {
    console.log(`[WT] Updating phase ${phaseId} in project ${projectId}:`, updates);
    
    // Track changes for governance logging
    const changes: Record<string, { old: unknown; new: unknown }> = {};
    
    const updatedProjects = projects.map(project => {
      if (project.id !== projectId) return project;
      
      return {
        ...project,
        phases: project.phases.map(phase => {
          if (phase.id !== phaseId) return phase;
          
          // Track changes for governance
          Object.keys(updates).forEach(key => {
            if (updates[key as keyof Phase] !== phase[key as keyof Phase]) {
              changes[key] = {
                old: phase[key as keyof Phase],
                new: updates[key as keyof Phase]
              };
            }
          });
          
          return { ...phase, ...updates };
        }),
        updatedAt: new Date().toISOString()
      };
    });
    
    setProjects(updatedProjects);
    
    // Log governance change if there were actual changes
    if (Object.keys(changes).length > 0) {
      await logPhaseMetadataChange(projectId, phaseId, 'current-user', changes);
    }
  };

  const handleViewLogs = (executionId: string) => {
    console.log(`[WT] Viewing logs for execution: ${executionId}`);
    // Enhanced log viewing with user feedback
    alert(`📊 Viewing execution logs for: ${executionId}\n\nIn a production environment, this would:\n- Open detailed execution logs\n- Show real-time status updates\n- Display performance metrics\n- Provide error diagnostics\n\nCheck console for current log details.`);
  };


  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#f9fafb' }}>
      {/* Project Sidebar */}
      <div style={{ width: '300px', flexShrink: 0 }}>
        <ProjectSidebarSimple
          projects={projects}
          selectedProjectId={selectedProjectId}
          onProjectSelect={setSelectedProjectId}
        />
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ padding: '24px' }}>
          {/* Header */}
          <div style={{ marginBottom: '32px' }}>
            <h1 style={{ fontSize: '32px', fontWeight: '700', color: '#1f2937', marginBottom: '8px' }}>
              📊 Project Dashboard
            </h1>
            <p style={{ color: '#6b7280', fontSize: '16px' }}>
              Strategic project planning with tactical execution tracking
            </p>
          </div>

          {/* Phase Plan Dashboard */}
          <div>
            {selectedProject ? (
              <ProjectDashboard
                project={selectedProject}
                onStepUpdate={handleStepUpdate}
                onPhaseUpdate={handlePhaseUpdate}
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
