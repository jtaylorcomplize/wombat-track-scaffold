// Phase status computation utilities
// Restored from sidebar-recovery-branch commit 64a589c

import type { Phase } from '../types/models';

export type ComputedPhaseStatus = 'not_started' | 'in_progress' | 'complete' | 'blocked';

/**
 * Computes phase status based on step progress
 * Logic restored from ProjectSidebarSimple.tsx getPhaseStatus()
 */
export const getPhaseStatus = (phase: Phase): ComputedPhaseStatus => {
  if (!phase.steps || phase.steps.length === 0) {
    return 'not_started';
  }
  
  const stepStatuses = phase.steps.map(step => step.stepProgress?.status || 'Not Started');
  
  // If any step is blocked, phase is blocked
  if (stepStatuses.includes('Blocked')) {
    return 'blocked';
  }
  
  // If all steps are complete, phase is complete
  if (stepStatuses.every(status => status === 'Complete')) {
    return 'complete';
  }
  
  // If any step is in progress, phase is in progress
  if (stepStatuses.includes('In Progress')) {
    return 'in_progress';
  }
  
  // If all steps are not started, phase is not started
  if (stepStatuses.every(status => status === 'Not Started')) {
    return 'not_started';
  }
  
  // Mixed states mean in progress
  return 'in_progress';
};

/**
 * Maps computed status to display status for consistency
 */
export const getPhaseDisplayStatus = (phase: Phase): string => {
  const computed = getPhaseStatus(phase);
  
  switch (computed) {
    case 'not_started':
      return 'Not Started';
    case 'in_progress':
      return 'In Progress';
    case 'complete':
      return 'Complete';
    case 'blocked':
      return 'Blocked';
    default:
      return 'Not Started';
  }
};

/**
 * Gets progress percentage for a phase
 */
export const getPhaseProgress = (phase: Phase): number => {
  if (!phase.steps || phase.steps.length === 0) {
    return 0;
  }
  
  const completedSteps = phase.steps.filter(
    step => step.stepProgress?.status === 'Complete'
  ).length;
  
  return Math.round((completedSteps / phase.steps.length) * 100);
};