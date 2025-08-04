import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AdminModeContextType {
  isAdminMode: boolean;
  environment: string;
  toggleAdminMode: () => void;
  setAdminMode: (enabled: boolean) => void;
}

const AdminModeContext = createContext<AdminModeContextType | undefined>(undefined);

interface AdminModeProviderProps {
  children: ReactNode;
}

export const AdminModeProvider: React.FC<AdminModeProviderProps> = ({ children }) => {
  const [isAdminMode, setIsAdminMode] = useState<boolean>(false);
  const [environment, setEnvironment] = useState<string>('development');

  useEffect(() => {
    // Check for admin mode from multiple sources
    const checkAdminMode = () => {
      // Check environment variable
      const envAdminMode = import.meta.env.VITE_ADMIN_MODE === 'true';
      
      // Check current URL path
      const urlAdminMode = window.location.pathname.includes('/admin');
      
      // Check local storage for admin mode preference
      const storedAdminMode = localStorage.getItem('wombat-track-admin-mode') === 'true';
      
      // Determine environment
      const currentEnv = import.meta.env.MODE || 'development';
      setEnvironment(currentEnv);
      
      // Admin mode is active if any condition is met
      const adminModeActive = envAdminMode || urlAdminMode || storedAdminMode;
      
      setIsAdminMode(adminModeActive);
      
      // Apply admin theme classes to body
      if (adminModeActive) {
        document.body.classList.add('admin-mode');
        document.body.classList.add('admin-theme');
      } else {
        document.body.classList.remove('admin-mode');
        document.body.classList.remove('admin-theme');
      }
      
      console.log('🔐 Admin Mode Check:', JSON.stringify({
        envAdminMode,
        urlAdminMode,
        storedAdminMode,
        adminModeActive,
        environment: currentEnv
      }, null, 2));
    };

    checkAdminMode();

    // Listen for URL changes (for SPA routing)
    const handleLocationChange = () => {
      checkAdminMode();
    };

    window.addEventListener('popstate', handleLocationChange);
    
    // Listen for hash changes
    window.addEventListener('hashchange', handleLocationChange);

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  const toggleAdminMode = () => {
    const newMode = !isAdminMode;
    setIsAdminMode(newMode);
    
    // Store preference in localStorage
    localStorage.setItem('wombat-track-admin-mode', newMode.toString());
    
    // Apply theme classes
    if (newMode) {
      document.body.classList.add('admin-mode');
      document.body.classList.add('admin-theme');
    } else {
      document.body.classList.remove('admin-mode');
      document.body.classList.remove('admin-theme');
    }
    
    console.log(`🔐 Admin Mode ${newMode ? 'Enabled' : 'Disabled'}`);
  };

  const setAdminMode = (enabled: boolean) => {
    setIsAdminMode(enabled);
    
    localStorage.setItem('wombat-track-admin-mode', enabled.toString());
    
    if (enabled) {
      document.body.classList.add('admin-mode');
      document.body.classList.add('admin-theme');
    } else {
      document.body.classList.remove('admin-mode');
      document.body.classList.remove('admin-theme');
    }
  };

  const value: AdminModeContextType = {
    isAdminMode,
    environment,
    toggleAdminMode,
    setAdminMode
  };

  return (
    <AdminModeContext.Provider value={value}>
      {children}
    </AdminModeContext.Provider>
  );
};

export const useAdminMode = (): AdminModeContextType => {
  const context = useContext(AdminModeContext);
  if (context === undefined) {
    throw new Error('useAdminMode must be used within an AdminModeProvider');
  }
  return context;
};

export default AdminModeProvider;