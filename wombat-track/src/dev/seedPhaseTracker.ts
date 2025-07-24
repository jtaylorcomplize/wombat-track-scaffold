import React from 'react';
import type { Project } from '../types/phase';

// Global flag to ensure seeding runs only once per session
declare global {
  interface Window {
    __hasSeededPhaseTracker?: boolean;
  }
}

// Utility function for generating IDs (currently unused but available for future seeding)
// const generateId = () => {
//   return crypto.randomUUID ? crypto.randomUUID() : `seed_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
// };

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
- **WT-2.9**: PhasePlan Dashboard upgrade with execution-aware tracking

## 🎯 WT-2.9: PhasePlan Dashboard Transformation

**WT-2.9** represents a significant upgrade to the Phase Plan functionality, transforming it from a simple markdown editor into a comprehensive governance dashboard that seamlessly combines strategic project planning with tactical SDLC execution tracking.

### 🏗️ Key Components Implemented

#### 1. **PhasePlanDashboard.tsx** - Strategic + Tactical View
- **Markdown Rendering**: Rich project plan display with full HTML formatting
- **Phase Timeline**: Collapsible phase hierarchy with execution-aware step tracking
- **Real-time Polling**: 2-second intervals polling \`fetchExecutionLogs()\` for live status updates
- **Status Visualization**: ○ ⏳ ✅ ❌ badges reflecting current execution states
- **Action Controls**: Context-sensitive Start/View Logs buttons for step management

#### 2. **Enhanced Phase Type System**
- **Phase.summary**: Optional markdown field for rich phase documentation
- **Execution Integration**: Steps linked to real execution IDs and template systems
- **Status Synchronization**: Real-time updates from execution API layer

#### 3. **Advanced UX Controls**
- **Search & Filter**: Find steps by name or description
- **Show/Hide Completed**: Toggle visibility of finished steps
- **Expand/Collapse All**: Bulk phase navigation controls
- **Project Statistics**: Footer showing completion progress and metrics

### 🔗 Technical Implementation

#### Component Architecture
- **src/components/project/PhasePlanDashboard.tsx**: Main dashboard component
- **src/components/phase/PhaseAdminModal.tsx**: Integration point (📑 tab)
- **src/types/phase.ts**: Extended with \`summary?\` field
- **src/api/executionLogAPI.ts**: Real-time execution status source

#### File Changes Summary
- **NEW**: \`PhasePlanDashboard.tsx\` (350+ lines) - Complete governance interface
- **UPDATED**: \`PhaseAdminModal.tsx\` - Replaced PhasePlanEditor with new dashboard
- **UPDATED**: \`phase.ts\` - Added optional \`summary\` field to Phase interface
- **UPDATED**: \`meta_platform_dashboard.spec.js\` - 12 new test cases for dashboard

#### Status Integration Flow
1. **Dashboard Mount**: Initialize expanded phases, load project data
2. **Polling Cycle**: Every 2000ms, fetch execution logs for steps with \`executionId\`
3. **Status Sync**: Update local state with latest execution progress
4. **UI Refresh**: Re-render status badges and action buttons
5. **Action Triggers**: Start button → creates execution, View Logs → opens execution details

### 🧪 Test Coverage

#### New Test Suite: "Phase Plan Dashboard Tests (WT-2.9)"
- **Dashboard Rendering**: Project selector, empty states, controls
- **Phase Timeline**: Collapsible phases, step hierarchy display  
- **Execution Integration**: Status icons, action buttons, footer stats
- **User Interactions**: Search filtering, completed step toggle
- **Markdown Display**: Project plan rendering verification

### 🎨 UX/UI Improvements

#### Visual Hierarchy
- **Project Level**: Markdown overview with rich formatting
- **Phase Level**: Collapsible sections with step counts and descriptions  
- **Step Level**: Status badges, descriptions, timestamps, and action controls
- **Footer**: Project statistics with completion percentages

#### Responsive Design
- **Consistent Styling**: Follows WombatConsole inline CSS patterns
- **Color Coding**: Status-based color themes (gray/yellow/green/red)
- **Interactive Elements**: Hover states, active indicators, disabled states
- **Loading States**: Polling indicators and execution feedback

### 🔄 Integration Points

#### With Existing Systems
- **PhaseAdminModal**: Seamless replacement in 📑 Phase Plan tab
- **ExecutionLogAPI**: Real-time status polling and log retrieval
- **TemplateDispatcher**: Action buttons trigger template execution
- **ProjectSwitcher**: Multi-project context switching support

#### Future Extension Points
- **Edit Mode**: Toggle between dashboard view and markdown editor
- **Bulk Operations**: Multi-step selection and batch execution
- **Advanced Filters**: Status-based filtering, date ranges, template types
- **Export Features**: Dashboard data export and sharing capabilities

### 📊 Metrics & Analytics

#### Performance Characteristics
- **Polling Efficiency**: Batched API calls, error handling, cleanup on unmount
- **Render Optimization**: Conditional rendering, minimal re-renders
- **Memory Management**: Proper cleanup of intervals and event listeners

#### Usage Analytics Ready
- **Action Tracking**: Step starts, log views, search usage
- **Performance Monitoring**: Load times, polling success rates
- **User Behavior**: Phase expansion patterns, filter usage

## 🧠 Development Philosophy

Wombat Track enables AI-augmented execution and governance with full traceability. Every feature is committed, tested, tracked in Phase history, and linked to real execution.

We use Markdown to author human-readable documentation. We use Puppeteer to automate verification. We use Claude to scaffold code based on these plans.

## 🧩 Governance Structure

- Projects are tracked via seeded structures
- Templates are linked by ID and trigger dispatches
- Execution logs persist via API
- Statuses reflect real outcomes, not assumptions

## 🚀 WT-3.x: Platform Evolution & Governance

**WT-3.x** represents the next evolution of Wombat Track, focusing on platform maturity, testing infrastructure, and governance automation.

### 🧪 WT-3.1: Advanced Testing Infrastructure
- Puppeteer-based comprehensive test suite
- GitHub Actions integration with artifact storage
- Coverage thresholds and failure visibility
- RAG-style test result dashboard

### 🔄 WT-3.2: CI/CD Pipeline Migration
- Complete CI/CD automation with GitHub Actions
- Automated deployment with health-check rollback
- Governance logging for all deployments
- Build outcome visibility and developer feedback

### 🛡️ WT-3.3: MetaValidator System
- Automated governance and structure validation
- Detection of missing metadata and anti-patterns
- CI/CD integration with configurable strictness
- Intelligent fix suggestions and task generation

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
      phaseType: 'Governance',
      phaseOwner: 'jackson',
      ragStatus: 'green',
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
          stepInstruction: 'Investigate test runner configuration and fix timeout issues in Puppeteer setup',
          isSideQuest: true,
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
      phaseType: 'Development',
      phaseOwner: 'jackson',
      ragStatus: 'green',
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
      phaseType: 'PlatformOps',
      phaseOwner: 'sarah',
      ragStatus: 'green',
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
      phaseType: 'Infrastructure',
      phaseOwner: 'mike',
      ragStatus: 'amber',
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
          stepInstruction: 'Create test suite covering all execution lifecycle stages and UI updates',
          isSideQuest: true,
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
      phaseType: 'Console',
      phaseOwner: 'jackson',
      ragStatus: 'green',
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
    },
    {
      id: 'phase-wt-2.8',
      projectId: 'proj-wt-2x-metaplatform',
      name: 'WT-2.8: Phase Plan & Project Switcher',
      description: 'Enhanced Phase Plan seeding and Project Switcher UX improvements',
      order: 9,
      summary: `WT-2.8 enhanced the Phase Plan functionality with comprehensive seeding systems and improved Project Switcher UX. This phase established the foundation for strategic project documentation within the execution tracking framework.`,
      steps: [
        {
          id: 'step-wt-2.8-phase-seeding',
          phaseId: 'phase-wt-2.8',
          name: 'Implement Phase Plan seeding system',
          status: 'complete',
          description: 'Created dev-mode seeder for comprehensive WT-2.x project history',
          templateId: 'dev-seeder-001',
          executionId: 'exec_seeder_001',
          startedAt: '2025-07-20T09:00:00Z',
          completedAt: '2025-07-20T11:00:00Z'
        },
        {
          id: 'step-wt-2.8-project-switcher',
          phaseId: 'phase-wt-2.8',
          name: 'Enhance Project Switcher UX',
          status: 'complete',
          description: 'Improved project filtering and context switching in Phase Tracker',
          startedAt: '2025-07-20T11:00:00Z',
          completedAt: '2025-07-20T13:30:00Z'
        },
        {
          id: 'step-wt-2.8-phase-plan-editor',
          phaseId: 'phase-wt-2.8',
          name: 'Refine Phase Plan Editor functionality',
          status: 'complete',
          description: 'Enhanced markdown editing with toolbar and auto-save features',
          startedAt: '2025-07-20T13:30:00Z',
          completedAt: '2025-07-20T15:00:00Z'
        }
      ]
    },
    {
      id: 'phase-wt-2.9',
      projectId: 'proj-wt-2x-metaplatform',
      name: 'WT-2.9: PhasePlan Dashboard Upgrade',
      description: 'Transform Phase Plan tab into comprehensive governance dashboard with execution tracking',
      order: 10,
      summary: `**WT-2.9** upgraded the Phase Plan tab into a true governance dashboard that combines strategic project planning with tactical SDLC execution tracking. 

