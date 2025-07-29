#!/usr/bin/env tsx

/**
 * WT-7.4: Create Canonical Tech Debt Register Database
 * 
 * Creates wt-tech-debt-register in Notion and populates it with
 * the 31 remaining lint errors from LINT_STATUS_REPORT.md
 */

import { NotionDatabaseCreator } from '../src/utils/notionDatabaseCreator';
import { createNotionClient } from '../src/utils/notionClient';

// Tech debt entries based on LINT_STATUS_REPORT.md
const TECH_DEBT_ENTRIES = [
  // Category 1: Unused Variables (19 errors)
  {
    title: 'Unused _context parameter in DocumentSurface.tsx',
    category: 'Lint',
    priority: 'Low',
    originFile: 'src/components/surfaces/DocumentSurface.tsx',
    lineReference: 'Line 113:53',
    status: 'Open',
    effortEstimate: '<30min',
    notes: 'Intentionally unused parameter - safe to suppress with ESLint disable',
  },
  {
    title: 'Unused _context parameter in ExecuteSurface.tsx',
    category: 'Lint',
    priority: 'Low',
    originFile: 'src/components/surfaces/ExecuteSurface.tsx',
    lineReference: 'Line 72:53',
    status: 'Open',
    effortEstimate: '<30min',
    notes: 'Intentionally unused parameter - safe to suppress with ESLint disable',
  },
  {
    title: 'Unused _context parameter in GovernSurface.tsx',
    category: 'Lint',
    priority: 'Low',
    originFile: 'src/components/surfaces/GovernSurface.tsx',
    lineReference: 'Line 197:53',
    status: 'Open',
    effortEstimate: '<30min',
    notes: 'Intentionally unused parameter - safe to suppress with ESLint disable',
  },
  {
    title: 'Unused _context parameter in IntegrateSurface.tsx',
    category: 'Lint',
    priority: 'Low',
    originFile: 'src/components/surfaces/IntegrateSurface.tsx',
    lineReference: 'Line 25:53',
    status: 'Open',
    effortEstimate: '<30min',
    notes: 'Intentionally unused parameter - safe to suppress with ESLint disable',
  },
  {
    title: 'Unused _context parameter in PlanSurface.tsx',
    category: 'Lint',
    priority: 'Low',
    originFile: 'src/components/surfaces/PlanSurface.tsx',
    lineReference: 'Line 48:53',
    status: 'Open',
    effortEstimate: '<30min',
    notes: 'Intentionally unused parameter - safe to suppress with ESLint disable',
  },
  {
    title: 'Unused IntegrateSurface prop parameters',
    category: 'Lint',
    priority: 'Low',
    originFile: 'src/components/surfaces/IntegrateSurface.tsx',
    lineReference: 'Lines 19-22',
    status: 'Open',
    effortEstimate: '<30min',
    notes: 'Unused _currentPhase, _currentStep, _onPhaseChange, _onStepChange - can be removed from interface',
  },
  {
    title: 'Unused _projects parameter in EnhancedProjectSidebar',
    category: 'Lint',
    priority: 'Low',
    originFile: 'src/components/layout/EnhancedProjectSidebar.tsx',
    lineReference: 'Line 39:3',
    status: 'Open',
    effortEstimate: '<30min',
    notes: 'Component uses mockProjects instead - can remove from props',
  },
  {
    title: 'Unused _error parameter in SendToGitHubButton',
    category: 'Lint',
    priority: 'Low',
    originFile: 'src/components/SendToGitHubButton.tsx',
    lineReference: 'Line 40:14',
    status: 'Open',
    effortEstimate: '<30min',
    notes: 'Intentionally unused in catch block - safe to suppress',
  },
  {
    title: 'Unused editor parameter in DocsEditor callback',
    category: 'Lint',
    priority: 'Low',
    originFile: 'src/components/docs/DocsEditor.tsx',
    lineReference: 'Line 58:18',
    status: 'Open',
    effortEstimate: '<30min',
    notes: 'Editor parameter in callback - check if needed or can be removed',
  },
  {
    title: 'Unused _databaseId parameter in driveMemorySync',
    category: 'Lint',
    priority: 'Low',
    originFile: 'src/utils/driveMemorySync.ts',
    lineReference: 'Line 240:60',
    status: 'Open',
    effortEstimate: '<30min',
    notes: 'Already marked with underscore - safe to suppress',
  },
  {
    title: 'Unused parameters in templateDispatcher.ts',
    category: 'Dead Code',
    priority: 'Medium',
    originFile: 'src/lib/templateDispatcher.ts',
    lineReference: 'Line 3:39, 3:59',
    status: 'Open',
    effortEstimate: '1-2 hours',
    notes: 'templateId, templateName - appears to be stub function, implement or remove',
  },
  {
    title: 'Unused parameters in aiHelpers.ts',
    category: 'Dead Code',
    priority: 'Medium',
    originFile: 'src/utils/aiHelpers.ts',
    lineReference: 'Lines 2, 6, 10',
    status: 'Open',
    effortEstimate: '1-2 hours',
    notes: 'projectId, stepId, checkpointId, meetingId - scaffold functions, implement or remove',
  },

  // Category 2: Any Type Usage (9 errors)
  {
    title: 'Any type usage in agent.ts interfaces',
    category: 'Structural',
    priority: 'High',
    originFile: 'src/types/agent.ts',
    lineReference: 'Lines 14:29, 34:29, 52:29',
    status: 'Open',
    effortEstimate: '2-4 hours',
    notes: 'Critical - affects multiple components. Define proper Agent interfaces for type safety',
  },
  {
    title: 'Any type in ProjectContext.tsx',
    category: 'Structural',
    priority: 'High',
    originFile: 'src/contexts/ProjectContext.tsx',
    lineReference: 'Line 12:13',
    status: 'Open',
    effortEstimate: '1-2 hours',
    notes: 'Core functionality - context should be properly typed',
  },
  {
    title: 'Any type in governance.ts event details',
    category: 'Structural',
    priority: 'Medium',
    originFile: 'src/types/governance.ts',
    lineReference: 'Line 19:13',
    status: 'Open',
    effortEstimate: '1-2 hours',
    notes: 'Event typing for audit trails - important for governance',
  },
  {
    title: 'Any type in AgentMesh.tsx component',
    category: 'Lint',
    priority: 'Medium',
    originFile: 'src/components/mesh/AgentMesh.tsx',
    lineReference: 'Line 399:49',
    status: 'Open',
    effortEstimate: '1-2 hours',
    notes: 'Component state typing - should be properly defined',
  },
  {
    title: 'Any type in mockProjects.ts',
    category: 'Lint',
    priority: 'Low',
    originFile: 'src/data/mockProjects.ts',
    lineReference: 'Line 8:16',
    status: 'Open',
    effortEstimate: '<30min',
    notes: 'Mock data structure - can be easily typed',
  },
  {
    title: 'Any type in getIntegrationHealth.ts',
    category: 'Lint',
    priority: 'Medium',
    originFile: 'src/lib/getIntegrationHealth.ts',
    lineReference: 'Line 11:29',
    status: 'Open',
    effortEstimate: '1-2 hours',
    notes: 'API response typing - should define interface for health data',
  },
  {
    title: 'Any type in claudeGizmoComm.ts',
    category: 'Structural',
    priority: 'Medium',
    originFile: 'src/utils/claudeGizmoComm.ts',
    lineReference: 'Line 10:13',
    status: 'Open',
    effortEstimate: '1-2 hours',
    notes: 'Communication interface - important for AI agent interactions',
  },

  // Category 3: Import Style Violations (3 errors)
  {
    title: 'Import style violations in project.ts',
    category: 'Lint',
    priority: 'Low',
    originFile: 'src/types/project.ts',
    lineReference: 'Lines 5:47, 11:45, 22:44',
    status: 'Open',
    effortEstimate: '<30min',
    notes: 'Convert import() type annotations to proper import statements',
  },
];

