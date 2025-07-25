import React, { useState } from 'react';
import { Download, FileText, FileSpreadsheet, Code, X } from 'lucide-react';
import type { FeaturePlanRow, ExportOptions } from '../../types/feature';

interface ExportPlanButtonProps {
  features: FeaturePlanRow[];
  selectedFeatures: string[];
  onExport: (format: 'markdown' | 'csv' | 'json', features: FeaturePlanRow[]) => void;
}

export const ExportPlanButton: React.FC<ExportPlanButtonProps> = ({
  features,
  selectedFeatures,
  onExport
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'markdown',
    includeFields: ['featureName', 'ragStatus', 'ownerName', 'description', 'priority'],
    filterApplied: false
  });

  const availableFields = [
    { key: 'featureName', label: 'Feature Name' },
    { key: 'app', label: 'App' },
    { key: 'subApp', label: 'Sub-App' },
    { key: 'ragStatus', label: 'RAG Status' },
    { key: 'ownerName', label: 'Owner' },
    { key: 'description', label: 'Description' },
    { key: 'priority', label: 'Priority' },
    { key: 'estimatedEffort', label: 'Estimated Effort' },
    { key: 'dependencies', label: 'Dependencies' },
    { key: 'artefactLinks', label: 'Artefact Links' },
    { key: 'createdAt', label: 'Created Date' },
    { key: 'updatedAt', label: 'Updated Date' }
  ];

  const handleExport = () => {
    const featuresToExport = selectedFeatures.length > 0 
      ? features.filter(f => selectedFeatures.includes(f.id))
      : features;
    
    onExport(exportOptions.format, featuresToExport);
    setIsModalOpen(false);
  };

  const generatePreview = () => {
    const sampleFeature = features[0];
    if (!sampleFeature) return 'No features available';

    switch (exportOptions.format) {
      case 'markdown':
        return `# Feature Plan Export

## Features

### ${sampleFeature.featureName}
- **App**: ${sampleFeature.app} → ${sampleFeature.subApp}
- **RAG Status**: ${sampleFeature.ragStatus}
- **Owner**: ${sampleFeature.ownerName || 'Unassigned'}
- **Priority**: ${sampleFeature.priority || 'N/A'}
${sampleFeature.description ? `- **Description**: ${sampleFeature.description}` : ''}

...and ${features.length - 1} more features`;

      case 'csv': {
        const headers = exportOptions.includeFields.join(',');
        const sampleRow = exportOptions.includeFields.map(field => {
          const value = sampleFeature[field as keyof typeof sampleFeature];
          return Array.isArray(value) ? `"${value.join('; ')}"` : `"${value || ''}"`;
        }).join(',');
        return `${headers}\n${sampleRow}\n...and ${features.length - 1} more rows`;
      }

      case 'json': {
        const sampleData = Object.fromEntries(
          exportOptions.includeFields.map(field => [
            field, 
            sampleFeature[field as keyof typeof sampleFeature]
          ])
        );
        return `[\n  ${JSON.stringify(sampleData, null, 2)},\n  ...and ${features.length - 1} more features\n]`;
      }

      default:
        return 'Invalid format';
    }
  };

  const formatIcons = {
    markdown: FileText,
    csv: FileSpreadsheet,
    json: Code
  };

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors duration-200"
      >
        <Download className="w-4 h-4" />
        Export Plan
        {selectedFeatures.length > 0 && (
          <span className="bg-green-400 text-green-900 px-2 py-0.5 rounded-full text-xs">
            {selectedFeatures.length}
          </span>
        )}
      </button>

      {/* Export Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Download className="w-5 h-5" />
                Export Feature Plan
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Options Panel */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Export Options</h3>
                  
                  {/* Format Selection */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Export Format
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['markdown', 'csv', 'json'] as const).map(format => {
                        const Icon = formatIcons[format];
                        return (
                          <button
                            key={format}
                            onClick={() => setExportOptions(prev => ({ ...prev, format }))}
                            className={`flex items-center gap-2 p-3 rounded-md border-2 transition-colors ${
                              exportOptions.format === format
                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                : 'border-gray-200 hover:border-gray-300 text-gray-700'
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                            <span className="capitalize text-sm font-medium">{format}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Field Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Include Fields
                    </label>
                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-gray-200 rounded-md p-3">
                      {availableFields.map(field => (
                        <label key={field.key} className="flex items-center text-sm">
                          <input
                            type="checkbox"
                            checked={exportOptions.includeFields.includes(field.key)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setExportOptions(prev => ({
                                  ...prev,
                                  includeFields: [...prev.includeFields, field.key]
                                }));
                              } else {
                                setExportOptions(prev => ({
                                  ...prev,
                                  includeFields: prev.includeFields.filter(f => f !== field.key)
                                }));
                              }
                            }}
                            className="mr-2 rounded"
                          />
                          {field.label}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Export Summary */}
                  <div className="bg-gray-50 p-4 rounded-md">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Export Summary</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>
                        <strong>Features:</strong> {
                          selectedFeatures.length > 0 
                            ? `${selectedFeatures.length} selected`
                            : `${features.length} total`
                        }
                      </li>
                      <li><strong>Format:</strong> {exportOptions.format.toUpperCase()}</li>
                      <li><strong>Fields:</strong> {exportOptions.includeFields.length} selected</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Preview Panel */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Preview</h3>
                <div className="bg-gray-900 text-gray-100 p-4 rounded-md font-mono text-xs overflow-auto max-h-96">
                  <pre>{generatePreview()}</pre>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleExport}
                disabled={exportOptions.includeFields.length === 0}
                className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export {exportOptions.format.toUpperCase()}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};