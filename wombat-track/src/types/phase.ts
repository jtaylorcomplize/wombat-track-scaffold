export interface PhaseStep {
  id: string;
  phaseId: string;
  name: string;
  status: 'not_started' | 'in_progress' | 'complete';
  executionId?: string;
  startedAt?: string;
  completedAt?: string;
  description?: string;
  templateId?: string;
}

export interface Phase {
  id: string;
  projectId: string;
  name: string;
  description: string;
  order: number;
  steps: PhaseStep[];
}

export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt?: string;
  phases: Phase[];
  archived?: boolean;
}

export interface PhaseStepUpdate {
  stepId: string;
  updates: Partial<PhaseStep>;
}

export interface PhaseTrackerState {
  projects: Project[];
  activeProjectId?: string;
  expandedPhases: Set<string>;
}