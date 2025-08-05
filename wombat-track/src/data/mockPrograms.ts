// wombat-track/src/data/mockPrograms.ts

import type { Program } from '../types/models';

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
    id: 'prog-spqr-001',
    name: 'SPQR',
    description: 'Sub-App for reporting and Looker Studio integration within Orbis Intelligence ecosystem',
    status: 'Active',
    programType: 'Sub-App',
    usesOrbisEngine: true,
    orbisDependencyLevel: 'High',
    platformIntegration: ['Claude', 'Looker Studio', 'Notion'],
    primaryLead: 'Analytics Lead',
    launchDate: new Date('2024-09-01'),
    notes: 'Reporting and analytics platform',
    linkedProjects: []
  },
  {
    id: 'prog-roam-001',
    name: 'Roam',
    description: 'Formerly VisaCalcPro; business migration planning and visa calculation tool',
    status: 'Active',
    programType: 'Sub-App',
    usesOrbisEngine: true,
    orbisDependencyLevel: 'Medium',
    platformIntegration: ['Claude', 'Notion', 'DriveMemory'],
    primaryLead: 'Migration Specialist',
    launchDate: new Date('2024-08-01'),
    notes: 'Renamed from VisaCalcPro as part of Sub-App rationalization',
    linkedProjects: []
  }
];

export default mockPrograms;