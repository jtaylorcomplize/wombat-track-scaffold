import React, { useState, useEffect } from 'react';

interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

interface FilterConfig {
  field_name: string;
  display_name: string;
  filter_type: 'dropdown' | 'multiselect' | 'date_range' | 'text' | 'number_range';
  options?: string[];
  default_value?: unknown;
  required?: boolean;
  depends_on?: string;
}

interface FilterValue {
  field_name: string;
  value: unknown;
  operator?: string;
}

interface SPQRDashboardFilterProps {
  filters: FilterConfig[];
  defaultFilters: FilterValue[];
  userRole: string;
  onFilterChange: (filters: FilterValue[]) => void;
  onFilterApply: (filters: FilterValue[]) => void;
  isLoading?: boolean;
}

export const SPQRDashboardFilter: React.FC<SPQRDashboardFilterProps> = ({
  filters,
  defaultFilters,
  userRole,
  onFilterChange,
  onFilterApply,
  isLoading = false
}) => {
  const [currentFilters, setCurrentFilters] = useState<FilterValue[]>(defaultFilters);
  const [expandedFilters, setExpandedFilters] = useState<boolean>(false);
  const [filterOptionsCache, setFilterOptionsCache] = useState<Record<string, FilterOption[]>>({});

  useEffect(() => {
    setCurrentFilters(defaultFilters);
  }, [defaultFilters]);

  const updateFilter = (fieldName: string, value: unknown, operator: string = 'equals') => {
    const updatedFilters = currentFilters.filter(f => f.field_name !== fieldName);
    
    if (value !== null && value !== undefined && value !== '') {
      updatedFilters.push({
        field_name: fieldName,
        value,
        operator
      });
    }

    setCurrentFilters(updatedFilters);
    onFilterChange(updatedFilters);
  };

  const applyFilters = () => {
    onFilterApply(currentFilters);
  };

  const resetFilters = () => {
    setCurrentFilters(defaultFilters);
    onFilterChange(defaultFilters);
    onFilterApply(defaultFilters);
  };

  const getCurrentFilterValue = (fieldName: string): unknown => {
    const filter = currentFilters.find(f => f.field_name === fieldName);
    return filter?.value || '';
  };

  const getFilterOptions = (filter: FilterConfig): FilterOption[] => {
    if (filterOptionsCache[filter.field_name]) {
      return filterOptionsCache[filter.field_name];
    }

    let options: FilterOption[] = [];

    if (filter.options) {
      options = filter.options.map(option => ({
        value: option,
        label: option.replace(/"/g, '').replace(/_/g, ' ')
      }));
    } else {
      switch (filter.field_name) {
        case 'matter_status':
          options = [
            { value: 'Active', label: 'Active' },
            { value: 'Closed', label: 'Closed' },
            { value: 'On Hold', label: 'On Hold' },
            { value: 'Pending', label: 'Pending' }
          ];
          break;
        case 'priority':
          options = [
            { value: 'High', label: 'High Priority' },
            { value: 'Medium', label: 'Medium Priority' },
            { value: 'Low', label: 'Low Priority' }
          ];
          break;
        case 'practice_area':
          if (['partner', 'admin'].includes(userRole)) {
            options = [
              { value: 'Corporate', label: 'Corporate Law' },
              { value: 'Litigation', label: 'Litigation' },
              { value: 'Property', label: 'Property Law' },
              { value: 'Family', label: 'Family Law' },
              { value: 'Criminal', label: 'Criminal Law' }
            ];
          } else {
            options = [
              { value: 'Corporate', label: 'Corporate Law' },
              { value: 'Property', label: 'Property Law' }
            ];
          }
          break;
        default:
          options = [];
      }
    }

    setFilterOptionsCache(prev => ({
      ...prev,
      [filter.field_name]: options
    }));

    return options;
  };

  const renderFilter = (filter: FilterConfig) => {
    const currentValue = getCurrentFilterValue(filter.field_name);
    const options = getFilterOptions(filter);

    switch (filter.filter_type) {
      case 'dropdown':
        return (
          <div key={filter.field_name} className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">
              {filter.display_name}
              {filter.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <select
              value={currentValue}
              onChange={(e) => updateFilter(filter.field_name, e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
            >
              <option value="">All {filter.display_name}</option>
              {options.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label} {option.count ? `(${option.count})` : ''}
                </option>
              ))}
            </select>
          </div>
        );

      case 'multiselect':
        return (
          <div key={filter.field_name} className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">
              {filter.display_name}
              {filter.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <div className="border border-gray-300 rounded-md p-2 max-h-32 overflow-y-auto">
              {options.map(option => (
                <label key={option.value} className="flex items-center mb-1">
                  <input
                    type="checkbox"
                    checked={Array.isArray(currentValue) ? currentValue.includes(option.value) : currentValue === option.value}
                    onChange={(e) => {
                      let newValue = Array.isArray(currentValue) ? [...currentValue] : [];
                      if (e.target.checked) {
                        newValue.push(option.value);
                      } else {
                        newValue = newValue.filter(v => v !== option.value);
                      }
                      updateFilter(filter.field_name, newValue, 'in');
                    }}
                    className="mr-2"
                    disabled={isLoading}
                  />
                  <span className="text-sm">{option.label}</span>
                </label>
              ))}
            </div>
          </div>
        );

      case 'date_range':
        return (
          <div key={filter.field_name} className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">
              {filter.display_name}
              {filter.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                placeholder="From"
                value={currentValue?.from || ''}
                onChange={(e) => updateFilter(filter.field_name, { ...currentValue, from: e.target.value }, 'between')}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
              />
              <input
                type="date"
                placeholder="To"
                value={currentValue?.to || ''}
                onChange={(e) => updateFilter(filter.field_name, { ...currentValue, to: e.target.value }, 'between')}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
              />
            </div>
          </div>
        );

      case 'text':
        return (
          <div key={filter.field_name} className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">
              {filter.display_name}
              {filter.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              type="text"
              value={currentValue}
              onChange={(e) => updateFilter(filter.field_name, e.target.value, 'contains')}
              placeholder={`Search ${filter.display_name}...`}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
            />
          </div>
        );

      case 'number_range':
        return (
          <div key={filter.field_name} className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">
              {filter.display_name}
              {filter.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                placeholder="Min"
                value={currentValue?.min || ''}
                onChange={(e) => updateFilter(filter.field_name, { ...currentValue, min: e.target.value }, 'between')}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
              />
              <input
                type="number"
                placeholder="Max"
                value={currentValue?.max || ''}
                onChange={(e) => updateFilter(filter.field_name, { ...currentValue, max: e.target.value }, 'between')}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const activeFiltersCount = currentFilters.filter(f => 
    f.value !== null && f.value !== undefined && f.value !== '' && 
    (!Array.isArray(f.value) || f.value.length > 0)
  ).length;

  const hasChanges = JSON.stringify(currentFilters) !== JSON.stringify(defaultFilters);

  if (filters.length === 0) {
    return null;
  }

  return (
    <div className="spqr-dashboard-filters bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <h3 className="text-lg font-medium text-gray-900">Filters</h3>
            {activeFiltersCount > 0 && (
              <span className="ml-2 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                {activeFiltersCount} active
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {hasChanges && (
              <button
                onClick={resetFilters}
                className="text-sm text-gray-500 hover:text-gray-700"
                disabled={isLoading}
              >
                Reset
              </button>
            )}
            <button
              onClick={() => setExpandedFilters(!expandedFilters)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {expandedFilters ? 'Collapse' : 'Expand'}
            </button>
          </div>
        </div>
      </div>

      {expandedFilters && (
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            {filters.map(renderFilter)}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <div className="text-sm text-gray-500">
              {activeFiltersCount > 0 ? (
                `${activeFiltersCount} filter${activeFiltersCount !== 1 ? 's' : ''} applied`
              ) : (
                'No filters applied'
              )}
            </div>
            <div className="flex space-x-2">
              <button
                onClick={resetFilters}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                disabled={isLoading || !hasChanges}
              >
                Reset
              </button>
              <button
                onClick={applyFilters}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                disabled={isLoading}
              >
                {isLoading ? 'Applying...' : 'Apply Filters'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SPQRDashboardFilter;