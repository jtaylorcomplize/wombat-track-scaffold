import React, { useState, useEffect } from 'react';
import { AppLayout } from './AppLayout';
import { AdminBanner } from '../admin/AdminBanner';
import { useAdminMode } from '../../contexts/AdminModeContext';
import type { Project } from '../../types/phase';

export interface AdminAppLayoutProps {
  initialProjects?: Project[];
}

export const AdminAppLayout: React.FC<AdminAppLayoutProps> = ({ initialProjects }) => {
  const { isAdminMode, environment } = useAdminMode();
  const [bannerRendered, setBannerRendered] = useState(false);

  const handleBannerRender = () => {
    setBannerRendered(true);
    console.log('🔐 Admin banner rendered successfully');
  };

  // Log admin mode activation
  useEffect(() => {
    if (isAdminMode && !bannerRendered) {
      console.log('🔐 Admin Mode Detected:', {
        environment,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        location: window.location.href
      });
    }
  }, [isAdminMode, environment, bannerRendered]);

  return (
    <div className={`admin-app-layout ${isAdminMode ? 'admin-mode-active' : ''}`}>
      {/* Admin Mode Banner - Only show in admin mode */}
      {isAdminMode && (
        <AdminBanner 
          environment={environment}
          onBannerRender={handleBannerRender}
        />
      )}
      
      {/* Main Application Layout */}
      <AppLayout initialProjects={initialProjects} />
    </div>
  );
};

export default AdminAppLayout;