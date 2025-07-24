// Phase types - restored from recovery branch for ProjectDashboard compatibility

export interface PhaseStep {
  id: string;
  phaseId: string;
  name: string;
  status: 'not_started' | 'in_progress' | 'complete' | 'error';
  executionId?: string;
  startedAt?: string;
  completedAt?: string;
  description?: string;
  templateId?: string;
  stepInstruction?: string;
  isSideQuest?: boolean;
}

export interface Phase {
  id: string;
  projectId: string;
  name: string;
  description: string;
  order: number;
  steps: PhaseStep[];
  summary?: string;
  phaseType?: string;
  phaseOwner?: string;
  ragStatus?: 'red' | 'amber' | 'green' | 'blue';
}

export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt?: string;
  phases: Phase[];
  archived?: boolean;
  createdBy: string;
  projectOwner: string;
  projectType: string;
  status: 'Planned' | 'Active' | 'Paused' | 'Archived' | 'Complete' | 'active';
  wtTag?: string;
  phasePlan?: string;
  colorTag?: string;
}