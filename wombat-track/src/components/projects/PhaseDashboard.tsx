import React, { useEffect } from 'react';
import { useParams, Outlet } from 'react-router-dom';
import { useProjectContext } from '../../contexts/ProjectContext';
import { ChevronRight, Calendar, Target, AlertCircle } from 'lucide-react';
import type { Phase, PhaseStep } from '../../types/phase';

export const PhaseDashboard: React.FC = () => {
  const { projectId, phaseId } = useParams<{ projectId: string; phaseId: string }>();
  const { projects } = useProjectContext();
  
  useEffect(() => {
    console.log('PhaseDashboard loaded - Project:', projectId, 'Phase:', phaseId);
  }, [projectId, phaseId]);

  const project = projects.find(p => p.id === projectId);
  const phase = project?.phases.find(p => p.id === phaseId);

  if (!project || !phase) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Phase Not Found</h2>
          <p className="text-gray-500">The requested phase could not be found.</p>
        </div>
      </div>
    );
  }

  const completedSteps = phase.steps.filter(s => s.status === 'complete').length;
  const progressPercentage = phase.steps.length > 0 
    ? Math.round((completedSteps / phase.steps.length) * 100) 
    : 0;

  const getStatusColor = (status: PhaseStep['status']) => {
    switch (status) {
      case 'not_started': return 'text-gray-500 bg-gray-100';
      case 'in_progress': return 'text-amber-700 bg-amber-100';
      case 'complete': return 'text-green-700 bg-green-100';
      case 'error': return 'text-red-700 bg-red-100';
      default: return 'text-gray-500 bg-gray-100';
    }
  };

  return (
    <div className="p-6">
      {/* Phase Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center text-sm text-gray-500">
                <span>{project.name}</span>
                <ChevronRight className="w-4 h-4 mx-2" />
                <span className="font-medium text-gray-900">{phase.name}</span>
              </div>
            </div>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              phase.status === 'completed' ? 'bg-green-100 text-green-700' :
              phase.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              {phase.status.replace('_', ' ').toUpperCase()}
            </div>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">{phase.name}</h1>
          {phase.description && (
            <p className="text-gray-600 mb-4">{phase.description}</p>
          )}

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Progress</span>
              <span className="text-sm font-medium text-gray-900">
                {progressPercentage}% ({completedSteps}/{phase.steps.length} steps)
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>

          {/* Phase Metadata */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center text-gray-500 text-sm mb-1">
                <Calendar className="w-4 h-4 mr-1" />
                Start Date
              </div>
              <div className="font-medium text-gray-900">
                {phase.startDate ? new Date(phase.startDate).toLocaleDateString() : 'Not set'}
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center text-gray-500 text-sm mb-1">
                <Target className="w-4 h-4 mr-1" />
                End Date
              </div>
              <div className="font-medium text-gray-900">
                {phase.endDate ? new Date(phase.endDate).toLocaleDateString() : 'Not set'}
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-gray-500 text-sm mb-1">Total Steps</div>
              <div className="font-medium text-gray-900">{phase.steps.length}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-gray-500 text-sm mb-1">Completion</div>
              <div className="font-medium text-gray-900">{phase.completionPercentage}%</div>
            </div>
          </div>
        </div>
      </div>

      {/* Steps List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Phase Steps</h2>
          <div className="space-y-3">
            {phase.steps.map((step, index) => (
              <div 
                key={step.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="text-sm text-gray-500">Step {index + 1}</span>
                      <h3 className="font-medium text-gray-900">{step.name}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(step.status)}`}>
                        {step.status.replace('_', ' ')}
                      </span>
                      {step.isSideQuest && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                          Side Quest
                        </span>
                      )}
                    </div>
                    {step.description && (
                      <p className="text-sm text-gray-600 mb-2">{step.description}</p>
                    )}
                    {step.stepInstruction && (
                      <p className="text-sm text-gray-500 italic">{step.stepInstruction}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Outlet for nested step routes */}
      <Outlet />
    </div>
  );
};