### Key Enhancements
- **Strategic View**: Rendered markdown project plans with rich formatting
- **Tactical Integration**: Real-time execution status polling every 2 seconds  
- **Enhanced UX**: Search, filter, collapse/expand controls for better navigation
- **Status Visualization**: ○ ⏳ ✅ ❌ badges showing step execution states
- **Action Controls**: Start/View Logs buttons integrated with execution system
- **Progress Tracking**: Project statistics footer with completion metrics

This transformation makes the Phase Plan tab the central governance hub where teams review strategic direction while monitoring tactical implementation progress.`,
      steps: [
        {
          id: 'step-wt-2.9-phase-summary',
          phaseId: 'phase-wt-2.9',
          name: 'Add optional summary field to Phase type',
          status: 'complete',
          description: 'Extended Phase interface with markdown summary documentation field',
          startedAt: '2025-07-21T09:00:00Z',
          completedAt: '2025-07-21T09:15:00Z'
        },
        {
          id: 'step-wt-2.9-dashboard-component',
          phaseId: 'phase-wt-2.9',
          name: 'Create PhasePlanDashboard component',
          status: 'complete',
          description: 'Built comprehensive dashboard replacing PhasePlanEditor with execution-aware interface',
          templateId: 'react-component-001',
          executionId: 'exec_dashboard_001',
          startedAt: '2025-07-21T09:15:00Z',
          completedAt: '2025-07-21T11:30:00Z'
        },
        {
          id: 'step-wt-2.9-execution-polling',
          phaseId: 'phase-wt-2.9',
          name: 'Implement real-time execution status polling',
          status: 'complete',
          description: 'Added 2-second polling system for live execution status updates using fetchExecutionLogs',
          startedAt: '2025-07-21T11:30:00Z',
          completedAt: '2025-07-21T12:00:00Z'
        },
        {
          id: 'step-wt-2.9-ui-enhancements',
          phaseId: 'phase-wt-2.9',
          name: 'Add UI controls for search, filter, and navigation',
          status: 'complete',
          description: 'Implemented search steps, show/hide completed toggle, and expand/collapse all functionality',
          startedAt: '2025-07-21T12:00:00Z',
          completedAt: '2025-07-21T13:00:00Z'
        },
        {
          id: 'step-wt-2.9-status-badges',
          phaseId: 'phase-wt-2.9',
          name: 'Implement execution status badge system',
          status: 'complete',
          description: 'Visual status indicators: ○ (not_started), ⏳ (in_progress), ✅ (complete), ❌ (error)',
          startedAt: '2025-07-21T13:00:00Z',
          completedAt: '2025-07-21T13:30:00Z'
        },
        {
          id: 'step-wt-2.9-action-buttons',
          phaseId: 'phase-wt-2.9',
          name: 'Add step action controls',
          status: 'complete',
          description: 'Start execution and View Logs buttons with context-sensitive display logic',
          startedAt: '2025-07-21T13:30:00Z',
          completedAt: '2025-07-21T14:00:00Z'
        },
        {
          id: 'step-wt-2.9-integration',
          phaseId: 'phase-wt-2.9',
          name: 'Integrate dashboard into PhaseAdminModal',
          status: 'complete',
          description: 'Replaced PhasePlanEditor with PhasePlanDashboard in Phase Plan tab',
          startedAt: '2025-07-21T14:00:00Z',
          completedAt: '2025-07-21T14:30:00Z'
        },
        {
          id: 'step-wt-2.9-test-coverage',
          phaseId: 'phase-wt-2.9',
          name: 'Add comprehensive test coverage',
          status: 'complete',
          description: 'Created 12 new test cases covering dashboard rendering, interactions, and execution sync',
          templateId: 'test-dashboard-001',
          executionId: 'exec_test_coverage_001',
          startedAt: '2025-07-21T14:30:00Z',
          completedAt: '2025-07-21T15:30:00Z'
        },
        {
          id: 'step-wt-2.9-finalization',
          phaseId: 'phase-wt-2.9',
          name: 'Finalize phase plan and sync execution data',
          status: 'complete',
          description: 'Update project phasePlan with WT-2.9 summary and ensure all execution links are synced',
          templateId: 'phase-finalization-001',
          executionId: 'exec_finalization_001',
          startedAt: '2025-07-21T16:00:00Z',
          completedAt: '2025-07-21T17:00:00Z'
        }
      ]
    },
    {
      id: 'phase-wt-3.1',
      projectId: 'proj-wt-2x-metaplatform',
      name: 'WT-3.1: Advanced Testing Infrastructure',
      description: 'Implement a reliable, CI-integrated testing framework for Wombat Track using Puppeteer and GitHub Actions',
      order: 11,
      phaseType: 'PlatformOps',
      phaseOwner: 'jackson',
      ragStatus: 'amber',
      summary: `**WT-3.1** establishes a comprehensive testing infrastructure with Puppeteer and GitHub Actions integration.

