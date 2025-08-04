/**
 * Agent Monitoring Service
 * Central monitoring and health check system for all AI agents
 * Provides real-time status, performance metrics, and health monitoring
 */

import { EventEmitter } from 'events';
import { sideQuestDetector } from '../agents/SideQuestDetector';
import { autoAuditAgent } from '../agents/AutoAuditAgent';
import { memoryAnchorAgent } from '../agents/MemoryAnchorAgent';
import type { GizmoAuthService } from './gizmo-auth';
import { enhancedGovernanceLogger } from './enhancedGovernanceLogger';

export interface AgentStatus {
  id: string;
  name: string;
  active: boolean;
  health: 'healthy' | 'warning' | 'critical' | 'offline';
  lastHeartbeat: string;
  uptime: number; // seconds
  performance: AgentPerformanceMetrics;
  errors: AgentError[];
  configuration: Record<string, unknown>;
}

export interface AgentPerformanceMetrics {
  tasksCompleted: number;
  averageTaskTime: number; // milliseconds
  successRate: number; // 0-1
  throughput: number; // tasks per minute
  memoryUsage: number; // MB
  cpuUsage: number; // percentage
}

export interface AgentError {
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  stack?: string;
  context: Record<string, unknown>;
}

export interface SystemHealth {
  overall: 'healthy' | 'warning' | 'critical';
  activeAgents: number;
  totalAgents: number;
  systemLoad: number;
  memoryUsage: number;
  uptime: number;
  lastHealthCheck: string;
}

export interface AgentAlert {
  id: string;
  agentId: string;
  type: 'performance' | 'error' | 'health' | 'config';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: string;
  acknowledged: boolean;
  resolvedAt?: string;
}

export class AgentMonitoringService extends EventEmitter {
  private static instance: AgentMonitoringService;
  private agents: Map<string, AgentStatus>;
  private alerts: Map<string, AgentAlert>;
  private healthCheckInterval?: NodeJS.Timeout;
  private performanceHistory: Map<string, AgentPerformanceMetrics[]>;
  private isRunning: boolean = false;
  private startTime: number;
  private gizmoAuth?: GizmoAuthService;

  private constructor() {
    super();
    this.agents = new Map();
    this.alerts = new Map();
    this.performanceHistory = new Map();
    this.startTime = Date.now();
    
    this.initializeAgentMonitoring();
  }

  static getInstance(): AgentMonitoringService {
    if (!AgentMonitoringService.instance) {
      AgentMonitoringService.instance = new AgentMonitoringService();
    }
    return AgentMonitoringService.instance;
  }

  /**
   * Initialize monitoring for all registered agents
   */
  private initializeAgentMonitoring(): void {
    // Register all known agents
    this.registerAgent('side-quest-detector', 'Side Quest Detector', sideQuestDetector);
    this.registerAgent('auto-audit-agent', 'Auto-Audit Agent', autoAuditAgent);
    this.registerAgent('memory-anchor-agent', 'Memory Anchor Agent', memoryAnchorAgent);
    
    // Set up event listeners for agent events
    this.setupAgentEventListeners();
  }

  /**
   * Register an agent for monitoring
   */
  registerAgent(id: string, name: string, agentInstance: EventEmitter): void {
    const status: AgentStatus = {
      id,
      name,
      active: false,
      health: 'offline',
      lastHeartbeat: new Date().toISOString(),
      uptime: 0,
      performance: {
        tasksCompleted: 0,
        averageTaskTime: 0,
        successRate: 1.0,
        throughput: 0,
        memoryUsage: 0,
        cpuUsage: 0
      },
      errors: [],
      configuration: this.getAgentConfiguration(id, agentInstance)
    };

    this.agents.set(id, status);
    this.performanceHistory.set(id, []);

    // Listen to agent events
    agentInstance.on('agent-started', () => this.handleAgentStarted(id));
    agentInstance.on('agent-stopped', () => this.handleAgentStopped(id));
    agentInstance.on('error', (error) => this.handleAgentError(id, error));
    agentInstance.on('task-completed', (data) => this.handleTaskCompleted(id, data));
    agentInstance.on('performance-update', (metrics) => this.updatePerformanceMetrics(id, metrics));
  }

