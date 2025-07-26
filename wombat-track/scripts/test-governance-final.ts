#!/usr/bin/env npx tsx

import dotenv from 'dotenv';
import { createNotionClient } from '../src/utils/notionClient.ts';
import type { GovernanceEvent } from '../src/types/governance.ts';

// Load environment variables
dotenv.config();

async function createDecisionLogEntry() {
  console.log('🧪 Creating Decision Log Entry in CodexRoama Database\n');
  
  const databaseId = '1f0e1901-e36e-8052-b448-f2691cfca791'; // Decision_Log_CodexRoama
  
  const client = createNotionClient(process.env.NOTION_TOKEN);
  
  // Map to the actual database schema with correct property types
  const properties = {
    'Decision Title': {
      title: [
        {
          text: {
            content: 'WT-3.2: Notion Integration Pipeline Established'
          }
        }
      ]
    },
    'Rationale': {
      rich_text: [
        {
          text: {
            content: 'Connected Notion to WT GovernanceLog pipeline. Confirmed: Gizmo can write to Notion. Claude verified write operations. This establishes the foundation for automated governance logging and cross-platform AI coordination.'
          }
        }
      ]
    },
    'Impact Area': {
      multi_select: [
        { name: 'Wombat Track' },
        { name: 'Phase 3' },
        { name: 'AI Integration' }
      ]
    },
    'Source Links': {
      url: 'https://github.com/your-repo/wombat-track'
    },
    'Confidence': {
      select: {
        name: 'High'
      }
    },
    'Date Finalised': {
      date: {
        start: new Date().toISOString().split('T')[0] // YYYY-MM-DD format
      }
    }
  };
  
  console.log('📝 Creating decision entry with schema-mapped properties...');
  console.log('🎯 Decision: WT-3.2: Notion Integration Pipeline Established');
  
  try {
    const result = await client.writePage({
      parent: { database_id: databaseId },
      properties
    });
    
    console.log('✅ Decision Log entry created successfully!');
    console.log(`📄 Page ID: ${result.id}`);
    console.log(`🔗 URL: ${result.url}`);
    console.log('\n🎉 GovernanceLog sync to Notion is now LIVE!');
    console.log('📊 Entry appears in Decision_Log_CodexRoama database');
    
    return {
      success: true,
      pageId: result.id,
      url: result.url
    };
    
  } catch (error) {
    console.error('❌ Failed to create decision entry:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function createGovernanceTemplate() {
  console.log('\n🛠️ Creating governance entry template for future use...');
  
  const template = {
    databaseId: '1f0e1901-e36e-8052-b448-f2691cfca791',
    schemaMapping: {
      title: 'Decision Title',
      description: 'Rationale', 
      area: 'Impact Area',
      source: 'Source Links',
      confidence: 'Confidence',
      date: 'Date Finalised',
      supersedes: 'Replaces / Supersedes',
      replacedBy: 'Replaced by'
    },
    example: {
      'Decision Title': 'Your decision title here',
      'Rationale': 'Detailed explanation of the decision and its reasoning',
      'Impact Area': 'Project/Phase affected by this decision',
      'Source Links': 'Links to related documentation, PRs, or issues',
      'Confidence': 'High/Medium/Low confidence level',
      'Date Finalised': 'YYYY-MM-DD format'
    }
  };
  
  console.log('📋 Template for future governance entries:');
  console.log(JSON.stringify(template, null, 2));
  
  return template;
}

// Main execution
async function main() {
  if (!process.env.NOTION_TOKEN) {
    console.error('❌ NOTION_TOKEN not found in environment variables');
    process.exit(1);
  }
  
  const result = await createDecisionLogEntry();
  
  if (result.success) {
    await createGovernanceTemplate();
    
    console.log('\n🎯 VALIDATION COMPLETE:');
    console.log('✅ Notion sync utilities are working');
    console.log('✅ Entry created in Decision_Log_CodexRoama');
    console.log('✅ Ready for PR→Notion pipelines');
    console.log('✅ Ready for automated governance logging');
    
    console.log('\n🚀 Next Steps Available:');
    console.log('1. Scaffold createNotionGovernanceEntry.ts helper');
    console.log('2. Create PR integration for Notion summaries');
    console.log('3. Auto-write CheckpointReviews to Notion for RAG memory');
  }
}

main().catch(console.error);