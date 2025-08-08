/**
 * Browser-compatible Governance Logger
 * Sends governance logs to API instead of writing to files directly
 */

import type { BaseGovernanceEvent, ProjectSurfaceSelectEvent, SubAppSelectEvent } from './enhancedGovernanceLogger';

export class BrowserGovernanceLogger {
  private apiBaseUrl: string;
  private isEnabled: boolean;
  private logQueue: BaseGovernanceEvent[] = [];
  private flushInterval: number;

  constructor() {
    this.apiBaseUrl = '/api';
    this.isEnabled = true;
    this.flushInterval = 5000; // Flush logs every 5 seconds

    // Start periodic log flushing
    setInterval(() => {
      this.flushLogs();
    }, this.flushInterval);
  }

  /**
   * Log project surface selection
   */
  logProjectSurfaceSelect(
    surface: string,
    previousSurface?: string,
    navigationType: string = 'sidebar_click'
  ): void {
    const event: ProjectSurfaceSelectEvent = {
      event: 'project_surface_select',
      entityId: surface,
      timestamp: new Date().toISOString(),
      sessionId: this.getSessionId(),
      context: {
        surface,
        previousSurface,
        navigationType
      }
    };

    this.queueEvent(event);
  }

  /**
   * Log sub-app selection
   */
  logSubAppSelect(
    subAppId: string,
    subAppName: string,
    projectCount: number,
    recentProjects: string[] = [],
    previousContext?: string
  ): void {
    const event: SubAppSelectEvent = {
      event: 'sub_app_select',
      entityId: subAppId,
      timestamp: new Date().toISOString(),
      sessionId: this.getSessionId(),
      context: {
        subAppName,
        projectCount,
        recentProjects,
        previousContext
      }
    };

    this.queueEvent(event);
  }

  /**
   * Log view all projects action
   */
  logViewAllProjects(
    subAppId: string,
    subAppName: string,
    projectCount: number,
    viewType: string = 'sidebar_click'
  ): void {
    const event: BaseGovernanceEvent = {
      event: 'view_all_projects',
      entityId: subAppId,
      timestamp: new Date().toISOString(),
      sessionId: this.getSessionId(),
      context: {
        subAppName,
        projectCount,
        viewType
      }
    };

    this.queueEvent(event);
  }

  /**
   * Log accordion toggle
   */
  logAccordionToggle(
    sectionId: string,
    action: string,
    expandedSections: string[]
  ): void {
    const event: BaseGovernanceEvent = {
      event: 'accordion_toggle',
      entityId: sectionId,
      timestamp: new Date().toISOString(),
      sessionId: this.getSessionId(),
      context: {
        action,
        expandedSections,
        totalExpanded: expandedSections.length
      }
    };

    this.queueEvent(event);
  }

  /**
   * Log sub-app launch
   */
  logSubAppLaunch(
    subAppId: string,
    subAppName: string,
    launchUrl: string,
    launchType: string = 'external_link'
  ): void {
    const event: BaseGovernanceEvent = {
      event: 'sub_app_launch',
      entityId: subAppId,
      timestamp: new Date().toISOString(),
      sessionId: this.getSessionId(),
      context: {
        subAppName,
        launchUrl,
        launchType,
        referrer: window.location.href
      }
    };

    this.queueEvent(event);
  }

  /**
   * Log sidebar interaction (generic)
   */
  logSidebarInteraction(data: {
    action: string;
    target: string;
    context: string;
    metadata?: Record<string, unknown>;
  }): void {
    const event: BaseGovernanceEvent = {
      event: 'sidebar_interaction',
      entityId: data.target,
      timestamp: new Date().toISOString(),
      sessionId: this.getSessionId(),
      context: {
        action: data.action,
        target: data.target,
        context: data.context,
        currentUrl: window.location.href,
        ...data.metadata
      }
    };

    this.queueEvent(event);
  }

  /**
   * Log sidebar toggle
   */
  logSidebarToggle(action: string, currentPath: string): void {
    const event: BaseGovernanceEvent = {
      event: 'sidebar_toggle',
      entityId: 'sidebar',
      timestamp: new Date().toISOString(),
      sessionId: this.getSessionId(),
      context: {
        action,
        currentPath,
        screenSize: `${window.innerWidth}x${window.innerHeight}`
      }
    };

    this.queueEvent(event);
  }

