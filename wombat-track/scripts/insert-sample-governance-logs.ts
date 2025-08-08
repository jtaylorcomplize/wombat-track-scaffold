#!/usr/bin/env node

/**
 * Script to insert sample governance logs with proper cross-references
 * This demonstrates the governance log to phase step linking
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = path.join(process.cwd(), 'databases', 'production.db');

// Check if database exists
if (!fs.existsSync(dbPath)) {
  console.error('❌ Database not found at:', dbPath);
  process.exit(1);
}

const db = new Database(dbPath, { readonly: false });

// Sample governance logs linked to OF-9.0.7 phase steps
const sampleLogs = [
  {
    timestamp: '2025-08-07T10:00:00Z',
    event_type: 'phase_step_started',
    user_id: 'system',
    user_role: 'admin',
    resource_type: 'phase_step',
    resource_id: 'OF-9.0.7.1',
    action: 'create_database_schema',
    success: true,
    details: {
      stepId: 'OF-9.0.7.1',
      phaseId: 'OF-9.0.7',
      stepName: 'Database Schema Implementation',
      memory_anchors: ['WT-ANCHOR-GOVERNANCE'],
      tablesCreated: ['governance_logs'],
      recordsImported: 439
    },
    runtime_context: {
      phase: 'OF-9.0.7',
      environment: 'production',
      executor: 'system'
    }
  },
  {
    timestamp: '2025-08-07T11:30:00Z',
    event_type: 'component_created',
    user_id: 'claude',
    user_role: 'ai_agent',
    resource_type: 'ui_component',
    resource_id: 'OF-9.0.7.2',
    action: 'create_admin_phase_view',
    success: true,
    details: {
      stepId: 'OF-9.0.7.2',
      phaseId: 'OF-9.0.7',
      stepName: 'AdminPhaseView Component',
      memory_anchors: ['WT-ANCHOR-IMPLEMENTATION'],
      component: 'AdminPhaseView.tsx',
      features: ['Live data fetching', 'Phase statistics', 'Governance log filtering']
    },
    runtime_context: {
      phase: 'OF-9.0.7',
      environment: 'development',
      executor: 'claude'
    }
  },
  {
    timestamp: '2025-08-07T12:00:00Z',
    event_type: 'api_endpoint_created',
    user_id: 'claude',
    user_role: 'ai_agent',
    resource_type: 'api',
    resource_id: 'OF-9.0.7.3',
    action: 'create_governance_api',
    success: true,
    details: {
      stepId: 'OF-9.0.7.3',
      phaseId: 'OF-9.0.7',
      stepName: 'Database API Endpoints',
      memory_anchors: ['WT-ANCHOR-QUALITY'],
      endpoints: ['/api/admin/governance_logs', '/api/admin/phases', '/api/admin/memory/:anchor']
    },
    runtime_context: {
      phase: 'OF-9.0.7',
      environment: 'development',
      executor: 'claude'
    }
  },
  {
    timestamp: '2025-08-07T12:30:00Z',
    event_type: 'feature_implemented',
    user_id: 'claude',
    user_role: 'ai_agent',
    resource_type: 'feature',
    resource_id: 'OF-9.0.7.4',
    action: 'implement_memory_anchor_resolution',
    success: true,
    details: {
      stepId: 'OF-9.0.7.4',
      phaseId: 'OF-9.0.7',
      stepName: 'Memory Anchor Resolution',
      memory_anchors: ['WT-ANCHOR-GOVERNANCE'],
      functionality: 'Click-to-resolve anchors',
      searchPath: 'DriveMemory/**'
    },
    runtime_context: {
      phase: 'OF-9.0.7',
      environment: 'development',
      executor: 'claude'
    }
  },
  {
    timestamp: '2025-08-07T13:00:00Z',
    event_type: 'cross_reference_established',
    user_id: 'claude',
    user_role: 'ai_agent',
    resource_type: 'phase_step',
    resource_id: 'OF-9.0.7.5',
    action: 'link_governance_logs',
    success: true,
    details: {
      stepId: 'OF-9.0.7.5',
      phaseId: 'OF-9.0.7',
      stepName: 'Cross-Reference Linking',
      memory_anchors: ['WT-ANCHOR-IMPLEMENTATION'],
      linkingField: 'governanceLogId',
      linkedSteps: 5
    },
    runtime_context: {
      phase: 'OF-9.0.7',
      environment: 'development',
      executor: 'claude'
    }
  }
];

// Insert sample logs
try {
  const insertStmt = db.prepare(`
    INSERT INTO governance_logs (
      timestamp, event_type, user_id, user_role, 
      resource_type, resource_id, action, success, 
      details, runtime_context
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let inserted = 0;
  
  for (const log of sampleLogs) {
    try {
      // Check if log already exists
      const existing = db.prepare(`
        SELECT id FROM governance_logs 
        WHERE timestamp = ? AND resource_id = ?
      `).get(log.timestamp, log.resource_id);
      
      if (!existing) {
        insertStmt.run(
          log.timestamp,
          log.event_type,
          log.user_id,
          log.user_role,
          log.resource_type,
          log.resource_id,
          log.action,
          log.success ? 1 : 0,
          JSON.stringify(log.details),
          JSON.stringify(log.runtime_context)
        );
        inserted++;
        console.log(`✅ Inserted log for ${log.resource_id}`);
      } else {
        console.log(`⏭️  Log already exists for ${log.resource_id}`);
      }
    } catch (error) {
      console.error(`❌ Failed to insert log for ${log.resource_id}:`, error);
    }
  }
  
  console.log(`\n📊 Summary: Inserted ${inserted} new governance logs`);
  
  // Show current count
  const count = db.prepare('SELECT COUNT(*) as count FROM governance_logs').get();
  console.log(`📈 Total governance logs in database: ${count.count}`);
  
} catch (error) {
  console.error('❌ Error inserting sample logs:', error);
} finally {
  db.close();
}