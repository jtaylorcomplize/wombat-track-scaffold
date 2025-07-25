// Extended project types for the new Work Surfaces layout
export type { Project, Phase, PhaseStep as Step } from './phase';

// Additional metadata for the new layout
export interface ExtendedProject extends Omit<import('./phase').Project, 'status'> {
  status: 'Active' | 'On Hold' | 'Completed' | 'Archived';
  completionPercentage?: number;
  currentPhase?: string;
}

export interface ExtendedPhase extends import('./phase').Phase {
  status: 'not_started' | 'in_progress' | 'completed' | 'blocked' | 'on_hold';
  completionPercentage?: number;
}

export interface ExtendedStep extends Omit<import('./phase').PhaseStep, 'status'> {
  status: 'not_started' | 'in_progress' | 'completed' | 'blocked';
}

// Re-export the original types as well for compatibility
export * from './phase';