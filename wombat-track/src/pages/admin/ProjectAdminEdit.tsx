import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Save, Edit3, Plus, Trash2, Link as LinkIcon, FileText, Clock, Shield, RefreshCw, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

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
  isDraft?: number;
  draftEditedBy?: string;
  draftEditedAt?: string;
  createdAt?: string;
  updatedAt?: string;
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
  estimatedDuration?: number;
  actualDuration?: number;
  createdAt?: string;
  updatedAt?: string;
}

interface GovernanceLog {
  id: number;
  timestamp: string;
  event_type: string;
  user_id?: string;
  user_role?: string;
  resource_type?: string;
  resource_id?: string;
  action?: string;
  success?: boolean;
  details?: unknown;
  runtime_context?: unknown;
}

interface Document {
  id: string;
  name: string;
  type: string;
  url?: string;
  uploadedAt?: string;
  uploadedBy?: string;
}

export default function ProjectAdminEdit() {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [editedProject, setEditedProject] = useState<Partial<Project>>({});
  const [phases, setPhases] = useState<Phase[]>([]);
  const [governanceLogs, setGovernanceLogs] = useState<GovernanceLog[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'phases' | 'governance' | 'documents'>('details');

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
      setEditedProject(projectData.project);
      setPhases(projectData.phases || []);
      setGovernanceLogs(projectData.governanceLogs || []);
      
      // TODO: Fetch documents when API is ready
      setDocuments([
        { id: '1', name: 'Project Charter.pdf', type: 'pdf', uploadedAt: '2025-01-15', uploadedBy: 'admin' },
        { id: '2', name: 'Requirements.docx', type: 'docx', uploadedAt: '2025-01-20', uploadedBy: 'admin' }
      ]);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load project data');
      console.error('Error fetching project data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (field: keyof Project, value: unknown) => {
    setEditedProject(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    if (!project) return;
    
    try {
      setSaving(true);
      setError('');

      // Save as draft first
      const draftResponse = await fetch(`/api/admin/edit/projects/${project.projectId}/draft`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': 'admin'
        },
        body: JSON.stringify(editedProject)
      });

      if (!draftResponse.ok) {
        throw new Error('Failed to save draft');
      }

      // Optionally commit immediately
      const shouldCommit = window.confirm('Save as draft or commit to database?\n\nOK = Commit\nCancel = Keep as draft');
      
      if (shouldCommit) {
        const commitResponse = await fetch(`/api/admin/edit/projects/${project.projectId}/commit`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-ID': 'admin'
          },
          body: JSON.stringify({ commitMessage: 'Admin project update' })
        });

        if (!commitResponse.ok) {
          throw new Error('Failed to commit changes');
        }
      }

      // Refresh data
      await fetchProjectData();
      setEditMode(false);
      alert(shouldCommit ? 'Changes committed successfully!' : 'Changes saved as draft!');
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
      console.error('Error saving project:', err);
    } finally {
      setSaving(false);
    }
  };

  const getRagBadge = (rag?: string) => {
    const colors = {
      red: 'bg-red-100 text-red-800 border-red-200',
      amber: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      green: 'bg-green-100 text-green-800 border-green-200'
    };
    return colors[rag?.toLowerCase() as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getStatusBadge = (status?: string) => {
    const colors = {
      completed: 'bg-green-100 text-green-800',
      active: 'bg-blue-100 text-blue-800',
      planning: 'bg-purple-100 text-purple-800',
      'on hold': 'bg-yellow-100 text-yellow-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colors[status?.toLowerCase() as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading project data...</p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="h-6 w-6 text-red-600" />
            <div>
              <h3 className="text-lg font-semibold text-red-900">Error Loading Project</h3>
              <p className="text-red-700">{error || 'Project not found'}</p>
            </div>
          </div>
          <Link to="/orbis/admin/data-explorer" className="mt-4 inline-block text-red-600 hover:text-red-800">
            ← Back to Data Explorer
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <Link to="/orbis/admin/data-explorer" className="text-gray-600 hover:text-gray-900">
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{project.projectName}</h1>
              <p className="text-gray-600">Project ID: {project.projectId}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {project.isDraft === 1 && (
              <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm font-medium">
                Has Draft Changes
              </span>
            )}
            {!editMode ? (
              <button
                onClick={() => setEditMode(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Edit3 size={16} />
                <span>Edit Project</span>
              </button>
            ) : (
              <>
                <button
                  onClick={() => {
                    setEditMode(false);
                    setEditedProject(project);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {saving ? (
                    <RefreshCw size={16} className="animate-spin" />
                  ) : (
                    <Save size={16} />
                  )}
                  <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {(['details', 'phases', 'governance', 'documents'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-2 px-1 border-b-2 font-medium text-sm capitalize ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab === 'phases' && `${tab} (${phases.length})`}
                {tab === 'governance' && `Governance Logs (${governanceLogs.length})`}
                {tab === 'documents' && `${tab} (${documents.length})`}
                {tab === 'details' && tab}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'details' && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold mb-6">Project Details</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900 border-b pb-2">Basic Information</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
                <input
                  type="text"
                  value={editMode ? editedProject.projectName || '' : project.projectName}
                  onChange={(e) => handleFieldChange('projectName', e.target.value)}
                  disabled={!editMode}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Owner</label>
                <input
                  type="text"
                  value={editMode ? editedProject.owner || '' : project.owner || ''}
                  onChange={(e) => handleFieldChange('owner', e.target.value)}
                  disabled={!editMode}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={editMode ? editedProject.status || '' : project.status || ''}
                    onChange={(e) => handleFieldChange('status', e.target.value)}
                    disabled={!editMode}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                  >
                    <option value="">Select...</option>
                    <option value="Planning">Planning</option>
                    <option value="Active">Active</option>
                    <option value="Completed">Completed</option>
                    <option value="On Hold">On Hold</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">RAG Status</label>
                  <select
                    value={editMode ? editedProject.RAG || '' : project.RAG || ''}
                    onChange={(e) => handleFieldChange('RAG', e.target.value)}
                    disabled={!editMode}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                  >
                    <option value="">Select...</option>
                    <option value="Green">Green</option>
                    <option value="Amber">Amber</option>
                    <option value="Red">Red</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select
                  value={editMode ? editedProject.priority || '' : project.priority || ''}
                  onChange={(e) => handleFieldChange('priority', e.target.value)}
                  disabled={!editMode}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                >
                  <option value="">Select...</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                <input
                  type="text"
                  value={editMode ? editedProject.department || '' : project.department || ''}
                  onChange={(e) => handleFieldChange('department', e.target.value)}
                  disabled={!editMode}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <input
                  type="text"
                  value={editMode ? editedProject.category || '' : project.category || ''}
                  onChange={(e) => handleFieldChange('category', e.target.value)}
                  disabled={!editMode}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                />
              </div>
            </div>

            {/* Timeline & Budget */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900 border-b pb-2">Timeline & Budget</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={editMode ? editedProject.startDate || '' : project.startDate || ''}
                    onChange={(e) => handleFieldChange('startDate', e.target.value)}
                    disabled={!editMode}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={editMode ? editedProject.endDate || '' : project.endDate || ''}
                    onChange={(e) => handleFieldChange('endDate', e.target.value)}
                    disabled={!editMode}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Budget</label>
                  <input
                    type="number"
                    value={editMode ? editedProject.budget || '' : project.budget || ''}
                    onChange={(e) => handleFieldChange('budget', parseFloat(e.target.value))}
                    disabled={!editMode}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Actual Cost</label>
                  <input
                    type="number"
                    value={editMode ? editedProject.actualCost || '' : project.actualCost || ''}
                    onChange={(e) => handleFieldChange('actualCost', parseFloat(e.target.value))}
                    disabled={!editMode}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Hours</label>
                  <input
                    type="number"
                    value={editMode ? editedProject.estimatedHours || '' : project.estimatedHours || ''}
                    onChange={(e) => handleFieldChange('estimatedHours', parseInt(e.target.value))}
                    disabled={!editMode}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Actual Hours</label>
                  <input
                    type="number"
                    value={editMode ? editedProject.actualHours || '' : project.actualHours || ''}
                    onChange={(e) => handleFieldChange('actualHours', parseInt(e.target.value))}
                    disabled={!editMode}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Completion %</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={editMode ? editedProject.completionPercentage || '' : project.completionPercentage || ''}
                  onChange={(e) => handleFieldChange('completionPercentage', parseInt(e.target.value))}
                  disabled={!editMode}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Risk Level</label>
                <input
                  type="text"
                  value={editMode ? editedProject.risk || '' : project.risk || ''}
                  onChange={(e) => handleFieldChange('risk', e.target.value)}
                  disabled={!editMode}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                <input
                  type="text"
                  value={editMode ? editedProject.tags || '' : project.tags || ''}
                  onChange={(e) => handleFieldChange('tags', e.target.value)}
                  disabled={!editMode}
                  placeholder="Comma-separated tags"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                />
              </div>
            </div>
          </div>

          {/* Full-width fields */}
          <div className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                rows={3}
                value={editMode ? editedProject.description || '' : project.description || ''}
                onChange={(e) => handleFieldChange('description', e.target.value)}
                disabled={!editMode}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Goals</label>
              <textarea
                rows={3}
                value={editMode ? editedProject.goals || '' : project.goals || ''}
                onChange={(e) => handleFieldChange('goals', e.target.value)}
                disabled={!editMode}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Scope Notes</label>
              <textarea
                rows={3}
                value={editMode ? editedProject.scopeNotes || '' : project.scopeNotes || ''}
                onChange={(e) => handleFieldChange('scopeNotes', e.target.value)}
                disabled={!editMode}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stakeholders</label>
              <textarea
                rows={2}
                value={editMode ? editedProject.stakeholders || '' : project.stakeholders || ''}
                onChange={(e) => handleFieldChange('stakeholders', e.target.value)}
                disabled={!editMode}
                placeholder="List of stakeholders"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
              />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'phases' && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Project Phases</h2>
            <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Plus size={16} />
              <span>Add Phase</span>
            </button>
          </div>

          {phases.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Clock size={48} className="mx-auto mb-3 text-gray-300" />
              <p>No phases linked to this project yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {phases.map((phase) => (
                <div key={phase.phaseid} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <Link
                        to={`/orbis/admin/phases/${phase.phaseid}`}
                        className="text-lg font-medium text-blue-600 hover:text-blue-800 flex items-center space-x-2"
                      >
                        <span>{phase.phasename}</span>
                        <LinkIcon size={14} />
                      </Link>
                      <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                        <span>Status: <span className={`font-medium ${getStatusBadge(phase.status)} px-2 py-1 rounded`}>{phase.status || 'Not set'}</span></span>
                        <span>RAG: <span className={`font-medium ${getRagBadge(phase.RAG)} px-2 py-1 rounded border`}>{phase.RAG || 'Not set'}</span></span>
                        {phase.estimatedDuration && (
                          <span>Duration: {phase.estimatedDuration} days</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button className="p-2 text-gray-600 hover:text-gray-900">
                        <Edit3 size={16} />
                      </button>
                      <button className="p-2 text-red-600 hover:text-red-800">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'governance' && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold mb-6">Governance Logs</h2>
          
          {governanceLogs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Shield size={48} className="mx-auto mb-3 text-gray-300" />
              <p>No governance logs for this project yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {governanceLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{log.event_type}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{log.user_id || 'system'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{log.action}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {log.success ? (
                          <CheckCircle size={16} className="text-green-600" />
                        ) : (
                          <XCircle size={16} className="text-red-600" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Project Documents</h2>
            <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Plus size={16} />
              <span>Upload Document</span>
            </button>
          </div>

          {documents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText size={48} className="mx-auto mb-3 text-gray-300" />
              <p>No documents uploaded yet.</p>
              <p className="text-sm mt-2">Upload project-related documents for easy access.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {documents.map((doc) => (
                <div key={doc.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <FileText size={20} className="text-gray-600" />
                        <h3 className="font-medium text-gray-900">{doc.name}</h3>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        Uploaded {doc.uploadedAt} by {doc.uploadedBy}
                      </p>
                    </div>
                    <button className="p-1 text-red-600 hover:text-red-800">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}