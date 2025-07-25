import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import type { Phase, PhaseStep } from '../types/phase';
import type { TemplateExecution } from '../types/template';
import { ProjectSwitcher } from './project/ProjectSwitcher';
import { fetchExecutionLogs } from '../api/executionLogAPI';
import { triggerTemplate } from '../lib/templateDispatcher';
import { getPhaseStatus, getPhaseProgress } from '../utils/phaseStatus';
import { useProjectContext } from '../contexts/ProjectContext';

interface ProjectDashboardProps {
  onViewLogs?: (executionId: string) => void;
  readOnly?: boolean;
}

export const ProjectDashboard: React.FC<ProjectDashboardProps> = ({
  onViewLogs,
  readOnly = false
}) => {
  const { projects, activeProjectId, setActiveProjectId, updatePhaseStep } = useProjectContext();
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());
  const [executionMap, setExecutionMap] = useState<Map<string, TemplateExecution>>(new Map());
  const [loadingSteps, setLoadingSteps] = useState<Set<string>>(new Set());

  const activeProject = projects.find(p => p.id === activeProjectId);

  // Initialize expanded phases on mount
  useEffect(() => {
    if (activeProject) {
      setExpandedPhases(new Set(activeProject.phases.map(phase => phase.id)));
    }
  }, [activeProject]);

  // Fetch execution logs for steps with executionIds
  useEffect(() => {
    const fetchExecutions = async () => {
      try {
        const logs = await fetchExecutionLogs();
        const execMap = new Map<string, TemplateExecution>();
        
        logs.forEach(log => {
          execMap.set(log.executionId, log);
        });
        
        setExecutionMap(execMap);
      } catch (error) {
        console.error('Failed to fetch execution logs:', error);
      }
    };

    fetchExecutions();
    const interval = setInterval(fetchExecutions, 2000);
    
    return () => clearInterval(interval);
  }, []);

  const togglePhase = (phaseId: string) => {
    setExpandedPhases(prev => {
      const newSet = new Set(prev);
      if (newSet.has(phaseId)) {
        newSet.delete(phaseId);
      } else {
        newSet.add(phaseId);
      }
      return newSet;
    });
  };

  const getRagStatusColor = (ragStatus?: Phase['ragStatus']) => {
    switch (ragStatus) {
      case 'red': return '#ef4444';
      case 'amber': return '#f59e0b';
      case 'green': return '#10b981';
      case 'blue': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  const getStatusColor = (status: PhaseStep['status']) => {
    switch (status) {
      case 'not_started': return '#9ca3af';
      case 'in_progress': return '#f59e0b';
      case 'complete': return '#10b981';
      case 'error': return '#ef4444';
      default: return '#9ca3af';
    }
  };

  const getStatusIcon = (status: PhaseStep['status']) => {
    switch (status) {
      case 'not_started': return '○';
      case 'in_progress': return '⏳';
      case 'complete': return '✅';
      case 'error': return '❌';
      default: return '○';
    }
  };

  const handleStartStep = async (phase: Phase, step: PhaseStep) => {
    if (step.templateId) {
      setLoadingSteps(prev => new Set(prev).add(step.id));
      
      try {
        const result = await triggerTemplate(step.templateId, `${activeProject?.name}-${step.name}`);
        
        if (activeProject) {
          updatePhaseStep(activeProject.id, phase.id, step.id, {
            status: 'in_progress',
            startedAt: new Date().toISOString(),
            executionId: result.executionId
          });
        }
      } catch (error) {
        console.error(`Failed to start step ${step.name}:`, error);
      } finally {
        setLoadingSteps(prev => {
          const next = new Set(prev);
          next.delete(step.id);
          return next;
        });
      }
    } else if (activeProject) {
      updatePhaseStep(activeProject.id, phase.id, step.id, {
        status: 'in_progress',
        startedAt: new Date().toISOString()
      });
    }
  };

  const handleCompleteStep = (phase: Phase, step: PhaseStep) => {
    if (activeProject) {
      updatePhaseStep(activeProject.id, phase.id, step.id, {
        status: 'complete',
        completedAt: new Date().toISOString()
      });
    }
  };

  const handleViewLogs = (executionId: string) => {
    if (onViewLogs) {
      onViewLogs(executionId);
    } else {
      console.log(`View log for execution: ${executionId}`);
      alert(`Viewing logs for execution: ${executionId}\nCheck console for details.`);
    }
  };

  if (!activeProject) {
    return (
      <div style={{ fontFamily: 'system-ui, sans-serif', padding: '20px' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '20px',
          padding: '12px 0',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#1f2937', margin: 0 }}>
            📊 Project Dashboard
          </h2>
          <ProjectSwitcher
            projects={projects}
            activeProjectId={activeProjectId}
            onProjectSelect={setActiveProjectId}
          />
        </div>
        
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          color: '#6b7280',
          backgroundColor: '#f9fafb',
          borderRadius: '8px',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📑</div>
          <h2 style={{ fontSize: '24px', marginBottom: '8px', color: '#1f2937' }}>No Project Selected</h2>
          <p style={{ fontSize: '16px' }}>
            Select a project from the switcher above to view its dashboard.
          </p>
        </div>
      </div>
    );
  }

  const totalSteps = activeProject.phases.reduce((acc, phase) => acc + phase.steps.length, 0);
  const completedSteps = activeProject.phases.reduce((acc, phase) => 
    acc + phase.steps.filter(step => step.status === 'complete').length, 0);
  const progressPercentage = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: '20px' }}>
      {/* Header with ProjectSwitcher */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '20px',
        padding: '12px 0',
        borderBottom: '1px solid #e5e7eb'
      }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#1f2937', margin: 0 }}>
            📊 Project Dashboard
          </h2>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center',
            gap: '12px',
            marginTop: '6px'
          }}>
            <div style={{
              fontSize: '14px',
              fontWeight: '600',
              color: activeProject.status === 'Active' ? '#10b981' : '#6b7280',
              padding: '4px 8px',
              backgroundColor: activeProject.status === 'Active' ? '#10b98120' : '#f3f4f6',
              borderRadius: '12px',
              border: `1px solid ${activeProject.status === 'Active' ? '#10b981' : '#d1d5db'}`
            }}>
              {activeProject.status}
            </div>
            <div style={{
              fontSize: '14px',
              color: '#4b5563',
              padding: '4px 8px',
              backgroundColor: '#f3f4f6',
              borderRadius: '12px'
            }}>
              {progressPercentage}% Complete ({completedSteps}/{totalSteps} steps)
            </div>
          </div>
        </div>
        
        <ProjectSwitcher
          projects={projects}
          activeProjectId={activeProjectId}
          onProjectSelect={setActiveProjectId}
        />
      </div>

      {/* Project Description */}
      {activeProject.description && (
        <div style={{
          padding: '16px',
          backgroundColor: '#f8fafc',
          borderRadius: '8px',
          marginBottom: '20px',
          borderLeft: '4px solid #3b82f6'
        }}>
          <div style={{ fontSize: '14px', color: '#4b5563' }}>
            {activeProject.description}
          </div>
        </div>
      )}

      {/* Phases List */}
      <div className="phases-container" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {activeProject.phases
          .sort((a, b) => a.order - b.order)
          .map((phase, phaseIndex) => {
            const phaseStatus = getPhaseStatus(phase);
            const phaseProgress = getPhaseProgress(phase);
            const isExpanded = expandedPhases.has(phase.id);
            
            return (
              <div
                key={phase.id}
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  backgroundColor: 'white',
                  overflow: 'hidden'
                }}
              >
                {/* Phase Header */}
                <div
                  onClick={() => togglePhase(phase.id)}
                  style={{
                    padding: '16px',
                    cursor: 'pointer',
                    backgroundColor: isExpanded ? '#f8fafc' : '#ffffff',
                    borderBottom: isExpanded ? '1px solid #e5e7eb' : 'none',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {isExpanded ? (
                          <ChevronDown size={16} style={{ color: '#6b7280' }} />
                        ) : (
                          <ChevronRight size={16} style={{ color: '#6b7280' }} />
                        )}
                        <div style={{
                          fontSize: '12px',
                          padding: '2px 6px',
                          backgroundColor: '#e5e7eb',
                          borderRadius: '4px',
                          color: '#6b7280',
                          fontWeight: '500'
                        }}>
                          Phase {phaseIndex + 1}
                        </div>
                      </div>
                      
                      <h3 style={{ 
                        fontSize: '16px', 
                        fontWeight: '600', 
                        color: '#1f2937',
                        margin: 0 
                      }}>
                        {phase.name}
                      </h3>
                      
                      {/* RAG Status Badge */}
                      {phase.ragStatus && (
                        <div style={{
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          backgroundColor: getRagStatusColor(phase.ragStatus),
                          border: '2px solid white',
                          boxShadow: '0 0 0 1px rgba(0,0,0,0.1)'
                        }} />
                      )}
                      
                      {/* Phase Status Badge */}
                      <div style={{
                        fontSize: '11px',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        backgroundColor: getStatusColor(phaseStatus as PhaseStep['status']) + '20',
                        color: getStatusColor(phaseStatus as PhaseStep['status']),
                        fontWeight: '600'
                      }}>
                        {phaseStatus.replace('_', ' ')}
                      </div>
                      
                      {/* Progress Badge */}
                      <div style={{
                        fontSize: '11px',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        backgroundColor: '#f3f4f6',
                        color: '#6b7280'
                      }}>
                        {phaseProgress}% ({phase.steps.filter(s => s.status === 'complete').length}/{phase.steps.length})
                      </div>
                    </div>
                    
                    {phase.description && (
                      <div style={{ 
                        fontSize: '13px', 
                        color: '#6b7280',
                        marginLeft: '24px'
                      }}>
                        {phase.description}
                      </div>
                    )}
                  </div>
                </div>

                {/* Phase Steps */}
                {isExpanded && (
                  <div style={{ padding: '0 16px 16px 16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {phase.steps.map((step) => {
                        const execution = step.executionId ? executionMap.get(step.executionId) : null;
                        const isLoading = loadingSteps.has(step.id);
                        
                        return (
                          <div
                            key={step.id}
                            style={{
                              padding: '12px',
                              backgroundColor: '#fafbfc',
                              border: '1px solid #e5e7eb',
                              borderRadius: '6px',
                              marginLeft: '24px'
                            }}
                          >
                            <div style={{ 
                              display: 'flex', 
                              justifyContent: 'space-between',
                              alignItems: 'flex-start'
                            }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  gap: '8px',
                                  marginBottom: '4px'
                                }}>
                                  <span style={{
                                    fontSize: '14px',
                                    color: getStatusColor(step.status)
                                  }}>
                                    {getStatusIcon(step.status)}
                                  </span>
                                  
                                  <span style={{
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    color: '#1f2937'
                                  }}>
                                    {step.name}
                                  </span>
                                  
                                  <span style={{
                                    fontSize: '11px',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    backgroundColor: getStatusColor(step.status) + '20',
                                    color: getStatusColor(step.status),
                                    fontWeight: '600'
                                  }}>
                                    {step.status.replace('_', ' ')}
                                  </span>
                                  
                                  {step.isSideQuest && (
                                    <span style={{
                                      fontSize: '10px',
                                      padding: '2px 4px',
                                      borderRadius: '3px',
                                      backgroundColor: '#f3e8ff',
                                      color: '#7c3aed'
                                    }}>
                                      SIDE QUEST
                                    </span>
                                  )}
                                  
                                  {step.templateId && (
                                    <span style={{
                                      fontSize: '10px',
                                      padding: '2px 4px',
                                      borderRadius: '3px',
                                      backgroundColor: '#e0e7ff',
                                      color: '#4338ca'
                                    }}>
                                      {step.templateId}
                                    </span>
                                  )}
                                </div>
                                
                                {step.description && (
                                  <p style={{ 
                                    fontSize: '12px', 
                                    color: '#6b7280',
                                    marginBottom: '4px',
                                    marginLeft: '22px'
                                  }}>
                                    {step.description}
                                  </p>
                                )}

                                {/* Execution Info */}
                                {execution && (
                                  <div style={{
                                    fontSize: '11px',
                                    color: '#6b7280',
                                    marginTop: '4px',
                                    marginLeft: '22px',
                                    padding: '4px 8px',
                                    backgroundColor: '#f3f4f6',
                                    borderRadius: '4px',
                                    display: 'inline-block'
                                  }}>
                                    Execution: {execution.platform} • {execution.status}
                                    {execution.endTime && ` • ${Math.round((execution.endTime.getTime() - execution.startTime.getTime()) / 1000)}s`}
                                  </div>
                                )}

                                {/* Timing Info */}
                                {(step.startedAt || step.completedAt) && (
                                  <div style={{ 
                                    fontSize: '11px', 
                                    color: '#6b7280',
                                    marginTop: '4px',
                                    marginLeft: '22px'
                                  }}>
                                    {step.startedAt && `Started: ${new Date(step.startedAt).toLocaleString()}`}
                                    {step.startedAt && step.completedAt && ' • '}
                                    {step.completedAt && `Completed: ${new Date(step.completedAt).toLocaleString()}`}
                                  </div>
                                )}
                              </div>

                              {/* Step Actions */}
                              {!readOnly && (
                                <div style={{ 
                                  display: 'flex', 
                                  gap: '6px',
                                  marginLeft: '12px',
                                  flexShrink: 0
                                }}>
                                  {step.status === 'not_started' && (
                                    <button
                                      onClick={() => handleStartStep(phase, step)}
                                      disabled={isLoading}
                                      style={{
                                        padding: '4px 8px',
                                        fontSize: '11px',
                                        backgroundColor: isLoading ? '#e5e7eb' : '#3b82f6',
                                        color: isLoading ? '#9ca3af' : 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: isLoading ? 'not-allowed' : 'pointer'
                                      }}
                                    >
                                      {isLoading ? 'Starting...' : 'Start'}
                                    </button>
                                  )}

                                  {step.status === 'in_progress' && (
                                    <button
                                      onClick={() => handleCompleteStep(phase, step)}
                                      style={{
                                        padding: '4px 8px',
                                        fontSize: '11px',
                                        backgroundColor: '#10b981',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      Complete
                                    </button>
                                  )}

                                  {step.executionId && (
                                    <button
                                      onClick={() => handleViewLogs(step.executionId!)}
                                      style={{
                                        padding: '4px 8px',
                                        fontSize: '11px',
                                        backgroundColor: 'transparent',
                                        color: '#6b7280',
                                        border: '1px solid #e5e7eb',
                                        borderRadius: '4px',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      Logs
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
};