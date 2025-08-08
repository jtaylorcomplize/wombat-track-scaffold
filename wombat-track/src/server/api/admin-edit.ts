import express from 'express';
import DatabaseManager from '../database/connection.js';
import fs from 'fs/promises';
import path from 'path';

const router = express.Router();
const dbManager = DatabaseManager.getInstance();

interface EditableProject {
  projectId: string;
  projectName: string;
  owner?: string;
  status?: string;
  description?: string;
  goals?: string;
  scopeNotes?: string;
  RAG?: string;
  startDate?: string;
  endDate?: string;
  priority?: string;
  budget?: number;
  actualCost?: number;
  estimatedHours?: number;
  actualHours?: number;
  completionPercentage?: number;
  risk?: string;
  stakeholders?: string;
  tags?: string;
  category?: string;
  department?: string;
  isDraft?: boolean;
  draftEditedBy?: string;
  draftEditedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface EditablePhase {
  phaseid: string;
  phasename: string;
  project_ref: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  RAG?: string;
  notes?: string;
  estimatedDuration?: number;
  actualDuration?: number;
  isDraft?: boolean;
  draftEditedBy?: string;
  draftEditedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Create governance log entry
async function createGovernanceLog(eventType: string, action: string, resourceType: string, resourceId: string, userId: string = 'system', details: any = {}) {
  const db = await dbManager.getConnection();
  
  const logEntry = {
    timestamp: new Date().toISOString(),
    event_type: eventType,
    user_id: userId,
    user_role: 'admin',
    resource_type: resourceType,
    resource_id: resourceId,
    action: action,
    success: true,
    details: JSON.stringify(details),
    runtime_context: JSON.stringify({ source: 'admin-dashboard', version: '1.0' })
  };

  const result = await db.run(`
    INSERT INTO governance_logs (timestamp, event_type, user_id, user_role, resource_type, resource_id, action, success, details, runtime_context)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    logEntry.timestamp,
    logEntry.event_type,
    logEntry.user_id,
    logEntry.user_role,
    logEntry.resource_type,
    logEntry.resource_id,
    logEntry.action,
    logEntry.success,
    logEntry.details,
    logEntry.runtime_context
  ]);

  return result.lastID;
}

// Create MemoryPlugin anchor
async function createMemoryAnchor(anchorId: string, context: any) {
  const anchorData = {
    id: anchorId,
    timestamp: new Date().toISOString(),
    context: context,
    type: 'admin-table-operation'
  };
  
  const anchorPath = path.join(process.cwd(), 'DriveMemory', 'MemoryPlugin', `${anchorId}.json`);
  await fs.mkdir(path.dirname(anchorPath), { recursive: true });
  await fs.writeFile(anchorPath, JSON.stringify(anchorData, null, 2));
}

// Get editable projects
router.get('/projects', async (req, res) => {
  try {
    const db = await dbManager.getConnection();
    
    // Get projects from database first
    const dbProjects = await db.all(`
      SELECT *, 
             CASE WHEN isDraft = 1 THEN 'draft' ELSE 'committed' END as editStatus
      FROM projects 
      ORDER BY updatedAt DESC
    `);

    // If no projects in DB, load from CSV
    if (dbProjects.length === 0) {
      console.log('No projects in database, loading from CSV...');
      // Will implement CSV import in next step
    }

    res.json({
      success: true,
      data: dbProjects,
      meta: {
        total: dbProjects.length,
        drafts: dbProjects.filter(p => p.isDraft === 1).length,
        committed: dbProjects.filter(p => p.isDraft !== 1).length
      }
    });

  } catch (error) {
    console.error('Error fetching editable projects:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch projects',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Save project as draft
router.post('/projects/:projectId/draft', async (req, res) => {
  const { projectId } = req.params;
  const updates = req.body;
  const userId = req.headers['x-user-id'] as string || 'admin';

  try {
    const db = await dbManager.getConnection();
    const transactionId = await dbManager.beginTransaction();

    // Get current project
    const currentProject = await db.get('SELECT * FROM projects WHERE projectId = ?', [projectId]);
    
    if (!currentProject) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    // Update project with draft status
    const updateData = {
      ...updates,
      isDraft: 1,
      draftEditedBy: userId,
      draftEditedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const setClause = Object.keys(updateData).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updateData);
    values.push(projectId);

    await dbManager.executeQuery(
      `UPDATE projects SET ${setClause} WHERE projectId = ?`,
      values,
      transactionId
    );

    // Create governance log
    const logId = await createGovernanceLog(
      'OF-PRE-GH1-EditableTableDraft',
      `Draft save for project ${projectId}`,
      'project',
      projectId,
      userId,
      { changes: updates, operation: 'draft_save' }
    );

    // Create memory anchor
    await createMemoryAnchor('of-pre-gh1-table-draft', {
      projectId,
      changes: updates,
      userId,
      logId
    });

    await dbManager.commitTransaction(transactionId);

    res.json({
      success: true,
      message: 'Project saved as draft',
      data: { projectId, isDraft: true, logId }
    });

  } catch (error) {
    console.error('Error saving project draft:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save draft',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Commit project (final save)
router.post('/projects/:projectId/commit', async (req, res) => {
  const { projectId } = req.params;
  const { commitMessage = 'Admin table commit' } = req.body;
  const userId = req.headers['x-user-id'] as string || 'admin';

  try {
    const db = await dbManager.getConnection();
    const transactionId = await dbManager.beginTransaction();

    // Get current project
    const currentProject = await db.get('SELECT * FROM projects WHERE projectId = ?', [projectId]);
    
    if (!currentProject) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    // Commit the draft (remove draft status)
    await dbManager.executeQuery(
      `UPDATE projects SET 
         isDraft = 0, 
         draftEditedBy = NULL, 
         draftEditedAt = NULL,
         updatedAt = ?
       WHERE projectId = ?`,
      [new Date().toISOString(), projectId],
      transactionId
    );

    // Create governance log for commit
    const logId = await createGovernanceLog(
      'OF-PRE-GH1-EditableTableCommit',
      `Committed project ${projectId}: ${commitMessage}`,
      'project',
      projectId,
      userId,
      { commitMessage, operation: 'commit' }
    );

    // Create memory anchor
    await createMemoryAnchor('of-pre-gh1-table-commit', {
      projectId,
      commitMessage,
      userId,
      logId
    });

    await dbManager.commitTransaction(transactionId);

    res.json({
      success: true,
      message: 'Project committed to canonical database',
      data: { projectId, isDraft: false, logId }
    });

  } catch (error) {
    console.error('Error committing project:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to commit project',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get editable phases
router.get('/phases', async (req, res) => {
  try {
    const db = await dbManager.getConnection();
    
    const dbPhases = await db.all(`
      SELECT p.*, 
             pr.projectName,
             CASE WHEN p.isDraft = 1 THEN 'draft' ELSE 'committed' END as editStatus
      FROM phases p
      LEFT JOIN projects pr ON p.project_ref = pr.projectId
      ORDER BY p.updatedAt DESC
    `);

    res.json({
      success: true,
      data: dbPhases,
      meta: {
        total: dbPhases.length,
        drafts: dbPhases.filter(p => p.isDraft === 1).length,
        committed: dbPhases.filter(p => p.isDraft !== 1).length
      }
    });

  } catch (error) {
    console.error('Error fetching editable phases:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch phases',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Save phase as draft
router.post('/phases/:phaseId/draft', async (req, res) => {
  const { phaseId } = req.params;
  const updates = req.body;
  const userId = req.headers['x-user-id'] as string || 'admin';

  try {
    const db = await dbManager.getConnection();
    const transactionId = await dbManager.beginTransaction();

    const currentPhase = await db.get('SELECT * FROM phases WHERE phaseid = ?', [phaseId]);
    
    if (!currentPhase) {
      return res.status(404).json({ success: false, error: 'Phase not found' });
    }

    const updateData = {
      ...updates,
      isDraft: 1,
      draftEditedBy: userId,
      draftEditedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const setClause = Object.keys(updateData).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updateData);
    values.push(phaseId);

    await dbManager.executeQuery(
      `UPDATE phases SET ${setClause} WHERE phaseid = ?`,
      values,
      transactionId
    );

    const logId = await createGovernanceLog(
      'OF-PRE-GH1-EditableTableDraft',
      `Draft save for phase ${phaseId}`,
      'phase',
      phaseId,
      userId,
      { changes: updates, operation: 'draft_save' }
    );

    await createMemoryAnchor('of-pre-gh1-table-draft', {
      phaseId,
      changes: updates,
      userId,
      logId
    });

    await dbManager.commitTransaction(transactionId);

    res.json({
      success: true,
      message: 'Phase saved as draft',
      data: { phaseId, isDraft: true, logId }
    });

  } catch (error) {
    console.error('Error saving phase draft:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save draft',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Commit phase
router.post('/phases/:phaseId/commit', async (req, res) => {
  const { phaseId } = req.params;
  const { commitMessage = 'Admin table commit' } = req.body;
  const userId = req.headers['x-user-id'] as string || 'admin';

  try {
    const db = await dbManager.getConnection();
    const transactionId = await dbManager.beginTransaction();

    const currentPhase = await db.get('SELECT * FROM phases WHERE phaseid = ?', [phaseId]);
    
    if (!currentPhase) {
      return res.status(404).json({ success: false, error: 'Phase not found' });
    }

    await dbManager.executeQuery(
      `UPDATE phases SET 
         isDraft = 0, 
         draftEditedBy = NULL, 
         draftEditedAt = NULL,
         updatedAt = ?
       WHERE phaseid = ?`,
      [new Date().toISOString(), phaseId],
      transactionId
    );

    const logId = await createGovernanceLog(
      'OF-PRE-GH1-EditableTableCommit',
      `Committed phase ${phaseId}: ${commitMessage}`,
      'phase',
      phaseId,
      userId,
      { commitMessage, operation: 'commit' }
    );

    await createMemoryAnchor('of-pre-gh1-table-commit', {
      phaseId,
      commitMessage,
      userId,
      logId
    });

    await dbManager.commitTransaction(transactionId);

    res.json({
      success: true,
      message: 'Phase committed to canonical database',
      data: { phaseId, isDraft: false, logId }
    });

  } catch (error) {
    console.error('Error committing phase:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to commit phase',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Link project to SubApp (immediate save for Phase 9.0.7.2)
router.patch('/projects/:projectId/link-subapp', async (req, res) => {
  const { projectId } = req.params;
  const { subApp_ref } = req.body;
  const userId = req.headers['x-user-id'] as string || 'admin';

  try {
    const db = await dbManager.getConnection();
    const transactionId = await dbManager.beginTransaction();

    // Get current project for logging
    const currentProject = await db.get('SELECT * FROM projects WHERE projectId = ?', [projectId]);
    
    if (!currentProject) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    const oldSubApp = currentProject.subApp_ref;
    const newSubApp = subApp_ref;

    // Update the project's SubApp reference
    await dbManager.executeQuery(
      `UPDATE projects SET 
         subApp_ref = ?, 
         updatedAt = ?
       WHERE projectId = ?`,
      [newSubApp, new Date().toISOString(), projectId],
      transactionId
    );

    // Create governance log entry
    const logId = await createGovernanceLog(
      'project_subapp_linked',
      `SubApp assignment changed for project ${projectId}`,
      'project',
      projectId,
      userId,
      { 
        operation: 'subapp_link',
        oldSubApp: oldSubApp || null,
        newSubApp: newSubApp || null,
        immediate: true,
        phase: 'OF-9.0.7.2'
      }
    );

    // Create memory anchor for the change
    await createMemoryAnchor('of-9.0.7.2-subapp-dropdown-bugfix', {
      projectId,
      oldSubApp,
      newSubApp,
      userId,
      logId,
      timestamp: new Date().toISOString()
    });

    await dbManager.commitTransaction(transactionId);

    res.json({
      success: true,
      message: 'SubApp linked successfully',
      data: { 
        projectId, 
        subApp_ref: newSubApp,
        oldSubApp,
        logId 
      }
    });

  } catch (error) {
    console.error('Error linking project to SubApp:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to link SubApp',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;