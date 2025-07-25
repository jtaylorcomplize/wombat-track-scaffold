import React, { useState } from 'react';
import { Brain, ChevronDown, ChevronUp, Sparkles, BookOpen, AlertTriangle } from 'lucide-react';
import type { FeaturePlanRow } from '../../types/feature';

interface AISummaryPanelProps {
  features: FeaturePlanRow[];
  onGenerateSummary: (features: FeaturePlanRow[]) => void;
  onSaveToGovernanceLog: (summary: string) => void;
  isLoading?: boolean;
}

export const AISummaryPanel: React.FC<AISummaryPanelProps> = ({
  features,
  onGenerateSummary,
  onSaveToGovernanceLog,
  isLoading = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [summary, setSummary] = useState('');
  const [insights, setInsights] = useState<{
    risks: string[];
    recommendations: string[];
    dependencies: string[];
  } | null>(null);

  // Mock AI-generated content for demonstration
  const generateMockSummary = () => {
    const ragCounts = {
      red: features.filter(f => f.ragStatus === 'red').length,
      amber: features.filter(f => f.ragStatus === 'amber').length,
      green: features.filter(f => f.ragStatus === 'green').length,
      blue: features.filter(f => f.ragStatus === 'blue').length
    };

    const mockSummary = `
# Feature Plan Summary - ${new Date().toLocaleDateString()}

## Overview
This feature plan contains ${features.length} features across multiple applications and sub-applications.

## RAG Status Distribution
- 🔴 **Red (${ragCounts.red})**: Critical issues requiring immediate attention
- 🟡 **Amber (${ragCounts.amber})**: Issues requiring monitoring and action
- 🟢 **Green (${ragCounts.green})**: Features on track with no major concerns
- 🔵 **Blue (${ragCounts.blue})**: Future planning items

## Key Features by Priority
${features
  .filter(f => f.priority === 'high')
  .map(f => `- **${f.featureName}** (${f.app} → ${f.subApp}) - ${f.ragStatus}`)
  .join('\n')}

## Ownership Distribution
${Object.entries(features
  .reduce((acc, f) => {
    const owner = f.ownerName || 'Unassigned';
    acc[owner] = (acc[owner] || 0) + 1;
    return acc;
  }, {} as Record<string, number>))
  .map(([owner, count]) => `- ${owner}: ${count} feature${count !== 1 ? 's' : ''}`)
  .join('\n')}

## AI Integration Opportunities
${features.filter(f => f.aiAvailable).length} features have AI assistance available:
${features
  .filter(f => f.aiAvailable)
  .map(f => `- ${f.featureName} (${f.aiActionType})`)
  .join('\n')}
    `.trim();

    const mockInsights = {
      risks: [
        'Multiple features assigned to "TBD" - ownership needs clarification',
        `${ragCounts.red} features in red status may impact delivery timeline`,
        'Dependencies between features not fully mapped',
        'High-priority features concentrated in single sub-app'
      ],
      recommendations: [
        'Assign clear ownership to unassigned features',
        'Conduct dependency mapping workshop',
        'Prioritize red status features for immediate action',
        'Consider load balancing across team members',
        'Implement regular RAG status review meetings'
      ],
      dependencies: [
        'SCORM Lesson Viewer → Completion Tracker',
        'User Authentication → Multiple features',
        'Database Schema → Analytics features',
        'AI Service Integration → AI Quiz Generator'
      ]
    };

    setSummary(mockSummary);
    setInsights(mockInsights);
  };

  const handleGenerateSummary = () => {
    // In real implementation, this would call the AI service
    generateMockSummary();
    onGenerateSummary(features);
  };

  const handleSaveToLog = () => {
    if (summary) {
      onSaveToGovernanceLog(summary);
      // Could show success message or reset state
    }
  };

  const getStatusStats = () => {
    const stats = features.reduce((acc, f) => {
      acc[f.ragStatus] = (acc[f.ragStatus] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return [
      { status: 'red', count: stats.red || 0, emoji: '🔴' },
      { status: 'amber', count: stats.amber || 0, emoji: '🟡' },
      { status: 'green', count: stats.green || 0, emoji: '🟢' },
      { status: 'blue', count: stats.blue || 0, emoji: '🔵' }
    ];
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <Brain className={`w-5 h-5 ${isLoading ? 'text-blue-500 animate-pulse' : 'text-purple-600'}`} />
          <h3 className="text-lg font-semibold text-gray-900">AI Summary Panel</h3>
          <div className="flex items-center gap-1">
            {getStatusStats().map(({ status, count, emoji }) => (
              <span key={status} className="text-sm" title={`${count} ${status} features`}>
                {emoji}{count}
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isExpanded && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleGenerateSummary();
                setIsExpanded(true);
              }}
              disabled={isLoading}
              className="px-3 py-1 bg-purple-500 text-white text-sm rounded-md hover:bg-purple-600 disabled:bg-gray-300 transition-colors flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3" />
              Generate
            </button>
          )}
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-200">
          {/* Quick Actions */}
          <div className="p-4 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-sm text-gray-600">
                  <strong>{features.length}</strong> features analyzed
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <strong>{features.filter(f => f.aiAvailable).length}</strong> AI-ready
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleGenerateSummary}
                  disabled={isLoading}
                  className="px-3 py-1.5 bg-purple-500 text-white text-sm rounded-md hover:bg-purple-600 disabled:bg-gray-300 transition-colors flex items-center gap-1"
                >
                  {isLoading ? (
                    <>
                      <Brain className="w-3 h-3 animate-pulse" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3 h-3" />
                      Analyze Features
                    </>
                  )}
                </button>
                {summary && (
                  <button
                    onClick={handleSaveToLog}
                    className="px-3 py-1.5 bg-blue-500 text-white text-sm rounded-md hover:bg-blue-600 transition-colors flex items-center gap-1"
                  >
                    <BookOpen className="w-3 h-3" />
                    Save to Log
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Summary Content */}
          {summary && (
            <div className="p-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                {/* Key Insights */}
                {insights && (
                  <>
                    {/* Risks */}
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <h4 className="flex items-center gap-2 text-sm font-semibold text-red-800 mb-2">
                        <AlertTriangle className="w-4 h-4" />
                        Key Risks
                      </h4>
                      <ul className="text-xs text-red-700 space-y-1">
                        {insights.risks.slice(0, 3).map((risk, i) => (
                          <li key={i} className="flex items-start gap-1">
                            <span className="text-red-500 mt-0.5">•</span>
                            <span>{risk}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Recommendations */}
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h4 className="flex items-center gap-2 text-sm font-semibold text-green-800 mb-2">
                        <Sparkles className="w-4 h-4" />
                        Recommendations
                      </h4>
                      <ul className="text-xs text-green-700 space-y-1">
                        {insights.recommendations.slice(0, 3).map((rec, i) => (
                          <li key={i} className="flex items-start gap-1">
                            <span className="text-green-500 mt-0.5">•</span>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Dependencies */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="flex items-center gap-2 text-sm font-semibold text-blue-800 mb-2">
                        <BookOpen className="w-4 h-4" />
                        Key Dependencies
                      </h4>
                      <ul className="text-xs text-blue-700 space-y-1">
                        {insights.dependencies.slice(0, 3).map((dep, i) => (
                          <li key={i} className="flex items-start gap-1">
                            <span className="text-blue-500 mt-0.5">→</span>
                            <span>{dep}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}
              </div>

              {/* Full Summary */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Detailed Analysis</h4>
                <div className="text-xs text-gray-700 font-mono whitespace-pre-wrap max-h-64 overflow-y-auto">
                  {summary}
                </div>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!summary && !isLoading && (
            <div className="p-8 text-center">
              <Brain className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h4 className="text-sm font-medium text-gray-900 mb-1">No Analysis Yet</h4>
              <p className="text-xs text-gray-500 mb-3">
                Click "Analyze Features" to generate AI-powered insights and recommendations.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};