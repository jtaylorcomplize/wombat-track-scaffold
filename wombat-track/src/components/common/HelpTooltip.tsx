import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';

export interface HelpTooltipProps {
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  trigger?: 'hover' | 'click';
  className?: string;
  iconSize?: 'small' | 'medium';
}

export const HelpTooltip: React.FC<HelpTooltipProps> = ({
  content,
  position = 'top',
  trigger = 'hover',
  className = '',
  iconSize = 'small'
}) => {
  const [isVisible, setIsVisible] = useState(false);

  const iconSizes = {
    small: 'w-4 h-4',
    medium: 'w-5 h-5'
  };

  const positionClasses = {
    top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 transform -translate-y-1/2 ml-2'
  };

  const arrowClasses = {
    top: 'top-full left-1/2 transform -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent',
    bottom: 'bottom-full left-1/2 transform -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent',
    left: 'left-full top-1/2 transform -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent',
    right: 'right-full top-1/2 transform -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent'
  };

  const handleMouseEnter = () => {
    if (trigger === 'hover') setIsVisible(true);
  };

  const handleMouseLeave = () => {
    if (trigger === 'hover') setIsVisible(false);
  };

  const handleClick = () => {
    if (trigger === 'click') setIsVisible(!isVisible);
  };

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        className="wt-focus-ring rounded-full transition-colors"
        style={{ color: 'var(--wt-neutral-500)' }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        aria-label="Help"
        type="button"
      >
        <HelpCircle className={iconSizes[iconSize]} />
      </button>

      {isVisible && (
        <div
          className={`absolute z-50 ${positionClasses[position]} wt-animate-fade-in`}
          style={{
            background: 'var(--wt-neutral-900)',
            color: 'var(--wt-neutral-0)',
            padding: 'var(--wt-space-3) var(--wt-space-4)',
            borderRadius: 'var(--wt-radius-md)',
            boxShadow: 'var(--wt-shadow-lg)',
            maxWidth: '250px',
            fontSize: 'var(--wt-text-sm)',
            lineHeight: 'var(--wt-leading-normal)',
            zIndex: 1000
          }}
          role="tooltip"
        >
          {content}
          
          {/* Arrow */}
          <div
            className={`absolute w-0 h-0 ${arrowClasses[position]}`}
            style={{
              borderWidth: '4px',
              borderStyle: 'solid',
              borderTopColor: position === 'bottom' ? 'var(--wt-neutral-900)' : 'transparent',
              borderBottomColor: position === 'top' ? 'var(--wt-neutral-900)' : 'transparent',
              borderLeftColor: position === 'right' ? 'var(--wt-neutral-900)' : 'transparent',
              borderRightColor: position === 'left' ? 'var(--wt-neutral-900)' : 'transparent'
            }}
          />
        </div>
      )}
    </div>
  );
};