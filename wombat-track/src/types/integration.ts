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

export interface Integration {
  name: string;
  status: IntegrationStatus;
  lastChecked: Date;
  isActive: boolean;
  category: IntegrationCategory;
  logURL?: string;
}

export interface HealthCheckResponse {
  success: boolean;
  message?: string;
  timestamp: Date;
}