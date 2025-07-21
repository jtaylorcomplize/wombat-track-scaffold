import type { Project } from '../types/phase';

export const mockProjects: Project[] = [
  {
    id: 'proj-001',
    name: 'Wombat Platform Integration',
    description: 'Complete integration of Wombat Track with core platform services',
    createdAt: '2024-01-15T10:00:00Z',
    phases: [
      {
        id: 'phase-001',
        projectId: 'proj-001',
        name: 'Phase 1: Core API Integration',
        description: 'Establish connection with Claude API and GitHub services',
        order: 1,
        steps: [
          {
            id: 'step-001',
            phaseId: 'phase-001',
            name: 'Setup Claude API Authentication',
            status: 'complete',
            description: 'Configure OAuth and API key management',
            executionId: 'exec_1234567890_abc', // Links to execution from ORB-2.4
            templateId: 'claude-health-001',
            startedAt: '2024-01-15T11:00:00Z',
            completedAt: '2024-01-15T11:30:00Z'
          },
          {
            id: 'step-002',
            phaseId: 'phase-001',
            name: 'Implement Health Check Monitoring',
            status: 'in_progress',
            description: 'Set up continuous health monitoring for Claude API',
            executionId: 'exec_1234567890_def',
            templateId: 'claude-health-001',
            startedAt: '2024-01-15T12:00:00Z'
          },
          {
            id: 'step-003',
            phaseId: 'phase-001',
            name: 'Configure GitHub Webhooks',
            status: 'not_started',
            description: 'Setup webhook listeners for repository events',
            templateId: 'github-deploy-002'
          },
          {
            id: 'step-004',
            phaseId: 'phase-001',
            name: 'Test End-to-End Integration',
            status: 'not_started',
            description: 'Validate complete API integration flow'
          }
        ]
      },
      {
        id: 'phase-002',
        projectId: 'proj-001',
        name: 'Phase 2: CI/CD Pipeline Setup',
        description: 'Establish automated deployment and testing pipelines',
        order: 2,
        steps: [
          {
            id: 'step-005',
            phaseId: 'phase-002',
            name: 'Create CI Pipeline Configuration',
            status: 'not_started',
            description: 'Define build and test automation',
            templateId: 'ci-repair-003'
          },
          {
            id: 'step-006',
            phaseId: 'phase-002',
            name: 'Setup Deployment Automation',
            status: 'not_started',
            description: 'Configure auto-deployment to staging/production',
            templateId: 'github-deploy-002'
          },
          {
            id: 'step-007',
            phaseId: 'phase-002',
            name: 'Implement Rollback Procedures',
            status: 'not_started',
            description: 'Create automated rollback mechanisms'
          },
          {
            id: 'step-008',
            phaseId: 'phase-002',
            name: 'Performance Monitoring Setup',
            status: 'not_started',
            description: 'Configure metrics and alerting'
          }
        ]
      }
    ]
  },
  {
    id: 'proj-002',
    name: 'Memory Optimization Initiative',
    description: 'Optimize memory usage across all platform components',
    createdAt: '2024-01-20T09:00:00Z',
    phases: [
      {
        id: 'phase-003',
        projectId: 'proj-002',
        name: 'Phase 1: Memory Analysis',
        description: 'Analyze current memory usage patterns',
        order: 1,
        steps: [
          {
            id: 'step-009',
            phaseId: 'phase-003',
            name: 'Profile Memory Usage',
            status: 'complete',
            description: 'Run memory profiler on all services',
            executionId: 'exec_1234567890_ghi',
            templateId: 'memory-optimize-005',
            startedAt: '2024-01-20T10:00:00Z',
            completedAt: '2024-01-20T11:00:00Z'
          },
          {
            id: 'step-010',
            phaseId: 'phase-003',
            name: 'Identify Memory Leaks',
            status: 'in_progress',
            description: 'Detect and document memory leak sources',
            startedAt: '2024-01-20T11:30:00Z'
          },
          {
            id: 'step-011',
            phaseId: 'phase-003',
            name: 'Generate Optimization Report',
            status: 'not_started',
            description: 'Create comprehensive memory optimization plan'
          }
        ]
      },
      {
        id: 'phase-004',
        projectId: 'proj-002',
        name: 'Phase 2: Implementation',
        description: 'Implement memory optimization strategies',
        order: 2,
        steps: [
          {
            id: 'step-012',
            phaseId: 'phase-004',
            name: 'Optimize Caching Strategy',
            status: 'not_started',
            description: 'Implement improved caching mechanisms',
            templateId: 'memory-optimize-005'
          },
          {
            id: 'step-013',
            phaseId: 'phase-004',
            name: 'Refactor Memory-Intensive Code',
            status: 'not_started',
            description: 'Optimize algorithms and data structures'
          },
          {
            id: 'step-014',
            phaseId: 'phase-004',
            name: 'Deploy and Monitor',
            status: 'not_started',
            description: 'Roll out optimizations and track improvements'
          }
        ]
      }
    ]
  }
];