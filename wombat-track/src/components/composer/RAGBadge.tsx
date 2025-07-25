import React from 'react';
import type { RAGStatus } from '../../types/feature';

interface RAGBadgeProps {
  status: RAGStatus;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const RAGBadge: React.FC<RAGBadgeProps> = ({ 
  status, 
  size = 'md', 
  showLabel = false 
}) => {
  const getStatusConfig = (status: RAGStatus) => {
    switch (status) {
      case 'red':
        return {
          color: '#ef4444',
          emoji: '🔴',
          label: 'Red',
          description: 'Critical issues'
        };
      case 'amber':
        return {
          color: '#f59e0b',
          emoji: '🟡',
          label: 'Amber',
          description: 'Attention required'
        };
      case 'green':
        return {
          color: '#10b981',
          emoji: '🟢',
          label: 'Green',
          description: 'On track'
        };
      case 'blue':
        return {
          color: '#3b82f6',
          emoji: '🔵',
          label: 'Blue',
          description: 'Future planning'
        };
      default:
        return {
          color: '#6b7280',
          emoji: '⚪',
          label: 'Unknown',
          description: 'Status unclear'
        };
    }
  };

  const getSizeClasses = (size: string) => {
    switch (size) {
      case 'sm':
        return {
          dot: 'w-2 h-2',
          text: 'text-xs',
          emoji: 'text-sm'
        };
      case 'lg':
        return {
          dot: 'w-4 h-4',
          text: 'text-base',
          emoji: 'text-lg'
        };
      default: // md
        return {
          dot: 'w-3 h-3',
          text: 'text-sm',
          emoji: 'text-base'
        };
    }
  };

  const config = getStatusConfig(status);
  const sizeClasses = getSizeClasses(size);

  if (showLabel) {
    return (
      <div className="flex items-center gap-2">
        <div
          className={`${sizeClasses.dot} rounded-full border-2 border-white shadow-sm`}
          style={{ backgroundColor: config.color }}
          title={config.description}
        />
        <span className={`${sizeClasses.text} font-medium`} style={{ color: config.color }}>
          {config.label}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center">
      <span
        className={sizeClasses.emoji}
        title={`${config.label} - ${config.description}`}
        role="img"
        aria-label={`RAG status: ${config.label}`}
      >
        {config.emoji}
      </span>
    </div>
  );
};