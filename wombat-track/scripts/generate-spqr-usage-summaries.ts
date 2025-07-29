import * as fs from 'fs/promises';
import * as path from 'path';
import { GovernanceLogger, type GovernanceLogEntry } from '../src/services/governance-logger';

interface UsageSummary {
  period: 'daily' | 'weekly';
  startDate: string;
  endDate: string;
  timestamp: string;
  phase: string;
  metrics: {
    total_dashboards_accessed: number;
    unique_users: number;
    total_sessions: number;
    total_interactions: number;
    average_load_time_ms: number;
    error_rate: number;
    performance_breakdown: {
      A: number;
      B: number;
      C: number;
      D: number;
      F: number;
    };
    rag_score_distribution: {
      red: number;
      amber: number;
      green: number;
      blue: number;
    };
    top_dashboards: Array<{ dashboard_id: string; access_count: number; avg_load_time: number }>;
    top_users: Array<{ user_id: string; user_role: string; session_count: number }>;
    alerts_triggered: number;
    critical_issues: string[];
  };
  recommendations: string[];
}

class SPQRUsageSummaryGenerator {
  private governanceLogPath: string;
  private driveMemoryPath: string;
  private logger: GovernanceLogger;

  constructor() {
    this.governanceLogPath = path.join(process.cwd(), 'logs', 'governance.jsonl');
    this.driveMemoryPath = path.join(process.cwd(), 'drive-memory', 'spqr-usage-summaries');
    this.logger = GovernanceLogger.getInstance();
  }

  async generateSummaries(): Promise<void> {
    console.log('Starting SPQR usage summary generation...');
    
    try {
      await this.ensureDirectories();
      
      const logs = await this.loadGovernanceLogs();
      
      const dailySummary = await this.generateDailySummary(logs);
      const weeklySummary = await this.generateWeeklySummary(logs);
      
      await this.saveSummaries(dailySummary, weeklySummary);
      await this.appendToGovernanceLog(dailySummary, weeklySummary);
      
      console.log('✅ SPQR usage summaries generated successfully');
    } catch (error) {
      console.error('❌ Error generating usage summaries:', error);
      throw error;
    }
  }

  private async ensureDirectories(): Promise<void> {
    await fs.mkdir(this.driveMemoryPath, { recursive: true });
  }

  private async loadGovernanceLogs(): Promise<GovernanceLogEntry[]> {
    try {
      const content = await fs.readFile(this.governanceLogPath, 'utf-8');
      return content
        .split('\n')
        .filter(line => line.trim())
        .map(line => JSON.parse(line));
    } catch (error) {
      console.error('Error reading governance logs:', error);
      return [];
    }
  }

  private async generateDailySummary(logs: GovernanceLogEntry[]): Promise<UsageSummary> {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    
    const dailyLogs = logs.filter(log => 
      new Date(log.timestamp) >= startOfDay
    );

    return this.createSummary(dailyLogs, 'daily', startOfDay, now);
  }

  private async generateWeeklySummary(logs: GovernanceLogEntry[]): Promise<UsageSummary> {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - 7);
    startOfWeek.setHours(0, 0, 0, 0);
    
    const weeklyLogs = logs.filter(log => 
      new Date(log.timestamp) >= startOfWeek
    );

