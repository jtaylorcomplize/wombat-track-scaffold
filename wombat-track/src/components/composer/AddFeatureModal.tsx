import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { RAGBadge } from './RAGBadge';
import type { FeaturePlanRow, RAGStatus, AIActionType } from '../../types/feature';

interface AddFeatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (feature: Omit<FeaturePlanRow, 'id' | 'createdAt' | 'updatedAt'>) => void;
  apps: string[];
  subApps: string[];
}

export const AddFeatureModal: React.FC<AddFeatureModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  apps,
  subApps
}) => {
  const [formData, setFormData] = useState({
    featureName: '',
    app: apps[0] || '',
    subApp: subApps[0] || '',
    ragStatus: 'amber' as RAGStatus,
    ownerName: '',
    description: '',
    priority: 'medium' as 'high' | 'medium' | 'low',
    estimatedEffort: '',
    aiAvailable: true,
    aiActionType: 'scaffold' as AIActionType,
    dependencies: [] as string[],
    artefactLinks: [] as string[]
  });

  const [dependencyInput, setDependencyInput] = useState('');
  const [linkInput, setLinkInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.featureName.trim()) {
      alert('Feature name is required');
      return;
    }

    onAdd({
      ...formData,
      dependencies: formData.dependencies.filter(d => d.trim()),
      artefactLinks: formData.artefactLinks.filter(l => l.trim())
    });

    // Reset form
    setFormData({
      featureName: '',
      app: apps[0] || '',
      subApp: subApps[0] || '',
      ragStatus: 'amber',
      ownerName: '',
      description: '',
      priority: 'medium',
      estimatedEffort: '',
      aiAvailable: true,
      aiActionType: 'scaffold',
      dependencies: [],
      artefactLinks: []
    });
    setDependencyInput('');
    setLinkInput('');
    onClose();
  };

  const addDependency = () => {
    if (dependencyInput.trim() && !formData.dependencies.includes(dependencyInput.trim())) {
      setFormData(prev => ({
        ...prev,
        dependencies: [...prev.dependencies, dependencyInput.trim()]
      }));
      setDependencyInput('');
    }
  };

  const removeDependency = (index: number) => {
    setFormData(prev => ({
      ...prev,
      dependencies: prev.dependencies.filter((_, i) => i !== index)
    }));
  };

  const addLink = () => {
    if (linkInput.trim() && !formData.artefactLinks.includes(linkInput.trim())) {
      setFormData(prev => ({
        ...prev,
        artefactLinks: [...prev.artefactLinks, linkInput.trim()]
      }));
      setLinkInput('');
    }
  };

  const removeLink = (index: number) => {
    setFormData(prev => ({
      ...prev,
      artefactLinks: prev.artefactLinks.filter((_, i) => i !== index)
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Add New Feature
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Feature Name *
              </label>
              <input
                type="text"
                value={formData.featureName}
                onChange={(e) => setFormData(prev => ({ ...prev, featureName: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter feature name"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                App
              </label>
              <select
                value={formData.app}
                onChange={(e) => setFormData(prev => ({ ...prev, app: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {apps.map(app => (
                  <option key={app} value={app}>{app}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sub-App
              </label>
              <select
                value={formData.subApp}
                onChange={(e) => setFormData(prev => ({ ...prev, subApp: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {subApps.map(subApp => (
                  <option key={subApp} value={subApp}>{subApp}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Describe the feature and its purpose"
            />
          </div>

          {/* Status and Priority */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                RAG Status
              </label>
              <div className="flex gap-2">
                {(['red', 'amber', 'green', 'blue'] as RAGStatus[]).map(status => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, ragStatus: status }))}
                    className={`p-2 rounded-md border-2 transition-colors ${
                      formData.ragStatus === status 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <RAGBadge status={status} />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as 'high' | 'medium' | 'low' }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Owner
              </label>
              <input
                type="text"
                value={formData.ownerName}
                onChange={(e) => setFormData(prev => ({ ...prev, ownerName: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Feature owner"
              />
            </div>
          </div>

          {/* Effort and AI */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estimated Effort
              </label>
              <input
                type="text"
                value={formData.estimatedEffort}
                onChange={(e) => setFormData(prev => ({ ...prev, estimatedEffort: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., 2-3 weeks"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                AI Action Type
              </label>
              <div className="flex gap-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="aiActionType"
                    value="scaffold"
                    checked={formData.aiActionType === 'scaffold'}
                    onChange={(e) => setFormData(prev => ({ ...prev, aiActionType: e.target.value as AIActionType }))}
                    className="mr-2"
                  />
                  Scaffold
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="aiActionType"
                    value="edit"
                    checked={formData.aiActionType === 'edit'}
                    onChange={(e) => setFormData(prev => ({ ...prev, aiActionType: e.target.value as AIActionType }))}
                    className="mr-2"
                  />
                  Edit
                </label>
              </div>
            </div>
          </div>

          {/* Dependencies */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dependencies
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={dependencyInput}
                onChange={(e) => setDependencyInput(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Add dependency"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addDependency())}
              />
              <button
                type="button"
                onClick={addDependency}
                className="px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.dependencies.map((dep, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 text-sm rounded-md"
                >
                  {dep}
                  <button
                    type="button"
                    onClick={() => removeDependency(index)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Artefact Links */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Artefact Links
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="url"
                value={linkInput}
                onChange={(e) => setLinkInput(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="https://example.com/spec"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addLink())}
              />
              <button
                type="button"
                onClick={addLink}
                className="px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.artefactLinks.map((link, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 text-sm rounded-md"
                >
                  {link.length > 30 ? `${link.substring(0, 30)}...` : link}
                  <button
                    type="button"
                    onClick={() => removeLink(index)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              Add Feature
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};