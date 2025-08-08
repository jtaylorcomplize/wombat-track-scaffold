import React from 'react';
import { Home, Settings, Database, Users } from 'lucide-react';

interface EnhancedSidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  currentSurface?: string;
  onSurfaceChange?: (surface: string) => void;
}

/**
 * ULTRA-SIMPLIFIED STATIC SIDEBAR
 * No collapse/expand, no dynamic parts, no scrolling.
 * Fixed height that fits within viewport.
 */
export const EnhancedSidebar: React.FC<EnhancedSidebarProps> = ({
  currentSurface = 'plan',
  onSurfaceChange = () => {}
}) => {
  // Static navigation - no dynamic behavior
  const navItems = [
    { id: 'plan', label: 'Plan', icon: <Home className="w-4 h-4" /> },
    { id: 'execute', label: 'Execute', icon: <Settings className="w-4 h-4" /> },
    { id: 'document', label: 'Document', icon: <Database className="w-4 h-4" /> },
    { id: 'admin', label: 'Admin', icon: <Users className="w-4 h-4" /> }
  ];

  return (
    <div className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-gray-200 shadow-sm z-50 flex flex-col">
      {/* Header - Fixed Size */}
      <div className="p-4 border-b border-gray-200">
        <h1 className="text-lg font-bold text-gray-900">🪃 Wombat Track</h1>
        <p className="text-sm text-gray-600">Migration Mode</p>
      </div>

      {/* Navigation - Takes remaining space */}
      <nav className="flex-1 p-4">
        <div className="space-y-3">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onSurfaceChange(item.id)}
              className={`w-full flex items-center space-x-3 p-3 rounded-lg ${
                currentSurface === item.id
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              {item.icon}
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Footer - Fixed Size */}
      <div className="p-4 border-t border-gray-200">
        <div className="text-xs text-gray-500 text-center">
          Static Interface
        </div>
      </div>
    </div>
  );
};