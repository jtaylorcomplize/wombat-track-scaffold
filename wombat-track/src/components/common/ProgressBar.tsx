import React from 'react';

export interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  showPercentage?: boolean;
  size?: 'small' | 'medium' | 'large';
  variant?: 'default' | 'success' | 'warning' | 'error';
  animated?: boolean;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  label,
  showPercentage = false,
  size = 'medium',
  variant = 'default',
  animated = true,
  className = ''
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  
  const sizeStyles = {
    small: { height: '4px' },
    medium: { height: '8px' },
    large: { height: '12px' }
  };

  const variantStyles = {
    default: {
      background: `linear-gradient(90deg, var(--wt-primary-500), var(--wt-primary-600))`
    },
    success: {
      background: `linear-gradient(90deg, var(--wt-success-500), var(--wt-success-600))`
    },
    warning: {
      background: `linear-gradient(90deg, var(--wt-warning-500), var(--wt-warning-600))`
    },
    error: {
      background: `linear-gradient(90deg, var(--wt-error-500), var(--wt-error-600))`
    }
  };

  return (
    <div className={`${className}`}>
      {(label || showPercentage) && (
        <div className="flex justify-between items-center mb-2">
          {label && <span className="wt-body-small">{label}</span>}
          {showPercentage && (
            <span className="wt-caption">{Math.round(percentage)}%</span>
          )}
        </div>
      )}
      
      <div 
        className="wt-progress-bar"
        style={sizeStyles[size]}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label || 'Progress'}
      >
        <div
          className={`wt-progress-fill ${animated ? '' : 'no-animation'}`}
          style={{
            width: `${percentage}%`,
            ...variantStyles[variant]
          }}
        />
      </div>
    </div>
  );
};