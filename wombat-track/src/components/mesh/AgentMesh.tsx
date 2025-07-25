import React, { useState } from 'react';
import { Network, Plus, Edit, Trash2, Activity, Settings } from 'lucide-react';
import type { Agent, AgentConnection, ExternalService } from '../../types/agent';

interface AgentMeshProps {
  className?: string;
}

// Mock data for demonstration
const mockAgents: Agent[] = [
  {
    id: 'claude-orchestrator',
    name: 'Claude Orchestrator',
    description: 'Main orchestration agent for project management',
    icon: '🤖',
    capabilities: ['orchestration', 'analysis', 'code_generation'],
    currentStatus: 'active',
    version: '1.0.0',
    endpoint: 'https://api.anthropic.com/v1/claude',
    createdAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString()
  },
  {
    id: 'github-agent',
    name: 'GitHub Agent',
    description: 'Manages repository operations and CI/CD workflows',
    icon: '🐙',
    capabilities: ['deployment', 'monitoring'],
    currentStatus: 'active',
    version: '2.1.0',
    createdAt: new Date().toISOString(),
    lastActiveAt: new Date(Date.now() - 5 * 60 * 1000).toISOString()
  },
  {
    id: 'test-runner',
    name: 'Test Runner Agent',
    description: 'Automated testing and quality assurance',
    icon: '🧪',
    capabilities: ['testing', 'analysis'],
    currentStatus: 'idle',
    version: '1.5.2',
    createdAt: new Date().toISOString()
  }
];

const mockConnections: AgentConnection[] = [
  {
    id: 'conn-1',
    source: 'claude-orchestrator',
    target: 'github-agent',
    direction: 'bidirectional',
    accessType: 'direct',
    status: 'connected',
    contextTags: ['deployment', 'orchestration'],
    createdAt: new Date().toISOString()
  },
  {
    id: 'conn-2',
    source: 'github-agent',
    target: 'test-runner',
    direction: 'source_to_target',
    accessType: 'webhook',
    status: 'connected',
    contextTags: ['testing', 'ci-cd'],
    createdAt: new Date().toISOString()
  }
];

const mockServices: ExternalService[] = [
  {
    id: 'anthropic-api',
    name: 'Anthropic API',
    type: 'api',
    status: 'operational',
    docURL: 'https://docs.anthropic.com',
    provider: 'Anthropic',
    region: 'us-west-2',
    createdAt: new Date().toISOString()
  },
  {
    id: 'github-api',
    name: 'GitHub API',
    type: 'api',
    status: 'operational',
    docURL: 'https://docs.github.com/rest',
    provider: 'GitHub',
    createdAt: new Date().toISOString()
  }
];

export const AgentMesh: React.FC<AgentMeshProps> = ({ className = '' }) => {
  const [activeTab, setActiveTab] = useState<'agents' | 'connections' | 'services'>('agents');
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [jsonView, setJsonView] = useState<any>(null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'operational':
      case 'connected':
        return 'text-green-600 bg-green-100';
      case 'idle':
      case 'degraded':
        return 'text-yellow-600 bg-yellow-100';
      case 'error':
      case 'outage':
      case 'disconnected':
        return 'text-red-600 bg-red-100';
      case 'offline':
      case 'maintenance':
      case 'pending':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const handleEditItem = (item: any) => {
    setJsonView(item);
    setEditingItem(item.id);
  };

  const handleSaveJson = () => {
    // In a real implementation, this would save to the backend
    console.log('Saving JSON:', jsonView);
    setEditingItem(null);
    setJsonView(null);
  };

  const renderAgents = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Agents</h3>
        <button className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" />
          Add Agent
        </button>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {mockAgents.map((agent) => (
          <div key={agent.id} className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{agent.icon}</span>
                <div>
                  <h4 className="font-semibold text-gray-900">{agent.name}</h4>
                  <p className="text-sm text-gray-600">{agent.description}</p>
                </div>
              </div>
              <button
                onClick={() => handleEditItem(agent)}
                className="text-gray-400 hover:text-gray-600"
              >
                <Edit className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Status:</span>
                <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(agent.currentStatus)}`}>
                  {agent.currentStatus}
                </span>
              </div>
              
              <div className="flex flex-wrap gap-1">
                {agent.capabilities.map((cap, index) => (
                  <span key={index} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    {cap}
                  </span>
                ))}
              </div>
              
              {agent.lastActiveAt && (
                <div className="text-xs text-gray-500">
                  Last active: {new Date(agent.lastActiveAt).toLocaleTimeString()}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderConnections = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Agent Connections</h3>
        <button className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" />
          Add Connection
        </button>
      </div>
      
      <div className="space-y-3">
        {mockConnections.map((connection) => (
          <div key={connection.id} className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">{connection.source}</span>
                  <span className="text-gray-400">
                    {connection.direction === 'bidirectional' ? '↔' : 
                     connection.direction === 'source_to_target' ? '→' : '←'}
                  </span>
                  <span className="font-medium text-gray-900">{connection.target}</span>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(connection.status)}`}>
                  {connection.status}
                </span>
              </div>
              <button
                onClick={() => handleEditItem(connection)}
                className="text-gray-400 hover:text-gray-600"
              >
                <Edit className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span>Type: {connection.accessType}</span>
              <div className="flex gap-1">
                {connection.contextTags.map((tag, index) => (
                  <span key={index} className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderServices = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">External Services</h3>
        <button className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" />
          Add Service
        </button>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2">
        {mockServices.map((service) => (
          <div key={service.id} className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h4 className="font-semibold text-gray-900">{service.name}</h4>
                <p className="text-sm text-gray-600 capitalize">{service.type} service</p>
                {service.provider && (
                  <p className="text-xs text-gray-500">by {service.provider}</p>
                )}
              </div>
              <button
                onClick={() => handleEditItem(service)}
                className="text-gray-400 hover:text-gray-600"
              >
                <Edit className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex items-center justify-between">
              <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(service.status)}`}>
                {service.status}
              </span>
              {service.docURL && (
                <a 
                  href={service.docURL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  Docs ↗
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <Network className="w-6 h-6 text-blue-600" />
        <div>
          <h2 className="text-xl font-bold text-gray-900">Agent Mesh</h2>
          <p className="text-gray-600">Manage agents, connections, and external services</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'agents', label: 'Agents', icon: Activity },
            { id: 'connections', label: 'Connections', icon: Network },
            { id: 'services', label: 'Services', icon: Settings }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'agents' && renderAgents()}
        {activeTab === 'connections' && renderConnections()}
        {activeTab === 'services' && renderServices()}
      </div>

      {/* JSON Editor Modal */}
      {editingItem && jsonView && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Edit {editingItem}</h3>
              <button
                onClick={() => setEditingItem(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <textarea
              value={JSON.stringify(jsonView, null, 2)}
              onChange={(e) => {
                try {
                  setJsonView(JSON.parse(e.target.value));
                } catch {
                  // Invalid JSON, keep current state
                }
              }}
              className="w-full h-96 p-3 border border-gray-300 rounded-md font-mono text-sm"
            />
            
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setEditingItem(null)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveJson}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};