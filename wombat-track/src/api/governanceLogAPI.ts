// Governance logging for phase metadata changes

export interface PhaseGovernanceLog {
  id: string;
  projectId: string;
  phaseId: string;
  timestamp: Date;
  user: string;
  action: 'create' | 'update' | 'delete' | 'metadata_change';
  changes: {
    field: string;
    oldValue: unknown;
    newValue: unknown;
  }[];
  metadata?: {
    phaseType?: string;
    phaseOwner?: string;
    ragStatus?: string;
  };
}

// Mock in-memory storage for governance logs
let governanceLogs: PhaseGovernanceLog[] = [];

/**
 * Log a phase metadata change
 */
export async function logPhaseMetadataChange(
  projectId: string,
  phaseId: string,
  user: string,
  changes: Record<string, { old: unknown; new: unknown }>
): Promise<PhaseGovernanceLog> {
  const log: PhaseGovernanceLog = {
    id: `gov_log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    projectId,
    phaseId,
    timestamp: new Date(),
    user,
    action: 'metadata_change',
    changes: Object.entries(changes).map(([field, values]) => ({
      field,
      oldValue: values.old,
      newValue: values.new
    })),
    metadata: {
      phaseType: changes.phaseType?.new as string | undefined,
      phaseOwner: changes.phaseOwner?.new as string | undefined,
      ragStatus: changes.ragStatus?.new as string | undefined
    }
  };

  governanceLogs.push(log);
  
  // In a real app, this would persist to a database
  console.log('[Governance] Phase metadata updated:', {
    phaseId,
    changes: Object.keys(changes),
    user
  });

  return log;
}

/**
 * Fetch governance logs for a project
 */
export async function fetchGovernanceLogs(projectId?: string): Promise<PhaseGovernanceLog[]> {
  if (projectId) {
    return governanceLogs.filter(log => log.projectId === projectId);
  }
  return [...governanceLogs];
}

/**
 * Fetch governance logs for a specific phase
 */
export async function fetchPhaseGovernanceLogs(phaseId: string): Promise<PhaseGovernanceLog[]> {
  return governanceLogs.filter(log => log.phaseId === phaseId);
}

/**
 * Clear all governance logs (for testing)
 */
export function clearGovernanceLogs(): void {
  governanceLogs = [];
}