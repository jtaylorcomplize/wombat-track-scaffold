import { Client } from '@notionhq/client';
import * as dotenv from 'dotenv';

dotenv.config();

const notion = new Client({
  auth: process.env.NOTION_TOKEN,
});

const PHASE_DB_ID = process.env.NOTION_PHASE_DB_ID || 'YOUR_PHASE_DB_ID';

if (!process.env.NOTION_TOKEN) {
  console.error('❌ NOTION_TOKEN not found in environment variables');
  process.exit(1);
}

if (PHASE_DB_ID === 'YOUR_PHASE_DB_ID') {
  console.error('❌ Please set NOTION_PHASE_DB_ID in your .env file');
  console.log('📝 Add this line to your .env file:');
  console.log('NOTION_PHASE_DB_ID=<your-phase-database-id>');
  process.exit(1);
}

// WT-8.0.1 Phase Data
const phaseData = {
  phaseId: 'WT-8.0.1',
  title: 'SDLC Visibility Layer',
  linkedProject: 'Wombat Tracks',
  purpose: 'Create UI surface and metadata visibility for SDLC guardrails, compliance state, and technical risk score',
  expectedOutcome: 'Users and agents can query guardrails, see CI risk score, view enforcement history, and propose mitigations',
  status: 'Planned',
  tags: ['sdlc-governance', 'oApp-migration', 'runtime-risk', 'wt-8.0'],
  linkedDBs: ['wt-sdlc-visibility-spec', 'wt-sdlc-guardrails', 'wt-tech-debt-register'],
  canonical: true
};

async function createWT801Phase() {
  console.log('🚀 Creating WT-8.0.1 Phase in Notion...');
  
  try {
    const response = await notion.pages.create({
      parent: { database_id: PHASE_DB_ID },
      // Maps to expected canonical schema
      properties: {
        // Phase name as title field (maps to 'title' in canonical schema)
        'phasename': {
          title: [
            {
              text: {
                content: `${phaseData.phaseId} – ${phaseData.title}`
              }
            }
          ]
        },
        // Notes field (maps to 'description' in canonical schema)
        'notes': {
          rich_text: [
            {
              text: {
                content: `${phaseData.purpose}\n\nExpected Outcome: ${phaseData.expectedOutcome}\n\nTags: ${phaseData.tags.join(', ')}\n\nLinked DBs: ${phaseData.linkedDBs.join(', ')}\n\nCanonical: ${phaseData.canonical}`
              }
            }
          ]
        },
        // Status
        'status': {
          select: {
            name: 'Planned'
          }
        },
        // RAG status (maps to 'ragStatus' in canonical schema)
        'RAG': {
          select: {
            name: 'Green'
          }
        }
        // Note: Omitting tags and WT Projects relation as they may not exist in current schema
      }
    });

    console.log(`✅ Created Phase: ${phaseData.phaseId} - ${phaseData.title}`);
    console.log(`📄 Page ID: ${response.id}`);
    
    return response.id;
  } catch (error) {
    console.error(`❌ Error creating Phase ${phaseData.phaseId}:`, error);
    throw error;
  }
}

async function main() {
  try {
    console.log('🔧 WT-8.0.1 - SDLC Visibility Layer Phase Creation');
    console.log('================================================');
    
    const pageId = await createWT801Phase();
    
    console.log('\n📊 Summary:');
    console.log('===========');
    console.log(`✅ Phase ${phaseData.phaseId} created successfully`);
    console.log(`🔗 Page ID: ${pageId}`);
    console.log(`📋 Status: ${phaseData.status}`);
    console.log(`🏷️  Tags: ${phaseData.tags.join(', ')}`);
    
    console.log('\n🎉 WT-8.0.1 phase creation complete!');
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

main();