// Template types for dashboard compatibility

export interface TemplateExecution {
  id: string;
  templateId: string;
  templateName: string;
  executionId: string;
  status: 'queued' | 'running' | 'done' | 'error';
  platform: string;
  startTime: Date;
  endTime?: Date;
}