// wombat-track/src/data/mockProjects.ts

import { Project, PhaseStep } from '../types/models';

// Mock phase steps for testing
const mockPhaseSteps: PhaseStep[] = [
  {
    id: 'step-001',
    stepNumber: 1,
    stepInstruction: 'Initial setup and requirements gathering',
    isSideQuest: false,
    stepProgress: {
      id: 'progress-001',
      status: 'Complete',
      notes: 'Requirements gathered successfully'
    }
  },
  {
    id: 'step-002',
    stepNumber: 2,
    stepInstruction: 'Design and architecture planning',
    isSideQuest: false,
    stepProgress: {
      id: 'progress-002',
      status: 'In Progress',
      notes: 'Architecture documents in review'
    }
  }
];

export const mockProjects: Project[] = [
  {
    id: 'proj-001',
    title: 'Orbis Core Infrastructure',
    description: 'Core platform infrastructure for the Orbis ecosystem',
    goals: 'Establish foundational architecture for all Orbis applications',
    scopeNotes: 'Focus on scalability and extensibility',
    keyTasks: ['Setup CI/CD', 'Define data models', 'Implement auth'],
    phaseSteps: mockPhaseSteps,
    linkedProgramId: 'prog-orbis-001'
  },
  {
    id: 'proj-002',
    title: 'Orbis Governance Dashboard',
    description: 'Administrative dashboard for system governance',
    goals: 'Provide comprehensive oversight and control capabilities',
    scopeNotes: 'Admin-focused UI with advanced filtering',
    keyTasks: ['Design UI components', 'Implement filtering', 'Add reporting'],
    phaseSteps: mockPhaseSteps,
    linkedProgramId: 'prog-orbis-001'
  },
  {
    id: 'proj-003',
    title: 'Complize Case Management',
    description: 'Immigration case tracking and management system',
    goals: 'Streamline case processing and client communication',
    scopeNotes: 'Client-facing with secure document handling',
    keyTasks: ['Client portal', 'Document management', 'Status tracking'],
    phaseSteps: mockPhaseSteps,
    linkedProgramId: 'prog-complize-001'
  },
  {
    id: 'proj-004',
    title: 'MetaPlatform Integration Layer',
    description: 'Cross-platform integration and orchestration',
    goals: 'Enable seamless workflow across multiple systems',
    scopeNotes: 'API-first design with extensible plugin architecture',
    keyTasks: ['API design', 'Plugin framework', 'Integration testing'],
    phaseSteps: mockPhaseSteps,
    linkedProgramId: 'prog-metaplatform-001'
  }
];

export default mockProjects;