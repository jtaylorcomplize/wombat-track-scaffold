import React from 'react';
import { ChevronRight, Home, Folder, List, Play } from 'lucide-react';
import type { Project, Phase, PhaseStep as Step } from '../../types/phase';
import type { WorkSurface } from './AppLayout';

interface BreadcrumbHeaderProps {
  currentProject: Project;
  currentPhase: Phase | null;
  currentStep: Step | null;
  selectedSurface: WorkSurface;
  onSurfaceChange: (surface: WorkSurface) => void;
}

const SURFACE_ICONS: Record<WorkSurface, React.ReactNode> = {
  plan: <List className="w-4 h-4" />,
  execute: <Play className="w-4 h-4" />,
  document: <span className="text-sm">📝</span>,
  govern: <span className="text-sm">🛡️</span>,
  integrate: <span className="text-sm">🧬</span>
};

const SURFACE_COLORS: Record<WorkSurface, string> = {
  plan: 'bg-blue-50 text-blue-700 border-blue-200',
  execute: 'bg-green-50 text-green-700 border-green-200',
  document: 'bg-purple-50 text-purple-700 border-purple-200',
  govern: 'bg-orange-50 text-orange-700 border-orange-200',
  integrate: 'bg-pink-50 text-pink-700 border-pink-200'
};

export const BreadcrumbHeader: React.FC<BreadcrumbHeaderProps> = ({
  currentProject,
  currentPhase,
  currentStep,
  selectedSurface,
  onSurfaceChange
}) => {
  const getSurfaceLabel = (surface: WorkSurface) => {
    const labels: Record<WorkSurface, string> = {
      plan: 'Plan',
      execute: 'Execute',
      document: 'Document',
      govern: 'Govern',
      integrate: 'Integrate'
    };
    return labels[surface];
  };

  const getStepStatusIcon = (status: string) => {
    switch (status) {
      case 'complete':
      case 'completed':
        return <span className="text-green-500">✅</span>;
      case 'in_progress':
        return <span className="text-blue-500">🔄</span>;
      case 'blocked':
        return <span className="text-red-500">🚫</span>;
      case 'error':
        return <span className="text-red-500">❌</span>;
      default:
        return <span className="text-gray-400">⭕</span>;
    }
  };

  const getPhaseStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="text-green-500">✅</span>;
      case 'in_progress':
        return <span className="text-blue-500">🔄</span>;
      case 'not_started':
        return <span className="text-gray-400">⭕</span>;
      default:
        return <span className="text-gray-400">⭕</span>;
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
      <div className="px-6 py-4">
        {/* Surface Selector */}
        <div className="flex items-center justify-between mb-4">
          <div className={`inline-flex items-center px-3 py-2 rounded-lg border text-sm font-medium ${
            SURFACE_COLORS[selectedSurface]
          }`}>
            {SURFACE_ICONS[selectedSurface]}
            <span className="ml-2">{getSurfaceLabel(selectedSurface)} Surface</span>
          </div>

          <div className="flex items-center space-x-2">
            {(['plan', 'execute', 'document', 'govern', 'integrate'] as WorkSurface[]).map((surface) => (
              <button
                key={surface}
                onClick={() => onSurfaceChange(surface)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  selectedSurface === surface
                    ? SURFACE_COLORS[surface]
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                data-testid={`surface-tab-${surface}`}
              >
                {getSurfaceLabel(surface)}
              </button>
            ))}
          </div>
        </div>

        {/* Breadcrumb Navigation */}
        <nav className="flex items-center space-x-2 text-sm" data-testid="breadcrumb-nav">
          {/* Project */}
          <div className="flex items-center space-x-2">
            <Home className="w-4 h-4 text-gray-400" />
            <span className="font-medium text-gray-900" data-testid="breadcrumb-project">
              {currentProject.name}
            </span>
            <span className={`px-2 py-1 text-xs rounded-full ${
              currentProject.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
            }`}>
              {currentProject.status}
            </span>
          </div>

          {/* Phase */}
          {currentPhase && (
            <>
              <ChevronRight className="w-4 h-4 text-gray-400" />
              <div className="flex items-center space-x-2">
                <Folder className="w-4 h-4 text-gray-400" />
                <span className="text-gray-700" data-testid="breadcrumb-phase">
                  {currentPhase.name}
                </span>
                {getPhaseStatusIcon(currentPhase.status)}
                <span className="text-xs text-gray-500">
                  ({currentPhase.completionPercentage || 0}%)
                </span>
              </div>
            </>
          )}

          {/* Step */}
          {currentStep && (
            <>
              <ChevronRight className="w-4 h-4 text-gray-400" />
              <div className="flex items-center space-x-2">
                <Play className="w-4 h-4 text-gray-400" />
                <span className="text-gray-700" data-testid="breadcrumb-step">
                  {currentStep.name}
                </span>
                {getStepStatusIcon(currentStep.status)}
                {currentStep.isSideQuest && (
                  <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full">
                    Side Quest
                  </span>
                )}
              </div>
            </>
          )}
        </nav>

        {/* Quick Stats */}
        <div className="flex items-center space-x-6 mt-3 text-xs text-gray-500">
          <div className="flex items-center space-x-1">
            <span>Project:</span>
            <span className="font-medium">{currentProject.completionPercentage || 0}% complete</span>
          </div>
          
          {currentPhase && (
            <div className="flex items-center space-x-1">
              <span>Phase:</span>
              <span className="font-medium">{currentPhase.steps.length} steps</span>
            </div>
          )}
          
          <div className="flex items-center space-x-1">
            <span>Owner:</span>
            <span className="font-medium">{currentProject.projectOwner}</span>
          </div>
          
          <div className="flex items-center space-x-1">
            <span>Type:</span>
            <span className="font-medium">{currentProject.projectType}</span>
          </div>
        </div>
      </div>
    </header>
  );
};