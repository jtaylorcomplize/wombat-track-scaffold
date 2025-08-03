// Governance logging service for Enhanced Sidebar v2.0 interactions

interface GovernanceLogEntry {
  timestamp: string;
  event_type: string;
  user_id: string;
  user_role: string;
  resource_type: string;
  resource_id: string;
  action: string;
  success: boolean;
  details: Record<string, any>;
}

interface SidebarInteractionContext {
  action: 'sub_app_launch' | 'surface_switch' | 'project_switch' | 'accordion_toggle' | 'settings_access';
  target: string;
  context: 'sidebar_navigation';
  metadata?: Record<string, any>;
}

class GovernanceLogger {
  private static instance: GovernanceLogger;
  private logQueue: GovernanceLogEntry[] = [];
  private isFlushPending = false;

  private constructor() {}

  static getInstance(): GovernanceLogger {
    if (!GovernanceLogger.instance) {
      GovernanceLogger.instance = new GovernanceLogger();
    }
    return GovernanceLogger.instance;
  }

  /**
   * Log sidebar interaction with governance context
   */
  logSidebarInteraction(interaction: SidebarInteractionContext): void {
    const entry: GovernanceLogEntry = {
      timestamp: new Date().toISOString(),
      event_type: 'sidebar_interaction',
      user_id: this.getCurrentUserId(),
      user_role: this.getCurrentUserRole(),
      resource_type: 'sidebar_component',
      resource_id: 'enhanced-sidebar-v2.0',
      action: interaction.action,
      success: true,
      details: {
        target: interaction.target,
        context: interaction.context,
        sidebar_version: '2.0',
        ...interaction.metadata
      }
    };

    this.queueLogEntry(entry);
  }

  /**
   * Log sub-app launch specifically
   */
  logSubAppLaunch(subAppId: string, launchUrl: string, subAppName: string): void {
    this.logSidebarInteraction({
      action: 'sub_app_launch',
      target: subAppName,
      context: 'sidebar_navigation',
      metadata: {
        sub_app_id: subAppId,
        launch_url: launchUrl,
        launch_method: 'direct_click',
        opened_in_new_tab: true
      }
    });
  }

  /**
   * Log surface navigation
   */
  logSurfaceSwitch(fromSurface: string, toSurface: string, projectContext?: string): void {
    this.logSidebarInteraction({
      action: 'surface_switch',
      target: toSurface,
      context: 'sidebar_navigation',
      metadata: {
        from_surface: fromSurface,
        to_surface: toSurface,
        project_context: projectContext,
        navigation_type: 'sidebar_click'
      }
    });
  }

  /**
   * Log project switching
   */
  logProjectSwitch(fromProjectId: string, toProjectId: string, toProjectName: string): void {
    this.logSidebarInteraction({
      action: 'project_switch',
      target: toProjectName,
      context: 'sidebar_navigation',
      metadata: {
        from_project_id: fromProjectId,
        to_project_id: toProjectId,
        to_project_name: toProjectName,
        switch_method: 'dropdown_selector'
      }
    });
  }

  /**
   * Log accordion section toggle
   */
  logAccordionToggle(sectionId: string, expanded: boolean): void {
    this.logSidebarInteraction({
      action: 'accordion_toggle',
      target: sectionId,
      context: 'sidebar_navigation',
      metadata: {
        section_id: sectionId,
        expanded: expanded,
        interaction_type: 'click'
      }
    });
  }

  /**
   * Log settings access
   */
  logSettingsAccess(settingsType: string): void {
    this.logSidebarInteraction({
      action: 'settings_access',
      target: settingsType,
      context: 'sidebar_navigation',
      metadata: {
        settings_type: settingsType,
        access_method: 'header_button'
      }
    });
  }

  /**
   * Queue log entry for batch processing
   */
  private queueLogEntry(entry: GovernanceLogEntry): void {
    this.logQueue.push(entry);
    
    // Batch flush to avoid too many API calls
    if (!this.isFlushPending) {
      this.isFlushPending = true;
      setTimeout(() => {
        this.flushLogs();
      }, 1000); // Flush after 1 second
    }
  }

