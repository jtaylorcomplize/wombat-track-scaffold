import React, { useMemo } from 'react';
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
  integrate: <span className="text-sm">🧬</span>,
  'spqr-runtime': <span className="text-sm">📊</span>,
  admin: <span className="text-sm">🔧</span>,
  'admin-data-explorer': <span className="text-sm">🔧</span>,
  'admin-import-export': <span className="text-sm">🔧</span>,
  'admin-orphan-inspector': <span className="text-sm">🔧</span>,
  'admin-runtime-panel': <span className="text-sm">🔧</span>,
  'admin-secrets-manager': <span className="text-sm">🔧</span>
};

const SURFACE_STYLES: Record<WorkSurface, { background: string; color: string; border: string }> = {
  plan: { background: 'var(--wt-primary-50)', color: 'var(--wt-primary-700)', border: 'var(--wt-primary-200)' },
  execute: { background: 'var(--wt-success-50)', color: 'var(--wt-success-700)', border: 'var(--wt-success-200)' },
  document: { background: 'var(--wt-primary-50)', color: 'var(--wt-primary-700)', border: 'var(--wt-primary-200)' },
  govern: { background: 'var(--wt-warning-50)', color: 'var(--wt-warning-700)', border: 'var(--wt-warning-200)' },
  integrate: { background: 'var(--wt-primary-50)', color: 'var(--wt-primary-700)', border: 'var(--wt-primary-200)' },
  'spqr-runtime': { background: 'var(--wt-success-50)', color: 'var(--wt-success-700)', border: 'var(--wt-success-200)' },
  admin: { background: 'var(--wt-neutral-50)', color: 'var(--wt-neutral-700)', border: 'var(--wt-neutral-200)' },
  'admin-data-explorer': { background: 'var(--wt-neutral-50)', color: 'var(--wt-neutral-700)', border: 'var(--wt-neutral-200)' },
  'admin-import-export': { background: 'var(--wt-neutral-50)', color: 'var(--wt-neutral-700)', border: 'var(--wt-neutral-200)' },
  'admin-orphan-inspector': { background: 'var(--wt-neutral-50)', color: 'var(--wt-neutral-700)', border: 'var(--wt-neutral-200)' },
  'admin-runtime-panel': { background: 'var(--wt-neutral-50)', color: 'var(--wt-neutral-700)', border: 'var(--wt-neutral-200)' },
  'admin-secrets-manager': { background: 'var(--wt-neutral-50)', color: 'var(--wt-neutral-700)', border: 'var(--wt-neutral-200)' }
};

export const BreadcrumbHeader: React.FC<BreadcrumbHeaderProps> = ({
  currentProject,
  currentPhase,
  currentStep,
  selectedSurface,
  onSurfaceChange
}) => {
  // Surface label mapping for consistent UI display
  const getSurfaceLabel = useMemo(() => {
    const labels: Record<WorkSurface, string> = {
      plan: 'Plan',
      execute: 'Execute',
      document: 'Document',
      govern: 'Govern',
      integrate: 'Integrate',
      'spqr-runtime': 'SPQR Runtime',
      admin: 'Admin',
      'admin-data-explorer': 'Data Explorer',
      'admin-import-export': 'Import/Export',
      'admin-orphan-inspector': 'Orphan Inspector',
      'admin-runtime-panel': 'Runtime Panel',
      'admin-secrets-manager': 'Secrets Manager'
    };
    return (surface: WorkSurface) => labels[surface];
  }, []);

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
    <header 
      className="sticky top-0 z-30 border-b shadow-sm"
      style={{ 
        background: 'var(--wt-neutral-0)',
        borderColor: 'var(--wt-neutral-200)',
        boxShadow: 'var(--wt-shadow-sm)'
      }}
    >
      <div style={{ padding: 'var(--wt-space-6)' }}>
        {/* Surface Selector */}
        <div className="flex items-center justify-between mb-4">
          <div 
            className="inline-flex items-center rounded-lg border wt-caption"
            style={{
              padding: 'var(--wt-space-3) var(--wt-space-4)',
              background: SURFACE_STYLES[selectedSurface]?.background || 'var(--wt-primary-50)',
              color: SURFACE_STYLES[selectedSurface]?.color || 'var(--wt-primary-700)',
              borderColor: SURFACE_STYLES[selectedSurface]?.border || 'var(--wt-primary-200)'
            }}
          >
            {SURFACE_ICONS[selectedSurface]}
            <span style={{ marginLeft: 'var(--wt-space-2)' }}>{getSurfaceLabel(selectedSurface)}</span>
          </div>

          <div className="flex items-center space-x-2">
            {(['plan', 'execute', 'document', 'govern', 'integrate'] as WorkSurface[]).map((surface) => (
              <button
                key={surface}
                onClick={() => onSurfaceChange(surface)}
                style={selectedSurface === surface ? {
                  padding: 'var(--wt-space-2) var(--wt-space-3)',
                  background: SURFACE_STYLES[surface]?.background || 'var(--wt-primary-50)',
                  color: SURFACE_STYLES[surface]?.color || 'var(--wt-primary-700)',
                  borderColor: SURFACE_STYLES[surface]?.border || 'var(--wt-primary-200)',
                  border: '1px solid'
                } : {
                  padding: 'var(--wt-space-2) var(--wt-space-3)',
                  background: 'var(--wt-neutral-100)',
                  color: 'var(--wt-neutral-600)'
                }}
                className="rounded-md text-xs font-medium transition-colors wt-focus-ring"
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