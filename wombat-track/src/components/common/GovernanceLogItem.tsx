import React, { useState } from 'react';
import { User, FileText, Bot, ExternalLink, ChevronDown, ChevronRight } from 'lucide-react';

export interface GovernanceLogEntry {
  id: string;
  entryType: 'Review' | 'Decision' | 'Change' | 'AI_Session' | 'Audit' | 'Risk_Assessment';
  title: string;
  summary: string;
  details?: string;
  author: string;
  timestamp: string;
  projectId?: string;
  phaseId?: string;
  stepId?: string;
  tags?: string[];
  attachments?: string[];
  aiGenerated?: boolean;
  relatedEntries?: string[];
}

export interface GovernanceLogItemProps {
  entry: GovernanceLogEntry;
  onView?: (entryId: string) => void;
  onEdit?: (entryId: string) => void;
  onDelete?: (entryId: string) => void;
  className?: string;
  testId?: string;
}

const ENTRY_TYPE_STYLES = {
  Review: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    icon: '👁️',
    color: 'text-blue-700'
  },
  Decision: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    icon: '✅',
    color: 'text-green-700'
  },
  Change: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    icon: '🔄',
    color: 'text-amber-700'
  },
  AI_Session: {
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    icon: '🤖',
    color: 'text-purple-700'
  },
  Audit: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    icon: '🔍',
    color: 'text-red-700'
  },
  Risk_Assessment: {
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    icon: '⚠️',
    color: 'text-orange-700'
  }
};

export const GovernanceLogItem: React.FC<GovernanceLogItemProps> = ({
  entry,
  onView,
  onEdit,
  onDelete,
  className = '',
  testId
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const typeStyle = ENTRY_TYPE_STYLES[entry.entryType];
  
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getRelativeTime = (timestamp: string) => {
    const now = new Date();
    const entryTime = new Date(timestamp);
    const diffMs = now.getTime() - entryTime.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatTimestamp(timestamp);
  };

  return (
    <div
      className={`bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 ${className}`}
      data-testid={testId}
    >
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <div className={`px-2 py-1 rounded-md text-xs font-medium border ${
                typeStyle.bg
              } ${typeStyle.border} ${typeStyle.color}`}>
                <span className="mr-1">{typeStyle.icon}</span>
                {entry.entryType.replace('_', ' ')}
              </div>
              
              {entry.aiGenerated && (
                <div className="flex items-center space-x-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-md text-xs">
                  <Bot className="w-3 h-3" />
                  <span>AI Generated</span>
                </div>
              )}
              
              <span className="text-xs text-gray-500" title={formatTimestamp(entry.timestamp)}>
                {getRelativeTime(entry.timestamp)}
              </span>
            </div>

            <h3 className="text-lg font-semibold text-gray-900 mb-1" data-testid={`${testId}-title`}>
              {entry.title}
            </h3>
            
            <p className="text-gray-600 text-sm mb-3" data-testid={`${testId}-summary`}>
              {entry.summary}
            </p>

            <div className="flex items-center space-x-4 text-xs text-gray-500">
              <div className="flex items-center space-x-1">
                <User className="w-3 h-3" />
                <span>{entry.author}</span>
              </div>
              
              {entry.projectId && (
                <div className="flex items-center space-x-1">
                  <FileText className="w-3 h-3" />
                  <span>Project: {entry.projectId}</span>
                </div>
              )}
              
              {entry.phaseId && (
                <span>Phase: {entry.phaseId}</span>
              )}
            </div>

            {/* Tags */}
            {entry.tags && entry.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {entry.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2 ml-4">
            {entry.details && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                data-testid={`${testId}-expand`}
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
            )}
            
            {onView && (
              <button
                onClick={() => onView(entry.id)}
                className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                title="View Details"
                data-testid={`${testId}-view`}
              >
                <ExternalLink className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && entry.details && (
        <div className="border-t border-gray-200 p-4 bg-gray-50" data-testid={`${testId}-details`}>
          <div className="prose prose-sm max-w-none">
            <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">
              {entry.details}
            </pre>
          </div>
          
          {/* Attachments */}
          {entry.attachments && entry.attachments.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Attachments:</h4>
              <div className="space-y-1">
                {entry.attachments.map((attachment, index) => (
                  <a
                    key={index}
                    href={attachment}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 text-sm"
                  >
                    <FileText className="w-3 h-3" />
                    <span>{attachment}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Related Entries */}
          {entry.relatedEntries && entry.relatedEntries.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Related Entries:</h4>
              <div className="flex flex-wrap gap-2">
                {entry.relatedEntries.map((relatedId, index) => (
                  <button
                    key={index}
                    onClick={() => onView?.(relatedId)}
                    className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200 transition-colors"
                  >
                    {relatedId}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Actions Footer */}
      {(onEdit || onDelete) && (
        <div className="border-t border-gray-200 px-4 py-2 bg-gray-50">
          <div className="flex items-center justify-end space-x-2">
            {onEdit && (
              <button
                onClick={() => onEdit(entry.id)}
                className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
                data-testid={`${testId}-edit`}
              >
                Edit
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(entry.id)}
                className="text-xs text-red-600 hover:text-red-800 transition-colors"
                data-testid={`${testId}-delete`}
              >
                Delete
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};