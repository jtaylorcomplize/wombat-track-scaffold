import React from 'react';

export interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  className?: string;
  color?: 'primary' | 'white' | 'gray';
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  className = '',
  color = 'primary'
}) => {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-6 h-6',
    large: 'w-8 h-8'
  };

  const colorStyles = {
    primary: { color: 'var(--wt-primary-600)' },
    white: { color: 'var(--wt-neutral-0)' },
    gray: { color: 'var(--wt-neutral-400)' }
  };

  return (
    <div
      className={`inline-block animate-spin ${sizeClasses[size]} ${className}`}
      style={colorStyles[color]}
      role="status"
      aria-label="Loading"
    >
      <svg
        fill="none"
        viewBox="0 0 24 24"
        className="w-full h-full"
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
          className="opacity-25"
        />
        <path
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          className="opacity-75"
        />
      </svg>
    </div>
  );
};