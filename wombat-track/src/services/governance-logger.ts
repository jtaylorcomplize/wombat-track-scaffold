interface GovernanceLogEntry {
  timestamp: string;
  event_type: string;
  user_id: string;
  user_role: string;
  resource_type: 'dashboard' | 'card' | 'filter' | 'data' | 'auth';
  resource_id: string;
  action: string;
  success: boolean;
  details: Record<string, unknown>;
  session_id?: string;
  ip_address?: string;
  user_agent?: string;
  performance_metrics?: {
    load_time_ms?: number;
    query_time_ms?: number;
    data_size_bytes?: number;
    error_count?: number;
    memory_usage_mb?: number;
    cpu_usage_percent?: number;
  };
  security_context?: {
    auth_method: string;
    permissions_checked: string[];
    access_restrictions: string[];
  };
  runtime_context?: {
    browser?: string;
    viewport_size?: { width: number; height: number };
    connection_type?: string;
    phase?: string;
    environment?: string;
  };
  rag_metrics?: {
    score: 'red' | 'amber' | 'green' | 'blue';
    performance_grade: 'A' | 'B' | 'C' | 'D' | 'F';
    health_factors: {
      load_performance: number;
      error_rate: number;
      user_engagement: number;
      data_freshness: number;
    };
  };
}

interface UsageMetrics {
  total_sessions: number;
  total_pageviews: number;
  total_queries: number;
  average_session_duration: number;
  average_load_time: number;
  error_rate: number;
  top_cards: Array<{ card_id: string; view_count: number }>;
  top_users: Array<{ user_id: string; session_count: number }>;
  performance_trends: Array<{ date: string; avg_load_time: number; query_count: number }>;
}

interface AlertRule {
  rule_id: string;
  name: string;
  condition: {
    metric: string;
    operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
    threshold: number;
    time_window_minutes: number;
  };
  actions: Array<{
    type: 'email' | 'webhook' | 'log' | 'slack';
    target: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }>;
  enabled: boolean;
}

interface DashboardHealthReport {
  dashboard_id: string;
  timestamp: string;
  overall_health: 'healthy' | 'degraded' | 'critical';
  rag_score: 'red' | 'amber' | 'green' | 'blue';
  performance_grade: 'A' | 'B' | 'C' | 'D' | 'F';
  metrics: {
    avg_load_time_ms: number;
    error_rate: number;
    user_engagement_score: number;
    data_freshness_score: number;
    total_sessions: number;
    total_interactions: number;
  };
  recommendations: string[];
}

interface RuntimeObservabilityConfig {
  enableAutoMetrics: boolean;
  metricsInterval: number;
  alertWebhookUrl?: string;
  slackWebhookUrl?: string;
  emailAlertRecipients?: string[];
  performanceThresholds: {
    loadTimeWarningMs: number;
    loadTimeCriticalMs: number;
    errorRateWarning: number;
    errorRateCritical: number;
  };
}

class GovernanceLogger {
  private static instance: GovernanceLogger;
  private logBuffer: GovernanceLogEntry[] = [];
  private sessionMetrics: Map<string, Record<string, unknown>> = new Map();
  private alertRules: AlertRule[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private observabilityConfig: RuntimeObservabilityConfig;
  private dashboardHealthCache: Map<string, DashboardHealthReport> = new Map();
  private metricsAggregationInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.observabilityConfig = {
      enableAutoMetrics: true,
      metricsInterval: 60000,
      performanceThresholds: {
        loadTimeWarningMs: 5000,
        loadTimeCriticalMs: 10000,
        errorRateWarning: 0.1,
        errorRateCritical: 0.2
      }
    };
    this.initializeAlertRules();
    this.startPeriodicFlush();
    this.startMetricsAggregation();
  }

  static getInstance(): GovernanceLogger {
    if (!GovernanceLogger.instance) {
      GovernanceLogger.instance = new GovernanceLogger();
    }
    return GovernanceLogger.instance;
  }

