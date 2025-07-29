import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, Zap, Loader2, RotateCcw, Copy, ChevronDown, Save, Settings, Wifi, WifiOff } from 'lucide-react';
import { useProjectContext } from '../contexts/ProjectContext';
import { logAIConsoleInteraction } from '../utils/governanceLogger';
import { handleAIPrompt, getDispatcherStatus } from '../lib/aiDispatchers';

export type AIAgent = 'claude' | 'gizmo';

export interface ConsoleMessage {
  id: string;
  sender: 'user' | AIAgent;
  content: string;
  timestamp: string;
  agentName?: string;
  isLoading?: boolean;
  isLogged?: boolean;
  logId?: string;
  isLive?: boolean;
  responseTime?: number;
}

export interface GizmoConsoleProps {
  className?: string;
  onPrompt?: (prompt: string, agent: AIAgent, context?: Record<string, unknown>) => Promise<string>; // no-explicit-any fix
  initialAgent?: AIAgent;
  placeholder?: string;
  maxHeight?: string;
  // Governance logging context
  projectId?: string;
  phaseStepId?: string;
  promptType?: string;
  autoLog?: boolean;
  userId?: string;
}

const AGENT_CONFIGS = {
  claude: {
    icon: Bot,
    name: 'Claude',
    color: 'bg-blue-500',
    hoverColor: 'hover:bg-blue-600',
    textColor: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200'
  },
  gizmo: {
    icon: Zap,
    name: 'Gizmo',
    color: 'bg-purple-500',
    hoverColor: 'hover:bg-purple-600',
    textColor: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200'
  }
};

