import React, { useState, useEffect } from 'react';
import { Database, RefreshCw, Plus, Search, Filter, Download, GitBranch } from 'lucide-react';
import { GovernanceLogCard } from '../components/GovernanceLogCard';
import { GovLogManagerModal } from '../components/GovLogManagerModal';
import { governanceLogsUIService } from '../services/governanceLogsUIService';
import { useLogger } from '../utils/logger';

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

const GovernanceLogsPage: React.FC = () => {
  const logger = useLogger('GovernanceLogsPage');
  const [logs, setLogs] = useState<GovernanceLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState<any>({});
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  
  // Filter states
  const [filterPhase, setFilterPhase] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterClassification, setFilterClassification] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Load logs on mount
  useEffect(() => {
    loadLogs();
    
    // Connect to real-time updates
    governanceLogsUIService.connect();
    
    // Subscribe to events
    governanceLogsUIService.on('connected', handleConnected);
    governanceLogsUIService.on('disconnected', handleDisconnected);
    governanceLogsUIService.on('logUpdate', handleLogUpdate);
    governanceLogsUIService.on('driveMemoryUpdate', handleDriveMemoryUpdate);
    
    return () => {
      governanceLogsUIService.off('connected', handleConnected);
      governanceLogsUIService.off('disconnected', handleDisconnected);
      governanceLogsUIService.off('logUpdate', handleLogUpdate);
      governanceLogsUIService.off('driveMemoryUpdate', handleDriveMemoryUpdate);
      governanceLogsUIService.disconnect();
    };
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const filters: any = {};
      if (filterPhase) filters.phase_id = filterPhase;
      if (filterType) filters.entryType = filterType;
      if (filterClassification) filters.classification = filterClassification;
      
      const fetchedLogs = await governanceLogsUIService.fetchLogs(filters);
      setLogs(fetchedLogs);
    } catch (error) {
      logger.error('Error loading logs', error as Error, { filters: { filterPhase, filterType, filterClassification } });
    } finally {
      setLoading(false);
    }
  };

  const handleConnected = () => {
    setRealtimeConnected(true);
  };

  const handleDisconnected = () => {
    setRealtimeConnected(false);
  };

  const handleLogUpdate = (event: any) => {
    if (event.type === 'created') {
      setLogs(prev => [event.log, ...prev]);
    } else if (event.type === 'updated') {
      setLogs(prev => prev.map(log => log.id === event.log.id ? event.log : log));
    } else if (event.type === 'deleted') {
      setLogs(prev => prev.filter(log => log.id !== event.log.id));
    }
  };

  const handleDriveMemoryUpdate = (event: any) => {
    // Handle drive memory updates with a special indicator
    if (event.log) {
      setLogs(prev => [{ ...event.log, source: 'DriveMemory' }, ...prev]);
    }
  };

  const handleRefresh = () => {
    loadLogs();
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(logs, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `governance-logs-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleLogEdit = (log: GovernanceLogEntry) => {
    setSelectedFilters({ log_id: log.id });
    setShowModal(true);
  };

  const handleLinkClick = (type: 'phase' | 'step' | 'anchor', id: string) => {
    if (type === 'phase') {
      setFilterPhase(id);
    } else if (type === 'step') {
      // Navigate to step or apply filter
      window.location.href = `/admin/phases?step=${id}`;
    } else if (type === 'anchor') {
      // Navigate to memory anchor
      window.location.href = `/admin/memory/${id}`;
    }
  };

  const handleReclassify = async (logId: string, newType: string, newClassification: string) => {
    try {
      const updatedLog = await governanceLogsUIService.updateLog(logId, {
        entryType: newType,
        classification: newClassification
      });
      setLogs(prev => prev.map(log => log.id === logId ? updatedLog : log));
    } catch (error) {
      logger.error('Error reclassifying log', error as Error, { logId, newType, newClassification });
    }
  };

  // Filter logs based on search
  const filteredLogs = logs.filter(log => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      log.summary?.toLowerCase().includes(term) ||
      log.gptDraftEntry?.toLowerCase().includes(term) ||
      log.actor?.toLowerCase().includes(term) ||
      log.phase_id?.toLowerCase().includes(term) ||
      log.step_id?.toLowerCase().includes(term)
    );
  });

  // Get unique values for filters
  const uniquePhases = [...new Set(logs.map(log => log.phase_id).filter(Boolean))];
  const uniqueTypes = [...new Set(logs.map(log => log.entryType).filter(Boolean))];
  const uniqueClassifications = [...new Set(logs.map(log => log.classification).filter(Boolean))];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Database className="text-blue-600" size={32} />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Governance Logs</h1>
                  <p className="text-sm text-gray-600">
                    Live governance data with AI insights
                    {realtimeConnected && (
                      <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">
                        Live Updates
                      </span>
                    )}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleExport}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2"
                >
                  <Download size={16} />
                  <span>Export</span>
                </button>
                
                <button
                  onClick={() => setShowModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <Plus size={16} />
                  <span>New Log</span>
                </button>
                
                <button
                  onClick={handleRefresh}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2"
                >
                  <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search logs by summary, actor, phase, or step..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 rounded-lg border transition-colors flex items-center gap-2 ${
                showFilters 
                  ? 'bg-blue-50 border-blue-300 text-blue-700' 
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Filter size={16} />
              Filters
              {(filterPhase || filterType || filterClassification) && (
                <span className="ml-1 px-1.5 py-0.5 bg-blue-600 text-white text-xs rounded-full">
                  {[filterPhase, filterType, filterClassification].filter(Boolean).length}
                </span>
              )}
            </button>
          </div>
          
          {/* Filter Controls */}
          {showFilters && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
              <select
                value={filterPhase}
                onChange={(e) => {
                  setFilterPhase(e.target.value);
                  loadLogs();
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Phases</option>
                {uniquePhases.map(phase => (
                  <option key={phase} value={phase}>{phase}</option>
                ))}
              </select>
              
              <select
                value={filterType}
                onChange={(e) => {
                  setFilterType(e.target.value);
                  loadLogs();
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Types</option>
                {uniqueTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              
              <select
                value={filterClassification}
                onChange={(e) => {
                  setFilterClassification(e.target.value);
                  loadLogs();
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Classifications</option>
                {uniqueClassifications.map(cls => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading ? (
          <div className="text-center py-12">
            <RefreshCw className="animate-spin mx-auto mb-4 text-gray-400" size={32} />
            <p className="text-gray-500">Loading governance logs...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-12">
            <Database className="mx-auto mb-4 text-gray-300" size={48} />
            <p className="text-gray-500">No governance logs found</p>
            <p className="text-sm text-gray-400 mt-2">
              {searchTerm || filterPhase || filterType || filterClassification
                ? 'Try adjusting your search or filters'
                : 'Create your first governance log to get started'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-sm text-gray-600 mb-4">
              Showing {filteredLogs.length} of {logs.length} logs
            </div>
            
            {filteredLogs.map(log => (
              <GovernanceLogCard
                key={log.id}
                log={log}
                onEdit={handleLogEdit}
                onLinkClick={handleLinkClick}
                onReclassify={handleReclassify}
              />
            ))}
          </div>
        )}
      </div>

      {/* GovLog Manager Modal */}
      <GovLogManagerModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        initialFilters={selectedFilters}
        onLogUpdate={() => loadLogs()}
      />
    </div>
  );
};

export default GovernanceLogsPage;