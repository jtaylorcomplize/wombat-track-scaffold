import React, { useState } from 'react';
import { Lightbulb, X, ChevronRight } from 'lucide-react';

export interface SmartSuggestionProps {
  title: string;
  description: string;
  actions?: Array<{
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
  }>;
  dismissible?: boolean;
  onDismiss?: () => void;
  variant?: 'info' | 'tip' | 'warning';
  className?: string;
}

export const SmartSuggestion: React.FC<SmartSuggestionProps> = ({
  title,
  description,
  actions = [],
  dismissible = true,
  onDismiss,
  variant = 'tip',
  className = ''
}) => {
  const [isDismissed, setIsDismissed] = useState(false);

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  if (isDismissed) return null;

  const variantStyles = {
    info: {
      background: 'var(--wt-primary-50)',
      border: 'var(--wt-primary-200)',
      iconColor: 'var(--wt-primary-600)'
    },
    tip: {
      background: 'var(--wt-warning-50)',
      border: 'var(--wt-warning-200)',
      iconColor: 'var(--wt-warning-600)'
    },
    warning: {
      background: 'var(--wt-error-50)',
      border: 'var(--wt-error-200)',
      iconColor: 'var(--wt-error-600)'
    }
  };

  const style = variantStyles[variant];

  return (
    <div
      className={`wt-card wt-animate-slide-in-left ${className}`}
      style={{
        background: style.background,
        borderColor: style.border,
        padding: 'var(--wt-space-5)',
        marginBottom: 'var(--wt-space-4)'
      }}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 mt-1">
          <Lightbulb 
            className="w-5 h-5"
            style={{ color: style.iconColor }}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className="wt-heading-5 mb-2">{title}</h4>
          <p className="wt-body-small mb-4">{description}</p>

          {/* Actions */}
          {actions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {actions.map((action, index) => (
                <button
                  key={index}
                  onClick={action.onClick}
                  className={`${
                    action.variant === 'primary' ? 'wt-button-primary' : 'wt-button-secondary'
                  } wt-focus-ring inline-flex items-center gap-1 text-xs`}
                  style={{
                    padding: 'var(--wt-space-2) var(--wt-space-3)',
                    fontSize: 'var(--wt-text-xs)'
                  }}
                >
                  {action.label}
                  <ChevronRight className="w-3 h-3" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Dismiss Button */}
        {dismissible && (
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 wt-focus-ring rounded-full p-1 transition-colors"
            style={{ color: 'var(--wt-neutral-500)' }}
            aria-label="Dismiss suggestion"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};