async function createTechDebtRegister() {
  const token = process.env.NOTION_TOKEN;
  const parentPageId = process.env.NOTION_PARENT_PAGE_ID;

  if (!token || !parentPageId) {
    console.error('❌ Missing required environment variables:');
    console.error('   - NOTION_TOKEN');
    console.error('   - NOTION_PARENT_PAGE_ID');
    process.exit(1);
  }

  console.log('🏗️  Creating wt-tech-debt-register database...');

  try {
    // Create the database
    const creator = new NotionDatabaseCreator(token, parentPageId);
    const schema = NotionDatabaseCreator.getTechDebtRegisterSchema();
    
    const result = await creator.createDatabase(schema);
    
    if (!result.success) {
      throw new Error(result.error);
    }

    console.log(`✅ Database created successfully!`);
    console.log(`   Database ID: ${result.databaseId}`);
    console.log(`   URL: ${result.url}`);

    // Populate with tech debt entries
    console.log(`\\n📝 Populating with ${TECH_DEBT_ENTRIES.length} tech debt entries...`);
    
    const client = createNotionClient(token);
    let successCount = 0;
    let errorCount = 0;

    for (const [index, entry] of TECH_DEBT_ENTRIES.entries()) {
      try {
        await client.writePage({
          parent: { database_id: result.databaseId! },
          properties: {
            title: {
              title: [{ text: { content: entry.title } }],
            },
            category: {
              select: { name: entry.category },
            },
            priority: {
              select: { name: entry.priority },
            },
            originFile: {
              rich_text: [{ text: { content: entry.originFile } }],
            },
            lineReference: {
              rich_text: [{ text: { content: entry.lineReference } }],
            },
            status: {
              select: { name: entry.status },
            },
            effortEstimate: {
              rich_text: [{ text: { content: entry.effortEstimate } }],
            },
            notes: {
              rich_text: [{ text: { content: entry.notes } }],
            },
            canonicalUse: {
              checkbox: true,
            },
          },
        });

        successCount++;
        console.log(`   ✅ Added: ${entry.title}`);
      } catch (error) {
        errorCount++;
        console.error(`   ❌ Failed to add: ${entry.title}`);
        console.error(`      Error: ${error}`);
      }
    }

    console.log(`\\n📊 Summary:`);
    console.log(`   ✅ Successfully added: ${successCount} entries`);
    if (errorCount > 0) {
      console.log(`   ❌ Failed: ${errorCount} entries`);
    }
    console.log(`   🔗 Database URL: ${result.url}`);

    console.log(`\\n🎯 Next Steps:`);
    console.log(`   1. Review entries in Notion database`);
    console.log(`   2. Create filtered views: Active Debt, Quick Fixes, Critical Types`);
    console.log(`   3. Prioritize based on effort vs impact`);
    console.log(`   4. Use as baseline for WT-8.0 runtime safeguards`);

  } catch (error) {
    console.error(`❌ Failed to create tech debt register:`, error);
    process.exit(1);
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  createTechDebtRegister().catch(console.error);
}

export { createTechDebtRegister, TECH_DEBT_ENTRIES };