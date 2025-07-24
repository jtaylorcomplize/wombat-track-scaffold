import type { Project } from '../types/phase';

export const mockProjects: Project[] = [
  {
    id: 'proj-001',
    name: 'Wombat Platform Integration',
    description: 'Complete integration of Wombat Track with core platform services',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-20T15:30:00Z',
    createdBy: 'Jordan Taylor',
    projectOwner: 'Jordan Taylor',
    projectType: 'Platform',
    status: 'Active',
    wtTag: 'platform-integration',
    phasePlan: `# Wombat Platform Integration

## Project Overview
This project focuses on establishing a robust integration between Wombat Track and core platform services, including Claude API and GitHub services.

## Key Objectives
- **API Integration**: Seamless connection with Claude API for AI-powered features
- **GitHub Integration**: Automated workflow integration with repository management
- **CI/CD Pipeline**: Establish reliable deployment automation
- **Monitoring**: Comprehensive health monitoring and alerting

## Success Criteria
- 99.9% API uptime
- Sub-200ms response times
- Automated deployment pipeline functional
- Complete test coverage for integration points

## Resources
- [API Documentation](https://docs.claude.ai)
- [GitHub Webhooks Guide](https://docs.github.com/webhooks)
- [CI/CD Best Practices](https://example.com/cicd)`,
    colorTag: '#3b82f6',
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
    updatedAt: '2024-01-22T14:15:00Z',
    createdBy: 'Alex Chen',
    projectOwner: 'Alex Chen',
    projectType: 'R&D',
    status: 'Active',
    wtTag: 'memory-optimization',
    phasePlan: `# Memory Optimization Initiative

## Project Overview
Comprehensive optimization of memory usage across all Wombat Track platform components to improve performance and reduce operational costs.

## Key Phases
- **Phase 1**: Memory Analysis and Profiling
- **Phase 2**: Implementation of optimization strategies
- **Phase 3**: Performance validation and monitoring

## Target Metrics
- Reduce memory usage by 30-40%
- Improve response times by 15-20%
- Decrease memory-related incidents by 90%

## Technical Approach
- Memory profiling with advanced tools
- Algorithm optimization and data structure improvements
- Caching strategy enhancement
- Continuous monitoring implementation

## Success Criteria
- All services under target memory thresholds
- No memory leaks detected in production
- Performance benchmarks met or exceeded`,
    colorTag: '#10b981',
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
  },
  {
    id: 'proj-wt-3.2',
    name: 'WT-3.2 – CI/CD Pipeline Implementation',
    description: 'Comprehensive CI/CD pipeline implementation for automated testing, deployment, and monitoring',
    createdAt: '2025-01-20T10:00:00Z',
    updatedAt: '2025-01-20T10:00:00Z',
    createdBy: 'Jackson',
    projectOwner: 'jackson',
    projectType: 'execution-console',
    status: 'Active',
    wtTag: 'wombat-console',
    phasePlan: `# WT-3.2 – CI/CD Pipeline Implementation

## Project Overview
Implementation of a comprehensive CI/CD pipeline to enhance automated testing, enable safe deployments, and provide robust rollback capabilities for the Wombat Track platform.

## Key Objectives
- **Automated Testing**: Establish comprehensive test automation in CI pipeline
- **Safe Deployments**: Implement zero-downtime deployment strategies
- **Rollback Capabilities**: Create reliable automated rollback mechanisms
- **Performance Monitoring**: Continuous monitoring of deployment performance and system health

## Pipeline Architecture
The CI/CD pipeline will implement:
- **Build Stage**: Automated compilation and artifact generation
- **Test Stage**: Unit tests, integration tests, and security scans  
- **Deploy Stage**: Staged deployment with health checks
- **Monitor Stage**: Real-time performance and error tracking

## Success Criteria
- 100% automated deployment pipeline
- < 5 minute deployment time to staging
- < 60 second rollback capability
- Zero deployment-related downtime
- Comprehensive test coverage integration

## Risk Mitigation
- Blue-green deployment strategy
- Automated health checks at each stage
- Comprehensive monitoring and alerting
- Database migration safety checks
- Feature flag integration for safe releases`,
    colorTag: '#8b5cf6',
    phases: [
      {
        id: 'phase-wt-3.2-cicd',
        projectId: 'proj-wt-3.2',
        name: 'CI/CD Pipeline Implementation',
        description: 'Core implementation of automated testing, deployment, and monitoring infrastructure',
        summary: `## CI/CD Pipeline Implementation Phase

This phase establishes the foundation for automated software delivery through comprehensive CI/CD pipeline implementation.

### Key Components
- **CI Pipeline Configuration**: Automated build and test processes
- **Deployment Automation**: Zero-downtime deployment strategies
- **Rollback Procedures**: Rapid recovery mechanisms
- **Performance Monitoring**: Real-time system health tracking

### Technical Approach
The implementation follows DevOps best practices with:
- Containerized deployment strategies
- Infrastructure as Code (IaC) principles
- Comprehensive testing at each pipeline stage
- Automated quality gates and security scanning

### Benefits
- Reduced deployment time from hours to minutes
- Increased deployment frequency and reliability
- Improved system observability and incident response
- Enhanced developer productivity through automation`,
        order: 1,
        steps: [
          {
            id: 'step-wt-3.2-ci',
            phaseId: 'phase-wt-3.2-cicd',
            name: 'Create CI Pipeline Configuration',
            status: 'not_started',
            description: 'Define build and test automation with comprehensive quality gates',
            templateId: 'ci-repair-003'
          },
          {
            id: 'step-wt-3.2-deploy',
            phaseId: 'phase-wt-3.2-cicd',
            name: 'Setup Deployment Automation',
            status: 'not_started',
            description: 'Configure auto-deployment to staging/production with zero-downtime strategies',
            templateId: 'github-deploy-002'
          },
          {
            id: 'step-wt-3.2-rollback',
            phaseId: 'phase-wt-3.2-cicd',
            name: 'Implement Rollback Procedures',
            status: 'not_started',
            description: 'Create automated rollback mechanisms with database migration safety'
          },
          {
            id: 'step-wt-3.2-monitoring',
            phaseId: 'phase-wt-3.2-cicd',
            name: 'Performance Monitoring Setup',
            status: 'not_started',
            description: 'Configure comprehensive metrics, alerting, and observability stack'
          }
        ]
      }
    ]
  }
];