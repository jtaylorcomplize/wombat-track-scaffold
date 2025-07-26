import React from 'react';
import type { LucideIcon } from 'lucide-react';

export interface EmptyStateProps {
  icon?: LucideIcon;
  emoji?: string;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  emoji,
  title,
  description,
  action,
  secondaryAction,
  className = ''
}) => {
  return (
    <div className={`text-center wt-breathing-room ${className}`}>
      {/* Icon or Emoji */}
      <div className="mb-6">
        {Icon && (
          <Icon 
            className="w-16 h-16 mx-auto"
            style={{ color: 'var(--wt-neutral-400)' }}
          />
        )}
        {emoji && !Icon && (
          <div className="text-6xl mb-4">{emoji}</div>
        )}
      </div>

      {/* Content */}
      <div className="mb-8">
        <h3 className="wt-heading-3 mb-3">{title}</h3>
        <p className="wt-body-large max-w-md mx-auto">{description}</p>
      </div>

      {/* Actions */}
      {(action || secondaryAction) && (
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          {action && (
            <button
              onClick={action.onClick}
              className={`${
                action.variant === 'secondary' ? 'wt-button-secondary' : 'wt-button-primary'
              } wt-focus-ring`}
            >
              {action.label}
            </button>
          )}
          
          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              className="wt-button-secondary wt-focus-ring"
            >
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
};