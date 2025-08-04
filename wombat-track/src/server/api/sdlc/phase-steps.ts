import type { Request, Response } from 'express';
import type { SDLCPhaseStep } from '../../agents/gizmo';
import { getGizmoAgent } from '../../agents/gizmo';

const gizmoAgent = getGizmoAgent();

export async function getPhaseSteps(req: Request, res: Response): Promise<void> {
  try {
    const { branch } = req.query;
    const steps = gizmoAgent.getPhaseSteps(branch as string);
    
    res.json({
      success: true,
      data: steps,
      count: steps.length,
      filtered_by_branch: !!branch
    });
  } catch (error) {
    console.error('Error fetching phase steps:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch phase steps',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export async function getPhaseStep(req: Request, res: Response): Promise<void> {
  try {
    const { stepId } = req.params;
    const step = gizmoAgent.getPhaseStep(stepId);
    
    if (!step) {
      res.status(404).json({
        success: false,
        error: 'Phase step not found',
        step_id: stepId
      });
      return;
    }

    res.json({
      success: true,
      data: step
    });
  } catch (error) {
    console.error('Error fetching phase step:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch phase step',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export async function updatePhaseStep(req: Request, res: Response): Promise<void> {
  try {
    const { stepId } = req.params;
    const updates = req.body;

    // Validate updates
    const allowedFields = ['status', 'metadata', 'qa_evidence', 'governance_entry'];
    const validUpdates: Partial<SDLCPhaseStep> = {};
    
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        validUpdates[key as keyof SDLCPhaseStep] = value;
      }
    }

    const success = await gizmoAgent.updatePhaseStep(stepId, validUpdates);
    
    if (!success) {
      res.status(404).json({
        success: false,
        error: 'Phase step not found',
        step_id: stepId
      });
      return;
    }

    const updatedStep = gizmoAgent.getPhaseStep(stepId);
    res.json({
      success: true,
      data: updatedStep,
      updated_fields: Object.keys(validUpdates)
    });
  } catch (error) {
    console.error('Error updating phase step:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update phase step',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export async function validateMergeReadiness(req: Request, res: Response): Promise<void> {
  try {
    const { branch } = req.params;
    const validation = await gizmoAgent.validateMergeReadiness(branch);
    
    res.json({
      success: true,
      branch: branch,
      merge_ready: validation.allowed,
      validation: validation
    });
  } catch (error) {
    console.error('Error validating merge readiness:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate merge readiness',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export async function triggerSDLCEvent(req: Request, res: Response): Promise<void> {
  try {
    const { type, branch, metadata = {}, ci_status, qa_result } = req.body;
    
    if (!type || !branch) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: type and branch'
      });
      return;
    }

    const event = {
      type,
      branch,
      timestamp: new Date().toISOString(),
      metadata,
      ci_status,
      qa_result
    };

    gizmoAgent.emit(event);
    
    res.json({
      success: true,
      message: 'SDLC event triggered successfully',
      event: event
    });
  } catch (error) {
    console.error('Error triggering SDLC event:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to trigger SDLC event',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export async function getBranchStatus(req: Request, res: Response): Promise<void> {
  try {
    const { branch } = req.params;
    const steps = gizmoAgent.getPhaseSteps(branch);
    
    if (steps.length === 0) {
      res.status(404).json({
        success: false,
        error: 'No SDLC steps found for branch',
        branch: branch
      });
      return;
    }

    const validation = await gizmoAgent.validateMergeReadiness(branch);
    
    const status = {
      branch: branch,
      steps: steps,
      merge_readiness: validation,
      current_phase: steps.find(s => s.status === 'in_progress')?.step || 'Unknown',
      overall_status: validation.allowed ? 'Ready' : 'Blocked',
      last_updated: Math.max(...steps.map(s => new Date(s.updated_at).getTime()))
    };

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Error fetching branch status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch branch status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}