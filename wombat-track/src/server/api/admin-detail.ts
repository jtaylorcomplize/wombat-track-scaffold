import express from 'express';
import DatabaseManager from '../database/connection';
import fs from 'fs/promises';
import path from 'path';

const router = express.Router();
const dbManager = DatabaseManager.getInstance();

// Get project details with linked data
router.get('/projects/:projectId', async (req, res) => {
  const { projectId } = req.params;
  
  try {
    const db = await dbManager.getConnection('production');
    
    // Get project details
    const projectQuery = `SELECT * FROM projects WHERE projectId = ?`;
    const projects = await dbManager.executeQuery(projectQuery, [projectId]);
    
    if (projects.length === 0) {
      return res.status(404).json({
        error: 'Project not found',
        projectId
      });
    }
    
    const project = projects[0];
    
    // Get linked phases
    const phasesQuery = `SELECT * FROM phases WHERE project_ref = ? ORDER BY startDate, phaseid`;
    const phases = await dbManager.executeQuery(phasesQuery, [projectId]);
    
    // Get governance logs for this project
    const governanceQuery = `
      SELECT * FROM governance_logs 
      WHERE resource_type = 'project' AND resource_id = ?
      OR resource_type = 'phase' AND resource_id IN (
        SELECT phaseid FROM phases WHERE project_ref = ?
      )
      ORDER BY timestamp DESC
      LIMIT 50
    `;
    const governanceLogs = await dbManager.executeQuery(governanceQuery, [projectId, projectId]);
    
    // Log the access
    await logGovernanceEntry({
      event_type: 'admin_access',
      user_id: req.headers['x-user-id'] || 'admin',
      user_role: 'admin',
      resource_type: 'project',
      resource_id: projectId,
      action: 'view_project_details',
      success: true,
      details: {
        operation: 'Admin Project View',
        projectName: project.projectName,
        phaseCount: phases.length,
        governanceLogCount: governanceLogs.length
      },
      runtime_context: {
        phase: 'OF-PRE-GH1',
        environment: 'admin_dashboard'
      }
    });
    
    res.json({
      project,
      phases,
      governanceLogs,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error fetching project details:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch project details'
    });
  }
});

// Get phase details with linked data
router.get('/phases/:phaseId', async (req, res) => {
  const { phaseId } = req.params;
  
  try {
    const db = await dbManager.getConnection('production');
    
    // Get phase details
    const phaseQuery = `SELECT * FROM phases WHERE phaseid = ?`;
    const phases = await dbManager.executeQuery(phaseQuery, [phaseId]);
    
    if (phases.length === 0) {
      return res.status(404).json({
        error: 'Phase not found',
        phaseId
      });
    }
    
    const phase = phases[0];
    
    // Get parent project
    const projectQuery = `SELECT projectId, projectName, owner, status FROM projects WHERE projectId = ?`;
    const projects = await dbManager.executeQuery(projectQuery, [phase.project_ref]);
    const project = projects[0] || null;
    
    // Get phase steps
    const stepsQuery = `
      SELECT * FROM step_progress 
      WHERE phaseId = ? 
      ORDER BY stepId
    `;
    const phaseSteps = await dbManager.executeQuery(stepsQuery, [phaseId]);
    
    // Mock checkpoint reviews (since we don't have this table yet)
    const checkpoints = [];
    
    // Mock templates (since we don't have this table yet)
    const templates = [];
    
    // Get governance logs for this phase
    const governanceQuery = `
      SELECT * FROM governance_logs 
      WHERE (resource_type = 'phase' AND resource_id = ?)
      OR (resource_type = 'step' AND resource_id IN (
        SELECT stepId FROM step_progress WHERE phaseId = ?
      ))
      ORDER BY timestamp DESC
      LIMIT 50
    `;
    const governanceLogs = await dbManager.executeQuery(governanceQuery, [phaseId, phaseId]);
    
    // Log the access
    await logGovernanceEntry({
      event_type: 'admin_access',
      user_id: req.headers['x-user-id'] || 'admin',
      user_role: 'admin',
      resource_type: 'phase',
      resource_id: phaseId,
      action: 'view_phase_details',
      success: true,
      details: {
        operation: 'Admin Phase View',
        phaseName: phase.phasename,
        projectRef: phase.project_ref,
        stepCount: phaseSteps.length,
        governanceLogCount: governanceLogs.length
      },
      runtime_context: {
        phase: 'OF-PRE-GH1',
        environment: 'admin_dashboard'
      }
    });
    
    res.json({
      phase,
      project,
      phaseSteps,
      checkpoints,
      templates,
      governanceLogs,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error fetching phase details:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch phase details'
    });
  }
});

// Helper function to log governance entry
async function logGovernanceEntry(details: any): Promise<void> {
  try {
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
    
    await dbManager.executeQuery(query, params);
    
    // Also log to JSONL file
    const governanceLogPath = path.join(process.cwd(), 'logs/governance.jsonl');
    const logEntry = {
      timestamp: new Date().toISOString(),
      ...details
    };
    await fs.appendFile(governanceLogPath, JSON.stringify(logEntry) + '\n');
    
  } catch (error) {
    console.error('Failed to log governance entry:', error);
  }
}

export default router;