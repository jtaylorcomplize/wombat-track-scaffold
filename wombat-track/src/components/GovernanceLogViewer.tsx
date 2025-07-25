import React from 'react';
import { useProjectContext } from '../contexts/ProjectContext';
import { Clock, User, FileText } from 'lucide-react';

export const GovernanceLogViewer: React.FC = () => {
  const { governanceLog } = useProjectContext();

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'StepStatusUpdated':
        return '🔄';
      case 'StepAdded':
        return '➕';
      case 'StepRemoved':
        return '❌';
      case 'PhaseUpdated':
        return '📝';
      default:
        return '📋';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'complete':
        return 'text-green-600';
      case 'in_progress':
        return 'text-amber-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  if (governanceLog.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Governance Log
        </h3>
        <p className="text-gray-500 text-center py-8">
          No governance events recorded yet. Updates to phases and steps will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <FileText className="w-5 h-5" />
        Governance Log
        <span className="text-sm font-normal text-gray-500">({governanceLog.length} events)</span>
      </h3>
      
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {governanceLog.slice().reverse().map((event) => (
          <div
            key={event.id}
            className="border-l-4 border-blue-400 pl-4 py-2 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-lg">{getEventIcon(event.eventType)}</span>
                  <span className="font-medium text-gray-900">
                    {event.eventType.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                  {event.newStatus && (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(event.newStatus)}`}>
                      {event.newStatus.replace('_', ' ')}
                    </span>
                  )}
                </div>
                
                {event.details && (
                  <div className="mt-1 text-xs text-gray-600">
                    {event.details.stepName && (
                      <div>Step: {event.details.stepName}</div>
                    )}
                    {event.details.previousStatus && (
                      <div>Previous status: {event.details.previousStatus.replace('_', ' ')}</div>
                    )}
                  </div>
                )}
              </div>
              
              <div className="flex flex-col items-end text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(event.timestamp).toLocaleTimeString()}
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <User className="w-3 h-3" />
                  {event.triggeredBy}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};