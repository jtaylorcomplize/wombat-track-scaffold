#!/usr/bin/env npx tsx

/**
 * Check Temp Holding Table Schema
 * 
 * This script queries the Temp Holding Table to see its actual schema
 */

import { createNotionClient } from '../src/utils/notionClient.js';
import dotenv from 'dotenv';

dotenv.config();

const TEMP_HOLDING_TABLE_ID = '23de1901-e36e-81e2-bff2-ca4451f734ec';

async function checkSchema() {
  const notionClient = createNotionClient(process.env.NOTION_TOKEN);
  
  try {
    console.log('🔍 Checking Temp Holding Table schema...');
    
    const database = await notionClient.client.databases.retrieve({
      database_id: TEMP_HOLDING_TABLE_ID
    });
    
    console.log('\n📋 Database Properties:');
    for (const [propertyName, propertyConfig] of Object.entries(database.properties)) {
      console.log(`   - ${propertyName}: ${propertyConfig.type}`);
    }
    
    console.log('\n🎯 Available for our workflow:');
    const availableProps = Object.keys(database.properties);
    const requiredFields = ['blockId', 'sourceDocument', 'sourceURL', 'headingContext', 'classifiedType', 'canonicalTag', 'rawContent', 'needsReview'];
    
    for (const field of requiredFields) {
      const match = availableProps.find(prop => prop.toLowerCase().includes(field.toLowerCase()));
      if (match) {
        console.log(`   ✅ ${field} → ${match}`);
      } else {
        console.log(`   ❌ ${field} → NOT FOUND`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking schema:', error);
  }
}

checkSchema();