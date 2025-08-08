import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Database, 
  GitBranch, 
  CheckCircle2, 
  AlertCircle, 
  Clock,
  FileText,
  Link2,
  RefreshCw,
  Search,
  Filter,
  Eye
} from 'lucide-react';
import { GovLogManagerModal } from '../GovLogManagerModal';
import HealthMetricsPanel from './HealthMetricsPanel';

interface GovernanceLogEntry {
  id: number;
  timestamp: string;
  event_type: string;
  user_id?: string;
  user_role?: string;
  resource_type?: string;
  resource_id?: string;
  action?: string;
  success?: boolean;
  details?: any;
  runtime_context?: any;
}

interface PhaseStep {
  stepId: string;
  phaseId: string;
  stepName: string;
  stepInstruction?: string;
  status: string;
  RAG: string;
  priority: string;
  assignedTo?: string;
  governanceLogId?: string;
  memoryAnchor?: string;
  completedAt?: string;
  lastUpdated: string;
}

interface PhaseData {
  phaseId: string;
  phaseName: string;
  steps: PhaseStep[];
  governanceLogs: GovernanceLogEntry[];
  memoryAnchors: Set<string>;
  statistics: {
    totalSteps: number;
    completedSteps: number;
    activeGovernanceLogs: number;
    uniqueMemoryAnchors: number;
    lastActivity: string;
  };
}

