// Governance and logging types for self-management
export type GovernanceEventType = 
  | 'StepStatusUpdated' 
  | 'StepAdded' 
  | 'StepRemoved' 
  | 'PhaseUpdated'
  | 'MeshChange'
  | 'SystemUpgrade'
  | 'AgentAction';

export interface GovernanceEvent {
  id: string;
  phaseStepId: string;
  newStatus?: string;
  triggeredBy: string;
  eventType: GovernanceEventType;
  timestamp: string;
  details?: any;
  // Self-management enhancements
  linkedProject?: string; // Project ID for filtering
  linkedPhase?: string; // Phase ID for context
  severity?: 'low' | 'medium' | 'high' | 'critical';
  agentId?: string; // For agent-triggered events
  systemComponent?: string; // For system-level events
  rollbackInfo?: {
    canRollback: boolean;
    rollbackSteps?: string[];
    rollbackWindowMinutes?: number;
  };
}

export interface GovernanceFilter {
  eventType?: GovernanceEventType | 'all';
  linkedProject?: string | 'all';
  linkedPhase?: string | 'all';
  severity?: 'low' | 'medium' | 'high' | 'critical' | 'all';
  dateRange?: {
    start: string;
    end: string;
  };
}