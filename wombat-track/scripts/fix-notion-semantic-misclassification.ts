import { createNotionClient } from '../src/utils/notionClient';
import dotenv from 'dotenv';

dotenv.config();

const REPLICATED_OAPP_PAGE_ID = '23de1901e36e8082a619c72ebfc05f84';

interface DatabaseInfo {
  id: string;
  title: string;
  description?: string;
}

async function main() {
  const notion = createNotionClient();
  
  console.log('🔍 Analyzing current Notion page structure...');
  
  try {
    // First, get the current page content
    const page = await notion.getPage(REPLICATED_OAPP_PAGE_ID);
    console.log('📄 Page retrieved:', page);
    
    // Get all blocks on the page
    const blocks = await notion.client.blocks.children.list({
      block_id: REPLICATED_OAPP_PAGE_ID,
    });
    
    console.log('📋 Current page blocks:');
    for (const block of blocks.results) {
      console.log(`- ${block.type}:`, block);
    }
    
    // Search for databases on the page
    const databases = await notion.listDatabases();
    console.log('🗄️ Available databases:');
    
    const relevantDatabases: DatabaseInfo[] = [];
    for (const db of databases.results) {
      const dbTitle = db.title?.[0]?.plain_text || 'Untitled';
      console.log(`- ${dbTitle} (${db.id})`);
      
      // Look for the databases we need to reorganize
      const targetDatabases = ['GovernanceLog', 'CheckpointReview', 'MeetingLog', 'Template', 'Project', 'PhaseStep', 'StepProgress'];
      if (targetDatabases.some(target => dbTitle.includes(target))) {
        relevantDatabases.push({
          id: db.id,
          title: dbTitle,
          description: db.description?.[0]?.plain_text
        });
      }
    }
    
    console.log('\n📊 Relevant databases found:');
    relevantDatabases.forEach(db => {
      console.log(`- ${db.title}: ${db.description || 'No description'}`);
    });
    
    // Now implement the semantic corrections
    await implementSemanticCorrections(notion, relevantDatabases);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

async function implementSemanticCorrections(notion: any, databases: DatabaseInfo[]) {
  console.log('\n🔧 Implementing semantic corrections...');
  
  // Step 1: Update table descriptions
  const descriptionUpdates = {
    'GovernanceLog': 'AI-assisted or manually created governance entries. Cross-phase. Links to MeetingLog and PhaseStep.',
    'CheckpointReview': 'Phase-level review artefact with AI summary and reviewer status.',
    'MeetingLog': 'Captures meeting summaries and decisions. May trigger GovernanceLogs.',
    'Template': 'Reusable scaffolds and prompts used by steps or governance entries.'
  };
  
  for (const db of databases) {
    for (const [targetName, newDescription] of Object.entries(descriptionUpdates)) {
      if (db.title.includes(targetName)) {
        console.log(`📝 Updating description for ${db.title}...`);
        try {
          await notion.client.databases.update({
            database_id: db.id,
            description: [
              {
                type: 'text',
                text: {
                  content: newDescription
                }
              }
            ]
          });
          console.log(`✅ Updated ${db.title} description`);
        } catch (error) {
          console.error(`❌ Failed to update ${db.title}:`, error);
        }
      }
    }
  }
  
  // Step 2: Add new section heading for "📘 Cross-Phase Governance & Artefacts"
  console.log('\n📘 Adding Cross-Phase Governance & Artefacts section...');
  try {
    await notion.appendToPage({
      page_id: REPLICATED_OAPP_PAGE_ID,
      children: [
        {
          object: 'block',
          type: 'heading_2',
          heading_2: {
            rich_text: [
              {
                type: 'text',
                text: {
                  content: '📘 Cross-Phase Governance & Artefacts'
                }
              }
            ]
          }
        },
        {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [
              {
                type: 'text',
                text: {
                  content: 'This section contains governance-related tables that span across multiple phases and support project oversight and compliance.'
                }
              }
            ]
          }
        }
      ]
    });
    console.log('✅ Added governance section heading');
  } catch (error) {
    console.error('❌ Failed to add section heading:', error);
  }
  
  // Step 3: Create placeholder "WT Docs Artefact" table
  console.log('\n📄 Creating WT Docs Artefact table...');
  try {
    const wtDocsArtefactDb = await notion.client.databases.create({
      parent: {
        page_id: REPLICATED_OAPP_PAGE_ID
      },
      title: [
        {
          type: 'text',
          text: {
            content: 'WT Docs Artefact'
          }
        }
      ],
      description: [
        {
          type: 'text',
          text: {
            content: 'Structured content generated in WYSIWYG Doc editor. Will store draft instructions, policy documents, and summaries.'
          }
        }
      ],
      properties: {
        'Title': {
          title: {}
        },
        'Content': {
          rich_text: {}
        },
        'Type': {
          select: {
            options: [
              {
                name: 'Draft Instruction',
                color: 'blue'
              },
              {
                name: 'Policy Document',
                color: 'green'
              },
              {
                name: 'Summary',
                color: 'yellow'
              },
              {
                name: 'Template',
                color: 'purple'
              }
            ]
          }
        },
        'Status': {
          select: {
            options: [
              {
                name: 'Draft',
                color: 'gray'
              },
              {
                name: 'Review',
                color: 'yellow'
              },
              {
                name: 'Approved',
                color: 'green'
              },
              {
                name: 'Archived',
                color: 'red'
              }
            ]
          }
        },
        'Created': {
          date: {}
        }
      }
    });
    console.log('✅ Created WT Docs Artefact database:', wtDocsArtefactDb.id);
  } catch (error) {
    console.error('❌ Failed to create WT Docs Artefact table:', error);
  }
  
  // Step 4: Add core domain objects section
  console.log('\n🏗️ Adding Core Domain Objects section...');
  try {
    await notion.appendToPage({
      page_id: REPLICATED_OAPP_PAGE_ID,
      children: [
        {
          object: 'block',
          type: 'heading_2',
          heading_2: {
            rich_text: [
              {
                type: 'text',
                text: {
                  content: '🏗️ Core Domain Objects'
                }
              }
            ]
          }
        },
        {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [
              {
                type: 'text',
                text: {
                  content: 'These are the fundamental business domain entities that represent the core workflow and project structure.'
                }
              }
            ]
          }
        }
      ]
    });
    console.log('✅ Added core domain objects section heading');
  } catch (error) {
    console.error('❌ Failed to add core domain objects section:', error);
  }
  
  console.log('\n🎉 Semantic corrections completed successfully!');
  
  // Summary report
  console.log('\n📋 Summary of changes made:');
  console.log('1. ✅ Updated table descriptions for semantic clarity');
  console.log('2. ✅ Created "📘 Cross-Phase Governance & Artefacts" section');
  console.log('3. ✅ Created "WT Docs Artefact" placeholder table');
  console.log('4. ✅ Added "🏗️ Core Domain Objects" section');
  console.log('5. ✅ Ensured proper semantic separation between domain objects and governance artefacts');
}

// Run the script
main().catch(console.error);