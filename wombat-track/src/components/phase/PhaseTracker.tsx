import React, { useState, useEffect } from 'react';
import type { Project, Phase, PhaseStep } from '../../types/phase';
import type { TemplateExecution } from '../../types/template';
import { fetchExecutionLogs } from '../../api/executionLogAPI';
import { triggerTemplate } from '../../lib/templateDispatcher';

interface PhaseTrackerProps {
  projects: Project[];
  onStepUpdate?: (projectId: string, phaseId: string, stepId: string, updates: Partial<PhaseStep>) => void;
}

export const PhaseTracker: React.FC<PhaseTrackerProps> = ({ projects, onStepUpdate }) => {
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());
  const [executionMap, setExecutionMap] = useState<Map<string, TemplateExecution>>(new Map());
  const [loadingSteps, setLoadingSteps] = useState<Set<string>>(new Set());

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
        console.error('Failed to fetch execution logs for PhaseTracker:', error);
      }
    };

    fetchExecutions();
    const interval = setInterval(fetchExecutions, 2000); // Poll every 2 seconds
    
    return () => clearInterval(interval);
  }, []);

  const togglePhase = (phaseId: string) => {
    setExpandedPhases(prev => {
      const next = new Set(prev);
      if (next.has(phaseId)) {
        next.delete(phaseId);
      } else {
        next.add(phaseId);
      }
      return next;
    });
  };

  const handleStartStep = async (project: Project, phase: Phase, step: PhaseStep) => {
    if (step.templateId) {
      setLoadingSteps(prev => new Set(prev).add(step.id));
      
      try {
        const result = await triggerTemplate(step.templateId, `${project.name}-${step.name}`);
        
        if (onStepUpdate) {
          onStepUpdate(project.id, phase.id, step.id, {
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
    } else {
      // Manual start without template
      if (onStepUpdate) {
        onStepUpdate(project.id, phase.id, step.id, {
          status: 'in_progress',
          startedAt: new Date().toISOString()
        });
      }
    }
  };

  const handleCompleteStep = (project: Project, phase: Phase, step: PhaseStep) => {
    if (onStepUpdate) {
      onStepUpdate(project.id, phase.id, step.id, {
        status: 'complete',
        completedAt: new Date().toISOString()
      });
    }
  };

  const getStepStatusColor = (status: PhaseStep['status']) => {
    switch (status) {
      case 'complete':
        return '#10b981';
      case 'in_progress':
        return '#f59e0b';
      case 'not_started':
      default:
        return '#6b7280';
    }
  };

  const getStepStatusIcon = (status: PhaseStep['status']) => {
    switch (status) {
      case 'complete':
        return '✓';
      case 'in_progress':
        return '⏳';
      case 'not_started':
      default:
        return '○';
    }
  };

  const getPhaseProgress = (phase: Phase) => {
    const completed = phase.steps.filter(s => s.status === 'complete').length;
    return Math.round((completed / phase.steps.length) * 100);
  };

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif' }}>
      {projects.map(project => (
        <div 
          key={project.id}
          data-testid={`project-${project.id}`}
          style={{
            marginBottom: '24px',
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            overflow: 'hidden'
          }}
        >
          {/* Project Header */}
          <div style={{
            padding: '20px',
            backgroundColor: '#f8fafc',
            borderBottom: '1px solid #e5e7eb'
          }}>
            <h3 style={{ 
              fontSize: '20px', 
              fontWeight: '700', 
              color: '#1f2937',
              marginBottom: '4px'
            }}>
              {project.name}
            </h3>
            <p style={{ fontSize: '14px', color: '#6b7280' }}>
              {project.description}
            </p>
          </div>

          {/* Phases */}
          <div>
            {project.phases.map(phase => (
              <div key={phase.id} data-testid={`phase-${phase.id}`}>
                {/* Phase Header */}
                <div 
                  style={{
                    padding: '16px 20px',
                    backgroundColor: '#f9fafb',
                    borderBottom: '1px solid #f3f4f6',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                  onClick={() => togglePhase(phase.id)}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '12px',
                      marginBottom: '4px'
                    }}>
                      <h4 style={{ 
                        fontSize: '16px', 
                        fontWeight: '600', 
                        color: '#374151' 
                      }}>
                        {phase.name}
                      </h4>
                      <span style={{
                        fontSize: '12px',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        backgroundColor: '#e0e7ff',
                        color: '#4f46e5'
                      }}>
                        {getPhaseProgress(phase)}% complete
                      </span>
                    </div>
                    <p style={{ fontSize: '13px', color: '#6b7280' }}>
                      {phase.description}
                    </p>
                  </div>
                  <div style={{
                    fontSize: '20px',
                    transform: expandedPhases.has(phase.id) ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s'
                  }}>
                    ⌄
                  </div>
                </div>

                {/* Phase Steps */}
                {expandedPhases.has(phase.id) && (
                  <div style={{ padding: '12px 20px' }}>
                    {phase.steps.map((step, index) => {
                      const execution = step.executionId ? executionMap.get(step.executionId) : null;
                      const isLoading = loadingSteps.has(step.id);
                      
                      return (
                        <div 
                          key={step.id}
                          data-testid={`step-${step.id}`}
                          style={{
                            padding: '12px',
                            marginBottom: index < phase.steps.length - 1 ? '8px' : 0,
                            backgroundColor: '#fafbfc',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px'
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
                                  fontSize: '16px',
                                  color: getStepStatusColor(step.status)
                                }}>
                                  {getStepStatusIcon(step.status)}
                                </span>
                                <span style={{
                                  fontSize: '14px',
                                  fontWeight: '500',
                                  color: '#1f2937'
                                }}>
                                  {step.name}
                                </span>
                                <span 
                                  data-testid={`step-status-${step.id}`}
                                  style={{
                                    fontSize: '11px',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    backgroundColor: getStepStatusColor(step.status) + '20',
                                    color: getStepStatusColor(step.status),
                                    fontWeight: '600'
                                  }}
                                >
                                  {step.status.replace('_', ' ')}
                                </span>
                              </div>
                              
                              {step.description && (
                                <p style={{ 
                                  fontSize: '12px', 
                                  color: '#6b7280',
                                  marginBottom: '4px'
                                }}>
                                  {step.description}
                                </p>
                              )}

                              {/* Execution Info */}
                              {execution && (
                                <div 
                                  data-testid={`execution-info-${step.id}`}
                                  style={{
                                    fontSize: '11px',
                                    color: '#6b7280',
                                    marginTop: '4px',
                                    padding: '4px 8px',
                                    backgroundColor: '#f3f4f6',
                                    borderRadius: '4px',
                                    display: 'inline-block'
                                  }}
                                >
                                  Execution: {execution.platform} • {execution.status} • 
                                  {execution.endTime && ` ${Math.round((execution.endTime.getTime() - execution.startTime.getTime()) / 1000)}s`}
                                </div>
                              )}

                              {/* Timing Info */}
                              {(step.startedAt || step.completedAt) && (
                                <div style={{ 
                                  fontSize: '11px', 
                                  color: '#6b7280',
                                  marginTop: '4px'
                                }}>
                                  {step.startedAt && `Started: ${new Date(step.startedAt).toLocaleString()}`}
                                  {step.startedAt && step.completedAt && ' • '}
                                  {step.completedAt && `Completed: ${new Date(step.completedAt).toLocaleString()}`}
                                </div>
                              )}
                            </div>

                            {/* Actions */}
                            <div style={{ 
                              display: 'flex', 
                              gap: '8px',
                              marginLeft: '12px'
                            }}>
                              {step.status === 'not_started' && (
                                <button
                                  data-testid={`start-step-${step.id}`}
                                  onClick={() => handleStartStep(project, phase, step)}
                                  disabled={isLoading}
                                  style={{
                                    padding: '4px 12px',
                                    fontSize: '12px',
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
                                  data-testid={`complete-step-${step.id}`}
                                  onClick={() => handleCompleteStep(project, phase, step)}
                                  style={{
                                    padding: '4px 12px',
                                    fontSize: '12px',
                                    backgroundColor: '#10b981',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                  }}
                                >
                                  Mark Complete
                                </button>
                              )}

                              {step.executionId && (
                                <button
                                  data-testid={`view-log-${step.id}`}
                                  onClick={() => {
                                    // In a real app, this would open a modal or navigate
                                    console.log(`View log for execution: ${step.executionId}`);
                                  }}
                                  style={{
                                    padding: '4px 12px',
                                    fontSize: '12px',
                                    backgroundColor: 'transparent',
                                    color: '#6b7280',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                  }}
                                >
                                  View Log
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};