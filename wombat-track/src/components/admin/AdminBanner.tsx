import React, { useEffect } from 'react';
import { Shield } from 'lucide-react';

interface AdminBannerProps {
  environment?: string;
  onBannerRender?: () => void;
}

export const AdminBanner: React.FC<AdminBannerProps> = ({ 
  environment = 'localhost', 
  onBannerRender 
}) => {
  useEffect(() => {
    // Log banner render event to governance
    const logBannerRender = async () => {
      const governanceEntry = {
        timestamp: new Date().toISOString(),
        event_type: 'admin_mode_ui_activated',
        user_id: 'admin_user',
        user_role: 'admin',
        resource_type: 'admin_interface',
        resource_id: 'of-bev-admin-console',
        action: 'render_admin_banner',
        success: true,
        details: {
          operation: 'Admin Mode UI Banner Activation',
          phase: 'OF-BEV-Phase-3',
          environment: environment,
          banner_type: 'admin_mode_indicator',
          ui_differentiation: 'active',
          local_backend_access: true
        },
        runtime_context: {
          phase: 'OF-BEV-3-Admin-UI',
          environment: 'admin_mode',
          ui_component: 'AdminBanner',
          memoryplugin_anchor: `of-bev-admin-ui-banner-${Date.now()}`
        }
      };

      try {
        // In a real application, this would send to the governance API
        console.log('📋 Admin Banner Governance Log:', governanceEntry);
        
        // Call the callback if provided
        if (onBannerRender) {
          onBannerRender();
        }
      } catch (error) {
        console.error('Failed to log admin banner render:', error);
      }
    };

    logBannerRender();
  }, [environment, onBannerRender]);

  return (
    <div className="admin-banner bg-red-700 text-white font-bold text-center py-3 px-4 shadow-md sticky top-0 z-50">
      <div className="flex items-center justify-center space-x-2">
        <Shield size={20} className="text-white" />
        <span className="text-sm md:text-base">
          🔐 ADMIN MODE – Local Backend Access (Phase 3)
        </span>
        <div className="hidden md:flex items-center space-x-2 ml-4">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-xs text-red-100">
            Environment: {environment}
          </span>
        </div>
      </div>
      
      {/* Warning message for mobile */}
      <div className="md:hidden mt-1">
        <span className="text-xs text-red-200">
          Admin Console - {environment}
        </span>
      </div>
    </div>
  );
};

export default AdminBanner;