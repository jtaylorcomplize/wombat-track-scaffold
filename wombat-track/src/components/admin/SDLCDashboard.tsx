import React, { useState, useEffect } from 'react';

interface AutonomousActionLog {
  action_id: string;
  action_type: string;
  timestamp: string;
  agent: 'claude' | 'gizmo';
  authorized: boolean;
  governance_logged: boolean;
  memory_anchored: boolean;
  result: 'success' | 'failure' | 'pending';
  details: {
    description: string;
    branch?: string;
    user_id?: string;
    risk_level?: string;
    error?: string;
  };
}

interface AuthorityStatus {
  configured: boolean;
  config?: unknown;
  actions_today: number;
  successful_actions: number;
  failed_actions: number;
}

interface SDLCPhaseStep {
  id: string;
  phase: string;
  step: 'Debug' | 'QA' | 'Governance' | 'Memory';
  status: 'pending' | 'in_progress' | 'completed' | 'blocked' | 'failed';
  branch: string;
  created_at: string;
  updated_at: string;
  ci_status?: 'pending' | 'running' | 'success' | 'failure';
  qa_evidence?: {
    manual_qa_passed: boolean;
    screenshots_attached: boolean;
    qa_timestamp?: string;
  };
  governance_entry?: {
    log_id: string;
    summary: string;
  };
  memory_anchor?: {
    anchor_id: string;
    status: 'pending' | 'created' | 'failed';
  };
}

interface GizmoStatus {
  agent_status: string;
  active_branches: number;
  completed_workflows: number;
  blocked_workflows: number;
  last_activity: string;
}

interface OrchestratorStatus {
  active: boolean;
  gizmo_status: GizmoStatus;
  orchestrator_uptime: number;
}

