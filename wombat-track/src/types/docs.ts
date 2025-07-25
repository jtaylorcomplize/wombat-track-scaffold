export type DocType = "SOP" | "ProjectSpec" | "Template" | "Checklist";

export interface DocsEntry {
  id: string;
  title: string;
  docType: DocType;
  content: string; // serialized Tiptap JSON or Markdown
  relatedFeatureId?: string;
  relatedPhaseId?: string;
  relatedProjectId?: string;
  memoryAnchorId?: string;
  driveLink?: string;
  tags?: string[];
  lastUpdated: string;
  createdBy: string;
}

export interface AIPromptOption {
  id: string;
  label: string;
  icon: string;
  prompt: string;
  action: 'replace' | 'append' | 'insert';
}

export type SaveStatus = 'saved' | 'saving' | 'failed' | 'unsaved';