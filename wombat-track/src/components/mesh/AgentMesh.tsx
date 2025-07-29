import React, { useState, useEffect } from 'react';
import { Network, Plus, Edit, Trash2, Activity, Settings, X, Check } from 'lucide-react';
import type { Agent, AgentConnection, ExternalService, AgentCapability, AgentStatus, ConnectionDirection, AccessType, ConnectionStatus, ServiceType, ServiceStatus } from '../../types/agent';

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

const STORAGE_KEY = 'wt-agent-mesh-store';

interface MeshData {
  agents: Agent[];
  connections: AgentConnection[];
  services: ExternalService[];
}

export const AgentMesh: React.FC<AgentMeshProps> = ({ className = '' }) => {
  const [activeTab, setActiveTab] = useState<'agents' | 'connections' | 'services'>('agents');
  const [agents, setAgents] = useState<Agent[]>(mockAgents);
  const [connections, setConnections] = useState<AgentConnection[]>(mockConnections);
  const [services, setServices] = useState<ExternalService[]>(mockServices);
  const [showAddModal, setShowAddModal] = useState<'agent' | 'connection' | 'service' | null>(null);
  const [editingItem, setEditingItem] = useState<{type: 'agent' | 'connection' | 'service', id: string} | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{type: 'agent' | 'connection' | 'service', id: string} | null>(null);

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

  // Load data from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const data: MeshData = JSON.parse(stored);
        setAgents(data.agents || mockAgents);
        setConnections(data.connections || mockConnections);
        setServices(data.services || mockServices);
      } catch (error) {
        console.error('Failed to load stored mesh data:', error);
      }
    }
  }, []);

  // Save data to localStorage whenever state changes
  useEffect(() => {
    const data: MeshData = { agents, connections, services };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [agents, connections, services]);

  const handleEditItem = (type: 'agent' | 'connection' | 'service', id: string) => {
    setEditingItem({ type, id });
  };

  const handleDeleteItem = (type: 'agent' | 'connection' | 'service', id: string) => {
    setDeleteConfirm({ type, id });
  };

  const confirmDelete = () => {
    if (!deleteConfirm) return;
    
    const { type, id } = deleteConfirm;
    
    switch (type) {
      case 'agent':
        setAgents(prev => prev.filter(item => item.id !== id));
        // Also remove connections involving this agent
        setConnections(prev => prev.filter(conn => conn.source !== id && conn.target !== id));
        break;
      case 'connection':
        setConnections(prev => prev.filter(item => item.id !== id));
        break;
      case 'service':
        setServices(prev => prev.filter(item => item.id !== id));
        break;
    }
    
    setDeleteConfirm(null);
  };

  const renderAgents = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          🧠 Agents
        </h3>
        <button 
          onClick={() => setShowAddModal('agent')}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Agent
        </button>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {agents.map((agent) => (
          <div key={agent.id} className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{agent.icon}</span>
                <div>
                  <h4 className="font-semibold text-gray-900">{agent.name}</h4>
                  <p className="text-sm text-gray-600">{agent.description}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEditItem('agent', agent.id)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteItem('agent', agent.id)}
                  className="text-gray-400 hover:text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
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
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          🔗 Agent Connections
        </h3>
        <button 
          onClick={() => setShowAddModal('connection')}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Connection
        </button>
      </div>
      
      <div className="space-y-3">
        {connections.map((connection) => (
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
              <div className="flex gap-2">
                <button
                  onClick={() => handleEditItem('connection', connection.id)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteItem('connection', connection.id)}
                  className="text-gray-400 hover:text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
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
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          📡 External Services
        </h3>
        <button 
          onClick={() => setShowAddModal('service')}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Service
        </button>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2">
        {services.map((service) => (
          <div key={service.id} className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h4 className="font-semibold text-gray-900">{service.name}</h4>
                <p className="text-sm text-gray-600 capitalize">{service.type} service</p>
                {service.provider && (
                  <p className="text-xs text-gray-500">by {service.provider}</p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEditItem('service', service.id)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteItem('service', service.id)}
                  className="text-gray-400 hover:text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
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
              onClick={() => setActiveTab(id as 'agents' | 'connections' | 'services')}
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

      {/* Add/Edit Modals */}
      <AgentModal 
        isOpen={showAddModal === 'agent' || (editingItem?.type === 'agent')}
        onClose={() => {
          setShowAddModal(null);
          setEditingItem(null);
        }}
        onSave={(agent) => {
          if (editingItem?.type === 'agent') {
            setAgents(prev => prev.map(a => a.id === agent.id ? agent : a));
          } else {
            setAgents(prev => [...prev, agent]);
          }
          setShowAddModal(null);
          setEditingItem(null);
        }}
        agent={editingItem?.type === 'agent' ? agents.find(a => a.id === editingItem.id) : undefined}
        agents={agents}
      />

      <ConnectionModal 
        isOpen={showAddModal === 'connection' || (editingItem?.type === 'connection')}
        onClose={() => {
          setShowAddModal(null);
          setEditingItem(null);
        }}
        onSave={(connection) => {
          if (editingItem?.type === 'connection') {
            setConnections(prev => prev.map(c => c.id === connection.id ? connection : c));
          } else {
            setConnections(prev => [...prev, connection]);
          }
          setShowAddModal(null);
          setEditingItem(null);
        }}
        connection={editingItem?.type === 'connection' ? connections.find(c => c.id === editingItem.id) : undefined}
        agents={agents}
      />

      <ServiceModal 
        isOpen={showAddModal === 'service' || (editingItem?.type === 'service')}
        onClose={() => {
          setShowAddModal(null);
          setEditingItem(null);
        }}
        onSave={(service) => {
          if (editingItem?.type === 'service') {
            setServices(prev => prev.map(s => s.id === service.id ? service : s));
          } else {
            setServices(prev => [...prev, service]);
          }
          setShowAddModal(null);
          setEditingItem(null);
        }}
        service={editingItem?.type === 'service' ? services.find(s => s.id === editingItem.id) : undefined}
      />

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Confirm Delete</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this {deleteConfirm.type}? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Modal Components
interface AgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (agent: Agent) => void;
  agent?: Agent;
  agents: Agent[];
}

const AgentModal: React.FC<AgentModalProps> = ({ isOpen, onClose, onSave, agent, agents }) => {
  const [formData, setFormData] = useState<Partial<Agent>>({
    id: '',
    name: '',
    description: '',
    icon: '🤖',
    capabilities: [],
    currentStatus: 'idle',
    version: '1.0.0',
    endpoint: '',
    createdAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString()
  });

  useEffect(() => {
    if (agent) {
      setFormData(agent);
    } else {
      setFormData({
        id: '',
        name: '',
        description: '',
        icon: '🤖',
        capabilities: [],
        currentStatus: 'idle',
        version: '1.0.0',
        endpoint: '',
        createdAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString()
      });
    }
  }, [agent, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.id) return;
    
    // Check for duplicate IDs (except when editing)
    if (!agent && agents.some(a => a.id === formData.id)) {
      alert('Agent ID already exists');
      return;
    }

    onSave(formData as Agent);
  };

  const availableCapabilities: AgentCapability[] = ['code_generation', 'testing', 'deployment', 'monitoring', 'analysis', 'orchestration'];
  const statusOptions: AgentStatus[] = ['active', 'idle', 'error', 'offline', 'maintenance'];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">{agent ? 'Edit Agent' : 'Add New Agent'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ID *</label>
              <input
                type="text"
                value={formData.id}
                onChange={(e) => setFormData(prev => ({ ...prev, id: e.target.value }))}
                className="w-full p-2 border border-gray-300 rounded-md"
                required
                disabled={!!agent}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full p-2 border border-gray-300 rounded-md"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full p-2 border border-gray-300 rounded-md h-20"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Icon</label>
              <input
                type="text"
                value={formData.icon}
                onChange={(e) => setFormData(prev => ({ ...prev, icon: e.target.value }))}
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={formData.currentStatus}
                onChange={(e) => setFormData(prev => ({ ...prev, currentStatus: e.target.value as AgentStatus }))}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                {statusOptions.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Version</label>
              <input
                type="text"
                value={formData.version}
                onChange={(e) => setFormData(prev => ({ ...prev, version: e.target.value }))}
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Endpoint</label>
            <input
              type="url"
              value={formData.endpoint}
              onChange={(e) => setFormData(prev => ({ ...prev, endpoint: e.target.value }))}
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Capabilities</label>
            <div className="grid grid-cols-2 gap-2">
              {availableCapabilities.map(capability => (
                <label key={capability} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.capabilities?.includes(capability)}
                    onChange={(e) => {
                      const caps = formData.capabilities || [];
                      if (e.target.checked) {
                        setFormData(prev => ({ ...prev, capabilities: [...caps, capability] }));
                      } else {
                        setFormData(prev => ({ ...prev, capabilities: caps.filter(c => c !== capability) }));
                      }
                    }}
                    className="mr-2"
                  />
                  <span className="text-sm">{capability}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              {agent ? 'Update' : 'Create'} Agent
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface ConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (connection: AgentConnection) => void;
  connection?: AgentConnection;
  agents: Agent[];
}

const ConnectionModal: React.FC<ConnectionModalProps> = ({ isOpen, onClose, onSave, connection, agents }) => {
  const [formData, setFormData] = useState<Partial<AgentConnection>>({
    id: '',
    source: '',
    target: '',
    direction: 'bidirectional',
    accessType: 'direct',
    status: 'pending',
    contextTags: [],
    createdAt: new Date().toISOString()
  });

  useEffect(() => {
    if (connection) {
      setFormData(connection);
    } else {
      setFormData({
        id: '',
        source: '',
        target: '',
        direction: 'bidirectional',
        accessType: 'direct',
        status: 'pending',
        contextTags: [],
        createdAt: new Date().toISOString()
      });
    }
  }, [connection, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.id || !formData.source || !formData.target) return;
    
    onSave(formData as AgentConnection);
  };

  const directionOptions: ConnectionDirection[] = ['bidirectional', 'source_to_target', 'target_to_source'];
  const accessOptions: AccessType[] = ['direct', 'proxy', 'gateway', 'webhook'];
  const statusOptions: ConnectionStatus[] = ['connected', 'disconnected', 'pending', 'error'];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">{connection ? 'Edit Connection' : 'Add New Connection'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Connection ID *</label>
            <input
              type="text"
              value={formData.id}
              onChange={(e) => setFormData(prev => ({ ...prev, id: e.target.value }))}
              className="w-full p-2 border border-gray-300 rounded-md"
              required
              disabled={!!connection}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Source Agent *</label>
              <select
                value={formData.source}
                onChange={(e) => setFormData(prev => ({ ...prev, source: e.target.value }))}
                className="w-full p-2 border border-gray-300 rounded-md"
                required
              >
                <option value="">Select source agent</option>
                {agents.map(agent => (
                  <option key={agent.id} value={agent.id}>{agent.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target Agent *</label>
              <select
                value={formData.target}
                onChange={(e) => setFormData(prev => ({ ...prev, target: e.target.value }))}
                className="w-full p-2 border border-gray-300 rounded-md"
                required
              >
                <option value="">Select target agent</option>
                {agents.map(agent => (
                  <option key={agent.id} value={agent.id}>{agent.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Direction</label>
              <select
                value={formData.direction}
                onChange={(e) => setFormData(prev => ({ ...prev, direction: e.target.value as ConnectionDirection }))}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                {directionOptions.map(dir => (
                  <option key={dir} value={dir}>{dir.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Access Type</label>
              <select
                value={formData.accessType}
                onChange={(e) => setFormData(prev => ({ ...prev, accessType: e.target.value as AccessType }))}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                {accessOptions.map(access => (
                  <option key={access} value={access}>{access}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as ConnectionStatus }))}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                {statusOptions.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Context Tags (comma-separated)</label>
            <input
              type="text"
              value={formData.contextTags?.join(', ')}
              onChange={(e) => setFormData(prev => ({ ...prev, contextTags: e.target.value.split(',').map(t => t.trim()).filter(t => t) }))}
              className="w-full p-2 border border-gray-300 rounded-md"
              placeholder="deployment, testing, monitoring"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              {connection ? 'Update' : 'Create'} Connection
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface ServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (service: ExternalService) => void;
  service?: ExternalService;
}

const ServiceModal: React.FC<ServiceModalProps> = ({ isOpen, onClose, onSave, service }) => {
  const [formData, setFormData] = useState<Partial<ExternalService>>({
    id: '',
    name: '',
    type: 'api',
    status: 'operational',
    docURL: '',
    healthEndpoint: '',
    version: '',
    provider: '',
    region: '',
    createdAt: new Date().toISOString()
  });

  useEffect(() => {
    if (service) {
      setFormData(service);
    } else {
      setFormData({
        id: '',
        name: '',
        type: 'api',
        status: 'operational',
        docURL: '',
        healthEndpoint: '',
        version: '',
        provider: '',
        region: '',
        createdAt: new Date().toISOString()
      });
    }
  }, [service, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.id || !formData.name) return;
    
    onSave(formData as ExternalService);
  };

  const typeOptions: ServiceType[] = ['api', 'database', 'storage', 'messaging', 'monitoring', 'auth', 'cdn', 'compute'];
  const statusOptions: ServiceStatus[] = ['operational', 'degraded', 'outage', 'maintenance', 'unknown'];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">{service ? 'Edit Service' : 'Add New Service'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Service ID *</label>
              <input
                type="text"
                value={formData.id}
                onChange={(e) => setFormData(prev => ({ ...prev, id: e.target.value }))}
                className="w-full p-2 border border-gray-300 rounded-md"
                required
                disabled={!!service}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Service Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full p-2 border border-gray-300 rounded-md"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Service Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as ServiceType }))}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                {typeOptions.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as ServiceStatus }))}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                {statusOptions.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
              <input
                type="text"
                value={formData.provider}
                onChange={(e) => setFormData(prev => ({ ...prev, provider: e.target.value }))}
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
              <input
                type="text"
                value={formData.region}
                onChange={(e) => setFormData(prev => ({ ...prev, region: e.target.value }))}
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Documentation URL</label>
            <input
              type="url"
              value={formData.docURL}
              onChange={(e) => setFormData(prev => ({ ...prev, docURL: e.target.value }))}
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Health Endpoint</label>
              <input
                type="url"
                value={formData.healthEndpoint}
                onChange={(e) => setFormData(prev => ({ ...prev, healthEndpoint: e.target.value }))}
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Version</label>
              <input
                type="text"
                value={formData.version}
                onChange={(e) => setFormData(prev => ({ ...prev, version: e.target.value }))}
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              {service ? 'Update' : 'Create'} Service
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};