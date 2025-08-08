import React, { useState, useEffect } from 'react';
import type { Project, Phase, PhaseStep } from '../../types/phase';
import { ContextAwareSidebarChat } from '../layout/ContextAwareSidebarChat';
import { multiAgentGovernance } from '../../services/multiAgentGovernance';

interface MultiAgentOrchestrationSurfaceProps {
  currentProject: Project | null;
  currentPhase: Phase | null;
  currentStep: PhaseStep | null;
  onPhaseChange?: (phase: Phase) => void;
  onStepChange?: (step: PhaseStep) => void;
}

export interface Agent {
  id: string;
  name: string;
  displayName: string;
  status: 'idle' | 'active' | 'processing' | 'error';
  activeTaskCount: number;
  lastMessage: string;
  lastMessageTime: Date;
  capabilities: string[];
  color: string;
}

interface Task {
  id: string;
  agentId: string;
  title: string;
  status: 'queued' | 'in_progress' | 'completed' | 'failed';
  priority: 'high' | 'medium' | 'low';
  createdAt: Date;
  description: string;
}

export const MultiAgentOrchestrationSurface: React.FC<MultiAgentOrchestrationSurfaceProps> = ({
  currentProject,
  currentPhase,
  currentStep
}) => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isTaskQueueVisible, setIsTaskQueueVisible] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [isChatVisible, setIsChatVisible] = useState(false);

  // Initialize agents
  useEffect(() => {
    const initialAgents: Agent[] = [
      {
        id: 'claude',
        name: 'Claude',
        displayName: 'Claude Code',
        status: 'active',
        activeTaskCount: 2,
        lastMessage: 'Cloud IDE integration completed successfully',
        lastMessageTime: new Date(Date.now() - 5 * 60000), // 5 minutes ago
        capabilities: ['Code Generation', 'Architecture Design', 'Documentation', 'Analysis'],
        color: 'bg-orange-500'
      },
      {
        id: 'gizmo',
        name: 'Gizmo',
        displayName: 'Gizmo Agent',
        status: 'processing',
        activeTaskCount: 1,
        lastMessage: 'Processing governance validation for Step 9.0.1',
        lastMessageTime: new Date(Date.now() - 2 * 60000), // 2 minutes ago
        capabilities: ['Task Orchestration', 'Workflow Management', 'Validation'],
        color: 'bg-blue-500'
      },
      {
        id: 'cc',
        name: 'CC',
        displayName: 'Claude Code',
        status: 'active',
        activeTaskCount: 1,
        lastMessage: 'Preparing multi-agent orchestration dashboard',
        lastMessageTime: new Date(Date.now() - 1 * 60000), // 1 minute ago
        capabilities: ['Implementation', 'Integration', 'UI Development'],
        color: 'bg-purple-500'
      },
      {
        id: 'azoai',
        name: 'AzOAI',
        displayName: 'Azure OpenAI',
        status: 'idle',
        activeTaskCount: 0,
        lastMessage: 'Ready for deployment tasks',
        lastMessageTime: new Date(Date.now() - 15 * 60000), // 15 minutes ago
        capabilities: ['Code Analysis', 'Documentation', 'Deployment Assistance'],
        color: 'bg-green-500'
      }
    ];

    setAgents(initialAgents);

    // Initialize sample tasks
    const initialTasks: Task[] = [
      {
        id: 'task-1',
        agentId: 'claude',
        title: 'Implement Multi-Agent Dashboard',
        status: 'in_progress',
        priority: 'high',
        createdAt: new Date(Date.now() - 30 * 60000),
        description: 'Build the orchestration dashboard with agent tiles and task queue'
      },
      {
        id: 'task-2',
        agentId: 'claude',
        title: 'Context-Aware Sidebar Chat',
        status: 'queued',
        priority: 'high',
        createdAt: new Date(Date.now() - 20 * 60000),
        description: 'Implement right-hand sidebar chat with orchestrator tabs'
      },
      {
        id: 'task-3',
        agentId: 'gizmo',
        title: 'Governance Logging Validation',
        status: 'in_progress',
        priority: 'medium',
        createdAt: new Date(Date.now() - 10 * 60000),
        description: 'Verify all orchestration events are logged to governance system'
      }
    ];

    setTasks(initialTasks);

    // Log dashboard deployment
    const logDashboardDeployment = async () => {
      const context = multiAgentGovernance.getAutoContext(
        currentProject?.id || '',
        currentProject?.name || '',
        currentPhase?.id || 'phase-9.0',
        currentPhase?.name || 'Phase 9.0',
        currentStep?.id || 'step-9.0.2',
        currentStep?.name || 'Step 9.0.2'
      );

      await multiAgentGovernance.logOrchestrationAction(
        'Dashboard Deployment',
        {
          dashboard_type: 'Multi-Agent Orchestration',
          agents_initialized: initialAgents.length,
          tasks_loaded: initialTasks.length,
          features: ['Agent tiles', 'Task queue', 'Status monitoring', 'Governance integration'],
          ui_components: ['Agent grid', 'Task queue', 'Progress bar', 'Chat integration']
        },
        context
      );

      // Log initial tasks as queued
      for (const task of initialTasks) {
        await multiAgentGovernance.logAgentTaskAssignment({
          id: task.id,
          agentId: task.agentId,
          title: task.title,
          description: task.description,
          priority: task.priority,
          status: task.status,
          assignedAt: task.createdAt,
          context
        });
      }
    };

    logDashboardDeployment();
  }, [currentProject, currentPhase, currentStep]);

  const getStatusIcon = (status: Agent['status']) => {
    const icons = {
      idle: '⚪',
      active: '🟢',
      processing: '🟡',
      error: '🔴'
    };
    return icons[status];
  };

  const getStatusColor = (status: Agent['status']) => {
    const colors = {
      idle: 'text-gray-500',
      active: 'text-green-500',
      processing: 'text-yellow-500',
      error: 'text-red-500'
    };
    return colors[status];
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  const handleAgentClick = (agentId: string) => {
    setSelectedAgent(agentId);
    // In a real implementation, this would open governance logs for that agent
    console.log(`📝 Opening governance log for agent: ${agentId}`);
  };

  const handleTaskClick = (taskId: string) => {
    // In a real implementation, this would open the specific governance entry for this task
    console.log(`📝 Opening governance entry for task: ${taskId}`);
  };

  // Calculate progress for current phase
  const phaseProgress = currentPhase?.completionPercentage || 0;
  const currentStepIndex = currentPhase?.steps?.findIndex(s => s.id === currentStep?.id) || 0;
  const totalSteps = currentPhase?.steps?.length || 1;

  return (
    <div className="h-full bg-gray-50 flex flex-col">
      {/* Top Panel - Phase Progress */}
      <div className="bg-white border-b border-gray-200 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Phase Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Multi-Agent Orchestration</h1>
              <p className="text-gray-600">
                {currentPhase?.name || 'Phase 9.0'} - Step {currentStep?.name || '9.0.2'}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setIsChatVisible(!isChatVisible)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  isChatVisible 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span>💬</span>
                <span className="text-sm font-medium">Orchestrator Chat</span>
              </button>
              <div className="text-right">
                <div className="text-sm text-gray-500">Memory Anchor</div>
                <div className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                  of-9.0-init-20250806
                </div>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span>Phase Progress</span>
              <span>{phaseProgress}% Complete</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${phaseProgress}%` }}
              ></div>
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-500">
              <span>Step {currentStepIndex + 1} of {totalSteps}</span>
              <span>Active: {currentStep?.name}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-7xl mx-auto">
          {/* Agent Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {agents.map((agent) => (
              <div 
                key={agent.id}
                onClick={() => handleAgentClick(agent.id)}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-all duration-200 hover:border-blue-300"
              >
                {/* Agent Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${agent.color}`}></div>
                    <h3 className="font-semibold text-gray-900">{agent.displayName}</h3>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="text-lg">{getStatusIcon(agent.status)}</span>
                    <span className={`text-xs font-medium ${getStatusColor(agent.status)}`}>
                      {agent.status.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Active Tasks */}
                <div className="mb-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Active Tasks</span>
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                      {agent.activeTaskCount}
                    </span>
                  </div>
                </div>

                {/* Last Message */}
                <div className="mb-3">
                  <div className="text-xs text-gray-500 mb-1">Last Message</div>
                  <div className="text-sm text-gray-700 line-clamp-2">
                    {agent.lastMessage}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {formatTimeAgo(agent.lastMessageTime)}
                  </div>
                </div>

                {/* Capabilities */}
                <div className="flex flex-wrap gap-1">
                  {agent.capabilities.slice(0, 2).map((capability, index) => (
                    <span 
                      key={index}
                      className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded"
                    >
                      {capability}
                    </span>
                  ))}
                  {agent.capabilities.length > 2 && (
                    <span className="text-xs text-gray-400">
                      +{agent.capabilities.length - 2}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Task Queue */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div 
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
              onClick={() => setIsTaskQueueVisible(!isTaskQueueVisible)}
            >
              <h3 className="text-lg font-semibold text-gray-900">Task Queue</h3>
              <div className="flex items-center space-x-2">
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm font-medium">
                  {tasks.filter(t => t.status !== 'completed').length} active
                </span>
                <svg 
                  className={`w-5 h-5 text-gray-400 transition-transform ${isTaskQueueVisible ? 'rotate-180' : ''}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {isTaskQueueVisible && (
              <div className="border-t border-gray-200 p-4">
                <div className="space-y-3">
                  {tasks.map((task) => {
                    const agent = agents.find(a => a.id === task.agentId);
                    return (
                      <div 
                        key={task.id}
                        onClick={() => handleTaskClick(task.id)}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`w-2 h-2 rounded-full ${agent?.color || 'bg-gray-400'}`}></div>
                          <div>
                            <div className="font-medium text-gray-900">{task.title}</div>
                            <div className="text-sm text-gray-600">{task.description}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-xs px-2 py-1 rounded-full ${
                            task.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                            task.status === 'queued' ? 'bg-blue-100 text-blue-800' :
                            task.status === 'completed' ? 'bg-green-100 text-green-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {task.status.replace('_', ' ').toUpperCase()}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            {agent?.displayName}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* System Status */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="font-medium text-blue-900">Orchestration System Status</span>
            </div>
            <div className="text-sm text-blue-700">
              All agents operational • Task queue processing • Governance logging active • 
              Memory anchor tracking enabled
            </div>
          </div>
        </div>
      </div>

      {/* Context-Aware Sidebar Chat */}
      <ContextAwareSidebarChat
        currentProject={currentProject}
        currentPhase={currentPhase}
        currentStep={currentStep}
        isVisible={isChatVisible}
        onToggle={() => setIsChatVisible(!isChatVisible)}
        onClose={() => setIsChatVisible(false)}
      />
    </div>
  );
};

export default MultiAgentOrchestrationSurface;