  private initializeAlertRules() {
    this.alertRules = [
      {
        rule_id: 'high_error_rate',
        name: 'High Error Rate Alert',
        condition: {
          metric: 'error_rate',
          operator: 'gt',
          threshold: 0.1,
          time_window_minutes: 5
        },
        actions: [
          {
            type: 'log',
            target: 'error',
            severity: 'high'
          },
          {
            type: 'slack',
            target: '#spqr-alerts',
            severity: 'high'
          }
        ],
        enabled: true
      },
      {
        rule_id: 'slow_performance',
        name: 'Slow Performance Alert',
        condition: {
          metric: 'avg_load_time',
          operator: 'gt',
          threshold: 10000,
          time_window_minutes: 10
        },
        actions: [
          {
            type: 'log',
            target: 'performance',
            severity: 'medium'
          },
          {
            type: 'webhook',
            target: this.observabilityConfig.alertWebhookUrl || '',
            severity: 'medium'
          }
        ],
        enabled: true
      },
      {
        rule_id: 'unauthorized_access_attempts',
        name: 'Unauthorized Access Attempts',
        condition: {
          metric: 'auth_failures',
          operator: 'gt',
          threshold: 5,
          time_window_minutes: 5
        },
        actions: [
          {
            type: 'log',
            target: 'security',
            severity: 'critical'
          },
          {
            type: 'email',
            target: 'security@example.com',
            severity: 'critical'
          }
        ],
        enabled: true
      },
      {
        rule_id: 'rag_score_degradation',
        name: 'RAG Score Degradation',
        condition: {
          metric: 'rag_score_red_count',
          operator: 'gt',
          threshold: 3,
          time_window_minutes: 15
        },
        actions: [
          {
            type: 'log',
            target: 'health',
            severity: 'high'
          },
          {
            type: 'slack',
            target: '#spqr-health',
            severity: 'high'
          }
        ],
        enabled: true
      },
      {
        rule_id: 'low_user_engagement',
        name: 'Low User Engagement',
        condition: {
          metric: 'engagement_score',
          operator: 'lt',
          threshold: 0.3,
          time_window_minutes: 60
        },
        actions: [
          {
            type: 'log',
            target: 'engagement',
            severity: 'medium'
          }
        ],
        enabled: true
      }
    ];
  }

  private startPeriodicFlush() {
    this.flushInterval = setInterval(() => {
      this.flushLogs();
      this.checkAlerts();
    }, 30000);
  }

  private startMetricsAggregation() {
    if (!this.observabilityConfig.enableAutoMetrics) return;

    this.metricsAggregationInterval = setInterval(() => {
      this.aggregateAndRecordMetrics();
    }, this.observabilityConfig.metricsInterval);
  }

  log(entry: Partial<GovernanceLogEntry>): void {
    const fullEntry: GovernanceLogEntry = {
      timestamp: new Date().toISOString(),
      event_type: entry.event_type || 'unknown',
      user_id: entry.user_id || 'anonymous',
      user_role: entry.user_role || 'unknown',
      resource_type: entry.resource_type || 'dashboard',
      resource_id: entry.resource_id || '',
      action: entry.action || 'view',
      success: entry.success !== false,
      details: entry.details || {},
      session_id: entry.session_id || this.generateSessionId(),
      ip_address: entry.ip_address,
      user_agent: entry.user_agent || (typeof navigator !== 'undefined' ? navigator.userAgent : undefined),
      performance_metrics: entry.performance_metrics,
      security_context: entry.security_context,
      runtime_context: entry.runtime_context || this.captureRuntimeContext(),
      rag_metrics: entry.rag_metrics
    };

    this.logBuffer.push(fullEntry);
    this.updateSessionMetrics(fullEntry);
    this.updateHealthMetrics(fullEntry);

    console.log('SPQR Governance Log:', fullEntry);

    if (fullEntry.event_type === 'error' || !fullEntry.success) {
      console.error('SPQR Error Log:', fullEntry);
    }
  }

  logDashboardAccess(userId: string, userRole: string, cardId: string, dashboardId: string, success: boolean, loadTime?: number, error?: string): void {
    this.log({
      event_type: 'dashboard_access',
      user_id: userId,
      user_role: userRole,
      resource_type: 'dashboard',
      resource_id: dashboardId,
      action: 'view',
      success,
      details: {
        card_id: cardId,
        dashboard_id: dashboardId,
        error_message: error
      },
      performance_metrics: loadTime ? {
        load_time_ms: loadTime
      } : undefined
    });
  }

  logUserAction(userId: string, userRole: string, cardId: string, action: string, details: Record<string, unknown>, sessionId?: string): void {
    this.log({
      event_type: 'user_action',
      user_id: userId,
      user_role: userRole,
      resource_type: 'dashboard',
      resource_id: cardId,
      action,
      success: true,
      details,
      session_id: sessionId
    });
  }

  logFilterChange(userId: string, userRole: string, cardId: string, filters: Record<string, unknown>, sessionId?: string): void {
    this.log({
      event_type: 'filter_change',
      user_id: userId,
      user_role: userRole,
      resource_type: 'filter',
      resource_id: cardId,
      action: 'modify',
      success: true,
      details: {
        filters,
        filter_count: Object.keys(filters).length
      },
      session_id: sessionId
    });
  }

