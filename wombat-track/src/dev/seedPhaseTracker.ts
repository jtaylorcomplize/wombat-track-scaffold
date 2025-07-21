import type { Project } from '../types/phase';

// Global flag to ensure seeding runs only once per session
declare global {
  interface Window {
    __hasSeededPhaseTracker?: boolean;
  }
}

const generateId = () => {
  return crypto.randomUUID ? crypto.randomUUID() : `seed_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Complete ORB-2.x project structure with realistic implementation milestones
export const seedProject: Project = {
  id: 'proj-orb-2x-metaplatform',
  name: 'MetaPlatform – Orbis Phase 2',
  description: 'Complete implementation of Orbis Dashboard with template execution, phase tracking, and admin utilities',
  createdAt: '2025-01-15T09:00:00Z',
  updatedAt: '2025-07-21T16:30:00Z',
  createdBy: 'Jordan Taylor',
  projectOwner: 'Jordan Taylor',
  projectType: 'Platform',
  status: 'Complete',
  wtTag: 'orb-2x-metaplatform',
  phasePlan: `# MetaPlatform – Orbis Phase 2 Implementation

## Project Overview
This project represents the complete implementation journey of the Orbis Dashboard system, from initial design through comprehensive admin utilities, spanning 8 major phases with 47 detailed implementation steps.

## Key Achievements
- **Template Execution System**: Real-time template dispatch with API integration
- **Phase Tracking**: Hierarchical project management with execution linking
- **Admin Utilities**: Complete CRUD operations for projects, phases, and steps
- **Execution Persistence**: Comprehensive logging and history tracking
- **Interactive UI**: Rich dashboard with status monitoring and controls

## Technical Milestones
- ORB-2.0: Initial design and Git workflow setup
- ORB-2.1: Dispatch button UI with state management
- ORB-2.2: Template trigger integration
- ORB-2.3: Real template execution system
- ORB-2.4: API-driven workflow execution
- ORB-2.5: Execution log persistence
- ORB-2.6: Interactive phase tracker UI
- ORB-2.7: Complete admin system with CRUD operations

## Success Metrics
- 47 implementation steps completed
- 8 major phases delivered on schedule
- Full integration testing passed
- Comprehensive admin functionality delivered
- Real-time execution tracking operational

## Architecture Highlights
- React TypeScript functional components
- Mock API persistence layer
- Hierarchical data structures
- Real-time polling for status updates
- Modular dispatcher system for multiple platforms

## Resources & Documentation
- [Template Dispatcher Documentation](https://docs.wombattrack.io/dispatchers)
- [Phase Tracker API Reference](https://docs.wombattrack.io/phase-tracker)
- [Admin Utilities Guide](https://docs.wombattrack.io/admin)
- [Integration Testing Framework](https://docs.wombattrack.io/testing)`,
  colorTag: '#8b5cf6',
  phases: [
    {
      id: 'phase-orb-2.0',
      projectId: 'proj-orb-2x-metaplatform',
      name: 'ORB-2.0: Design & Planning',
      description: 'Initial dashboard finalization and Git workflow setup',
      order: 1,
      steps: [
        {
          id: 'step-orb-2.0-git-setup',
          phaseId: 'phase-orb-2.0',
          name: 'Create feature branch and initial commit',
          status: 'complete',
          description: 'Set up meta-platform-dashboard-tests branch',
          startedAt: '2025-01-15T09:00:00Z',
          completedAt: '2025-01-15T09:30:00Z'
        },
        {
          id: 'step-orb-2.0-dashboard-review',
          phaseId: 'phase-orb-2.0',
          name: 'Review OrbisDashboard implementation',
          status: 'complete',
          description: 'Verify existing dashboard components and integration health UI',
          startedAt: '2025-01-15T09:30:00Z',
          completedAt: '2025-01-15T10:15:00Z'
        },
        {
          id: 'step-orb-2.0-pr-lifecycle',
          phaseId: 'phase-orb-2.0',
          name: 'Complete PR creation and merge',
          status: 'complete',
          description: 'Create PR #3, verify functionality, and merge to main',
          startedAt: '2025-01-15T10:15:00Z',
          completedAt: '2025-01-15T11:00:00Z'
        },
        {
          id: 'step-orb-2.0-test-fixes',
          phaseId: 'phase-orb-2.0',
          name: 'Fix UI test timeout issues',
          status: 'complete',
          description: 'Resolve npm run test:ui hanging and navigation issues',
          templateId: 'test-repair-001',
          startedAt: '2025-01-15T11:00:00Z',
          completedAt: '2025-01-15T12:00:00Z'
        }
      ]
    },
    {
      id: 'phase-orb-2.1',
      projectId: 'proj-orb-2x-metaplatform',
      name: 'ORB-2.1: Dispatch Button UI',
      description: 'Add dispatch triggers with state management for integration orchestration',
      order: 2,
      steps: [
        {
          id: 'step-orb-2.1-dispatch-types',
          phaseId: 'phase-orb-2.1',
          name: 'Add DispatchStatus enum to integration types',
          status: 'complete',
          description: 'Define idle/queued/done status for dispatch operations',
          startedAt: '2025-01-16T09:00:00Z',
          completedAt: '2025-01-16T09:30:00Z'
        },
        {
          id: 'step-orb-2.1-integration-card',
          phaseId: 'phase-orb-2.1',
          name: 'Update IntegrationCard with dispatch button',
          status: 'complete',
          description: 'Add dispatch button with active/inactive state management',
          startedAt: '2025-01-16T09:30:00Z',
          completedAt: '2025-01-16T11:00:00Z'
        },
        {
          id: 'step-orb-2.1-status-badges',
          phaseId: 'phase-orb-2.1',
          name: 'Implement dispatch status badges',
          status: 'complete',
          description: 'Visual status indicators showing dispatch progress',
          startedAt: '2025-01-16T11:00:00Z',
          completedAt: '2025-01-16T12:30:00Z'
        },
        {
          id: 'step-orb-2.1-dashboard-integration',
          phaseId: 'phase-orb-2.1',
          name: 'Add handleDispatch to OrbisDashboard',
          status: 'complete',
          description: 'Implement dispatch state management in main dashboard',
          startedAt: '2025-01-16T12:30:00Z',
          completedAt: '2025-01-16T14:00:00Z'
        },
        {
          id: 'step-orb-2.1-tests',
          phaseId: 'phase-orb-2.1',
          name: 'Add test coverage for dispatch functionality',
          status: 'complete',
          description: 'Comprehensive testing of dispatch buttons and status changes',
          templateId: 'test-dispatch-001',
          startedAt: '2025-01-16T14:00:00Z',
          completedAt: '2025-01-16T15:30:00Z'
        }
      ]
    },
    {
      id: 'phase-orb-2.2',
      projectId: 'proj-orb-2x-metaplatform',
      name: 'ORB-2.2: Template Trigger Integration',
      description: 'Link dispatch buttons to specific templates with visual indicators',
      order: 3,
      steps: [
        {
          id: 'step-orb-2.2-template-fields',
          phaseId: 'phase-orb-2.2',
          name: 'Add templateName and templateId to Integration model',
          status: 'complete',
          description: 'Extend integration type with template association fields',
          startedAt: '2025-01-17T09:00:00Z',
          completedAt: '2025-01-17T09:45:00Z'
        },
        {
          id: 'step-orb-2.2-mock-templates',
          phaseId: 'phase-orb-2.2',
          name: 'Update mock integrations with template data',
          status: 'complete',
          description: 'Assign realistic template names and IDs to mock data',
          startedAt: '2025-01-17T09:45:00Z',
          completedAt: '2025-01-17T10:30:00Z'
        },
        {
          id: 'step-orb-2.2-dispatch-logic',
          phaseId: 'phase-orb-2.2',
          name: 'Modify handleDispatch to log template names',
          status: 'complete',
          description: 'Update dispatch logic to use template information',
          startedAt: '2025-01-17T10:30:00Z',
          completedAt: '2025-01-17T11:30:00Z'
        },
        {
          id: 'step-orb-2.2-template-labels',
          phaseId: 'phase-orb-2.2',
          name: 'Add template labels with view links to cards',
          status: 'complete',
          description: 'Visual template indicators on integration cards',
          startedAt: '2025-01-17T11:30:00Z',
          completedAt: '2025-01-17T13:00:00Z'
        },
        {
          id: 'step-orb-2.2-template-tests',
          phaseId: 'phase-orb-2.2',
          name: 'Update test coverage for template functionality',
          status: 'complete',
          description: 'Test template name display and dispatch integration',
          templateId: 'test-template-001',
          startedAt: '2025-01-17T13:00:00Z',
          completedAt: '2025-01-17T14:30:00Z'
        }
      ]
    },
    {
      id: 'phase-orb-2.3',
      projectId: 'proj-orb-2x-metaplatform',
      name: 'ORB-2.3: Real Template Execution',
      description: 'Replace simulation with real template execution system',
      order: 4,
      steps: [
        {
          id: 'step-orb-2.3-dispatcher-module',
          phaseId: 'phase-orb-2.3',
          name: 'Create templateDispatcher.ts module',
          status: 'complete',
          description: 'Build modular dispatcher system for different platforms',
          startedAt: '2025-01-18T09:00:00Z',
          completedAt: '2025-01-18T11:00:00Z'
        },
        {
          id: 'step-orb-2.3-platform-dispatchers',
          phaseId: 'phase-orb-2.3',
          name: 'Implement Claude, GitHub, and CI dispatchers',
          status: 'complete',
          description: 'Platform-specific execution handlers with error management',
          templateId: 'claude-health-001',
          executionId: 'exec_template_setup_001',
          startedAt: '2025-01-18T11:00:00Z',
          completedAt: '2025-01-18T14:00:00Z'
        },
        {
          id: 'step-orb-2.3-trigger-template',
          phaseId: 'phase-orb-2.3',
          name: 'Update handleDispatch to use triggerTemplate',
          status: 'complete',
          description: 'Replace simulated dispatch with real template execution',
          startedAt: '2025-01-18T14:00:00Z',
          completedAt: '2025-01-18T15:30:00Z'
        },
        {
          id: 'step-orb-2.3-execution-tracking',
          phaseId: 'phase-orb-2.3',
          name: 'Add execution tracking and error handling',
          status: 'complete',
          description: 'Comprehensive execution result tracking with detailed info',
          startedAt: '2025-01-18T15:30:00Z',
          completedAt: '2025-01-18T16:45:00Z'
        },
        {
          id: 'step-orb-2.3-real-dispatch-tests',
          phaseId: 'phase-orb-2.3',
          name: 'Enhance test coverage for real dispatch',
          status: 'complete',
          description: 'Test real template execution with platform integration',
          templateId: 'test-real-dispatch-001',
          startedAt: '2025-01-18T16:45:00Z',
          completedAt: '2025-01-18T17:30:00Z'
        }
      ]
    },
    {
      id: 'phase-orb-2.4',
      projectId: 'proj-orb-2x-metaplatform',
      name: 'ORB-2.4: API-Based Workflow Execution',
      description: 'Extend to API-driven workflows with POST requests and execution tracking',
      order: 5,
      steps: [
        {
          id: 'step-orb-2.4-post-helper',
          phaseId: 'phase-orb-2.4',
          name: 'Create dispatchViaPost helper function',
          status: 'complete',
          description: 'Reusable POST request handler for template execution',
          startedAt: '2025-01-19T09:00:00Z',
          completedAt: '2025-01-19T10:30:00Z'
        },
        {
          id: 'step-orb-2.4-claude-api',
          phaseId: 'phase-orb-2.4',
          name: 'Update dispatchClaude to use real POST requests',
          status: 'complete',
          description: 'Connect Claude dispatcher to https://claude.api.wombattrack.io/trigger',
          templateId: 'claude-health-001',
          executionId: 'exec_api_claude_001',
          startedAt: '2025-01-19T10:30:00Z',
          completedAt: '2025-01-19T12:00:00Z'
        },
        {
          id: 'step-orb-2.4-all-dispatchers',
          phaseId: 'phase-orb-2.4',
          name: 'Refactor all dispatchers to use dispatchViaPost',
          status: 'complete',
          description: 'Standardize GitHub Actions and CI/CD dispatchers',
          startedAt: '2025-01-19T12:00:00Z',
          completedAt: '2025-01-19T14:00:00Z'
        },
        {
          id: 'step-orb-2.4-execution-info',
          phaseId: 'phase-orb-2.4',
          name: 'Extend return value with detailed execution info',
          status: 'complete',
          description: 'Enhanced execution results with timing and platform data',
          startedAt: '2025-01-19T14:00:00Z',
          completedAt: '2025-01-19T15:30:00Z'
        },
        {
          id: 'step-orb-2.4-api-tests',
          phaseId: 'phase-orb-2.4',
          name: 'Update tests for API-driven execution',
          status: 'complete',
          description: 'Test API integration and execution tracking',
          templateId: 'test-api-execution-001',
          startedAt: '2025-01-19T15:30:00Z',
          completedAt: '2025-01-19T16:45:00Z'
        }
      ]
    },
    {
      id: 'phase-orb-2.5',
      projectId: 'proj-orb-2x-metaplatform',
      name: 'ORB-2.5: Persist Execution Logs',
      description: 'Create TemplateExecution history with API persistence and UI display',
      order: 6,
      steps: [
        {
          id: 'step-orb-2.5-execution-types',
          phaseId: 'phase-orb-2.5',
          name: 'Create TemplateExecution type interface',
          status: 'complete',
          description: 'Define comprehensive execution tracking data structure',
          startedAt: '2025-01-20T09:00:00Z',
          completedAt: '2025-01-20T09:30:00Z'
        },
        {
          id: 'step-orb-2.5-execution-api',
          phaseId: 'phase-orb-2.5',
          name: 'Create executionLogAPI.ts with mock persistence',
          status: 'complete',
          description: 'API layer for execution log CRUD operations',
          startedAt: '2025-01-20T09:30:00Z',
          completedAt: '2025-01-20T11:00:00Z'
        },
        {
          id: 'step-orb-2.5-dispatcher-logging',
          phaseId: 'phase-orb-2.5',
          name: 'Update templateDispatcher with execution logging',
          status: 'complete',
          description: 'Integrate API calls throughout execution lifecycle',
          templateId: 'claude-health-001',
          executionId: 'exec_logging_001',
          startedAt: '2025-01-20T11:00:00Z',
          completedAt: '2025-01-20T13:00:00Z'
        },
        {
          id: 'step-orb-2.5-history-ui',
          phaseId: 'phase-orb-2.5',
          name: 'Add Execution History UI section',
          status: 'complete',
          description: 'Collapsible history display with real-time polling',
          startedAt: '2025-01-20T13:00:00Z',
          completedAt: '2025-01-20T15:30:00Z'
        },
        {
          id: 'step-orb-2.5-history-tests',
          phaseId: 'phase-orb-2.5',
          name: 'Add comprehensive execution history tests',
          status: 'complete',
          description: 'Test logging, display, and API persistence',
          templateId: 'test-execution-history-001',
          startedAt: '2025-01-20T15:30:00Z',
          completedAt: '2025-01-20T16:45:00Z'
        }
      ]
    },
    {
      id: 'phase-orb-2.6',
      projectId: 'proj-orb-2x-metaplatform',
      name: 'ORB-2.6: Phase Tracker UI',
      description: 'Interactive Project → Phase → PhaseStep hierarchy with execution integration',
      order: 7,
      steps: [
        {
          id: 'step-orb-2.6-phase-types',
          phaseId: 'phase-orb-2.6',
          name: 'Create Project, Phase, PhaseStep types',
          status: 'complete',
          description: 'Define hierarchical project management data structures',
          startedAt: '2025-01-21T09:00:00Z',
          completedAt: '2025-01-21T09:45:00Z'
        },
        {
          id: 'step-orb-2.6-mock-projects',
          phaseId: 'phase-orb-2.6',
          name: 'Create realistic mock project data',
          status: 'complete',
          description: 'Multi-project structure with phases and execution-linked steps',
          startedAt: '2025-01-21T09:45:00Z',
          completedAt: '2025-01-21T10:30:00Z'
        },
        {
          id: 'step-orb-2.6-phase-tracker',
          phaseId: 'phase-orb-2.6',
          name: 'Build PhaseTracker component',
          status: 'complete',
          description: 'Hierarchical UI with expand/collapse and status management',
          startedAt: '2025-01-21T10:30:00Z',
          completedAt: '2025-01-21T13:30:00Z'
        },
        {
          id: 'step-orb-2.6-step-controls',
          phaseId: 'phase-orb-2.6',
          name: 'Add step controls (Start, Complete, View Log)',
          status: 'complete',
          description: 'Interactive buttons with template trigger integration',
          templateId: 'claude-health-001',
          executionId: 'exec_step_control_001',
          startedAt: '2025-01-21T13:30:00Z',
          completedAt: '2025-01-21T15:00:00Z'
        },
        {
          id: 'step-orb-2.6-execution-sync',
          phaseId: 'phase-orb-2.6',
          name: 'Auto-update steps with execution status',
          status: 'complete',
          description: 'Real-time polling integration with execution logs',
          startedAt: '2025-01-21T15:00:00Z',
          completedAt: '2025-01-21T16:00:00Z'
        },
        {
          id: 'step-orb-2.6-dashboard-integration',
          phaseId: 'phase-orb-2.6',
          name: 'Integrate PhaseTracker into OrbisDashboard',
          status: 'complete',
          description: 'Add collapsible Phase Tracker section with toggle',
          startedAt: '2025-01-21T16:00:00Z',
          completedAt: '2025-01-21T16:30:00Z'
        },
        {
          id: 'step-orb-2.6-phase-tests',
          phaseId: 'phase-orb-2.6',
          name: 'Comprehensive phase tracking tests',
          status: 'complete',
          description: 'Test hierarchy rendering, interactions, and status updates',
          templateId: 'test-phase-tracker-001',
          startedAt: '2025-01-21T16:30:00Z',
          completedAt: '2025-01-21T17:30:00Z'
        }
      ]
    },
    {
      id: 'phase-orb-2.7',
      projectId: 'proj-orb-2x-metaplatform',
      name: 'ORB-2.7: Phase Tracker Admin System',
      description: 'Complete CRUD management for Projects, Phases, and PhaseSteps',
      order: 8,
      steps: [
        {
          id: 'step-orb-2.7-admin-modal',
          phaseId: 'phase-orb-2.7',
          name: 'Create PhaseAdminModal component',
          status: 'complete',
          description: 'Modal interface with tabbed navigation for CRUD operations',
          startedAt: '2025-01-21T18:00:00Z',
          completedAt: '2025-01-21T20:00:00Z'
        },
        {
          id: 'step-orb-2.7-projects-crud',
          phaseId: 'phase-orb-2.7',
          name: 'Build Projects CRUD tab',
          status: 'complete',
          description: 'Full project lifecycle management with archive functionality',
          startedAt: '2025-01-21T20:00:00Z',
          completedAt: '2025-01-21T21:30:00Z'
        },
        {
          id: 'step-orb-2.7-phases-crud',
          phaseId: 'phase-orb-2.7',
          name: 'Build Phases CRUD tab',
          status: 'complete',
          description: 'Phase management with reordering and step preview',
          startedAt: '2025-01-21T21:30:00Z',
          completedAt: '2025-01-21T22:30:00Z'
        },
        {
          id: 'step-orb-2.7-steps-crud',
          phaseId: 'phase-orb-2.7',
          name: 'Build PhaseSteps CRUD tab',
          status: 'complete',
          description: 'Step management with template/execution ID assignment',
          startedAt: '2025-01-21T22:30:00Z',
          completedAt: '2025-01-21T23:30:00Z'
        },
        {
          id: 'step-orb-2.7-reordering',
          phaseId: 'phase-orb-2.7',
          name: 'Implement reordering functionality',
          status: 'complete',
          description: 'Up/down controls for phases and steps with visual feedback',
          startedAt: '2025-01-21T23:30:00Z',
          completedAt: '2025-01-22T00:15:00Z'
        },
        {
          id: 'step-orb-2.7-import-export',
          phaseId: 'phase-orb-2.7',
          name: 'Add import/export JSON functionality',
          status: 'complete',
          description: 'Data portability with file download/upload capabilities',
          startedAt: '2025-01-22T00:15:00Z',
          completedAt: '2025-01-22T00:45:00Z'
        },
        {
          id: 'step-orb-2.7-admin-tests',
          phaseId: 'phase-orb-2.7',
          name: 'Add comprehensive admin functionality tests',
          status: 'complete',
          description: 'Test modal, tabs, CRUD operations, and import/export',
          templateId: 'test-admin-system-001',
          startedAt: '2025-01-22T00:45:00Z',
          completedAt: '2025-01-22T01:30:00Z'
        }
      ]
    }
  ],
  archived: false
};

/**
 * Seeds the Phase Tracker with the complete ORB-2.x project history
 * Only runs once per session and only in development mode
 */
export function seedPhaseTracker(setProjects: (projects: Project[]) => void): boolean {
  // Only run in development mode
  if (typeof window !== 'undefined' && import.meta.env?.MODE !== 'development') {
    return false;
  }

  // Only run once per session
  if (typeof window !== 'undefined' && window.__hasSeededPhaseTracker) {
    console.info('[WT] Phase Tracker already seeded in this session');
    return false;
  }

  console.info('[WT] Seeding Phase Tracker with ORB-2.x project history...');

  try {
    // Add the seed project to existing projects
    setProjects(prevProjects => {
      // Check if seed project already exists
      const seedExists = prevProjects.some(p => p.id === seedProject.id);
      if (seedExists) {
        console.info('[WT] Seed project already exists, skipping...');
        return prevProjects;
      }

      // Add seed project to the beginning of the list
      return [seedProject, ...prevProjects];
    });

    // Mark as seeded for this session
    if (typeof window !== 'undefined') {
      window.__hasSeededPhaseTracker = true;
    }

    console.info('[WT] ✅ Phase Tracker seeded successfully!', {
      project: seedProject.name,
      phases: seedProject.phases.length,
      totalSteps: seedProject.phases.reduce((acc, phase) => acc + phase.steps.length, 0)
    });

    return true;
  } catch (error) {
    console.error('[WT] ❌ Failed to seed Phase Tracker:', error);
    return false;
  }
}

/**
 * Development utility to manually trigger seeding
 * Useful for testing or manual refresh
 */
export function forceSeedPhaseTracker(setProjects: (projects: Project[]) => void): boolean {
  if (typeof window !== 'undefined') {
    window.__hasSeededPhaseTracker = false;
  }
  return seedPhaseTracker(setProjects);
}

/**
 * Check if Phase Tracker has been seeded in this session
 */
export function isPhaseTrackerSeeded(): boolean {
  return typeof window !== 'undefined' && !!window.__hasSeededPhaseTracker;
}