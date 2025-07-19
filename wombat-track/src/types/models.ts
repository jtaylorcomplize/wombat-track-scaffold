// wombat-track/src/types/models.ts

export type Project = {
  id: string;
  title: string;
  description: string;
  goals: string;
  scopeNotes?: string;
  keyTasks?: string[];
  aiPromptLog?: string[];
  phaseSteps: PhaseStep[];
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
