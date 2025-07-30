import express from 'express';
import DatabaseManager from '../database/connection';
import fs from 'fs/promises';
import path from 'path';

const router = express.Router();
const dbManager = DatabaseManager.getInstance();

// Table configurations for live database operations
const TABLE_CONFIGS = {
  projects: {
    primaryKey: 'projectId',
    requiredFields: ['projectName', 'projectId'],
    editableFields: ['projectName', 'owner', 'status'],
    tableName: 'projects'
  },
  phases: {
    primaryKey: 'phaseid',
    requiredFields: ['phasename', 'phaseid'],
    editableFields: ['phasename', 'project_ref', 'status', 'startDate', 'endDate', 'RAG', 'notes'],
    tableName: 'phases'
  },
  step_progress: {
    primaryKey: 'stepId',
    requiredFields: ['stepName', 'stepId'],
    editableFields: ['stepName', 'phaseId', 'status', 'progress', 'assignedTo', 'dueDate'],
    tableName: 'step_progress'
  },
  governance_logs: {
    primaryKey: 'id',
    requiredFields: ['event_type'],
    editableFields: [], // Read-only for governance logs
    tableName: 'governance_logs'
  }
};

// Helper function to log governance entry
async function logGovernanceEntry(details: any): Promise<number> {
  const query = `
    INSERT INTO governance_logs (timestamp, event_type, user_id, user_role, resource_type, resource_id, action, success, details, runtime_context)
    VALUES (datetime('now'), ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  const params = [
    details.event_type,
    details.user_id || 'admin',
    details.user_role || 'admin',
    details.resource_type,
    details.resource_id,
    details.action,
    details.success ? 1 : 0,
    JSON.stringify(details.details || {}),
    JSON.stringify(details.runtime_context || {})
  ];
  
  const result = await dbManager.executeQuery(query, params);
  return result.lastID;
}

// Helper function to log change history
async function logChangeHistory(transactionId: string, tableName: string, recordId: string, field: string, oldValue: any, newValue: any, userId: string, governanceLogId: number): Promise<void> {
  const query = `
    INSERT INTO change_history (table_name, record_id, field_name, old_value, new_value, changed_by, transaction_id, governance_log_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  const params = [
    tableName,
    recordId,
    field,
    oldValue ? String(oldValue) : null,
    newValue ? String(newValue) : null,
    userId,
    transactionId,
    governanceLogId
  ];
  
  await dbManager.executeQuery(query, params, transactionId);
}

// Get all records from a table
router.get('/:tableName', async (req, res) => {
  const { tableName } = req.params;
  
  if (!TABLE_CONFIGS[tableName as keyof typeof TABLE_CONFIGS]) {
    return res.status(404).json({ 
      error: 'Table not found',
      availableTables: Object.keys(TABLE_CONFIGS)
    });
  }

  try {
    const config = TABLE_CONFIGS[tableName as keyof typeof TABLE_CONFIGS];
    const query = `SELECT * FROM ${config.tableName} ORDER BY updatedAt DESC`;
    const records = await dbManager.executeQuery(query);
    
    res.json({
      table: tableName,
      recordCount: records.length,
      data: records,
      timestamp: new Date().toISOString(),
      source: 'live_database'
    });

  } catch (error) {
    console.error(`Error fetching ${tableName} data:`, error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: `Failed to fetch ${tableName} data`
    });
  }
});

