import React from 'react';
import { ChevronDown, Grid3x3, Box, Globe } from 'lucide-react';
import type { Program } from '../../types/models';
import { mockPrograms } from '../../data/mockPrograms';

interface SubAppSelectorProps {
  currentSubApp: string;
  onSubAppChange: (subAppId: string) => void;
  availableSubApps?: Program[];
  showBranding?: boolean;
}

// Brand colors for each Sub-App
const subAppBranding: Record<string, { color: string; bgLight: string; icon: React.ReactNode }> = {
  'prog-orbis-001': {
    color: '#8B5CF6',
    bgLight: '#EDE9FE',
    icon: <Globe className="w-4 h-4" />
  },
  'prog-complize-001': {
    color: '#DC2626',
    bgLight: '#FEE2E2',
    icon: <Box className="w-4 h-4" />
  },
  'prog-spqr-001': {
    color: '#059669',
    bgLight: '#D1FAE5',
    icon: <Grid3x3 className="w-4 h-4" />
  },
  'prog-roam-001': {
    color: '#EA580C',
    bgLight: '#FED7AA',
    icon: <Globe className="w-4 h-4" />
  }
};

export const SubAppSelector: React.FC<SubAppSelectorProps> = ({
  currentSubApp,
  onSubAppChange,
  availableSubApps = mockPrograms,
  showBranding = true
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  
  const currentProgram = availableSubApps.find(p => p.id === currentSubApp) || availableSubApps[0];
  const branding = subAppBranding[currentSubApp] || subAppBranding['prog-orbis-001'];

  // Don't show selector if only one Sub-App is available
  if (availableSubApps.length === 1) {
    return (
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center gap-3">
          {showBranding && (
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: branding.bgLight, color: branding.color }}
            >
              {branding.icon}
            </div>
          )}
          <div>
            <h2 className="font-semibold text-gray-900">{currentProgram.name}</h2>
            <p className="text-xs text-gray-500">Platform</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-3 border-b border-gray-200">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between hover:bg-gray-50 rounded-lg p-2 transition-colors"
      >
        <div className="flex items-center gap-3">
          {showBranding && (
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
              style={{ backgroundColor: branding.bgLight, color: branding.color }}
            >
              {branding.icon}
            </div>
          )}
          <div className="text-left">
            <h2 className="font-semibold text-gray-900">{currentProgram.name}</h2>
            <p className="text-xs text-gray-500">{currentProgram.programType}</p>
          </div>
        </div>
        <ChevronDown 
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="mt-2 py-2 bg-white border border-gray-200 rounded-lg shadow-lg">
          {availableSubApps.map(program => {
            const programBranding = subAppBranding[program.id] || subAppBranding['prog-orbis-001'];
            const isSelected = program.id === currentSubApp;
            
            return (
              <button
                key={program.id}
                onClick={() => {
                  onSubAppChange(program.id);
                  setIsOpen(false);
                }}
                className={`w-full px-3 py-2 flex items-center gap-3 hover:bg-gray-50 transition-colors ${
                  isSelected ? 'bg-gray-50' : ''
                }`}
              >
                <div 
                  className="w-6 h-6 rounded-md flex items-center justify-center"
                  style={{ 
                    backgroundColor: isSelected ? programBranding.color : programBranding.bgLight, 
                    color: isSelected ? 'white' : programBranding.color 
                  }}
                >
                  {programBranding.icon}
                </div>
                <div className="text-left flex-1">
                  <div className="font-medium text-sm text-gray-900">{program.name}</div>
                  <div className="text-xs text-gray-500">{program.status} • {program.programType}</div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};