  /**
   * Start the monitoring service
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.startTime = Date.now();

    // Start periodic health checks
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, 30000); // Every 30 seconds

    this.emit('monitoring-started', {
      timestamp: new Date().toISOString(),
      agentsCount: this.agents.size
    });

    await enhancedGovernanceLogger.logAgentAction('agent-monitoring-service', 'start', {
      agents_monitored: this.agents.size,
      health_check_interval: 30
    });
  }

  /**
   * Stop the monitoring service
   */
  async stop(): Promise<void> {
    this.isRunning = false;

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }

    this.emit('monitoring-stopped', {
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime
    });

    await enhancedGovernanceLogger.logAgentAction('agent-monitoring-service', 'stop', {
      uptime_seconds: Math.floor((Date.now() - this.startTime) / 1000)
    });
  }

  /**
   * Perform health check on all agents
   */
  private async performHealthCheck(): Promise<void> {
    const healthCheckTime = new Date().toISOString();

    for (const [agentId, status] of this.agents) {
      try {
        // Update heartbeat
        status.lastHeartbeat = healthCheckTime;
        
        // Calculate uptime if agent is active
        if (status.active) {
          status.uptime = Math.floor((Date.now() - this.startTime) / 1000);
        }

        // Determine health status based on recent errors and performance
        status.health = this.calculateAgentHealth(status);

        // Check for performance issues
        this.checkPerformanceAlerts(agentId, status);

        // Update agent status
        this.agents.set(agentId, status);

      } catch {
        this.handleAgentError(agentId, error);
      }
    }

    this.emit('health-check-completed', {
      timestamp: healthCheckTime,
      agentsChecked: this.agents.size
    });
  }

  /**
   * Calculate agent health based on errors and performance
   */
  private calculateAgentHealth(status: AgentStatus): 'healthy' | 'warning' | 'critical' | 'offline' {
    if (!status.active) {
      return 'offline';
    }

    const recentErrors = status.errors.filter(error => {
      const errorTime = new Date(error.timestamp).getTime();
      const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
      return errorTime > fiveMinutesAgo;
    });

    const criticalErrors = recentErrors.filter(error => error.severity === 'critical').length;
    const highErrors = recentErrors.filter(error => error.severity === 'high').length;

    if (criticalErrors > 0) {
      return 'critical';
    }

    if (highErrors > 2 || status.performance.successRate < 0.8) {
      return 'warning';
    }

    return 'healthy';
  }

  /**
   * Check for performance-related alerts
   */
  private checkPerformanceAlerts(agentId: string, status: AgentStatus): void {
    const performance = status.performance;

    // Check success rate
    if (performance.successRate < 0.7) {
      this.createAlert(agentId, 'performance', 'high', 
        `Agent ${status.name} has low success rate: ${Math.round(performance.successRate * 100)}%`);
    }

    // Check average task time
    if (performance.averageTaskTime > 10000) { // 10 seconds
      this.createAlert(agentId, 'performance', 'medium',
        `Agent ${status.name} has high average task time: ${performance.averageTaskTime}ms`);
    }

    // Check memory usage
    if (performance.memoryUsage > 500) { // 500MB
      this.createAlert(agentId, 'performance', 'medium',
        `Agent ${status.name} has high memory usage: ${performance.memoryUsage}MB`);
    }
  }

  /**
   * Create an alert
   */
  private createAlert(agentId: string, type: AgentAlert['type'], severity: AgentAlert['severity'], message: string): void {
    const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    
    const alert: AgentAlert = {
      id: alertId,
      agentId,
      type,
      severity,
      message,
      timestamp: new Date().toISOString(),
      acknowledged: false
    };

    this.alerts.set(alertId, alert);
    this.emit('alert-created', alert);

    enhancedGovernanceLogger.logAgentAction('agent-monitoring-service', 'alert-created', {
      alert_id: alertId,
      agent_id: agentId,
      severity,
      type,
      message
    });
  }

  /**
   * Event handlers
   */
  private handleAgentStarted(agentId: string): void {
    const status = this.agents.get(agentId);
    if (status) {
      status.active = true;
      status.health = 'healthy';
      status.lastHeartbeat = new Date().toISOString();
      this.agents.set(agentId, status);
    }

    this.emit('agent-status-changed', { agentId, active: true });
  }

  private handleAgentStopped(agentId: string): void {
    const status = this.agents.get(agentId);
    if (status) {
      status.active = false;
      status.health = 'offline';
      status.uptime = 0;
      this.agents.set(agentId, status);
    }

    this.emit('agent-status-changed', { agentId, active: false });
  }

  private handleAgentError(agentId: string, error: unknown): void {
    const status = this.agents.get(agentId);
    if (!status) return;

    const agentError: AgentError = {
      timestamp: new Date().toISOString(),
      severity: this.determineSeverity(error),
      message: error.message || 'Unknown error',
      stack: error.stack,
      context: { agentId, ...error.context }
    };

    status.errors.push(agentError);
    
    // Keep only last 50 errors
    if (status.errors.length > 50) {
      status.errors = status.errors.slice(-50);
    }

    this.agents.set(agentId, status);
    this.emit('agent-error', { agentId, error: agentError });
  }

  private handleTaskCompleted(agentId: string, data: unknown): void {
    const status = this.agents.get(agentId);
    if (!status) return;

    status.performance.tasksCompleted++;
    
    if (data.executionTime) {
      // Update average task time
      const currentAvg = status.performance.averageTaskTime;
      const taskCount = status.performance.tasksCompleted;
      status.performance.averageTaskTime = 
        ((currentAvg * (taskCount - 1)) + data.executionTime) / taskCount;
    }

    if (data.success !== undefined) {
      // Update success rate
      const successCount = Math.floor(status.performance.successRate * (status.performance.tasksCompleted - 1));
      const newSuccessCount = successCount + (data.success ? 1 : 0);
      status.performance.successRate = newSuccessCount / status.performance.tasksCompleted;
    }

    // Calculate throughput (tasks per minute)
    const uptimeMinutes = status.uptime / 60;
    status.performance.throughput = uptimeMinutes > 0 ? status.performance.tasksCompleted / uptimeMinutes : 0;

    this.agents.set(agentId, status);
  }

  private updatePerformanceMetrics(agentId: string, metrics: Partial<AgentPerformanceMetrics>): void {
    const status = this.agents.get(agentId);
    if (!status) return;

    status.performance = { ...status.performance, ...metrics };
    this.agents.set(agentId, status);

    // Store performance history
    const history = this.performanceHistory.get(agentId) || [];
    history.push({ ...status.performance });
    
    // Keep only last 100 entries
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }
    
    this.performanceHistory.set(agentId, history);
  }

  /**
   * Setup event listeners for agents
   */
  private setupAgentEventListeners(): void {
    // Listen to various agent events for monitoring
    const agentEvents = [
      'side-quest-detected', 'audit-completed', 'anchor-created',
      'gizmo-submission-success', 'gizmo-submission-failed'
    ];

    agentEvents.forEach(eventName => {
      sideQuestDetector.on(eventName, (data) => this.handleTaskCompleted('side-quest-detector', data));
      autoAuditAgent.on(eventName, (data) => this.handleTaskCompleted('auto-audit-agent', data));
      memoryAnchorAgent.on(eventName, (data) => this.handleTaskCompleted('memory-anchor-agent', data));
    });
  }

  /**
   * Get agent configuration
   */
  private getAgentConfiguration(id: string, agentInstance: unknown): Record<string, unknown> {
    try {
      if (typeof agentInstance.getStatus === 'function') {
        return agentInstance.getStatus();
      }
      if (typeof agentInstance.getConfig === 'function') {
        return agentInstance.getConfig();
      }
    } catch {
      // Ignore errors when getting configuration
    }
    
    return { agent_id: id };
  }

  /**
   * Determine error severity
   */
  private determineSeverity(error: unknown): AgentError['severity'] {
    const errorObj = error as Record<string, unknown>;
    if (errorObj.severity) {
      return errorObj.severity as AgentError['severity'];
    }

    const message = String(errorObj.message || '').toLowerCase();
    
    if (message.includes('critical') || message.includes('fatal')) {
      return 'critical';
    }
    if (message.includes('error') || message.includes('failed')) {
      return 'high';
    }
    if (message.includes('warning') || message.includes('warn')) {
      return 'medium';
    }
    
    return 'low';
  }

  /**
   * Public API methods
   */

  /**
   * Get status of all agents
   */
  getAllAgentStatuses(): AgentStatus[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get status of specific agent
   */
  getAgentStatus(agentId: string): AgentStatus | undefined {
    return this.agents.get(agentId);
  }

  /**
   * Get system health overview
   */
  getSystemHealth(): SystemHealth {
    const agents = Array.from(this.agents.values());
    const activeAgents = agents.filter(agent => agent.active).length;
    const healthyAgents = agents.filter(agent => agent.health === 'healthy').length;
    const criticalAgents = agents.filter(agent => agent.health === 'critical').length;

    let overall: SystemHealth['overall'] = 'healthy';
    if (criticalAgents > 0) {
      overall = 'critical';
    } else if (healthyAgents < activeAgents * 0.8) {
      overall = 'warning';
    }

    return {
      overall,
      activeAgents,
      totalAgents: agents.length,
      systemLoad: this.calculateSystemLoad(),
      memoryUsage: this.calculateMemoryUsage(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      lastHealthCheck: new Date().toISOString()
    };
  }

  /**
   * Get all alerts
   */
  getAllAlerts(): AgentAlert[] {
    return Array.from(this.alerts.values());
  }

  /**
   * Get unacknowledged alerts
   */
  getUnacknowledgedAlerts(): AgentAlert[] {
    return Array.from(this.alerts.values()).filter(alert => !alert.acknowledged);
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.acknowledged = true;
      this.alerts.set(alertId, alert);
      this.emit('alert-acknowledged', alert);
      return true;
    }
    return false;
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.resolvedAt = new Date().toISOString();
      this.alerts.set(alertId, alert);
      this.emit('alert-resolved', alert);
      return true;
    }
    return false;
  }

  /**
   * Get performance history for an agent
   */
  getPerformanceHistory(agentId: string): AgentPerformanceMetrics[] {
    return this.performanceHistory.get(agentId) || [];
  }

  /**
   * Calculate system load (simplified)
   */
  private calculateSystemLoad(): number {
    const agents = Array.from(this.agents.values());
    const totalTasks = agents.reduce((sum, agent) => sum + agent.performance.tasksCompleted, 0);
    const uptimeMinutes = (Date.now() - this.startTime) / (1000 * 60);
    
    return uptimeMinutes > 0 ? totalTasks / uptimeMinutes : 0;
  }

  /**
   * Calculate memory usage (simplified)
   */
  private calculateMemoryUsage(): number {
    const agents = Array.from(this.agents.values());
    return agents.reduce((sum, agent) => sum + agent.performance.memoryUsage, 0);
  }

  /**
   * Set Gizmo authentication service
   */
  setGizmoAuth(gizmoAuth: GizmoAuthService): void {
    this.gizmoAuth = gizmoAuth;
    
    // Monitor Gizmo auth events
    gizmoAuth.on('token-acquired', () => this.emit('gizmo-auth-success'));
    gizmoAuth.on('auth-error', (error) => this.emit('gizmo-auth-error', error));
    gizmoAuth.on('token-refreshed', () => this.emit('gizmo-token-refreshed'));
  }
}

// Export singleton instance
export const agentMonitoringService = AgentMonitoringService.getInstance();