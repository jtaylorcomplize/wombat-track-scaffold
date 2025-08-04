import type { Request, Response } from 'express';
import { getGizmoAgent } from '../../agents/gizmo';

const gizmoAgent = getGizmoAgent();

export interface CIStatus {
  branch: string;
  status: 'pending' | 'running' | 'success' | 'failure' | 'cancelled';
  build_id: string;
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
  commit_sha: string;
  commit_message: string;
  tests: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
  };
  coverage?: {
    percentage: number;
    lines_covered: number;
    lines_total: number;
  };
  artifacts?: string[];
  logs_url?: string;
  error_message?: string;
}

// In-memory storage for CI statuses (in production, this would integrate with actual CI/CD system)
const ciStatuses: Map<string, CIStatus> = new Map();

export async function updateCIStatus(req: Request, res: Response): Promise<void> {
  try {
    const {
      branch,
      status,
      build_id,
      commit_sha,
      commit_message,
      tests,
      coverage,
      artifacts,
      logs_url,
      error_message
    } = req.body;

    if (!branch || !status || !build_id) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: branch, status, build_id'
      });
      return;
    }

    const timestamp = new Date().toISOString();
    const existingStatus = ciStatuses.get(branch);
    
    const ciStatus: CIStatus = {
      branch,
      status,
      build_id,
      started_at: existingStatus?.started_at || timestamp,
      commit_sha: commit_sha || 'unknown',
      commit_message: commit_message || 'No commit message',
      tests: tests || { total: 0, passed: 0, failed: 0, skipped: 0 },
      coverage,
      artifacts,
      logs_url,
      error_message
    };

    // Set completion time if status is final
    if (['success', 'failure', 'cancelled'].includes(status)) {
      ciStatus.completed_at = timestamp;
      if (existingStatus?.started_at) {
        ciStatus.duration_ms = new Date(timestamp).getTime() - new Date(existingStatus.started_at).getTime();
      }
    }

    ciStatuses.set(branch, ciStatus);

    // Trigger SDLC event if build completed
    if (status === 'success' || status === 'failure') {
      gizmoAgent.emit({
        type: 'build_completed',
        branch: branch,
        timestamp: timestamp,
        metadata: {
          build_id: build_id,
          commit_sha: commit_sha,
          tests: tests,
          coverage: coverage
        },
        ci_status: status
      });
    }

    res.json({
      success: true,
      message: 'CI status updated successfully',
      data: ciStatus
    });
  } catch (error) {
    console.error('Error updating CI status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update CI status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export async function getCIStatus(req: Request, res: Response): Promise<void> {
  try {
    const { branch } = req.params;
    const ciStatus = ciStatuses.get(branch);

    if (!ciStatus) {
      res.status(404).json({
        success: false,
        error: 'CI status not found for branch',
        branch: branch
      });
      return;
    }

    res.json({
      success: true,
      data: ciStatus
    });
  } catch (error) {
    console.error('Error fetching CI status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch CI status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export async function getAllCIStatuses(req: Request, res: Response): Promise<void> {
  try {
    const { status, limit = 50, offset = 0 } = req.query;
    
    let statuses = Array.from(ciStatuses.values());
    
    // Filter by status if specified
    if (status) {
      statuses = statuses.filter(s => s.status === status);
    }
    
    // Sort by started_at (newest first)
    statuses.sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
    
    // Apply pagination
    const startIndex = Number(offset);
    const endIndex = startIndex + Number(limit);
    const paginatedStatuses = statuses.slice(startIndex, endIndex);
    
    res.json({
      success: true,
      data: paginatedStatuses,
      pagination: {
        total: statuses.length,
        limit: Number(limit),
        offset: Number(offset),
        has_more: endIndex < statuses.length
      }
    });
  } catch (error) {
    console.error('Error fetching CI statuses:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch CI statuses',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export async function triggerCIBuild(req: Request, res: Response): Promise<void> {
  try {
    const { branch, force_rebuild = false } = req.body;

    if (!branch) {
      res.status(400).json({
        success: false,
        error: 'Missing required field: branch'
      });
      return;
    }

    // Check if there's already a running build
    const existingStatus = ciStatuses.get(branch);
    if (existingStatus && ['pending', 'running'].includes(existingStatus.status) && !force_rebuild) {
      res.status(409).json({
        success: false,
        error: 'CI build already running for branch',
        existing_build: existingStatus
      });
      return;
    }

    // Create new CI build
    const buildId = `build_${branch}_${Date.now()}`;
    const timestamp = new Date().toISOString();
    
    const ciStatus: CIStatus = {
      branch: branch,
      status: 'pending',
      build_id: buildId,
      started_at: timestamp,
      commit_sha: 'pending',
      commit_message: 'Build triggered via API',
      tests: { total: 0, passed: 0, failed: 0, skipped: 0 }
    };

    ciStatuses.set(branch, ciStatus);

    // Simulate CI build process
    simulateCIBuild(branch, buildId);

    res.json({
      success: true,
      message: 'CI build triggered successfully',
      data: ciStatus
    });
  } catch (error) {
    console.error('Error triggering CI build:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to trigger CI build',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export async function getCIStats(req: Request, res: Response): Promise<void> {
  try {
    const statuses = Array.from(ciStatuses.values());
    
    const stats = {
      total_builds: statuses.length,
      by_status: {
        success: statuses.filter(s => s.status === 'success').length,
        failure: statuses.filter(s => s.status === 'failure').length,
        running: statuses.filter(s => s.status === 'running').length,
        pending: statuses.filter(s => s.status === 'pending').length,
        cancelled: statuses.filter(s => s.status === 'cancelled').length
      },
      success_rate: statuses.length > 0 ? 
        Math.round((statuses.filter(s => s.status === 'success').length / statuses.length) * 100) : 0,
      average_duration_ms: calculateAverageDuration(statuses),
      recent_builds: statuses
        .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())
        .slice(0, 10)
        .map(status => ({
          branch: status.branch,
          status: status.status,
          build_id: status.build_id,
          started_at: status.started_at,
          duration_ms: status.duration_ms
        })),
      test_metrics: {
        total_tests_run: statuses.reduce((sum, s) => sum + s.tests.total, 0),
        total_tests_passed: statuses.reduce((sum, s) => sum + s.tests.passed, 0),
        total_tests_failed: statuses.reduce((sum, s) => sum + s.tests.failed, 0),
        average_coverage: calculateAverageCoverage(statuses)
      }
    };
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching CI stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch CI stats',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export async function cancelCIBuild(req: Request, res: Response): Promise<void> {
  try {
    const { branch } = req.params;
    const { reason } = req.body;
    
    const ciStatus = ciStatuses.get(branch);
    if (!ciStatus) {
      res.status(404).json({
        success: false,
        error: 'CI status not found for branch',
        branch: branch
      });
      return;
    }

    if (!['pending', 'running'].includes(ciStatus.status)) {
      res.status(400).json({
        success: false,
        error: 'Cannot cancel CI build in current status',
        current_status: ciStatus.status
      });
      return;
    }

    // Update status to cancelled
    ciStatus.status = 'cancelled';
    ciStatus.completed_at = new Date().toISOString();
    ciStatus.error_message = reason || 'Build cancelled via API';
    
    if (ciStatus.started_at) {
      ciStatus.duration_ms = new Date(ciStatus.completed_at).getTime() - new Date(ciStatus.started_at).getTime();
    }

    ciStatuses.set(branch, ciStatus);

    res.json({
      success: true,
      message: 'CI build cancelled successfully',
      data: ciStatus
    });
  } catch (error) {
    console.error('Error cancelling CI build:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel CI build',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Helper functions
function calculateAverageDuration(statuses: CIStatus[]): number {
  const completedBuilds = statuses.filter(s => s.duration_ms);
  if (completedBuilds.length === 0) return 0;
  
  const totalDuration = completedBuilds.reduce((sum, s) => sum + (s.duration_ms || 0), 0);
  return Math.round(totalDuration / completedBuilds.length);
}

function calculateAverageCoverage(statuses: CIStatus[]): number {
  const buildsWithCoverage = statuses.filter(s => s.coverage?.percentage);
  if (buildsWithCoverage.length === 0) return 0;
  
  const totalCoverage = buildsWithCoverage.reduce((sum, s) => sum + (s.coverage?.percentage || 0), 0);
  return Math.round((totalCoverage / buildsWithCoverage.length) * 100) / 100;
}

async function simulateCIBuild(branch: string, buildId: string): Promise<void> {
  // Simulate CI build process with realistic timing
  setTimeout(async () => {
    const ciStatus = ciStatuses.get(branch);
    if (!ciStatus) return;

    // Update to running
    ciStatus.status = 'running';
    ciStatus.commit_sha = `abc123${Math.random().toString(36).substr(2, 6)}`;
    ciStatuses.set(branch, ciStatus);

    // Simulate build duration (30s to 5min)
    const buildDuration = 30000 + Math.random() * 270000;
    
    setTimeout(() => {
      const finalStatus = ciStatuses.get(branch);
      if (!finalStatus || finalStatus.status === 'cancelled') return;

      // Simulate success/failure (85% success rate)
      const isSuccess = Math.random() < 0.85;
      
      finalStatus.status = isSuccess ? 'success' : 'failure';
      finalStatus.completed_at = new Date().toISOString();
      finalStatus.duration_ms = buildDuration;
      
      // Generate test results
      const totalTests = Math.floor(Math.random() * 100) + 20;
      if (isSuccess) {
        finalStatus.tests = {
          total: totalTests,
          passed: totalTests - Math.floor(Math.random() * 3),
          failed: Math.floor(Math.random() * 3),
          skipped: Math.floor(Math.random() * 5)
        };
        finalStatus.coverage = {
          percentage: 75 + Math.random() * 20,
          lines_covered: Math.floor(Math.random() * 5000) + 2000,
          lines_total: Math.floor(Math.random() * 6000) + 3000
        };
      } else {
        const failedTests = Math.floor(Math.random() * 10) + 1;
        finalStatus.tests = {
          total: totalTests,
          passed: totalTests - failedTests,
          failed: failedTests,
          skipped: Math.floor(Math.random() * 5)
        };
        finalStatus.error_message = 'Build failed due to test failures';
      }
      
      finalStatus.logs_url = `https://ci.example.com/builds/${buildId}/logs`;
      ciStatuses.set(branch, finalStatus);

      // Trigger Gizmo event
      gizmoAgent.emit({
        type: 'build_completed',
        branch: branch,
        timestamp: finalStatus.completed_at!,
        metadata: {
          build_id: buildId,
          commit_sha: finalStatus.commit_sha,
          tests: finalStatus.tests,
          coverage: finalStatus.coverage
        },
        ci_status: finalStatus.status
      });
    }, buildDuration);
  }, 5000); // 5 second delay to move to running
}