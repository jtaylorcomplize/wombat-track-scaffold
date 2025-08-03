import { useState, useEffect } from 'react';

interface AccordionState {
  [sectionId: string]: boolean;
}

interface UseAccordionStateReturn {
  expandedSections: AccordionState;
  toggleSection: (sectionId: string) => void;
  expandSection: (sectionId: string) => void;
  collapseSection: (sectionId: string) => void;
  setExpandedSections: (state: AccordionState) => void;
}

const STORAGE_KEY = 'wombat-track-accordion-state';

export const useAccordionState = (defaultState: AccordionState = {}): UseAccordionStateReturn => {
  const [expandedSections, setExpandedSectionsState] = useState<AccordionState>(() => {
    try {
      if (typeof window === 'undefined') {
        return defaultState;
      }
      
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge with defaults to handle new sections
        return { ...defaultState, ...parsed };
      }
      return defaultState;
    } catch (error) {
      console.warn('Failed to load accordion state from localStorage:', error);
      return defaultState;
    }
  });

  // Persist state to localStorage whenever it changes
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(expandedSections));
      }
    } catch (error) {
      console.warn('Failed to save accordion state to localStorage:', error);
    }
  }, [expandedSections]);

  const toggleSection = (sectionId: string) => {
    setExpandedSectionsState(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const expandSection = (sectionId: string) => {
    setExpandedSectionsState(prev => ({
      ...prev,
      [sectionId]: true
    }));
  };

  const collapseSection = (sectionId: string) => {
    setExpandedSectionsState(prev => ({
      ...prev,
      [sectionId]: false
    }));
  };

  const setExpandedSections = (state: AccordionState) => {
    setExpandedSectionsState(state);
  };

  return {
    expandedSections,
    toggleSection,
    expandSection,
    collapseSection,
    setExpandedSections
  };
};