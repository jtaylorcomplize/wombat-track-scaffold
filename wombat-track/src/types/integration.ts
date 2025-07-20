export enum IntegrationCategory {
  Claude = "Claude",
  GitHub = "GitHub",
  CI = "CI",
  Sync = "Sync",
  MemoryPlugin = "MemoryPlugin",
  Bubble = "Bubble"
}

export enum IntegrationStatus {
  Working = "working",
  Degraded = "degraded",
  Broken = "broken"
}

export enum DispatchStatus {
  Idle = "idle",
  Queued = "queued",
  Done = "done"
}

export interface Integration {
  name: string;
  status: IntegrationStatus;
  lastChecked: Date;
  isActive: boolean;
  category: IntegrationCategory;
  logURL?: string;
  lastDispatchTime?: Date;
  dispatchStatus?: DispatchStatus;
  templateName: string;
  templateId?: string;
}

export interface HealthCheckResponse {
  success: boolean;
  message?: string;
  timestamp: Date;
}