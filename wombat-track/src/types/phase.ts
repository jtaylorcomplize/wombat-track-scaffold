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
  // Enhanced metadata fields
  createdBy: string;
  projectOwner: string;
  projectType: 'Platform' | 'Content' | 'Migration' | 'R&D' | 'Other';
  status: 'Planned' | 'Active' | 'Paused' | 'Archived' | 'Complete';
  wtTag?: string; // Semantic tag for MemoryPlugin/DriveMemory integration
  phasePlan?: string; // Rich text/markdown content for phase planning
  colorTag?: string; // Optional color coding for project identification
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