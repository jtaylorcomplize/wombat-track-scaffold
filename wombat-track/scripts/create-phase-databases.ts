import { Client } from '@notionhq/client';
import * as dotenv from 'dotenv';

dotenv.config();

const notion = new Client({
  auth: process.env.NOTION_TOKEN,
});

// The canonical page ID extracted from the URL
const CANONICAL_PAGE_ID = '23ce1901e36e805bbf5ee42eb1204a13';

async function createPhaseDatabases() {
  try {
    console.log('🔧 Creating Phase and PhaseStep databases under canonical page...');
    
    // Create Phase Database
    console.log('\n📊 Creating Phase Database...');
    const phaseDatabase = await notion.databases.create({
      parent: {
        type: 'page_id',
        page_id: CANONICAL_PAGE_ID
      },
      title: [
        {
          type: 'text',
          text: {
            content: 'WT Phase Database'
          }
        }
      ],
      properties: {
        'phaseId': {
          title: {}
        },
        'phaseName': {
          rich_text: {}
        },
        'projectId': {
          rich_text: {}  // Will be converted to relation once WT Projects DB exists
        },
        'status': {
          select: {
            options: [
              { name: 'Planned', color: 'gray' },
              { name: 'In Progress', color: 'yellow' },
              { name: 'Complete', color: 'green' },
              { name: 'Done', color: 'green' }
            ]
          }
        },
        'startDate': {
          date: {}
        },
        'endDate': {
          date: {}
        },
        'RAG': {
          select: {
            options: [
              { name: 'Red', color: 'red' },
              { name: 'Amber', color: 'yellow' },
              { name: 'Green', color: 'green' }
            ]
          }
        },
        'notes': {
          rich_text: {}
        }
      }
    });

    console.log('✅ Phase Database created successfully!');
    console.log(`📎 URL: https://www.notion.so/${phaseDatabase.id.replace(/-/g, '')}`);
    console.log(`🔑 Database ID: ${phaseDatabase.id}`);

    // Create PhaseStep Database
    console.log('\n📊 Creating PhaseStep Database...');
    const phaseStepDatabase = await notion.databases.create({
      parent: {
        type: 'page_id',
        page_id: CANONICAL_PAGE_ID
      },
      title: [
        {
          type: 'text',
          text: {
            content: 'WT PhaseStep Database'
          }
        }
      ],
      properties: {
        'stepName': {
          title: {}
        },
        'linkedPhase': {
          relation: {
            database_id: phaseDatabase.id,
            single_property: {}
          }
        },
        'completionStatus': {
          select: {
            options: [
              { name: 'Planned', color: 'gray' },
              { name: 'In Progress', color: 'yellow' },
              { name: 'Done', color: 'green' }
            ]
          }
        },
        'linkedFeature': {
          multi_select: {
            options: [
              { name: 'GizmoConsole', color: 'blue' },
              { name: 'GovernanceLog', color: 'purple' },
              { name: 'LiveDispatch', color: 'pink' },
              { name: 'SlashCommand', color: 'orange' }
            ]
          }
        },
        'artefacts': {
          rich_text: {}
        },
        'chatLink': {
          url: {}
        },
        'notes': {
          rich_text: {}
        }
      }
    });

    console.log('✅ PhaseStep Database created successfully!');
    console.log(`📎 URL: https://www.notion.so/${phaseStepDatabase.id.replace(/-/g, '')}`);
    console.log(`🔑 Database ID: ${phaseStepDatabase.id}`);

    // Generate .env entries
    console.log('\n📝 Add these to your .env file:');
    console.log('```');
    console.log(`NOTION_PHASE_DB_ID=${phaseDatabase.id}`);
    console.log(`NOTION_PHASE_STEP_DB_ID=${phaseStepDatabase.id}`);
    console.log('```');

    return {
      phaseDbId: phaseDatabase.id,
      phaseStepDbId: phaseStepDatabase.id
    };

  } catch (error) {
    console.error('❌ Error creating databases:', error);
    throw error;
  }
}

// Run the creation
createPhaseDatabases()
  .then(({ phaseDbId, phaseStepDbId }) => {
    console.log('\n🎉 Databases created successfully!');
    console.log('Next step: Run push-phase-data-to-notion.ts to populate the data');
  })
  .catch(error => {
    console.error('Failed to create databases:', error);
    process.exit(1);
  });