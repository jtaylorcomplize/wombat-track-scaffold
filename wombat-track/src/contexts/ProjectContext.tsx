import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useCallback } from 'react';
import type { Project, Phase, PhaseStep } from '../types/phase';

interface GovernanceEvent {
  id: string;
  phaseStepId: string;
  newStatus: PhaseStep['status'];
  triggeredBy: string;
  eventType: 'StepStatusUpdated' | 'StepAdded' | 'StepRemoved' | 'PhaseUpdated';
  timestamp: string;
  details?: any;
}

interface ProjectContextType {
  projects: Project[];
  activeProjectId: string | undefined;
  governanceLog: GovernanceEvent[];
  setProjects: (projects: Project[]) => void;
  setActiveProjectId: (projectId: string) => void;
  updatePhaseStep: (projectId: string, phaseId: string, stepId: string, updates: Partial<PhaseStep>) => void;
  addPhaseStep: (projectId: string, phaseId: string, step: PhaseStep) => void;
  removePhaseStep: (projectId: string, phaseId: string, stepId: string) => void;
  updatePhase: (projectId: string, phaseId: string, updates: Partial<Phase>) => void;
  logGovernanceEvent: (event: Omit<GovernanceEvent, 'id' | 'timestamp'>) => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const useProjectContext = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProjectContext must be used within a ProjectProvider');
  }
  return context;
};

interface ProjectProviderProps {
  children: ReactNode;
  initialProjects?: Project[];
  initialActiveProjectId?: string;
}

export const ProjectProvider: React.FC<ProjectProviderProps> = ({ 
  children, 
  initialProjects = [], 
  initialActiveProjectId 
}) => {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [activeProjectId, setActiveProjectId] = useState<string | undefined>(initialActiveProjectId);
  const [governanceLog, setGovernanceLog] = useState<GovernanceEvent[]>([]);

  const logGovernanceEvent = useCallback((event: Omit<GovernanceEvent, 'id' | 'timestamp'>) => {
    const newEvent: GovernanceEvent = {
      ...event,
      id: `gov-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString()
    };
    
    setGovernanceLog(prev => [...prev, newEvent]);
    console.log('[Governance Log]', newEvent);
  }, []);

  const updatePhaseStep = useCallback((projectId: string, phaseId: string, stepId: string, updates: Partial<PhaseStep>) => {
    setProjects(prev => prev.map(project => {
      if (project.id !== projectId) return project;
      
      return {
        ...project,
        phases: project.phases.map(phase => {
          if (phase.id !== phaseId) return phase;
          
          return {
            ...phase,
            steps: phase.steps.map(step => {
              if (step.id !== stepId) return step;
              
              // Log status changes
              if (updates.status && updates.status !== step.status) {
                logGovernanceEvent({
                  phaseStepId: stepId,
                  newStatus: updates.status,
                  triggeredBy: 'current-user', // In real app, this would come from auth context
                  eventType: 'StepStatusUpdated',
                  details: {
                    previousStatus: step.status,
                    phaseId,
                    projectId
                  }
                });
              }
              
              return { ...step, ...updates };
            })
          };
        })
      };
    }));
  }, [logGovernanceEvent]);

  const addPhaseStep = useCallback((projectId: string, phaseId: string, step: PhaseStep) => {
    setProjects(prev => prev.map(project => {
      if (project.id !== projectId) return project;
      
      return {
        ...project,
        phases: project.phases.map(phase => {
          if (phase.id !== phaseId) return phase;
          
          logGovernanceEvent({
            phaseStepId: step.id,
            newStatus: step.status,
            triggeredBy: 'current-user',
            eventType: 'StepAdded',
            details: {
              stepName: step.name,
              phaseId,
              projectId
            }
          });
          
          return {
            ...phase,
            steps: [...phase.steps, step]
          };
        })
      };
    }));
  }, [logGovernanceEvent]);

  const removePhaseStep = useCallback((projectId: string, phaseId: string, stepId: string) => {
    setProjects(prev => prev.map(project => {
      if (project.id !== projectId) return project;
      
      return {
        ...project,
        phases: project.phases.map(phase => {
          if (phase.id !== phaseId) return phase;
          
          const stepToRemove = phase.steps.find(s => s.id === stepId);
          if (stepToRemove) {
            logGovernanceEvent({
              phaseStepId: stepId,
              newStatus: stepToRemove.status,
              triggeredBy: 'current-user',
              eventType: 'StepRemoved',
              details: {
                stepName: stepToRemove.name,
                phaseId,
                projectId
              }
            });
          }
          
          return {
            ...phase,
            steps: phase.steps.filter(step => step.id !== stepId)
          };
        })
      };
    }));
  }, [logGovernanceEvent]);

  const updatePhase = useCallback((projectId: string, phaseId: string, updates: Partial<Phase>) => {
    setProjects(prev => prev.map(project => {
      if (project.id !== projectId) return project;
      
      return {
        ...project,
        phases: project.phases.map(phase => {
          if (phase.id !== phaseId) return phase;
          
          logGovernanceEvent({
            phaseStepId: phaseId,
            newStatus: 'not_started', // Phase-level event
            triggeredBy: 'current-user',
            eventType: 'PhaseUpdated',
            details: {
              updates,
              projectId
            }
          });
          
          return { ...phase, ...updates };
        })
      };
    }));
  }, [logGovernanceEvent]);

  const value: ProjectContextType = {
    projects,
    activeProjectId,
    governanceLog,
    setProjects,
    setActiveProjectId,
    updatePhaseStep,
    addPhaseStep,
    removePhaseStep,
    updatePhase,
    logGovernanceEvent
  };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
};