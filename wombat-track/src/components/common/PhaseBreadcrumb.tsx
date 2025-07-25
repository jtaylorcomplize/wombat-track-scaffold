import React from 'react';
import { ChevronRight, Play, Pause, CheckCircle, AlertTriangle } from 'lucide-react';
import type { Phase, PhaseStep as Step } from '../../types/phase';

export interface PhaseBreadcrumbProps {
  phases: Phase[];
  currentPhase: Phase | null;
  currentStep: Step | null;
  onPhaseSelect?: (phase: Phase) => void;
  onStepSelect?: (step: Step) => void;
  showSteps?: boolean;
  className?: string;
  testId?: string;
}

const getPhaseStatusIcon = (status: string) => {
  switch (status) {
    case 'completed':
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case 'in_progress':
      return <Play className="w-4 h-4 text-blue-500" />;
    case 'blocked':
      return <AlertTriangle className="w-4 h-4 text-red-500" />;
    case 'on_hold':
      return <Pause className="w-4 h-4 text-amber-500" />;
    default:
      return <div className="w-4 h-4 rounded-full border-2 border-gray-300" />;
  }
};

const getStepStatusIcon = (status: string) => {
  switch (status) {
    case 'complete':
    case 'completed':
      return <CheckCircle className="w-3 h-3 text-green-500" />;
    case 'in_progress':
      return <Play className="w-3 h-3 text-blue-500" />;
    case 'blocked':
      return <AlertTriangle className="w-3 h-3 text-red-500" />;
    case 'error':
      return <AlertTriangle className="w-3 h-3 text-red-500" />;
    default:
      return <div className="w-3 h-3 rounded-full border border-gray-300" />;
  }
};

const getPhaseStatusColor = (status: string, isCurrent: boolean) => {
  if (isCurrent) {
    return 'bg-blue-100 text-blue-800 border-blue-200';
  }
  
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'in_progress':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'blocked':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'on_hold':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    default:
      return 'bg-gray-100 text-gray-600 border-gray-200';
  }
};

export const PhaseBreadcrumb: React.FC<PhaseBreadcrumbProps> = ({
  phases,
  currentPhase,
  currentStep,
  onPhaseSelect,
  onStepSelect,
  showSteps = true,
  className = '',
  testId
}) => {
  const getPhaseProgress = (phase: Phase) => {
    if (!phase.steps || phase.steps.length === 0) return 0;
    const completedSteps = phase.steps.filter(step => step.status === 'complete' || step.status === 'completed').length;
    return Math.round((completedSteps / phase.steps.length) * 100);
  };

  return (
    <div className={`space-y-4 ${className}`} data-testid={testId}>
      {/* Phase Navigation */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-2">
        {phases.map((phase, index) => (
          <React.Fragment key={phase.id}>
            {index > 0 && (
              <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
            )}
            
            <button
              onClick={() => onPhaseSelect?.(phase)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all duration-200 hover:scale-105 flex-shrink-0 ${
                getPhaseStatusColor(phase.status, phase.id === currentPhase?.id)
              } ${onPhaseSelect ? 'cursor-pointer' : 'cursor-default'}`}
              disabled={!onPhaseSelect}
              data-testid={`${testId}-phase-${phase.id}`}
            >
              {getPhaseStatusIcon(phase.status)}
              <div className="text-left">
                <div className="font-medium">{phase.name}</div>
                <div className="text-xs opacity-75">
                  {getPhaseProgress(phase)}% complete
                </div>
              </div>
            </button>
          </React.Fragment>
        ))}
      </div>

      {/* Step Navigation for Current Phase */}
      {showSteps && currentPhase && currentPhase.steps && currentPhase.steps.length > 0 && (
        <div className="ml-4 border-l-2 border-gray-200 pl-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            Steps in {currentPhase.name}
          </h4>
          
          <div className="space-y-2">
            {currentPhase.steps.map((step, index) => (
              <button
                key={step.id}
                onClick={() => onStepSelect?.(step)}
                className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 text-left ${
                  step.id === currentStep?.id
                    ? 'bg-blue-50 border-2 border-blue-200 shadow-sm'
                    : 'bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                } ${onStepSelect ? 'cursor-pointer' : 'cursor-default'}`}
                disabled={!onStepSelect}
                data-testid={`${testId}-step-${step.id}`}
              >
                <div className="flex-shrink-0">
                  {getStepStatusIcon(step.status)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-gray-900 truncate">
                      {step.name}
                    </span>
                    {step.isSideQuest && (
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full flex-shrink-0">
                        Side Quest
                      </span>
                    )}
                  </div>
                  
                  {step.description && (
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                      {step.description}
                    </p>
                  )}
                </div>
                
                <div className="flex-shrink-0 text-xs text-gray-500">
                  Step {index + 1}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Phase Summary */}
      {currentPhase && (
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-medium text-gray-900 mb-1">
                Current Phase: {currentPhase.name}
              </h3>
              <p className="text-sm text-gray-600 mb-2">
                {currentPhase.description}
              </p>
              <div className="flex items-center space-x-4 text-xs text-gray-500">
                <span>Order: {currentPhase.order}</span>
                <span>Steps: {currentPhase.steps?.length || 0}</span>
                <span>Progress: {getPhaseProgress(currentPhase)}%</span>
              </div>
            </div>
            
            <div className="text-right">
              <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                getPhaseStatusColor(currentPhase.status, false)
              }`}>
                {getPhaseStatusIcon(currentPhase.status)}
                <span className="ml-1 capitalize">{currentPhase.status.replace('_', ' ')}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};