### Objectives
- Route-level UI tests for major features
- Test automation in CI pipeline  
- Visual and log-based failure diagnosis
- Defined minimum coverage standards

### Key Deliverables
- Puppeteer-based test suite for core features
- GitHub Action test runner with artifact storage
- Coverage thresholds and failure logging
- Test results visibility in UI dashboard`,
      steps: [
        {
          id: 'step-wt-3.1-1',
          phaseId: 'phase-wt-3.1',
          name: 'Implement Puppeteer-based test suite',
          status: 'in_progress',
          description: 'Add core test files for Phase Tracker, Dispatcher, and Plan Dashboard',
          stepInstruction: 'Add core test files for: Phase Tracker, Dispatcher, Plan Dashboard. Ensure cross-route testability.',
          isSideQuest: false,
          startedAt: '2025-07-22T09:00:00Z'
        },
        {
          id: 'step-wt-3.1-2',
          phaseId: 'phase-wt-3.1',
          name: 'Integrate GitHub Action test runner',
          status: 'not_started',
          description: 'Create reusable test job with CI pipeline integration',
          stepInstruction: 'Create reusable test job (`puppeteer.yml`). Configure test step in CI pipeline. Store logs as GitHub artifacts.',
          isSideQuest: false
        },
        {
          id: 'step-wt-3.1-3',
          phaseId: 'phase-wt-3.1',
          name: 'Standardise coverage thresholds',
          status: 'not_started',
          description: 'Define coverage percentage thresholds by route',
          stepInstruction: 'Define % thresholds by route. Fail build if thresholds not met. Log skipped tests and flakiness.',
          isSideQuest: false
        },
        {
          id: 'step-wt-3.1-4',
          phaseId: 'phase-wt-3.1',
          name: 'Add failure logging + visibility',
          status: 'not_started',
          description: 'Push failed tests to GovernanceLog with UI dashboard integration',
          stepInstruction: 'Push failed tests to GovernanceLog. Enable test results in UI dashboard (RAG-style).',
          isSideQuest: false
        }
      ]
    },
    {
      id: 'phase-wt-3.2',
      projectId: 'proj-wt-2x-metaplatform',
      name: 'WT-3.2: CI/CD Pipeline Migration',
      description: 'Establish a robust CI/CD system for code validation, deployment, and rollback across Wombat Track',
      order: 12,
      phaseType: 'PlatformOps',
      phaseOwner: 'jackson',
      ragStatus: 'green',
      summary: `**WT-3.2** creates a comprehensive CI/CD pipeline with full governance and log integration.

