// Utility for logging governance events
import type { GovernanceEvent } from '../types/governance';
import GovernanceProjectIntegration from '../services/governanceProjectIntegration';

export const createGovernanceEvent = (
  event: Omit<GovernanceEvent, 'id' | 'timestamp'>
): GovernanceEvent => ({
  ...event,
  id: `gov-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  timestamp: new Date().toISOString()
});

// Enhanced logging function with automatic project registration
export const logGovernanceEventWithProjectSync = async (
  event: Omit<GovernanceEvent, 'id' | 'timestamp'>
): Promise<GovernanceEvent> => {
  const governanceEvent = createGovernanceEvent(event);
  
  // Trigger automatic project registration if this event references a project
  try {
    const integration = new GovernanceProjectIntegration();
    await integration.processGovernanceEntry(governanceEvent);
  } catch (error) {
    console.warn('Failed to sync governance event with project registration:', error);
  }
  
  return governanceEvent;
};

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

export const logPhase2Completion = () => {
  return createGovernanceEvent({
    phaseStepId: 'wt-phase-2-completion',
    triggeredBy: 'claude-orchestrator',
    eventType: 'PhaseUpdated',
    linkedProject: 'wt-self-managed-app-migration',
    linkedPhase: 'phase-2-self-management-initiative',
    severity: 'medium',
    systemComponent: 'phase-tracker',
    details: {
      summary: 'Phase 2 tested, merged, and tagged. Phase 3 branch created.',
      status: 'completed',
      testResults: {
        buildStatus: 'passing',
        agentMeshTesting: 'completed',
        dataFieldVerification: 'completed',
        governanceLogTesting: 'completed'
      },
      releaseInfo: {
        tag: 'v2.2.0-self-managing-core',
        branch: 'main',
        mergedAt: new Date().toISOString()
      },
      nextPhase: {
        branch: 'feature/phase-3-metaproject-activation',
        description: 'MetaProject Activation with agent orchestration capabilities'
      },
      completedFeatures: [
        'AgentMesh CRUD with localStorage persistence',
        'Extended Project/PhaseStep data models',
        'Enhanced GovernanceLogViewer with filtering',
        'New governance event types (MeshChange, SystemUpgrade, AgentAction)',
        'Project metadata components (techStack, outputFiles, repoRefs)',
        'PhaseStep enhancements (completionChecklist, ciWorkflowRefs)'
      ]
    }
  });
};

export const logAIConsoleInteraction = (params: {
  projectId?: string;
  phaseStepId?: string;
  agent: 'claude' | 'gizmo';
  prompt: string;
  response: string;
  promptType?: string;
  triggeredBy: string;
  isLive?: boolean;
  responseTime?: number;
  agentVersion?: string;
}) => {
  return createGovernanceEvent({
    phaseStepId: params.phaseStepId || 'ai-console-general',
    triggeredBy: params.triggeredBy,
    eventType: 'AIConsoleInteraction',
    linkedProject: params.projectId,
    linkedPhase: params.phaseStepId,
    severity: 'low',
    agentId: params.agent,
    systemComponent: 'ai-console',
    details: {
      agent: params.agent,
      prompt: params.prompt,
      response: params.response,
      promptType: params.promptType || 'general',
      promptLength: params.prompt.length,
      responseLength: params.response.length,
      // Phase WT-5.6 enhancements
      isLive: params.isLive || false,
      responseTime: params.responseTime,
      agentVersion: params.agentVersion,
      // DriveMemory + MemoryPlugin tags
      memoryTags: ['wt-5.5-governance-log-hook', 'ai-console-logging', 'wt-5.6-live-agent-dispatch'],
      interactionMetrics: {
        hasContext: Boolean(params.projectId || params.phaseStepId),
        isProjectSpecific: Boolean(params.projectId),
        isPhaseSpecific: Boolean(params.phaseStepId),
        isRealTime: params.isLive || false,
        dispatchMode: params.isLive ? 'live-api' : 'fallback-mock'
      }
    }
  });
};