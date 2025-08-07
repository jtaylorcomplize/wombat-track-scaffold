import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, AlertCircle, CheckCircle, FileText, Shield } from 'lucide-react';
import PhaseStepList from '../../components/admin/PhaseStepList';

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

interface Project {
  projectId: string;
  projectName: string;
  owner?: string;
  status?: string;
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
  executor?: 'claude' | 'cc' | 'zoi' | 'user' | 'system';
}

interface CheckpointReview {
  id: string;
  phaseId: string;
  status: string;
  aiRiskSummary?: string;
  reviewDate: string;
  reviewer?: string;
}

interface Template {
  id: string;
  templateName: string;
  usageType: string;
  status: string;
  phaseId?: string;
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
}

export default function AdminPhaseView() {
  const { phaseId } = useParams<{ phaseId: string }>();
  const [phase, setPhase] = useState<Phase | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [phaseSteps, setPhaseSteps] = useState<PhaseStep[]>([]);
  const [checkpoints, setCheckpoints] = useState<CheckpointReview[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [governanceLogs, setGovernanceLogs] = useState<GovernanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    fetchPhaseData();
  }, [phaseId]);


  const fetchPhaseData = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch phase details
      const phaseResponse = await fetch(`/api/admin/phases/${phaseId}`);
      if (!phaseResponse.ok) {
        throw new Error(`Failed to fetch phase: ${phaseResponse.status}`);
      }
      const phaseData = await phaseResponse.json();
      setPhase(phaseData.phase);
      setProject(phaseData.project);
      setCheckpoints(phaseData.checkpoints || []);
      setTemplates(phaseData.templates || []);
      setGovernanceLogs(phaseData.governanceLogs || []);

      // Fetch phase steps from new table
      try {
        const stepsResponse = await fetch(`/api/admin/live/phase_steps`);
        if (stepsResponse.ok) {
          const stepsData = await stepsResponse.json();
          // Filter steps for this phase
          const phaseStepsFiltered = stepsData.data?.filter((step: PhaseStep) => 
            step.phaseId === phaseId
          ) || [];
          setPhaseSteps(phaseStepsFiltered);
        }
      } catch (stepError) {
        console.warn('Failed to fetch phase steps:', stepError);
        // Keep any existing steps from phase data
        setPhaseSteps(phaseData.phaseSteps || []);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load phase data');
      console.error('Error fetching phase data:', err);
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
      case 'pending': return 'text-yellow-600 bg-yellow-50';
      case 'blocked': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Loading phase data...</div>
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

  if (!phase) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Phase not found</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Navigation */}
      <div className="mb-6 flex items-center justify-between">
        <Link to="/admin" className="text-blue-600 hover:text-blue-800 flex items-center space-x-2">
          <ArrowLeft size={20} />
          <span>Back to Admin Dashboard</span>
        </Link>
        {project && (
          <Link to={`/admin/projects/${project.projectId}`} className="text-blue-600 hover:text-blue-800">
            View Project: {project.projectName}
          </Link>
        )}
      </div>

      {/* Phase Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{phase.phasename}</h1>
            <p className="text-gray-600 mt-1">Phase ID: {phase.phaseid}</p>
            {project && (
              <p className="text-gray-600">
                Project: <span className="font-medium">{project.projectName}</span>
              </p>
            )}
          </div>
          <div className="flex space-x-2">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(phase.status)}`}>
              {phase.status || 'Planned'}
            </span>
            {phase.RAG && (
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRagColor(phase.RAG)}`}>
                RAG: {phase.RAG}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Start Date:</span>
            <span className="ml-2 font-medium">
              {phase.startDate ? new Date(phase.startDate).toLocaleDateString() : 'Not set'}
            </span>
          </div>
          <div>
            <span className="text-gray-500">End Date:</span>
            <span className="ml-2 font-medium">
              {phase.endDate ? new Date(phase.endDate).toLocaleDateString() : 'Not set'}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Duration:</span>
            <span className="ml-2 font-medium">
              {phase.estimatedDuration ? `${phase.estimatedDuration} days` : 'Not set'}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Updated:</span>
            <span className="ml-2 font-medium">
              {phase.updatedAt ? new Date(phase.updatedAt).toLocaleDateString() : 'Unknown'}
            </span>
          </div>
        </div>

        {phase.notes && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-700 mb-1">Notes</h3>
            <p className="text-gray-600 whitespace-pre-wrap">{phase.notes}</p>
          </div>
        )}
      </div>

      {/* Phase Steps */}
      <PhaseStepList 
        phaseSteps={phaseSteps} 
        governanceLogs={governanceLogs}
        showExecutor={true}
        className="mb-6"
      />

      {/* Checkpoint Reviews Table */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center space-x-2">
          <Shield size={20} />
          <span>Checkpoint Reviews ({checkpoints.length})</span>
        </h2>

        {checkpoints.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    AI Risk Summary
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Review Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reviewer
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {checkpoints.map((checkpoint) => (
                  <tr key={checkpoint.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(checkpoint.status)}`}>
                        {checkpoint.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {checkpoint.aiRiskSummary || 'No risk summary available'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(checkpoint.reviewDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {checkpoint.reviewer || 'System'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 italic">No checkpoint reviews found</p>
        )}
      </div>

      {/* Governance Logs Table */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center space-x-2">
          <FileText size={20} />
          <span>Governance Logs - Phase Scope ({governanceLogs.length})</span>
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
                    Action
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Success
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timestamp
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
                      {log.action || 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {log.user_id || 'System'}
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
          <p className="text-gray-500 italic">No governance logs found for this phase</p>
        )}
      </div>

      {/* Templates Table */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center space-x-2">
          <FileText size={20} />
          <span>Templates ({templates.length})</span>
        </h2>

        {templates.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Template Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usage Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {templates.map((template) => (
                  <tr key={template.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {template.templateName}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {template.usageType}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(template.status)}`}>
                        {template.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 italic">No templates associated with this phase</p>
        )}
      </div>
    </div>
  );
}