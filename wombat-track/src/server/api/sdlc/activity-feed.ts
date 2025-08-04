/**
 * SDLC Activity Feed API - Authority Delegation Protocol
 * Provides activity feed for autonomous CC/Gizmo operations
 */

import { Request, Response } from 'express';
import { authorityService } from '../../services/authority-service';

/**
 * Get activity feed for autonomous actions
 */
export const getActivityFeed = async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const filter = req.query.filter as string;
    const agent = req.query.agent as 'claude' | 'gizmo';

    let activityFeed = authorityService.getActivityFeed(limit);

    // Apply filters
    if (filter) {
      activityFeed = activityFeed.filter(log => 
        log.action_type.includes(filter) || 
        log.details.description?.toLowerCase().includes(filter.toLowerCase())
      );
    }

    if (agent) {
      activityFeed = activityFeed.filter(log => log.agent === agent);
    }

    res.json({
      success: true,
      data: {
        activity_feed: activityFeed,
        total_count: activityFeed.length,
        applied_filters: {
          limit,
          filter,
          agent
        }
      }
    });
  } catch (error) {
    console.error('❌ Activity Feed API: Error getting activity feed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get activity feed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Get authority configuration status
 */
export const getAuthorityStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const status = authorityService.getAuthorityStatus();

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('❌ Activity Feed API: Error getting authority status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get authority status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Reload authority configuration
 */
export const reloadAuthorityConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    authorityService.reloadConfig();

    res.json({
      success: true,
      message: 'Authority configuration reloaded successfully',
      data: authorityService.getAuthorityStatus()
    });
  } catch (error) {
    console.error('❌ Activity Feed API: Error reloading authority config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reload authority configuration',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Get activity feed statistics
 */
export const getActivityStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const activityFeed = authorityService.getActivityFeed(1000); // Get more for stats
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(today.getTime() - (7 * 24 * 60 * 60 * 1000));
    const thisMonth = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));

    const stats = {
      total_actions: activityFeed.length,
      today: {
        total: 0,
        successful: 0,
        failed: 0,
        claude: 0,
        gizmo: 0
      },
      this_week: {
        total: 0,
        successful: 0,
        failed: 0,
        claude: 0,
        gizmo: 0
      },
      this_month: {
        total: 0,
        successful: 0,
        failed: 0,
        claude: 0,
        gizmo: 0
      },
      action_types: {} as Record<string, number>,
      most_active_agent: '',
      average_actions_per_day: 0
    };

    // Calculate statistics
    activityFeed.forEach(log => {
      const logDate = new Date(log.timestamp);
      
      // Action type counts
      stats.action_types[log.action_type] = (stats.action_types[log.action_type] || 0) + 1;

      // Today stats
      if (logDate >= today) {
        stats.today.total++;
        if (log.result === 'success') stats.today.successful++;
        if (log.result === 'failure') stats.today.failed++;
        if (log.agent === 'claude') stats.today.claude++;
        if (log.agent === 'gizmo') stats.today.gizmo++;
      }

      // This week stats
      if (logDate >= thisWeek) {
        stats.this_week.total++;
        if (log.result === 'success') stats.this_week.successful++;
        if (log.result === 'failure') stats.this_week.failed++;
        if (log.agent === 'claude') stats.this_week.claude++;
        if (log.agent === 'gizmo') stats.this_week.gizmo++;
      }

      // This month stats
      if (logDate >= thisMonth) {
        stats.this_month.total++;
        if (log.result === 'success') stats.this_month.successful++;
        if (log.result === 'failure') stats.this_month.failed++;
        if (log.agent === 'claude') stats.this_month.claude++;
        if (log.agent === 'gizmo') stats.this_month.gizmo++;
      }
    });

    // Calculate most active agent
    const claudeTotal = stats.this_month.claude;
    const gizmoTotal = stats.this_month.gizmo;
    stats.most_active_agent = claudeTotal > gizmoTotal ? 'claude' : 
                              gizmoTotal > claudeTotal ? 'gizmo' : 'equal';

    // Calculate average actions per day
    const daysWithData = Math.max(1, Math.ceil((now.getTime() - thisMonth.getTime()) / (24 * 60 * 60 * 1000)));
    stats.average_actions_per_day = Math.round((stats.this_month.total / daysWithData) * 100) / 100;

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('❌ Activity Feed API: Error getting activity stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get activity statistics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};