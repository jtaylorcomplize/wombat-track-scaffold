import { Client } from '@notionhq/client';
import * as dotenv from 'dotenv';

dotenv.config();

const notion = new Client({
  auth: process.env.NOTION_TOKEN,
});

// You'll need to add these to your .env file
const PHASE_DB_ID = process.env.NOTION_PHASE_DB_ID || 'YOUR_PHASE_DB_ID';
const PHASE_STEP_DB_ID = process.env.NOTION_PHASE_STEP_DB_ID || 'YOUR_PHASE_STEP_DB_ID';

if (!process.env.NOTION_TOKEN) {
  console.error('❌ NOTION_TOKEN not found in environment variables');
  process.exit(1);
}

if (PHASE_DB_ID === 'YOUR_PHASE_DB_ID' || PHASE_STEP_DB_ID === 'YOUR_PHASE_STEP_DB_ID') {
  console.error('❌ Please set NOTION_PHASE_DB_ID and NOTION_PHASE_STEP_DB_ID in your .env file');
  console.log('📝 Add these lines to your .env file:');
  console.log('NOTION_PHASE_DB_ID=<your-phase-database-id>');
  console.log('NOTION_PHASE_STEP_DB_ID=<your-phase-step-database-id>');
  process.exit(1);
}

// Phase data from CSV
const phaseData = [
  {
    phaseId: 'WT-5.4',
    phaseName: 'GizmoConsole UI Integration',
    projectId: 'Wombat Track – Gizmo',
    status: 'Complete',
    startDate: '2025-07-20',
    endDate: '2025-07-21',
    RAG: 'Green',
    notes: 'UI console with threaded messaging, styling, and dispatch hook'
  },
  {
    phaseId: 'WT-5.5',
    phaseName: 'GovernanceLog Hook',
    projectId: 'Wombat Track – Gizmo',
    status: 'Complete',
    startDate: '2025-07-21',
    endDate: '2025-07-22',
    RAG: 'Green',
    notes: 'All console interactions are now logged with metadata'
  },
  {
    phaseId: 'WT-5.6',
    phaseName: 'Real-Time Dispatch',
    projectId: 'Wombat Track – Gizmo',
    status: 'Complete',
    startDate: '2025-07-23',
    endDate: '2025-07-25',
    RAG: 'Green',
    notes: 'Live API wiring to Claude and Gizmo agents'
  },
  {
    phaseId: 'WT-5.7',
    phaseName: 'Slash Command + Memory Ops',
    projectId: 'Wombat Track – Gizmo',
    status: 'Planned',
    startDate: '',
    endDate: '',
    RAG: 'Amber',
    notes: 'Slash commands, memory summarisation, recall and context injection'
  }
];

// PhaseStep data from CSV
const phaseStepData = [
  {
    stepName: 'Implement GizmoConsole UI',
    linkedPhase: 'WT-5.4',
    completionStatus: 'Done',
    linkedFeature: 'GizmoConsole',
    artefacts: 'src/components/GizmoConsole.tsx',
    chatLink: '',
    notes: 'Scaffolded console with dispatch hook and threaded styling'
  },
  {
    stepName: 'Enable GovernanceLog logging',
    linkedPhase: 'WT-5.5',
    completionStatus: 'Done',
    linkedFeature: 'GovernanceLog',
    artefacts: 'logAIConsoleInteraction()',
    chatLink: '',
    notes: 'Logs all Claude and Gizmo interactions into governance DB'
  },
  {
    stepName: 'Integrate Real-Time Claude/Gizmo Dispatch',
    linkedPhase: 'WT-5.6',
    completionStatus: 'Done',
    linkedFeature: 'LiveDispatch',
    artefacts: 'dispatchToClaude(), dispatchToGizmo()',
    chatLink: '',
    notes: 'Live agent selection and fallback modes with logging'
  },
  {
    stepName: 'Design Slash Command System',
    linkedPhase: 'WT-5.7',
    completionStatus: 'Planned',
    linkedFeature: 'SlashCommand',
    artefacts: '',
    chatLink: '',
    notes: 'Add /recall, /summarize, /log with metadata support'
  }
];

