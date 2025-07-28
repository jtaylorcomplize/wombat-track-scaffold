// wombat-track/src/data/mockPrograms.ts

import { Program } from '../types/models';

export const mockPrograms: Program[] = [
  {
    id: 'prog-orbis-001',
    name: 'Orbis',
    description: 'Core governance and coordination platform for AI-human collaboration',
    status: 'Active',
    programType: 'Core',
    usesOrbisEngine: true,
    orbisDependencyLevel: 'Full',
    platformIntegration: ['Claude', 'Notion', 'GitHub'],
    primaryLead: 'System Architect',
    launchDate: new Date('2024-01-01'),
    notes: 'Primary platform - all other sub-apps derive from Orbis architecture',
    linkedProjects: ['proj-001', 'proj-002']
  },
  {
    id: 'prog-complize-001',
    name: 'Complize',
    description: 'Immigration compliance and case management platform',
    status: 'Active',
    programType: 'Sub-App',
    usesOrbisEngine: true,
    orbisDependencyLevel: 'Full',
    platformIntegration: ['Claude', 'Notion', 'DriveMemory'],
    primaryLead: 'Product Manager',
    launchDate: new Date('2024-06-01'),
    notes: 'Client-facing application built on Orbis infrastructure',
    linkedProjects: ['proj-003']
  },
  {
    id: 'prog-metaplatform-001',
    name: 'MetaPlatform',
    description: 'Universal platform integration and workflow orchestration system',
    status: 'Planning',
    programType: 'Sub-App',
    usesOrbisEngine: true,
    orbisDependencyLevel: 'Full',
    platformIntegration: ['Claude', 'GitHub', 'Notion', 'Vercel'],
    primaryLead: 'Engineering Lead',
    launchDate: new Date('2025-01-01'),
    notes: 'Next-generation platform for cross-system integration and AI orchestration',
    linkedProjects: []
  }
];

export default mockPrograms;