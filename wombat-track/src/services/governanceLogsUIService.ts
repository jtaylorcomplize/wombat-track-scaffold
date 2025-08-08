import { EventEmitter } from 'events';
import { logDebug, logInfo, logWarn, logError } from '../utils/logger';

interface GovernanceLogEntry {
  id: string;
  ts: string;
  timestamp: string;
  actor: string;
  entryType: string;
  classification: string;
  project_id?: string;
  phase_id?: string;
  step_id?: string;
  summary: string;
  status?: string;
  gptDraftEntry?: string;
  details?: any;
  links?: string[];
  memory_anchor_id?: string;
  source?: string;
  driveSessionId?: string;
}

interface GovernanceLogsFilter {
  phase_id?: string;
  step_id?: string;
  project_id?: string;
  entryType?: string;
  classification?: string;
  actor?: string;
  from?: string;
  to?: string;
  limit?: number;
}

interface LogUpdateEvent {
  type: 'created' | 'updated' | 'deleted';
  log: GovernanceLogEntry;
  timestamp: string;
}

class GovernanceLogsUIService extends EventEmitter {
  private ws: WebSocket | null = null;
  private sse: EventSource | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private apiBaseUrl: string;
  private useWebSocket: boolean = true;
  private logs: Map<string, GovernanceLogEntry> = new Map();

  constructor(apiBaseUrl: string = '') {
    super();
    this.apiBaseUrl = apiBaseUrl || process.env.REACT_APP_API_BASE_URL || '';
  }

