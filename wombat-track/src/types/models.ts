// wombat-track/src/types/models.ts

export type Program = {
  id: string;
  name: string;
  description: string;
  status: 'Planning' | 'Active' | 'Paused' | 'Retired';
  programType: 'Core' | 'Sub-App' | 'External' | 'White Label';
  usesOrbisEngine: boolean;
  orbisDependencyLevel: 'None' | 'Partial' | 'Full';
  platformIntegration: string[];
  primaryLead?: string;
  launchDate?: Date;
  notes?: string;
  linkedProjects?: string[]; // Project IDs
};

export type Project = {
  id: string;
  title: string;
  description: string;
  goals: string;
  scopeNotes?: string;
  keyTasks?: string[];
  aiPromptLog?: string[];
  phaseSteps: PhaseStep[];
  linkedProgramId?: string; // References Program.id
};

export type PhaseStep = {
  id: string;
  stepNumber: number;
  stepInstruction: string;
  isSideQuest?: boolean;
  aiSuggestedTemplates?: string[];
  stepProgress?: StepProgress;
  checkpointReview?: CheckpointReview;
  governanceLogs?: GovernanceLog[];
};

export type StepProgress = {
  id: string;
  status: "Not Started" | "In Progress" | "Blocked" | "Complete";
  notes?: string;
  assignedTo?: string;
};

export type GovernanceLog = {
  id: string;
  entryType: "Decision" | "Change" | "Architecture" | "Review";
  summary: string;
  gptDraftEntry?: string;
  relatedMeeting?: MeetingLog;
};

export type CheckpointReview = {
  id: string;
  status: "Passed" | "Revise" | "Pause";
  aiRiskSummary?: string;
};

export type MeetingLog = {
  id: string;
  summary: string;
  decisionsMade: string[];
  gptDraftEntry?: string;
};

export type Template = {
  id: string;
  templateName: string;
  usageType: "PhasePlan" | "Governance" | "Review" | "Generic";
  status: "Active" | "Archived";
};

// Additional helper type for UI components
export type PhaseStepStatus = StepProgress["status"];

// Phase interface for organizing multiple steps
export interface Phase {
  id: string;
  name: string;
  description?: string;
  steps: PhaseStep[];
  startDate?: Date;
  endDate?: Date;
  status?: 'planning' | 'active' | 'completed' | 'on-hold';
}

// Program interface for sub-app organization
export interface Program {
  id: string;
  name: string;
  description: string;
  status: 'Active' | 'Planning' | 'On-Hold' | 'Completed' | 'Active Development' | 'Active / Transitioning to Orbis';
  programType: 'Platform' | 'Security' | 'Analytics' | 'Development' | 'Core' | 'Sub-App';
  launchDate?: string;
  linkedProjects?: string[];
  notes?: string;
  orbisDependencyLevel?: 'Core' | 'High' | 'Medium' | 'Low';
  platformIntegration?: string;
  primaryLead?: string;
  usesOrbisEngine?: boolean;
}
