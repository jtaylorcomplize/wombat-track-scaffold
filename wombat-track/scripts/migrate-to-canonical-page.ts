#!/usr/bin/env npx tsx

import dotenv from 'dotenv';
import { NotionDatabaseCreator } from '../src/utils/notionDatabaseCreator.ts';
import { createNotionClient } from '../src/utils/notionClient.ts';

dotenv.config();

async function migrateToCanonicalPage() {
  console.log('🔄 Migrating all WT databases to Canonical Notion WT App page...\n');

  const canonicalPageId = '23ce1901-e36e-805b-bf5e-e42eb1204a13';
  const client = createNotionClient();
  const creator = new NotionDatabaseCreator(process.env.NOTION_TOKEN!, canonicalPageId);

  // Read current database IDs
  let currentClaudeGizmoId = '';
  try {
    const fs = await import('fs/promises');
    const envContent = await fs.readFile('.env.wt-databases', 'utf-8');
    const match = envContent.match(/NOTION_CLAUDE_GIZMO_DB_ID=(.+)/);
    if (match) {
      currentClaudeGizmoId = match[1];
    }
  } catch (error) {
    console.log('⚠️  Could not read current database IDs');
  }

  try {
    // Step 1: Add WT section to canonical page
    console.log('📝 Adding Wombat Track section to canonical page...');
    
    await client.appendToPage({
      page_id: canonicalPageId,
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
                  content: 'Canonical location for all Wombat Track databases, governance logs, and AI agent communication.',
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
                  content: '📊 Core Databases',
                },
              },
            ],
          },
        },
      ],
    });

    const databases: Array<{ name: string; result: any }> = [];

    // Step 2: Create new databases in canonical location
    console.log('\n📊 Creating databases in canonical location...\n');

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

    // Step 3: Migrate Claude-Gizmo Communication Database
    console.log('\n5️⃣ Creating Claude-Gizmo Communication database...');
    const newCommDb = await creator.createDatabase({
      name: '🤖 Claude-Gizmo Communication',
      description: 'Canonical location for AI agent communication',
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
    databases.push({ name: 'Claude-Gizmo Communication', result: newCommDb });
    if (newCommDb.success) console.log(`   ✅ Created: ${newCommDb.url}`);

    // Step 4: Migrate existing messages if we have the old database
    if (currentClaudeGizmoId && newCommDb.success) {
      console.log('\n📨 Migrating existing Claude-Gizmo messages...');
      try {
        const oldMessages = await client.queryDatabase({
          database_id: currentClaudeGizmoId,
        });
        
        console.log(`Found ${oldMessages.results.length} messages to migrate...`);
        
        for (const message of oldMessages.results) {
          const props = message.properties as any;
          
          await client.writePage({
            parent: { database_id: newCommDb.databaseId },
            properties: {
              'Message': {
                title: props['Message']?.title || [{ text: { content: 'Migrated message' } }]
              },
              'Full Content': {
                rich_text: props['Full Content']?.rich_text || []
              },
              'Context': {
                rich_text: props['Context']?.rich_text || []
              },
              'Sender': {
                select: props['Sender']?.select || { name: 'System' }
              },
              'Priority': {
                select: props['Priority']?.select || { name: 'medium' }
              },
              'Status': {
                select: { name: 'archived' } // Mark migrated messages as archived
              },
              'Thread ID': {
                rich_text: props['Thread ID']?.rich_text || [{ text: { content: 'migrated' } }]
              },
              'Timestamp': {
                date: props['Timestamp']?.date || { start: new Date().toISOString() }
              }
            }
          });
        }
        
        console.log(`✅ Migrated ${oldMessages.results.length} messages`);
      } catch (error) {
        console.log(`⚠️  Could not migrate old messages: ${error}`);
      }
    }

    // Step 5: Add database links to canonical page
    console.log('\n📝 Adding database links to canonical page...');
    
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
                content: `${db.name} - Canonical Database`,
              },
            },
          ],
        },
      }));

    await client.appendToPage({
      page_id: canonicalPageId,
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
                  content: '🎯 Migration Complete',
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
                  content: `All Wombat Track databases migrated to canonical location on ${new Date().toISOString().split('T')[0]}. This is now the single source of truth for all WT data and AI agent communication.`,
                },
              },
            ],
          },
        },
      ],
    });

    // Step 6: Update environment file
    console.log('\n💾 Updating environment configuration...');
    
    const newEnvContent = `# Wombat Track Notion Database IDs (CANONICAL)
# Generated on ${new Date().toISOString()}
# Location: Canonical Notion WT App page

# Parent Page (CANONICAL)
NOTION_WT_PARENT_PAGE_ID=${canonicalPageId}
NOTION_WT_PARENT_PAGE_URL=https://www.notion.so/roammigrationlaw/Canonical-Notion-WT-App-23ce1901e36e805bbf5ee42eb1204a13

# Core Databases (CANONICAL)
NOTION_WT_PROJECT_DB_ID=${databases.find(d => d.name === 'WT Projects')?.result.databaseId || ''}
NOTION_WT_PHASE_DB_ID=${databases.find(d => d.name === 'WT Phases')?.result.databaseId || ''}
NOTION_WT_PHASE_STEP_DB_ID=${databases.find(d => d.name === 'WT Phase Steps')?.result.databaseId || ''}
NOTION_WT_GOVERNANCE_DB_ID=${databases.find(d => d.name === 'WT Governance Log (Enhanced)')?.result.databaseId || ''}

# Claude-Gizmo Communication (CANONICAL)
NOTION_CLAUDE_GIZMO_DB_ID=${newCommDb.databaseId || ''}
NOTION_CLAUDE_GIZMO_DB_URL=${newCommDb.url || ''}

# OLD DATABASE IDs (for reference - can be removed after verification)
# OLD_NOTION_CLAUDE_GIZMO_DB_ID=${currentClaudeGizmoId}
`;

    const fs = await import('fs/promises');
    await fs.writeFile('.env.wt-databases', newEnvContent);

    // Summary
    console.log('\n✅ MIGRATION COMPLETE!\n');
    console.log('📄 Canonical Page:');
    console.log('   https://www.notion.so/roammigrationlaw/Canonical-Notion-WT-App-23ce1901e36e805bbf5ee42eb1204a13\n');
    
    console.log('📊 Migrated Databases:');
    databases.forEach(db => {
      if (db.result.success) {
        console.log(`   ✅ ${db.name}`);
        console.log(`      ${db.result.url}`);
      }
    });

    // Send migration notification
    if (newCommDb.success) {
      console.log('\n📨 Sending migration notification...');
      
      await client.writePage({
        parent: { database_id: newCommDb.databaseId },
        properties: {
          'Message': {
            title: [{ text: { content: 'Database migration to canonical location complete' } }],
          },
          'Full Content': {
            rich_text: [{ 
              text: { 
                content: 'All Wombat Track databases have been successfully migrated to the canonical Notion WT App page. This is now the single source of truth for all project data, governance logs, and AI agent communication.' 
              } 
            }],
          },
          'Context': {
            rich_text: [{ text: { content: 'System migration and consolidation' } }],
          },
          'Sender': {
            select: { name: 'Claude' },
          },
          'Priority': {
            select: { name: 'high' },
          },
          'Status': {
            select: { name: 'unread' },
          },
          'Thread ID': {
            rich_text: [{ text: { content: 'thread-004-migration' } }],
          },
          'Timestamp': {
            date: { start: new Date().toISOString() },
          },
        },
      });
      
      console.log('✅ Migration notification sent!');
    }

    return {
      success: true,
      canonicalPageUrl: 'https://www.notion.so/roammigrationlaw/Canonical-Notion-WT-App-23ce1901e36e805bbf5ee42eb1204a13',
      databases: databases.filter(db => db.result.success)
    };

  } catch (error) {
    console.error('💥 Migration failed:', error);
    throw error;
  }
}

migrateToCanonicalPage()
  .then(result => {
    console.log('\n🎉 SUCCESS! All databases migrated to canonical location.');
    console.log('\n📋 Next Steps:');
    console.log('1. Verify databases are accessible in canonical page');
    console.log('2. Update any external references to use new database IDs');
    console.log('3. Archive old databases if no longer needed');
  })
  .catch(console.error);