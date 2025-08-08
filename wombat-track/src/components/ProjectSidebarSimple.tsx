import React from 'react';
import { Folder } from 'lucide-react';

interface ProjectSidebarSimpleProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

/**
 * ULTRA-SIMPLIFIED STATIC PROJECT SIDEBAR
 * No collapse/expand, no dynamic parts, no scrolling.
 * Fixed height legacy sidebar.
 */
const ProjectSidebarSimple: React.FC<ProjectSidebarSimpleProps> = () => {
  return (
    <div className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-gray-200 shadow-sm z-50 flex flex-col">
      {/* Header - Fixed Size */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2 mb-2">
          <Folder className="w-5 h-5 text-gray-600" />
          <h1 className="text-lg font-bold text-gray-900">Projects</h1>
        </div>
        <p className="text-sm text-gray-600">Legacy Interface</p>
      </div>

      {/* Content - Takes remaining space */}
      <div className="flex-1 p-4 flex flex-col justify-center">
        <div className="text-center text-gray-600">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg mb-4">
            <p className="text-amber-800 font-medium">⚠️ Legacy Mode</p>
            <p className="text-amber-700 text-sm mt-1">
              Switch to Orbis Platform for full functionality
            </p>
          </div>
          
          <button className="w-full p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Go to Orbis Platform
          </button>
        </div>
      </div>

      {/* Footer - Fixed Size */}
      <div className="p-4 border-t border-gray-200">
        <div className="text-xs text-gray-500 text-center">
          Static Legacy Mode
        </div>
      </div>
    </div>
  );
};

export default ProjectSidebarSimple;