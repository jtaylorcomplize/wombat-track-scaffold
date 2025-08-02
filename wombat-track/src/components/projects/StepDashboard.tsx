import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useProjectContext } from '../../contexts/ProjectContext';
import { ChevronRight, Clock, CheckCircle, AlertCircle, FileText } from 'lucide-react';

export const StepDashboard: React.FC = () => {
  const { projectId, phaseId, stepId } = useParams<{ 
    projectId: string; 
    phaseId: string; 
    stepId: string; 
  }>();
  const { projects } = useProjectContext();
  
  const project = projects.find(p => p.id === projectId);
  const phase = project?.phases.find(p => p.id === phaseId);
  const step = phase?.steps.find(s => s.id === stepId);
  
  useEffect(() => {
    console.log('✅ StepDashboard rendered with params:', { projectId, phaseId, stepId });
    console.log('✅ Project found:', !!project, 'Phase found:', !!phase, 'Step found:', !!step);
    if (project) console.log('✅ Project name:', project.name);
    if (phase) console.log('✅ Phase name:', phase.name);
    if (step) console.log('✅ Step name:', step.name);
  }, [projectId, phaseId, stepId, project, phase, step]);

  if (!project || !phase || !step) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Step Not Found</h2>
          <p className="text-gray-500">The requested step could not be found.</p>
        </div>
      </div>
    );
  }

  const getStatusIcon = (status: typeof step.status) => {
    switch (status) {
      case 'complete': return <CheckCircle className="w-6 h-6 text-green-600" />;
      case 'in_progress': return <Clock className="w-6 h-6 text-amber-600 animate-pulse" />;
      case 'error': return <AlertCircle className="w-6 h-6 text-red-600" />;
      default: return <div className="w-6 h-6 rounded-full border-2 border-gray-300" />;
    }
  };

  return (
    <div className="p-6">
      {/* Breadcrumb */}
      <div className="flex items-center text-sm text-gray-500 mb-6">
        <span>{project.name}</span>
        <ChevronRight className="w-4 h-4 mx-2" />
        <span>{phase.name}</span>
        <ChevronRight className="w-4 h-4 mx-2" />
        <span className="font-medium text-gray-900">{step.name}</span>
      </div>

      {/* Step Details Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-start space-x-4">
              {getStatusIcon(step.status)}
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">{step.name}</h1>
                {step.isSideQuest && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-700 mb-3">
                    🎯 Side Quest
                  </span>
                )}
              </div>
            </div>
            <div className={`px-4 py-2 rounded-lg text-sm font-medium ${
              step.status === 'complete' ? 'bg-green-100 text-green-700' :
              step.status === 'in_progress' ? 'bg-amber-100 text-amber-700' :
              step.status === 'error' ? 'bg-red-100 text-red-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              {step.status.replace('_', ' ').toUpperCase()}
            </div>
          </div>

          {/* Description */}
          {step.description && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Description</h2>
              <p className="text-gray-600">{step.description}</p>
            </div>
          )}

          {/* Step Instruction */}
          {step.stepInstruction && (
            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-blue-900 mb-1">Instructions</h3>
                  <p className="text-sm text-blue-800">{step.stepInstruction}</p>
                </div>
              </div>
            </div>
          )}

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {step.startedAt && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-500 mb-1">Started At</div>
                <div className="font-medium text-gray-900">
                  {new Date(step.startedAt).toLocaleString()}
                </div>
              </div>
            )}
            {step.completedAt && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-500 mb-1">Completed At</div>
                <div className="font-medium text-gray-900">
                  {new Date(step.completedAt).toLocaleString()}
                </div>
              </div>
            )}
            {step.templateId && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-500 mb-1">Template ID</div>
                <div className="font-medium text-gray-900">{step.templateId}</div>
              </div>
            )}
            {step.executionId && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-500 mb-1">Execution ID</div>
                <div className="font-medium text-gray-900 text-xs break-all">
                  {step.executionId}
                </div>
              </div>
            )}
          </div>

          {/* Duration */}
          {step.startedAt && step.completedAt && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="text-sm text-green-700">
                <strong>Duration:</strong> {
                  Math.round((new Date(step.completedAt).getTime() - new Date(step.startedAt).getTime()) / 1000 / 60)
                } minutes
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};