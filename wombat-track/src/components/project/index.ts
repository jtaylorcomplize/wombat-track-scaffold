// Project-related component exports
export { ProjectSwitcher } from './ProjectSwitcher';
export { default as ProjectSidebar } from './ProjectSidebar';
// export { PhasePlanDashboard } from './PhasePlanDashboard';

// Re-export harmonised project data
export { harmonisedProjects, getProjectsByLifecycle, getProjectsNeedingReview } from '../../data/harmonisedProjects';