  logAuthAttempt(userId: string, userRole: string, resourceId: string, success: boolean, method: string, permissions: string[], restrictions: string[]): void {
    this.log({
      event_type: 'auth_attempt',
      user_id: userId,
      user_role: userRole,
      resource_type: 'auth',
      resource_id: resourceId,
      action: 'authenticate',
      success,
      details: {
        auth_method: method
      },
      security_context: {
        auth_method: method,
        permissions_checked: permissions,
        access_restrictions: restrictions
      }
    });
  }

  logError(userId: string, userRole: string, resourceId: string, error: Error, context?: Record<string, unknown>): void {
    this.log({
      event_type: 'error',
      user_id: userId,
      user_role: userRole,
      resource_type: 'dashboard',
      resource_id: resourceId,
      action: 'error',
      success: false,
      details: {
        error_message: error.message,
        error_stack: error.stack,
        context
      }
    });
  }

  private updateSessionMetrics(entry: GovernanceLogEntry): void {
    const sessionId = entry.session_id!;
    const existing = this.sessionMetrics.get(sessionId) || {
      user_id: entry.user_id,
      user_role: entry.user_role,
      start_time: entry.timestamp,
      last_activity: entry.timestamp,
      actions: [],
      resources_accessed: new Set(),
      total_load_time: 0,
      error_count: 0
    };

    existing.last_activity = entry.timestamp;
    existing.actions.push({
      timestamp: entry.timestamp,
      action: entry.action,
      resource_id: entry.resource_id,
      success: entry.success
    });
    existing.resources_accessed.add(entry.resource_id);

    if (entry.performance_metrics?.load_time_ms) {
      existing.total_load_time += entry.performance_metrics.load_time_ms;
    }

    if (!entry.success) {
      existing.error_count++;
    }

    this.sessionMetrics.set(sessionId, existing);
  }

