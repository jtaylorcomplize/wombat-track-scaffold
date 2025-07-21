import React, { useState, useEffect } from 'react';
import type { Project, Phase, PhaseStep } from '../../types/phase';
import { fetchExecutionLogs } from '../../api/executionLogAPI';

interface PhasePlanDashboardProps {
  project: Project;
  onStartStep?: (stepId: string) => void;
  onViewLogs?: (executionId: string) => void;
  readOnly?: boolean;
}

interface ExecutionStatus {
  [stepId: string]: {
    status: 'not_started' | 'in_progress' | 'complete' | 'error';
    executionId?: string;
    lastUpdate?: string;
  };
}

export const PhasePlanDashboard: React.FC<PhasePlanDashboardProps> = ({
  project,
  onStartStep,
  onViewLogs,
  readOnly = false
}) => {
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());
  const [executionStatus, setExecutionStatus] = useState<ExecutionStatus>({});
  const [showCompleted, setShowCompleted] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');
  const [isPolling, setIsPolling] = useState(false);

  // Initialize expanded phases on mount
  useEffect(() => {
    setExpandedPhases(new Set(project.phases.map(phase => phase.id)));
  }, [project.phases]);

  // Poll execution status every 2 seconds
  useEffect(() => {
    const pollExecutionStatus = async () => {
      if (isPolling) return;
      setIsPolling(true);

      try {
        const allSteps = project.phases.flatMap(phase => phase.steps);
        const stepsWithExecution = allSteps.filter(step => step.executionId);
        
        for (const step of stepsWithExecution) {
          if (step.executionId) {
            try {
              const logs = await fetchExecutionLogs(step.executionId);
              if (logs && logs.length > 0) {
                const latestLog = logs[logs.length - 1];
                setExecutionStatus(prev => ({
                  ...prev,
                  [step.id]: {
                    status: step.status,
                    executionId: step.executionId,
                    lastUpdate: latestLog.timestamp || new Date().toISOString()
                  }
                }));
              }
            } catch (error) {
              console.warn(`Failed to fetch logs for step ${step.id}:`, error);
            }
          }
        }
      } catch (error) {
        console.error('Error polling execution status:', error);
      }

      setIsPolling(false);
    };

    pollExecutionStatus();
    const interval = setInterval(pollExecutionStatus, 2000);

    return () => clearInterval(interval);
  }, [project.phases]);

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
          padding: '16px',
          backgroundColor: '#fafbfc',
          border: '1px solid #e5e7eb',
          borderRadius: '6px',
          marginBottom: '24px',
          lineHeight: 1.6
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
            📑 {project.name} - Phase Plan Dashboard
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

      {/* Project Plan Overview */}
      {project.phasePlan && renderMarkdown(project.phasePlan)}

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
                    {filteredSteps(phase).map((step) => (
                      <div
                        key={step.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 12px',
                          backgroundColor: '#fafbfc',
                          border: '1px solid #f0f0f0',
                          borderRadius: '6px',
                          borderLeft: `3px solid ${getStatusColor(step)}`
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                          <span style={{ 
                            fontSize: '16px', 
                            color: getStatusColor(step),
                            minWidth: '20px' 
                          }}>
                            {getStatusIcon(step)}
                          </span>
                          
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '14px', fontWeight: '500', color: '#1f2937' }}>
                              {step.name}
                            </div>
                            {step.description && (
                              <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                                {step.description}
                              </div>
                            )}
                            {executionStatus[step.id]?.lastUpdate && (
                              <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>
                                Last updated: {new Date(executionStatus[step.id].lastUpdate!).toLocaleString()}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Step Actions */}
                        {!readOnly && (
                          <div style={{ display: 'flex', gap: '6px' }}>
                            {!step.executionId && step.status === 'not_started' && onStartStep && (
                              <button
                                onClick={() => onStartStep(step.id)}
                                style={{
                                  padding: '4px 8px',
                                  backgroundColor: '#10b981',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  fontSize: '11px',
                                  cursor: 'pointer'
                                }}
                                title="Start execution"
                              >
                                Start
                              </button>
                            )}
                            
                            {step.executionId && onViewLogs && (
                              <button
                                onClick={() => onViewLogs(step.executionId!)}
                                style={{
                                  padding: '4px 8px',
                                  backgroundColor: '#3b82f6',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  fontSize: '11px',
                                  cursor: 'pointer'
                                }}
                                title="View execution logs"
                              >
                                View Logs
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
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