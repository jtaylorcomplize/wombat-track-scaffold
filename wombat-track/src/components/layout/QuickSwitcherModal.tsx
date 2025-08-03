import React, { useState, useEffect, useRef } from 'react';
import { Search, ArrowRight, Hash, Folder, Settings, Rocket, Database } from 'lucide-react';
import type { Project } from '../../types/phase';
import type { WorkSurface } from './AppLayout';
import { SubAppStatusData } from './SubAppStatusBadge';

interface QuickSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  currentProject: Project;
  selectedSurface: WorkSurface;
  subApps: SubAppStatusData[];
  onProjectChange: (project: Project) => void;
  onSurfaceChange: (surface: WorkSurface) => void;
  onSubAppChange: (subAppId: string) => void;
}

type QuickAction = {
  id: string;
  type: 'project' | 'surface' | 'subapp' | 'action';
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  action: () => void;
  keywords: string[];
};

const SURFACE_QUICK_ACTIONS: { id: WorkSurface; title: string; subtitle: string; icon: React.ReactNode }[] = [
  { id: 'plan', title: 'Plan', subtitle: 'Composer, phase setup, AI scaffold', icon: '📋' },
  { id: 'execute', title: 'Execute', subtitle: 'Track phases, trigger steps, flag blockers', icon: '⚡' },
  { id: 'document', title: 'Document', subtitle: 'Rich-text SOP + AI', icon: '📝' },
  { id: 'govern', title: 'Govern', subtitle: 'Logs, reviews, AI audit trails', icon: '🛡️' },
  { id: 'integrate', title: 'Integrate', subtitle: 'Integration health monitoring', icon: '🧬' },
  { id: 'spqr-runtime', title: 'SPQR Runtime', subtitle: 'Live SPQR dashboards with UAT mode', icon: '📊' },
  { id: 'admin', title: 'Admin', subtitle: 'Data Explorer, Import/Export, Runtime Panel', icon: '🔧' },
];