  private generateSessionId(): string {
    return `spqr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async flushLogs(): Promise<void> {
    if (this.logBuffer.length === 0) return;

    const logsToFlush = [...this.logBuffer];
    this.logBuffer = [];

    try {
      await this.persistLogs(logsToFlush);
    } catch (error) {
      console.error('Failed to flush governance logs:', error);
      this.logBuffer = [...logsToFlush, ...this.logBuffer];
    }
  }

  private async persistLogs(logs: GovernanceLogEntry[]): Promise<void> {
    const logFilePath = './logs/governance.jsonl';
    
    try {
      const fs = await import('fs/promises');
      const logLines = logs.map(log => JSON.stringify(log)).join('\n') + '\n';
      await fs.appendFile(logFilePath, logLines);
    } catch (error) {
      console.error('Error writing to governance log file:', error);
    }

    const phaseCompleteEntry = {
      timestamp: new Date().toISOString(),
      phase: 'Phase3–RuntimeEnablement',
      status: 'logging_active',
      log_entries_count: logs.length,
      unique_users: new Set(logs.map(l => l.user_id)).size,
      unique_resources: new Set(logs.map(l => l.resource_id)).size
    };

    console.log('SPQR Phase 3 Logging Summary:', phaseCompleteEntry);
  }

  private checkAlerts(): void {
    const now = Date.now();
    
    this.alertRules.forEach(rule => {
      if (!rule.enabled) return;

      const windowStart = now - (rule.condition.time_window_minutes * 60 * 1000);
      const recentLogs = this.logBuffer.filter(log => 
        new Date(log.timestamp).getTime() >= windowStart
      );

      let metricValue = 0;

      switch (rule.condition.metric) {
        case 'error_rate': {
          const totalLogs = recentLogs.length;
          const errorLogs = recentLogs.filter(log => !log.success).length;
          metricValue = totalLogs > 0 ? errorLogs / totalLogs : 0;
          break;
        }
        case 'avg_load_time': {
          const loadTimes = recentLogs
            .filter(log => log.performance_metrics?.load_time_ms)
            .map(log => log.performance_metrics!.load_time_ms!);
          metricValue = loadTimes.length > 0 
            ? loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length 
            : 0;
          break;
        }
        case 'auth_failures': {
          metricValue = recentLogs.filter(log => 
            log.event_type === 'auth_attempt' && !log.success
          ).length;
          break;
        }
      }

      if (this.evaluateCondition(metricValue, rule.condition)) {
        this.triggerAlert(rule, metricValue, recentLogs);
      }
    });
  }

  private evaluateCondition(value: number, condition: { operator: string; threshold: number }): boolean {
    switch (condition.operator) {
      case 'gt': return value > condition.threshold;
      case 'lt': return value < condition.threshold;
      case 'eq': return value === condition.threshold;
      case 'gte': return value >= condition.threshold;
      case 'lte': return value <= condition.threshold;
      default: return false;
    }
  }

  private triggerAlert(rule: AlertRule, metricValue: number, recentLogs: GovernanceLogEntry[]): void {
    const alertEntry = {
      timestamp: new Date().toISOString(),
      alert_id: rule.rule_id,
      alert_name: rule.name,
      metric_value: metricValue,
      threshold: rule.condition.threshold,
      severity: rule.actions[0]?.severity || 'medium',
      affected_logs_count: recentLogs.length,
      phase: 'Phase3–RuntimeEnablement'
    };

    console.warn('SPQR Governance Alert:', alertEntry);

    this.log({
      event_type: 'governance_alert',
      user_id: 'system',
      user_role: 'system',
      resource_type: 'dashboard',
      resource_id: 'system',
      action: 'alert',
      success: true,
      details: alertEntry
    });
  }

  getUsageMetrics(timeWindow: 'hour' | 'day' | 'week' = 'day'): UsageMetrics {
    const windowMs = {
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000
    }[timeWindow];

    const cutoff = Date.now() - windowMs;
    const recentLogs = this.logBuffer.filter(log => 
      new Date(log.timestamp).getTime() >= cutoff
    );

    const sessions = new Set(recentLogs.map(log => log.session_id));
    const pageviews = recentLogs.filter(log => log.action === 'view').length;
    const queries = recentLogs.filter(log => log.action === 'query').length;
    const errors = recentLogs.filter(log => !log.success).length;

    const loadTimes = recentLogs
      .filter(log => log.performance_metrics?.load_time_ms)
      .map(log => log.performance_metrics!.load_time_ms!);

    const cardCounts = new Map<string, number>();
    recentLogs.forEach(log => {
      if (log.action === 'view') {
        cardCounts.set(log.resource_id, (cardCounts.get(log.resource_id) || 0) + 1);
      }
    });

    return {
      total_sessions: sessions.size,
      total_pageviews: pageviews,
      total_queries: queries,
      average_session_duration: 0,
      average_load_time: loadTimes.length > 0 
        ? loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length 
        : 0,
      error_rate: recentLogs.length > 0 ? errors / recentLogs.length : 0,
      top_cards: Array.from(cardCounts.entries())
        .map(([card_id, view_count]) => ({ card_id, view_count }))
        .sort((a, b) => b.view_count - a.view_count)
        .slice(0, 10),
      top_users: [],
      performance_trends: []
    };
  }

  async generatePhaseCompleteReport(): Promise<Record<string, unknown>> {
    const metrics = this.getUsageMetrics('day');
    
    const report = {
      timestamp: new Date().toISOString(),
      phase: 'Phase3–RuntimeEnablement',
      status: 'Phase3–RuntimeEnablementComplete',
      completion_summary: {
        total_cards_deployed: new Set(this.logBuffer.map(l => l.resource_id)).size,
        total_users_accessed: new Set(this.logBuffer.map(l => l.user_id)).size,
        total_sessions: metrics.total_sessions,
        total_pageviews: metrics.total_pageviews,
        average_load_time_ms: Math.round(metrics.average_load_time),
        error_rate: Math.round(metrics.error_rate * 100) / 100
      },
      top_performing_cards: metrics.top_cards.slice(0, 5),
      system_health: {
        alerts_triggered: this.logBuffer.filter(l => l.event_type === 'governance_alert').length,
        auth_success_rate: this.calculateAuthSuccessRate(),
        performance_grade: this.getPerformanceGrade(metrics.average_load_time)
      }
    };

    console.log('SPQR Phase 3 Complete Report:', report);
    return report;
  }

  private calculateAuthSuccessRate(): number {
    const authLogs = this.logBuffer.filter(log => log.event_type === 'auth_attempt');
    if (authLogs.length === 0) return 1;
    
    const successful = authLogs.filter(log => log.success).length;
    return successful / authLogs.length;
  }

  private getPerformanceGrade(avgLoadTime: number): string {
    if (avgLoadTime < 2000) return 'A';
    if (avgLoadTime < 4000) return 'B';
    if (avgLoadTime < 7000) return 'C';
    if (avgLoadTime < 10000) return 'D';
    return 'F';
  }

  destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    this.flushLogs();
  }
}

export { GovernanceLogger, type GovernanceLogEntry, type UsageMetrics, type AlertRule };