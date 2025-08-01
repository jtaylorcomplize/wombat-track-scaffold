import React from 'react';
import { Shield, ShieldOff } from 'lucide-react';
import { useAdminMode } from '../../contexts/AdminModeContext';

interface AdminModeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export const AdminModeToggle: React.FC<AdminModeToggleProps> = ({ 
  className = '', 
  showLabel = true 
}) => {
  const { isAdminMode, environment, toggleAdminMode } = useAdminMode();

  const handleToggle = () => {
    toggleAdminMode();
    
    // Log toggle action to governance
    const toggleEvent = {
      timestamp: new Date().toISOString(),
      event_type: 'admin_mode_toggle',
      user_id: 'admin_user',
      user_role: 'admin',
      resource_type: 'admin_interface',
      resource_id: 'admin_mode_toggle',
      action: isAdminMode ? 'disable_admin_mode' : 'enable_admin_mode',
      success: true,
      details: {
        operation: 'Admin Mode Toggle',
        previous_state: isAdminMode,
        new_state: !isAdminMode,
        environment: environment,
        toggle_method: 'manual_ui_toggle'
      },
      runtime_context: {
        phase: 'OF-BEV-3-Admin-UI',
        environment: 'admin_toggle',
        ui_component: 'AdminModeToggle'
      }
    };

    console.log('🔐 Admin Mode Toggle:', toggleEvent);
  };

  return (
    <button
      onClick={handleToggle}
      className={`
        admin-mode-toggle
        inline-flex items-center gap-2 px-3 py-2 rounded-md font-medium transition-all duration-200
        ${isAdminMode 
          ? 'bg-red-100 text-red-800 hover:bg-red-200 border border-red-300' 
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-300'
        }
        ${className}
      `}
      title={isAdminMode ? 'Exit Admin Mode' : 'Enter Admin Mode'}
      data-testid="admin-mode-toggle"
    >
      {isAdminMode ? (
        <ShieldOff size={16} className="text-red-600" />
      ) : (
        <Shield size={16} className="text-gray-500" />
      )}
      
      {showLabel && (
        <span className="text-sm">
          {isAdminMode ? 'Exit Admin' : 'Admin Mode'}
        </span>
      )}
      
      {/* Status indicator */}
      <div className={`
        w-2 h-2 rounded-full 
        ${isAdminMode ? 'bg-red-500 animate-pulse' : 'bg-gray-400'}
      `} />
    </button>
  );
};

export default AdminModeToggle;