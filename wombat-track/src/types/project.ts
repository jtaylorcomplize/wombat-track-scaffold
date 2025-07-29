// Extended project types for the new Work Surfaces layout
export type { Project, Phase, PhaseStep as Step } from './phase';

// Additional metadata for the new layout
import type { Project, Phase, PhaseStep } from './phase';

export interface ExtendedProject extends Omit<Project, 'status'> {
  status: 'Active' | 'On Hold' | 'Completed' | 'Archived';
  completionPercentage?: number;
  currentPhase?: string;
}

export interface ExtendedPhase extends Omit<Phase, 'id' | 'projectId' | 'name' | 'description' | 'order' | 'steps'> {
  id: string;
  projectId: string;
  name: string;
  description: string;
  order: number;
  steps: ExtendedStep[];
  status: 'not_started' | 'in_progress' | 'completed' | 'blocked' | 'on_hold';
  completionPercentage?: number;
}

export interface ExtendedStep extends Omit<PhaseStep, 'status'> {
  status: 'not_started' | 'in_progress' | 'completed' | 'blocked';
}

// Re-export the original types as well for compatibility
export * from './phase';