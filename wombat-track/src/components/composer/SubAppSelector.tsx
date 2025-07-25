import React from 'react';
import { ChevronDown } from 'lucide-react';
import type { FeatureFilter } from '../../types/feature';

interface SubAppSelectorProps {
  apps: string[];
  subApps: string[];
  owners: string[];
  filter: FeatureFilter;
  onFilterChange: (filter: FeatureFilter) => void;
}

export const SubAppSelector: React.FC<SubAppSelectorProps> = ({
  apps,
  subApps,
  owners,
  filter,
  onFilterChange
}) => {
  const handleFilterChange = (key: keyof FeatureFilter, value: string) => {
    const newFilter = { ...filter };
    if (value === 'all' || value === '') {
      delete newFilter[key];
    } else {
      newFilter[key] = value;
    }
    onFilterChange(newFilter);
  };

  const SelectDropdown: React.FC<{
    label: string;
    value: string | undefined;
    onChange: (value: string) => void;
    options: string[];
    placeholder: string;
  }> = ({ label, value, onChange, options, placeholder }) => (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <div className="relative">
        <select
          value={value || 'all'}
          onChange={(e) => onChange(e.target.value)}
          className="
            appearance-none w-full bg-white border border-gray-300 rounded-md
            px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 
            focus:ring-blue-500 focus:border-blue-500 cursor-pointer
          "
        >
          <option value="all">{placeholder}</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-2 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
      </div>
    </div>
  );

  const statusOptions = ['red', 'amber', 'green', 'blue'];

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
        🔍 Filter by:
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SelectDropdown
          label="App"
          value={filter.app}
          onChange={(value) => handleFilterChange('app', value)}
          options={apps}
          placeholder="All Apps"
        />

        <SelectDropdown
          label="Sub-App"
          value={filter.subApp}
          onChange={(value) => handleFilterChange('subApp', value)}
          options={subApps}
          placeholder="All Sub-Apps"
        />

        <SelectDropdown
          label="RAG Status"
          value={filter.status}
          onChange={(value) => handleFilterChange('status', value)}
          options={statusOptions}
          placeholder="All Statuses"
        />

        <SelectDropdown
          label="Owner"
          value={filter.owner}
          onChange={(value) => handleFilterChange('owner', value)}
          options={owners}
          placeholder="All Owners"
        />
      </div>

      {/* Active filters display */}
      {Object.keys(filter).length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-gray-500">Active filters:</span>
            {Object.entries(filter).map(([key, value]) => (
              <span
                key={key}
                className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-md"
              >
                {key}: {value}
                <button
                  onClick={() => handleFilterChange(key as keyof FeatureFilter, 'all')}
                  className="ml-1 text-blue-600 hover:text-blue-800"
                >
                  ×
                </button>
              </span>
            ))}
            <button
              onClick={() => onFilterChange({})}
              className="text-xs text-gray-500 hover:text-gray-700 underline"
            >
              Clear all
            </button>
          </div>
        </div>
      )}
    </div>
  );
};