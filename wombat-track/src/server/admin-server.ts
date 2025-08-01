/**
 * Admin API Server for OF-BEV
 * Consolidated server for all admin endpoints
 */

import express from 'express';
import cors from 'cors';
import DatabaseManager from './database/connection';

// Import admin route modules
import adminRoutes from './api/admin';
import liveAdminRoutes from './api/live-admin';
import exportImportRoutes from './api/export-import';
import orphanRoutes from './api/orphans';
import runtimeRoutes from './api/runtime';
import jsonOperationsRoutes from './api/json-operations';
import mcpGsuiteRoutes from './api/mcp-gsuite';
import secretsRoutes from './api/secrets';

const app = express();
const PORT = process.env.ADMIN_PORT || 3002;

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id']
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'wombat-track-admin-api',
    version: '1.0.0',
    database_status: 'connected',
    phase: 'OF-BEV-3.0'
  });
});

// Admin route registration
console.log('🔐 Registering admin API routes...');

// Data Explorer routes (CRUD operations)
app.use('/api/admin/live', liveAdminRoutes);
console.log('   ✓ /api/admin/live/* - Live database CRUD operations');

// Table data routes (CSV/JSONL reading)
app.use('/api/admin/tables', adminRoutes);
console.log('   ✓ /api/admin/tables/* - Table data access');

// Import/Export routes
app.use('/api/admin/csv', exportImportRoutes);
console.log('   ✓ /api/admin/csv/* - CSV import/export operations');

// JSON operations routes
app.use('/api/admin/json', jsonOperationsRoutes);
console.log('   ✓ /api/admin/json/* - JSON import/export operations');

// Orphan detection and repair routes
app.use('/api/admin/orphans', orphanRoutes);
console.log('   ✓ /api/admin/orphans/* - Orphan detection and repair');

// Runtime status and monitoring routes
app.use('/api/admin/runtime', runtimeRoutes);
console.log('   ✓ /api/admin/runtime/* - Runtime status monitoring');

// MCP GSuite integration routes
app.use('/api/mcp/gsuite', mcpGsuiteRoutes);
console.log('   ✓ /api/mcp/gsuite/* - MCP GSuite integration (WT-MCPGS-1.0)');

// Secrets management routes
app.use('/api/admin/secrets', secretsRoutes);
console.log('   ✓ /api/admin/secrets/* - Secrets management (MCP credentials)');

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Admin API Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: 'An error occurred in the admin API',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.path,
    method: req.method,
    availableRoutes: [
      'GET /api/admin/live/:tableName - Get table data',
      'PATCH /api/admin/live/:tableName/:recordId - Update record',
      'POST /api/admin/live/:tableName - Create record',
      'DELETE /api/admin/live/:tableName/:recordId - Delete record',
      'GET /api/admin/tables/:tableName - Get CSV/JSONL data',
      'GET /api/admin/csv/export/:tableName - Export CSV',
      'POST /api/admin/csv/import/:tableName - Import CSV',
      'GET /api/admin/json/export - Export JSON',
      'POST /api/admin/json/import - Import JSON',
      'GET /api/admin/orphans - Detect orphaned records',
      'PATCH /api/admin/orphans/fix/:tableName - Fix orphan',
      'GET /api/admin/runtime/status - Runtime status',
      'POST /api/admin/runtime/sync - Trigger sync'
    ],
    timestamp: new Date().toISOString()
  });
});

// Initialize database connection
async function initializeDatabase() {
  try {
    const dbManager = DatabaseManager.getInstance();
    console.log('🗄️  Database connection initialized');
    return true;
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    return false;
  }
}

// Start server
async function startServer() {
  const dbReady = await initializeDatabase();
  
  if (!dbReady) {
    console.warn('⚠️  Database not ready, some features may not work');
  }

  const server = app.listen(PORT, () => {
    console.log(`🚀 Admin API Server running on http://localhost:${PORT}`);
    console.log(`🔐 Serving admin endpoints for OF-BEV Phase 3`);
    console.log(`📊 Available admin operations:`);
    console.log(`   • Data Explorer - Browse and edit database records`);
    console.log(`   • Import/Export - CSV and JSON data operations`);
    console.log(`   • Orphan Inspector - Detect and fix orphaned records`);
    console.log(`   • Runtime Panel - System health and job monitoring`);
    console.log(`🔗 Test endpoints:`);
    console.log(`   GET  http://localhost:${PORT}/health`);
    console.log(`   GET  http://localhost:${PORT}/api/admin/tables/projects`);
    console.log(`   GET  http://localhost:${PORT}/api/admin/runtime/status`);
  });

  // ✅ Keep TSX process alive
  process.stdin.resume();

  // Handle termination gracefully
  process.on('SIGINT', () => {
    console.log('\n🛑 Admin server shutting down...');
    server.close(() => {
      console.log('✅ Server closed gracefully');
      process.exit(0);
    });
  });

  process.on('SIGTERM', () => {
    console.log('\n🛑 Admin server shutting down...');
    server.close(() => {
      console.log('✅ Server closed gracefully');
      process.exit(0);
    });
  });
}

// Start server when this module is executed directly
startServer().catch(console.error);

export default app;