export const QuickSwitcherModal: React.FC<QuickSwitcherModalProps> = ({
  isOpen,
  onClose,
  projects,
  currentProject,
  selectedSurface,
  subApps,
  onProjectChange,
  onSurfaceChange,
  onSubAppChange
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Generate quick actions
  const generateQuickActions = (): QuickAction[] => {
    const actions: QuickAction[] = [];

    // Project actions
    projects.forEach(project => {
      actions.push({
        id: `project-${project.id}`,
        type: 'project',
        title: project.name,
        subtitle: `${project.projectType} • ${project.completionPercentage || 0}% complete`,
        icon: <Folder className="w-4 h-4" />,
        action: () => {
          onProjectChange(project);
          onClose();
        },
        keywords: [project.name, project.projectType || '', 'project']
      });
    });

    // Surface actions
    SURFACE_QUICK_ACTIONS.forEach(surface => {
      actions.push({
        id: `surface-${surface.id}`,
        type: 'surface',
        title: surface.title,
        subtitle: surface.subtitle,
        icon: surface.icon,
        action: () => {
          onSurfaceChange(surface.id);
          onClose();
        },
        keywords: [surface.title, surface.subtitle, 'surface', 'work']
      });
    });

    // Sub-app actions
    subApps.forEach(subApp => {
      actions.push({
        id: `subapp-${subApp.id}`,
        type: 'subapp',
        title: subApp.name,
        subtitle: `${subApp.status} • ${subApp.description || 'Sub-application'}`,
        icon: <Rocket className="w-4 h-4" />,
        action: () => {
          onSubAppChange(subApp.id);
          onClose();
        },
        keywords: [subApp.name, subApp.status, subApp.description || '', 'subapp', 'app']
      });
    });

    // Quick navigation actions
    actions.push({
      id: 'action-system-health',
      type: 'action',
      title: 'System Health',
      subtitle: 'View overall system status and monitoring',
      icon: <Database className="w-4 h-4" />,
      action: () => {
        window.open('/admin/system-health', '_blank');
        onClose();
      },
      keywords: ['system', 'health', 'monitoring', 'status']
    });

    actions.push({
      id: 'action-settings',
      type: 'action',
      title: 'Settings',
      subtitle: 'Platform configuration and preferences',
      icon: <Settings className="w-4 h-4" />,
      action: () => {
        // Navigate to settings
        onSurfaceChange('admin');
        onClose();
      },
      keywords: ['settings', 'config', 'preferences', 'admin']
    });

    return actions;
  };

  const allActions = generateQuickActions();

  // Filter actions based on query
  const filteredActions = query.trim() === '' 
    ? allActions.slice(0, 10) // Show top 10 when no query
    : allActions.filter(action => 
        action.keywords.some(keyword => 
          keyword.toLowerCase().includes(query.toLowerCase())
        ) ||
        action.title.toLowerCase().includes(query.toLowerCase()) ||
        action.subtitle.toLowerCase().includes(query.toLowerCase())
      );

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < filteredActions.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev > 0 ? prev - 1 : filteredActions.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredActions[selectedIndex]) {
            filteredActions[selectedIndex].action();
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredActions, selectedIndex, onClose]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      // Focus input after modal animation
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Update selected index when filtered actions change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  const getTypeColor = (type: QuickAction['type']) => {
    switch (type) {
      case 'project': return 'text-blue-600';
      case 'surface': return 'text-green-600';
      case 'subapp': return 'text-purple-600';
      case 'action': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  const getTypeBadge = (type: QuickAction['type']) => {
    switch (type) {
      case 'project': return 'Project';
      case 'surface': return 'Surface';
      case 'subapp': return 'Sub-App';
      case 'action': return 'Action';
      default: return 'Item';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-2xl mx-4 bg-white rounded-lg shadow-2xl border border-gray-200">
        {/* Search Input */}
        <div className="flex items-center px-4 py-3 border-b border-gray-200">
          <Search className="w-5 h-5 text-gray-400 mr-3" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search projects, surfaces, sub-apps..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 text-lg bg-transparent focus:outline-none"
          />
          <div className="flex items-center space-x-1 text-xs text-gray-400">
            <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">↑↓</kbd>
            <span>to navigate</span>
            <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">↵</kbd>
            <span>to select</span>
            <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">esc</kbd>
            <span>to close</span>
          </div>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-96 overflow-y-auto">
          {filteredActions.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500">
              <Search className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p>No results found for "{query}"</p>
              <p className="text-sm mt-1">Try searching for projects, surfaces, or sub-apps</p>
            </div>
          ) : (
            filteredActions.map((action, index) => (
              <button
                key={action.id}
                onClick={action.action}
                className={`w-full flex items-center px-4 py-3 text-left transition-colors ${
                  index === selectedIndex
                    ? 'bg-blue-50 border-r-2 border-blue-500'
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className={`flex items-center justify-center w-8 h-8 rounded-md mr-3 ${
                  index === selectedIndex ? 'bg-blue-100' : 'bg-gray-100'
                }`}>
                  {action.icon}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-gray-900 truncate">
                      {action.title}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full bg-gray-100 ${getTypeColor(action.type)}`}>
                      {getTypeBadge(action.type)}
                    </span>
                    {action.type === 'project' && action.title === currentProject.name && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                        Current
                      </span>
                    )}
                    {action.type === 'surface' && action.id.replace('surface-', '') === selectedSurface && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 truncate mt-0.5">
                    {action.subtitle}
                  </p>
                </div>
                
                <ArrowRight className="w-4 h-4 text-gray-400 ml-2" />
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        {filteredActions.length > 0 && (
          <div className="px-4 py-2 border-t border-gray-200 bg-gray-50 text-xs text-gray-500">
            {filteredActions.length} result{filteredActions.length !== 1 ? 's' : ''} found
          </div>
        )}
      </div>
    </div>
  );
};