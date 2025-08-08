import React, { useState, useEffect } from 'react';
import { Bot, MessageSquare, Activity, AlertCircle, CheckCircle } from 'lucide-react';
import type { AgentCommunicationRequest } from '../../services/agentCommunicationServiceBrowser';
import { AgentCommunicationService } from '../../services/agentCommunicationServiceBrowser';
import ZoiChatIntegration from '../../services/zoiChatIntegrationBrowser';
import ZoiAIService from '../../services/zoiAIService';

interface Agent {
  id: string;
  label: string;
  permissions: string[];
  type: string;
  status: string;
  capabilities?: string[];
}

interface AgentSelectorProps {
  onAgentSelect?: (agentId: string) => void;
  showCommunicationPanel?: boolean;
}

export const AgentSelector: React.FC<AgentSelectorProps> = ({ 
  onAgentSelect,
  showCommunicationPanel = true 
}) => {
  const [availableAgents, setAvailableAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>('claude');
  const [communicationEnabled, setCommunicationEnabled] = useState(false);
  const [message, setMessage] = useState('');
  const [context, setContext] = useState('');
  const [communicationChannel, setCommunicationChannel] = useState<'chat-ui' | 'governance-log' | 'github-actions'>('chat-ui');
  const [lastResponse, setLastResponse] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{id: string, message: string, sender: 'user' | 'zoi', timestamp: string}>>([]);

  const communicationService = AgentCommunicationService.getInstance();
  const zoiChat = ZoiChatIntegration.getInstance();
  const zoiAI = ZoiAIService.getInstance();

  useEffect(() => {
    // Load available agents asynchronously
    const loadAgents = async () => {
      try {
        const agents = await communicationService.getAvailableAgents();
        setAvailableAgents(agents);
      } catch (error) {
        console.warn('Failed to load agents:', error);
        setAvailableAgents([]);
      }
    };
    
    loadAgents();
    
    // Check if agent communication is enabled
    const enabled = communicationService.isAgentCommunicationEnabled();
    setCommunicationEnabled(enabled);

    // Set up Zoi chat response monitoring
    if (enabled) {
      zoiChat.onZoiResponse((response) => {
        setChatMessages(prev => [...prev, {
          id: response.requestId,
          message: response.message,
          sender: 'zoi',
          timestamp: response.timestamp
        }]);
        
        // Update last response for status display
        setLastResponse({
          success: true,
          message: response.message,
          agentId: 'zoi',
          responseChannel: 'chat-ui',
          responseId: response.requestId
        });
      });
    }
  }, []);

  const handleAgentSelect = (agentId: string) => {
    setSelectedAgent(agentId);
    if (onAgentSelect) {
      onAgentSelect(agentId);
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !selectedAgent) return;

    setIsLoading(true);
    setLastResponse(null);

    // Add user message to chat
    const userMessage = {
      id: `user-${Date.now()}`,
      message: message.trim(),
      sender: 'user' as const,
      timestamp: new Date().toISOString()
    };
    setChatMessages(prev => [...prev, userMessage]);

    try {
      if (selectedAgent === 'zoi' && communicationChannel === 'chat-ui') {
        // Use direct AI model integration for natural language conversation
        const zoiResponse = await zoiAI.sendMessage(message.trim(), context.trim());
        
        // Add Zoi's AI response to chat
        setChatMessages(prev => [...prev, {
          id: `zoi-ai-${Date.now()}`,
          message: zoiResponse.message,
          sender: 'zoi',
          timestamp: new Date().toISOString()
        }]);
        
        // Show response metadata
        setLastResponse({
          success: true,
          message: `Response generated (${zoiResponse.responseTime}ms, ${zoiResponse.tokensUsed} tokens)`,
          agentId: 'zoi',
          responseChannel: 'chat-ui',
          responseId: `zoi-ai-${Date.now()}`,
          metadata: {
            confidence: zoiResponse.confidence,
            canExecuteCode: zoiResponse.canExecuteCode,
            suggestedActions: zoiResponse.suggestedActions
          }
        });
        
      } else {
        // Use regular communication service for other agents/channels
        const request: AgentCommunicationRequest = {
          targetAgent: selectedAgent,
          message: message.trim(),
          context: context.trim() || undefined,
          channel: communicationChannel,
          requestId: `ui-${Date.now()}`
        };

        const response = await communicationService.sendToAgent(request);
        setLastResponse(response);
      }
      
      setMessage('');
      setContext('');
      
    } catch (error) {
      setLastResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        agentId: selectedAgent,
        responseChannel: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getAgentIcon = (agent: Agent) => {
    if (agent.type === 'autonomous') {
      return <Bot className="w-5 h-5 text-purple-600" />;
    }
    return <MessageSquare className="w-5 h-5 text-blue-600" />;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'offline':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Activity className="w-4 h-4 text-yellow-500" />;
    }
  };

  if (!communicationEnabled) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-yellow-600" />
          <span className="text-yellow-800 font-medium">Agent Communication Disabled</span>
        </div>
        <p className="text-yellow-700 text-sm mt-1">
          Agent injection is not enabled in the current configuration.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Agent Selection Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center space-x-2 mb-2">
          <Bot className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Agent Communication</h3>
        </div>
        <p className="text-sm text-gray-600">
          Select an agent to communicate with directly
        </p>
      </div>

      {/* Agent List */}
      <div className="p-4 space-y-2">
        {availableAgents.map((agent) => (
          <button
            key={agent.id}
            onClick={() => handleAgentSelect(agent.id)}
            className={`w-full text-left p-3 rounded-lg border transition-colors ${
              selectedAgent === agent.id
                ? 'border-blue-300 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {getAgentIcon(agent)}
                <div>
                  <div className="font-medium text-gray-900">{agent.label}</div>
                  <div className="text-xs text-gray-500">
                    {agent.permissions && agent.permissions.length > 0 ? (
                      <>
                        {agent.permissions.slice(0, 3).join(', ')}
                        {agent.permissions.length > 3 && ` +${agent.permissions.length - 3} more`}
                      </>
                    ) : (
                      'No permissions configured'
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {getStatusIcon(agent.status)}
                <span className="text-xs text-gray-500 capitalize">{agent.status}</span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Communication Panel */}
      {showCommunicationPanel && selectedAgent && (
        <div className="border-t border-gray-200 p-4">
          <div className="space-y-4">
            {/* Channel Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Communication Channel
              </label>
              <select
                value={communicationChannel}
                onChange={(e) => setCommunicationChannel(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="chat-ui">Chat UI (Memory Plugin)</option>
                <option value="governance-log">Governance Log</option>
                <option value="github-actions">GitHub Actions</option>
              </select>
            </div>

            {/* Message Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter your message to the agent..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
              />
            </div>

            {/* Context Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Context (Optional)
              </label>
              <input
                type="text"
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="Additional context for the message..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Send Button */}
            <button
              onClick={handleSendMessage}
              disabled={!message.trim() || isLoading}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <>
                  <Activity className="w-4 h-4 animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <MessageSquare className="w-4 h-4" />
                  <span>Send to {availableAgents.find(a => a.id === selectedAgent)?.label}</span>
                </>
              )}
            </button>
          </div>

          {/* Chat History for Zoi */}
          {selectedAgent === 'zoi' && communicationChannel === 'chat-ui' && chatMessages.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Chat with Zoi</h4>
              <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-3 space-y-2">
                {chatMessages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                      msg.sender === 'user' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-100 text-gray-900'
                    }`}>
                      <p>{msg.message}</p>
                      <p className={`text-xs mt-1 ${
                        msg.sender === 'user' ? 'text-blue-200' : 'text-gray-500'
                      }`}>
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Response Display */}
          {lastResponse && (
            <div className={`mt-4 p-3 rounded-lg ${
              lastResponse.success 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-red-50 border border-red-200'
            }`}>
              <div className="flex items-center space-x-2 mb-2">
                {lastResponse.success ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600" />
                )}
                <span className={`font-medium text-sm ${
                  lastResponse.success ? 'text-green-800' : 'text-red-800'
                }`}>
                  {lastResponse.success ? 'Message Sent' : 'Send Failed'}
                </span>
              </div>
              <p className={`text-sm ${
                lastResponse.success ? 'text-green-700' : 'text-red-700'
              }`}>
                {lastResponse.message || lastResponse.error}
              </p>
              {lastResponse.responseId && (
                <p className="text-xs text-gray-500 mt-1">
                  Request ID: {lastResponse.responseId}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AgentSelector;