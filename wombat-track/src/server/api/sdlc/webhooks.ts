import { Request, Response } from 'express';
import { sdlcOrchestrator } from '../../../services/sdlc-orchestrator.ts';

export async function handleGitHubWebhook(req: Request, res: Response): Promise<void> {
  try {
    const payload = req.body;
    const event = req.headers['x-github-event'] as string;
    
    console.log(`🔗 GitHub webhook received: ${event}`);
    
    await sdlcOrchestrator.processWebhook('github', payload);
    
    res.json({
      success: true,
      message: 'GitHub webhook processed successfully',
      event: event
    });
  } catch (error) {
    console.error('❌ Error processing GitHub webhook:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process GitHub webhook',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export async function handleGitLabWebhook(req: Request, res: Response): Promise<void> {
  try {
    const payload = req.body;
    const event = req.headers['x-gitlab-event'] as string;
    
    console.log(`🦊 GitLab webhook received: ${event}`);
    
    await sdlcOrchestrator.processWebhook('gitlab', payload);
    
    res.json({
      success: true,
      message: 'GitLab webhook processed successfully',
      event: event
    });
  } catch (error) {
    console.error('❌ Error processing GitLab webhook:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process GitLab webhook',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export async function handleJenkinsWebhook(req: Request, res: Response): Promise<void> {
  try {
    const payload = req.body;
    
    console.log(`🏗️ Jenkins webhook received`);
    
    await sdlcOrchestrator.processWebhook('jenkins', payload);
    
    res.json({
      success: true,
      message: 'Jenkins webhook processed successfully'
    });
  } catch (error) {
    console.error('❌ Error processing Jenkins webhook:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process Jenkins webhook',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export async function submitQAResults(req: Request, res: Response): Promise<void> {
  try {
    const { branch, passed, tester, notes, screenshots, test_results } = req.body;
    
    if (!branch || passed === undefined || !tester) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: branch, passed, tester'
      });
      return;
    }

    await sdlcOrchestrator.submitQAResults(branch, {
      passed: Boolean(passed),
      tester: tester,
      notes: notes || '',
      screenshots: screenshots || [],
      test_results: test_results || {}
    });

    res.json({
      success: true,
      message: 'QA results submitted successfully',
      data: {
        branch: branch,
        passed: passed,
        tester: tester,
        submitted_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ Error submitting QA results:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit QA results',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export async function triggerCIBuild(req: Request, res: Response): Promise<void> {
  try {
    const { branch, commit_sha, triggered_by } = req.body;
    
    if (!branch) {
      res.status(400).json({
        success: false,
        error: 'Missing required field: branch'
      });
      return;
    }

    await sdlcOrchestrator.triggerCIBuild(
      branch,
      commit_sha || 'manual_trigger',
      triggered_by || 'api_user'
    );

    res.json({
      success: true,
      message: 'CI build triggered successfully',
      data: {
        branch: branch,
        commit_sha: commit_sha,
        triggered_by: triggered_by,
        triggered_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ Error triggering CI build:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to trigger CI build',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export async function checkMergeReadiness(req: Request, res: Response): Promise<void> {
  try {
    const { branch } = req.params;
    
    const isAllowed = await sdlcOrchestrator.isMergeAllowed(branch);
    const blockingReasons = await sdlcOrchestrator.getMergeBlockingReasons(branch);
    
    res.json({
      success: true,
      data: {
        branch: branch,
        merge_allowed: isAllowed,
        blocking_reasons: blockingReasons,
        checked_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ Error checking merge readiness:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check merge readiness',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export async function getOrchestratorStatus(req: Request, res: Response): Promise<void> {
  try {
    const status = sdlcOrchestrator.getStatus();
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('❌ Error getting orchestrator status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get orchestrator status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export async function setOrchestratorActive(req: Request, res: Response): Promise<void> {
  try {
    const { active } = req.body;
    
    if (active === undefined) {
      res.status(400).json({
        success: false,
        error: 'Missing required field: active'
      });
      return;
    }

    sdlcOrchestrator.setActive(Boolean(active));
    
    res.json({
      success: true,
      message: `SDLC Orchestrator ${active ? 'activated' : 'deactivated'}`,
      data: {
        active: Boolean(active),
        changed_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ Error setting orchestrator status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to set orchestrator status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}