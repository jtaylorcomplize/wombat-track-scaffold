import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { X, Search, Filter, Plus, RefreshCw, Download, GitBranch, FileText, Sparkles, Shield, AlertTriangle, Info, CheckCircle } from 'lucide-react';
import { GovernanceLogCard } from './GovernanceLogCard';
import { RelationshipGraph } from './RelationshipGraph';

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
  details?: Record<string, unknown>;
  links?: string[];
  memory_anchor_id?: string;
  source?: string;
  driveSessionId?: string;
}

interface GovLogManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialFilters?: Record<string, string>;
  onLogUpdate?: (log: GovernanceLogEntry) => void;
  apiUrl?: string;
}

export const GovLogManagerModal: React.FC<GovLogManagerModalProps> = ({
  isOpen,
  onClose,
  initialFilters = {},
  onLogUpdate,
  apiUrl = '/api/admin/governance_logs'
}) => {
  const [logs, setLogs] = useState<GovernanceLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [semanticSearchTerm, setSemanticSearchTerm] = useState('');
  const [useSemanticSearch, setUseSemanticSearch] = useState(false);
  const [filters, setFilters] = useState(initialFilters);
  const [showFilters, setShowFilters] = useState(false);
  const [showGraph, setShowGraph] = useState(false);
  const [showLinkIntegrity, setShowLinkIntegrity] = useState(false);
  const [selectedLog, setSelectedLog] = useState<GovernanceLogEntry | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [autoClassifications, setAutoClassifications] = useState<Record<string, { entryType: string; classification: string; confidence: number; reasoning: string } | undefined>>({});
  const [integrityReport, setIntegrityReport] = useState<LinkIntegrityReport | null>(null);
  const [integrityLoading, setIntegrityLoading] = useState(false);
  const [logIntegrityStatus, setLogIntegrityStatus] = useState<Record<string, { issueCount: number; severity: 'none' | 'info' | 'warning' | 'critical' }>>({});
  
  // URL parameter handling for deep linking to Link Integrity tab
  useEffect(() => {
    if (isOpen) {
      const urlParams = new URLSearchParams(window.location.search);
      const tab = urlParams.get('tab');
      if (tab === 'link-integrity') {
        setShowLinkIntegrity(true);
        // Auto-load integrity report when accessed via deep link
        if (!integrityReport) {
          loadIntegrityReport();
        }
      }
    }
  }, [isOpen, integrityReport, loadIntegrityReport]);
  
  // Filter options
  const [availablePhases, setAvailablePhases] = useState<string[]>([]);
  const [availableSteps, setAvailableSteps] = useState<string[]>([]);
  const [availableTypes, setAvailableTypes] = useState<string[]>([]);
  const [availableClassifications, setAvailableClassifications] = useState<string[]>([]);
  
  // New log form
  const [newLog, setNewLog] = useState<Partial<GovernanceLogEntry>>({
    entryType: 'Update',
    classification: 'governance',
    actor: 'User',
    summary: ''
  });

  // Fetch logs
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      
      const response = await fetch(`${apiUrl}?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch logs');
      
      const data = await response.json();
      setLogs(data.logs || data);
      
      // Extract unique values for filters
      const phases = new Set<string>();
      const steps = new Set<string>();
      const types = new Set<string>();
      const classifications = new Set<string>();
      
      data.logs?.forEach((log: GovernanceLogEntry) => {
        if (log.phase_id) phases.add(log.phase_id);
        if (log.step_id) steps.add(log.step_id);
        if (log.entryType) types.add(log.entryType);
        if (log.classification) classifications.add(log.classification);
      });
      
      setAvailablePhases(Array.from(phases).sort());
      setAvailableSteps(Array.from(steps).sort());
      setAvailableTypes(Array.from(types).sort());
      setAvailableClassifications(Array.from(classifications).sort());
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  }, [apiUrl, filters]);

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
      loadLogIntegrityStatus();
    }
  }, [isOpen, fetchLogs]);

  // Load link integrity status for all logs
  const loadLogIntegrityStatus = useCallback(async () => {
    if (!logs.length) return;
    
    const statusPromises = logs.map(async (log) => {
      try {
        const response = await fetch(`${apiUrl}/${log.id}/integrity`);
        if (response.ok) {
          const status = await response.json();
          return { logId: log.id, status };
        }
      } catch (error) {
        console.error(`Failed to get integrity status for log ${log.id}:`, error);
      }
      return { logId: log.id, status: { issueCount: 0, severity: 'none' } };
    });

    const statuses = await Promise.all(statusPromises);
    const statusMap: Record<string, { issueCount: number; severity: 'none' | 'info' | 'warning' | 'critical' }> = {};
    statuses.forEach(({ logId, status }) => {
      statusMap[logId] = status;
    });
    setLogIntegrityStatus(statusMap);
  }, [logs, apiUrl]);

  // Semantic search
  const performSemanticSearch = useCallback(async (query: string) => {
    if (!query) {
      return logs;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({ q: query });
      const response = await fetch(`${apiUrl}/search/semantic?${params.toString()}`);
      if (!response.ok) throw new Error('Semantic search failed');
      
      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Semantic search error:', error);
      return logs.filter(log => 
        log.summary?.toLowerCase().includes(query.toLowerCase()) ||
        log.gptDraftEntry?.toLowerCase().includes(query.toLowerCase())
      );
    } finally {
      setLoading(false);
    }
  }, [apiUrl, logs]);

  // Filter logs based on search term
  const filteredLogs = useMemo(() => {
    if (useSemanticSearch && semanticSearchTerm) {
      // Semantic search results will be handled separately
      return logs;
    }
    
    if (!searchTerm) return logs;
    
    const term = searchTerm.toLowerCase();
    return logs.filter(log => 
      log.summary?.toLowerCase().includes(term) ||
      log.gptDraftEntry?.toLowerCase().includes(term) ||
      log.actor?.toLowerCase().includes(term) ||
      log.entryType?.toLowerCase().includes(term) ||
      log.phase_id?.toLowerCase().includes(term) ||
      log.step_id?.toLowerCase().includes(term)
    );
  }, [logs, searchTerm, useSemanticSearch, semanticSearchTerm]);

  // Handle semantic search
  const handleSemanticSearch = useCallback(async () => {
    if (!semanticSearchTerm) {
      setLogs(logs);
      return;
    }

    const results = await performSemanticSearch(semanticSearchTerm);
    setLogs(results);
  }, [semanticSearchTerm, performSemanticSearch, logs]);

  // Handle log edit
  const handleLogEdit = (log: GovernanceLogEntry) => {
    setSelectedLog(log);
    setIsCreating(true);
    setNewLog({
      ...log
    });
  };

  // Handle auto-classification
  const handleAutoClassify = async (logId: string) => {
    const log = logs.find(l => l.id === logId);
    if (!log) return;

    try {
      const response = await fetch(`${apiUrl}/classify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary: log.summary,
          gptDraftEntry: log.gptDraftEntry,
          currentClassification: log.classification,
          relatedPhase: log.phase_id
        })
      });
      
      if (!response.ok) throw new Error('Classification failed');
      
      const classificationResult = await response.json();
      setAutoClassifications({
        ...autoClassifications,
        [logId]: classificationResult
      });
    } catch (error) {
      console.error('Error auto-classifying log:', error);
    }
  };

  // Load link integrity report
  const loadIntegrityReport = useCallback(async () => {
    setIntegrityLoading(true);
    try {
      const response = await fetch(`${apiUrl}/link-integrity`);
      if (!response.ok) throw new Error('Failed to load integrity report');
      
      const report = await response.json();
      setIntegrityReport(report);
    } catch (error) {
      console.error('Error loading integrity report:', error);
    } finally {
      setIntegrityLoading(false);
    }
  }, [apiUrl]);

  // Handle repair action
  const handleRepair = async (issueId: string, newValue: string, repairSource: 'auto' | 'manual' | 'suggestion') => {
    try {
      const response = await fetch(`${apiUrl}/link-integrity/repair`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          issueId,
          newValue,
          repairSource
        })
      });
      
      if (!response.ok) throw new Error('Failed to apply repair');
      
      const result = await response.json();
      
      if (result.success) {
        // Refresh logs and integrity report
        await fetchLogs();
        await loadIntegrityReport();
        await loadLogIntegrityStatus();
      }
      
      return result;
    } catch (error) {
      console.error('Error applying repair:', error);
      throw error;
    }
  };

  // Handle log reclassification
  const handleReclassify = async (logId: string, newType: string, newClassification: string) => {
    try {
      const response = await fetch(`${apiUrl}/${logId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entryType: newType,
          classification: newClassification
        })
      });
      
      if (!response.ok) throw new Error('Failed to update log');
      
      const updatedLog = await response.json();
      setLogs(logs.map(log => log.id === logId ? updatedLog : log));
      
      // Clear auto-classification for this log
      const newAutoClassifications = { ...autoClassifications };
      delete newAutoClassifications[logId];
      setAutoClassifications(newAutoClassifications);
      
      if (onLogUpdate) {
        onLogUpdate(updatedLog);
      }
    } catch (error) {
      console.error('Error updating log:', error);
    }
  };

  // Handle create/update log
  const handleSaveLog = async () => {
    try {
      const isUpdate = selectedLog !== null;
      const url = isUpdate ? `${apiUrl}/${selectedLog.id}` : apiUrl;
      const method = isUpdate ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newLog,
          ts: newLog.ts || new Date().toISOString(),
          timestamp: newLog.timestamp || new Date().toISOString()
        })
      });
      
      if (!response.ok) throw new Error('Failed to save log');
      
      const savedLog = await response.json();
      
      if (isUpdate) {
        setLogs(logs.map(log => log.id === selectedLog.id ? savedLog : log));
      } else {
        setLogs([savedLog, ...logs]);
      }
      
      if (onLogUpdate) {
        onLogUpdate(savedLog);
      }
      
      // Reset form
      setIsCreating(false);
      setSelectedLog(null);
      setNewLog({
        entryType: 'Update',
        classification: 'governance',
        actor: 'User',
        summary: ''
      });
    } catch (error) {
      console.error('Error saving log:', error);
    }
  };

  // Handle navigation to related items
  const handleLinkClick = (type: 'phase' | 'step' | 'anchor', id: string) => {
    if (type === 'phase') {
      setFilters({ ...filters, phase_id: id });
    } else if (type === 'step') {
      setFilters({ ...filters, step_id: id });
    }
    // For anchor, we might want to open a different modal or navigate
  };

  // Export logs
  const handleExport = () => {
    const dataStr = JSON.stringify(filteredLogs, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `governance-logs-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-7xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-gray-900">Governance Log Manager</h2>
            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
              {filteredLogs.length} logs
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setShowLinkIntegrity(!showLinkIntegrity);
                if (!showLinkIntegrity && !integrityReport) {
                  loadIntegrityReport();
                }
              }}
              className={`p-2 rounded-lg transition-colors ${
                showLinkIntegrity 
                  ? 'text-orange-600 bg-orange-50' 
                  : 'text-gray-500 hover:text-orange-600 hover:bg-orange-50'
              }`}
              aria-label="Toggle link integrity"
            >
              <Shield size={20} />
            </button>
            
            <button
              onClick={() => setShowGraph(!showGraph)}
              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              aria-label="Toggle relationship graph"
            >
              <GitBranch size={20} />
            </button>
            
            <button
              onClick={handleExport}
              className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
              aria-label="Export logs"
            >
              <Download size={20} />
            </button>
            
            <button
              onClick={fetchLogs}
              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              aria-label="Refresh logs"
            >
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
            
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              aria-label="Close modal"
            >
              <X size={20} />
            </button>
          </div>
        </div>
        
        {/* Search and Filters */}
        <div className="px-6 py-4 border-b border-gray-200 space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder={useSemanticSearch ? "Semantic search (AI-powered)" : "Search logs by summary, actor, phase, or step..."}
                value={useSemanticSearch ? semanticSearchTerm : searchTerm}
                onChange={(e) => {
                  if (useSemanticSearch) {
                    setSemanticSearchTerm(e.target.value);
                  } else {
                    setSearchTerm(e.target.value);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && useSemanticSearch) {
                    handleSemanticSearch();
                  }
                }}
                className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  useSemanticSearch 
                    ? 'border-purple-300 focus:ring-purple-500 bg-purple-50' 
                    : 'border-gray-300 focus:ring-blue-500'
                }`}
              />
            </div>
            
            <button
              onClick={() => {
                setUseSemanticSearch(!useSemanticSearch);
                setSearchTerm('');
                setSemanticSearchTerm('');
              }}
              className={`px-4 py-2 rounded-lg border transition-colors flex items-center gap-2 ${
                useSemanticSearch 
                  ? 'bg-purple-50 border-purple-300 text-purple-700' 
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
              title={useSemanticSearch ? 'Switch to keyword search' : 'Switch to semantic search'}
            >
              <Sparkles size={16} />
              {useSemanticSearch ? 'AI Search' : 'Semantic'}
            </button>
            
            {useSemanticSearch && (
              <button
                onClick={handleSemanticSearch}
                disabled={!semanticSearchTerm || loading}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                Search
              </button>
            )}
            
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
            </button>
            
            <button
              onClick={() => setIsCreating(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Plus size={16} />
              New Log
            </button>
          </div>
          
          {/* Filter Controls */}
          {showFilters && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <select
                value={filters.phase_id || ''}
                onChange={(e) => setFilters({ ...filters, phase_id: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Phases</option>
                {availablePhases.map(phase => (
                  <option key={phase} value={phase}>{phase}</option>
                ))}
              </select>
              
              <select
                value={filters.step_id || ''}
                onChange={(e) => setFilters({ ...filters, step_id: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Steps</option>
                {availableSteps.map(step => (
                  <option key={step} value={step}>{step}</option>
                ))}
              </select>
              
              <select
                value={filters.entryType || ''}
                onChange={(e) => setFilters({ ...filters, entryType: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Types</option>
                {availableTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              
              <select
                value={filters.classification || ''}
                onChange={(e) => setFilters({ ...filters, classification: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Classifications</option>
                {availableClassifications.map(cls => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </select>
            </div>
          )}
        </div>
        
        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {showLinkIntegrity ? (
            <LinkIntegrityTab 
              report={integrityReport}
              loading={integrityLoading}
              onRefresh={loadIntegrityReport}
              onRepair={handleRepair}
            />
          ) : showGraph ? (
            <RelationshipGraph logs={filteredLogs} onNodeClick={handleLogEdit} />
          ) : (
            <div className="space-y-4">
              {loading ? (
                <div className="text-center py-12">
                  <RefreshCw className="animate-spin mx-auto mb-4 text-gray-400" size={32} />
                  <p className="text-gray-500">Loading governance logs...</p>
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="mx-auto mb-4 text-gray-300" size={48} />
                  <p className="text-gray-500">No governance logs found</p>
                  <p className="text-sm text-gray-400 mt-2">Try adjusting your search or filters</p>
                </div>
              ) : (
                filteredLogs.map(log => (
                  <GovernanceLogCard
                    key={log.id}
                    log={log}
                    onEdit={handleLogEdit}
                    onLinkClick={handleLinkClick}
                    onReclassify={handleReclassify}
                    autoClassification={autoClassifications[log.id]}
                    onAutoClassify={handleAutoClassify}
                    integrityStatus={logIntegrityStatus[log.id]}
                  />
                ))
              )}
            </div>
          )}
        </div>
        
        {/* Create/Edit Form Modal */}
        {isCreating && (
          <div className="absolute inset-0 bg-white rounded-2xl flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {selectedLog ? 'Edit Governance Log' : 'Create New Governance Log'}
              </h3>
              <button
                onClick={() => {
                  setIsCreating(false);
                  setSelectedLog(null);
                  setNewLog({
                    entryType: 'Update',
                    classification: 'governance',
                    actor: 'User',
                    summary: ''
                  });
                }}
                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4 max-w-2xl">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Entry Type</label>
                    <select
                      value={newLog.entryType}
                      onChange={(e) => setNewLog({ ...newLog, entryType: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Creation">Creation</option>
                      <option value="Update">Update</option>
                      <option value="Activation">Activation</option>
                      <option value="Completion">Completion</option>
                      <option value="Kickoff">Kickoff</option>
                      <option value="Integration">Integration</option>
                      <option value="Error">Error</option>
                      <option value="Warning">Warning</option>
                      <option value="System">System</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Classification</label>
                    <select
                      value={newLog.classification}
                      onChange={(e) => setNewLog({ ...newLog, classification: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="governance">Governance</option>
                      <option value="technical">Technical</option>
                      <option value="process">Process</option>
                      <option value="security">Security</option>
                      <option value="performance">Performance</option>
                      <option value="documentation">Documentation</option>
                    </select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phase ID</label>
                    <input
                      type="text"
                      value={newLog.phase_id || ''}
                      onChange={(e) => setNewLog({ ...newLog, phase_id: e.target.value })}
                      placeholder="e.g., OF-9.4"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Step ID</label>
                    <input
                      type="text"
                      value={newLog.step_id || ''}
                      onChange={(e) => setNewLog({ ...newLog, step_id: e.target.value })}
                      placeholder="e.g., OF-9.4.1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Actor</label>
                  <input
                    type="text"
                    value={newLog.actor || ''}
                    onChange={(e) => setNewLog({ ...newLog, actor: e.target.value })}
                    placeholder="e.g., User, System, CC"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Summary *</label>
                  <textarea
                    value={newLog.summary || ''}
                    onChange={(e) => setNewLog({ ...newLog, summary: e.target.value })}
                    placeholder="Brief description of the log entry..."
                    rows={3}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">AI Draft Entry</label>
                  <textarea
                    value={newLog.gptDraftEntry || ''}
                    onChange={(e) => setNewLog({ ...newLog, gptDraftEntry: e.target.value })}
                    placeholder="AI-generated summary or analysis..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Memory Anchor ID</label>
                  <input
                    type="text"
                    value={newLog.memory_anchor_id || ''}
                    onChange={(e) => setNewLog({ ...newLog, memory_anchor_id: e.target.value })}
                    placeholder="e.g., OF-GOVLOG-UI"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Links (comma-separated)</label>
                  <input
                    type="text"
                    value={newLog.links?.join(', ') || ''}
                    onChange={(e) => setNewLog({ 
                      ...newLog, 
                      links: e.target.value.split(',').map(s => s.trim()).filter(Boolean) 
                    })}
                    placeholder="e.g., docs/file1.md, docs/file2.md"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setIsCreating(false);
                  setSelectedLog(null);
                  setNewLog({
                    entryType: 'Update',
                    classification: 'governance',
                    actor: 'User',
                    summary: ''
                  });
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              
              <button
                onClick={handleSaveLog}
                disabled={!newLog.summary}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {selectedLog ? 'Update Log' : 'Create Log'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Link Integrity Tab Component
interface LinkIntegrityReport {
  totalIssues: number;
  criticalIssues: number;
  warningIssues: number;
  infoIssues: number;
  issues: Array<{
    id: string;
    severity: 'critical' | 'warning' | 'info';
    description: string;
    currentValue: string;
    issueType: string;
    field: string;
    suggestions?: Array<{
      value: string;
      confidence: number;
      reasoning: string;
    }>;
  }>;
  scanDuration: number;
  scannedLogs: number;
  lastScan: string;
}

interface LinkIntegrityTabProps {
  report: LinkIntegrityReport | null;
  loading: boolean;
  onRefresh: () => void;
  onRepair: (issueId: string, newValue: string, repairSource: 'auto' | 'manual' | 'suggestion') => Promise<{ success: boolean; message: string }>;
}

const LinkIntegrityTab: React.FC<LinkIntegrityTabProps> = ({ report, loading, onRefresh, onRepair }) => {
  const [selectedIssue, setSelectedIssue] = useState<LinkIntegrityReport['issues'][0] | null>(null);
  const [manualValue, setManualValue] = useState('');

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="text-red-500" size={16} />;
      case 'warning':
        return <AlertTriangle className="text-yellow-500" size={16} />;
      case 'info':
        return <Info className="text-blue-500" size={16} />;
      default:
        return <CheckCircle className="text-green-500" size={16} />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-green-50 border-green-200';
    }
  };

  const handleApplySuggestion = async (issue: LinkIntegrityReport['issues'][0], suggestion: { value: string; confidence: number; reasoning: string }) => {
    try {
      await onRepair(issue.id, suggestion.value, 'suggestion');
      setSelectedIssue(null);
    } catch (error) {
      console.error('Failed to apply suggestion:', error);
    }
  };

  const handleManualRepair = async () => {
    if (!selectedIssue || !manualValue) return;
    
    try {
      await onRepair(selectedIssue.id, manualValue, 'manual');
      setSelectedIssue(null);
      setManualValue('');
    } catch (error) {
      console.error('Failed to apply manual repair:', error);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <RefreshCw className="animate-spin mx-auto mb-4 text-gray-400" size={32} />
        <p className="text-gray-500">Scanning link integrity...</p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="text-center py-12">
        <Shield className="mx-auto mb-4 text-gray-300" size={48} />
        <p className="text-gray-500">No integrity report available</p>
        <button
          onClick={onRefresh}
          className="mt-4 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
        >
          Run Integrity Scan
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Report Summary */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900">Link Integrity Report</h3>
          <button
            onClick={onRefresh}
            className="px-3 py-1 bg-orange-600 text-white rounded text-sm hover:bg-orange-700 transition-colors flex items-center gap-2"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{report.totalIssues}</div>
            <div className="text-sm text-gray-500">Total Issues</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{report.criticalIssues}</div>
            <div className="text-sm text-gray-500">Critical</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{report.warningIssues}</div>
            <div className="text-sm text-gray-500">Warning</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{report.infoIssues}</div>
            <div className="text-sm text-gray-500">Info</div>
          </div>
        </div>
        
        <div className="text-xs text-gray-500 mt-3">
          Scanned {report.scannedLogs} logs in {report.scanDuration}ms • Last scan: {new Date(report.lastScan).toLocaleString()}
        </div>
      </div>

      {/* Issues List */}
      {report.issues.length === 0 ? (
        <div className="text-center py-8">
          <CheckCircle className="mx-auto mb-3 text-green-500" size={32} />
          <p className="text-green-600 font-medium">All links are healthy!</p>
          <p className="text-sm text-gray-500 mt-1">No integrity issues detected</p>
        </div>
      ) : (
        <div className="space-y-3">
          {report.issues.map((issue: LinkIntegrityReport['issues'][0]) => (
            <div key={issue.id} className={`rounded-lg border-2 p-4 ${getSeverityColor(issue.severity)}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {getSeverityIcon(issue.severity)}
                    <span className="font-medium text-gray-900">
                      {issue.issueType.charAt(0).toUpperCase() + issue.issueType.slice(1)} Link Issue
                    </span>
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                      {issue.severity}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-700 mb-2">{issue.description}</p>
                  
                  <div className="text-xs text-gray-500">
                    <span className="font-medium">Field:</span> {issue.field} • 
                    <span className="font-medium ml-1">Current Value:</span> {issue.currentValue}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {issue.suggestions && issue.suggestions.length > 0 && (
                    <button
                      onClick={() => setSelectedIssue(issue)}
                      className="px-3 py-1 bg-white border border-gray-300 text-gray-700 rounded text-sm hover:bg-gray-50 transition-colors"
                    >
                      View Suggestions
                    </button>
                  )}
                </div>
              </div>
              
              {/* Auto-repair for high confidence suggestions */}
              {issue.suggestions && issue.suggestions[0]?.confidence && issue.suggestions[0].confidence > 0.9 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="flex items-center gap-2">
                    <CheckCircle size={16} className="text-green-500" />
                    <span className="text-sm text-green-700">Auto-repair available:</span>
                    <code className="px-2 py-1 bg-white rounded text-sm">{issue.suggestions[0].value}</code>
                    <button
                      onClick={() => issue.suggestions?.[0] && handleApplySuggestion(issue, issue.suggestions[0])}
                      className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
                    >
                      Apply Fix
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Repair Modal */}
      {selectedIssue && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Repair Link Issue</h3>
                <button
                  onClick={() => setSelectedIssue(null)}
                  className="p-2 text-gray-500 hover:text-gray-700"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            
            <div className="p-4 space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">{selectedIssue.description}</p>
                <div className="bg-gray-50 p-3 rounded">
                  <div className="text-xs text-gray-500 mb-1">Current Value:</div>
                  <code className="text-sm">{selectedIssue.currentValue}</code>
                </div>
              </div>

              {selectedIssue.suggestions && selectedIssue.suggestions.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Suggested Repairs:</h4>
                  <div className="space-y-2">
                    {selectedIssue.suggestions.map((suggestion: { value: string; confidence: number; reasoning: string }, index: number) => (
                      <div key={index} className="border border-gray-200 rounded p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <code className="text-sm font-mono">{suggestion.value}</code>
                            <div className="text-xs text-gray-500 mt-1">
                              Confidence: {(suggestion.confidence * 100).toFixed(0)}% • {suggestion.reasoning}
                            </div>
                          </div>
                          <button
                            onClick={() => handleApplySuggestion(selectedIssue, suggestion)}
                            className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                          >
                            Apply
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h4 className="font-medium text-gray-900 mb-2">Manual Repair:</h4>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={manualValue}
                    onChange={(e) => setManualValue(e.target.value)}
                    placeholder="Enter new value..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleManualRepair}
                    disabled={!manualValue}
                    className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors disabled:opacity-50"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};