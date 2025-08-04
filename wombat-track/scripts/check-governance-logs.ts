#!/usr/bin/env tsx

import DatabaseManager from '../src/server/database/connection.js';

async function checkGovernanceLogs() {
  const dbManager = DatabaseManager.getInstance();
  
  try {
    const db = await dbManager.getConnection();
    
    // Count total logs
    const countResult = await db.get('SELECT COUNT(*) as total FROM governance_logs');
    console.log(`Total governance logs in database: ${countResult.total}`);
    
    // Get first 10 logs
    const logs = await db.all('SELECT * FROM governance_logs ORDER BY timestamp DESC LIMIT 10');
    console.log(`\nFirst 10 logs:`);
    logs.forEach((log, index) => {
      console.log(`${index + 1}. ${log.timestamp} - ${log.event_type} - ${log.action}`);
    });
    
    // Check if there's an issue with the API
    const apiLogs = await db.all('SELECT * FROM governance_logs ORDER BY timestamp DESC');
    console.log(`\nAPI would return: ${apiLogs.length} logs`);
    
  } catch (error) {
    console.error('Error checking governance logs:', error);
  } finally {
    await dbManager.closeAllConnections();
  }
}

checkGovernanceLogs();