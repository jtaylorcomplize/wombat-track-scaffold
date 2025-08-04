import type { Request, Response } from 'express';
import { getGizmoAgent } from '../../agents/gizmo';

const gizmoAgent = getGizmoAgent();

export interface MemoryAnchor {
  id: string;
  branch: string;
  created_at: string;
  status: 'pending' | 'created' | 'failed';
  sdlc_validation: any;
  phase_steps: any[];
  anchor_data: Record<string, unknown>;
  error_message?: string;
}

// In-memory storage for memory anchors (in production, this would be a database)
const memoryAnchors: Map<string, MemoryAnchor> = new Map();

export async function createMemoryAnchor(req: Request, res: Response): Promise<void> {
  try {
    const { branch, force_create = false } = req.body;
    
    if (!branch) {
      res.status(400).json({
        success: false,
        error: 'Missing required field: branch'
      });
      return;
    }

    // Check if branch is ready for memory anchoring
    if (!force_create) {
      const validation = await gizmoAgent.validateMergeReadiness(branch);
      if (!validation.allowed) {
        res.status(400).json({
          success: false,
          error: 'Branch not ready for memory anchoring',
          blocking_reasons: validation.blocking_reasons,
          validation: validation
        });
        return;
      }
    }

    // Check if memory anchor already exists
    const existingAnchor = Array.from(memoryAnchors.values())
      .find(anchor => anchor.branch === branch);
    
    if (existingAnchor) {
      res.status(409).json({
        success: false,
        error: 'Memory anchor already exists for branch',
        existing_anchor: existingAnchor
      });
      return;
    }

    // Create memory anchor
    const anchorId = `anchor_${branch}_${Date.now()}`;
    const timestamp = new Date().toISOString();
    
    const memoryAnchor: MemoryAnchor = {
      id: anchorId,
      branch: branch,
      created_at: timestamp,
      status: 'pending',
      sdlc_validation: await gizmoAgent.validateMergeReadiness(branch),
      phase_steps: gizmoAgent.getPhaseSteps(branch),
      anchor_data: {
        trigger: 'manual_creation',
        requested_by: req.body.user_id || 'system',
        force_create: force_create
      }
    };

    try {
      // Simulate memory anchor creation process
      // In production, this would integrate with the actual MemoryPlugin
      await simulateMemoryAnchorCreation(memoryAnchor);
      
      memoryAnchor.status = 'created';
      memoryAnchors.set(anchorId, memoryAnchor);

      // Update the memory step in Gizmo
      const memoryStepId = `${branch}_memory`;
      await gizmoAgent.updatePhaseStep(memoryStepId, {
        status: 'completed',
        memory_anchor: {
          anchor_id: anchorId,
          anchor_timestamp: timestamp,
          status: 'created'
        }
      });

      res.json({
        success: true,
        message: 'Memory anchor created successfully',
        data: memoryAnchor
      });
    } catch (error) {
      memoryAnchor.status = 'failed';
      memoryAnchor.error_message = error instanceof Error ? error.message : 'Unknown error';
      memoryAnchors.set(anchorId, memoryAnchor);
      
      throw error;
    }
  } catch (error) {
    console.error('Error creating memory anchor:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create memory anchor',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export async function getMemoryAnchors(req: Request, res: Response): Promise<void> {
  try {
    const { branch, status, limit = 50, offset = 0 } = req.query;
    
    let anchors = Array.from(memoryAnchors.values());
    
    // Filter by branch if specified
    if (branch) {
      anchors = anchors.filter(anchor => anchor.branch === branch);
    }
    
    // Filter by status if specified
    if (status) {
      anchors = anchors.filter(anchor => anchor.status === status);
    }
    
    // Sort by creation date (newest first)
    anchors.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    // Apply pagination
    const startIndex = Number(offset);
    const endIndex = startIndex + Number(limit);
    const paginatedAnchors = anchors.slice(startIndex, endIndex);
    
    res.json({
      success: true,
      data: paginatedAnchors,
      pagination: {
        total: anchors.length,
        limit: Number(limit),
        offset: Number(offset),
        has_more: endIndex < anchors.length
      }
    });
  } catch (error) {
    console.error('Error fetching memory anchors:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch memory anchors',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export async function getMemoryAnchor(req: Request, res: Response): Promise<void> {
  try {
    const { anchorId } = req.params;
    const anchor = memoryAnchors.get(anchorId);
    
    if (!anchor) {
      res.status(404).json({
        success: false,
        error: 'Memory anchor not found',
        anchor_id: anchorId
      });
      return;
    }
    
    res.json({
      success: true,
      data: anchor
    });
  } catch (error) {
    console.error('Error fetching memory anchor:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch memory anchor',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export async function validateMemoryAnchorReadiness(req: Request, res: Response): Promise<void> {
  try {
    const { branch } = req.params;
    
    const validation = await gizmoAgent.validateMergeReadiness(branch);
    const steps = gizmoAgent.getPhaseSteps(branch);
    
    // Check specific memory anchor requirements
    const qaStep = steps.find(step => step.step === 'QA');
    const govStep = steps.find(step => step.step === 'Governance');
    
    const requirements = {
      qa_completed: qaStep?.status === 'completed',
      qa_evidence_complete: qaStep?.qa_evidence?.manual_qa_passed && qaStep?.qa_evidence?.screenshots_attached,
      governance_completed: govStep?.status === 'completed',
      governance_entry_exists: !!govStep?.governance_entry,
      merge_validation_passed: validation.allowed
    };
    
    const allRequirementsMet = Object.values(requirements).every(Boolean);
    
    const result = {
      branch: branch,
      ready_for_memory_anchor: allRequirementsMet,
      requirements: requirements,
      blocking_reasons: validation.blocking_reasons,
      steps_summary: {
        total_steps: steps.length,
        completed_steps: steps.filter(s => s.status === 'completed').length,
        failed_steps: steps.filter(s => s.status === 'failed').length
      }
    };
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error validating memory anchor readiness:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate memory anchor readiness',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export async function deleteMemoryAnchor(req: Request, res: Response): Promise<void> {
  try {
    const { anchorId } = req.params;
    const { reason } = req.body;
    
    const anchor = memoryAnchors.get(anchorId);
    if (!anchor) {
      res.status(404).json({
        success: false,
        error: 'Memory anchor not found',
        anchor_id: anchorId
      });
      return;
    }
    
    // In production, this would handle cleanup of actual memory anchor data
    memoryAnchors.delete(anchorId);
    
    // Update the corresponding memory step
    const memoryStepId = `${anchor.branch}_memory`;
    await gizmoAgent.updatePhaseStep(memoryStepId, {
      status: 'failed',
      memory_anchor: {
        anchor_id: anchorId,
        anchor_timestamp: anchor.created_at,
        status: 'failed'
      },
      metadata: {
        deletion_reason: reason,
        deleted_at: new Date().toISOString()
      }
    });
    
    res.json({
      success: true,
      message: 'Memory anchor deleted successfully',
      deleted_anchor: {
        id: anchorId,
        branch: anchor.branch,
        reason: reason
      }
    });
  } catch (error) {
    console.error('Error deleting memory anchor:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete memory anchor',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export async function getMemoryAnchorStats(req: Request, res: Response): Promise<void> {
  try {
    const anchors = Array.from(memoryAnchors.values());
    
    const stats = {
      total_anchors: anchors.length,
      by_status: {
        created: anchors.filter(a => a.status === 'created').length,
        pending: anchors.filter(a => a.status === 'pending').length,
        failed: anchors.filter(a => a.status === 'failed').length
      },
      by_branch: anchors.reduce((acc, anchor) => {
        acc[anchor.branch] = (acc[anchor.branch] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      recent_activity: anchors
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 10)
        .map(anchor => ({
          id: anchor.id,
          branch: anchor.branch,
          status: anchor.status,
          created_at: anchor.created_at
        })),
      success_rate: anchors.length > 0 ? 
        Math.round((anchors.filter(a => a.status === 'created').length / anchors.length) * 100) : 0
    };
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching memory anchor stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch memory anchor stats',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function simulateMemoryAnchorCreation(anchor: MemoryAnchor): Promise<void> {
  // Simulate async memory anchor creation process
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Simulate potential failure (5% chance)
  if (Math.random() < 0.05) {
    throw new Error('Memory anchor creation failed due to storage constraints');
  }
  
  // Add additional anchor data
  anchor.anchor_data = {
    ...anchor.anchor_data,
    creation_timestamp: new Date().toISOString(),
    validation_hash: `hash_${anchor.branch}_${Date.now()}`,
    storage_location: `memory/anchors/${anchor.id}`,
    size_bytes: Math.floor(Math.random() * 10000) + 1000
  };
}