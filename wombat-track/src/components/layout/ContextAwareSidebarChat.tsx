import React, { useState, useEffect, useRef } from 'react';
import type { Project, Phase, PhaseStep } from '../../types/phase';
import type { ChatInteraction } from '../../services/multiAgentGovernance';
import { multiAgentGovernance } from '../../services/multiAgentGovernance';

interface ContextAwareSidebarChatProps {
  currentProject: Project | null;
  currentPhase: Phase | null;
  currentStep: PhaseStep | null;
  isVisible: boolean;
  onToggle: () => void;
  onClose?: () => void;
}

interface ChatMessage {
  id: string;
  agentId: string;
  agentName: string;
  content: string;
  timestamp: Date;
  context: {
    projectId: string;
    projectName: string;
    phaseId: string;
    phaseName: string;
    stepId: string;
    stepName: string;
  };
  isUser: boolean;
  governanceLogged: boolean;
}

interface Agent {
  id: string;
  name: string;
  displayName: string;
  color: string;
  status: 'online' | 'busy' | 'offline';
  avatar: string;
}

export const ContextAwareSidebarChat: React.FC<ContextAwareSidebarChatProps> = ({
  currentProject,
  currentPhase,
  currentStep,
  isVisible,
  onToggle,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<string>('all');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const agents: Agent[] = [
    {
      id: 'claude',
      name: 'Claude',
      displayName: 'Claude Code',
      color: 'bg-orange-500',
      status: 'online',
      avatar: '🧠'
    },
    {
      id: 'gizmo',
      name: 'Gizmo',
      displayName: 'Gizmo',
      color: 'bg-blue-500',
      status: 'online',
      avatar: '⚙️'
    },
    {
      id: 'cc',
      name: 'CC',
      displayName: 'Claude Code',
      color: 'bg-purple-500',
      status: 'busy',
      avatar: '🤖'
    },
    {
      id: 'azoai',
      name: 'AzOAI',
      displayName: 'Azure OpenAI',
      color: 'bg-green-500',
      status: 'online',
      avatar: '☁️'
    }
  ];

  const tabs = [
    { id: 'all', label: 'All Orchestrators', icon: '🤖' },
    { id: 'claude', label: 'Claude', icon: '🧠' },
    { id: 'gizmo', label: 'Gizmo', icon: '⚙️' },
    { id: 'cc', label: 'CC', icon: '🤖' },
    { id: 'azoai', label: 'AzOAI', icon: '☁️' }
  ];

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when sidebar becomes visible
  useEffect(() => {
    if (isVisible) {
      inputRef.current?.focus();
    }
  }, [isVisible]);

  // Initialize with welcome message
  useEffect(() => {
    if (currentProject && messages.length === 0) {
      const welcomeMessage: ChatMessage = {
        id: 'welcome-1',
        agentId: 'cc',
        agentName: 'Claude Code',
        content: `Welcome to Multi-Agent Orchestration for ${currentProject.name}! I'm ready to help coordinate tasks across all agents. What would you like to work on?`,
        timestamp: new Date(),
        context: {
          projectId: currentProject.id,
          projectName: currentProject.name,
          phaseId: currentPhase?.id || '',
          phaseName: currentPhase?.name || '',
          stepId: currentStep?.id || '',
          stepName: currentStep?.name || ''
        },
        isUser: false,
        governanceLogged: true
      };
      setMessages([welcomeMessage]);
    }
  }, [currentProject, currentPhase, currentStep, messages.length]);

  const getCurrentContext = () => {
    return {
      projectId: currentProject?.id || '',
      projectName: currentProject?.name || '',
      phaseId: currentPhase?.id || '',
      phaseName: currentPhase?.name || '',
      stepId: currentStep?.id || '',
      stepName: currentStep?.name || ''
    };
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isProcessing) return;

    const messageContent = inputText.trim();
    setInputText('');
    setIsProcessing(true);

    // Add user message
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      agentId: 'user',
      agentName: 'User',
      content: messageContent,
      timestamp: new Date(),
      context: getCurrentContext(),
      isUser: true,
      governanceLogged: false // Will be logged when processed
    };

    setMessages(prev => [...prev, userMessage]);

    // Simulate agent response based on active tab
    setTimeout(async () => {
      const targetAgent = activeTab === 'all' ? 'cc' : activeTab;
      const agent = agents.find(a => a.id === targetAgent) || agents[0];
      
      let responseContent = '';
      
      // Generate contextual responses based on current step and agent
      if (currentStep?.name?.includes('9.0.2')) {
        responseContent = getStep902Response(targetAgent, messageContent);
      } else {
        responseContent = getGenericResponse(targetAgent, messageContent);
      }

      const agentMessage: ChatMessage = {
        id: `${targetAgent}-${Date.now()}`,
        agentId: targetAgent,
        agentName: agent.displayName,
        content: responseContent,
        timestamp: new Date(),
        context: getCurrentContext(),
        isUser: false,
        governanceLogged: true
      };

      setMessages(prev => [...prev, agentMessage]);
      setIsProcessing(false);

      // Log to governance system
      await logChatInteraction(userMessage, agentMessage);
    }, 1000 + Math.random() * 2000); // Simulate processing time
  };

  const getStep902Response = (agentId: string, userMessage: string): string => {
    const responses: { [key: string]: { [key: string]: string } } = {
      claude: {
        dashboard: "I've implemented the Multi-Agent Orchestration Dashboard with agent tiles, task queues, and governance integration. The dashboard shows real-time status for all orchestrators.",
        chat: "The context-aware sidebar chat is now active! It automatically tags all messages with ProjectID, PhaseID, and StepID for governance traceability.",
        orchestration: "Multi-agent orchestration is operational. I can coordinate tasks between Claude, Gizmo, CC, and AzOAI agents while maintaining full governance logging.",
        default: "I'm focused on Step 9.0.2 Multi-Agent Orchestration. I can help with dashboard implementation, sidebar chat integration, or agent coordination tasks."
      },
      gizmo: {
        validation: "I'm validating all orchestration components for governance compliance. The chat interactions are being logged to MemoryPlugin and DriveMemory as required.",
        workflow: "Task workflow management is active. I'm tracking all agent interactions and ensuring proper governance triggers are fired.",
        default: "I'm managing the orchestration workflow for Step 9.0.2. All agent communications are being validated and logged for governance."
      },
      cc: {
        implementation: "I've completed the Multi-Agent Orchestration Dashboard implementation. The UI follows the VS Code + GitHub Copilot aesthetic with full governance integration.",
        ui: "The sidebar chat UI is fully implemented with tabs for all orchestrators, context-aware headers, and auto-logging indicators.",
        default: "I'm implementing Step 9.0.2 features including the orchestration dashboard and context-aware chat. All components are governance-ready."
      },
      azoai: {
        deployment: "Azure integration is ready for Step 9.0.2 orchestration. I can assist with cloud deployment and scaling when needed.",
        analysis: "I'm analyzing the orchestration patterns for optimization opportunities. The multi-agent coordination is performing well.",
        default: "I'm ready to assist with Azure-related tasks for the multi-agent orchestration system. How can I help with cloud integration?"
      }
    };

    const agentResponses = responses[agentId] || responses.claude;
    
    // Match keywords in user message to appropriate response
    const lowerMessage = userMessage.toLowerCase();
    if (lowerMessage.includes('dashboard')) return agentResponses.dashboard || agentResponses.default;
    if (lowerMessage.includes('chat') || lowerMessage.includes('sidebar')) return agentResponses.chat || agentResponses.default;
    if (lowerMessage.includes('orchestration')) return agentResponses.orchestration || agentResponses.default;
    if (lowerMessage.includes('validation')) return agentResponses.validation || agentResponses.default;
    if (lowerMessage.includes('deployment')) return agentResponses.deployment || agentResponses.default;
    
    return agentResponses.default;
  };

  const getGenericResponse = (agentId: string, userMessage: string): string => {
    const genericResponses: { [key: string]: string } = {
      claude: "I'm ready to help with any code implementation, architecture design, or analysis tasks. What specific challenge can I assist with?",
      gizmo: "I'm coordinating workflows and ensuring all processes follow proper governance. How can I help optimize your current task?",
      cc: "I'm implementing features and integrations as specified. What component would you like me to work on?",
      azoai: "I'm available for Azure cloud services, deployment assistance, and infrastructure guidance. What can I help you with?"
    };

    return genericResponses[agentId] || genericResponses.claude;
  };

  const logChatInteraction = async (userMessage: ChatMessage, agentMessage: ChatMessage) => {
    // Create structured chat interaction for governance
    const interaction: ChatInteraction = {
      userMessage: {
        content: userMessage.content,
        timestamp: userMessage.timestamp,
        context: userMessage.context
      },
      agentResponse: {
        agentId: agentMessage.agentId,
        agentName: agentMessage.agentName,
        content: agentMessage.content,
        timestamp: agentMessage.timestamp
      },
      governanceMetadata: {
        projectId: userMessage.context.projectId,
        phaseId: userMessage.context.phaseId,
        stepId: userMessage.context.stepId,
        conversationId: multiAgentGovernance.generateConversationId()
      }
    };

    // Log to multi-agent governance service
    await multiAgentGovernance.logChatInteraction(interaction);
    
    // Update message as governance logged
    setMessages(prev => prev.map(msg => 
      msg.id === userMessage.id ? { ...msg, governanceLogged: true } : msg
    ));
  };

  const getStatusIcon = (status: Agent['status']) => {
    const icons = {
      online: '🟢',
      busy: '🟡',
      offline: '🔴'
    };
    return icons[status];
  };

  const filteredMessages = activeTab === 'all' 
    ? messages 
    : messages.filter(msg => msg.agentId === activeTab || msg.isUser);

  if (!isVisible) return null;

  return (
    <div className="fixed right-0 top-0 h-full w-80 bg-white border-l border-gray-200 shadow-lg z-50 flex flex-col">
      {/* Header */}
      <div className="bg-gray-50 border-b border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">Orchestrator Chat</h3>
          <button 
            onClick={onToggle}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Context Header */}
        <div className="text-xs text-gray-600 bg-blue-50 px-2 py-1 rounded border border-blue-200">
          <div className="font-mono">
            {currentProject?.name} &gt; {currentPhase?.name} &gt; {currentStep?.name}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 mt-3">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                activeTab === tab.id 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
              title={tab.label}
            >
              {tab.icon}
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {filteredMessages.map(message => {
          const agent = agents.find(a => a.id === message.agentId);
          
          return (
            <div key={message.id} className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xs rounded-lg p-3 ${
                message.isUser 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-100 text-gray-900'
              }`}>
                {!message.isUser && (
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-sm">{agent?.avatar || '🤖'}</span>
                    <span className="text-xs font-medium">{message.agentName}</span>
                    {agent && <span className="text-xs">{getStatusIcon(agent.status)}</span>}
                  </div>
                )}
                
                <div className="text-sm">{message.content}</div>
                
                <div className={`flex items-center justify-between mt-2 text-xs ${
                  message.isUser ? 'text-blue-100' : 'text-gray-500'
                }`}>
                  <span>{message.timestamp.toLocaleTimeString()}</span>
                  {message.governanceLogged && (
                    <span className="flex items-center space-x-1" title="Logged to Governance">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>📝</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        
        {isProcessing && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-900 rounded-lg p-3 max-w-xs">
              <div className="flex items-center space-x-2">
                <div className="animate-pulse text-sm">Agent is typing...</div>
                <div className="animate-spin w-3 h-3 border border-gray-400 border-t-transparent rounded-full"></div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 p-4">
        <form onSubmit={handleSendMessage} className="flex space-x-2">
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Message orchestrators..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isProcessing}
          />
          <button
            type="submit"
            disabled={isProcessing || !inputText.trim()}
            className="px-3 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </form>
        
        {/* Status Indicators */}
        <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
          <div className="flex items-center space-x-1">
            <span>📝 Auto-logging</span>
            <span>•</span>
            <span>🧠 Context-aware</span>
          </div>
          <div className="flex items-center space-x-1">
            <span>Cmd+K</span>
          </div>
        </div>
      </div>
    </div>
  );
};