async function pushPhasesToNotion() {
  console.log('🚀 Starting Phase data push to Notion...');
  const phasePageIds: Record<string, string> = {};
  let phaseCount = 0;

  for (const phase of phaseData) {
    try {
      const response = await notion.pages.create({
        parent: { database_id: PHASE_DB_ID },
        properties: {
          // Title field (phaseId)
          'phaseId': {
            title: [
              {
                text: {
                  content: phase.phaseId
                }
              }
            ]
          },
          // Phase Name
          'phaseName': {
            rich_text: [
              {
                text: {
                  content: phase.phaseName
                }
              }
            ]
          },
          // Project relation
          'projectId': {
            rich_text: [
              {
                text: {
                  content: phase.projectId
                }
              }
            ]
          },
          // Status
          'status': {
            select: {
              name: phase.status
            }
          },
          // RAG Status
          'RAG': {
            select: {
              name: phase.RAG
            }
          },
          // Start Date
          'startDate': phase.startDate ? {
            date: {
              start: phase.startDate
            }
          } : undefined,
          // End Date
          'endDate': phase.endDate ? {
            date: {
              start: phase.endDate
            }
          } : undefined,
          // Notes
          'notes': {
            rich_text: [
              {
                text: {
                  content: phase.notes
                }
              }
            ]
          }
        }
      });

      phasePageIds[phase.phaseId] = response.id;
      phaseCount++;
      console.log(`✅ Created Phase: ${phase.phaseId} - ${phase.phaseName}`);
    } catch (error) {
      console.error(`❌ Error creating Phase ${phase.phaseId}:`, error);
    }
  }

  return { phasePageIds, phaseCount };
}

async function pushPhaseStepsToNotion(phasePageIds: Record<string, string>) {
  console.log('\n🚀 Starting PhaseStep data push to Notion...');
  let stepCount = 0;
  let relationCount = 0;

  for (const step of phaseStepData) {
    try {
      const properties: any = {
        // Title field (stepName)
        'stepName': {
          title: [
            {
              text: {
                content: step.stepName
              }
            }
          ]
        },
        // Completion Status
        'completionStatus': {
          select: {
            name: step.completionStatus
          }
        },
        // Linked Feature
        'linkedFeature': {
          multi_select: [
            {
              name: step.linkedFeature
            }
          ]
        },
        // Artefacts
        'artefacts': {
          rich_text: [
            {
              text: {
                content: step.artefacts
              }
            }
          ]
        },
        // Notes
        'notes': {
          rich_text: [
            {
              text: {
                content: step.notes
              }
            }
          ]
        }
      };

      // Add relation to Phase if we have the page ID
      if (phasePageIds[step.linkedPhase]) {
        properties['linkedPhase'] = {
          relation: [
            {
              id: phasePageIds[step.linkedPhase]
            }
          ]
        };
        relationCount++;
      }

      // Add Chat Link if present
      if (step.chatLink) {
        properties['chatLink'] = {
          url: step.chatLink
        };
      }

      await notion.pages.create({
        parent: { database_id: PHASE_STEP_DB_ID },
        properties
      });

      stepCount++;
      console.log(`✅ Created PhaseStep: ${step.stepName} (linked to ${step.linkedPhase})`);
    } catch (error) {
      console.error(`❌ Error creating PhaseStep ${step.stepName}:`, error);
    }
  }

  return { stepCount, relationCount };
}

async function main() {
  try {
    console.log('🔧 Phase 1.1B - Notion Schema Repair');
    console.log('=====================================');
    
    // Push Phases first
    const { phasePageIds, phaseCount } = await pushPhasesToNotion();
    
    // Push PhaseSteps with relations
    const { stepCount, relationCount } = await pushPhaseStepsToNotion(phasePageIds);
    
    console.log('\n📊 Summary:');
    console.log('===========');
    console.log(`✅ Total Phases added: ${phaseCount}`);
    console.log(`✅ Total PhaseSteps added: ${stepCount}`);
    console.log(`✅ Phase ↔ PhaseStep relations created: ${relationCount}`);
    
    if (relationCount < stepCount) {
      console.log(`⚠️  Warning: ${stepCount - relationCount} PhaseSteps could not be linked to Phases`);
    }
    
    console.log('\n🎉 Phase 1.1B push complete!');
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

main();