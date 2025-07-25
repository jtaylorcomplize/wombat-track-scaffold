import React from 'react';
import { CheckCircle, Circle, Clock, ExternalLink, AlertCircle } from 'lucide-react';
import type { PhaseStep } from '../../types/phase';

interface StepEnhancementsProps {
  step: PhaseStep;
  className?: string;
}

export const StepEnhancements: React.FC<StepEnhancementsProps> = ({ 
  step, 
  className = '' 
}) => {
  const hasEnhancements = step.completionChecklist?.length || step.ciWorkflowRefs?.length;

  if (!hasEnhancements) {
    return null;
  }

  const getWorkflowStatusColor = (status?: string) => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-100';
      case 'failure': return 'text-red-600 bg-red-100';
      case 'running': return 'text-blue-600 bg-blue-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getWorkflowIcon = (status?: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-3 h-3" />;
      case 'failure': return <AlertCircle className="w-3 h-3" />;
      case 'running': return <Clock className="w-3 h-3 animate-spin" />;
      default: return <Circle className="w-3 h-3" />;
    }
  };

  return (
    <div className={`bg-gray-50 rounded-md p-3 space-y-3 ${className}`}>
      {/* Completion Checklist */}
      {step.completionChecklist && step.completionChecklist.length > 0 && (
        <div>
          <h5 className="text-xs font-semibold text-gray-700 mb-2">Completion Checklist</h5>
          <div className="space-y-1">
            {step.completionChecklist.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                {item.completed ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <Circle className="w-4 h-4 text-gray-400" />
                )}
                <span className={`text-xs ${item.completed ? 'text-gray-700 line-through' : 'text-gray-600'}`}>
                  {item.item}
                </span>
                {item.completed && item.verifiedAt && (
                  <span className="text-xs text-green-600 ml-auto">
                    ✓ {new Date(item.verifiedAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CI Workflow References */}
      {step.ciWorkflowRefs && step.ciWorkflowRefs.length > 0 && (
        <div>
          <h5 className="text-xs font-semibold text-gray-700 mb-2">CI/CD Workflows</h5>
          <div className="space-y-2">
            {step.ciWorkflowRefs.map((workflow, index) => (
              <div key={index} className="bg-white rounded border p-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getWorkflowIcon(workflow.status)}
                    <span className="text-xs font-medium text-gray-700">
                      {workflow.workflowId}
                    </span>
                    {workflow.status && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getWorkflowStatusColor(workflow.status)}`}>
                        {workflow.status}
                      </span>
                    )}
                  </div>
                  {workflow.url && (
                    <a
                      href={workflow.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                {workflow.runId && (
                  <div className="text-xs text-gray-500 mt-1 font-mono">
                    Run: {workflow.runId}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};