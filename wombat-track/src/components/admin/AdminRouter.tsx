import React, { useEffect } from 'react';
import { useAdminMode } from '../../contexts/AdminModeContext';
import DataExplorer from '../../pages/admin/DataExplorer';
import ImportExport from '../../pages/admin/ImportExport';
import RuntimeStatus from '../../pages/admin/RuntimeStatus';
import DataIntegrity from '../../pages/admin/DataIntegrity';
import { SecretsManager } from './SecretsManager';
import { Shield } from 'lucide-react';

export type AdminRoute = 'data-explorer' | 'import-export' | 'orphan-inspector' | 'runtime-panel' | 'secrets-manager';

interface AdminRouterProps {
  currentRoute: AdminRoute;
}

export const AdminRouter: React.FC<AdminRouterProps> = ({ currentRoute }) => {
  const { isAdminMode } = useAdminMode();

  useEffect(() => {
    // Log admin route access
    if (isAdminMode) {
      console.log('🔐 Admin route accessed:', {
        route: currentRoute,
        timestamp: new Date().toISOString(),
        path: window.location.pathname
      });
    }
  }, [currentRoute, isAdminMode]);

  // Check admin mode access
  if (!isAdminMode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
          <Shield className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Admin Access Required</h2>
          <p className="text-gray-600 mb-6">
            You need to enable Admin Mode to access backend database management tools.
          </p>
          <p className="text-sm text-gray-500">
            Enable Admin Mode from the sidebar or set VITE_ADMIN_MODE=true in your environment.
          </p>
        </div>
      </div>
    );
  }

  // Render the appropriate admin component based on route
  switch (currentRoute) {
    case 'data-explorer':
      return <DataExplorer />;
    case 'import-export':
      return <ImportExport />;
    case 'orphan-inspector':
      return <DataIntegrity />;
    case 'runtime-panel':
      return <RuntimeStatus />;
    case 'secrets-manager':
      return <SecretsManager />;
    default:
      return <DataExplorer />;
  }
};

export default AdminRouter;