// Update a specific record (inline editing)
router.patch('/:tableName/:recordId', async (req, res) => {
  const { tableName, recordId } = req.params;
  const updates = req.body;
  const userId = req.headers['x-user-id'] as string || 'admin';
  
  if (!TABLE_CONFIGS[tableName as keyof typeof TABLE_CONFIGS]) {
    return res.status(404).json({ error: 'Table not found' });
  }

  const config = TABLE_CONFIGS[tableName as keyof typeof TABLE_CONFIGS];
  
  // Check if table allows editing
  if (config.editableFields.length === 0) {
    return res.status(403).json({ error: 'Table is read-only' });
  }

  let transactionId: string | undefined;
  
  try {
    // Begin transaction
    transactionId = await dbManager.beginTransaction();
    
    // Get current record for change tracking
    const currentRecordQuery = `SELECT * FROM ${config.tableName} WHERE ${config.primaryKey} = ?`;
    const currentRecords = await dbManager.executeQuery(currentRecordQuery, [recordId], transactionId);
    
    if (currentRecords.length === 0) {
      await dbManager.rollbackTransaction(transactionId);
      return res.status(404).json({ error: 'Record not found' });
    }
    
    const currentRecord = currentRecords[0];
    
    // Filter updates to only allowed fields
    const allowedUpdates: any = {};
    const changes: any[] = [];
    
    for (const [field, newValue] of Object.entries(updates)) {
      if (config.editableFields.includes(field)) {
        const oldValue = currentRecord[field];
        if (oldValue !== newValue) {
          allowedUpdates[field] = newValue;
          changes.push({
            field,
            oldValue,
            newValue
          });
        }
      }
    }
    
    if (Object.keys(allowedUpdates).length === 0) {
      await dbManager.rollbackTransaction(transactionId);
      return res.json({ 
        success: true, 
        message: 'No changes detected',
        recordId 
      });
    }
    
    // Add updatedAt timestamp
    allowedUpdates.updatedAt = new Date().toISOString();
    
    // Build update query
    const setClause = Object.keys(allowedUpdates).map(field => `${field} = ?`).join(', ');
    const updateQuery = `UPDATE ${config.tableName} SET ${setClause} WHERE ${config.primaryKey} = ?`;
    const updateParams = [...Object.values(allowedUpdates), recordId];
    
    // Execute update
    await dbManager.executeQuery(updateQuery, updateParams, transactionId);
    
    // Log governance entry
    const governanceLogId = await logGovernanceEntry({
      event_type: 'record_update',
      user_id: userId,
      user_role: 'admin',
      resource_type: 'database_record',
      resource_id: `${tableName}_${recordId}`,
      action: 'update_record',
      success: true,
      details: {
        operation: 'Inline Record Update',
        table: tableName,
        recordId,
        changes,
        fieldsUpdated: Object.keys(allowedUpdates)
      },
      runtime_context: {
        phase: 'OF-BEV-3.2',
        environment: 'live_database',
        transaction_id: transactionId
      }
    });
    
    // Log individual field changes
    for (const change of changes) {
      await logChangeHistory(
        transactionId,
        tableName,
        recordId,
        change.field,
        change.oldValue,
        change.newValue,
        userId,
        governanceLogId
      );
    }
    
    // Commit transaction
    await dbManager.commitTransaction(transactionId);
    
    // Create MemoryPlugin anchor for significant changes
    if (changes.length > 3 || changes.some(c => ['owner', 'status', 'project_ref'].includes(c.field))) {
      const anchorPath = path.join(
        process.cwd(),
        'DriveMemory/OrbisForge/BackEndVisibility/Phase3/record-updates',
        `${tableName}_${recordId}_${Date.now()}.json`
      );
      
      await fs.mkdir(path.dirname(anchorPath), { recursive: true });
      await fs.writeFile(anchorPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        operation: 'Inline Record Update',
        table: tableName,
        recordId,
        changes,
        userId,
        transactionId,
        governanceLogId,
        memoryplugin_anchor: `of-bev-record-update-${Date.now()}`
      }, null, 2));
    }
    
    res.json({
      success: true,
      message: `Successfully updated ${changes.length} field(s)`,
      recordId,
      changes,
      transactionId,
      governanceLogId
    });

  } catch (error) {
    console.error('Error updating record:', error);
    if (transactionId) {
      try {
        await dbManager.rollbackTransaction(transactionId);
      } catch (rollbackError) {
        console.error('Error rolling back transaction:', rollbackError);
      }
    }
    
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to update record'
    });
  }
});

