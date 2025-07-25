import React from 'react';
import { Edit3, Zap, Brain } from 'lucide-react';
import type { AIActionType } from '../../types/feature';

interface AIActionCellProps {
  available: boolean;
  actionType?: AIActionType;
  onEdit?: () => void;
  onScaffold?: () => void;
  isLoading?: boolean;
}

export const AIActionCell: React.FC<AIActionCellProps> = ({
  available,
  actionType,
  onEdit,
  onScaffold,
  isLoading = false
}) => {
  if (!available) {
    return (
      <div className="flex items-center justify-center">
        <span className="text-gray-400 text-sm">N/A</span>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center">
        <Brain className="w-4 h-4 text-blue-500 animate-pulse" />
      </div>
    );
  }

  const handleAction = () => {
    if (actionType === 'edit' && onEdit) {
      onEdit();
    } else if (actionType === 'scaffold' && onScaffold) {
      onScaffold();
    }
  };

  const getButtonConfig = () => {
    switch (actionType) {
      case 'edit':
        return {
          icon: Edit3,
          symbol: '✎',
          title: 'Edit AI Prompt',
          className: 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200',
          description: 'Open editable AI prompt'
        };
      case 'scaffold':
        return {
          icon: Zap,
          symbol: '⚡',
          title: 'Auto-generate Phase Plan',
          className: 'bg-green-50 hover:bg-green-100 text-green-700 border-green-200',
          description: 'Generate phase steps automatically'
        };
      default:
        return {
          icon: Brain,
          symbol: '🧠',
          title: 'AI Available',
          className: 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200',
          description: 'AI assistance available'
        };
    }
  };

  const config = getButtonConfig();
  const IconComponent = config.icon;

  return (
    <div className="flex items-center justify-center">
      <button
        onClick={handleAction}
        className={`
          w-8 h-8 rounded-md border transition-all duration-200 
          flex items-center justify-center group relative
          ${config.className}
        `}
        title={config.description}
      >
        {/* Use Lucide icon for better visual consistency */}
        <IconComponent className="w-4 h-4" />
        
        {/* Tooltip on hover */}
        <div className="
          absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2
          bg-gray-900 text-white text-xs rounded px-2 py-1 
          opacity-0 group-hover:opacity-100 transition-opacity duration-200
          pointer-events-none whitespace-nowrap z-10
        ">
          {config.title}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 
                         border-l-4 border-r-4 border-t-4 
                         border-l-transparent border-r-transparent border-t-gray-900"></div>
        </div>
      </button>
    </div>
  );
};