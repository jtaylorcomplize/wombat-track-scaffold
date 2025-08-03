import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, AlertCircle, CheckCircle, Clock, FileText, FolderOpen } from 'lucide-react';

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
  details?: any;
  runtime_context?: any;
}

export default function AdminProjectView() {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [governanceLogs, setGovernanceLogs] = useState<GovernanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

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

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load project data');
      console.error('Error fetching project data:', err);
    } finally {
      setLoading(false);
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
      case 'planning': return 'text-purple-600 bg-purple-50';
      case 'on hold': return 'text-yellow-600 bg-yellow-50';
      case 'cancelled': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Loading project data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-600 flex items-center space-x-2">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Project not found</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Navigation */}
      <div className="mb-6">
        <Link to="/admin" className="text-blue-600 hover:text-blue-800 flex items-center space-x-2">
          <ArrowLeft size={20} />
          <span>Back to Admin Dashboard</span>
        </Link>
      </div>

      {/* Project Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{project.projectName}</h1>
            <p className="text-gray-600 mt-1">Project ID: {project.projectId}</p>
          </div>
          <div className="flex space-x-2">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(project.status)}`}>
              {project.status || 'Unknown'}
            </span>
            {project.RAG && (
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRagColor(project.RAG)}`}>
                RAG: {project.RAG}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Owner:</span>
            <span className="ml-2 font-medium">{project.owner || 'Unassigned'}</span>
          </div>
          <div>
            <span className="text-gray-500">Priority:</span>
            <span className="ml-2 font-medium">{project.priority || 'Normal'}</span>
          </div>
          <div>
            <span className="text-gray-500">Risk:</span>
            <span className="ml-2 font-medium">{project.risk || 'Medium'}</span>
          </div>
          <div>
            <span className="text-gray-500">Updated:</span>
            <span className="ml-2 font-medium">
              {project.updatedAt ? new Date(project.updatedAt).toLocaleDateString() : 'Unknown'}
            </span>
          </div>
        </div>
      </div>

      {/* Context Panel */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Project Context</h2>
        
        <div className="space-y-4">
          {project.goals && (
            <div>
              <h3 className="font-medium text-gray-700 mb-1">Goals</h3>
              <p className="text-gray-600 whitespace-pre-wrap">{project.goals}</p>
            </div>
          )}
          
          {project.description && (
            <div>
              <h3 className="font-medium text-gray-700 mb-1">Description</h3>
              <p className="text-gray-600 whitespace-pre-wrap">{project.description}</p>
            </div>
          )}
          
          {project.scopeNotes && (
            <div>
              <h3 className="font-medium text-gray-700 mb-1">Scope Notes</h3>
              <p className="text-gray-600 whitespace-pre-wrap">{project.scopeNotes}</p>
            </div>
          )}

          {!project.goals && !project.description && !project.scopeNotes && (
            <p className="text-gray-500 italic">No context information available</p>
          )}
        </div>
      </div>

      {/* Phases Table */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center space-x-2">
          <FolderOpen size={20} />
          <span>Project Phases ({phases.length})</span>
        </h2>

        {phases.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phase Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phase ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    RAG
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Start Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    End Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {phases.map((phase) => (
                  <tr key={phase.phaseid} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {phase.phasename}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {phase.phaseid}
                    </td>
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
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {phase.startDate ? new Date(phase.startDate).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {phase.endDate ? new Date(phase.endDate).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <Link
                        to={`/admin/phases/${phase.phaseid}`}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
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

      {/* Governance Logs Table */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center space-x-2">
          <FileText size={20} />
          <span>Governance Logs ({governanceLogs.length})</span>
        </h2>

        {governanceLogs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Entry Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Summary
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created At
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {governanceLogs.slice(0, 10).map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {log.event_type}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {log.action || 'No summary available'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {log.success ? (
                        <CheckCircle size={16} className="text-green-600" />
                      ) : (
                        <AlertCircle size={16} className="text-red-600" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {governanceLogs.length > 10 && (
              <div className="mt-2 text-sm text-gray-500 text-center">
                Showing 10 of {governanceLogs.length} logs
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-500 italic">No governance logs found for this project</p>
        )}
      </div>
    </div>
  );
}