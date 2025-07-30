import React, { useState, useEffect } from 'react';
import { Activity, GitBranch, Database, AlertCircle, CheckCircle, Clock, RefreshCw, Zap } from 'lucide-react';

interface RuntimeJob {
  id: string;
  type: 'claude_job' | 'github_dispatch' | 'data_sync';
  status: 'queued' | 'running' | 'completed' | 'failed';
  name: string;
  startTime?: string;
  endTime?: string;
  duration?: number;
  user?: string;
  details?: any;
}

interface OrphanedTable {
  table: string;
  orphanCount: number;
  severity: 'high' | 'medium' | 'low';
  lastChecked: string;
}

interface RuntimeStatusData {
  activeJobs: RuntimeJob[];
  queuedJobs: RuntimeJob[];
  completedJobs: RuntimeJob[];
  orphanedTables: OrphanedTable[];
  lastSync: {
    timestamp: string;
    status: 'success' | 'partial' | 'failed';
    recordsProcessed: number;
  };
  systemHealth: {
    aiAvailable: boolean;
    githubConnected: boolean;
    databaseStatus: 'healthy' | 'degraded' | 'offline';
  };
}

export default function RuntimeStatus() {
  const [statusData, setStatusData] = useState<RuntimeStatusData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [refreshInterval, setRefreshInterval] = useState<number>(5000);

  const fetchRuntimeStatus = async () => {
    try {
      const response = await fetch('/api/admin/runtime/status');
      if (response.ok) {
        const data = await response.json();
        setStatusData(data);
      } else {
        console.error('Failed to fetch runtime status');
      }
    } catch (error) {
      console.error('Error fetching runtime status:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRuntimeStatus();
    
    if (autoRefresh) {
      const interval = setInterval(fetchRuntimeStatus, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  const getStatusChip = (status: string) => {
    const statusConfig = {
      completed: { color: 'bg-green-100 text-green-800', icon: <CheckCircle size={14} /> },
      success: { color: 'bg-green-100 text-green-800', icon: <CheckCircle size={14} /> },
      running: { color: 'bg-blue-100 text-blue-800', icon: <Activity size={14} /> },
      queued: { color: 'bg-yellow-100 text-yellow-800', icon: <Clock size={14} /> },
      failed: { color: 'bg-red-100 text-red-800', icon: <AlertCircle size={14} /> },
      partial: { color: 'bg-orange-100 text-orange-800', icon: <AlertCircle size={14} /> }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.queued;
    
    return (
      <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.icon}
        <span>{status}</span>
      </span>
    );
  };

  const getSeverityColor = (severity: string) => {
    const severityConfig = {
      high: '🔴',
      medium: '🟡', 
      low: '🟢'
    };
    return severityConfig[severity as keyof typeof severityConfig] || '🟢';
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return '-';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  const formatTime = (timestamp?: string) => {
    if (!timestamp) return '-';
    return new Date(timestamp).toLocaleTimeString();
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!statusData) {
    return (
      <div className="p-6 text-center text-gray-500">
        Unable to load runtime status
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Runtime Status</h1>
          <p className="text-gray-600 mt-1">Monitor active tasks and system health</p>
        </div>
        <div className="flex items-center space-x-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Auto-refresh</span>
          </label>
          <button
            onClick={fetchRuntimeStatus}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* System Health */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold mb-4">System Health</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <Zap className={statusData.systemHealth.aiAvailable ? 'text-green-500' : 'text-red-500'} />
              <span className="font-medium">AI Services</span>
            </div>
            <span>{statusData.systemHealth.aiAvailable ? '🟢 Available' : '🔴 Offline'}</span>
          </div>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <GitBranch className={statusData.systemHealth.githubConnected ? 'text-green-500' : 'text-red-500'} />
              <span className="font-medium">GitHub</span>
            </div>
            <span>{statusData.systemHealth.githubConnected ? '🟢 Connected' : '🔴 Disconnected'}</span>
          </div>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <Database className={statusData.systemHealth.databaseStatus === 'healthy' ? 'text-green-500' : 'text-orange-500'} />
              <span className="font-medium">Database</span>
            </div>
            <span>{
              statusData.systemHealth.databaseStatus === 'healthy' ? '🟢 Healthy' :
              statusData.systemHealth.databaseStatus === 'degraded' ? '🟡 Degraded' :
              '🔴 Offline'
            }</span>
          </div>
        </div>
      </div>

      {/* Active Jobs */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">
            Active Jobs ({statusData.activeJobs.length})
          </h3>
        </div>
        <div className="p-6">
          {statusData.activeJobs.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No active jobs</p>
          ) : (
            <div className="space-y-3">
              {statusData.activeJobs.map((job) => (
                <div key={job.id} className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <Activity className="animate-pulse text-blue-600" size={20} />
                    <div>
                      <div className="font-medium">{job.name}</div>
                      <div className="text-sm text-gray-600">
                        Started: {formatTime(job.startTime)} • User: {job.user || 'system'}
                      </div>
                    </div>
                  </div>
                  {getStatusChip(job.status)}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Queued Jobs */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">
            Queued Jobs ({statusData.queuedJobs.length})
          </h3>
        </div>
        <div className="p-6">
          {statusData.queuedJobs.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No queued jobs</p>
          ) : (
            <div className="space-y-3">
              {statusData.queuedJobs.map((job) => (
                <div key={job.id} className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg">
                  <div>
                    <div className="font-medium">{job.name}</div>
                    <div className="text-sm text-gray-600">Type: {job.type}</div>
                  </div>
                  {getStatusChip(job.status)}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Last Sync Status */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold mb-4">Last Sync Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="text-sm text-gray-600">Timestamp</div>
            <div className="font-medium">{new Date(statusData.lastSync.timestamp).toLocaleString()}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Status</div>
            <div>{getStatusChip(statusData.lastSync.status)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Records Processed</div>
            <div className="font-medium">{statusData.lastSync.recordsProcessed.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Orphaned Tables */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">
            Data Integrity Issues ({statusData.orphanedTables.reduce((sum, t) => sum + t.orphanCount, 0)})
          </h3>
        </div>
        <div className="p-6">
          {statusData.orphanedTables.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No orphaned records detected</p>
          ) : (
            <div className="space-y-3">
              {statusData.orphanedTables.map((table) => (
                <div key={table.table} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium capitalize">{table.table}</div>
                    <div className="text-sm text-gray-600">
                      {table.orphanCount} orphaned records • Last checked: {formatTime(table.lastChecked)}
                    </div>
                  </div>
                  <span className="text-2xl">{getSeverityColor(table.severity)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recently Completed */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">
            Recently Completed ({statusData.completedJobs.slice(0, 5).length})
          </h3>
        </div>
        <div className="p-6">
          {statusData.completedJobs.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No recently completed jobs</p>
          ) : (
            <div className="space-y-3">
              {statusData.completedJobs.slice(0, 5).map((job) => (
                <div key={job.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium">{job.name}</div>
                    <div className="text-sm text-gray-600">
                      Duration: {formatDuration(job.duration)} • Completed: {formatTime(job.endTime)}
                    </div>
                  </div>
                  {getStatusChip(job.status)}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}