import React, { useState, useMemo } from 'react';
import { useProjectContext } from '../contexts/ProjectContext';
import { Clock, User, FileText, Filter } from 'lucide-react';
import type { GovernanceEventType } from '../types/governance';

interface GovernanceLogViewerProps {
  projectFilter?: string;
}

export const GovernanceLogViewer: React.FC<GovernanceLogViewerProps> = ({ projectFilter }) => {
  const { governanceLog, projects } = useProjectContext();
  const [eventTypeFilter, setEventTypeFilter] = useState<GovernanceEventType | 'all'>('all');
  const [showFilters, setShowFilters] = useState(false);

  const filteredLog = useMemo(() => {
    return governanceLog.filter(event => {
      const eventTypeMatch = eventTypeFilter === 'all' || event.eventType === eventTypeFilter;
      const projectMatch = !projectFilter || event.linkedProject === projectFilter;
      return eventTypeMatch && projectMatch;
    });
  }, [governanceLog, eventTypeFilter, projectFilter]);

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
      case 'MeshChange':
        return '🕸️';
      case 'SystemUpgrade':
        return '⬆️';
      case 'AgentAction':
        return '🤖';
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

  if (filteredLog.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Governance Log
          </h3>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-3 py-1 text-sm text-gray-600 hover:text-gray-900 border rounded-md hover:bg-gray-50"
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>
        </div>
        
        {showFilters && (
          <div className="mb-4 p-3 bg-gray-50 rounded-md">
            <div className="flex gap-4">
              <select
                value={eventTypeFilter}
                onChange={(e) => setEventTypeFilter(e.target.value as GovernanceEventType | 'all')}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">All Event Types</option>
                <option value="StepStatusUpdated">Step Status Updated</option>
                <option value="StepAdded">Step Added</option>
                <option value="StepRemoved">Step Removed</option>
                <option value="PhaseUpdated">Phase Updated</option>
                <option value="MeshChange">Mesh Change</option>
                <option value="SystemUpgrade">System Upgrade</option>
                <option value="AgentAction">Agent Action</option>
              </select>
            </div>
          </div>
        )}
        
        <p className="text-gray-500 text-center py-8">
          {governanceLog.length === 0 
            ? "No governance events recorded yet. Updates to phases and steps will appear here."
            : "No events match the current filters. Try adjusting your filter criteria."
          }
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Governance Log
          <span className="text-sm font-normal text-gray-500">
            ({filteredLog.length} of {governanceLog.length} events)
          </span>
        </h3>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-3 py-1 text-sm text-gray-600 hover:text-gray-900 border rounded-md hover:bg-gray-50"
        >
          <Filter className="w-4 h-4" />
          Filters
        </button>
      </div>
      
      {showFilters && (
        <div className="mb-4 p-3 bg-gray-50 rounded-md">
          <div className="flex gap-4">
            <select
              value={eventTypeFilter}
              onChange={(e) => setEventTypeFilter(e.target.value as GovernanceEventType | 'all')}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm"
            >
              <option value="all">All Event Types</option>
              <option value="StepStatusUpdated">Step Status Updated</option>
              <option value="StepAdded">Step Added</option>
              <option value="StepRemoved">Step Removed</option>
              <option value="PhaseUpdated">Phase Updated</option>
              <option value="MeshChange">Mesh Change</option>
              <option value="SystemUpgrade">System Upgrade</option>
              <option value="AgentAction">Agent Action</option>
            </select>
          </div>
        </div>
      )}
      
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {filteredLog.slice().reverse().map((event) => (
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