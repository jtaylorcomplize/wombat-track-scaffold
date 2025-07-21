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

// Complete WT-2.x project structure with realistic implementation milestones
export const seedProject: Project = {
  id: 'proj-wt-2x-metaplatform',
  name: 'MetaPlatform – WT Console Phase 2',
  description: 'Complete implementation of WombatConsole with template execution, phase tracking, and admin utilities',
  createdAt: '2025-01-15T09:00:00Z',
  updatedAt: '2025-07-21T16:30:00Z',
  createdBy: 'jackson',
  projectOwner: 'jackson',
  projectType: 'execution-console',
  status: 'active',
  wtTag: 'wombat-console',
  phasePlan: `# 📑 Phase Plan – MetaPlatform: WT Console Phase 2

## 🧭 Purpose

The MetaPlatform project is a subapp of Wombat Track designed to build a fully operational AI-integrated development console. It supports structured workflow execution, real-time status tracking, and interactive governance tooling.

## 🛠️ System Goals

- Execute templates (e.g., Claude scaffolds, GitHub workflows)
- Track executions via live logs
- Visualise project phases and track completion
- Manage multiple concurrent projects
- Serve as a full SDLC manager for AI-assisted delivery

## 🧱 Architecture Overview

- \`WombatConsole\` hosts all major views
- \`templateDispatcher.ts\` handles platform-based dispatch logic
- \`executionLogAPI.ts\` simulates backend persistence (mock, ready for upgrade)
- \`PhaseTracker\` visualises Project → Phase → PhaseStep hierarchy
- \`PhaseAdminModal\` allows CRUD + import/export + metadata tagging
- \`ProjectSwitcher\` filters views by project context
- \`PhasePlanEditor\` stores and renders this document!

## 🔁 WT-2.x Feature Timeline

- **WT-2.0**: Git setup, test infra, dashboard review
- **WT-2.1**: Dispatch button and UI
- **WT-2.2**: Template trigger fields, labels, and viewer links
- **WT-2.3**: Real execution pipeline (Claude, GitHub, CI)
- **WT-2.4**: API-based dispatcher system
- **WT-2.5**: Execution logs and history UI
- **WT-2.6**: Interactive Phase Tracker (projects → phases → steps)
- **WT-2.7**: Phase Admin modal with full CRUD + reordering + archive
- **WT-2.8**: Phase Plan tab, ProjectSwitcher, UX polish

## 🧠 Development Philosophy

Wombat Track enables AI-augmented execution and governance with full traceability. Every feature is committed, tested, tracked in Phase history, and linked to real execution.

We use Markdown to author human-readable documentation. We use Puppeteer to automate verification. We use Claude to scaffold code based on these plans.

## 🧩 Governance Structure

- Projects are tracked via seeded structures
- Templates are linked by ID and trigger dispatches
- Execution logs persist via API
- Statuses reflect real outcomes, not assumptions

## 🔗 Resources

- Canvas Source: \`/meta-platform-dashboard\`
- Execution API: \`src/api/executionLogAPI.ts\`
- Template Dispatcher: \`src/lib/templateDispatcher.ts\`
- UI Test Suite: \`tests/ui/meta_platform_dashboard.spec.js\`
- Canvas Artefact: "WombatConsole Template Dispatch"`,
  colorTag: 'purple',
  phases: [
    {
      id: 'phase-wt-2.0',
      projectId: 'proj-wt-2x-metaplatform',
      name: 'WT-2.0: Design & Planning',
      description: 'Initial dashboard finalization and Git workflow setup',
      order: 1,
      steps: [
        {
          id: 'step-wt-2.0-git-setup',
          phaseId: 'phase-wt-2.0',
          name: 'Create feature branch and initial commit',
          status: 'complete',
          description: 'Set up meta-platform-dashboard-tests branch',
          startedAt: '2025-01-15T09:00:00Z',
          completedAt: '2025-01-15T09:30:00Z'
        },
        {
          id: 'step-wt-2.0-dashboard-review',
          phaseId: 'phase-wt-2.0',
          name: 'Review OrbisDashboard implementation',
          status: 'complete',
          description: 'Verify existing dashboard components and integration health UI',
          startedAt: '2025-01-15T09:30:00Z',
          completedAt: '2025-01-15T10:15:00Z'
        },
        {
          id: 'step-wt-2.0-pr-lifecycle',
          phaseId: 'phase-wt-2.0',
          name: 'Complete PR creation and merge',
          status: 'complete',
          description: 'Create PR #3, verify functionality, and merge to main',
          startedAt: '2025-01-15T10:15:00Z',
          completedAt: '2025-01-15T11:00:00Z'
        },
        {
          id: 'step-wt-2.0-test-fixes',
          phaseId: 'phase-wt-2.0',
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
      id: 'phase-wt-2.1',
      projectId: 'proj-wt-2x-metaplatform',
      name: 'WT-2.1: Dispatch Button UI',
      description: 'Add dispatch triggers with state management for integration orchestration',
      order: 2,
      steps: [
        {
          id: 'step-wt-2.1-dispatch-types',
          phaseId: 'phase-wt-2.1',
          name: 'Add DispatchStatus enum to integration types',
          status: 'complete',
          description: 'Define idle/queued/done status for dispatch operations',
          startedAt: '2025-01-16T09:00:00Z',
          completedAt: '2025-01-16T09:30:00Z'
        },
        {
          id: 'step-wt-2.1-integration-card',
          phaseId: 'phase-wt-2.1',
          name: 'Update IntegrationCard with dispatch button',
          status: 'complete',
          description: 'Add dispatch button with active/inactive state management',
          startedAt: '2025-01-16T09:30:00Z',
          completedAt: '2025-01-16T11:00:00Z'
        },
        {
          id: 'step-wt-2.1-status-badges',
          phaseId: 'phase-wt-2.1',
          name: 'Implement dispatch status badges',
          status: 'complete',
          description: 'Visual status indicators showing dispatch progress',
          startedAt: '2025-01-16T11:00:00Z',
          completedAt: '2025-01-16T12:30:00Z'
        },
        {
          id: 'step-wt-2.1-dashboard-integration',
          phaseId: 'phase-wt-2.1',
          name: 'Add handleDispatch to OrbisDashboard',
          status: 'complete',
          description: 'Implement dispatch state management in main dashboard',
          startedAt: '2025-01-16T12:30:00Z',
          completedAt: '2025-01-16T14:00:00Z'
        },
        {
          id: 'step-wt-2.1-tests',
          phaseId: 'phase-wt-2.1',
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
      id: 'phase-wt-2.2',
      projectId: 'proj-wt-2x-metaplatform',
      name: 'WT-2.2: Template Trigger Integration',
      description: 'Link dispatch buttons to specific templates with visual indicators',
      order: 3,
      steps: [
        {
          id: 'step-wt-2.2-template-fields',
          phaseId: 'phase-wt-2.2',
          name: 'Add templateName and templateId to Integration model',
          status: 'complete',
          description: 'Extend integration type with template association fields',
          startedAt: '2025-01-17T09:00:00Z',
          completedAt: '2025-01-17T09:45:00Z'
        },
        {
          id: 'step-wt-2.2-mock-templates',
          phaseId: 'phase-wt-2.2',
          name: 'Update mock integrations with template data',
          status: 'complete',
          description: 'Assign realistic template names and IDs to mock data',
          startedAt: '2025-01-17T09:45:00Z',
          completedAt: '2025-01-17T10:30:00Z'
        },
        {
          id: 'step-wt-2.2-dispatch-logic',
          phaseId: 'phase-wt-2.2',
          name: 'Modify handleDispatch to log template names',
          status: 'complete',
          description: 'Update dispatch logic to use template information',
          startedAt: '2025-01-17T10:30:00Z',
          completedAt: '2025-01-17T11:30:00Z'
        },
        {
          id: 'step-wt-2.2-template-labels',
          phaseId: 'phase-wt-2.2',
          name: 'Add template labels with view links to cards',
          status: 'complete',
          description: 'Visual template indicators on integration cards',
          startedAt: '2025-01-17T11:30:00Z',
          completedAt: '2025-01-17T13:00:00Z'
        },
        {
          id: 'step-wt-2.2-template-tests',
          phaseId: 'phase-wt-2.2',
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
      id: 'phase-wt-2.3',
      projectId: 'proj-wt-2x-metaplatform',
      name: 'WT-2.3: Real Template Execution',
      description: 'Replace simulation with real template execution system',
      order: 4,
      steps: [
        {
          id: 'step-wt-2.3-dispatcher-module',
          phaseId: 'phase-wt-2.3',
          name: 'Create templateDispatcher.ts module',
          status: 'complete',
          description: 'Build modular dispatcher system for different platforms',
          startedAt: '2025-01-18T09:00:00Z',
          completedAt: '2025-01-18T11:00:00Z'
        },
        {
          id: 'step-wt-2.3-platform-dispatchers',
          phaseId: 'phase-wt-2.3',
          name: 'Implement Claude, GitHub, and CI dispatchers',
          status: 'complete',
          description: 'Platform-specific execution handlers with error management',
          templateId: 'claude-health-001',
          executionId: 'exec_template_setup_001',
          startedAt: '2025-01-18T11:00:00Z',
          completedAt: '2025-01-18T14:00:00Z'
        },
        {
          id: 'step-wt-2.3-trigger-template',
          phaseId: 'phase-wt-2.3',
          name: 'Update handleDispatch to use triggerTemplate',
          status: 'complete',
          description: 'Replace simulated dispatch with real template execution',
          startedAt: '2025-01-18T14:00:00Z',
          completedAt: '2025-01-18T15:30:00Z'
        },
        {
          id: 'step-wt-2.3-execution-tracking',
          phaseId: 'phase-wt-2.3',
          name: 'Add execution tracking and error handling',
          status: 'complete',
          description: 'Comprehensive execution result tracking with detailed info',
          startedAt: '2025-01-18T15:30:00Z',
          completedAt: '2025-01-18T16:45:00Z'
        },
        {
          id: 'step-wt-2.3-real-dispatch-tests',
          phaseId: 'phase-wt-2.3',
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
      id: 'phase-wt-2.4',
      projectId: 'proj-wt-2x-metaplatform',
      name: 'WT-2.4: API-Based Workflow Execution',
      description: 'Extend to API-driven workflows with POST requests and execution tracking',
      order: 5,
      steps: [
        {
          id: 'step-wt-2.4-post-helper',
          phaseId: 'phase-wt-2.4',
          name: 'Create dispatchViaPost helper function',
          status: 'complete',
          description: 'Reusable POST request handler for template execution',
          startedAt: '2025-01-19T09:00:00Z',
          completedAt: '2025-01-19T10:30:00Z'
        },
        {
          id: 'step-wt-2.4-claude-api',
          phaseId: 'phase-wt-2.4',
          name: 'Update dispatchClaude to use real POST requests',
          status: 'complete',
          description: 'Connect Claude dispatcher to https://claude.api.wombattrack.io/trigger',
          templateId: 'claude-health-001',
          executionId: 'exec_api_claude_001',
          startedAt: '2025-01-19T10:30:00Z',
          completedAt: '2025-01-19T12:00:00Z'
        },
        {
          id: 'step-wt-2.4-all-dispatchers',
          phaseId: 'phase-wt-2.4',
          name: 'Refactor all dispatchers to use dispatchViaPost',
          status: 'complete',
          description: 'Standardize GitHub Actions and CI/CD dispatchers',
          startedAt: '2025-01-19T12:00:00Z',
          completedAt: '2025-01-19T14:00:00Z'
        },
        {
          id: 'step-wt-2.4-execution-info',
          phaseId: 'phase-wt-2.4',
          name: 'Extend return value with detailed execution info',
          status: 'complete',
          description: 'Enhanced execution results with timing and platform data',
          startedAt: '2025-01-19T14:00:00Z',
          completedAt: '2025-01-19T15:30:00Z'
        },
        {
          id: 'step-wt-2.4-api-tests',
          phaseId: 'phase-wt-2.4',
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
      id: 'phase-wt-2.5',
      projectId: 'proj-wt-2x-metaplatform',
      name: 'WT-2.5: Persist Execution Logs',
      description: 'Create TemplateExecution history with API persistence and UI display',
      order: 6,
      steps: [
        {
          id: 'step-wt-2.5-execution-types',
          phaseId: 'phase-wt-2.5',
          name: 'Create TemplateExecution type interface',
          status: 'complete',
          description: 'Define comprehensive execution tracking data structure',
          startedAt: '2025-01-20T09:00:00Z',
          completedAt: '2025-01-20T09:30:00Z'
        },
        {
          id: 'step-wt-2.5-execution-api',
          phaseId: 'phase-wt-2.5',
          name: 'Create executionLogAPI.ts with mock persistence',
          status: 'complete',
          description: 'API layer for execution log CRUD operations',
          startedAt: '2025-01-20T09:30:00Z',
          completedAt: '2025-01-20T11:00:00Z'
        },
        {
          id: 'step-wt-2.5-dispatcher-logging',
          phaseId: 'phase-wt-2.5',
          name: 'Update templateDispatcher with execution logging',
          status: 'complete',
          description: 'Integrate API calls throughout execution lifecycle',
          templateId: 'claude-health-001',
          executionId: 'exec_logging_001',
          startedAt: '2025-01-20T11:00:00Z',
          completedAt: '2025-01-20T13:00:00Z'
        },
        {
          id: 'step-wt-2.5-history-ui',
          phaseId: 'phase-wt-2.5',
          name: 'Add Execution History UI section',
          status: 'complete',
          description: 'Collapsible history display with real-time polling',
          startedAt: '2025-01-20T13:00:00Z',
          completedAt: '2025-01-20T15:30:00Z'
        },
        {
          id: 'step-wt-2.5-history-tests',
          phaseId: 'phase-wt-2.5',
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
      id: 'phase-wt-2.6',
      projectId: 'proj-wt-2x-metaplatform',
      name: 'WT-2.6: Phase Tracker UI',
      description: 'Interactive Project → Phase → PhaseStep hierarchy with execution integration',
      order: 7,
      steps: [
        {
          id: 'step-wt-2.6-phase-types',
          phaseId: 'phase-wt-2.6',
          name: 'Create Project, Phase, PhaseStep types',
          status: 'complete',
          description: 'Define hierarchical project management data structures',
          startedAt: '2025-01-21T09:00:00Z',
          completedAt: '2025-01-21T09:45:00Z'
        },
        {
          id: 'step-wt-2.6-mock-projects',
          phaseId: 'phase-wt-2.6',
          name: 'Create realistic mock project data',
          status: 'complete',
          description: 'Multi-project structure with phases and execution-linked steps',
          startedAt: '2025-01-21T09:45:00Z',
          completedAt: '2025-01-21T10:30:00Z'
        },
        {
          id: 'step-wt-2.6-phase-tracker',
          phaseId: 'phase-wt-2.6',
          name: 'Build PhaseTracker component',
          status: 'complete',
          description: 'Hierarchical UI with expand/collapse and status management',
          startedAt: '2025-01-21T10:30:00Z',
          completedAt: '2025-01-21T13:30:00Z'
        },
        {
          id: 'step-wt-2.6-step-controls',
          phaseId: 'phase-wt-2.6',
          name: 'Add step controls (Start, Complete, View Log)',
          status: 'complete',
          description: 'Interactive buttons with template trigger integration',
          templateId: 'claude-health-001',
          executionId: 'exec_step_control_001',
          startedAt: '2025-01-21T13:30:00Z',
          completedAt: '2025-01-21T15:00:00Z'
        },
        {
          id: 'step-wt-2.6-execution-sync',
          phaseId: 'phase-wt-2.6',
          name: 'Auto-update steps with execution status',
          status: 'complete',
          description: 'Real-time polling integration with execution logs',
          startedAt: '2025-01-21T15:00:00Z',
          completedAt: '2025-01-21T16:00:00Z'
        },
        {
          id: 'step-wt-2.6-dashboard-integration',
          phaseId: 'phase-wt-2.6',
          name: 'Integrate PhaseTracker into OrbisDashboard',
          status: 'complete',
          description: 'Add collapsible Phase Tracker section with toggle',
          startedAt: '2025-01-21T16:00:00Z',
          completedAt: '2025-01-21T16:30:00Z'
        },
        {
          id: 'step-wt-2.6-phase-tests',
          phaseId: 'phase-wt-2.6',
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
      id: 'phase-wt-2.7',
      projectId: 'proj-wt-2x-metaplatform',
      name: 'WT-2.7: Phase Tracker Admin System',
      description: 'Complete CRUD management for Projects, Phases, and PhaseSteps',
      order: 8,
      steps: [
        {
          id: 'step-wt-2.7-admin-modal',
          phaseId: 'phase-wt-2.7',
          name: 'Create PhaseAdminModal component',
          status: 'complete',
          description: 'Modal interface with tabbed navigation for CRUD operations',
          startedAt: '2025-01-21T18:00:00Z',
          completedAt: '2025-01-21T20:00:00Z'
        },
        {
          id: 'step-wt-2.7-projects-crud',
          phaseId: 'phase-wt-2.7',
          name: 'Build Projects CRUD tab',
          status: 'complete',
          description: 'Full project lifecycle management with archive functionality',
          startedAt: '2025-01-21T20:00:00Z',
          completedAt: '2025-01-21T21:30:00Z'
        },
        {
          id: 'step-wt-2.7-phases-crud',
          phaseId: 'phase-wt-2.7',
          name: 'Build Phases CRUD tab',
          status: 'complete',
          description: 'Phase management with reordering and step preview',
          startedAt: '2025-01-21T21:30:00Z',
          completedAt: '2025-01-21T22:30:00Z'
        },
        {
          id: 'step-wt-2.7-steps-crud',
          phaseId: 'phase-wt-2.7',
          name: 'Build PhaseSteps CRUD tab',
          status: 'complete',
          description: 'Step management with template/execution ID assignment',
          startedAt: '2025-01-21T22:30:00Z',
          completedAt: '2025-01-21T23:30:00Z'
        },
        {
          id: 'step-wt-2.7-reordering',
          phaseId: 'phase-wt-2.7',
          name: 'Implement reordering functionality',
          status: 'complete',
          description: 'Up/down controls for phases and steps with visual feedback',
          startedAt: '2025-01-21T23:30:00Z',
          completedAt: '2025-01-22T00:15:00Z'
        },
        {
          id: 'step-wt-2.7-import-export',
          phaseId: 'phase-wt-2.7',
          name: 'Add import/export JSON functionality',
          status: 'complete',
          description: 'Data portability with file download/upload capabilities',
          startedAt: '2025-01-22T00:15:00Z',
          completedAt: '2025-01-22T00:45:00Z'
        },
        {
          id: 'step-wt-2.7-admin-tests',
          phaseId: 'phase-wt-2.7',
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
 * Seeds the Phase Tracker with the complete WT-2.x project history
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

  console.info('[WT] Seeding Phase Tracker with WT-2.x project history...');

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