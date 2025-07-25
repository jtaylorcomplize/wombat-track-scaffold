import React, { useState } from 'react';
import { Play, Pause, CheckCircle, AlertTriangle, Clock, Flag, Activity } from 'lucide-react';
import { StatusCard } from '../common/StatusCard';
import { ClaudePromptButton } from '../common/ClaudePromptButton';
import { PhaseBreadcrumb } from '../common/PhaseBreadcrumb';
import type { Project, Phase, PhaseStep as Step } from '../../types/phase';

interface ExecuteSurfaceProps {
  currentProject: Project | null;
  currentPhase: Phase | null;
  currentStep: Step | null;
  onPhaseChange: (phase: Phase) => void;
  onStepChange: (step: Step) => void;
}

interface BlockerInfo {
  id: string;
  stepId: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  reportedBy: string;
  reportedAt: string;
  status: 'open' | 'in_progress' | 'resolved';
}

const mockBlockers: BlockerInfo[] = [
  {
    id: 'blocker-1',
    stepId: 'step-2',
    title: 'API Rate Limiting Issues',
    description: 'Third-party API is rate limiting our requests, causing timeouts',
    severity: 'high',
    reportedBy: 'dev-team',
    reportedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    status: 'open'
  },
  {
    id: 'blocker-2', 
    stepId: 'step-1',
    title: 'Missing Dependencies',
    description: 'Required environment configuration is not documented',
    severity: 'medium',
    reportedBy: 'qa-team',
    reportedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    status: 'in_progress'
  }
];

