import React from 'react';
import { Outlet } from 'react-router-dom';
import { EnhancedSidebarV3 } from './EnhancedSidebarV3';
import { OrbisHeader } from './OrbisHeader';
import { useNavigationContext } from '../../contexts/NavigationContext';
import { useSidebarState } from '../../hooks/useLocalStorage';
import { ErrorBoundary } from '../common/ErrorBoundary';

export const OrbisLayout: React.FC = () => {
  const { state: navState } = useNavigationContext();
  const { collapsed, setCollapsed } = useSidebarState();
  
  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Enhanced Sidebar v3.1 */}
      <EnhancedSidebarV3
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
        navigationState={navState}
      />
      
      {/* Main Content Area */}
      <div 
        className={`flex-1 flex flex-col transition-all duration-300 ${
          collapsed ? 'ml-16' : 'ml-80'
        }`}
      >
        {/* Header with Breadcrumbs */}
        <OrbisHeader breadcrumbs={navState.breadcrumbs} />
        
        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
};

export default OrbisLayout;