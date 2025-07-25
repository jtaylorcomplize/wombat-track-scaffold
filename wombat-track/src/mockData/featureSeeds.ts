import type { FeaturePlanRow } from '../types/feature';

export const seedVisaBytesFeatures: FeaturePlanRow[] = [
  {
    id: '01',
    featureName: 'SCORM Lesson Viewer',
    app: 'Complize',
    subApp: 'Visa Bytes',
    ragStatus: 'amber',
    ownerName: 'Kylie T.',
    aiAvailable: true,
    aiActionType: 'edit',
    description: 'Interactive SCORM-compliant lesson viewer with progress tracking',
    priority: 'high',
    estimatedEffort: '3-4 weeks',
    dependencies: ['Learning Management System', 'User Authentication'],
    artefactLinks: ['https://complize.com/specs/scorm-viewer'],
    createdAt: '2025-07-20T09:00:00Z',
    updatedAt: '2025-07-24T14:30:00Z'
  },
  {
    id: '02',
    featureName: 'Completion Tracker',
    app: 'Complize',
    subApp: 'Visa Bytes',
    ragStatus: 'red',
    ownerName: 'Jackson',
    aiAvailable: true,
    aiActionType: 'edit',
    description: 'Real-time tracking of lesson completion status and analytics',
    priority: 'high',
    estimatedEffort: '2-3 weeks',
    dependencies: ['SCORM Lesson Viewer', 'Database Schema'],
    artefactLinks: ['https://complize.com/specs/completion-tracker'],
    createdAt: '2025-07-18T11:00:00Z',
    updatedAt: '2025-07-24T16:45:00Z'
  },
  {
    id: '03',
    featureName: 'AI Quiz Generator',
    app: 'Complize',
    subApp: 'Visa Bytes',
    ragStatus: 'green',
    aiAvailable: true,
    aiActionType: 'scaffold',
    description: 'Generate quizzes automatically using AI based on lesson content',
    priority: 'medium',
    estimatedEffort: '4-5 weeks',
    dependencies: ['Content Processing Engine', 'AI Service Integration'],
    artefactLinks: ['https://complize.com/specs/ai-quiz-gen'],
    createdAt: '2025-07-22T08:00:00Z',
    updatedAt: '2025-07-24T12:15:00Z'
  },
  {
    id: '04',
    featureName: 'Alerts from VEVO Flag',
    app: 'Complize',
    subApp: 'Visa Bytes',
    ragStatus: 'amber',
    ownerName: 'TBD',
    aiAvailable: true,
    aiActionType: 'scaffold',
    description: 'Integration with VEVO system for compliance alerts and notifications',
    priority: 'medium',
    estimatedEffort: '2-3 weeks',
    dependencies: ['VEVO API Integration', 'Notification System'],
    artefactLinks: ['https://complize.com/specs/vevo-alerts'],
    createdAt: '2025-07-19T15:30:00Z',
    updatedAt: '2025-07-23T10:20:00Z'
  },
  {
    id: '05',
    featureName: 'Learning Path Builder',
    app: 'Complize',
    subApp: 'Visa Bytes',
    ragStatus: 'blue',
    ownerName: 'Sarah M.',
    aiAvailable: true,
    aiActionType: 'scaffold',
    description: 'Visual interface for creating custom learning paths and prerequisites',
    priority: 'low',
    estimatedEffort: '5-6 weeks',
    dependencies: ['Content Management', 'User Interface Framework'],
    createdAt: '2025-07-21T13:45:00Z',
    updatedAt: '2025-07-24T09:30:00Z'
  },
  {
    id: '06',
    featureName: 'Mobile Responsive Design',
    app: 'Complize',
    subApp: 'Visa Bytes',
    ragStatus: 'green',
    ownerName: 'Alex K.',
    aiAvailable: false,
    description: 'Responsive design implementation for mobile and tablet devices',
    priority: 'high',
    estimatedEffort: '3-4 weeks',
    dependencies: ['UI Component Library', 'Testing Framework'],
    createdAt: '2025-07-17T14:20:00Z',
    updatedAt: '2025-07-24T11:10:00Z'
  }
];

export const seedComplizeGeneralFeatures: FeaturePlanRow[] = [
  {
    id: '07',
    featureName: 'Single Sign-On Integration',
    app: 'Complize',
    subApp: 'Core Platform',
    ragStatus: 'amber',
    ownerName: 'Michael R.',
    aiAvailable: true,
    aiActionType: 'edit',
    description: 'Enterprise SSO integration with SAML and OAuth providers',
    priority: 'high',
    estimatedEffort: '4-5 weeks',
    dependencies: ['Authentication Service', 'Security Framework'],
    createdAt: '2025-07-16T10:00:00Z',
    updatedAt: '2025-07-24T15:20:00Z'
  },
  {
    id: '08',
    featureName: 'Advanced Reporting Dashboard',
    app: 'Complize',
    subApp: 'Analytics',
    ragStatus: 'green',
    ownerName: 'Emma L.',
    aiAvailable: true,
    aiActionType: 'scaffold',
    description: 'Comprehensive analytics and reporting dashboard for admins',
    priority: 'medium',
    estimatedEffort: '6-8 weeks',
    dependencies: ['Data Pipeline', 'Visualization Library'],
    createdAt: '2025-07-15T16:30:00Z',
    updatedAt: '2025-07-24T13:45:00Z'
  }
];

export const getAllFeatures = (): FeaturePlanRow[] => [
  ...seedVisaBytesFeatures,
  ...seedComplizeGeneralFeatures
];

export const getFeaturesByApp = (app: string): FeaturePlanRow[] =>
  getAllFeatures().filter(feature => feature.app === app);

export const getFeaturesBySubApp = (subApp: string): FeaturePlanRow[] =>
  getAllFeatures().filter(feature => feature.subApp === subApp);

export const getUniqueApps = (): string[] =>
  [...new Set(getAllFeatures().map(feature => feature.app))];

export const getUniqueSubApps = (): string[] =>
  [...new Set(getAllFeatures().map(feature => feature.subApp))];

export const getUniqueOwners = (): string[] =>
  [...new Set(getAllFeatures().map(feature => feature.ownerName).filter(Boolean))] as string[];