const SDLCDashboard: React.FC = () => {
  const [phaseSteps, setPhaseSteps] = useState<SDLCPhaseStep[]>([]);
  const [orchestratorStatus, setOrchestratorStatus] = useState<OrchestratorStatus | null>(null);
  const [activityFeed, setActivityFeed] = useState<AutonomousActionLog[]>([]);
  const [authorityStatus, setAuthorityStatus] = useState<AuthorityStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'overview' | 'activity'>('overview');
  const [refreshInterval, setRefreshInterval] = useState<number | null>(null);

  useEffect(() => {
    fetchData();
    
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    setRefreshInterval(interval);

    return () => {
      if (refreshInterval) clearInterval(refreshInterval);
    };
  }, []);

  const fetchData = async () => {
    try {
      setError(null);
      
      // Fetch phase steps
      const stepsResponse = await fetch('/api/sdlc/phase-steps');
      if (!stepsResponse.ok) throw new Error('Failed to fetch phase steps');
      const stepsData = await stepsResponse.json();
      
      // Fetch orchestrator status
      const statusResponse = await fetch('/api/sdlc/orchestrator/status');
      if (!statusResponse.ok) throw new Error('Failed to fetch orchestrator status');
      const statusData = await statusResponse.json();

      // Fetch activity feed
      const activityResponse = await fetch('/api/sdlc/activity-feed?limit=20');
      if (!activityResponse.ok) throw new Error('Failed to fetch activity feed');
      const activityData = await activityResponse.json();

      // Fetch authority status
      const authorityResponse = await fetch('/api/sdlc/authority/status');
      if (!authorityResponse.ok) throw new Error('Failed to fetch authority status');
      const authorityData = await authorityResponse.json();
      
      setPhaseSteps(stepsData.data || []);
      setOrchestratorStatus(statusData.data);
      setActivityFeed(activityData.data?.activity_feed || []);
      setAuthorityStatus(authorityData.data);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string): string => {
    switch (status) {
      case 'completed': return '✅';
      case 'in_progress': return '🔄';
      case 'failed': return '❌';
      case 'blocked': return '🚫';
      case 'pending': return '⏳';
      default: return '❓';
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'in_progress': return 'text-blue-600';
      case 'failed': return 'text-red-600';
      case 'blocked': return 'text-orange-600';
      case 'pending': return 'text-gray-600';
      default: return 'text-gray-400';
    }
  };

  const toggleOrchestrator = async () => {
    try {
      const newActive = !orchestratorStatus?.active;
      const response = await fetch('/api/sdlc/orchestrator/active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: newActive })
      });
      
      if (!response.ok) throw new Error('Failed to toggle orchestrator');
      
      await fetchData(); // Refresh data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle orchestrator');
    }
  };

  const submitQAResults = async (branch: string, passed: boolean) => {
    try {
      const response = await fetch('/api/sdlc/qa/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branch,
          passed,
          tester: 'admin_user',
          notes: `Manual QA ${passed ? 'passed' : 'failed'} via Admin Dashboard`,
          screenshots: passed ? ['admin_qa_screenshot.png'] : []
        })
      });
      
      if (!response.ok) throw new Error('Failed to submit QA results');
      
      await fetchData(); // Refresh data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit QA results');
    }
  };

  const triggerCIBuild = async (branch: string) => {
    try {
      const response = await fetch('/api/sdlc/ci/trigger-build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branch,
          triggered_by: 'admin_user'
        })
      });
      
      if (!response.ok) throw new Error('Failed to trigger CI build');
      
      await fetchData(); // Refresh data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to trigger CI build');
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-center mt-4 text-gray-600">Loading SDLC Dashboard...</p>
      </div>
    );
  }

  const branches = [...new Set(phaseSteps.map(step => step.branch))];
  const filteredSteps = selectedBranch 
    ? phaseSteps.filter(step => step.branch === selectedBranch)
    : phaseSteps;

  const branchGroups = branches.map(branch => {
    const branchSteps = phaseSteps.filter(step => step.branch === branch);
    const completedSteps = branchSteps.filter(step => step.status === 'completed').length;
    const totalSteps = branchSteps.length;
    const progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
    const currentStep = branchSteps.find(step => step.status === 'in_progress');
    
    return {
      branch,
      steps: branchSteps,
      progress,
      currentPhase: currentStep?.step || 'Unknown',
      isBlocked: branchSteps.some(step => step.status === 'failed' || step.status === 'blocked')
    };
  });

  const formatTimestamp = (timestamp: string): string => {
    return new Date(timestamp).toLocaleString();
  };

  const getActionIcon = (actionType: string): string => {
    switch (actionType) {
      case 'create_branches': return '🔀';
      case 'push_to_github': return '📤';
      case 'create_governance_logs': return '📋';
      case 'create_memory_anchors': return '🧠';
      case 'trigger_import_endpoints': return '📥';
      case 'activate_agents': return '🤖';
      default: return '⚡';
    }
  };

  const getResultColor = (result: string): string => {
    switch (result) {
      case 'success': return 'text-green-600';
      case 'failure': return 'text-red-600';
      case 'pending': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold text-gray-900">SDLC Dashboard</h1>
          <div className="flex items-center space-x-4">
            <button
              onClick={fetchData}
              className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
            >
              🔄 Refresh
            </button>
            <button
              onClick={toggleOrchestrator}
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                orchestratorStatus?.active 
                  ? 'bg-red-600 text-white hover:bg-red-700' 
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {orchestratorStatus?.active ? '⏸️ Deactivate' : '▶️ Activate'} Orchestrator
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📊 SDLC Overview
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'activity'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              🤖 Autonomous Activity Feed
              {authorityStatus && authorityStatus.actions_today > 0 && (
                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {authorityStatus.actions_today}
                </span>
              )}
            </button>
          </nav>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="flex">
              <div className="text-red-800">
                <strong>Error:</strong> {error}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Activity Feed Tab */}
      {activeTab === 'activity' && (
        <div>
          {/* Authority Status */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow border">
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-2 ${
                  authorityStatus?.configured ? 'bg-green-500' : 'bg-red-500'
                }`}></div>
                <h3 className="text-sm font-medium text-gray-900">Authority Config</h3>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {authorityStatus?.configured ? 'Active' : 'Manual Mode'}
              </p>
            </div>

            <div className="bg-white p-4 rounded-lg shadow border">
              <h3 className="text-sm font-medium text-gray-900">Actions Today</h3>
              <p className="text-2xl font-bold text-blue-600">
                {authorityStatus?.actions_today || 0}
              </p>
            </div>

            <div className="bg-white p-4 rounded-lg shadow border">
              <h3 className="text-sm font-medium text-gray-900">Successful</h3>
              <p className="text-2xl font-bold text-green-600">
                {authorityStatus?.successful_actions || 0}
              </p>
            </div>

            <div className="bg-white p-4 rounded-lg shadow border">
              <h3 className="text-sm font-medium text-gray-900">Failed</h3>
              <p className="text-2xl font-bold text-red-600">
                {authorityStatus?.failed_actions || 0}
              </p>
            </div>
          </div>

          {/* Activity Feed */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">
                Autonomous CC/Gizmo Activity Feed
              </h2>
            </div>
            <div className="overflow-hidden">
              {activityFeed.length > 0 ? (
                <div className="divide-y divide-gray-200">
                  {activityFeed.map((log) => (
                    <div key={log.action_id} className="px-6 py-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <div className="text-2xl">
                            {getActionIcon(log.action_type)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="font-medium text-gray-900">
                                {log.agent.toUpperCase()}
                              </span>
                              <span className="text-sm text-gray-500">•</span>
                              <span className="text-sm text-gray-600">
                                {log.action_type.replace(/_/g, ' ')}
                              </span>
                              <span className={`text-sm font-medium ${getResultColor(log.result)}`}>
                                {log.result.toUpperCase()}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 mt-1">
                              {log.details.description}
                            </p>
                            {log.details.branch && (
                              <p className="text-xs text-gray-500 mt-1">
                                Branch: {log.details.branch}
                              </p>
                            )}
                            {log.details.error && (
                              <p className="text-xs text-red-600 mt-1">
                                Error: {log.details.error}
                              </p>
                            )}
                            <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                              <span>🕒 {formatTimestamp(log.timestamp)}</span>
                              {log.governance_logged && <span>📋 Governance Logged</span>}
                              {log.memory_anchored && <span>🧠 Memory Anchored</span>}
                              {log.authorized && <span>✅ Authorized</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {log.details.risk_level && (
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              log.details.risk_level === 'high' ? 'bg-red-100 text-red-800' :
                              log.details.risk_level === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {log.details.risk_level} risk
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No autonomous actions recorded yet
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SDLC Overview Tab */}
      {activeTab === 'overview' && (
        <div>
          {/* Orchestrator Status */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-2 ${
              orchestratorStatus?.active ? 'bg-green-500' : 'bg-red-500'
            }`}></div>
            <h3 className="text-sm font-medium text-gray-900">Orchestrator</h3>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {orchestratorStatus?.active ? 'Active' : 'Inactive'}
          </p>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border">
          <h3 className="text-sm font-medium text-gray-900">Active Branches</h3>
          <p className="text-2xl font-bold text-blue-600">
            {orchestratorStatus?.gizmo_status.active_branches || 0}
          </p>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border">
          <h3 className="text-sm font-medium text-gray-900">Completed Workflows</h3>
          <p className="text-2xl font-bold text-green-600">
            {orchestratorStatus?.gizmo_status.completed_workflows || 0}
          </p>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border">
          <h3 className="text-sm font-medium text-gray-900">Blocked Workflows</h3>
          <p className="text-2xl font-bold text-red-600">
            {orchestratorStatus?.gizmo_status.blocked_workflows || 0}
          </p>
        </div>
      </div>

      {/* Branch Filter */}
      <div className="mb-6">
        <label htmlFor="branch-filter" className="block text-sm font-medium text-gray-700 mb-2">
          Filter by Branch:
        </label>
        <select
          id="branch-filter"
          value={selectedBranch}
          onChange={(e) => setSelectedBranch(e.target.value)}
          className="block w-full md:w-64 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">All Branches</option>
          {branches.map(branch => (
            <option key={branch} value={branch}>{branch}</option>
          ))}
        </select>
      </div>

      {/* Branch Overview */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Branch Overview</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {branchGroups.map(({ branch, progress, currentPhase, isBlocked }) => (
            <div key={branch} className="bg-white p-4 rounded-lg shadow border">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-medium text-gray-900 truncate">{branch}</h3>
                {isBlocked && <span className="text-red-500 text-sm">🚫 Blocked</span>}
              </div>
              <div className="mb-2">
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Progress</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      isBlocked ? 'bg-red-500' : progress === 100 ? 'bg-green-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>
              <p className="text-sm text-gray-600">Current: {currentPhase}</p>
              <div className="mt-3 flex space-x-2">
                <button
                  onClick={() => triggerCIBuild(branch)}
                  className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
                >
                  🏗️ Trigger CI
                </button>
                <button
                  onClick={() => setSelectedBranch(branch)}
                  className="text-xs px-2 py-1 bg-gray-100 text-gray-800 rounded hover:bg-gray-200"
                >
                  👁️ View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Phase Steps Table */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            SDLC Phase Steps {selectedBranch && `- ${selectedBranch}`}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Branch
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Step
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  CI Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  QA Evidence
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Governance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Memory Anchor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSteps.map((step) => (
                <tr key={step.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {step.branch}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {step.step}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-sm ${getStatusColor(step.status)}`}>
                      {getStatusIcon(step.status)} {step.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {step.ci_status ? (
                      <span className={`${getStatusColor(step.ci_status)}`}>
                        {getStatusIcon(step.ci_status)} {step.ci_status}
                      </span>
                    ) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {step.qa_evidence ? (
                      <div>
                        {step.qa_evidence.manual_qa_passed ? '✅' : '❌'} QA
                        {step.qa_evidence.screenshots_attached ? ' 📸' : ''}
                      </div>
                    ) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {step.governance_entry ? '✅ Logged' : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {step.memory_anchor ? (
                      <span className={getStatusColor(step.memory_anchor.status)}>
                        {getStatusIcon(step.memory_anchor.status)} {step.memory_anchor.status}
                      </span>
                    ) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex space-x-2">
                      {step.step === 'QA' && step.status === 'pending' && (
                        <>
                          <button
                            onClick={() => submitQAResults(step.branch, true)}
                            className="text-green-600 hover:text-green-900 text-xs"
                          >
                            ✅ Pass QA
                          </button>
                          <button
                            onClick={() => submitQAResults(step.branch, false)}
                            className="text-red-600 hover:text-red-900 text-xs"
                          >
                            ❌ Fail QA
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredSteps.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No SDLC steps found {selectedBranch && `for branch "${selectedBranch}"`}
          </div>
        )}
      </div>
        </div>
      )}
    </div>
  );
};

export default SDLCDashboard;