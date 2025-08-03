import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface BreadcrumbItem {
  label: string;
  path: string;
  level: string;
}

interface OrbisHeaderProps {
  breadcrumbs: BreadcrumbItem[];
}

export const OrbisHeader: React.FC<OrbisHeaderProps> = ({ breadcrumbs }) => {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
      <div className="px-6 py-4">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center space-x-2 text-sm" aria-label="Breadcrumb">
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={crumb.path}>
              {index === 0 ? (
                <button
                  onClick={() => navigate(crumb.path)}
                  className="flex items-center space-x-1 text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <Home className="w-4 h-4" />
                  <span>{crumb.label}</span>
                </button>
              ) : (
                <>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                  {index === breadcrumbs.length - 1 ? (
                    <span className="font-medium text-gray-900">{crumb.label}</span>
                  ) : (
                    <button
                      onClick={() => navigate(crumb.path)}
                      className="text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      {crumb.label}
                    </button>
                  )}
                </>
              )}
            </React.Fragment>
          ))}
        </nav>

        {/* Quick Actions */}
        <div className="mt-3 flex items-center justify-between">
          <div className="text-xs text-gray-500">
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </div>
          
          <div className="flex items-center space-x-2">
            <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">
              ⌘K
            </kbd>
            <span className="text-xs text-gray-500">Quick Search</span>
          </div>
        </div>
      </div>
    </header>
  );
};