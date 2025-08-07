import React from 'react';
import { Bot, User, Brain, Settings, ListChecks } from 'lucide-react';

interface PhaseStep {
  stepId: string;
  phaseId: string;
  stepName: string;
  stepInstruction?: string;
  status: string;
  RAG: string;
  priority: string;
  isSideQuest: boolean;
  assignedTo?: string;
  expectedStart?: string;
  expectedEnd?: string;
  completedAt?: string;
  governanceLogId?: string;
  memoryAnchor?: string;
  lastUpdated: string;
  executor?: 'claude' | 'cc' | 'zoi' | 'user' | 'system';
}

interface GovernanceLog {
  id: number;
  timestamp: string;
  event_type: string;
  user_id?: string;
  user_role?: string;
  resource_type?: string;
  resource_id?: string;
  action?: string;
  success?: boolean;
  details?: unknown;
}

interface PhaseStepListProps {
  phaseSteps: PhaseStep[];
  governanceLogs?: GovernanceLog[];
  showExecutor?: boolean;
  className?: string;
}

export const PhaseStepList: React.FC<PhaseStepListProps> = ({
  phaseSteps,
  governanceLogs = [],
  showExecutor = true,
  className = ''
}) => {
  const getRagColor = (rag?: string) => {
    switch (rag?.toLowerCase()) {
      case 'red': return 'text-red-600 bg-red-50';
      case 'amber': return 'text-yellow-600 bg-yellow-50';
      case 'green': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'text-green-600 bg-green-50';
      case 'in progress': return 'text-blue-600 bg-blue-50';
      case 'planning': return 'text-purple-600 bg-purple-50';
      case 'pending': return 'text-yellow-600 bg-yellow-50';
      case 'blocked': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getExecutorIcon = (executor?: string) => {
    switch (executor?.toLowerCase()) {
      case 'claude': 
        return <Bot size={16} className="text-blue-600" title="Claude AI" />;
      case 'cc': 
        return <Bot size={16} className="text-purple-600" title="Claude Code" />;
      case 'zoi': 
        return <Brain size={16} className="text-green-600" title="Zoi AI" />;
      case 'user': 
        return <User size={16} className="text-gray-600" title="Human User" />;
      case 'system': 
        return <Settings size={16} className="text-orange-600" title="System" />;
      default: 
        return <User size={16} className="text-gray-400" title="Unknown" />;
    }
  };

  const getExecutorText = (executor?: string) => {
    switch (executor?.toLowerCase()) {
      case 'claude': return '🤖 Claude →';
      case 'cc': return '🧠 CC →';
      case 'zoi': return '🔮 Zoi ←';
      case 'user': return '👤 User ⟳';
      case 'system': return '⚙️ System';
      default: return '❓ Unknown';
    }
  };

  const detectExecutorFromGovernanceLogs = (step: PhaseStep): 'claude' | 'cc' | 'zoi' | 'user' | 'system' => {
    // Look for governance logs related to this step
    const stepLogs = governanceLogs.filter(log => 
      log.resource_id === step.stepId || 
      log.details && 
      typeof log.details === 'object' && 
      'stepId' in log.details && 
      (log.details as Record<string, unknown>).stepId === step.stepId
    );

    if (stepLogs.length === 0) {
      // Default detection based on step name or assignedTo patterns
      const assignedTo = step.assignedTo?.toLowerCase() || '';
      const stepName = step.stepName?.toLowerCase() || '';
      
      if (assignedTo.includes('claude') || stepName.includes('claude')) return 'claude';
      if (assignedTo.includes('cc') || stepName.includes('claude code')) return 'cc';
      if (assignedTo.includes('zoi') || stepName.includes('zoi')) return 'zoi';
      if (assignedTo.includes('system') || stepName.includes('automated')) return 'system';
      
      return 'user'; // Default to user
    }

    // Get most recent log entry
    const latestLog = stepLogs.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )[0];

    const userId = latestLog.user_id?.toLowerCase() || '';
    
    if (userId.includes('claude') || userId === 'claude-code') return 'claude';
    if (userId === 'cc' || userId === 'claude-code') return 'cc';
    if (userId.includes('zoi')) return 'zoi';
    if (userId === 'system' || !latestLog.user_id) return 'system';
    
    return 'user';
  };

  // Enhance steps with executor information
  const enhancedSteps = phaseSteps.map(step => ({
    ...step,
    executor: step.executor || detectExecutorFromGovernanceLogs(step)
  }));

  if (enhancedSteps.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
        <h2 className="text-xl font-semibold mb-4 flex items-center space-x-2">
          <ListChecks size={20} />
          <span>Phase Steps (0)</span>
        </h2>
        <p className="text-gray-500 italic">No steps defined for this phase</p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
      <h2 className="text-xl font-semibold mb-4 flex items-center space-x-2">
        <ListChecks size={20} />
        <span>Phase Steps ({enhancedSteps.length})</span>
      </h2>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Step Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Instruction
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                RAG
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Priority
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Assigned To
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              {showExecutor && (
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Executor
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {enhancedSteps.map((step) => (
              <tr key={step.stepId} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                  {step.stepName}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 max-w-md">
                  <p className="truncate" title={step.stepInstruction}>
                    {step.stepInstruction || 'No instruction provided'}
                  </p>
                </td>
                <td className="px-4 py-3 text-sm">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(step.status)}`}>
                    {step.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRagColor(step.RAG)}`}>
                    {step.RAG}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    step.priority === 'Critical' ? 'text-red-700 bg-red-100' :
                    step.priority === 'High' ? 'text-orange-700 bg-orange-100' :
                    step.priority === 'Medium' ? 'text-blue-700 bg-blue-100' :
                    'text-gray-700 bg-gray-100'
                  }`}>
                    {step.priority}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {step.assignedTo || 'Unassigned'}
                </td>
                <td className="px-4 py-3 text-sm">
                  {step.isSideQuest ? (
                    <span className="text-purple-600 text-xs font-medium">Side Quest</span>
                  ) : (
                    <span className="text-gray-600 text-xs">Main Step</span>
                  )}
                </td>
                {showExecutor && (
                  <td className="px-4 py-3 text-sm">
                    <div className="flex items-center space-x-2">
                      {getExecutorIcon(step.executor)}
                      <span className="text-xs font-mono">{getExecutorText(step.executor)}</span>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PhaseStepList;