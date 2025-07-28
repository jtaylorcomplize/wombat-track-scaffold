#!/usr/bin/env npx tsx

import dotenv from 'dotenv';
import { createNotionClient } from '../src/utils/notionClient.ts';
import { NotionDatabaseCreator } from '../src/utils/notionDatabaseCreator.ts';

dotenv.config();

async function createAllDatabases() {
  console.log('🚀 Creating Wombat Track Notion Workspace with Claude-Gizmo Communication\n');

  const client = createNotionClient();
  
  try {
    // Step 1: Create parent page
    console.log('📄 Creating Wombat Track OS parent page...');
    
    const parentPage = await client.client.pages.create({
      parent: { type: 'workspace', workspace: true },
      icon: {
        type: 'emoji',
        emoji: '🦫'
      },
      properties: {
        title: {
          title: [
            {
              text: {
                content: 'Wombat Track OS',
              },
            },
          ],
        },
      },
      children: [
        {
          object: 'block',
          type: 'heading_1',
          heading_1: {
            rich_text: [
              {
                text: {
                  content: '🦫 Wombat Track Operating System',
                },
              },
            ],
          },
        },
        {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [
              {
                text: {
                  content: 'Central hub for Wombat Track project data, phases, governance logs, and AI agent communication.',
                },
              },
            ],
          },
        },
        {
          object: 'block',
          type: 'divider',
          divider: {},
        },
        {
          object: 'block',
          type: 'heading_2',
          heading_2: {
            rich_text: [
              {
                text: {
                  content: '📊 Databases',
                },
              },
            ],
          },
        },
        {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [
              {
                text: {
                  content: 'Database links will be added below as they are created...',
                },
              },
            ],
          },
        },
      ],
    });

    console.log(`✅ Parent page created: ${parentPage.id}`);
    console.log(`🔗 URL: ${parentPage.url}\n`);

    const parentPageId = parentPage.id;
    const creator = new NotionDatabaseCreator(process.env.NOTION_TOKEN!, parentPageId);

    // Step 2: Create databases
    const databases: Array<{ name: string; result: any }> = [];

    // Project Database
    console.log('📊 Creating Project database...');
    const projectDb = await creator.createDatabase(NotionDatabaseCreator.getProjectSchema());
    databases.push({ name: 'WT Projects', result: projectDb });

    // Phase Database
    if (projectDb.success) {
      console.log('📊 Creating Phase database...');
      const phaseDb = await creator.createDatabase(
        NotionDatabaseCreator.getPhaseSchema(projectDb.databaseId)
      );
      databases.push({ name: 'WT Phases', result: phaseDb });
    }

    // PhaseStep Database
    if (projectDb.success) {
      console.log('📊 Creating PhaseStep database...');
      const stepDb = await creator.createDatabase(
        NotionDatabaseCreator.getPhaseStepSchema(projectDb.databaseId)
      );
      databases.push({ name: 'WT Phase Steps', result: stepDb });

      // Enhanced Governance Database
      if (stepDb.success) {
        console.log('📊 Creating Enhanced Governance database...');
        const govDb = await creator.createDatabase(
          NotionDatabaseCreator.getEnhancedGovernanceSchema(stepDb.databaseId)
        );
        databases.push({ name: 'WT Governance Log (Enhanced)', result: govDb });
      }
    }

    // Claude-Gizmo Communication Database
    console.log('📊 Creating Claude-Gizmo Communication database...');
    const commDb = await creator.createDatabase({
      name: 'Claude-Gizmo Communication',
      description: 'Async message queue for AI agent communication',
      properties: {
        'Message': {
          title: {},
        },
        'Full Content': {
          rich_text: {},
        },
        'Context': {
          rich_text: {},
        },
        'Sender': {
          select: {
            options: [
              { name: 'Claude', color: 'purple' },
              { name: 'Gizmo', color: 'green' },
              { name: 'User', color: 'blue' },
              { name: 'System', color: 'gray' },
            ],
          },
        },
        'Priority': {
          select: {
            options: [
              { name: 'low', color: 'gray' },
              { name: 'medium', color: 'yellow' },
              { name: 'high', color: 'orange' },
              { name: 'urgent', color: 'red' },
            ],
          },
        },
        'Status': {
          select: {
            options: [
              { name: 'unread', color: 'red' },
              { name: 'read', color: 'yellow' },
              { name: 'responded', color: 'green' },
              { name: 'archived', color: 'gray' },
            ],
          },
        },
        'Expects Response': {
          checkbox: {},
        },
        'Response Link': {
          url: {},
        },
        'Timestamp': {
          date: {},
        },
        'Thread ID': {
          rich_text: {},
        },
      },
    });
    databases.push({ name: 'Claude-Gizmo Communication', result: commDb });

    // Step 3: Update parent page with database links
    console.log('\n📝 Adding database links to parent page...');
    
    const databaseBlocks = databases
      .filter(db => db.result.success)
      .map(db => ({
        object: 'block' as const,
        type: 'bookmark' as const,
        bookmark: {
          url: db.result.url,
          caption: [
            {
              text: {
                content: `${db.name} - ID: ${db.result.databaseId}`,
              },
            },
          ],
        },
      }));

    await client.appendToPage({
      page_id: parentPageId,
      children: [
        {
          object: 'block',
          type: 'divider',
          divider: {},
        },
        {
          object: 'block',
          type: 'heading_3',
          heading_3: {
            rich_text: [
              {
                text: {
                  content: '🔗 Database Links',
                },
              },
            ],
          },
        },
        ...databaseBlocks,
        {
          object: 'block',
          type: 'divider',
          divider: {},
        },
        {
          object: 'block',
          type: 'heading_3',
          heading_3: {
            rich_text: [
              {
                text: {
                  content: '🤖 Claude-Gizmo Communication Protocol',
                },
              },
            ],
          },
        },
        {
          object: 'block',
          type: 'numbered_list_item',
          numbered_list_item: {
            rich_text: [
              {
                text: {
                  content: 'Claude sends messages with "Claude" as sender',
                },
              },
            ],
          },
        },
        {
          object: 'block',
          type: 'numbered_list_item',
          numbered_list_item: {
            rich_text: [
              {
                text: {
                  content: 'Gizmo polls for unread messages where sender = "Claude"',
                },
              },
            ],
          },
        },
        {
          object: 'block',
          type: 'numbered_list_item',
          numbered_list_item: {
            rich_text: [
              {
                text: {
                  content: 'Gizmo marks messages as "read" and optionally "responded"',
                },
              },
            ],
          },
        },
        {
          object: 'block',
          type: 'numbered_list_item',
          numbered_list_item: {
            rich_text: [
              {
                text: {
                  content: 'Both agents can check thread history via Thread ID',
                },
              },
            ],
          },
        },
      ],
    });

    // Step 4: Save database IDs
    console.log('\n💾 Saving database IDs...');
    
    const envContent = `# Wombat Track Notion Database IDs
# Generated on ${new Date().toISOString()}

# Parent Page
NOTION_WT_PARENT_PAGE_ID=${parentPageId}
NOTION_WT_PARENT_PAGE_URL=${parentPage.url}

# Core Databases
NOTION_WT_PROJECT_DB_ID=${databases.find(d => d.name === 'WT Projects')?.result.databaseId || ''}
NOTION_WT_PHASE_DB_ID=${databases.find(d => d.name === 'WT Phases')?.result.databaseId || ''}
NOTION_WT_PHASE_STEP_DB_ID=${databases.find(d => d.name === 'WT Phase Steps')?.result.databaseId || ''}
NOTION_WT_GOVERNANCE_DB_ID=${databases.find(d => d.name === 'WT Governance Log (Enhanced)')?.result.databaseId || ''}

# Claude-Gizmo Communication
NOTION_CLAUDE_GIZMO_DB_ID=${commDb.databaseId || ''}
NOTION_CLAUDE_GIZMO_DB_URL=${commDb.url || ''}
`;

    const fs = await import('fs/promises');
    await fs.writeFile('.env.wt-databases', envContent);

    // Step 5: Summary
    console.log('\n✅ Setup Complete!\n');
    console.log('🦫 Wombat Track OS Page:');
    console.log(`   ${parentPage.url}\n`);
    
    console.log('📊 Databases Created:');
    databases.forEach(db => {
      if (db.result.success) {
        console.log(`   ✅ ${db.name}`);
        console.log(`      ${db.result.url}`);
      } else {
        console.log(`   ❌ ${db.name}: ${db.result.error}`);
      }
    });

    console.log('\n🤖 Claude-Gizmo Communication:');
    console.log(`   Database: ${commDb.url}`);
    console.log('   Ready for async AI agent messaging!');

    return {
      parentPageUrl: parentPage.url,
      claudeGizmoDbUrl: commDb.url,
    };

  } catch (error) {
    console.error('💥 Error:', error);
    throw error;
  }
}

// Execute
createAllDatabases()
  .then(result => {
    console.log('\n📋 Links for sharing:');
    console.log(`Parent Page: ${result.parentPageUrl}`);
    console.log(`Claude-Gizmo DB: ${result.claudeGizmoDbUrl}`);
  })
  .catch(console.error);