  /**
   * Queue event for batch sending
   */
  protected queueEvent(event: BaseGovernanceEvent): void {
    if (!this.isEnabled) return;

    this.logQueue.push(event);

    // Also log to console for development
    if ((window as any).DEBUG_GOVERNANCE || window.location.hostname === 'localhost') {
      console.log('[Governance]', event.event, event.context);
    }

    // If queue is getting large, flush immediately
    if (this.logQueue.length >= 10) {
      this.flushLogs();
    }
  }

  /**
   * Flush queued logs to API
   */
  private async flushLogs(): Promise<void> {
    if (this.logQueue.length === 0) return;

    const logsToFlush = [...this.logQueue];
    this.logQueue = [];

    try {
      const response = await fetch(`${this.apiBaseUrl}/governance/logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          logs: logsToFlush,
          timestamp: new Date().toISOString(),
          source: 'browser'
        })
      });

      // If API endpoint doesn't exist (404), store in localStorage as fallback
      if (response.status === 404) {
        this.storeLogsLocally(logsToFlush);
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      // Silently handle API failures in development mode
      if (process.env.NODE_ENV === 'development') {
        this.storeLogsLocally(logsToFlush);
        return;
      }
      
      console.warn('[Governance] Failed to flush logs to API:', error);
      
      // Re-queue logs for next attempt (limit to prevent memory issues)
      if (this.logQueue.length < 50) {
        this.logQueue.unshift(...logsToFlush.slice(-10));
      }
    }
  }

  /**
   * Store logs locally when API is unavailable
   */
  private storeLogsLocally(logs: BaseGovernanceEvent[]): void {
    try {
      const existingLogs = JSON.parse(localStorage.getItem('governance-logs') || '[]');
      const updatedLogs = [...existingLogs, ...logs].slice(-100); // Keep last 100 logs
      localStorage.setItem('governance-logs', JSON.stringify(updatedLogs));
    } catch (error) {
      // Silently ignore localStorage errors
    }
  }

  /**
   * Get or create session ID
   */
  protected getSessionId(): string {
    let sessionId = sessionStorage.getItem('governance_session_id');
    if (!sessionId) {
      sessionId = `browser_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('governance_session_id', sessionId);
    }
    return sessionId;
  }

  /**
   * Enable/disable logging
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Get logging status
   */
  isLoggingEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Flush remaining logs before page unload
   */
  flush(): Promise<void> {
    return this.flushLogs();
  }
}

/**
 * Browser-compatible GovernanceLogger class (singleton pattern)
 * Compatible with the server-side GovernanceLogger interface
 */
export class GovernanceLogger extends BrowserGovernanceLogger {
  private static instance: GovernanceLogger;

  private constructor() {
    super();
  }

  public static getInstance(): GovernanceLogger {
    if (!GovernanceLogger.instance) {
      GovernanceLogger.instance = new GovernanceLogger();
    }
    return GovernanceLogger.instance;
  }

  // Additional methods for SPQR compatibility
  logDashboardAccess(dashboardId: string, userId: string, userRole: string): void {
    this.queueEvent({
      event: 'dashboard_access',
      entityId: dashboardId,
      timestamp: new Date().toISOString(),
      sessionId: this.getSessionId(),
      userId,
      context: {
        userId,
        userRole,
        dashboardId,
        accessTime: new Date().toISOString()
      }
    });
  }

  logDashboardInteraction(dashboardId: string, action: string, details: Record<string, unknown>): void {
    this.queueEvent({
      event: 'dashboard_interaction',
      entityId: dashboardId,
      timestamp: new Date().toISOString(),
      sessionId: this.getSessionId(),
      context: {
        dashboardId,
        action,
        ...details
      }
    });
  }

  logRuntimeEvent(eventType: string, details: Record<string, unknown>): void {
    this.queueEvent({
      event: 'runtime_event',
      entityId: eventType,
      timestamp: new Date().toISOString(),
      sessionId: this.getSessionId(),
      context: {
        eventType,
        ...details
      }
    });
  }

  // Override methods to make them public for compatibility
  public queueEvent(event: BaseGovernanceEvent): void {
    super.queueEvent(event);
  }

  public getSessionId(): string {
    return super.getSessionId();
  }
}

// Create singleton instances
export const governanceLogger = new BrowserGovernanceLogger();
export const governanceLoggerInstance = GovernanceLogger.getInstance();

// Flush logs before page unload
window.addEventListener('beforeunload', () => {
  governanceLogger.flush();
  governanceLoggerInstance.flush();
});

export default governanceLogger;