  /**
   * Flush queued logs to server
   */
  private async flushLogs(): Promise<void> {
    if (this.logQueue.length === 0) {
      this.isFlushPending = false;
      return;
    }

    const logsToFlush = [...this.logQueue];
    this.logQueue = [];
    this.isFlushPending = false;

    try {
      // In development, log to console and local file
      if (import.meta.env.DEV) {
        console.log('🔍 Governance Logs (Enhanced Sidebar v2.0):', logsToFlush);
        
        // Also append to local governance.jsonl file
        this.appendToLocalGovernanceLog(logsToFlush);
        return;
      }

      // Production: send to governance API
      const response = await fetch('/api/governance/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ entries: logsToFlush })
      });

      if (!response.ok) {
        throw new Error(`Governance logging failed: ${response.status}`);
      }

    } catch (error) {
      console.error('Failed to flush governance logs:', error);
      
      // Re-queue failed logs for retry
      this.logQueue.unshift(...logsToFlush);
      
      // Retry after delay
      setTimeout(() => {
        this.flushLogs();
      }, 5000);
    }
  }

  /**
   * Append logs to local governance.jsonl file for development
   */
  private appendToLocalGovernanceLog(entries: GovernanceLogEntry[]): void {
    // This would typically be handled by a development server endpoint
    // For now, we'll simulate by logging to console in JSONL format
    entries.forEach(entry => {
      console.log('GOVERNANCE_LOG:', JSON.stringify(entry));
    });
  }

  /**
   * Get current user ID (mock for development)
   */
  private getCurrentUserId(): string {
    // In production, this would come from authentication context
    return import.meta.env.DEV ? 'dev-user' : 'unknown';
  }

  /**
   * Get current user role (mock for development)
   */
  private getCurrentUserRole(): string {
    // In production, this would come from authentication context
    return import.meta.env.DEV ? 'developer' : 'user';
  }

  /**
   * Create a comprehensive summary entry for the Enhanced Sidebar v2.0 implementation
   */
  logSidebarV2Implementation(): void {
    const entry: GovernanceLogEntry = {
      timestamp: new Date().toISOString(),
      event_type: 'sidebar_enhancement',
      user_id: 'claude',
      user_role: 'assistant',
      resource_type: 'ui_component',
      resource_id: 'enhanced-sidebar-v2.0',
      action: 'implement_accordion_navigation',
      success: true,
      details: {
        operation: 'Enhanced Sidebar v2.0 Implementation',
        phase: 'subapp-qa-phase5',
        anchor: 'of-admin-4.0-enhanced-sidebar-v2.0-20250731',
        components_created: [
          'ProjectHeader.tsx',
          'useSubAppStatus.ts',
          'useAccordionState.ts',
          'governanceLogger.ts',
          'EnhancedProjectSidebar.tsx'
        ],
        features_implemented: [
          'Direct sub-app launch with window.open()',
          'Accordion navigation for all sections',
          'Contextual project header with live status',
          'Real-time sub-app status updates (30s polling)',
          'LocalStorage state persistence',
          'Comprehensive governance logging',
          'Keyboard navigation and ARIA accessibility',
          'Project dropdown selector with RAG status',
          'Live sub-app summary display'
        ],
        technical_specifications: {
          accordion_animation: '300ms transition',
          status_update_interval: '30 seconds',
          storage_keys: [
            'wombat-track-accordion-state',
            'wombat-track-sidebar-v2-preferences'
          ],
          api_endpoints: [
            'GET /api/admin/runtime/status',
            'POST /api/governance/log'
          ]
        },
        user_experience_improvements: [
          'Direct sub-app access from sidebar',
          'Smooth accordion animations',
          'Persistent section expand/collapse state',
          'Live operational status indicators',
          'Contextual project information',
          'Quick project switching',
          'Real-time status tooltips'
        ]
      }
    };

    this.queueLogEntry(entry);
  }
}

// Export singleton instance
export const governanceLogger = GovernanceLogger.getInstance();