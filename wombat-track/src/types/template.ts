export interface TemplateExecution {
  id: string;
  templateId: string;
  templateName: string;
  integrationId: string;
  integrationName: string;
  status: 'queued' | 'in_progress' | 'done' | 'error';
  startTime: Date;
  endTime?: Date;
  executionId: string;
  platform: 'claude' | 'github' | 'ci' | 'generic';
  error?: string;
}

export interface TemplateExecutionLog {
  executions: TemplateExecution[];
  addExecution: (execution: TemplateExecution) => void;
  updateExecution: (id: string, updates: Partial<TemplateExecution>) => void;
  getExecutionsByIntegration: (integrationId: string) => TemplateExecution[];
  getRecentExecutions: (limit?: number) => TemplateExecution[];
}