  // Fetch governance logs with filters
  async fetchLogs(filters?: GovernanceLogsFilter): Promise<GovernanceLogEntry[]> {
    try {
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, String(value));
          }
        });
      }

      const response = await fetch(`${this.apiBaseUrl}/api/admin/governance_logs?${params.toString()}`, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch logs: ${response.statusText}`);
      }

      const data = await response.json();
      const logs = data.logs || data.data || data;
      
      // Update internal cache
      logs.forEach((log: GovernanceLogEntry) => {
        this.logs.set(log.id, log);
      });

      return logs;
    } catch (error) {
      logError('GovernanceLogsUIService', 'Error fetching governance logs', error as Error, { filters });
      throw error;
    }
  }

  // Create a new governance log
  async createLog(log: Partial<GovernanceLogEntry>): Promise<GovernanceLogEntry> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/admin/governance_logs`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...log,
          ts: log.ts || new Date().toISOString(),
          timestamp: log.timestamp || new Date().toISOString(),
          id: log.id || `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to create log: ${response.statusText}`);
      }

      const createdLog = await response.json();
      this.logs.set(createdLog.id, createdLog);
      
      // Emit event for real-time update
      this.emit('logUpdate', {
        type: 'created',
        log: createdLog,
        timestamp: new Date().toISOString()
      });

      return createdLog;
    } catch (error) {
      logError('GovernanceLogsUIService', 'Error creating governance log', error as Error, { log });
      throw error;
    }
  }

  // Update an existing governance log
  async updateLog(id: string, updates: Partial<GovernanceLogEntry>): Promise<GovernanceLogEntry> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/admin/governance_logs/${id}`, {
        method: 'PUT',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error(`Failed to update log: ${response.statusText}`);
      }

      const updatedLog = await response.json();
      this.logs.set(updatedLog.id, updatedLog);
      
      // Emit event for real-time update
      this.emit('logUpdate', {
        type: 'updated',
        log: updatedLog,
        timestamp: new Date().toISOString()
      });

      return updatedLog;
    } catch (error) {
      console.error('Error updating governance log:', error);
      throw error;
    }
  }

  // Delete a governance log
  async deleteLog(id: string): Promise<void> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/admin/governance_logs/${id}`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to delete log: ${response.statusText}`);
      }

      const deletedLog = this.logs.get(id);
      this.logs.delete(id);
      
      // Emit event for real-time update
      if (deletedLog) {
        this.emit('logUpdate', {
          type: 'deleted',
          log: deletedLog,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error deleting governance log:', error);
      throw error;
    }
  }

  // Connect to real-time updates via WebSocket
  connectWebSocket(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const wsUrl = this.apiBaseUrl.replace(/^http/, 'ws');
      this.ws = new WebSocket(`${wsUrl}/ws/governance-logs`);

      this.ws.onopen = () => {
        logInfo('GovernanceLogsUIService', 'WebSocket connected for governance logs');
        this.reconnectAttempts = 0;
        this.emit('connected');
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleRealtimeUpdate(data);
        } catch (error) {
          logError('GovernanceLogsUIService', 'Error parsing WebSocket message', error as Error, { message: event.data });
        }
      };

      this.ws.onerror = (error) => {
        logError('GovernanceLogsUIService', 'WebSocket error', error as any);
        this.emit('error', error);
      };

      this.ws.onclose = () => {
        logInfo('GovernanceLogsUIService', 'WebSocket disconnected');
        this.emit('disconnected');
        this.scheduleReconnect();
      };
    } catch (error) {
      logError('GovernanceLogsUIService', 'Failed to connect WebSocket', error as Error);
      this.fallbackToSSE();
    }
  }

  // Connect to real-time updates via Server-Sent Events (fallback)
  connectSSE(): void {
    if (this.sse && this.sse.readyState === EventSource.OPEN) {
      return;
    }

    try {
      this.sse = new EventSource(`${this.apiBaseUrl}/api/admin/governance_logs/stream`);

      this.sse.onopen = () => {
        console.log('SSE connected for governance logs');
        this.reconnectAttempts = 0;
        this.emit('connected');
      };

      this.sse.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleRealtimeUpdate(data);
        } catch (error) {
          console.error('Error parsing SSE message:', error);
        }
      };

      this.sse.onerror = (error) => {
        console.error('SSE error:', error);
        this.emit('error', error);
        
        if (this.sse?.readyState === EventSource.CLOSED) {
          this.scheduleReconnect();
        }
      };
    } catch (error) {
      console.error('Failed to connect SSE:', error);
      this.fallbackToPolling();
    }
  }

  // Handle real-time updates from WebSocket/SSE
  private handleRealtimeUpdate(data: any): void {
    if (data.type === 'driveMemoryUpdate') {
      // Handle drive memory watcher events
      this.handleDriveMemoryUpdate(data);
    } else if (data.log) {
      // Handle direct log updates
      const log = data.log as GovernanceLogEntry;
      const updateType = data.type || 'updated';
      
      if (updateType === 'deleted') {
        this.logs.delete(log.id);
      } else {
        this.logs.set(log.id, log);
      }

      this.emit('logUpdate', {
        type: updateType,
        log: log,
        timestamp: data.timestamp || new Date().toISOString()
      });
    }
  }

  // Handle drive memory watcher events
  private handleDriveMemoryUpdate(data: any): void {
    if (data.governanceLog) {
      const log = data.governanceLog as GovernanceLogEntry;
      this.logs.set(log.id, log);
      
      this.emit('driveMemoryUpdate', {
        sessionId: data.sessionId,
        log: log,
        filePath: data.filePath,
        timestamp: data.timestamp || new Date().toISOString()
      });

      this.emit('logUpdate', {
        type: 'created',
        log: log,
        timestamp: data.timestamp || new Date().toISOString()
      });
    }
  }

  // Fallback to SSE if WebSocket fails
  private fallbackToSSE(): void {
    logWarn('GovernanceLogsUIService', 'Falling back to SSE for real-time updates');
    this.useWebSocket = false;
    this.connectSSE();
  }

  // Fallback to polling if both WebSocket and SSE fail
  private fallbackToPolling(): void {
    logWarn('GovernanceLogsUIService', 'Falling back to polling for updates');
    this.startPolling();
  }

  // Start polling for updates
  private pollingInterval: NodeJS.Timeout | null = null;
  private startPolling(interval: number = 30000): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }

    this.pollingInterval = setInterval(async () => {
      try {
        await this.fetchLogs();
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, interval);
  }

  // Stop polling
  private stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  // Schedule reconnection attempt
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnection attempts reached, falling back to polling');
      this.fallbackToPolling();
      return;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;

    console.log(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);
    
    this.reconnectTimer = setTimeout(() => {
      if (this.useWebSocket) {
        this.connectWebSocket();
      } else {
        this.connectSSE();
      }
    }, delay);
  }

  // Connect to real-time updates (auto-selects WebSocket or SSE)
  connect(): void {
    if (this.useWebSocket) {
      this.connectWebSocket();
    } else {
      this.connectSSE();
    }
  }

  // Disconnect from real-time updates
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    if (this.sse) {
      this.sse.close();
      this.sse = null;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.stopPolling();
    this.emit('disconnected');
  }

  // Get cached log by ID
  getLog(id: string): GovernanceLogEntry | undefined {
    return this.logs.get(id);
  }

  // Get all cached logs
  getCachedLogs(): GovernanceLogEntry[] {
    return Array.from(this.logs.values());
  }

  // Search logs locally
  searchLogs(searchTerm: string): GovernanceLogEntry[] {
    const term = searchTerm.toLowerCase();
    return this.getCachedLogs().filter(log =>
      log.summary?.toLowerCase().includes(term) ||
      log.gptDraftEntry?.toLowerCase().includes(term) ||
      log.actor?.toLowerCase().includes(term) ||
      log.entryType?.toLowerCase().includes(term) ||
      log.phase_id?.toLowerCase().includes(term) ||
      log.step_id?.toLowerCase().includes(term) ||
      log.project_id?.toLowerCase().includes(term)
    );
  }

  // Get logs by phase
  getLogsByPhase(phaseId: string): GovernanceLogEntry[] {
    return this.getCachedLogs().filter(log => log.phase_id === phaseId);
  }

  // Get logs by step
  getLogsByStep(stepId: string): GovernanceLogEntry[] {
    return this.getCachedLogs().filter(log => log.step_id === stepId);
  }

  // Get logs by project
  getLogsByProject(projectId: string): GovernanceLogEntry[] {
    return this.getCachedLogs().filter(log => log.project_id === projectId);
  }

  // Generate AI summary for a log
  async generateAISummary(log: GovernanceLogEntry): Promise<string> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/admin/governance_logs/${log.id}/ai-summary`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ log })
      });

      if (!response.ok) {
        throw new Error(`Failed to generate AI summary: ${response.statusText}`);
      }

      const data = await response.json();
      return data.summary || data.gptDraftEntry || '';
    } catch (error) {
      console.error('Error generating AI summary:', error);
      
      // Fallback to basic summary generation
      return this.generateLocalSummary(log);
    }
  }

  // Generate a local summary without AI
  private generateLocalSummary(log: GovernanceLogEntry): string {
    const action = log.entryType?.toLowerCase() || 'updated';
    const target = log.phase_id || log.step_id || log.project_id || 'system';
    const actor = log.actor || 'System';
    
    return `${actor} ${action} ${target} - ${log.summary}`;
  }
}

// Export singleton instance
export const governanceLogsUIService = new GovernanceLogsUIService();

// Export class for testing
export { GovernanceLogsUIService };

// Export types
export type { GovernanceLogEntry, GovernanceLogsFilter, LogUpdateEvent };