### Objectives
- CI config with lint/test/deploy checks
- Rollback and deploy hooks
- Audit logs linked to deploys
- Developer feedback on build outcomes

### Implementation
- GitHub Actions workflows for CI/CD
- Automated deployment on main branch
- Health check based rollback system
- Governance logging for all deployments`,
      steps: [
        {
          id: 'step-wt-3.2-1',
          phaseId: 'phase-wt-3.2',
          name: 'Create CI Pipeline',
          status: 'complete',
          description: 'Implement CI workflow with comprehensive checks',
          stepInstruction: 'Use `ci.yml` + `reusable-deploy.yml` templates. Include linting, type checking, build, and test.',
          isSideQuest: false,
          startedAt: '2025-07-15T09:00:00Z',
          completedAt: '2025-07-15T12:00:00Z'
        },
        {
          id: 'step-wt-3.2-2',
          phaseId: 'phase-wt-3.2',
          name: 'Configure Deploy & Rollback',
          status: 'complete',
          description: 'Set up automated deployment with rollback capabilities',
          stepInstruction: 'Trigger deploy on merge to `main`. Rollback if health checks fail. Document logic in GovernanceLog.',
          isSideQuest: false,
          startedAt: '2025-07-15T13:00:00Z',
          completedAt: '2025-07-15T16:00:00Z'
        },
        {
          id: 'step-wt-3.2-3',
          phaseId: 'phase-wt-3.2',
          name: 'Add structured governance hooks',
          status: 'complete',
          description: 'Implement automated governance logging for deployments',
          stepInstruction: 'Auto-log deploys in `governance.jsonl`. Attach Phase ID and outcome summary.',
          isSideQuest: false,
          startedAt: '2025-07-16T09:00:00Z',
          completedAt: '2025-07-16T11:00:00Z'
        },
        {
          id: 'step-wt-3.2-4',
          phaseId: 'phase-wt-3.2',
          name: 'Integrate RAG signals in dashboard',
          status: 'complete',
          description: 'Add deployment health indicators to dashboard',
          stepInstruction: 'Post-deploy, show health as Red/Amber/Green. Include coverage and outcome stats.',
          isSideQuest: false,
          startedAt: '2025-07-16T13:00:00Z',
          completedAt: '2025-07-16T15:00:00Z'
        }
      ]
    },
    {
      id: 'phase-wt-3.3',
      projectId: 'proj-wt-2x-metaplatform',
      name: 'WT-3.3: MetaValidator System',
      description: 'Create a governance-aware code and phase validator that enforces structural integrity',
      order: 13,
      phaseType: 'Governance',
      phaseOwner: 'jackson',
      ragStatus: 'blue',
      summary: `**WT-3.3** introduces the MetaValidator system for automated governance and structure validation.

