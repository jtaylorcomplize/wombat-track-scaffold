import React from 'react';
import { ExternalLink, User, Calendar, Clock } from 'lucide-react';
import { RAGBadge } from './RAGBadge';
import { AIActionCell } from './AIActionCell';
import type { FeaturePlanRow } from '../../types/feature';

interface FeatureTableProps {
  features: FeaturePlanRow[];
  selectedFeatures: string[];
  onFeatureSelect: (featureId: string) => void;
  onEditAI: (feature: FeaturePlanRow) => void;
  onScaffoldAI: (feature: FeaturePlanRow) => void;
  isLoading?: boolean;
}

export const FeatureTable: React.FC<FeatureTableProps> = ({
  features,
  selectedFeatures,
  onFeatureSelect,
  onEditAI,
  onScaffoldAI,
  isLoading = false
}) => {
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 bg-red-50';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50';
      case 'low':  
        return 'text-green-600 bg-green-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  if (features.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-8 text-center">
          <div className="text-4xl mb-4">📦</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Features Found</h3>
          <p className="text-gray-500">No features match your current filter criteria.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          📦 Feature Table
          <span className="text-xs text-gray-500 font-normal">
            ({features.length} feature{features.length !== 1 ? 's' : ''})
          </span>
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <input
                  type="checkbox"
                  className="rounded border-gray-300"
                  onChange={(e) => {
                    if (e.target.checked) {
                      features.forEach(f => onFeatureSelect(f.id));
                    } else {
                      selectedFeatures.forEach(id => onFeatureSelect(id));
                    }
                  }}
                  checked={selectedFeatures.length === features.length && features.length > 0}
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ID
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Feature
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                RAG Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Owner
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Priority
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                AI
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Details
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {features.map((feature) => (
              <tr 
                key={feature.id}
                className={`hover:bg-gray-50 transition-colors duration-150 ${
                  selectedFeatures.includes(feature.id) ? 'bg-blue-50' : ''
                }`}
              >
                {/* Selection checkbox */}
                <td className="px-4 py-4 whitespace-nowrap">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300"
                    checked={selectedFeatures.includes(feature.id)}
                    onChange={() => onFeatureSelect(feature.id)}
                  />
                </td>

                {/* ID */}
                <td className="px-4 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                  {feature.id}
                </td>

                {/* Feature Name & Description */}
                <td className="px-4 py-4">
                  <div className="max-w-xs">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {feature.featureName}
                    </div>
                    {feature.description && (
                      <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                        {feature.description}
                      </div>
                    )}
                    <div className="text-xs text-gray-400 mt-1">
                      {feature.app} → {feature.subApp}
                    </div>
                  </div>
                </td>

                {/* RAG Status */}
                <td className="px-4 py-4 whitespace-nowrap">
                  <RAGBadge status={feature.ragStatus} showLabel />
                </td>

                {/* Owner */}
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-900">
                      {feature.ownerName || 'Unassigned'}
                    </span>
                  </div>
                </td>

                {/* Priority */}
                <td className="px-4 py-4 whitespace-nowrap">
                  {feature.priority && (
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(feature.priority)}`}>
                      {feature.priority}
                    </span>
                  )}
                </td>

                {/* AI Actions */}
                <td className="px-4 py-4 whitespace-nowrap">
                  <AIActionCell
                    available={feature.aiAvailable}
                    actionType={feature.aiActionType}
                    onEdit={() => onEditAI(feature)}
                    onScaffold={() => onScaffoldAI(feature)}
                    isLoading={isLoading}
                  />
                </td>

                {/* Details */}
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    {/* Effort estimate */}
                    {feature.estimatedEffort && (
                      <div className="flex items-center gap-1 text-xs text-gray-500" title="Estimated effort">
                        <Clock className="w-3 h-3" />
                        {feature.estimatedEffort}
                      </div>
                    )}
                    
                    {/* Last updated */}
                    {feature.updatedAt && (
                      <div className="flex items-center gap-1 text-xs text-gray-500" title="Last updated">
                        <Calendar className="w-3 h-3" />
                        {formatDate(feature.updatedAt)}
                      </div>
                    )}

                    {/* Artefact links */}
                    {feature.artefactLinks && feature.artefactLinks.length > 0 && (
                      <a
                        href={feature.artefactLinks[0]}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:text-blue-700 transition-colors"
                        title="View artefacts"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Table footer with summary */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
        <div className="flex justify-between items-center text-xs text-gray-500">
          <div>
            Showing {features.length} feature{features.length !== 1 ? 's' : ''}
            {selectedFeatures.length > 0 && (
              <span className="ml-2 text-blue-600">
                ({selectedFeatures.length} selected)
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span>🔴 {features.filter(f => f.ragStatus === 'red').length}</span>
            <span>🟡 {features.filter(f => f.ragStatus === 'amber').length}</span>
            <span>🟢 {features.filter(f => f.ragStatus === 'green').length}</span>
            <span>🔵 {features.filter(f => f.ragStatus === 'blue').length}</span>
          </div>
        </div>
      </div>
    </div>
  );
};