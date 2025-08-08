import React, { useState, useEffect, useRef } from 'react';
import { X, MessageCircle, ChevronRight, Zap, Shield } from 'lucide-react';
import type { ChatInteraction } from '../../services/multiAgentGovernance';
import { multiAgentGovernance } from '../../services/multiAgentGovernance';
import { 
  InstructionProtocol, 
  ZoiInstructionProtocol, 
  CCInstructionProtocol 
} from '../../services/instructionProtocol';

interface GlobalOrchestratorChatProps {
  currentProject?: any;
  currentPhase?: any;
  currentStep?: any;
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

export const GlobalOrchestratorChat: React.FC<GlobalOrchestratorChatProps> = ({
  currentProject,
  currentPhase,
  currentStep
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [executionMode, setExecutionMode] = useState<boolean>(false);
  const [pendingInstructions, setPendingInstructions] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const zoiProtocol = useRef<ZoiInstructionProtocol>(new ZoiInstructionProtocol());
  const ccProtocol = useRef<CCInstructionProtocol>(new CCInstructionProtocol());

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

  // Focus input when chat becomes open
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  // Initialize with welcome message when opened
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcomeMessage: ChatMessage = {
        id: 'welcome-global-1',
        agentId: 'cc',
        agentName: 'Claude Code',
        content: `Global Orchestrator Chat activated! I'm ready to assist with any task across the platform. What can I help you with?`,
        timestamp: new Date(),
        context: getCurrentContext(),
        isUser: false,
        governanceLogged: true
      };
      setMessages([welcomeMessage]);
    }
  }, [isOpen]);

  const getCurrentContext = () => {
    return {
      projectId: currentProject?.id || 'global',
      projectName: currentProject?.name || 'Global Context',
      phaseId: currentPhase?.id || 'N/A',
      phaseName: currentPhase?.name || 'N/A',
      stepId: currentStep?.id || 'N/A',
      stepName: currentStep?.name || 'N/A'
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
      id: `user-global-${Date.now()}`,
      agentId: 'user',
      agentName: 'User',
      content: messageContent,
      timestamp: new Date(),
      context: getCurrentContext(),
      isUser: true,
      governanceLogged: false
    };

    setMessages(prev => [...prev, userMessage]);

    // Send to all active agents based on tab selection
    if (activeTab === 'all') {
      // Send to all agents and collect responses
      await sendMessageToAllAgents(userMessage);
    } else {
      // Send to specific agent
      await sendMessageToAgent(activeTab, userMessage);
    }
  };

  const sendMessageToAllAgents = async (userMessage: ChatMessage) => {
    const activeAgents = ['claude', 'gizmo', 'cc', 'azoai'];
    
    for (const agentId of activeAgents) {
      try {
        await sendMessageToAgent(agentId, userMessage, 1000 * activeAgents.indexOf(agentId));
      } catch (error) {
        console.error(`Failed to send message to ${agentId}:`, error);
      }
    }
    setIsProcessing(false);
  };

  const sendMessageToAgent = async (agentId: string, userMessage: ChatMessage, delay: number = 0) => {
    const agent = agents.find(a => a.id === agentId);
    if (!agent) return;

    setTimeout(async () => {
      try {
        let responseContent: string;
        let executionInstruction: any = null;
        
        // Check for execution mode commands
        if (executionMode && userMessage.content.toLowerCase().includes('execute:')) {
          executionInstruction = await createExecutionInstruction(agentId, userMessage);
        }
        
        // Route to appropriate service based on agent
        switch (agentId) {
          case 'azoai':
            if (executionInstruction) {
              responseContent = await executeInstruction(executionInstruction, 'zoi');
            } else {
              responseContent = await getAzureOpenAIResponse(userMessage.content, userMessage.context);
            }
            break;
          case 'claude':
            responseContent = await getClaudeResponse(userMessage.content, userMessage.context);
            break;
          case 'gizmo':
            responseContent = await getGizmoResponse(userMessage.content, userMessage.context);
            break;
          case 'cc':
            if (executionInstruction) {
              responseContent = await executeInstruction(executionInstruction, 'cc');
            } else {
              responseContent = getGlobalOrchestratorResponse(agentId, userMessage.content);
            }
            break;
          default:
            responseContent = getGlobalOrchestratorResponse(agentId, userMessage.content);
            break;
        }

        const agentMessage: ChatMessage = {
          id: `${agentId}-global-${Date.now()}`,
          agentId,
          agentName: agent.displayName,
          content: responseContent,
          timestamp: new Date(),
          context: userMessage.context,
          isUser: false,
          governanceLogged: true
        };

        setMessages(prev => [...prev, agentMessage]);

        // Log to governance system
        await logChatInteraction(userMessage, agentMessage);

        // Single agent mode - finish processing
        if (activeTab !== 'all') {
          setIsProcessing(false);
        }

      } catch (error) {
        console.error(`Agent ${agentId} failed to respond:`, error);
        
        // Add error message
        const errorMessage: ChatMessage = {
          id: `${agentId}-error-${Date.now()}`,
          agentId,
          agentName: agent.displayName,
          content: `Sorry, I encountered an error processing your message: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: new Date(),
          context: userMessage.context,
          isUser: false,
          governanceLogged: false
        };

        setMessages(prev => [...prev, errorMessage]);
        
        if (activeTab !== 'all') {
          setIsProcessing(false);
        }
      }
    }, delay + Math.random() * 1000);
  };

  const getGlobalOrchestratorResponse = (agentId: string, userMessage: string): string => {
    const currentUrl = window.location.pathname;
    const isIntegrationPage = currentUrl.includes('/integrate');
    const isAdminPage = currentUrl.includes('/admin');
    const isProjectPage = currentUrl.includes('/projects');

    const contextResponses: { [key: string]: { [key: string]: string } } = {
      claude: {
        integration: "I can help with Cloud IDE setup, GitHub integration, or Multi-Agent Orchestration. The Integration Monitoring page gives you access to both development tools.",
        admin: "I'm ready to assist with admin tasks like data exploration, import/export operations, or system management.",
        projects: "I can help analyze project data, generate reports, or assist with strategic planning across your project portfolio.",
        default: "I'm here to help across the entire Orbis platform. I can assist with coding, analysis, integration setup, or any other technical tasks."
      },
      gizmo: {
        integration: "I'm monitoring all integration health and can help coordinate between Cloud IDE and Multi-Agent systems for optimal workflow.",
        admin: "I can validate admin operations and ensure all processes follow proper governance protocols.",
        projects: "I'm tracking project workflows and can help optimize task orchestration across your project portfolio.",
        default: "I coordinate workflows and ensure all platform operations run smoothly. What workflow optimization can I help with?"
      },
      cc: {
        integration: "The Integration Monitoring page now includes both Cloud IDE and Multi-Agent Orchestration. I can help you navigate or implement features in either system.",
        admin: "I'm implementing admin features and can help with system configuration or troubleshooting.",
        projects: "I can help implement new project features or optimize existing project management workflows.",
        default: "I'm your implementation specialist. I can code, configure, or integrate any feature you need across the platform."
      },
      azoai: {
        integration: "Azure services are ready to support your Cloud IDE deployments and Multi-Agent orchestration scaling.",
        admin: "I can help with Azure-based admin operations, security configurations, and cloud resource management.",
        projects: "I provide cloud-scale analytics and can help optimize project performance across Azure infrastructure.",
        default: "I'm ready to help with Azure cloud services, deployment assistance, and infrastructure scaling."
      }
    };

    const agentResponses = contextResponses[agentId] || contextResponses.claude;
    
    // Match context and keywords
    const lowerMessage = userMessage.toLowerCase();
    if (isIntegrationPage || lowerMessage.includes('integration') || lowerMessage.includes('cloud') || lowerMessage.includes('ide')) {
      return agentResponses.integration || agentResponses.default;
    }
    if (isAdminPage || lowerMessage.includes('admin') || lowerMessage.includes('data')) {
      return agentResponses.admin || agentResponses.default;
    }
    if (isProjectPage || lowerMessage.includes('project')) {
      return agentResponses.projects || agentResponses.default;
    }
    
    return agentResponses.default;
  };

  const getAzureOpenAIResponse = async (userMessage: string, context: any): Promise<string> => {
    try {
      // Use browser-safe client that calls backend API
      const { azureOpenAIClient } = await import('../../services/azureOpenAIClient');
      
      const response = await azureOpenAIClient.generateContextualResponse(userMessage, {
        projectName: context.projectName,
        phaseName: context.phaseName,
        stepName: context.stepName
      });

      return response || 'I apologize, but I encountered an issue generating a response. Please try again.';

    } catch (error) {
      console.error('Azure OpenAI Client error:', error);
      return `I'm experiencing connectivity issues with Azure OpenAI services. Error: ${error instanceof Error ? error.message : 'Unknown error'}. 

However, I can still provide general guidance about Azure services and platform integration. Please try your request again or let me know how else I can help.`;
    }
  };

  const getClaudeResponse = async (userMessage: string, context: any): Promise<string> => {
    try {
      // Use browser-safe client that calls backend API
      const { claudeClient } = await import('../../services/claudeClient');
      
      const response = await claudeClient.generateContextualResponse(userMessage, {
        projectName: context.projectName,
        phaseName: context.phaseName,
        stepName: context.stepName
      });

      return response || 'I apologize, but I encountered an issue generating a response. Please try again.';

    } catch (error) {
      console.error('Claude Client error:', error);
      return `I'm experiencing connectivity issues with my backend service. Error: ${error instanceof Error ? error.message : 'Unknown error'}. 

However, I can still provide general guidance about code analysis, architectural decisions, debugging approaches, and strategic planning. Please try your request again or let me know how else I can help with your development work.`;
    }
  };

  const getGizmoResponse = async (userMessage: string, context: any): Promise<string> => {
    try {
      // Gizmo focuses on workflow orchestration and system coordination
      const workflowResponse = getWorkflowOrchestrationResponse(userMessage, context);
      
      // Simulate orchestration processing time
      await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 800));
      
      return workflowResponse;

    } catch (error) {
      console.error('Gizmo orchestration error:', error);
      return `Workflow orchestration temporarily unavailable. Error: ${error instanceof Error ? error.message : 'Unknown error'}. I can still provide guidance on process optimization and system coordination.`;
    }
  };

  const getContextualClaudeResponse = (userMessage: string, context: any): string => {
    const lowerMessage = userMessage.toLowerCase();
    
    if (lowerMessage.includes('code') || lowerMessage.includes('implement')) {
      return `I'll help you with code analysis and implementation. Given your current context in "${context.projectName}" → "${context.phaseName}", I can assist with technical architecture, code reviews, refactoring, and implementation strategies. What specific coding challenge can I help you solve?`;
    }
    
    if (lowerMessage.includes('strategy') || lowerMessage.includes('plan')) {
      return `From a strategic perspective in "${context.projectName}", I can help you develop comprehensive plans, evaluate technical decisions, and align your "${context.stepName}" activities with broader objectives. What strategic guidance do you need?`;
    }
    
    if (lowerMessage.includes('analyze') || lowerMessage.includes('review')) {
      return `I excel at deep analysis and comprehensive reviews. For your current phase "${context.phaseName}", I can analyze code quality, architectural decisions, business logic, data flows, and identify potential improvements. What would you like me to analyze?`;
    }
    
    return `I'm here to provide thoughtful analysis and strategic guidance for your "${context.projectName}" work. Whether you need help with technical decisions, code architecture, process optimization, or strategic planning, I can offer detailed insights tailored to your current context. How can I assist you today?`;
  };

  const getWorkflowOrchestrationResponse = (userMessage: string, context: any): string => {
    const lowerMessage = userMessage.toLowerCase();
    
    if (lowerMessage.includes('workflow') || lowerMessage.includes('process')) {
      return `🔄 Analyzing workflow patterns for "${context.projectName}" → "${context.phaseName}". I can optimize your current processes, identify automation opportunities, coordinate between systems, and ensure smooth handoffs between project phases. What workflow optimization are you looking for?`;
    }
    
    if (lowerMessage.includes('integrate') || lowerMessage.includes('connect')) {
      return `🔗 Monitoring system integrations across the platform. I can help coordinate between your Plan → Execute → Document → Govern surfaces, manage data flows, and ensure all components work harmoniously. Which systems need better integration?`;
    }
    
    if (lowerMessage.includes('automate') || lowerMessage.includes('schedule')) {
      return `⚙️ I specialize in automation and orchestration. For your current step "${context.stepName}", I can help set up automated workflows, schedule recurring tasks, manage dependencies, and ensure consistent execution. What would you like to automate?`;
    }
    
    return `🤖 I'm your workflow orchestration specialist, monitoring all processes in "${context.projectName}". I coordinate between systems, optimize task flows, manage automation, and ensure everything runs smoothly. Whether you need process optimization, system coordination, or automation setup, I'm here to help. What workflow needs attention?`;
  };

  const logChatInteraction = async (userMessage: ChatMessage, agentMessage: ChatMessage) => {
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

    await multiAgentGovernance.logChatInteraction(interaction);
    
    setMessages(prev => prev.map(msg => 
      msg.id === userMessage.id ? { ...msg, governanceLogged: true } : msg
    ));
  };

  const createExecutionInstruction = async (agentId: string, userMessage: ChatMessage) => {
    const content = userMessage.content.toLowerCase();
    const context = {
      projectId: userMessage.context.projectId,
      phaseId: 'OF-9.0',
      stepId: '9.0.4',
      memoryAnchor: 'of-9.0-init-20250806'
    };
    
    // Parse execution command
    if (content.includes('execute: github')) {
      if (content.includes('create branch')) {
        return ccProtocol.current.createGitHubInstruction(
          InstructionProtocol.githubOperations.createBranch(
            'jtaylor',
            'wombat-track',
            'feature/of-9.0-execution',
            'main'
          )
        );
      }
      if (content.includes('create pr')) {
        return ccProtocol.current.createGitHubInstruction(
          InstructionProtocol.githubOperations.createPR(
            'jtaylor',
            'wombat-track',
            'OF-9.0.4: Orchestrator Execution Service',
            'Implements direct execution mode for multi-agent orchestration',
            'feature/of-9.0-execution',
            'main'
          )
        );
      }
    }
    
    if (content.includes('execute: azure')) {
      if (content.includes('deploy')) {
        return zoiProtocol.current.createAzureInstruction(
          InstructionProtocol.azureOperations.deployContainer(
            'of-8-6-cloud-rg',
            'of-orchestrator-execution',
            'wombat-track:latest'
          ),
          process.env.AZURE_SUBSCRIPTION_ID || '',
          'of-8-6-cloud-rg'
        );
      }
    }
    
    if (content.includes('execute: file')) {
      if (content.includes('sync memory')) {
        return InstructionProtocol.fileOperations.syncDriveMemory(
          'OF-9.0',
          'execution-log.json',
          { 
            timestamp: new Date().toISOString(),
            agent: agentId,
            action: 'memory_sync'
          }
        );
      }
    }
    
    return null;
  };

  const executeInstruction = async (instruction: any, agentType: 'zoi' | 'cc'): Promise<string> => {
    try {
      // Send to backend orchestrator execution service
      const response = await fetch('/api/orchestrator/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('jwt_token') || ''}`,
          'X-oApp-API-Key': localStorage.getItem('oapp_api_key') || ''
        },
        body: JSON.stringify(instruction)
      });
      
      if (!response.ok) {
        throw new Error(`Execution failed: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      // Add to pending instructions for monitoring
      setPendingInstructions(prev => [...prev, { ...instruction, result }]);
      
      return `✅ Execution successful!
      
Instruction ID: ${result.instructionId}
Status: ${result.status}
${result.artifacts ? `Artifacts: ${result.artifacts.join(', ')}` : ''}
${result.governanceLogId ? `Governance Log: ${result.governanceLogId}` : ''}

The operation has been executed and logged to the governance system.`;
      
    } catch (error) {
      console.error('Execution error:', error);
      return `❌ Execution failed: ${error instanceof Error ? error.message : 'Unknown error'}
      
The instruction could not be executed. Please check your credentials and try again.`;
    }
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

  return (
    <>
      {/* Floating Chat Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed right-6 top-1/2 -translate-y-1/2 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-l-lg shadow-lg z-[9998] transition-colors"
          title="Open Orchestrator Chat"
        >
          <MessageCircle className="w-5 h-5" />
        </button>
      )}

      {/* Chat Sidebar */}
      <div className={`fixed right-0 top-0 h-full w-80 bg-white border-l border-gray-200 shadow-lg z-[9999] flex flex-col transition-transform duration-300 ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        {/* Header */}
        <div className="bg-gray-50 border-b border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">🤖 Orchestrator Chat</h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setExecutionMode(!executionMode)}
                className={`p-1.5 rounded transition-colors ${
                  executionMode 
                    ? 'bg-green-500 text-white' 
                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                }`}
                title={executionMode ? 'Execution Mode ON' : 'Execution Mode OFF'}
              >
                {executionMode ? <Zap className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
              </button>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Context Header */}
          <div className="text-xs text-gray-600 bg-blue-50 px-2 py-1 rounded border border-blue-200">
            <div className="font-mono">
              {getCurrentContext().projectName} &gt; {getCurrentContext().phaseName}
            </div>
            {executionMode && (
              <div className="mt-1 text-green-600 font-semibold">
                ⚡ Execution Mode Active - Use "execute: [command]"
              </div>
            )}
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
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm">{agent?.avatar || '🤖'}</span>
                        <span className="text-xs font-medium">{message.agentName}</span>
                        {agent && <span className="text-xs">{getStatusIcon(agent.status)}</span>}
                      </div>
                      <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        agent?.id === 'azoai' ? 'bg-green-100 text-green-800' :
                        agent?.id === 'claude' ? 'bg-orange-100 text-orange-800' :
                        agent?.id === 'gizmo' ? 'bg-blue-100 text-blue-800' :
                        'bg-purple-100 text-purple-800'
                      }`}>
                        {agent?.id?.toUpperCase() || 'CC'}
                      </div>
                    </div>
                  )}
                  
                  <div className="text-sm">{message.content}</div>
                  
                  <div className={`flex items-center justify-between mt-2 text-xs ${
                    message.isUser ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    <span>{message.timestamp.toLocaleTimeString()}</span>
                    {message.governanceLogged && (
                      <span className="flex items-center space-x-1" title="Logged to Governance">
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
              <ChevronRight className="w-4 h-4" />
            </button>
          </form>
          
          {/* Status Indicators */}
          <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
            <div className="flex items-center space-x-1">
              <span>📝 Auto-logging</span>
              <span>•</span>
              <span>🌐 Global context</span>
              {executionMode && (
                <>
                  <span>•</span>
                  <span className="text-green-600">⚡ Execution</span>
                </>
              )}
            </div>
            <div className="flex items-center space-x-1">
              {pendingInstructions.length > 0 && (
                <span className="text-orange-600">
                  {pendingInstructions.length} pending
                </span>
              )}
              <span>Available everywhere</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default GlobalOrchestratorChat;