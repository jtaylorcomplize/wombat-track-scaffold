import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface SidebarSectionProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  isAdminMode?: boolean;
  className?: string;
}

export const SidebarSection: React.FC<SidebarSectionProps> = ({
  title,
  icon,
  children,
  defaultExpanded = true,
  isAdminMode = false,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className={`sidebar-section ${className}`}>
      <button
        onClick={toggleExpanded}
        className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
          isAdminMode
            ? 'text-gray-200 hover:bg-gray-700 hover:text-white'
            : 'text-gray-700 hover:bg-gray-100'
        }`}
      >
        <div className="flex items-center space-x-2">
          {icon && (
            <span className={isAdminMode ? 'text-gray-300' : 'text-gray-500'}>
              {icon}
            </span>
          )}
          <span className="font-medium text-sm uppercase tracking-wider">
            {title}
          </span>
        </div>
        <span className={isAdminMode ? 'text-gray-400' : 'text-gray-500'}>
          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </span>
      </button>
      
      {isExpanded && (
        <div className="mt-2 pl-2">
          {children}
        </div>
      )}
    </div>
  );
};

export default SidebarSection;