export const GizmoConsole: React.FC<GizmoConsoleProps> = ({
  className = '',
  onPrompt,
  initialAgent = 'claude',
  placeholder = 'Type your message...',
  maxHeight = 'max-h-96',
  projectId,
  phaseStepId,
  promptType = 'general',
  autoLog = false,
  userId = 'current-user'
}) => {
  const [messages, setMessages] = useState<ConsoleMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<AIAgent>(initialAgent);
  const [isLoading, setIsLoading] = useState(false);
  const [showAgentDropdown, setShowAgentDropdown] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [autoLogEnabled, setAutoLogEnabled] = useState(autoLog);
  const [dispatcherStatus, setDispatcherStatus] = useState(getDispatcherStatus());
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Project context for governance logging
  const { logGovernanceEvent } = useProjectContext();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus textarea on component mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const createMessage = (
    sender: 'user' | AIAgent,
    content: string,
    agentName?: string,
    isLoading = false,
    isLogged = false,
    logId?: string,
    isLive = false,
    responseTime?: number
  ): ConsoleMessage => ({
    id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    sender,
    content,
    timestamp: new Date().toISOString(),
    agentName,
    isLoading,
    isLogged,
    logId,
    isLive,
    responseTime
  });

  const logConversationToGovernance = async (
    prompt: string,
    response: string,
    agent: AIAgent,
    isLive = false,
    responseTime?: number
  ): Promise<string | null> => {
    try {
      const governanceEvent = logAIConsoleInteraction({
        projectId,
        phaseStepId,
        agent,
        prompt,
        response,
        promptType,
        triggeredBy: userId,
        isLive,
        responseTime
      });
      
      // Add to governance log via context
      logGovernanceEvent(governanceEvent);
      
      return governanceEvent.id;
    } catch (error) {
      console.error('Failed to log conversation to governance:', error);
      return null;
    }
  };

  const markMessagesAsLogged = (userMessageId: string, aiMessageId: string, logId: string) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id === userMessageId || msg.id === aiMessageId) {
        return { ...msg, isLogged: true, logId };
      }
      return msg;
    }));
  };

  // Mock dispatchers removed - unused legacy code

  const handleSubmit = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = createMessage('user', inputValue.trim());
    const loadingMessage = createMessage(selectedAgent, '', AGENT_CONFIGS[selectedAgent].name, true);
    
    setMessages(prev => [...prev, userMessage, loadingMessage]);
    setInputValue('');
    setIsLoading(true);

    const startTime = Date.now();

    try {
      let response: string;
      let isLive = false;
      
      if (onPrompt) {
        // Use custom prompt handler
        response = await onPrompt(userMessage.content, selectedAgent);
        isLive = false; // Custom handler doesn't guarantee live status
      } else {
        // Use real AI dispatchers
        const dispatchContext = {
          projectId,
          phaseStepId,
          promptType,
          userId
        };
        
        response = await handleAIPrompt(userMessage.content, selectedAgent, dispatchContext);
        isLive = dispatcherStatus[selectedAgent]?.isLive || false;
      }

      const responseTime = Date.now() - startTime;

      // Create response message with performance data
      const responseMessage = createMessage(
        selectedAgent, 
        response, 
        AGENT_CONFIGS[selectedAgent].name,
        false, // isLoading
        false, // isLogged
        undefined, // logId
        isLive,
        responseTime
      );
      
      // Auto-log if enabled
      let logId: string | null = null;
      if (autoLogEnabled) {
        logId = await logConversationToGovernance(
          userMessage.content, 
          response, 
          selectedAgent,
          isLive,
          responseTime
        );
      }

      // Remove loading message and add actual response
      setMessages(prev => {
        const withoutLoading = prev.filter(msg => !msg.isLoading);
        const updatedUserMessage = logId ? { ...userMessage, isLogged: true, logId } : userMessage;
        const updatedResponseMessage = logId ? { ...responseMessage, isLogged: true, logId } : responseMessage;
        return [...withoutLoading.slice(0, -1), updatedUserMessage, updatedResponseMessage];
      });
      
      // Update dispatcher status if needed
      setDispatcherStatus(getDispatcherStatus());
      
    } catch (error) {
      console.error('AI Console error:', error);
      const errorTime = Date.now() - startTime;
      
      setMessages(prev => {
        const withoutLoading = prev.filter(msg => !msg.isLoading);
        const errorMessage = createMessage(
          selectedAgent, 
          'Sorry, there was an error processing your request. Please try again.', 
          AGENT_CONFIGS[selectedAgent].name,
          false, // isLoading
          false, // isLogged
          undefined, // logId
          false, // isLive
          errorTime
        );
        return [...withoutLoading, errorMessage];
      });
    } finally {
      setIsLoading(false);
      textareaRef.current?.focus();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const clearMessages = () => {
    setMessages([]);
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const saveLatestExchangeToLog = async () => {
    const reversedMessages = [...messages].reverse();
    const latestUserMessage = reversedMessages.find(msg => msg.sender === 'user' && !msg.isLogged);
    const latestAIMessage = reversedMessages.find(msg => msg.sender !== 'user' && !msg.isLogged && !msg.isLoading);
    
    if (latestUserMessage && latestAIMessage) {
      const logId = await logConversationToGovernance(
        latestUserMessage.content,
        latestAIMessage.content,
        latestAIMessage.sender as AIAgent,
        latestAIMessage.isLive,
        latestAIMessage.responseTime
      );
      
      if (logId) {
        markMessagesAsLogged(latestUserMessage.id, latestAIMessage.id, logId);
      }
    }
  };

  const saveAllToLog = async () => {
    const exchanges: { user: ConsoleMessage; ai: ConsoleMessage }[] = [];
    
    // Group messages into exchanges
    for (let i = 0; i < messages.length - 1; i++) {
      const current = messages[i];
      const next = messages[i + 1];
      
      if (current.sender === 'user' && next.sender !== 'user' && !next.isLoading && !current.isLogged) {
        exchanges.push({ user: current, ai: next });
      }
    }
    
    // Log each exchange
    for (const exchange of exchanges) {
      const logId = await logConversationToGovernance(
        exchange.user.content,
        exchange.ai.content,
        exchange.ai.sender as AIAgent,
        exchange.ai.isLive,
        exchange.ai.responseTime
      );
      
      if (logId) {
        markMessagesAsLogged(exchange.user.id, exchange.ai.id, logId);
      }
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const renderMessage = (message: ConsoleMessage) => {
    const isUser = message.sender === 'user';
    const agentConfig = !isUser ? AGENT_CONFIGS[message.sender as AIAgent] : null;
    const AgentIcon = agentConfig?.icon;

    if (message.isLoading) {
      return (
        <div key={message.id} className="flex items-start space-x-3 mb-4">
          <div className={`w-8 h-8 rounded-full ${agentConfig?.color} flex items-center justify-center flex-shrink-0`}>
            {AgentIcon && <AgentIcon className="w-4 h-4 text-white" />}
          </div>
          <div className={`flex-1 ${agentConfig?.bgColor} ${agentConfig?.borderColor} border rounded-lg p-3`}>
            <div className="flex items-center space-x-2">
              <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
              <span className="text-sm text-gray-600">{message.agentName} is thinking...</span>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div key={message.id} className={`flex items-start space-x-3 mb-4 ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          isUser ? 'bg-gray-500' : agentConfig?.color
        }`}>
          {isUser ? (
            <span className="text-white text-sm font-medium">U</span>
          ) : (
            AgentIcon && <AgentIcon className="w-4 h-4 text-white" />
          )}
        </div>
        
        <div className={`flex-1 max-w-[80%] ${
          isUser 
            ? 'bg-gray-100 border-gray-200' 
            : `${agentConfig?.bgColor} ${agentConfig?.borderColor}`
        } border rounded-lg p-3 group`}>
          <div className="flex items-center justify-between mb-1">
            <span className={`text-xs font-medium ${
              isUser ? 'text-gray-600' : agentConfig?.textColor
            }`}>
              {isUser ? 'You' : message.agentName}
            </span>
            <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-xs text-gray-500">
                {formatTimestamp(message.timestamp)}
                {message.responseTime && (
                  <span className="ml-1 text-gray-400">({message.responseTime}ms)</span>
                )}
              </span>
              {!isUser && message.isLive !== undefined && (
                <span className={`text-xs font-medium ${message.isLive ? 'text-green-600' : 'text-amber-600'}`} 
                      title={message.isLive ? 'Live API response' : 'Fallback response'}>
                  {message.isLive ? '🟢 Live' : '🟡 Fallback'}
                </span>
              )}
              {message.isLogged && (
                <span className="text-xs text-blue-600 font-medium" title={`Logged to governance (ID: ${message.logId})`}>
                  📝 Logged
                </span>
              )}
              <button
                onClick={() => copyMessage(message.content)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                title="Copy message"
              >
                <Copy className="w-3 h-3" />
              </button>
            </div>
          </div>
          
          <div className="text-sm text-gray-800 whitespace-pre-wrap">
            {message.content}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm flex flex-col ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <Bot className="w-5 h-5 text-gray-600" />
            <h3 className="font-semibold text-gray-900">AI Console</h3>
          </div>
          
          {/* Agent Selector */}
          <div className="relative">
            <button
              onClick={() => setShowAgentDropdown(!showAgentDropdown)}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                AGENT_CONFIGS[selectedAgent].color
              } ${AGENT_CONFIGS[selectedAgent].hoverColor} text-white`}
              disabled={isLoading}
            >
              <div className="flex items-center space-x-1">
                {dispatcherStatus[selectedAgent]?.isLive ? (
                  <Wifi className="w-3 h-3" title="Live API connection" />
                ) : (
                  <WifiOff className="w-3 h-3" title="Fallback mode" />
                )}
                <span>{AGENT_CONFIGS[selectedAgent].name}</span>
              </div>
              <ChevronDown className="w-3 h-3" />
            </button>
            
            {showAgentDropdown && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[120px]">
                {(Object.keys(AGENT_CONFIGS) as AIAgent[]).map((agent) => {
                  const config = AGENT_CONFIGS[agent];
                  const IconComponent = config.icon;
                  
                  return (
                    <button
                      key={agent}
                      onClick={() => {
                        setSelectedAgent(agent);
                        setShowAgentDropdown(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-gray-50 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                        selectedAgent === agent ? 'bg-gray-100 font-medium' : ''
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <IconComponent className={`w-4 h-4 ${config.textColor}`} />
                        <span>{config.name}</span>
                      </div>
                      {dispatcherStatus[agent]?.isLive ? (
                        <Wifi className="w-3 h-3 text-green-500" title="Live" />
                      ) : (
                        <WifiOff className="w-3 h-3 text-gray-400" title="Fallback" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-500">
            {messages.length} messages
          </span>
          
          {/* Governance Logging Controls */}
          {messages.length > 0 && (
            <>
              <button
                onClick={saveLatestExchangeToLog}
                disabled={isLoading}
                className="text-blue-500 hover:text-blue-700 transition-colors disabled:opacity-50"
                title="Save latest exchange to governance log"
              >
                <Save className="w-4 h-4" />
              </button>
              
              <div className="relative">
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  title="Governance settings"
                >
                  <Settings className="w-4 h-4" />
                </button>
                
                {showSettings && (
                  <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[200px] p-3">
                    <div className="space-y-3">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={autoLogEnabled}
                          onChange={(e) => setAutoLogEnabled(e.target.checked)}
                          className="rounded"
                        />
                        <span className="text-sm">Auto-log conversations</span>
                      </label>
                      
                      <button
                        onClick={() => {
                          saveAllToLog();
                          setShowSettings(false);
                        }}
                        disabled={isLoading}
                        className="w-full text-left text-sm text-blue-600 hover:text-blue-800 transition-colors disabled:opacity-50"
                      >
                        Save all to governance log
                      </button>
                      
                      {(projectId || phaseStepId) && (
                        <div className="text-xs text-gray-500 pt-2 border-t">
                          <div>Project: {projectId || 'None'}</div>
                          <div>Phase/Step: {phaseStepId || 'None'}</div>
                          <div>Type: {promptType}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
          
          <button
            onClick={clearMessages}
            disabled={messages.length === 0 || isLoading}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
            title="Clear messages"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className={`flex-1 p-4 overflow-y-auto ${maxHeight} min-h-[200px]`}>
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray-500">
            <div className="text-center">
              <Bot className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">Start a conversation with {AGENT_CONFIGS[selectedAgent].name}</p>
              <p className="text-xs text-gray-400 mt-1">Type a message below to begin</p>
            </div>
          </div>
        ) : (
          <>
            {messages.map(renderMessage)}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex space-x-3">
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            rows={2}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            disabled={isLoading}
          />
          <button
            onClick={handleSubmit}
            disabled={!inputValue.trim() || isLoading}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 ${
              !inputValue.trim() || isLoading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : `${AGENT_CONFIGS[selectedAgent].color} ${AGENT_CONFIGS[selectedAgent].hoverColor} text-white`
            }`}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
        
        <div className="flex items-center justify-between mt-2">
          <div className="text-xs text-gray-500">
            Press Enter to send, Shift+Enter for new line
          </div>
          <div className="flex items-center space-x-2 text-xs text-gray-400">
            <span>Connected to {AGENT_CONFIGS[selectedAgent].name}</span>
            {dispatcherStatus[selectedAgent]?.isLive ? (
              <span className="text-green-600 font-medium">🟢 Live</span>
            ) : (
              <span className="text-amber-600 font-medium">🟡 Fallback</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};