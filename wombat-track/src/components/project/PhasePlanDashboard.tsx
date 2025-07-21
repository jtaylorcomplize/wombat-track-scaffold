import React, { useState, useEffect } from 'react';
import type { Project, Phase, PhaseStep } from '../../types/phase';
import type { TemplateExecution } from '../../types/template';
import { fetchExecutionLogs } from '../../api/executionLogAPI';
import { triggerTemplate } from '../../lib/templateDispatcher';

interface ProjectDashboardProps {
  project: Project;
  onStepUpdate?: (projectId: string, phaseId: string, stepId: string, updates: Partial<PhaseStep>) => void;
  onViewLogs?: (executionId: string) => void;
  readOnly?: boolean;
}


export const ProjectDashboard: React.FC<ProjectDashboardProps> = ({
  project,
  onStepUpdate,
  onViewLogs,
  readOnly = false
}) => {
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());
  const [executionMap, setExecutionMap] = useState<Map<string, TemplateExecution>>(new Map());
  const [loadingSteps, setLoadingSteps] = useState<Set<string>>(new Set());
  const [showCompleted, setShowCompleted] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');
  const [isProjectInfoExpanded, setIsProjectInfoExpanded] = useState(false);

  // Initialize expanded phases on mount
  useEffect(() => {
    setExpandedPhases(new Set(project.phases.map(phase => phase.id)));
  }, [project.phases]);

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
        console.error('Failed to fetch execution logs for ProjectDashboard:', error);
      }
    };

    fetchExecutions();
    const interval = setInterval(fetchExecutions, 2000); // Poll every 2 seconds
    
    return () => clearInterval(interval);
  }, []);

  const renderMarkdown = (text: string) => {
    if (!text) return null;
    
    const html = text
      .replace(/^# (.+)$/gm, '<h1 style="font-size: 24px; font-weight: 700; margin: 16px 0 8px 0; color: #1f2937;">$1</h1>')
      .replace(/^## (.+)$/gm, '<h2 style="font-size: 20px; font-weight: 600; margin: 14px 0 6px 0; color: #374151;">$1</h2>')
      .replace(/^### (.+)$/gm, '<h3 style="font-size: 16px; font-weight: 600; margin: 12px 0 4px 0; color: #4b5563;">$1</h3>')
      .replace(/\*\*(.+?)\*\*/g, '<strong style="font-weight: 600;">$1</strong>')
      .replace(/\*(.+?)\*/g, '<em style="font-style: italic;">$1</em>')
      .replace(/^- (.+)$/gm, '<li style="margin: 2px 0;">$1</li>')
      .replace(/(<li.*<\/li>)/s, '<ul style="margin: 8px 0; padding-left: 20px;">$1</ul>')
      .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" style="color: #3b82f6; text-decoration: underline;" target="_blank" rel="noopener noreferrer">$1</a>')
      .replace(/\n\n/g, '</p><p style="margin: 8px 0;">')
      .replace(/^(.+)$/gm, '<p style="margin: 8px 0;">$1</p>');

    return (
      <div 
        style={{
          padding: '12px',
          backgroundColor: '#f9fafb',
          borderRadius: '6px',
          lineHeight: 1.6,
          fontSize: '14px'
        }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  };

  const getStatusIcon = (step: PhaseStep) => {
    const status = executionStatus[step.id]?.status || step.status;
    
    switch (status) {
      case 'not_started': return '○';
      case 'in_progress': return '⏳';
      case 'complete': return '✅';
      case 'error': return '❌';
      default: return '○';
    }
  };

  const getStatusColor = (step: PhaseStep) => {
    const status = executionStatus[step.id]?.status || step.status;
    
    switch (status) {
      case 'not_started': return '#9ca3af';
      case 'in_progress': return '#f59e0b';
      case 'complete': return '#10b981';
      case 'error': return '#ef4444';
      default: return '#9ca3af';
    }
  };

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

  const toggleAllPhases = () => {
    if (expandedPhases.size === project.phases.length) {
      setExpandedPhases(new Set());
    } else {
      setExpandedPhases(new Set(project.phases.map(phase => phase.id)));
    }
  };

  const toggleProjectInfo = () => {
    setIsProjectInfoExpanded(!isProjectInfoExpanded);
  };

  const handleStartStep = async (phase: Phase, step: PhaseStep) => {
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

  const handleCompleteStep = (phase: Phase, step: PhaseStep) => {
    if (onStepUpdate) {
      onStepUpdate(project.id, phase.id, step.id, {
        status: 'complete',
        completedAt: new Date().toISOString()
      });
    }
  };

  const handleViewLogs = (executionId: string) => {
    if (onViewLogs) {
      onViewLogs(executionId);
    } else {
      // Default behavior - log to console and provide feedback
      console.log(`View log for execution: ${executionId}`);
      // In a real app, this would open a modal or navigate to logs view
      alert(`Viewing logs for execution: ${executionId}\nCheck console for details.`);
    }
  };

  const filteredSteps = (phase: Phase) => {
    return phase.steps.filter(step => {
      const matchesSearch = !searchFilter || 
        step.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
        step.description?.toLowerCase().includes(searchFilter.toLowerCase());
      
      const matchesVisibility = showCompleted || step.status !== 'complete';
      
      return matchesSearch && matchesVisibility;
    });
  };

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        padding: '12px 0',
        borderBottom: '1px solid #e5e7eb'
      }}>
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: '600', margin: 0, color: '#1f2937' }}>
            📊 {project.name} - Project Dashboard
          </h3>
          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
            {project.phases.length} phases • {project.phases.reduce((acc, p) => acc + p.steps.length, 0)} steps total
          </div>
        </div>
        
        {/* Controls */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Search steps..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            style={{
              padding: '4px 8px',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              fontSize: '12px',
              width: '150px'
            }}
          />
          
          <label style={{ fontSize: '12px', color: '#4b5563', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <input
              type="checkbox"
              checked={showCompleted}
              onChange={(e) => setShowCompleted(e.target.checked)}
              style={{ margin: 0 }}
            />
            Show completed
          </label>
          
          <button
            onClick={toggleProjectInfo}
            style={{
              padding: '4px 8px',
              backgroundColor: isProjectInfoExpanded ? '#e0e7ff' : '#f3f4f6',
              color: isProjectInfoExpanded ? '#3730a3' : '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              fontSize: '11px',
              cursor: 'pointer'
            }}
          >
            Project Info
          </button>

          <button
            onClick={toggleAllPhases}
            style={{
              padding: '4px 8px',
              backgroundColor: '#f3f4f6',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              fontSize: '11px',
              cursor: 'pointer'
            }}
          >
            {expandedPhases.size === project.phases.length ? 'Collapse All' : 'Expand All'}
          </button>
        </div>
      </div>

      {/* Project Information */}
      {project.phasePlan && (
        <div style={{
          marginBottom: '16px',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          backgroundColor: 'white'
        }}>
          {/* Project Info Header */}
          <div
            onClick={toggleProjectInfo}
            style={{
              padding: '12px 16px',
              cursor: 'pointer',
              backgroundColor: isProjectInfoExpanded ? '#f8fafc' : '#ffffff',
              borderRadius: isProjectInfoExpanded ? '8px 8px 0 0' : '8px',
              borderBottom: isProjectInfoExpanded ? '1px solid #e5e7eb' : 'none',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: '#6b7280' }}>
                  Project Overview
                </span>
                <span style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>
                  {project.name}
                </span>
                <div style={{ 
                  fontSize: '11px', 
                  backgroundColor: project.colorTag || '#e5e7eb', 
                  padding: '2px 6px', 
                  borderRadius: '10px',
                  color: '#ffffff'
                }}>
                  {project.projectType}
                </div>
                <div style={{ 
                  fontSize: '11px', 
                  backgroundColor: project.status === 'Active' ? '#10b981' : '#e5e7eb', 
                  padding: '2px 6px', 
                  borderRadius: '10px',
                  color: '#ffffff'
                }}>
                  {project.status}
                </div>
              </div>
              {project.description && (
                <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
                  {project.description}
                </div>
              )}
            </div>
            
            <div style={{ fontSize: '12px', color: '#9ca3af' }}>
              {isProjectInfoExpanded ? '▲' : '▼'}
            </div>
          </div>

          {/* Project Info Content */}
          {isProjectInfoExpanded && (
            <div style={{ padding: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                Project Details
              </div>
              
              {/* Project metadata */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '12px',
                marginBottom: '16px'
              }}>
                <div style={{ fontSize: '12px' }}>
                  <span style={{ color: '#6b7280', fontWeight: '500' }}>Owner: </span>
                  <span style={{ color: '#1f2937' }}>{project.projectOwner}</span>
                </div>
                <div style={{ fontSize: '12px' }}>
                  <span style={{ color: '#6b7280', fontWeight: '500' }}>Created: </span>
                  <span style={{ color: '#1f2937' }}>{new Date(project.createdAt).toLocaleDateString()}</span>
                </div>
                <div style={{ fontSize: '12px' }}>
                  <span style={{ color: '#6b7280', fontWeight: '500' }}>WT Tag: </span>
                  <span style={{ color: '#1f2937' }}>{project.wtTag}</span>
                </div>
                <div style={{ fontSize: '12px' }}>
                  <span style={{ color: '#6b7280', fontWeight: '500' }}>Phases: </span>
                  <span style={{ color: '#1f2937' }}>{project.phases.length}</span>
                </div>
              </div>

              {/* Project Plan Overview */}
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                Project Plan
              </div>
              {renderMarkdown(project.phasePlan)}
            </div>
          )}
        </div>
      )}

      {/* Phases Timeline */}
      <div style={{ marginTop: '16px' }}>
        {project.phases
          .sort((a, b) => a.order - b.order)
          .map((phase, phaseIndex) => (
          <div
            key={phase.id}
            style={{
              marginBottom: '16px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              backgroundColor: 'white'
            }}
          >
            {/* Phase Header */}
            <div
              onClick={() => togglePhase(phase.id)}
              style={{
                padding: '12px 16px',
                cursor: 'pointer',
                backgroundColor: expandedPhases.has(phase.id) ? '#f8fafc' : '#ffffff',
                borderRadius: expandedPhases.has(phase.id) ? '8px 8px 0 0' : '8px',
                borderBottom: expandedPhases.has(phase.id) ? '1px solid #e5e7eb' : 'none',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12px', color: '#6b7280' }}>
                    Phase {phaseIndex + 1}
                  </span>
                  <span style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>
                    {phase.name}
                  </span>
                  <div style={{ 
                    fontSize: '11px', 
                    backgroundColor: '#e5e7eb', 
                    padding: '2px 6px', 
                    borderRadius: '10px',
                    color: '#6b7280'
                  }}>
                    {filteredSteps(phase).length} steps
                  </div>
                </div>
                {phase.description && (
                  <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
                    {phase.description}
                  </div>
                )}
              </div>
              
              <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                {expandedPhases.has(phase.id) ? '▲' : '▼'}
              </div>
            </div>

            {/* Phase Content */}
            {expandedPhases.has(phase.id) && (
              <div style={{ padding: '16px' }}>
                {/* Phase Summary */}
                {phase.summary && (
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                      Phase Overview
                    </div>
                    <div
                      style={{
                        fontSize: '13px',
                        color: '#4b5563',
                        backgroundColor: '#f9fafb',
                        padding: '8px 12px',
                        borderRadius: '4px',
                        borderLeft: '3px solid #3b82f6'
                      }}
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(phase.summary)?.props.dangerouslySetInnerHTML.__html || phase.summary }}
                    />
                  </div>
                )}

                {/* Phase Steps */}
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                  Phase Steps
                </div>
                
                {filteredSteps(phase).length === 0 ? (
                  <div style={{
                    padding: '20px',
                    textAlign: 'center',
                    color: '#9ca3af',
                    fontSize: '13px'
                  }}>
                    {searchFilter ? 'No steps match your search criteria' : 'No steps configured for this phase'}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {filteredSteps(phase).map((step) => {
                      const execution = step.executionId ? executionMap.get(step.executionId) : null;
                      const isLoading = loadingSteps.has(step.id);
                      
                      return (
                        <div
                          key={step.id}
                          data-testid={`step-${step.id}`}
                          style={{
                            padding: '12px',
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
                                  color: getStatusColor(step)
                                }}>
                                  {getStatusIcon(step)}
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
                                    backgroundColor: getStatusColor(step) + '20',
                                    color: getStatusColor(step),
                                    fontWeight: '600'
                                  }}
                                >
                                  {step.status.replace('_', ' ')}
                                </span>
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
                                  Execution: {execution.platform} • {execution.status}
                                  {execution.endTime && ` • ${Math.round((execution.endTime.getTime() - execution.startTime.getTime()) / 1000)}s`}
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

                            {/* Step Actions */}
                            {!readOnly && (
                              <div style={{ 
                                display: 'flex', 
                                gap: '8px',
                                marginLeft: '12px'
                              }}>
                                {step.status === 'not_started' && (
                                  <button
                                    data-testid={`start-step-${step.id}`}
                                    onClick={() => handleStartStep(phase, step)}
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
                                    onClick={() => handleCompleteStep(phase, step)}
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
                                    onClick={() => handleViewLogs(step.executionId!)}
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
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer Stats */}
      <div style={{
        marginTop: '20px',
        padding: '12px',
        backgroundColor: '#f9fafb',
        border: '1px solid #e5e7eb',
        borderRadius: '6px',
        fontSize: '12px',
        color: '#6b7280',
        display: 'flex',
        justifyContent: 'space-between'
      }}>
        <div>
          Project Status: <strong style={{ color: '#1f2937' }}>{project.status}</strong>
        </div>
        <div>
          Total Progress: <strong style={{ color: '#1f2937' }}>
            {project.phases.reduce((acc, p) => acc + p.steps.filter(s => s.status === 'complete').length, 0)} / {project.phases.reduce((acc, p) => acc + p.steps.length, 0)} steps completed
          </strong>
        </div>
      </div>
    </div>
  );
};