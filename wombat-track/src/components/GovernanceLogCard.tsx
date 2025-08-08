import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Edit2, Link, Tag, Clock, User, FileText, GitBranch, Info, Sparkles, AlertTriangle, Shield } from 'lucide-react';

interface GovernanceLogEntry {
  id: string;
  ts: string;
  timestamp: string;
  actor: string;
  entryType: string;
  classification: string;
  project_id?: string;
  phase_id?: string;
  step_id?: string;
  summary: string;
  status?: string;
  gptDraftEntry?: string;
  details?: Record<string, unknown>;
  links?: string[];
  memory_anchor_id?: string;
  source?: string;
  driveSessionId?: string;
}

interface GovernanceLogCardProps {
  log: GovernanceLogEntry;
  onEdit?: (log: GovernanceLogEntry) => void;
  onLinkClick?: (type: 'phase' | 'step' | 'anchor', id: string) => void;
  onReclassify?: (logId: string, newType: string, newClassification: string) => void;
  expanded?: boolean;
  autoClassification?: {
    entryType: string;
    classification: string;
    confidence: number;
    reasoning: string;
  };
  onAutoClassify?: (logId: string) => void;
  integrityStatus?: {
    issueCount: number;
    severity: 'none' | 'info' | 'warning' | 'critical';
  };
}

const entryTypeColors: Record<string, string> = {
  'Creation': 'bg-green-100 text-green-800',
  'Update': 'bg-blue-100 text-blue-800',
  'Activation': 'bg-purple-100 text-purple-800',
  'Completion': 'bg-emerald-100 text-emerald-800',
  'Error': 'bg-red-100 text-red-800',
  'Warning': 'bg-yellow-100 text-yellow-800',
  'System': 'bg-gray-100 text-gray-800',
  'Kickoff': 'bg-indigo-100 text-indigo-800',
  'Integration': 'bg-cyan-100 text-cyan-800',
  'Decision': 'bg-blue-100 text-blue-800',
  'Change': 'bg-orange-100 text-orange-800',
  'Review': 'bg-purple-100 text-purple-800',
  'Architecture': 'bg-indigo-100 text-indigo-800',
  'Process': 'bg-green-100 text-green-800',
  'Risk': 'bg-red-100 text-red-800',
  'Compliance': 'bg-yellow-100 text-yellow-800',
  'Quality': 'bg-emerald-100 text-emerald-800',
  'Security': 'bg-red-100 text-red-800',
  'Performance': 'bg-blue-100 text-blue-800'
};

const classificationColors: Record<string, string> = {
  'governance': 'bg-purple-50 border-purple-200',
  'technical': 'bg-blue-50 border-blue-200',
  'process': 'bg-green-50 border-green-200',
  'security': 'bg-red-50 border-red-200',
  'performance': 'bg-yellow-50 border-yellow-200',
  'documentation': 'bg-gray-50 border-gray-200',
  'critical': 'bg-red-50 border-red-200',
  'strategic': 'bg-indigo-50 border-indigo-200',
  'operational': 'bg-green-50 border-green-200',
  'business': 'bg-orange-50 border-orange-200',
  'regulatory': 'bg-yellow-50 border-yellow-200',
  'experimental': 'bg-cyan-50 border-cyan-200',
  'deprecated': 'bg-gray-50 border-gray-200'
};

