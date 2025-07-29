#!/usr/bin/env tsx

import { createNotionClient } from '../src/utils/notionClient';

const notion = createNotionClient();

const WT_APPS_PAGE_ID = '23ee1901e36e807fa230cf96d519f314';

async function createSubAppsDatabase() {
  console.log('🧱 Creating Sub-Apps database in WT-Apps page...');
  
  try {
    // First, let's find the WT Projects database ID for the relation
    console.log('🔍 Searching for WT Projects database...');
    
    const search = await notion.client.search({
      query: 'WT Projects',
      filter: { property: 'object', value: 'database' }
    });
    
    let wtProjectsDbId = null;
    for (const result of search.results) {
      if (result.object === 'database' && 'title' in result && result.title?.[0]?.plain_text === 'WT Projects') {
        wtProjectsDbId = result.id;
        console.log(`✅ Found WT Projects database: ${wtProjectsDbId}`);
        break;
      }
    }
    
    if (!wtProjectsDbId) {
      console.log('⚠️  Could not find WT Projects database, proceeding without relation...');
    }

    // Create the Sub-Apps database
    const databaseResponse = await notion.client.databases.create({
      parent: {
        type: 'page_id',
        page_id: WT_APPS_PAGE_ID,
      },
      title: [
        {
          type: 'text',
          text: {
            content: 'Sub-Apps',
          },
        },
      ],
      properties: {
        subAppName: {
          title: {},
        },
        description: {
          rich_text: {},
        },
        status: {
          select: {
            options: [
              { name: 'Planning', color: 'yellow' },
              { name: 'Active', color: 'green' },
              { name: 'Paused', color: 'orange' },
              { name: 'Retired', color: 'red' }
            ]
          }
        },
        ...(wtProjectsDbId && {
          linkedProjects: {
            relation: {
              database_id: wtProjectsDbId,
              single_property: {}
            }
          }
        }),
        primaryLead: {
          people: {},
        },
        programType: {
          select: {
            options: [
              { name: 'Core', color: 'purple' },
              { name: 'Sub-App', color: 'blue' },
              { name: 'External', color: 'gray' },
              { name: 'White Label', color: 'pink' }
            ]
          }
        },
        platformIntegration: {
          multi_select: {
            options: [
              { name: 'Claude', color: 'purple' },
              { name: 'GitHub', color: 'gray' },
              { name: 'DriveMemory', color: 'blue' },
              { name: 'Notion', color: 'red' },
              { name: 'Vercel', color: 'green' },
              { name: 'Supabase', color: 'orange' },
              { name: 'OpenAI', color: 'yellow' }
            ]
          }
        },
        launchDate: {
          date: {},
        },
        usesOrbisEngine: {
          checkbox: {},
        },
        orbisDependencyLevel: {
          select: {
            options: [
              { name: 'None', color: 'gray' },
              { name: 'Partial', color: 'yellow' },
              { name: 'Full', color: 'green' }
            ]
          }
        },
        notes: {
          rich_text: {},
        }
      },
    });

    console.log(`✅ Sub-Apps database created: ${databaseResponse.id}`);
    
    // Add sample entries
    console.log('📝 Adding sample entries...');
    
    // 1. Orbis
    await notion.client.pages.create({
      parent: { database_id: databaseResponse.id },
      properties: {
        subAppName: {
          title: [{ text: { content: 'Orbis' } }]
        },
        description: {
          rich_text: [{ text: { content: 'Core governance and coordination platform for AI-human collaboration' } }]
        },
        status: {
          select: { name: 'Active' }
        },
        programType: {
          select: { name: 'Core' }
        },
        platformIntegration: {
          multi_select: [
            { name: 'Claude' },
            { name: 'Notion' },
            { name: 'GitHub' }
          ]
        },
        usesOrbisEngine: {
          checkbox: true
        },
        orbisDependencyLevel: {
          select: { name: 'Full' }
        },
        notes: {
          rich_text: [{ text: { content: 'Primary platform - all other sub-apps derive from Orbis architecture' } }]
        }
      }
    });
    
    // 2. Complize
    await notion.client.pages.create({
      parent: { database_id: databaseResponse.id },
      properties: {
        subAppName: {
          title: [{ text: { content: 'Complize' } }]
        },
        description: {
          rich_text: [{ text: { content: 'Immigration compliance and case management platform' } }]
        },
        status: {
          select: { name: 'Active' }
        },
        programType: {
          select: { name: 'Sub-App' }
        },
        platformIntegration: {
          multi_select: [
            { name: 'Claude' },
            { name: 'Notion' },
            { name: 'DriveMemory' }
          ]
        },
        usesOrbisEngine: {
          checkbox: true
        },
        orbisDependencyLevel: {
          select: { name: 'Full' }
        },
        notes: {
          rich_text: [{ text: { content: 'Client-facing application built on Orbis infrastructure' } }]
        }
      }
    });
    
    // 3. MetaPlatform
    await notion.client.pages.create({
      parent: { database_id: databaseResponse.id },
      properties: {
        subAppName: {
          title: [{ text: { content: 'MetaPlatform' } }]
        },
        description: {
          rich_text: [{ text: { content: 'Universal platform integration and workflow orchestration system' } }]
        },
        status: {
          select: { name: 'Planning' }
        },
        programType: {
          select: { name: 'Sub-App' }
        },
        platformIntegration: {
          multi_select: [
            { name: 'Claude' },
            { name: 'GitHub' },
            { name: 'Notion' },
            { name: 'Vercel' }
          ]
        },
        usesOrbisEngine: {
          checkbox: true
        },
        orbisDependencyLevel: {
          select: { name: 'Full' }
        },
        notes: {
          rich_text: [{ text: { content: 'Next-generation platform for cross-system integration and AI orchestration' } }]
        }
      }
    });
    
    console.log('✅ Sample entries added successfully');
    console.log('\n🎯 Sub-Apps database creation complete!');
    console.log(`📍 Database URL: https://notion.so/${databaseResponse.id.replace(/-/g, '')}`);
    console.log(`📍 Parent page: https://notion.so/roammigrationlaw/WT-Apps-${WT_APPS_PAGE_ID.replace(/-/g, '')}`);
    
  } catch (error) {
    console.error('❌ Error creating Sub-Apps database:', error);
    throw error;
  }
}

// Execute if run directly
createSubAppsDatabase().catch(console.error);

export { createSubAppsDatabase };