    return this.createSummary(weeklyLogs, 'weekly', startOfWeek, now);
  }

  private createSummary(logs: GovernanceLogEntry[], period: 'daily' | 'weekly', startDate: Date, endDate: Date): UsageSummary {
    const dashboardAccesses = new Map<string, { count: number; loadTimes: number[] }>();
    const userSessions = new Map<string, { role: string; sessions: Set<string> }>();
    const performanceGrades = { A: 0, B: 0, C: 0, D: 0, F: 0 };
    const ragScores = { red: 0, amber: 0, green: 0, blue: 0 };
    
    let totalInteractions = 0;
    let totalErrors = 0;
    let alertsTriggered = 0;
    const criticalIssues: string[] = [];

    logs.forEach(log => {
      if (log.resource_type === 'dashboard') {
        const dashData = dashboardAccesses.get(log.resource_id) || { count: 0, loadTimes: [] };
        dashData.count++;
        if (log.performance_metrics?.load_time_ms) {
          dashData.loadTimes.push(log.performance_metrics.load_time_ms);
        }
        dashboardAccesses.set(log.resource_id, dashData);
      }

      if (log.session_id) {
        const userData = userSessions.get(log.user_id) || { role: log.user_role, sessions: new Set() };
        userData.sessions.add(log.session_id);
        userSessions.set(log.user_id, userData);
      }

      if (log.action !== 'view' && log.action !== 'load') {
        totalInteractions++;
      }

      if (!log.success) {
        totalErrors++;
      }

      if (log.event_type === 'governance_alert') {
        alertsTriggered++;
      }

      if (log.rag_metrics?.performance_grade) {
        performanceGrades[log.rag_metrics.performance_grade]++;
      }

      if (log.rag_metrics?.score) {
        ragScores[log.rag_metrics.score]++;
      }

      if (log.event_type === 'error' && log.details?.error_message) {
        criticalIssues.push(log.details.error_message as string);
      }
    });

    const topDashboards = Array.from(dashboardAccesses.entries())
      .map(([id, data]) => ({
        dashboard_id: id,
        access_count: data.count,
        avg_load_time: data.loadTimes.length > 0 
          ? Math.round(data.loadTimes.reduce((a, b) => a + b, 0) / data.loadTimes.length)
          : 0
      }))
      .sort((a, b) => b.access_count - a.access_count)
      .slice(0, 5);

    const topUsers = Array.from(userSessions.entries())
      .map(([id, data]) => ({
        user_id: id,
        user_role: data.role,
        session_count: data.sessions.size
      }))
      .sort((a, b) => b.session_count - a.session_count)
      .slice(0, 5);

    const allLoadTimes = Array.from(dashboardAccesses.values())
      .flatMap(d => d.loadTimes);
    
    const avgLoadTime = allLoadTimes.length > 0
      ? Math.round(allLoadTimes.reduce((a, b) => a + b, 0) / allLoadTimes.length)
      : 0;

    const errorRate = logs.length > 0 ? totalErrors / logs.length : 0;

    const recommendations = this.generateRecommendations(
      avgLoadTime,
      errorRate,
      performanceGrades,
      ragScores,
      criticalIssues.length
    );

    return {
      period,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      timestamp: new Date().toISOString(),
      phase: 'Phase4–RuntimeObservability',
      metrics: {
        total_dashboards_accessed: dashboardAccesses.size,
        unique_users: userSessions.size,
        total_sessions: Array.from(userSessions.values())
          .reduce((sum, data) => sum + data.sessions.size, 0),
        total_interactions: totalInteractions,
        average_load_time_ms: avgLoadTime,
        error_rate: Math.round(errorRate * 1000) / 1000,
        performance_breakdown: performanceGrades,
        rag_score_distribution: ragScores,
        top_dashboards: topDashboards,
        top_users: topUsers,
        alerts_triggered: alertsTriggered,
        critical_issues: [...new Set(criticalIssues)].slice(0, 10)
      },
      recommendations
    };
  }

  private generateRecommendations(
    avgLoadTime: number,
    errorRate: number,
    performanceGrades: Record<string, number>,
    ragScores: Record<string, number>,
    criticalIssueCount: number
  ): string[] {
    const recommendations: string[] = [];

    if (avgLoadTime > 5000) {
      recommendations.push(`Average load time (${avgLoadTime}ms) exceeds acceptable threshold. Optimize dashboard queries.`);
    }

    if (errorRate > 0.1) {
      recommendations.push(`Error rate (${(errorRate * 100).toFixed(1)}%) is high. Review error logs and implement fixes.`);
    }

    const totalGrades = Object.values(performanceGrades).reduce((a, b) => a + b, 0);
    if (totalGrades > 0) {
      const poorPerformance = (performanceGrades.D + performanceGrades.F) / totalGrades;
      if (poorPerformance > 0.3) {
        recommendations.push('Over 30% of dashboards have poor performance grades. System-wide optimization needed.');
      }
    }

    const totalRagScores = Object.values(ragScores).reduce((a, b) => a + b, 0);
    if (totalRagScores > 0) {
      const criticalScores = (ragScores.red + ragScores.amber) / totalRagScores;
      if (criticalScores > 0.4) {
        recommendations.push('High percentage of critical RAG scores. Immediate attention required for dashboard health.');
      }
    }

    if (criticalIssueCount > 5) {
      recommendations.push(`${criticalIssueCount} critical issues detected. Review and address immediately.`);
    }

    if (recommendations.length === 0) {
      recommendations.push('System performing within acceptable parameters. Continue monitoring.');
    }

    return recommendations;
  }

  private async saveSummaries(dailySummary: UsageSummary, weeklySummary: UsageSummary): Promise<void> {
    const date = new Date().toISOString().split('T')[0];
    
    const dailyPath = path.join(this.driveMemoryPath, `daily-summary-${date}.json`);
    const weeklyPath = path.join(this.driveMemoryPath, `weekly-summary-${date}.json`);
    
    await fs.writeFile(dailyPath, JSON.stringify(dailySummary, null, 2));
    await fs.writeFile(weeklyPath, JSON.stringify(weeklySummary, null, 2));
    
    console.log(`📁 Daily summary saved to: ${dailyPath}`);
    console.log(`📁 Weekly summary saved to: ${weeklyPath}`);
  }

  private async appendToGovernanceLog(dailySummary: UsageSummary, weeklySummary: UsageSummary): Promise<void> {
    const dailyEntry: GovernanceLogEntry = {
      timestamp: new Date().toISOString(),
      event_type: 'usage_summary_generated',
      user_id: 'system',
      user_role: 'system',
      resource_type: 'dashboard',
      resource_id: 'all',
      action: 'generate_daily_summary',
      success: true,
      details: dailySummary,
      runtime_context: {
        phase: 'Phase4–RuntimeObservability',
        environment: 'production'
      }
    };

    const weeklyEntry: GovernanceLogEntry = {
      timestamp: new Date().toISOString(),
      event_type: 'usage_summary_generated',
      user_id: 'system',
      user_role: 'system',
      resource_type: 'dashboard',
      resource_id: 'all',
      action: 'generate_weekly_summary',
      success: true,
      details: weeklySummary,
      runtime_context: {
        phase: 'Phase4–RuntimeObservability',
        environment: 'production'
      }
    };

    const logEntries = [
      JSON.stringify(dailyEntry),
      JSON.stringify(weeklyEntry)
    ].join('\n') + '\n';

    await fs.appendFile(this.governanceLogPath, logEntries);
    
    console.log('📝 Usage summaries appended to governance log');
  }
}

