import type { PhaseStep } from './phase';

export interface FeaturePlanRow {
  id: string;
  featureName: string;
  app: string;
  subApp: string;
  ragStatus: 'red' | 'amber' | 'green' | 'blue';
  ownerName?: string;
  aiAvailable: boolean;
  aiActionType?: 'scaffold' | 'edit';
  artefactLinks?: string[];
  generatedPhaseSteps?: PhaseStep[];
  memoryAnchorId?: string;
  description?: string;
  priority?: 'high' | 'medium' | 'low';
  estimatedEffort?: string;
  dependencies?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface FeatureFilter {
  app?: string;
  subApp?: string;
  status?: string;
  owner?: string;
}

export interface FeatureComposerState {
  features: FeaturePlanRow[];
  filter: FeatureFilter;
  selectedFeatures: string[];
  isAddModalOpen: boolean;
  isExportModalOpen: boolean;
  isSummaryPanelOpen: boolean;
}

export interface AIPromptSession {
  id: string;
  featureId: string;
  prompt: string;
  response?: string;
  timestamp: string;
  actionType: 'scaffold' | 'edit';
}

export interface ExportOptions {
  format: 'markdown' | 'csv' | 'json';
  includeFields: string[];
  filterApplied: boolean;
}

export type RAGStatus = 'red' | 'amber' | 'green' | 'blue';
export type AIActionType = 'scaffold' | 'edit';