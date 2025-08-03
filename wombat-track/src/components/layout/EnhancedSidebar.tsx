import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Project } from '../../types/phase';
import type { WorkSurface } from './AppLayout';
import { OperatingSubAppsSection } from './OperatingSubAppsSection';
import { ProjectSurfacesSection } from './ProjectSurfacesSection';
import { SystemSurfacesSection } from './SystemSurfacesSection';
import { SystemSurfaceErrorBoundary } from './SystemSurfaceErrorBoundary';
import { SubAppSelector } from './SubAppSelector';
import { mockPrograms } from '../../data/mockPrograms';

interface EnhancedSidebarProps {
  projects: Project[];
  currentProject: Project;
  selectedSurface: WorkSurface;
  collapsed: boolean;
  currentSubApp: string;
  onProjectChange: (project: Project) => void;
  onSurfaceChange: (surface: WorkSurface) => void;
  onToggleCollapse: () => void;
  onSubAppChange: (subAppId: string) => void;
}

export const EnhancedSidebar: React.FC<EnhancedSidebarProps> = ({
  projects,
  currentProject,
  selectedSurface,
  collapsed,
  currentSubApp,
  onProjectChange,
  onSurfaceChange,
  onToggleCollapse,
  onSubAppChange
}) => {
  if (collapsed) {
    return (
      <div className="fixed left-0 top-0 h-screen w-16 bg-white border-r border-gray-200 shadow-lg z-[9999] flex flex-col">
        <div className="p-4">
          <button
            onClick={onToggleCollapse}
            className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
            data-testid="sidebar-expand"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        
        {/* Collapsed Operating Sub-Apps Section */}
        <OperatingSubAppsSection 
          collapsed={true}
          onSubAppClick={(subApp) => {
            if (subApp.url) {
              window.open(subApp.url, '_blank');
            }
          }}
          onSurfaceChange={onSurfaceChange}
        />

        {/* Collapsed Project Surfaces Section */}
        <ProjectSurfacesSection
          currentProject={currentProject}
          selectedSurface={selectedSurface}
          collapsed={true}
          onSurfaceChange={onSurfaceChange}
          availableProjects={projects}
        />

        {/* Collapsed System Surfaces Section */}
        <SystemSurfacesSection
          selectedSurface={selectedSurface}
          collapsed={true}
          onSurfaceChange={onSurfaceChange}
        />
      </div>
    );
  }

  return (
    <div className="fixed left-0 top-0 h-screen w-80 bg-white border-r border-gray-200 shadow-lg z-[9999] flex flex-col" data-testid="enhanced-sidebar-v3">
      {/* Header with Platform Title */}
      <div className="p-6 pb-0 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-gray-900">Orbis Platform</h1>
          <button
            onClick={onToggleCollapse}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
            data-testid="sidebar-collapse"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Sub-App Selector */}
      <SubAppSelector
        currentSubApp={currentSubApp}
        onSubAppChange={onSubAppChange}
        availableSubApps={mockPrograms}
        showBranding={true}
      />

      {/* Three-Tier Sidebar Architecture */}
      <div className="flex-1 overflow-y-auto">
        {/* Tier 1: Operating Sub-Apps - Live System Access */}
        <div data-testid="operating-subapps-section">
        <OperatingSubAppsSection 
          collapsed={false}
          onSubAppClick={(subApp) => {
            // Navigate to sub-app dashboard within the platform
            onSubAppChange(subApp.id);
          }}
          onSubAppStatusClick={(subApp) => {
            // Open detailed status modal or navigate to monitoring
            console.log('Sub-app status clicked:', subApp);
          }}
          onSurfaceChange={onSurfaceChange}
        />
        </div>

        {/* Tier 2: Project Surfaces - Project-Nested Work */}
        <div data-testid="project-surfaces-section">
        <ProjectSurfacesSection
          currentProject={currentProject}
          selectedSurface={selectedSurface}
          collapsed={false}
          onProjectChange={onProjectChange}
          onSurfaceChange={onSurfaceChange}
          availableProjects={projects}
        />
        </div>

        {/* Tier 3: System Surfaces - Platform-Level Tools */}
        <div data-testid="system-surfaces-section">
        <SystemSurfaceErrorBoundary>
          <SystemSurfacesSection
            selectedSurface={selectedSurface}
            collapsed={false}
            onSurfaceChange={onSurfaceChange}
          />
        </SystemSurfaceErrorBoundary>
        </div>
      </div>

      {/* Footer with Settings */}
      <div className="p-4 border-t border-gray-200">
        <div className="text-xs text-gray-500 text-center">
          Enhanced Sidebar v1.2
        </div>
      </div>
    </div>
  );
};