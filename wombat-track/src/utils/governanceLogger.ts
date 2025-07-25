// Utility for logging governance events
import type { GovernanceEvent } from '../types/governance';

export const createGovernanceEvent = (
  event: Omit<GovernanceEvent, 'id' | 'timestamp'>
): GovernanceEvent => ({
  ...event,
  id: `gov-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  timestamp: new Date().toISOString()
});

export const logSelfManagementInitiative = () => {
  return createGovernanceEvent({
    phaseStepId: 'wt-self-management-phase-2',
    triggeredBy: 'claude-orchestrator',
    eventType: 'SystemUpgrade',
    linkedProject: 'wt-self-managed-app-migration',
    linkedPhase: 'phase-2-data-model-ui',
    severity: 'medium',
    systemComponent: 'data-model',
    details: {
      description: 'Phase 2: Self-Management Initiative - Data Model and UI Enhancements',
      changes: [
        'Added Agent, AgentConnection, and ExternalService data types',
        'Extended Project, PhaseStep, and GovernanceLog types with self-management fields',
        'Created AgentMesh component for agent orchestration',
        'Enhanced GovernanceLog with filtering capabilities',
        'Updated Plan Surface with metadata display components'
      ],
      components: [
        'src/types/agent.ts',
        'src/types/governance.ts', 
        'src/types/phase.ts',
        'src/components/mesh/AgentMesh.tsx',
        'src/components/common/ProjectMetadata.tsx',
        'src/components/common/StepEnhancements.tsx',
        'src/components/GovernanceLogViewer.tsx',
        'src/components/surfaces/IntegrateSurface.tsx'
      ],
      nextPhase: 'Phase 3 will integrate agent mesh with live orchestration capabilities'
    },
    rollbackInfo: {
      canRollback: true,
      rollbackSteps: [
        'Revert type extensions in phase.ts',
        'Remove new agent types and components',
        'Restore original GovernanceLogViewer',
        'Remove AgentMesh from IntegrateSurface'
      ],
      rollbackWindowMinutes: 60
    }
  });
};