export const GovernanceLogCard: React.FC<GovernanceLogCardProps> = ({
  log,
  onEdit,
  onLinkClick,
  onReclassify,
  expanded: initialExpanded = false,
  autoClassification,
  onAutoClassify,
  integrityStatus
}) => {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);
  const [isEditing, setIsEditing] = useState(false);
  const [editedType, setEditedType] = useState(log.entryType);
  const [editedClassification, setEditedClassification] = useState(log.classification);
  const [showAutoSuggestion, setShowAutoSuggestion] = useState(false);

  const formatTimestamp = (ts: string) => {
    try {
      const date = new Date(ts);
      return date.toLocaleString('en-AU', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return ts;
    }
  };

  const handleSaveReclassification = () => {
    if (onReclassify && (editedType !== log.entryType || editedClassification !== log.classification)) {
      onReclassify(log.id, editedType, editedClassification);
    }
    setIsEditing(false);
    setShowAutoSuggestion(false);
  };

  const handleApplyAutoClassification = () => {
    if (autoClassification && onReclassify) {
      setEditedType(autoClassification.entryType);
      setEditedClassification(autoClassification.classification);
      onReclassify(log.id, autoClassification.entryType, autoClassification.classification);
    }
    setShowAutoSuggestion(false);
  };

  const getIntegrityBadge = () => {
    if (!integrityStatus || integrityStatus.severity === 'none' || integrityStatus.issueCount === 0) {
      return null;
    }

    const severityConfig = {
      critical: { 
        icon: <AlertTriangle size={12} />, 
        color: 'bg-red-100 text-red-800 border-red-200',
        tooltip: `${integrityStatus.issueCount} critical link issue${integrityStatus.issueCount > 1 ? 's' : ''}`
      },
      warning: { 
        icon: <AlertTriangle size={12} />, 
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        tooltip: `${integrityStatus.issueCount} link warning${integrityStatus.issueCount > 1 ? 's' : ''}`
      },
      info: { 
        icon: <Info size={12} />, 
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        tooltip: `${integrityStatus.issueCount} link info issue${integrityStatus.issueCount > 1 ? 's' : ''}`
      }
    };

    const config = severityConfig[integrityStatus.severity as keyof typeof severityConfig];
    if (!config) return null;

    return (
      <span 
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${config.color}`}
        title={config.tooltip}
      >
        <Shield size={10} />
        {integrityStatus.issueCount}
      </span>
    );
  };

  const getAISummary = () => {
    if (log.gptDraftEntry) {
      return log.gptDraftEntry;
    }
    
    // Generate a basic AI-style summary if not available
    const action = log.entryType.toLowerCase();
    const target = log.phase_id || log.project_id || 'system';
    return `${log.actor} ${action}d ${target} - ${log.summary}`;
  };

  return (
    <div className={`rounded-2xl border-2 p-6 shadow-sm hover:shadow-md transition-all duration-200 ${
      classificationColors[log.classification] || 'bg-white border-gray-200'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3 flex-1">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-1 text-gray-500 hover:text-gray-700 transition-colors"
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
          </button>
          
          <div className="flex-1">
            {/* Entry Type and Classification Badges */}
            <div className="flex items-center gap-2 mb-2">
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <select
                    value={editedType}
                    onChange={(e) => setEditedType(e.target.value)}
                    className="px-2 py-1 rounded text-sm border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {Object.keys(entryTypeColors).map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                  
                  <select
                    value={editedClassification}
                    onChange={(e) => setEditedClassification(e.target.value)}
                    className="px-2 py-1 rounded text-sm border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {Object.keys(classificationColors).map(cls => (
                      <option key={cls} value={cls}>{cls}</option>
                    ))}
                  </select>
                  
                  <button
                    onClick={handleSaveReclassification}
                    className="px-2 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                  >
                    Save
                  </button>
                  
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setEditedType(log.entryType);
                      setEditedClassification(log.classification);
                    }}
                    className="px-2 py-1 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    entryTypeColors[log.entryType] || 'bg-gray-100 text-gray-800'
                  }`}>
                    {log.entryType}
                  </span>
                  
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-white border border-gray-300">
                    <Tag size={12} className="inline mr-1" />
                    {log.classification}
                  </span>

                  {getIntegrityBadge()}
                </>
              )}
            </div>
            
            {/* AI Summary Preview */}
            <div className="mb-3">
              <div className="flex items-start gap-2">
                <Info size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-gray-700 leading-relaxed">
                  {getAISummary()}
                </p>
              </div>
            </div>
            
            {/* Metadata */}
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Clock size={12} />
                {formatTimestamp(log.ts || log.timestamp)}
              </span>
              
              <span className="flex items-center gap-1">
                <User size={12} />
                {log.actor}
              </span>
              
              {log.source && (
                <span className="flex items-center gap-1">
                  <FileText size={12} />
                  {log.source}
                </span>
              )}
            </div>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {onAutoClassify && !isEditing && (
            <button
              onClick={() => {
                onAutoClassify(log.id);
                setShowAutoSuggestion(true);
              }}
              className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
              aria-label="Auto-classify"
              title="Get AI classification suggestion"
            >
              <Sparkles size={16} />
            </button>
          )}
          
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              aria-label="Edit classification"
            >
              <Tag size={16} />
            </button>
          )}
          
          {onEdit && (
            <button
              onClick={() => onEdit(log)}
              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              aria-label="Edit log"
            >
              <Edit2 size={16} />
            </button>
          )}
        </div>
      </div>
      
      {/* AI Classification Suggestion */}
      {showAutoSuggestion && autoClassification && (
        <div className="mb-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={16} className="text-purple-600" />
                <h4 className="text-sm font-semibold text-purple-800">AI Classification Suggestion</h4>
                <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
                  {(autoClassification.confidence * 100).toFixed(0)}% confidence
                </span>
              </div>
              
              <div className="flex items-center gap-2 mb-2">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  entryTypeColors[autoClassification.entryType] || 'bg-gray-100 text-gray-800'
                }`}>
                  {autoClassification.entryType}
                </span>
                
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-white border border-gray-300">
                  <Tag size={12} className="inline mr-1" />
                  {autoClassification.classification}
                </span>
              </div>
              
              <p className="text-xs text-purple-700 mb-3">
                {autoClassification.reasoning}
              </p>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={handleApplyAutoClassification}
                  className="px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700"
                >
                  Apply Suggestion
                </button>
                
                <button
                  onClick={() => setShowAutoSuggestion(false)}
                  className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Quick Links */}
      <div className="flex items-center gap-2 flex-wrap">
        {log.phase_id && (
          <button
            onClick={() => onLinkClick?.('phase', log.phase_id!)}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-white rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors"
          >
            <GitBranch size={12} />
            Phase: {log.phase_id}
          </button>
        )}
        
        {log.step_id && (
          <button
            onClick={() => onLinkClick?.('step', log.step_id!)}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-white rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-green-50 hover:border-green-300 hover:text-green-700 transition-colors"
          >
            <FileText size={12} />
            Step: {log.step_id}
          </button>
        )}
        
        {log.memory_anchor_id && (
          <button
            onClick={() => onLinkClick?.('anchor', log.memory_anchor_id!)}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-white rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-purple-50 hover:border-purple-300 hover:text-purple-700 transition-colors"
          >
            <Link size={12} />
            Anchor: {log.memory_anchor_id}
          </button>
        )}
      </div>
      
      {/* Expanded Content */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          {/* Full Summary */}
          {log.summary && (
            <div className="mb-3">
              <h4 className="text-xs font-semibold text-gray-600 uppercase mb-1">Summary</h4>
              <p className="text-sm text-gray-700">{log.summary}</p>
            </div>
          )}
          
          {/* Details */}
          {log.details && (
            <div className="mb-3">
              <h4 className="text-xs font-semibold text-gray-600 uppercase mb-1">Details</h4>
              <pre className="text-xs bg-gray-50 p-3 rounded-lg overflow-x-auto">
                {JSON.stringify(log.details, null, 2)}
              </pre>
            </div>
          )}
          
          {/* Links */}
          {log.links && log.links.length > 0 && (
            <div className="mb-3">
              <h4 className="text-xs font-semibold text-gray-600 uppercase mb-1">Related Links</h4>
              <div className="flex flex-col gap-1">
                {log.links.map((link, idx) => (
                  <a
                    key={idx}
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {link}
                  </a>
                ))}
              </div>
            </div>
          )}
          
          {/* Session Info */}
          {log.driveSessionId && (
            <div className="text-xs text-gray-500">
              <span className="font-medium">Session ID:</span> {log.driveSessionId}
            </div>
          )}
        </div>
      )}
    </div>
  );
};