### Objectives
- Validator CLI or GitHub CI integration
- Detection of missing phase metadata, broken structures
- RAG classification for governance readiness
- Optional: create tasks on validation failure

### Components
- WTMetaValidator.ts core engine
- Governance rules and validations
- CI/CD hook integration
- Failure logging and fix suggestions`,
      steps: [
        {
          id: 'step-wt-3.3-1',
          phaseId: 'phase-wt-3.3',
          name: 'Build Validator Engine',
          status: 'not_started',
          description: 'Create core validation engine for project structures',
          stepInstruction: 'Create `WTMetaValidator.ts`. Scan project folders, markdown, and phase structure.',
          isSideQuest: false
        },
        {
          id: 'step-wt-3.3-2',
          phaseId: 'phase-wt-3.3',
          name: 'Add Governance Rules',
          status: 'not_started',
          description: 'Implement validation rules for governance compliance',
          stepInstruction: 'Rules: markdown required, step count > 1, RAG tag present. Missing items trigger warnings or task suggestions.',
          isSideQuest: false
        },
        {
          id: 'step-wt-3.3-3',
          phaseId: 'phase-wt-3.3',
          name: 'CI/CD Hook or Git Hook Integration',
          status: 'not_started',
          description: 'Integrate validator with CI/CD pipeline',
          stepInstruction: 'Option 1: Run on commit via pre-push hook. Option 2: GitHub Action blocking build. Configurable strictness.',
          isSideQuest: false
        },
        {
          id: 'step-wt-3.3-4',
          phaseId: 'phase-wt-3.3',
          name: 'Log Failures + Suggest Fixes',
          status: 'not_started',
          description: 'Implement failure logging and fix suggestions',
          stepInstruction: 'Post to ExecutionLog with reason. Suggest backlog task generation. Include Claude prompt scaffold (if enabled).',
          isSideQuest: false
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
export function seedPhaseTracker(setProjects: React.Dispatch<React.SetStateAction<Project[]>>): boolean {
  // Only run in development mode
  if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'development') {
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
    setProjects((prevProjects: Project[]) => {
      // Check if seed project already exists
      const seedExists = prevProjects.some((p: Project) => p.id === seedProject.id);
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
export function forceSeedPhaseTracker(setProjects: React.Dispatch<React.SetStateAction<Project[]>>): boolean {
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