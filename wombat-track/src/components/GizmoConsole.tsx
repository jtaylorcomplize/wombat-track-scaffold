import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, Zap, Loader2, RotateCcw, Copy, ChevronDown } from 'lucide-react';

export type AIAgent = 'claude' | 'gizmo';

export interface ConsoleMessage {
  id: string;
  sender: 'user' | AIAgent;
  content: string;
  timestamp: string;
  agentName?: string;
  isLoading?: boolean;
}

export interface GizmoConsoleProps {
  className?: string;
  onPrompt?: (prompt: string, agent: AIAgent, context?: any) => Promise<string>;
  initialAgent?: AIAgent;
  placeholder?: string;
  maxHeight?: string;
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
  maxHeight = 'max-h-96'
}) => {
  const [messages, setMessages] = useState<ConsoleMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<AIAgent>(initialAgent);
  const [isLoading, setIsLoading] = useState(false);
  const [showAgentDropdown, setShowAgentDropdown] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
    isLoading = false
  ): ConsoleMessage => ({
    id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    sender,
    content,
    timestamp: new Date().toISOString(),
    agentName,
    isLoading
  });

  const mockClaudeDispatcher = async (prompt: string): Promise<string> => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    // Mock Claude-like responses
    const responses = [
      `I understand you're asking about: "${prompt.slice(0, 50)}${prompt.length > 50 ? '...' : ''}"\n\nHere's my analysis and recommendations for your Wombat Track project:`,
      `Based on your input, I can help you with this task. Let me break this down:`,
      `I'd be happy to assist with that. Here's what I recommend:`,
      `That's an interesting question about your project. Let me provide some insights:`
    ];
    
    const baseResponse = responses[Math.floor(Math.random() * responses.length)];
    const details = [
      '\n\n• This aligns well with your current Phase 3 MetaProject Activation',
      '\n• Consider the integration with your AgentMesh architecture',
      '\n• This could enhance your governance logging capabilities',
      '\n• I recommend documenting this in your project metadata'
    ];
    
    return baseResponse + details.slice(0, Math.floor(Math.random() * 3) + 1).join('');
  };

  const mockGizmoDispatcher = async (prompt: string): Promise<string> => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1500));
    
    return `🔧 Gizmo Analysis:\n\nPrompt processed: "${prompt}"\n\n⚡ Quick Actions Available:\n• Code scaffolding\n• Template generation\n• Workflow automation\n\n🔮 This integration is coming soon in Phase WT-5.4!`;
  };

  const handleSubmit = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = createMessage('user', inputValue.trim());
    const loadingMessage = createMessage(selectedAgent, '', AGENT_CONFIGS[selectedAgent].name, true);
    
    setMessages(prev => [...prev, userMessage, loadingMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      let response: string;
      
      if (onPrompt) {
        response = await onPrompt(userMessage.content, selectedAgent);
      } else {
        // Use mock dispatchers
        response = selectedAgent === 'claude' 
          ? await mockClaudeDispatcher(userMessage.content)
          : await mockGizmoDispatcher(userMessage.content);
      }

      // Remove loading message and add actual response
      setMessages(prev => {
        const withoutLoading = prev.filter(msg => !msg.isLoading);
        const responseMessage = createMessage(selectedAgent, response, AGENT_CONFIGS[selectedAgent].name);
        return [...withoutLoading, responseMessage];
      });
    } catch (error) {
      console.error('AI Console error:', error);
      setMessages(prev => {
        const withoutLoading = prev.filter(msg => !msg.isLoading);
        const errorMessage = createMessage(selectedAgent, 'Sorry, there was an error processing your request. Please try again.', AGENT_CONFIGS[selectedAgent].name);
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
              </span>
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
              <span>{AGENT_CONFIGS[selectedAgent].name}</span>
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
                      className={`w-full flex items-center space-x-2 px-3 py-2 text-sm hover:bg-gray-50 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                        selectedAgent === agent ? 'bg-gray-100 font-medium' : ''
                      }`}
                    >
                      <IconComponent className={`w-4 h-4 ${config.textColor}`} />
                      <span>{config.name}</span>
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
          <div className="text-xs text-gray-400">
            Connected to {AGENT_CONFIGS[selectedAgent].name}
          </div>
        </div>
      </div>
    </div>
  );
};