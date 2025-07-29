#!/usr/bin/env npx tsx

import dotenv from 'dotenv';
import { createNotionClient } from '../src/utils/notionClient.ts';

dotenv.config();

async function checkDatabaseSchema(databaseId: string) {
  const notionClient = createNotionClient();
  const client = notionClient.client;
  
  try {
    console.log(`📊 Checking schema for database: ${databaseId}\n`);
    
    const database = await client.databases.retrieve({ database_id: databaseId });
    
    console.log(`Database Title: ${database.title[0]?.plain_text || 'Untitled'}`);
    console.log(`\nProperties:\n`);
    
    Object.entries(database.properties).forEach(([name, prop]) => {
      console.log(`- ${name}: ${prop.type}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Check Unsorted Content Register
checkDatabaseSchema('23de1901-e36e-8149-89d3-caaa4902ecd2').catch(console.error);