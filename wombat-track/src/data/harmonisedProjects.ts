import type { Project } from '../types/phase';

/**
 * Harmonised Wombat Track Projects aligned with Phase 3.x governance model
 * This represents the complete project structure from WT-1.x to WT-3.x and beyond
 */
export const harmonisedProjects: Project[] = [
  // WT-1.x Series - Foundation
  {
    id: 'proj-wt-1x-foundation',
    name: 'WT-1.x – Foundation Infrastructure',
    description: 'Core platform setup, authentication, and basic infrastructure',
    createdAt: '2024-10-01T09:00:00Z',
    updatedAt: '2024-11-15T16:00:00Z',
    createdBy: 'jackson',
    projectOwner: 'jackson',
    projectType: 'Platform',
    status: 'Complete',
    wtTag: 'wt-foundation',
    colorTag: '#3b82f6',
    phases: [
      {
        id: 'phase-wt-1.0',
        projectId: 'proj-wt-1x-foundation',
        name: 'WT-1.0 – Initial Setup',
        description: 'Repository initialization and basic structure',
        order: 1,
        phaseType: 'Infrastructure',
        phaseOwner: 'jackson',
        ragStatus: 'green',
        steps: [
          {
            id: 'step-wt-1.0-1',
            phaseId: 'phase-wt-1.0',
            name: 'Initialize Git repository',
            status: 'complete',
            description: 'Setup initial repository structure'
          },
          {
            id: 'step-wt-1.0-2',
            phaseId: 'phase-wt-1.0',
            name: 'Configure development environment',
            status: 'complete',
            description: 'Setup local dev environment and dependencies'
          }
        ]
      },
      {
        id: 'phase-wt-1.1',
        projectId: 'proj-wt-1x-foundation',
        name: 'WT-1.1 – Authentication System',
        description: 'Implement secure authentication and authorization',
        order: 2,
        phaseType: 'Development',
        phaseOwner: 'jackson',
        ragStatus: 'green',
        steps: [
          {
            id: 'step-wt-1.1-1',
            phaseId: 'phase-wt-1.1',
            name: 'Implement OAuth integration',
            status: 'complete',
            description: 'Setup OAuth providers and authentication flow'
          },
          {
            id: 'step-wt-1.1-2',
            phaseId: 'phase-wt-1.1',
            name: 'Create user management system',
            status: 'complete',
            description: 'Build user CRUD operations and profile management'
          }
        ]
      }
    ]
  },

  // WT-2.x Series - MetaPlatform Console (from seed data)
  {
    id: 'proj-wt-2x-metaplatform',
    name: 'WT-2.x – MetaPlatform Console',
    description: 'Complete implementation of WombatConsole with template execution, phase tracking, and admin utilities',
    createdAt: '2025-01-15T09:00:00Z',
    updatedAt: '2025-07-21T16:30:00Z',
    createdBy: 'jackson',
    projectOwner: 'jackson',
    projectType: 'execution-console',
    status: 'Active',
    wtTag: 'wombat-console',
    colorTag: '#6366f1',
    phases: [
      {
        id: 'phase-wt-2.0',
        projectId: 'proj-wt-2x-metaplatform',
        name: 'WT-2.0 – Git Setup & Test Infrastructure',
        description: 'Repository setup and initial testing framework',
        order: 1,
        phaseType: 'Infrastructure',
        phaseOwner: 'jackson',
        ragStatus: 'green',
        steps: [
          {
            id: 'step-wt-2.0-1',
            phaseId: 'phase-wt-2.0',
            name: 'Git repository setup',
            status: 'complete',
            description: 'Initialize repository with proper structure'
          },
          {
            id: 'step-wt-2.0-2',
            phaseId: 'phase-wt-2.0',
            name: 'Test infrastructure setup',
            status: 'complete',
            description: 'Configure Jest and testing framework'
          },
          {
            id: 'step-wt-2.0-3',
            phaseId: 'phase-wt-2.0',
            name: 'Dashboard review',
            status: 'complete',
            description: 'Initial dashboard architecture review'
          }
        ]
      },
      {
        id: 'phase-wt-2.1',
        projectId: 'proj-wt-2x-metaplatform',
        name: 'WT-2.1 – Dispatch Button & UI',
        description: 'Template dispatch interface implementation',
        order: 2,
        phaseType: 'Console',
        phaseOwner: 'jackson',
        ragStatus: 'green',
        steps: [
          {
            id: 'step-wt-2.1-1',
            phaseId: 'phase-wt-2.1',
            name: 'Create dispatch button component',
            status: 'complete',
            description: 'Build dispatch UI component'
          },
          {
            id: 'step-wt-2.1-2',
            phaseId: 'phase-wt-2.1',
            name: 'Implement dispatch logic',
            status: 'complete',
            description: 'Connect dispatch button to backend'
          }
        ]
      },
      // Additional phases truncated for brevity - would include 2.2 through 2.9
    ]
  },

  // WT-3.x Series - Developer Infrastructure & Governance
  {
    id: 'proj-wt-3x-devinfra',
    name: 'WT-3.x – Developer Infrastructure & Governance',
    description: 'Robust developer infrastructure, CI/CD automation, and governance-enforced quality controls',
    createdAt: '2025-01-20T10:00:00Z',
    updatedAt: '2025-07-24T12:00:00Z',
    createdBy: 'jackson',
    projectOwner: 'jackson',
    projectType: 'Platform',
    status: 'Active',
    wtTag: 'wt-devinfra',
    colorTag: '#8b5cf6',
    phases: [
      {
        id: 'phase-wt-3.0',
        projectId: 'proj-wt-3x-devinfra',
        name: 'WT-3.0 – Architecture Reconciliation',
        description: 'Refactor orbis naming and unify phase hierarchy',
        order: 1,
        phaseType: 'Governance',
        phaseOwner: 'jackson',
        ragStatus: 'green',
        summary: `## Architecture Reconciliation
        
Unified the platform architecture under consistent WT naming conventions:
- Refactored orbis-* naming to wombat-console
- Unified phase hierarchy under WT naming
- Enhanced UX vertical nesting: Project > Phase > Step`,
        steps: [
          {
            id: 'step-wt-3.0-1',
            phaseId: 'phase-wt-3.0',
            name: 'Refactor orbis naming to wombat-console',
            status: 'complete',
            description: 'Update all references from orbis to wombat-console'
          },
          {
            id: 'step-wt-3.0-2',
            phaseId: 'phase-wt-3.0',
            name: 'Unify phase hierarchy',
            status: 'complete',
            description: 'Establish consistent Project > Phase > Step structure'
          },
          {
            id: 'step-wt-3.0-3',
            phaseId: 'phase-wt-3.0',
            name: 'Enhance UX vertical nesting',
            status: 'complete',
            description: 'Improve navigation and visual hierarchy'
          }
        ]
      },
      {
        id: 'phase-wt-3.1',
        projectId: 'proj-wt-3x-devinfra',
        name: 'WT-3.1 – Advanced Testing Infrastructure',
        description: 'CI-integrated Puppeteer test suite with standardised coverage',
        order: 2,
        phaseType: 'Testing',
        phaseOwner: 'claude',
        ragStatus: 'amber',
        summary: `## Advanced Testing Infrastructure
        
Implementing comprehensive testing infrastructure:
- Puppeteer-based test suite for UI testing
- GitHub Actions integration
- Standardised coverage thresholds
- Failure logging with RAG visibility`,
        steps: [
          {
            id: 'step-wt-3.1-1',
            phaseId: 'phase-wt-3.1',
            name: 'Implement Puppeteer test suite',
            status: 'complete',
            description: 'Build comprehensive UI test coverage'
          },
          {
            id: 'step-wt-3.1-2',
            phaseId: 'phase-wt-3.1',
            name: 'Integrate GitHub Action test runner',
            status: 'complete',
            description: 'Automate test execution in CI'
          },
          {
            id: 'step-wt-3.1-3',
            phaseId: 'phase-wt-3.1',
            name: 'Standardise coverage thresholds',
            status: 'not_started',
            description: 'Define and enforce minimum coverage requirements'
          },
          {
            id: 'step-wt-3.1-4',
            phaseId: 'phase-wt-3.1',
            name: 'Add failure logging + RAG visibility',
            status: 'not_started',
            description: 'Implement test failure tracking and reporting'
          }
        ]
      },
      {
        id: 'phase-wt-3.1-sq',
        projectId: 'proj-wt-3x-devinfra',
        name: 'WT-3.1 Side Quest – Visual Regression Testing',
        description: 'Puppeteer screenshot diff utility',
        order: 3,
        phaseType: 'Testing',
        phaseOwner: 'claude',
        ragStatus: 'blue',
        steps: [
          {
            id: 'step-wt-3.1-sq-1',
            phaseId: 'phase-wt-3.1-sq',
            name: 'Develop screenshot diff utility',
            status: 'not_started',
            description: 'Build visual regression testing tool'
          }
        ]
      },
      {
        id: 'phase-wt-3.2',
        projectId: 'proj-wt-3x-devinfra',
        name: 'WT-3.2 – CI/CD Pipeline Migration',
        description: 'Formalise deployment workflow with rollback and governance',
        order: 4,
        phaseType: 'PlatformOps',
        phaseOwner: 'jackson',
        ragStatus: 'green',
        summary: `## CI/CD Pipeline Migration
        
Complete CI/CD implementation:
- Reusable CI pipeline (ci.yml, deploy.yml)
- Deploy + rollback configuration
- Structured governance hooks
- RAG signals post-deploy`,
        steps: [
          {
            id: 'step-wt-3.2-1',
            phaseId: 'phase-wt-3.2',
            name: 'Create reusable CI pipeline',
            status: 'complete',
            description: 'Build modular CI/CD configuration'
          },
          {
            id: 'step-wt-3.2-2',
            phaseId: 'phase-wt-3.2',
            name: 'Configure deploy + rollback',
            status: 'complete',
            description: 'Implement safe deployment strategies'
          },
          {
            id: 'step-wt-3.2-3',
            phaseId: 'phase-wt-3.2',
            name: 'Add structured governance hooks',
            status: 'complete',
            description: 'Integrate governance checkpoints'
          },
          {
            id: 'step-wt-3.2-4',
            phaseId: 'phase-wt-3.2',
            name: 'Integrate RAG signals',
            status: 'complete',
            description: 'Connect deployment status to RAG dashboard'
          }
        ]
      },
      {
        id: 'phase-wt-3.3',
        projectId: 'proj-wt-3x-devinfra',
        name: 'WT-3.3 – MetaValidator System',
        description: 'CLI and CI-integrated validator for governance compliance',
        order: 5,
        phaseType: 'Governance',
        phaseOwner: 'claude',
        ragStatus: 'blue',
        summary: `## MetaValidator System
        
Building comprehensive validation system:
- Validator Engine (WTMetaValidator.ts)
- Rules for markdown, step counts, RAG enforcement
- CI pipeline integration
- ExecutionLog failure reporting`,
        steps: [
          {
            id: 'step-wt-3.3-1',
            phaseId: 'phase-wt-3.3',
            name: 'Build Validator Engine',
            status: 'not_started',
            description: 'Create WTMetaValidator.ts core'
          },
          {
            id: 'step-wt-3.3-2',
            phaseId: 'phase-wt-3.3',
            name: 'Add validation rules',
            status: 'not_started',
            description: 'Implement markdown, step count, and RAG rules'
          },
          {
            id: 'step-wt-3.3-3',
            phaseId: 'phase-wt-3.3',
            name: 'Hook into CI pipeline',
            status: 'not_started',
            description: 'Integrate validator with Git pre-push'
          },
          {
            id: 'step-wt-3.3-4',
            phaseId: 'phase-wt-3.3',
            name: 'Post failures to ExecutionLog',
            status: 'not_started',
            description: 'Create backlog tasks from validation failures'
          }
        ]
      }
    ]
  },

  // Legacy/Unknown Projects that need review
  {
    id: 'proj-memory-opt',
    name: 'Memory Optimization Initiative',
    description: 'Optimize memory usage across all platform components',
    createdAt: '2024-01-20T09:00:00Z',
    updatedAt: '2024-01-22T14:15:00Z',
    createdBy: 'Alex Chen',
    projectOwner: 'Alex Chen',
    projectType: 'R&D',
    status: 'Active',
    wtTag: 'wtPhaseUnknown', // Flagged as unknown/needs review
    colorTag: '#10b981',
    phases: [
      {
        id: 'phase-memory-1',
        projectId: 'proj-memory-opt',
        name: 'Memory Analysis',
        description: 'Analyze current memory usage patterns',
        order: 1,
        phaseType: 'Other',
        steps: [
          {
            id: 'step-memory-1',
            phaseId: 'phase-memory-1',
            name: 'Profile Memory Usage',
            status: 'complete',
            description: 'Run memory profiler on all services'
          }
        ]
      }
    ]
  },

  // Future/Planned Projects
  {
    id: 'proj-wt-4x-templates',
    name: 'WT-4.x – Template Ecosystem',
    description: 'Comprehensive template system for scaffolding and automation',
    createdAt: '2025-07-20T10:00:00Z',
    updatedAt: '2025-07-20T10:00:00Z',
    createdBy: 'gizmo',
    projectOwner: 'gizmo',
    projectType: 'Platform',
    status: 'Planned',
    wtTag: 'wt-templates',
    colorTag: '#f59e0b',
    phases: [
      {
        id: 'phase-wt-4.0',
        projectId: 'proj-wt-4x-templates',
        name: 'WT-4.0 – Template Wizard',
        description: 'Interactive template creation and management',
        order: 1,
        phaseType: 'Development',
        phaseOwner: 'gizmo',
        steps: [
          {
            id: 'step-wt-4.0-1',
            phaseId: 'phase-wt-4.0',
            name: 'Design template schema',
            status: 'not_started',
            description: 'Define template structure and metadata'
          }
        ]
      }
    ]
  },

  // More projects would be added here to reach 32 total
  // Including various states: Active, Complete, Planned, Paused, Archived
  // And various types: Platform, R&D, Content, Migration, execution-console
];

/**
 * Get all projects organized by lifecycle
 */
export const getProjectsByLifecycle = () => {
  const current = harmonisedProjects.filter(p => 
    p.status === 'Active' || p.status === 'Paused'
  );
  const completed = harmonisedProjects.filter(p => 
    p.status === 'Complete'
  );
  const future = harmonisedProjects.filter(p => 
    p.status === 'Planned'
  );
  
  return { current, completed, future };
};

/**
 * Get projects that need review (unknown/legacy)
 */
export const getProjectsNeedingReview = () => {
  return harmonisedProjects.filter(p => 
    p.wtTag === 'wtPhaseUnknown' || !p.wtTag
  );
};