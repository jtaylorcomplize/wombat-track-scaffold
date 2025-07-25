// Agent types for self-management and mesh coordination
export type AgentStatus = 'active' | 'idle' | 'error' | 'offline' | 'maintenance';
export type AgentCapability = 'code_generation' | 'testing' | 'deployment' | 'monitoring' | 'analysis' | 'orchestration';

export interface Agent {
  id: string;
  name: string;
  description: string;
  icon: string;
  capabilities: AgentCapability[];
  currentStatus: AgentStatus;
  version?: string;
  endpoint?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  lastActiveAt?: string;
}

export type ConnectionDirection = 'bidirectional' | 'source_to_target' | 'target_to_source';
export type AccessType = 'direct' | 'proxy' | 'gateway' | 'webhook';
export type ConnectionStatus = 'connected' | 'disconnected' | 'pending' | 'error';

export interface AgentConnection {
  id: string;
  source: string; // Agent ID
  target: string; // Agent ID
  direction: ConnectionDirection;
  accessType: AccessType;
  status: ConnectionStatus;
  contextTags: string[];
  bandwidth?: number;
  latency?: number;
  lastHealthCheck?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export type ServiceType = 'api' | 'database' | 'storage' | 'messaging' | 'monitoring' | 'auth' | 'cdn' | 'compute';
export type ServiceStatus = 'operational' | 'degraded' | 'outage' | 'maintenance' | 'unknown';

export interface ExternalService {
  id: string;
  name: string;
  type: ServiceType;
  status: ServiceStatus;
  docURL?: string;
  healthEndpoint?: string;
  version?: string;
  provider?: string;
  region?: string;
  dependencies?: string[]; // Other service IDs
  metadata?: Record<string, any>;
  createdAt: string;
  lastStatusUpdate?: string;
}