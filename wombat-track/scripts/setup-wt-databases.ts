#!/usr/bin/env npx tsx

import dotenv from 'dotenv';
import { createWombatTrackDatabases } from '../src/utils/notionDatabaseCreator.ts';
import { createNotionClient } from '../src/utils/notionClient.ts';

dotenv.config();

async function findOrCreateParentPage() {
  const client = createNotionClient();
  
  console.log('🔍 Looking for existing WT App N-Test page or creating new workspace...');
  
  try {
    // Search for existing page
    const searchResponse = await client.client.search({
      query: 'WT App N-Test',
      filter: {
        value: 'page',
        property: 'object',
      },
    });

    if (searchResponse.results.length > 0) {
      const page = searchResponse.results[0];
      console.log(`✅ Found existing page: ${page.id}`);
      return page.id;
    }

    // If not found, create a new page in the first available workspace
    console.log('📄 Creating new Wombat Track OS workspace page...');
    
    // Get user's workspace
    const user = await client.getUser();
    
    // Create a new page
    const newPage = await client.client.pages.create({
      parent: { type: 'workspace', workspace: true },
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
                  content: 'Central hub for Wombat Track project data, phases, and governance logs.',
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
      ],
    });

    console.log(`✅ Created new workspace page: ${newPage.id}`);
    return newPage.id;

  } catch (error) {
    console.error('❌ Error finding/creating parent page:', error);
    throw error;
  }
}

async function setupDatabases() {
  console.log('🚀 Wombat Track Notion Database Setup\n');

  if (!process.env.NOTION_TOKEN) {
    console.error('❌ NOTION_TOKEN not found in environment variables');
    process.exit(1);
  }

  try {
    // Find or create parent page
    const parentPageId = await findOrCreateParentPage();
    
    console.log('\n📊 Creating Wombat Track databases...\n');

    // Create all databases
    const results = await createWombatTrackDatabases(
      process.env.NOTION_TOKEN,
      parentPageId
    );

    console.log('\n✅ Database Creation Summary:\n');

    if (results.projectDb) {
      console.log('📊 Project Database:');
      console.log(`   ID: ${results.projectDb.id}`);
      console.log(`   URL: ${results.projectDb.url}`);
    }

    if (results.phaseDb) {
      console.log('\n📊 Phase Database:');
      console.log(`   ID: ${results.phaseDb.id}`);
      console.log(`   URL: ${results.phaseDb.url}`);
    }

    if (results.phaseStepDb) {
      console.log('\n📊 PhaseStep Database:');
      console.log(`   ID: ${results.phaseStepDb.id}`);
      console.log(`   URL: ${results.phaseStepDb.url}`);
    }

    if (results.governanceDb) {
      console.log('\n📊 Enhanced Governance Database:');
      console.log(`   ID: ${results.governanceDb.id}`);
      console.log(`   URL: ${results.governanceDb.url}`);
    }

    if (results.errors.length > 0) {
      console.log('\n⚠️  Errors encountered:');
      results.errors.forEach(error => console.log(`   - ${error}`));
    }

    // Save database IDs to env file
    console.log('\n💾 Saving database IDs to .env.wt-databases...');
    
    const envContent = `# Wombat Track Notion Database IDs
# Generated on ${new Date().toISOString()}

NOTION_WT_PROJECT_DB_ID=${results.projectDb?.id || ''}
NOTION_WT_PHASE_DB_ID=${results.phaseDb?.id || ''}
NOTION_WT_PHASE_STEP_DB_ID=${results.phaseStepDb?.id || ''}
NOTION_WT_GOVERNANCE_DB_ID=${results.governanceDb?.id || ''}

# Parent Page ID
NOTION_WT_PARENT_PAGE_ID=${parentPageId}
`;

    await import('fs/promises').then(fs => 
      fs.writeFile('.env.wt-databases', envContent)
    );

    console.log('✅ Database IDs saved to .env.wt-databases');

    console.log('\n🎯 Setup Complete!');
    console.log('\n📋 Next Steps:');
    console.log('1. Visit the Notion pages to see the created databases');
    console.log('2. Add sample data to test relationships');
    console.log('3. Use the database IDs in your sync operations');
    console.log('4. Configure RAG governance templates in the Enhanced Governance DB');

  } catch (error) {
    console.error('💥 Setup failed:', error);
    process.exit(1);
  }
}

setupDatabases().catch(console.error);