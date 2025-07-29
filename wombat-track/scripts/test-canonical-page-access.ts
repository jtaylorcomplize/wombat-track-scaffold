#!/usr/bin/env npx tsx

import dotenv from 'dotenv';
import { createNotionClient } from '../src/utils/notionClient.ts';

dotenv.config();

async function testCanonicalPageAccess() {
  console.log('🔍 Testing access to Canonical Notion WT App page...\n');

  const client = createNotionClient();
  const canonicalPageId = '23ce1901-e36e-805b-bf5e-e42eb1204a13';
  
  try {
    console.log('📄 Attempting to access canonical page...');
    const page = await client.getPage(canonicalPageId);
    
    console.log('✅ SUCCESS! I can access the canonical page.');
    console.log(`📄 Page ID: ${page.id}`);
    console.log(`🔗 URL: ${page.url}`);
    console.log('\n🎯 Ready to move databases to this page!');
    
    return { success: true, pageId: page.id, url: page.url };
    
  } catch (error) {
    console.log('❌ CANNOT ACCESS the canonical page.');
    console.log(`Error: ${error}`);
    
    if (error.toString().includes('Unauthorized') || error.toString().includes('404')) {
      console.log('\n🔐 SHARING REQUIRED:');
      console.log('Please add the integration to this page:');
      console.log('1. Go to: https://www.notion.so/roammigrationlaw/Canonical-Notion-WT-App-23ce1901e36e805bbf5ee42eb1204a13');
      console.log('2. Click "Share" button (top right)');
      console.log('3. Click "Invite" and search for "ChatGPT Codex Roama"');
      console.log('4. Give it "Can edit" permissions');
      console.log('5. Run this test again');
    }
    
    return { success: false, error: error.toString() };
  }
}

testCanonicalPageAccess()
  .then(result => {
    if (!result.success) {
      console.log('\n⚠️  Cannot proceed with database migration until access is granted.');
    }
  })
  .catch(console.error);