const AdminPhaseView: React.FC = () => {
  const [phaseData, setPhaseData] = useState<PhaseData[]>([]);
  const [governanceLogs, setGovernanceLogs] = useState<GovernanceLogEntry[]>([]);
  const [selectedPhase, setSelectedPhase] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'linked' | 'unlinked'>('all');
  const [refreshKey, setRefreshKey] = useState(0);
  const [showGovLogModal, setShowGovLogModal] = useState(false);
  const [govLogModalFilters, setGovLogModalFilters] = useState<any>({});

  // Fetch governance logs from database via API
  const fetchGovernanceLogs = async (): Promise<GovernanceLogEntry[]> => {
    try {
      const response = await fetch('/api/admin/governance_logs');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Error fetching governance logs:', error);
      // Fallback to JSONL file endpoint
      try {
        const fallbackResponse = await fetch('/api/admin/tables/governance_logs');
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          return fallbackData.data || [];
        }
      } catch (fallbackError) {
        console.error('Fallback fetch also failed:', fallbackError);
      }
      return [];
    }
  };

  // Fetch phase and step data
  const fetchPhaseData = async (): Promise<PhaseStep[]> => {
    try {
      const response = await fetch('/api/admin/phases');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Error fetching phase data:', error);
      // Try fallback to CSV endpoint
      try {
        const fallbackResponse = await fetch('/api/admin/tables/phases');
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          return fallbackData.data || [];
        }
      } catch (fallbackError) {
        console.error('Fallback fetch also failed:', fallbackError);
      }
      return [];
    }
  };

  // Load canonical phase JSON if available
  const loadCanonicalPhaseData = async (phaseId: string): Promise<any> => {
    try {
      // Try to load from static path first
      const response = await fetch(`/data/phases/${phaseId}.json`);
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      // Try alternative path
      try {
        const altResponse = await fetch(`/phases/${phaseId}.json`);
        if (altResponse.ok) {
          return await altResponse.json();
        }
      } catch (altError) {
        console.error(`Error loading canonical data for ${phaseId}:`, altError);
      }
    }
    return null;
  };

  // Process and link data
  const processPhaseData = async () => {
    setLoading(true);
    setError('');

    try {
      // Fetch all data sources in parallel
      const [logs, steps] = await Promise.all([
        fetchGovernanceLogs(),
        fetchPhaseData()
      ]);

      setGovernanceLogs(logs);

      // Group steps by phase
      const phaseMap = new Map<string, PhaseStep[]>();
      steps.forEach(step => {
        const phaseId = step.phaseId || 'unknown';
        if (!phaseMap.has(phaseId)) {
          phaseMap.set(phaseId, []);
        }
        phaseMap.get(phaseId)!.push(step);
      });

      // Build phase data with governance linking
      const processedPhases: PhaseData[] = [];
      
      for (const [phaseId, phaseSteps] of phaseMap.entries()) {
        // Find related governance logs
        const relatedLogs = logs.filter(log => {
          // Check if log is related to this phase
          if (log.resource_id?.includes(phaseId)) return true;
          if (log.details?.phaseId === phaseId) return true;
          if (log.runtime_context?.phase === phaseId) return true;
          
          // Check if log is related to any step in this phase
          return phaseSteps.some(step => 
            log.resource_id === step.stepId ||
            log.details?.stepId === step.stepId
          );
        });

        // Extract unique memory anchors
        const memoryAnchors = new Set<string>();
        phaseSteps.forEach(step => {
          if (step.memoryAnchor) {
            memoryAnchors.add(step.memoryAnchor);
          }
        });
        relatedLogs.forEach(log => {
          if (log.details?.memoryAnchor) {
            memoryAnchors.add(log.details.memoryAnchor);
          }
          if (log.details?.memory_anchors && Array.isArray(log.details.memory_anchors)) {
            log.details.memory_anchors.forEach((anchor: string) => memoryAnchors.add(anchor));
          }
        });

        // Load canonical phase data if available
        const canonicalData = await loadCanonicalPhaseData(phaseId);
        const phaseName = canonicalData?.name || phaseId;

        // Calculate statistics
        const completedSteps = phaseSteps.filter(s => s.status === 'completed').length;
        const lastActivity = [...phaseSteps, ...relatedLogs]
          .map(item => 'lastUpdated' in item ? item.lastUpdated : item.timestamp)
          .filter(Boolean)
          .sort()
          .pop() || 'N/A';

        processedPhases.push({
          phaseId,
          phaseName,
          steps: phaseSteps,
          governanceLogs: relatedLogs,
          memoryAnchors,
          statistics: {
            totalSteps: phaseSteps.length,
            completedSteps,
            activeGovernanceLogs: relatedLogs.length,
            uniqueMemoryAnchors: memoryAnchors.size,
            lastActivity
          }
        });
      }

      setPhaseData(processedPhases);
      if (processedPhases.length > 0 && !selectedPhase) {
        setSelectedPhase(processedPhases[0].phaseId);
      }
    } catch (error) {
      console.error('Error processing phase data:', error);
      setError('Failed to load phase data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    processPhaseData();
  }, [refreshKey]);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const getSelectedPhaseData = (): PhaseData | null => {
    return phaseData.find(p => p.phaseId === selectedPhase) || null;
  };

  const filterLogs = (logs: GovernanceLogEntry[]): GovernanceLogEntry[] => {
    let filtered = logs;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(log => 
        JSON.stringify(log).toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply type filter
    if (filterType === 'linked') {
      const phase = getSelectedPhaseData();
      if (phase) {
        filtered = filtered.filter(log => 
          phase.steps.some(step => step.governanceLogId === log.id.toString())
        );
      }
    } else if (filterType === 'unlinked') {
      const phase = getSelectedPhaseData();
      if (phase) {
        filtered = filtered.filter(log => 
          !phase.steps.some(step => step.governanceLogId === log.id.toString())
        );
      }
    }

    return filtered;
  };

  const renderMemoryAnchor = (anchor: string) => {
    const handleClick = () => {
      // Navigate to memory anchor location
      window.open(`/admin/memory/${anchor}`, '_blank');
    };

    return (
      <button
        key={anchor}
        onClick={handleClick}
        className="inline-flex items-center space-x-1 px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded-full hover:bg-purple-200 transition-colors cursor-pointer"
        title={`Navigate to ${anchor}`}
      >
        <Link2 size={10} />
        <span>{anchor}</span>
      </button>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-gray-600">
          <RefreshCw className="animate-spin inline mr-2" size={20} />
          Loading phase data...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-red-600 flex items-center space-x-2">
          <AlertCircle size={24} />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  const currentPhase = getSelectedPhaseData();

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <GitBranch className="text-blue-600" size={32} />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Phase View</h1>
              <p className="text-gray-600">Live governance data integration and phase visibility</p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <RefreshCw size={16} />
            <span>Refresh Data</span>
          </button>
        </div>
      </div>

      {/* Phase Selector */}
      <div className="mb-6">
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">Select Phase:</label>
          <select
            value={selectedPhase}
            onChange={(e) => setSelectedPhase(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {phaseData.map(phase => (
              <option key={phase.phaseId} value={phase.phaseId}>
                {phase.phaseName} ({phase.statistics.totalSteps} steps, {phase.statistics.activeGovernanceLogs} logs)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Health Metrics Panel */}
      <div className="mb-6">
        <HealthMetricsPanel />
      </div>

      {currentPhase && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Statistics Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                <Activity size={20} />
                <span>Phase Statistics</span>
              </h2>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <span className="text-sm text-gray-600">Total Steps</span>
                  <span className="font-semibold">{currentPhase.statistics.totalSteps}</span>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-green-50 rounded">
                  <span className="text-sm text-gray-600">Completed Steps</span>
                  <span className="font-semibold text-green-700">
                    {currentPhase.statistics.completedSteps}
                  </span>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded">
                  <span className="text-sm text-gray-600">Governance Logs</span>
                  <span className="font-semibold text-blue-700">
                    {currentPhase.statistics.activeGovernanceLogs}
                  </span>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-purple-50 rounded">
                  <span className="text-sm text-gray-600">Memory Anchors</span>
                  <span className="font-semibold text-purple-700">
                    {currentPhase.statistics.uniqueMemoryAnchors}
                  </span>
                </div>
                
                <div className="p-3 bg-gray-50 rounded">
                  <span className="text-sm text-gray-600">Last Activity</span>
                  <p className="font-semibold text-xs mt-1">
                    {new Date(currentPhase.statistics.lastActivity).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Memory Anchors */}
              {currentPhase.memoryAnchors.size > 0 && (
                <div className="mt-6">
                  <h3 className="text-md font-medium text-gray-700 mb-3">Memory Anchors</h3>
                  <div className="flex flex-wrap gap-2">
                    {Array.from(currentPhase.memoryAnchors).map(anchor => 
                      renderMemoryAnchor(anchor)
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-2">
            {/* Governance Logs Panel */}
            <div className="bg-white rounded-lg border shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                  <Database size={20} />
                  <span>Governance Logs</span>
                </h2>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      setGovLogModalFilters({ phase_id: selectedPhase });
                      setShowGovLogModal(true);
                    }}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors flex items-center space-x-1"
                  >
                    <Eye size={14} />
                    <span>View All Logs</span>
                  </button>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      type="text"
                      placeholder="Search logs..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 pr-3 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as any)}
                    className="px-3 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Logs</option>
                    <option value="linked">Linked to Steps</option>
                    <option value="unlinked">Unlinked</option>
                  </select>
                </div>
              </div>

              {/* Logs Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Linked</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filterLogs(currentPhase.governanceLogs).slice(0, 10).map(log => {
                      const isLinked = currentPhase.steps.some(s => s.governanceLogId === log.id.toString());
                      return (
                        <tr key={log.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-mono text-gray-600">#{log.id}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                              {log.event_type}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">{log.action || 'N/A'}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{log.user_id || 'System'}</td>
                          <td className="px-4 py-3 text-sm">
                            {log.success ? (
                              <CheckCircle2 className="text-green-600" size={16} />
                            ) : (
                              <AlertCircle className="text-red-600" size={16} />
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {isLinked ? (
                              <Link2 className="text-purple-600" size={16} />
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {currentPhase.governanceLogs.length > 10 && (
                <div className="mt-4 text-center text-sm text-gray-600">
                  Showing 10 of {currentPhase.governanceLogs.length} logs
                </div>
              )}
            </div>

            {/* Phase Steps Panel */}
            <div className="bg-white rounded-lg border shadow-sm p-6 mt-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                <FileText size={20} />
                <span>Phase Steps with Governance Links</span>
              </h2>

              <div className="space-y-3">
                {currentPhase.steps.map(step => {
                  const linkedLog = currentPhase.governanceLogs.find(
                    log => log.id.toString() === step.governanceLogId
                  );
                  
                  return (
                    <div key={step.stepId} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{step.stepName}</h3>
                          <p className="text-sm text-gray-600 mt-1">{step.stepInstruction}</p>
                          
                          <div className="flex items-center space-x-4 mt-2">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              step.status === 'completed' ? 'bg-green-100 text-green-800' :
                              step.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {step.status}
                            </span>
                            
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              step.RAG === 'Green' ? 'bg-green-100 text-green-800' :
                              step.RAG === 'Amber' ? 'bg-yellow-100 text-yellow-800' :
                              step.RAG === 'Red' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              RAG: {step.RAG}
                            </span>
                            
                            {linkedLog && (
                              <span className="text-xs text-purple-600 flex items-center space-x-1">
                                <Link2 size={12} />
                                <span>Log #{linkedLog.id}</span>
                              </span>
                            )}
                            
                            {step.memoryAnchor && renderMemoryAnchor(step.memoryAnchor)}
                            
                            <button
                              onClick={() => {
                                setGovLogModalFilters({ step_id: step.stepId });
                                setShowGovLogModal(true);
                              }}
                              className="text-xs text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                            >
                              <Eye size={12} />
                              <span>View Logs</span>
                            </button>
                          </div>
                        </div>
                        
                        <div className="text-right text-xs text-gray-500">
                          <p>Assigned: {step.assignedTo || 'Unassigned'}</p>
                          <p>Priority: {step.priority}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* GovLog Manager Modal */}
      <GovLogManagerModal
        isOpen={showGovLogModal}
        onClose={() => setShowGovLogModal(false)}
        initialFilters={govLogModalFilters}
        onLogUpdate={() => setRefreshKey(prev => prev + 1)}
      />
    </div>
  );
};

export default AdminPhaseView;