async function main() {
  try {
    const generator = new SPQRUsageSummaryGenerator();
    await generator.generateSummaries();
    
    const phaseCompleteEntry = {
      timestamp: new Date().toISOString(),
      event_type: 'phase_milestone',
      user_id: 'system',
      user_role: 'system',
      resource_type: 'dashboard',
      resource_id: 'all',
      action: 'phase_complete',
      success: true,
      details: {
        phase: 'Phase4–RuntimeObservability',
        status: 'Phase4–RuntimeObservabilityComplete',
        completion_tasks: [
          'SPQRDashboardMetrics.tsx created',
          'GovernanceLogger enhanced with runtime metrics',
          'Alert integration configured',
          'RAG scoring implemented',
          'Usage summary generation automated'
        ],
        next_steps: [
          'Schedule daily/weekly summary generation via cron',
          'Configure production alert endpoints',
          'Monitor dashboard health metrics',
          'Review and act on recommendations'
        ]
      }
    };
    
    await fs.appendFile(
      path.join(process.cwd(), 'logs', 'governance.jsonl'),
      JSON.stringify(phaseCompleteEntry) + '\n'
    );
    
    console.log('\n🎉 Phase 4 – Runtime Observability Complete!');
    console.log('✅ All Phase 4 objectives achieved:');
    console.log('   - Real-time dashboard performance monitoring');
    console.log('   - Automated governance logging with runtime metrics');
    console.log('   - Alert system for runtime anomalies');
    console.log('   - RAG health scoring implementation');
    console.log('   - Usage summary generation to DriveMemory');
    
  } catch (error) {
    console.error('Failed to generate usage summaries:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}