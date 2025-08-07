import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Save, X, Edit3, FileText, Calendar, User, Target, AlertCircle } from 'lucide-react';

interface Project {
  projectId: string;
  projectName: string;
  owner?: string;
  status?: string;
  description?: string;
  goals?: string;
  scopeNotes?: string;
  RAG?: string;
  startDate?: string;
  endDate?: string;
  priority?: string;
  budget?: number;
  actualCost?: number;
  estimatedHours?: number;
  actualHours?: number;
  completionPercentage?: number;
  risk?: string;
  stakeholders?: string;
  tags?: string;
  category?: string;
  department?: string;
  createdAt?: string;
  updatedAt?: string;
}

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
}

interface Phase {
  phaseid: string;
  phasename: string;
  project_ref: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  RAG?: string;
  notes?: string;
}

interface GovernanceLog {
  id: number;
  timestamp: string;
  event_type: string;
  user_id?: string;
  action?: string;
  success?: boolean;
}

interface StepModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (step: Partial<PhaseStep>) => void;
  phases: Phase[];
  editingStep?: PhaseStep | null;
}

function StepModal({ isOpen, onClose, onSave, phases, editingStep }: StepModalProps) {
  const [formData, setFormData] = useState<Partial<PhaseStep>>({
    stepName: '',
    phaseId: '',
    stepInstruction: '',
    status: 'Planned',
    RAG: 'Green',
    priority: 'Medium',
    isSideQuest: false,
    assignedTo: ''
  });

  useEffect(() => {
    if (editingStep) {
      setFormData(editingStep);
    } else {
      setFormData({
        stepName: '',
        phaseId: phases.length > 0 ? phases[0].phaseid : '',
        stepInstruction: '',
        status: 'Planned',
        RAG: 'Green',
        priority: 'Medium',
        isSideQuest: false,
        assignedTo: ''
      });
    }
  }, [editingStep, phases]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.stepName || !formData.phaseId) return;
    
    onSave({
      ...formData,
      stepId: editingStep?.stepId || `step-${Date.now()}`
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold">
            {editingStep ? 'Edit Step' : 'Add New Step'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={24} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Step Name *
              </label>
              <input
                type="text"
                value={formData.stepName || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, stepName: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phase *
              </label>
              <select
                value={formData.phaseId || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, phaseId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select Phase</option>
                {phases.map(phase => (
                  <option key={phase.phaseid} value={phase.phaseid}>
                    {phase.phasename}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Step Instruction
            </label>
            <textarea
              value={formData.stepInstruction || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, stepInstruction: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={formData.status || 'Planned'}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Planned">Planned</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="Blocked">Blocked</option>
                <option value="On Hold">On Hold</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                RAG
              </label>
              <select
                value={formData.RAG || 'Green'}
                onChange={(e) => setFormData(prev => ({ ...prev, RAG: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Green">Green</option>
                <option value="Amber">Amber</option>
                <option value="Red">Red</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select
                value={formData.priority || 'Medium'}
                onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assigned To
              </label>
              <input
                type="text"
                value={formData.assignedTo || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, assignedTo: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isSideQuest"
                checked={formData.isSideQuest || false}
                onChange={(e) => setFormData(prev => ({ ...prev, isSideQuest: e.target.checked }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="isSideQuest" className="ml-2 text-sm text-gray-700">
                Side Quest
              </label>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {editingStep ? 'Update Step' : 'Create Step'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminProjectEdit() {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [steps, setSteps] = useState<PhaseStep[]>([]);
  const [governanceLogs, setGovernanceLogs] = useState<GovernanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'project' | 'phases' | 'steps' | 'governance'>('project');
  const [showStepModal, setShowStepModal] = useState(false);
  const [editingStep, setEditingStep] = useState<PhaseStep | null>(null);

  useEffect(() => {
    fetchProjectData();
  }, [projectId]);

  const fetchProjectData = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch project details
      const projectResponse = await fetch(`/api/admin/projects/${projectId}`);
      if (!projectResponse.ok) {
        throw new Error(`Failed to fetch project: ${projectResponse.status}`);
      }
      const projectData = await projectResponse.json();
      setProject(projectData.project);
      setPhases(projectData.phases || []);
      setGovernanceLogs(projectData.governanceLogs || []);

      // Fetch project steps
      await fetchProjectSteps();

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load project data');
      console.error('Error fetching project data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectSteps = async () => {
    try {
      const response = await fetch(`/api/admin/live/phase_steps`);
      if (response.ok) {
        const result = await response.json();
        // Filter steps for this project's phases
        const phaseIds = phases.map(p => p.phaseid);
        const projectSteps = result.data?.filter((step: PhaseStep) => 
          phaseIds.includes(step.phaseId)
        ) || [];
        setSteps(projectSteps);
      }
    } catch (err) {
      console.error('Error fetching project steps:', err);
    }
  };

  const handleStepSave = async (stepData: Partial<PhaseStep>) => {
    try {
      const method = editingStep ? 'PATCH' : 'POST';
      const url = editingStep 
        ? `/api/admin/live/phase_steps/${editingStep.stepId}`
        : `/api/admin/live/phase_steps`;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(stepData)
      });

      if (response.ok) {
        await fetchProjectSteps();
        setShowStepModal(false);
        setEditingStep(null);
      } else {
        throw new Error('Failed to save step');
      }
    } catch (err) {
      console.error('Error saving step:', err);
    }
  };

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
      case 'blocked': return 'text-red-600 bg-red-50';
      case 'on hold': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading project...</p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">
          <AlertCircle size={48} className="mx-auto mb-2" />
          <p className="text-lg font-semibold">Error Loading Project</p>
        </div>
        <p className="text-gray-600 mb-4">{error}</p>
        <Link
          to="/admin/projects"
          className="text-blue-600 hover:text-blue-800 font-medium"
        >
          ← Back to Projects
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Link
            to="/admin/projects"
            className="text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft size={24} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Edit Project</h1>
            <p className="text-gray-600">{project.projectName}</p>
          </div>
        </div>
        <div className="text-sm text-gray-500">
          ID: {project.projectId}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('project')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'project'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Target size={16} />
              <span>Project Details</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('phases')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'phases'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Calendar size={16} />
              <span>Phases ({phases.length})</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('steps')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'steps'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Edit3 size={16} />
              <span>Steps ({steps.length})</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('governance')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'governance'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <FileText size={16} />
              <span>Governance ({governanceLogs.length})</span>
            </div>
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'project' && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold mb-4">Project Information</h2>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-gray-700 mb-2">Basic Details</h3>
              <dl className="space-y-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Name</dt>
                  <dd className="text-sm text-gray-900">{project.projectName}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Owner</dt>
                  <dd className="text-sm text-gray-900">{project.owner || 'Not assigned'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Status</dt>
                  <dd className="text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                      {project.status || 'Not Set'}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">RAG</dt>
                  <dd className="text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRagColor(project.RAG)}`}>
                      {project.RAG || 'Not Set'}
                    </span>
                  </dd>
                </div>
              </dl>
            </div>
            <div>
              <h3 className="font-medium text-gray-700 mb-2">Description</h3>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">
                {project.description || 'No description available'}
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'phases' && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Project Phases</h2>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center space-x-2">
              <Plus size={16} />
              <span>Add Phase</span>
            </button>
          </div>
          
          {phases.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phase Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">RAG</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {phases.map((phase) => (
                    <tr key={phase.phaseid} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{phase.phasename}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(phase.status)}`}>
                          {phase.status || 'Planned'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRagColor(phase.RAG)}`}>
                          {phase.RAG || 'Not Set'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <Link to={`/admin/phases/${phase.phaseid}`} className="text-blue-600 hover:text-blue-800 font-medium">
                          View Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 italic">No phases found for this project</p>
          )}
        </div>
      )}

      {activeTab === 'steps' && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Phase Steps</h2>
            <button
              onClick={() => setShowStepModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center space-x-2"
            >
              <Plus size={16} />
              <span>Add Step</span>
            </button>
          </div>
          
          {steps.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Step Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phase</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">RAG</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assigned To</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {steps.map((step) => (
                    <tr key={step.stepId} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">
                        <div>
                          <div className="font-medium text-gray-900">{step.stepName}</div>
                          {step.isSideQuest && (
                            <span className="text-xs text-purple-600 font-medium">Side Quest</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {phases.find(p => p.phaseid === step.phaseId)?.phasename || step.phaseId}
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
                      <td className="px-4 py-3 text-sm text-gray-600">
                        <div className="flex items-center space-x-1">
                          <User size={12} />
                          <span>{step.assignedTo || 'Unassigned'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{step.priority}</td>
                      <td className="px-4 py-3 text-sm">
                        <button
                          onClick={() => {
                            setEditingStep(step);
                            setShowStepModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-800 font-medium mr-3"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 italic">No steps found for this project</p>
          )}
        </div>
      )}

      {activeTab === 'governance' && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold mb-4">Governance Logs</h2>
          
          {governanceLogs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Event Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {governanceLogs.slice(0, 20).map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 cursor-pointer">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{log.event_type}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{log.action || 'No action'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{log.user_id || 'System'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 italic">No governance logs found for this project</p>
          )}
        </div>
      )}

      {/* Step Modal */}
      <StepModal
        isOpen={showStepModal}
        onClose={() => {
          setShowStepModal(false);
          setEditingStep(null);
        }}
        onSave={handleStepSave}
        phases={phases}
        editingStep={editingStep}
      />
    </div>
  );
}