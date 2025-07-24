// wombat-track/src/pages/PhasePlan.tsx
import React, { useState } from 'react';
import { StepCard } from '../components/StepCard';
import ProjectSidebarSimple from '../components/ProjectSidebarSimple';
import type { PhaseStep, Phase } from '../types/models';
import { getPhaseStatus, getPhaseProgress } from '../utils/phaseStatus';
import './PhasePlan.css';

// Dummy data for testing the Side Quest toggle feature
const initialDummySteps: PhaseStep[] = [
  {
    id: 'step-1',
    stepNumber: 1,
    stepInstruction: 'Complete initial compliance assessment and document current state',
    isSideQuest: false,
    stepProgress: {
      id: 'progress-1',
      status: 'Not Started',
      assignedTo: 'compliance-team'
    }
  },
  {
    id: 'step-2',
    stepNumber: 2, 
    stepInstruction: 'Set up automated monitoring dashboard for real-time tracking',
    isSideQuest: true,
    stepProgress: {
      id: 'progress-2',
      status: 'In Progress',
      assignedTo: 'dev-team'
    }
  },
  {
    id: 'step-3',
    stepNumber: 3,
    stepInstruction: 'Review and update data protection policies according to latest regulations',
    isSideQuest: false,
    stepProgress: {
      id: 'progress-3',
      status: 'Not Started',
      assignedTo: 'legal-team'
    }
  },
  {
    id: 'step-4',
    stepNumber: 4,
    stepInstruction: 'Implement advanced analytics for user behavior patterns',
    isSideQuest: true,
    stepProgress: {
      id: 'progress-4',
      status: 'Not Started',
      assignedTo: 'analytics-team'
    }
  }
];

// Mock project data for sidebar demonstration
const mockProjects = [
  {
    id: 'complize-ui-retrofit',
    name: 'Complize UI Retrofit',
    description: 'Sidebar recovery and status logic restoration',
    status: 'In Progress',
    phases: [
      {
        id: 'wt-5.1-sidebar-ui',
        name: 'WT 5.1 – Sidebar UX + Status Logic',
        description: 'Restore sidebar functionality',
        steps: initialDummySteps.slice(0, 2)
      } as Phase,
      {
        id: 'wt-5.2-testing',
        name: 'WT 5.2 – Testing & QA',
        description: 'Visual QA and Puppeteer validation',
        steps: initialDummySteps.slice(2)
      } as Phase
    ]
  }
];

export const PhasePlan: React.FC = () => {
  const [steps, setSteps] = useState<PhaseStep[]>(initialDummySteps);
  const [filterType, setFilterType] = useState<'all' | 'core' | 'side-quest'>('all');
  const [showSidebar, setShowSidebar] = useState(false); // SIDEBAR RECOVERY: Toggle for sidebar
  const [selectedProjectId, setSelectedProjectId] = useState<string>(mockProjects[0]?.id || '');

  const handleStepUpdate = (updatedStep: PhaseStep) => {
    setSteps(currentSteps =>
      currentSteps.map(step =>
        step.id === updatedStep.id ? updatedStep : step
      )
    );
  };

  const filteredSteps = steps.filter(step => {
    switch (filterType) {
      case 'core':
        return !step.isSideQuest;
      case 'side-quest':
        return step.isSideQuest;
      default:
        return true;
    }
  });

  const coreStepsCount = steps.filter(s => !s.isSideQuest).length;
  const sideQuestCount = steps.filter(s => s.isSideQuest).length;
  const completedSteps = steps.filter(s => s.stepProgress?.status === 'Complete').length;
  const inProgressSteps = steps.filter(s => s.stepProgress?.status === 'In Progress').length;

  return (
    <div className="phase-plan" style={{ display: 'flex' }}>
      {/* SIDEBAR RECOVERY: Optional sidebar */}
      {showSidebar && (
        <div style={{ width: '300px', flexShrink: 0 }}>
          <ProjectSidebarSimple
            projects={mockProjects}
            selectedProjectId={selectedProjectId}
            onProjectSelect={setSelectedProjectId}
          />
        </div>
      )}
      
      <div style={{ flex: 1 }}>
        <div className="phase-plan-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1>Phase Plan</h1>
              <p>Manage your compliance roadmap steps and side quests</p>
            </div>
            {/* SIDEBAR RECOVERY: Toggle button */}
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="filter-btn"
              style={{ marginLeft: '16px' }}
            >
              {showSidebar ? '← Hide Sidebar' : 'Show Sidebar →'}
            </button>
          </div>
        </div>

      <div className="phase-plan-content">
        <div className="main-content">
          <div className="filter-controls">
            <h2>Phase Steps</h2>
            <div className="filter-buttons">
              <button 
                className={`filter-btn ${filterType === 'all' ? 'active' : ''}`}
                onClick={() => setFilterType('all')}
              >
                All ({steps.length})
              </button>
              <button 
                className={`filter-btn ${filterType === 'core' ? 'active' : ''}`}
                onClick={() => setFilterType('core')}
              >
                Core Steps ({coreStepsCount})
              </button>
              <button 
                className={`filter-btn side-quest ${filterType === 'side-quest' ? 'active' : ''}`}
                onClick={() => setFilterType('side-quest')}
              >
                Side Quests 🟥 ({sideQuestCount})
              </button>
            </div>
          </div>

          <div className="steps-container">
            {filteredSteps.length === 0 ? (
              <div className="empty-state">
                <p>No steps found for the selected filter.</p>
              </div>
            ) : (
              filteredSteps.map(step => (
                <StepCard
                  key={step.id}
                  step={step}
                  onUpdate={handleStepUpdate}
                />
              ))
            )}
          </div>
        </div>

        <div className="sidebar">
          <div className="phase-plan-summary">
            <h3>Summary</h3>
            
            <div className="summary-stats">
              <div className="stat">
                <span className="stat-value">{coreStepsCount}</span>
                <span className="stat-label">Core Steps</span>
              </div>
              <div className="stat side-quest-stat">
                <span className="stat-value">{sideQuestCount}</span>
                <span className="stat-label">Side Quests 🟥</span>
              </div>
              <div className="stat">
                <span className="stat-value">{completedSteps}</span>
                <span className="stat-label">Completed</span>
              </div>
              <div className="stat">
                <span className="stat-value">{inProgressSteps}</span>
                <span className="stat-label">In Progress</span>
              </div>
            </div>

            <div className="progress-overview">
              <h4>Progress Overview</h4>
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{ 
                    width: `${steps.length > 0 ? (completedSteps / steps.length) * 100 : 0}%` 
                  }}
                />
              </div>
              <span className="progress-text">
                {steps.length > 0 ? Math.round((completedSteps / steps.length) * 100) : 0}% Complete
              </span>
            </div>
          </div>

          <div className="legend">
            <h4>Legend</h4>
            <div className="legend-item">
              <span className="legend-indicator">🟥</span>
              <span>Side Quest - Optional enhancement</span>
            </div>
            <div className="legend-item">
              <span className="assigned-to">TEAM</span>
              <span>Assigned Team</span>
            </div>
            <div className="legend-item">
              <span className="step-number">#N</span>
              <span>Step Number</span>
            </div>
          </div>
        </div>
      </div>
      </div> {/* End flex container */}
    </div>
  );
};
