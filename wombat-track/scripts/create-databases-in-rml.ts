#!/usr/bin/env npx tsx

import dotenv from 'dotenv';
import { createNotionClient } from '../src/utils/notionClient.ts';
import { NotionDatabaseCreator } from '../src/utils/notionDatabaseCreator.ts';

dotenv.config();

async function createDatabasesInRML() {
  console.log('🚀 Creating Wombat Track databases in RML Projects page\n');

  const client = createNotionClient();
  const parentPageId = 'd422495e-b647-40d6-8b01-f9356fc5de78'; // RML Projects page
  
  try {
    // First, add a section to the RML Projects page
    console.log('📝 Adding Wombat Track section to RML Projects page...');
    
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
      ],
    });

    const creator = new NotionDatabaseCreator(process.env.NOTION_TOKEN!, parentPageId);
    const databases: Array<{ name: string; result: any }> = [];

    // Create all databases
    console.log('\n📊 Creating databases...\n');

    // Project Database
    console.log('1️⃣ Creating WT Projects database...');
    const projectDb = await creator.createDatabase(NotionDatabaseCreator.getProjectSchema());
    databases.push({ name: 'WT Projects', result: projectDb });
    if (projectDb.success) console.log(`   ✅ Created: ${projectDb.url}`);

    // Phase Database
    if (projectDb.success) {
      console.log('\n2️⃣ Creating WT Phases database...');
      const phaseDb = await creator.createDatabase(
        NotionDatabaseCreator.getPhaseSchema(projectDb.databaseId)
      );
      databases.push({ name: 'WT Phases', result: phaseDb });
      if (phaseDb.success) console.log(`   ✅ Created: ${phaseDb.url}`);
    }

    // PhaseStep Database
    if (projectDb.success) {
      console.log('\n3️⃣ Creating WT Phase Steps database...');
      const stepDb = await creator.createDatabase(
        NotionDatabaseCreator.getPhaseStepSchema(projectDb.databaseId)
      );
      databases.push({ name: 'WT Phase Steps', result: stepDb });
      if (stepDb.success) console.log(`   ✅ Created: ${stepDb.url}`);

      // Enhanced Governance Database
      if (stepDb.success) {
        console.log('\n4️⃣ Creating WT Governance Log database...');
        const govDb = await creator.createDatabase(
          NotionDatabaseCreator.getEnhancedGovernanceSchema(stepDb.databaseId)
        );
        databases.push({ name: 'WT Governance Log (Enhanced)', result: govDb });
        if (govDb.success) console.log(`   ✅ Created: ${govDb.url}`);
      }
    }

    // Claude-Gizmo Communication Database
    console.log('\n5️⃣ Creating Claude-Gizmo Communication database...');
    const commDb = await creator.createDatabase({
      name: '🤖 Claude-Gizmo Communication',
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
    if (commDb.success) console.log(`   ✅ Created: ${commDb.url}`);

    // Add database links to the page
    console.log('\n📝 Adding database links to RML Projects page...');
    
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
                content: `${db.name}`,
              },
            },
          ],
        },
      }));

    await client.appendToPage({
      page_id: parentPageId,
      children: [
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
                  content: 'Messages marked as "read" → "responded" when processed',
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
                  content: 'Thread ID tracks conversation context',
                },
              },
            ],
          },
        },
      ],
    });

    // Save database IDs
    console.log('\n💾 Saving database IDs...');
    
    const envContent = `# Wombat Track Notion Database IDs
# Generated on ${new Date().toISOString()}

# Parent Page
NOTION_WT_PARENT_PAGE_ID=${parentPageId}
NOTION_WT_PARENT_PAGE_URL=https://www.notion.so/RML-Projects-d422495eb64740d68b01f9356fc5de78

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

    // Summary
    console.log('\n✅ Setup Complete!\n');
    console.log('📄 Parent Page (RML Projects):');
    console.log('   https://www.notion.so/RML-Projects-d422495eb64740d68b01f9356fc5de78\n');
    
    console.log('🤖 Claude-Gizmo Communication Database:');
    console.log(`   ${commDb.url}\n`);
    
    console.log('📊 All Databases Created:');
    databases.forEach(db => {
      if (db.result.success) {
        console.log(`   ✅ ${db.name}`);
      }
    });

    // Send first test message
    if (commDb.success) {
      console.log('\n📨 Sending test message to Gizmo...');
      
      const testMessage = await client.writePage({
        parent: { database_id: commDb.databaseId },
        properties: {
          'Message': {
            title: [{ text: { content: 'Hello Gizmo! Claude-Gizmo communication channel established.' } }],
          },
          'Full Content': {
            rich_text: [{ text: { content: 'This is a test message from Claude. The communication database has been successfully created. You can now poll this database for messages where Sender = "Claude" and Status = "unread".' } }],
          },
          'Context': {
            rich_text: [{ text: { content: 'Initial setup and testing' } }],
          },
          'Sender': {
            select: { name: 'Claude' },
          },
          'Priority': {
            select: { name: 'medium' },
          },
          'Status': {
            select: { name: 'unread' },
          },
          'Expects Response': {
            checkbox: true,
          },
          'Timestamp': {
            date: { start: new Date().toISOString() },
          },
          'Thread ID': {
            rich_text: [{ text: { content: 'thread-001-setup' } }],
          },
        },
      });

      console.log('✅ Test message sent!');
      console.log(`   ${testMessage.url}`);
    }

    return {
      parentPageUrl: 'https://www.notion.so/RML-Projects-d422495eb64740d68b01f9356fc5de78',
      claudeGizmoDbUrl: commDb.url,
    };

  } catch (error) {
    console.error('💥 Error:', error);
    throw error;
  }
}

// Execute
createDatabasesInRML()
  .then(result => {
    console.log('\n🎉 SUCCESS! Links for you:');
    console.log('─'.repeat(50));
    console.log(`📄 RML Projects Page (with WT databases):`);
    console.log(`   ${result.parentPageUrl}`);
    console.log(`\n🤖 Claude-Gizmo Communication Database:`);
    console.log(`   ${result.claudeGizmoDbUrl}`);
    console.log('─'.repeat(50));
  })
  .catch(console.error);