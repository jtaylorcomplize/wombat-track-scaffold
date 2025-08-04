import { Request, Response } from 'express';
import { GovernanceLogger } from '../../../services/governance-logger';
import { getGizmoAgent } from '../../agents/gizmo';

const governanceLogger = GovernanceLogger.getInstance();
const gizmoAgent = getGizmoAgent();

export async function createGovernanceEntry(req: Request, res: Response): Promise<void> {
  try {
    const {
      branch,
      event_type = 'sdlc_governance_entry',
      user_id = 'system',
      user_role = 'developer',
      action = 'governance_log',
      summary,
      details = {},
      step_id
    } = req.body;

    if (!branch || !summary) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: branch and summary'
      });
      return;
    }

    // Create governance log entry
    const logEntry = {
      timestamp: new Date().toISOString(),
      log_id: `gov_${branch}_${Date.now()}`,
      entry_timestamp: new Date().toISOString(),
      summary: summary
    };

    governanceLogger.log({
      event_type,
      user_id,
      user_role,
      resource_type: 'dashboard' as const,
      resource_id: branch,
      action,
      success: true,
      details: {
        branch,
        summary,
        step_id,
        ...details
      }
    });

    // Update the corresponding governance step if step_id provided
    if (step_id) {
      await gizmoAgent.updatePhaseStep(step_id, {
        governance_entry: logEntry,
        status: 'completed'
      });
    }

    res.json({
      success: true,
      message: 'Governance entry created successfully',
      data: logEntry
    });
  } catch (error) {
    console.error('Error creating governance entry:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create governance entry',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export async function getGovernanceEntries(req: Request, res: Response): Promise<void> {
  try {
    const { branch, limit = 50, offset = 0 } = req.query;
    
    // In a real implementation, this would query the governance log storage
    // For now, we'll return mock data structure
    const entries = [
      {
        id: `gov_${branch}_example`,
        timestamp: new Date().toISOString(),
        branch: branch,
        event_type: 'sdlc_governance_entry',
        user_id: 'developer',
        summary: 'SDLC workflow completed successfully',
        details: {
          phase_steps_completed: ['Debug', 'QA'],
          qa_evidence_attached: true,
          ready_for_merge: true
        }
      }
    ];

    res.json({
      success: true,
      data: entries,
      count: entries.length,
      pagination: {
        limit: Number(limit),
        offset: Number(offset),
        total: entries.length
      }
    });
  } catch (error) {
    console.error('Error fetching governance entries:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch governance entries',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export async function getGovernanceEntry(req: Request, res: Response): Promise<void> {
  try {
    const { entryId } = req.params;
    
    // In a real implementation, this would query the specific entry
    const entry = {
      id: entryId,
      timestamp: new Date().toISOString(),
      branch: 'feature/example',
      event_type: 'sdlc_governance_entry',
      user_id: 'developer',
      summary: 'SDLC workflow governance entry',
      details: {
        step_validations: {
          debug: { status: 'completed', ci_passed: true },
          qa: { status: 'completed', manual_qa_passed: true, screenshots: true },
          governance: { status: 'completed', entry_created: true }
        },
        merge_readiness: true
      }
    };

    res.json({
      success: true,
      data: entry
    });
  } catch (error) {
    console.error('Error fetching governance entry:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch governance entry',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export async function validateGovernanceComplete(req: Request, res: Response): Promise<void> {
  try {
    const { branch } = req.params;
    
    // Check if branch has completed governance step
    const steps = gizmoAgent.getPhaseSteps(branch);
    const governanceStep = steps.find(step => step.step === 'Governance');
    
    const isComplete = governanceStep?.status === 'completed' && 
                      governanceStep?.governance_entry !== undefined;

    const validation = {
      branch: branch,
      governance_complete: isComplete,
      governance_step: governanceStep,
      blocking_reasons: isComplete ? [] : [
        'Governance step not completed',
        !governanceStep?.governance_entry ? 'Governance entry missing' : null
      ].filter(Boolean)
    };

    res.json({
      success: true,
      data: validation
    });
  } catch (error) {
    console.error('Error validating governance completion:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate governance completion',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export async function getSDLCGovernanceReport(req: Request, res: Response): Promise<void> {
  try {
    const { timeframe = 'week' } = req.query;
    
    const gizmoStatus = gizmoAgent.getSDLCStatus();
    const allSteps = gizmoAgent.getPhaseSteps();
    
    // Calculate metrics
    const branches = new Set(allSteps.map(step => step.branch));
    const completedWorkflows = allSteps.filter(step => 
      step.step === 'Memory' && step.status === 'completed'
    );
    const blockedWorkflows = allSteps.filter(step => 
      step.status === 'failed' || step.status === 'blocked'
    );
    
    const report = {
      timeframe,
      generated_at: new Date().toISOString(),
      summary: {
        total_branches: branches.size,
        completed_workflows: completedWorkflows.length,
        blocked_workflows: blockedWorkflows.length,
        success_rate: branches.size > 0 ? 
          Math.round((completedWorkflows.length / branches.size) * 100) : 0
      },
      gizmo_agent_status: gizmoStatus,
      branch_details: Array.from(branches).map(branch => {
        const branchSteps = allSteps.filter(step => step.branch === branch);
        const completed = branchSteps.filter(step => step.status === 'completed').length;
        const total = branchSteps.length;
        
        return {
          branch,
          progress: total > 0 ? Math.round((completed / total) * 100) : 0,
          current_phase: branchSteps.find(s => s.status === 'in_progress')?.step || 'Unknown',
          steps: branchSteps
        };
      }),
      recommendations: generateGovernanceRecommendations(allSteps)
    };

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Error generating SDLC governance report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate SDLC governance report',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

function generateGovernanceRecommendations(steps: any[]): string[] {
  const recommendations: string[] = [];
  
  const failedSteps = steps.filter(step => step.status === 'failed');
  const blockedSteps = steps.filter(step => step.status === 'blocked');
  const stuckSteps = steps.filter(step => {
    const hoursSinceUpdate = (Date.now() - new Date(step.updated_at).getTime()) / (1000 * 60 * 60);
    return step.status === 'in_progress' && hoursSinceUpdate > 24;
  });
  
  if (failedSteps.length > 0) {
    recommendations.push(`${failedSteps.length} steps have failed and need attention`);
  }
  
  if (blockedSteps.length > 0) {
    recommendations.push(`${blockedSteps.length} steps are blocked and preventing progress`);
  }
  
  if (stuckSteps.length > 0) {
    recommendations.push(`${stuckSteps.length} steps have been in progress for over 24 hours`);
  }
  
  const qaSteps = steps.filter(step => step.step === 'QA');
  const qaWithoutEvidence = qaSteps.filter(step => 
    !step.qa_evidence?.manual_qa_passed || !step.qa_evidence?.screenshots_attached
  );
  
  if (qaWithoutEvidence.length > 0) {
    recommendations.push(`${qaWithoutEvidence.length} QA steps lack proper evidence`);
  }
  
  if (recommendations.length === 0) {
    recommendations.push('SDLC governance is operating smoothly');
  }
  
  return recommendations;
}