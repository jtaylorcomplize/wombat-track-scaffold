import { useState } from 'react';

type SetValue<T> = T | ((val: T) => T);

export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: SetValue<T>) => void] {
  // Get value from localStorage or use initialValue
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      if (typeof window === 'undefined') {
        return initialValue;
      }
      
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Return a wrapped version of useState's setter function that persists the new value to localStorage
  const setValue = (value: SetValue<T>) => {
    try {
      // Allow value to be a function to have the same API as useState
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      
      // Save state
      setStoredValue(valueToStore);
      
      // Save to localStorage
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue];
}

// Hook for persisting sidebar state
export function useSidebarState() {
  const [collapsed, setCollapsed] = useLocalStorage('wombat-track-sidebar-collapsed', false);
  const [selectedSurface, setSelectedSurface] = useLocalStorage('wombat-track-selected-surface', 'plan');
  const [currentSubApp, setCurrentSubApp] = useLocalStorage('wombat-track-current-subapp', 'prog-orbis-001');
  
  return {
    collapsed,
    setCollapsed,
    selectedSurface,
    setSelectedSurface,
    currentSubApp,
    setCurrentSubApp
  };
}

// Hook for persisting project context
export function useProjectState() {
  const [activeProjectId, setActiveProjectId] = useLocalStorage('wombat-track-active-project', '');
  const [recentProjects, setRecentProjects] = useLocalStorage<string[]>('wombat-track-recent-projects', []);
  
  const addToRecentProjects = (projectId: string) => {
    setRecentProjects(prev => {
      const filtered = prev.filter(id => id !== projectId);
      return [projectId, ...filtered].slice(0, 5); // Keep last 5 projects
    });
  };

  return {
    activeProjectId,
    setActiveProjectId,
    recentProjects,
    addToRecentProjects
  };
}