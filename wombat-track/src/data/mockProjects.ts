import type { Project } from '../types/models';

// Extended project interface with program linking
interface MockProject extends Partial<Project> {
  id: string;
  title: string;
  linkedProgramId: string;
  phaseSteps?: Array<{ id: string; stepNumber: number; stepInstruction: string }>;
}

export const mockProjects: MockProject[] = [
  {
    id: 'proj-orbis-001',
    title: 'Data Analytics Pipeline',
    description: 'Core data processing and analytics infrastructure',
    linkedProgramId: 'prog-orbis-001',
    phaseSteps: [
      { id: 'step-1', stepNumber: 1, stepInstruction: 'Set up data ingestion' },
      { id: 'step-2', stepNumber: 2, stepInstruction: 'Implement analytics engine' },
      { id: 'step-3', stepNumber: 3, stepInstruction: 'Create dashboard interface' }
    ]
  },
  {
    id: 'proj-orbis-002',
    title: 'Intelligence Reporting',
    description: 'Automated intelligence report generation system',
    linkedProgramId: 'prog-orbis-001',
    phaseSteps: [
      { id: 'step-4', stepNumber: 1, stepInstruction: 'Design report templates' },
      { id: 'step-5', stepNumber: 2, stepInstruction: 'Implement report generation' }
    ]
  },
  {
    id: 'proj-complize-001',
    title: 'Compliance Management Core',
    description: 'Central compliance tracking and management system',
    linkedProgramId: 'prog-complize-001',
    phaseSteps: [
      { id: 'step-6', stepNumber: 1, stepInstruction: 'Define compliance framework' },
      { id: 'step-7', stepNumber: 2, stepInstruction: 'Build tracking dashboard' },
      { id: 'step-8', stepNumber: 3, stepInstruction: 'Implement audit trails' },
      { id: 'step-9', stepNumber: 4, stepInstruction: 'Create compliance reports' }
    ]
  },
  {
    id: 'proj-complize-002',
    title: 'Risk Assessment Module',
    description: 'Automated risk assessment and mitigation planning',
    linkedProgramId: 'prog-complize-001',
    phaseSteps: [
      { id: 'step-10', stepNumber: 1, stepInstruction: 'Define risk categories' },
      { id: 'step-11', stepNumber: 2, stepInstruction: 'Build assessment engine' }
    ]
  },
  {
    id: 'proj-meta-001',
    title: 'Platform Infrastructure',
    description: 'Core platform services and infrastructure setup',
    linkedProgramId: 'prog-metaplatform-001',
    phaseSteps: [
      { id: 'step-12', stepNumber: 1, stepInstruction: 'Plan infrastructure architecture' },
      { id: 'step-13', stepNumber: 2, stepInstruction: 'Set up development environment' },
      { id: 'step-14', stepNumber: 3, stepInstruction: 'Implement core services' }
    ]
  }
];