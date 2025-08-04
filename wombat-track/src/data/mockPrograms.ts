import type { Program } from '../types/models';

export const mockPrograms: Program[] = [
  {
    id: 'prog-orbis-001',
    name: 'Orbis Intelligence',
    description: 'Core program for recursive AI-native development and Sub-App orchestration; 3D printer engine for SDLC and governance.',
    status: 'Active Development',
    programType: 'Core',
    launchDate: '2025-07',
    linkedProjects: [], // Placeholder for Project/Phase linking
    notes: 'Merged Wombat Track, MetaPlatform, DriveMemory, and MemoryPlugin into Core; primary Orbis engine.',
    orbisDependencyLevel: 'Core',
    platformIntegration: 'GitHub Actions, Puppeteer, React/Node, Claude API',
    primaryLead: 'Jackson',
    usesOrbisEngine: true
  },
  {
    id: 'prog-complize-001',
    name: 'Complize Platform',
    description: 'Compliance suite Sub-App; includes Visa Management, Knowledge Base, and RAG/Compliance Tracker modules.',
    status: 'Active / Transitioning to Orbis',
    programType: 'Sub-App',
    launchDate: '2025-05',
    linkedProjects: [], // Placeholder for Project/Phase linking
    notes: 'Standalone Sub-App page; internal apps (Immi101, VisaBytes) will merge; will link projects/phases manually in oApp.',
    orbisDependencyLevel: 'High',
    platformIntegration: 'Bubble (legacy), Orbis integration planned',
    primaryLead: 'Jackson',
    usesOrbisEngine: false
  },
  {
    id: 'prog-spqr-001',
    name: 'SPQR',
    description: 'Sub-App for reporting and Looker Studio integration within Orbis Intelligence ecosystem.',
    status: 'Active Development',
    programType: 'Sub-App',
    launchDate: '2025-07',
    linkedProjects: [], // Placeholder for Project/Phase linking
    notes: 'Orbis Sub-App; embeds Looker Studio and SQL/Azure integration; live runtime dashboards planned.',
    orbisDependencyLevel: 'Medium',
    platformIntegration: 'Looker Studio, SQL/Azure, Orbis',
    primaryLead: 'Jackson',
    usesOrbisEngine: true
  },
  {
    id: 'prog-roam-001',
    name: 'Roam',
    description: 'Formerly VisaCalcPro; business migration planning and visa calculation tool.',
    status: 'Active',
    programType: 'Sub-App',
    launchDate: '2025-06',
    linkedProjects: [], // Placeholder for Project/Phase linking
    notes: 'Data to be pulled from existing CSV; Sub-App for visa risk evaluation and calculation.',
    orbisDependencyLevel: 'Medium',
    platformIntegration: 'Standalone tool; Orbis integration planned',
    primaryLead: 'Jackson',
    usesOrbisEngine: false
  }
];