// Create a new record
router.post('/:tableName', async (req, res) => {
  const { tableName } = req.params;
  const data = req.body;
  const userId = req.headers['x-user-id'] as string || 'admin';
  
  if (!TABLE_CONFIGS[tableName as keyof typeof TABLE_CONFIGS]) {
    return res.status(404).json({ error: 'Table not found' });
  }

  const config = TABLE_CONFIGS[tableName as keyof typeof TABLE_CONFIGS];
  let transactionId: string | undefined;
  
  try {
    // Validate required fields
    for (const field of config.requiredFields) {
      if (!data[field]) {
        return res.status(400).json({ 
          error: 'Missing required field',
          field,
          requiredFields: config.requiredFields
        });
      }
    }
    
    // Begin transaction
    transactionId = await dbManager.beginTransaction();
    
    // Add timestamps
    data.createdAt = new Date().toISOString();
    data.updatedAt = new Date().toISOString();
    
    // Build insert query
    const fields = Object.keys(data);
    const placeholders = fields.map(() => '?').join(', ');
    const insertQuery = `INSERT INTO ${config.tableName} (${fields.join(', ')}) VALUES (${placeholders})`;
    const insertParams = Object.values(data);
    
    // Execute insert
    await dbManager.executeQuery(insertQuery, insertParams, transactionId);
    
    // Log governance entry
    const governanceLogId = await logGovernanceEntry({
      event_type: 'record_create',
      user_id: userId,
      user_role: 'admin',
      resource_type: 'database_record',
      resource_id: `${tableName}_${data[config.primaryKey]}`,
      action: 'create_record',
      success: true,
      details: {
        operation: 'New Record Creation',
        table: tableName,
        recordId: data[config.primaryKey],
        data
      },
      runtime_context: {
        phase: 'OF-BEV-3.2',
        environment: 'live_database',
        transaction_id: transactionId
      }
    });
    
    // Commit transaction
    await dbManager.commitTransaction(transactionId);
    
    res.json({
      success: true,
      message: 'Record created successfully',
      recordId: data[config.primaryKey],
      transactionId,
      governanceLogId
    });

  } catch (error) {
    console.error('Error creating record:', error);
    if (transactionId) {
      try {
        await dbManager.rollbackTransaction(transactionId);
      } catch (rollbackError) {
        console.error('Error rolling back transaction:', rollbackError);
      }
    }
    
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to create record'
    });
  }
});

// Delete a record
router.delete('/:tableName/:recordId', async (req, res) => {
  const { tableName, recordId } = req.params;
  const userId = req.headers['x-user-id'] as string || 'admin';
  
  if (!TABLE_CONFIGS[tableName as keyof typeof TABLE_CONFIGS]) {
    return res.status(404).json({ error: 'Table not found' });
  }

  const config = TABLE_CONFIGS[tableName as keyof typeof TABLE_CONFIGS];
  let transactionId: string | undefined;
  
  try {
    // Begin transaction
    transactionId = await dbManager.beginTransaction();
    
    // Get record before deletion for logging
    const currentRecordQuery = `SELECT * FROM ${config.tableName} WHERE ${config.primaryKey} = ?`;
    const currentRecords = await dbManager.executeQuery(currentRecordQuery, [recordId], transactionId);
    
    if (currentRecords.length === 0) {
      await dbManager.rollbackTransaction(transactionId);
      return res.status(404).json({ error: 'Record not found' });
    }
    
    const recordData = currentRecords[0];
    
    // Execute deletion
    const deleteQuery = `DELETE FROM ${config.tableName} WHERE ${config.primaryKey} = ?`;
    await dbManager.executeQuery(deleteQuery, [recordId], transactionId);
    
    // Log governance entry
    const governanceLogId = await logGovernanceEntry({
      event_type: 'record_delete',
      user_id: userId,
      user_role: 'admin',
      resource_type: 'database_record',
      resource_id: `${tableName}_${recordId}`,
      action: 'delete_record',
      success: true,
      details: {
        operation: 'Record Deletion',
        table: tableName,
        recordId,
        deletedData: recordData
      },
      runtime_context: {
        phase: 'OF-BEV-3.2',
        environment: 'live_database',
        transaction_id: transactionId
      }
    });
    
    // Commit transaction
    await dbManager.commitTransaction(transactionId);
    
    res.json({
      success: true,
      message: 'Record deleted successfully',
      recordId,
      transactionId,
      governanceLogId
    });

  } catch (error) {
    console.error('Error deleting record:', error);
    if (transactionId) {
      try {
        await dbManager.rollbackTransaction(transactionId);
      } catch (rollbackError) {
        console.error('Error rolling back transaction:', rollbackError);
      }
    }
    
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to delete record'
    });
  }
});

// Get change history for a record
router.get('/:tableName/:recordId/history', async (req, res) => {
  const { tableName, recordId } = req.params;
  
  try {
    const query = `
      SELECT ch.*, gl.timestamp as governance_timestamp, gl.user_id, gl.event_type
      FROM change_history ch
      LEFT JOIN governance_logs gl ON ch.governance_log_id = gl.id
      WHERE ch.table_name = ? AND ch.record_id = ?
      ORDER BY ch.changed_at DESC
      LIMIT 50
    `;
    
    const history = await dbManager.executeQuery(query, [tableName, recordId]);
    
    res.json({
      table: tableName,
      recordId,
      historyCount: history.length,
      history,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching change history:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to fetch change history'
    });
  }
});

export default router;