export const ExecuteSurface: React.FC<ExecuteSurfaceProps> = ({
  currentProject,
  currentPhase,
  currentStep,
  onPhaseChange,
  onStepChange
}) => {
  const [activeTab, setActiveTab] = useState<'tracking' | 'steps' | 'blockers'>('tracking');
  const [blockers] = useState<BlockerInfo[]>(mockBlockers);

  if (!currentProject) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Project Selected</h3>
          <p className="text-gray-600">Select a project to start execution tracking.</p>
        </div>
      </div>
    );
  }

  const handleClaudePrompt = async (prompt: string, context?: any) => {
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    if (prompt.toLowerCase().includes('blocker')) {
      return `I've analyzed the current blockers for "${currentProject.name}":

**Critical Issues:**
- API rate limiting is affecting development velocity
- Missing environment configuration is blocking QA testing

**Recommendations:**
1. **Immediate Actions:**
   - Implement exponential backoff for API calls
   - Document all required environment variables
   - Set up development API keys with higher limits

2. **Process Improvements:**
   - Add blocker escalation procedures
   - Create dependency checklists for new phases
   - Implement automated environment validation

3. **Next Steps:**
   - Schedule blocker review meeting with stakeholders
   - Update project timeline to account for resolution time
   - Consider parallel workstreams to minimize impact

Would you like me to draft specific action items for any of these areas?`;
    }

    return `I can help you track and manage execution for "${currentProject.name}". Here are some insights:

**Current Status:**
- Project is ${currentProject.completionPercentage}% complete
- Active phase: ${currentPhase?.name || 'None'}
- Current step: ${currentStep?.name || 'None'}

**Execution Recommendations:**
1. Focus on completing blocked steps first
2. Maintain regular checkpoint reviews
3. Update progress tracking in real-time
4. Flag dependencies early to prevent cascading delays

**Key Metrics to Monitor:**
- Step completion velocity
- Blocker resolution time
- Resource utilization
- Quality gate pass rates

What specific aspect would you like me to help you with?`;
  };

  const getExecutionStats = () => {
    const allSteps = currentProject.phases.flatMap(phase => phase.steps || []);
    const completedSteps = allSteps.filter(step => step.status === 'complete' || step.status === 'completed');
    const inProgressSteps = allSteps.filter(step => step.status === 'in_progress');
    const blockedSteps = allSteps.filter(step => step.status === 'blocked' || step.status === 'error');
    const pendingSteps = allSteps.filter(step => step.status === 'not_started');

    const activeBlockers = blockers.filter(blocker => blocker.status === 'open');
    const criticalBlockers = activeBlockers.filter(blocker => blocker.severity === 'critical' || blocker.severity === 'high');

    return {
      totalSteps: allSteps.length,
      completedSteps: completedSteps.length,
      inProgressSteps: inProgressSteps.length,
      blockedSteps: blockedSteps.length,
      pendingSteps: pendingSteps.length,
      activeBlockers: activeBlockers.length,
      criticalBlockers: criticalBlockers.length,
      completionRate: allSteps.length > 0 ? Math.round((completedSteps.length / allSteps.length) * 100) : 0
    };
  };

  const stats = getExecutionStats();

  const getStepActionButton = (step: Step) => {
    switch (step.status) {
      case 'not_started':
        return (
          <button className="flex items-center space-x-1 px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm">
            <Play className="w-3 h-3" />
            <span>Start</span>
          </button>
        );
      case 'in_progress':
        return (
          <button className="flex items-center space-x-1 px-3 py-1 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors text-sm">
            <CheckCircle className="w-3 h-3" />
            <span>Complete</span>
          </button>
        );
      case 'blocked':
      case 'error':
        return (
          <button className="flex items-center space-x-1 px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors text-sm">
            <Flag className="w-3 h-3" />
            <span>Unblock</span>
          </button>
        );
      case 'complete':
      case 'completed':
        return (
          <span className="flex items-center space-x-1 px-3 py-1 bg-green-100 text-green-700 rounded-md text-sm">
            <CheckCircle className="w-3 h-3" />
            <span>Done</span>
          </span>
        );
      default:
        return null;
    }
  };

  const getBlockerSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6" data-testid="execute-surface">
      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-3">
              <Activity className="w-6 h-6 text-green-600" />
              <span>Execute Surface</span>
            </h1>
            <p className="text-gray-600 mt-1">
              Track phases, trigger steps, and flag blockers for {currentProject.name}
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <ClaudePromptButton
              type="analyze"
              label="Analyze Progress"
              onPrompt={handleClaudePrompt}
              testId="execute-ai-analyze"
            />
            <button className="flex items-center space-x-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">
              <Flag className="w-4 h-4" />
              <span>Flag Blocker</span>
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatusCard
            title="Completion Rate"
            status={stats.completionRate >= 80 ? 'success' : stats.completionRate >= 50 ? 'warning' : 'error'}
            value={`${stats.completionRate}%`}
            description={`${stats.completedSteps}/${stats.totalSteps} steps`}
            testId="execute-completion-card"
          />
          <StatusCard
            title="In Progress"
            status="in_progress"
            value={stats.inProgressSteps}
            description="Active steps"
            testId="execute-progress-card"
          />
          <StatusCard
            title="Blocked Steps"
            status={stats.blockedSteps > 0 ? 'error' : 'success'}
            value={stats.blockedSteps}
            description="Require attention"
            testId="execute-blocked-card"
          />
          <StatusCard
            title="Active Blockers"
            status={stats.criticalBlockers > 0 ? 'error' : stats.activeBlockers > 0 ? 'warning' : 'success'}
            value={stats.activeBlockers}
            description={`${stats.criticalBlockers} critical`}
            testId="execute-blockers-card"
          />
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" role="tablist">
            {[
              { id: 'tracking', label: 'Phase Tracking', icon: Activity },
              { id: 'steps', label: 'Step Management', icon: CheckCircle },
              { id: 'blockers', label: 'Blockers', icon: AlertTriangle }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as any)}
                className={`flex items-center space-x-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === id
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                data-testid={`execute-tab-${id}`}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'tracking' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Phase Tracking</h2>
                <ClaudePromptButton
                  type="ask"
                  label="Get Insights"
                  onPrompt={handleClaudePrompt}
                  testId="tracking-claude-ask"
                />
              </div>
              
              <PhaseBreadcrumb
                phases={currentProject.phases}
                currentPhase={currentPhase}
                currentStep={currentStep}
                onPhaseSelect={onPhaseChange}
                onStepSelect={onStepChange}
                showSteps={false}
                testId="execute-phase-breadcrumb"
              />

              {/* Phase Progress Visualization */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-4">Phase Progress Overview</h3>
                <div className="space-y-3">
                  {currentProject.phases.map((phase) => {
                    const phaseSteps = phase.steps || [];
                    const completedCount = phaseSteps.filter(s => s.status === 'completed').length;
                    const progress = phaseSteps.length > 0 ? (completedCount / phaseSteps.length) * 100 : 0;
                    
                    return (
                      <div key={phase.id} className="flex items-center space-x-4">
                        <div className="w-32 text-sm font-medium text-gray-700">
                          {phase.name}
                        </div>
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${
                              progress === 100 ? 'bg-green-500' :
                              progress > 0 ? 'bg-blue-500' : 'bg-gray-300'
                            }`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <div className="w-16 text-sm text-gray-600 text-right">
                          {Math.round(progress)}%
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'steps' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Step Management</h2>
                <div className="text-sm text-gray-600">
                  {currentPhase ? `${currentPhase.steps?.length || 0} steps in ${currentPhase.name}` : 'No phase selected'}
                </div>
              </div>

              {currentPhase && currentPhase.steps && currentPhase.steps.length > 0 ? (
                <div className="space-y-3">
                  {currentPhase.steps.map((step, index) => (
                    <div
                      key={step.id}
                      className={`bg-white border rounded-lg p-4 hover:shadow-md transition-shadow ${
                        step.id === currentStep?.id ? 'border-blue-300 bg-blue-50' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <span className="text-sm font-medium text-gray-500">
                              Step {index + 1}
                            </span>
                            {step.isSideQuest && (
                              <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
                                Side Quest
                              </span>
                            )}
                            <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                              step.status === 'complete' || step.status === 'completed' ? 'bg-green-100 text-green-700' :
                              step.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                              step.status === 'blocked' || step.status === 'error' ? 'bg-red-100 text-red-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {step.status.replace('_', ' ')}
                            </span>
                          </div>
                          
                          <h3 className="text-lg font-medium text-gray-900 mb-1">
                            {step.name}
                          </h3>
                          
                          {step.description && (
                            <p className="text-gray-600 text-sm mb-2">
                              {step.description}
                            </p>
                          )}
                          
                          {step.stepInstruction && (
                            <div className="text-xs text-gray-500 bg-gray-50 rounded p-2">
                              <strong>Instructions:</strong> {step.stepInstruction}
                            </div>
                          )}
                        </div>
                        
                        <div className="ml-4 flex items-center space-x-2">
                          {getStepActionButton(step)}
                          <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                            <Clock className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Steps Available</h3>
                  <p className="text-gray-600">
                    {currentPhase ? 'This phase has no steps configured.' : 'Select a phase to view its steps.'}
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'blockers' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Active Blockers</h2>
                <ClaudePromptButton
                  type="analyze"
                  prompt="Analyze current blockers and suggest resolution strategies"
                  onPrompt={handleClaudePrompt}
                  testId="blockers-claude-analyze"
                />
              </div>

              {blockers.length > 0 ? (
                <div className="space-y-4">
                  {blockers.map((blocker) => (
                    <div
                      key={blocker.id}
                      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full border ${
                              getBlockerSeverityColor(blocker.severity)
                            }`}>
                              {blocker.severity.toUpperCase()}
                            </span>
                            <span className="text-sm text-gray-500">
                              Step: {blocker.stepId}
                            </span>
                            <span className="text-sm text-gray-500">
                              {new Date(blocker.reportedAt).toLocaleDateString()}
                            </span>
                          </div>
                          
                          <h3 className="text-lg font-medium text-gray-900 mb-1">
                            {blocker.title}
                          </h3>
                          
                          <p className="text-gray-600 text-sm mb-2">
                            {blocker.description}
                          </p>
                          
                          <div className="text-xs text-gray-500">
                            Reported by: {blocker.reportedBy}
                          </div>
                        </div>
                        
                        <div className="ml-4 flex items-center space-x-2">
                          <button className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm">
                            Resolve
                          </button>
                          <button className="px-3 py-1 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors text-sm">
                            Update
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Blockers</h3>
                  <p className="text-gray-600">All blockers have been resolved. Great work!</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};