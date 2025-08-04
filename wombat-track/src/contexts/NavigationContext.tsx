import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { governanceLogger } from '../services/governanceLogger';

export type NavigationLevel = 'platform' | 'strategic' | 'operational';
export type StrategicSurface = 'all-projects' | 'dashboard' | 'teams' | 'strategy';
export type WorkSurface = 'plan' | 'execute' | 'document' | 'govern';

interface NavigationState {
  level: NavigationLevel;
  strategicSurface?: StrategicSurface;
  subAppId?: string;
  projectId?: string;
  workSurface?: WorkSurface;
  breadcrumbs: BreadcrumbItem[];
}

interface BreadcrumbItem {
  label: string;
  path: string;
  level: NavigationLevel;
}

interface NavigationContextValue {
  state: NavigationState;
  navigateToStrategic: (surface: StrategicSurface) => void;
  navigateToSubApp: (subAppId: string) => void;
  navigateToProject: (subAppId: string, projectId: string) => void;
  navigateToWorkSurface: (surface: WorkSurface) => void;
  updateBreadcrumbs: () => void;
}

const NavigationContext = createContext<NavigationContextValue | undefined>(undefined);

export const useNavigationContext = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigationContext must be used within NavigationContextProvider');
  }
  return context;
};

interface NavigationContextProviderProps {
  children: React.ReactNode;
}

export const NavigationContextProvider: React.FC<NavigationContextProviderProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [state, setState] = useState<NavigationState>({
    level: 'platform',
    breadcrumbs: [{ label: 'Orbis Platform', path: '/orbis', level: 'platform' }]
  });

  // Parse current route and update navigation state
  useEffect(() => {
    const path = location.pathname;
    const newState: NavigationState = {
      level: 'platform',
      breadcrumbs: [{ label: 'Orbis Platform', path: '/orbis', level: 'platform' }]
    };

    // Strategic routes: /orbis/projects/*
    if (path.startsWith('/orbis/projects/')) {
      newState.level = 'strategic';
      const segment = path.split('/')[3];
      
      switch (segment) {
        case 'all-projects':
          newState.strategicSurface = 'all-projects';
          newState.breadcrumbs.push({ 
            label: 'All Projects', 
            path: '/orbis/projects/all-projects', 
            level: 'strategic' 
          });
          break;
        case 'dashboard':
          newState.strategicSurface = 'dashboard';
          newState.breadcrumbs.push({ 
            label: 'Project Analytics', 
            path: '/orbis/projects/dashboard', 
            level: 'strategic' 
          });
          break;
        case 'teams':
          newState.strategicSurface = 'teams';
          newState.breadcrumbs.push({ 
            label: 'Team Overview', 
            path: '/orbis/projects/teams', 
            level: 'strategic' 
          });
          break;
        case 'strategy':
          newState.strategicSurface = 'strategy';
          newState.breadcrumbs.push({ 
            label: 'Strategic Planning', 
            path: '/orbis/projects/strategy', 
            level: 'strategic' 
          });
          break;
      }
    }
    
    // Operational routes: /orbis/sub-apps/:subAppId/*
    else if (path.startsWith('/orbis/sub-apps/')) {
      newState.level = 'operational';
      const segments = path.split('/').filter(s => s);
      
      if (segments.length >= 3) {
        const subAppId = segments[2];
        newState.subAppId = subAppId;
        newState.breadcrumbs.push({ 
          label: getSubAppName(subAppId), 
          path: `/orbis/sub-apps/${subAppId}`, 
          level: 'operational' 
        });
        
        // Check for nested project route
        if (segments[3] === 'projects' && segments[4]) {
          const projectId = segments[4];
          newState.projectId = projectId;
          newState.breadcrumbs.push({ 
            label: getProjectName(projectId), 
            path: `/orbis/sub-apps/${subAppId}/projects/${projectId}`, 
            level: 'operational' 
          });
          
          // Check for work surface
          if (segments[5]) {
            const surface = segments[5] as WorkSurface;
            newState.workSurface = surface;
            newState.breadcrumbs.push({ 
              label: getWorkSurfaceLabel(surface), 
              path: `/orbis/sub-apps/${subAppId}/projects/${projectId}/${surface}`, 
              level: 'operational' 
            });
          }
        }
      }
    }

    setState(newState);
  }, [location]);

  // Navigation functions with governance logging
  const navigateToStrategic = (surface: StrategicSurface) => {
    governanceLogger.logSidebarInteraction({
      action: 'surface_switch',
      target: surface,
      context: 'sidebar_navigation',
      metadata: {
        navigation_type: 'strategic',
        from_level: state.level,
        to_surface: surface
      }
    });
    
    navigate(`/orbis/projects/${surface}`);
  };

  const navigateToSubApp = (subAppId: string) => {
    governanceLogger.logSidebarInteraction({
      action: 'sub_app_launch',
      target: subAppId,
      context: 'sidebar_navigation',
      metadata: {
        navigation_type: 'operational',
        from_level: state.level,
        sub_app_id: subAppId
      }
    });
    
    navigate(`/orbis/sub-apps/${subAppId}`);
  };

  const navigateToProject = (subAppId: string, projectId: string) => {
    governanceLogger.logSidebarInteraction({
      action: 'project_switch',
      target: projectId,
      context: 'sidebar_navigation',
      metadata: {
        navigation_type: 'operational',
        sub_app_id: subAppId,
        project_id: projectId
      }
    });
    
    navigate(`/orbis/sub-apps/${subAppId}/projects/${projectId}`);
  };

  const navigateToWorkSurface = (surface: WorkSurface) => {
    if (!state.subAppId || !state.projectId) {
      console.error('Cannot navigate to work surface without subApp and project context');
      return;
    }
    
    governanceLogger.logSidebarInteraction({
      action: 'surface_switch',
      target: surface,
      context: 'sidebar_navigation',
      metadata: {
        navigation_type: 'work_surface',
        sub_app_id: state.subAppId,
        project_id: state.projectId,
        from_surface: state.workSurface,
        to_surface: surface
      }
    });
    
    navigate(`/orbis/sub-apps/${state.subAppId}/projects/${state.projectId}/${surface}`);
  };

  const updateBreadcrumbs = () => {
    // Breadcrumbs are automatically updated via useEffect
  };

  // Helper functions (would be replaced with actual data lookups)
  const getSubAppName = (subAppId: string): string => {
    const names: Record<string, string> = {
      'prog-orbis-001': 'Orbis Intelligence',
      'prog-complize-001': 'Complize Platform',
      'prog-spqr-001': 'SPQR', 
      'prog-roam-001': 'Roam'
    };
    return names[subAppId] || subAppId;
  };

  const getProjectName = (projectId: string): string => {
    // In real implementation, would look up from project data
    return `Project ${projectId}`;
  };

  const getWorkSurfaceLabel = (surface: WorkSurface): string => {
    const labels: Record<WorkSurface, string> = {
      plan: 'Plan',
      execute: 'Execute',
      document: 'Document',
      govern: 'Govern'
    };
    return labels[surface];
  };

  const contextValue: NavigationContextValue = {
    state,
    navigateToStrategic,
    navigateToSubApp,
    navigateToProject,
    navigateToWorkSurface,
    updateBreadcrumbs
  };

  return (
    <NavigationContext.Provider value={contextValue}>
      {children}
    </NavigationContext.Provider>
  );
};