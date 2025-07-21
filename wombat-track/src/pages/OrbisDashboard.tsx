import React, { useState, useEffect } from 'react';
import type { Integration } from '../types/integration';
import { IntegrationCategory, IntegrationStatus, DispatchStatus } from '../types/integration';
import type { TemplateExecution } from '../types/template';
import type { Project, PhaseStep } from '../types/phase';
import { IntegrationCard } from '../components/integration/IntegrationCard';
import { PhaseTracker } from '../components/phase/PhaseTracker';
import { PhaseAdminModal } from '../components/phase/PhaseAdminModal';
import { ProjectSwitcher } from '../components/project/ProjectSwitcher';
import { triggerTemplate } from '../lib/templateDispatcher';
import { fetchExecutionLogs } from '../api/executionLogAPI';
import { mockProjects } from '../data/mockProjects';
import { seedPhaseTracker, forceSeedPhaseTracker, isPhaseTrackerSeeded } from '../dev/seedPhaseTracker';

const mockIntegrations: Integration[] = [
  {
    name: 'claude-api',
    status: IntegrationStatus.Working,
    lastChecked: new Date(Date.now() - 2 * 60 * 1000),
    isActive: true,
    category: IntegrationCategory.Claude,
    logURL: 'https://logs.example.com/claude-api',
    templateName: 'Claude Health Check',
    templateId: 'claude-health-001'
  },
  {
    name: 'github-webhooks',
    status: IntegrationStatus.Working,
    lastChecked: new Date(Date.now() - 5 * 60 * 1000),
    isActive: true,
    category: IntegrationCategory.GitHub,
    logURL: 'https://logs.example.com/github-webhooks',
    templateName: 'GitHub Deploy Pipeline',
    templateId: 'github-deploy-002'
  },
  {
    name: 'ci-pipeline',
    status: IntegrationStatus.Degraded,
    lastChecked: new Date(Date.now() - 10 * 60 * 1000),
    isActive: true,
    category: IntegrationCategory.CI,
    templateName: 'CI Repair Workflow',
    templateId: 'ci-repair-003'
  },
  {
    name: 'sync-service',
    status: IntegrationStatus.Broken,
    lastChecked: new Date(Date.now() - 30 * 60 * 1000),
    isActive: false,
    category: IntegrationCategory.Sync,
    logURL: 'https://logs.example.com/sync-service',
    templateName: 'Sync Recovery Script',
    templateId: 'sync-recover-004'
  },
  {
    name: 'memory-plugin',
    status: IntegrationStatus.Working,
    lastChecked: new Date(Date.now() - 1 * 60 * 1000),
    isActive: true,
    category: IntegrationCategory.MemoryPlugin,
    templateName: 'Memory Optimization',
    templateId: 'memory-optimize-005'
  },
  {
    name: 'bubble-connector',
    status: IntegrationStatus.Degraded,
    lastChecked: new Date(Date.now() - 15 * 60 * 1000),
    isActive: true,
    category: IntegrationCategory.Bubble,
    logURL: 'https://logs.example.com/bubble-connector',
    templateName: 'Bubble Sync Repair',
    templateId: 'bubble-sync-006'
  }
];

interface OrbisDashboardProps {
  onHealthCheck?: (integrationId: string) => Promise<void>;
}

export const OrbisDashboard: React.FC<OrbisDashboardProps> = ({ onHealthCheck }) => {
  const [integrations, setIntegrations] = useState<Integration[]>(mockIntegrations);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dispatchStatus, setDispatchStatus] = useState<Record<string, DispatchStatus>>({});
  const [executionHistory, setExecutionHistory] = useState<TemplateExecution[]>([]);
  const [showExecutionHistory, setShowExecutionHistory] = useState(false);
  const [showPhaseTracker, setShowPhaseTracker] = useState(false);
  const [showPhaseAdmin, setShowPhaseAdmin] = useState(false);
  const [projects, setProjects] = useState<Project[]>(mockProjects);
  const [activeProjectId, setActiveProjectId] = useState<string>('');
  const [showArchivedProjects, setShowArchivedProjects] = useState(false);

  // Fetch execution history from API
  const refreshExecutionHistory = async () => {
    try {
      const logs = await fetchExecutionLogs();
      setExecutionHistory(logs);
    } catch (error) {
      console.error('Failed to fetch execution logs:', error);
    }
  };

  useEffect(() => {
    // Initial load of execution history
    refreshExecutionHistory();
    
    // Seed Phase Tracker in development mode
    seedPhaseTracker(setProjects);
    
    // Set up a polling interval to refresh execution history from API
    const interval = setInterval(refreshExecutionHistory, 1000);
    
    return () => clearInterval(interval);
  }, []);

  const filteredIntegrations = integrations.filter(integration => {
    const statusMatch = statusFilter === 'all' || integration.status === statusFilter;
    const categoryMatch = categoryFilter === 'all' || integration.category === categoryFilter;
    return statusMatch && categoryMatch;
  });

  const getOperationalStats = () => {
    const workingCount = integrations.filter(i => i.status === IntegrationStatus.Working && i.isActive).length;
    const totalActive = integrations.filter(i => i.isActive).length;
    const percentage = totalActive > 0 ? Math.round((workingCount / totalActive) * 100) : 0;
    
    return {
      working: workingCount,
      total: totalActive,
      percentage
    };
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      for (const integration of integrations) {
        if (onHealthCheck) {
          await onHealthCheck(integration.name);
        }
      }
      
      setIntegrations(prev => prev.map(integration => ({
        ...integration,
        lastChecked: new Date()
      })));
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDispatch = async (integrationId: string) => {
    const integration = integrations.find(i => i.name === integrationId);
    if (!integration || !integration.templateId) {
      console.warn(`No template ID found for integration: ${integrationId}`);
      return;
    }

    setDispatchStatus(prev => ({ ...prev, [integrationId]: DispatchStatus.Queued }));

    try {
      const result = await triggerTemplate(integration.templateId, integration.name);
      
      if (result.success) {
        setDispatchStatus(prev => ({ ...prev, [integrationId]: DispatchStatus.Done }));
        setIntegrations(prev => prev.map(int => 
          int.name === integrationId 
            ? { ...int, lastDispatchTime: new Date() }
            : int
        ));
        
        setTimeout(() => {
          setDispatchStatus(prev => ({ ...prev, [integrationId]: DispatchStatus.Idle }));
        }, 3000);
      } else {
        console.error(`Template dispatch failed: ${result.message}`);
        setDispatchStatus(prev => ({ ...prev, [integrationId]: DispatchStatus.Idle }));
      }
      
      // Refresh execution history after dispatch (with slight delay to allow API update)
      setTimeout(() => {
        refreshExecutionHistory();
      }, 100);
    } catch (error) {
      console.error(`Dispatch error for ${integrationId}:`, error);
      setDispatchStatus(prev => ({ ...prev, [integrationId]: DispatchStatus.Idle }));
      
      // Refresh execution history even on error
      setTimeout(() => {
        refreshExecutionHistory();
      }, 100);
    }
  };

  const runHealthCheck = async (integrationId: string) => {
    if (onHealthCheck) {
      await onHealthCheck(integrationId);
    }
    
    setIntegrations(prev => prev.map(integration => 
      integration.name === integrationId 
        ? { ...integration, lastChecked: new Date() }
        : integration
    ));
  };

  const formatLastChecked = (date: Date) => {
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes === 1) return '1 minute ago';
    if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours === 1) return '1 hour ago';
    if (diffHours < 24) return `${diffHours} hours ago`;
    
    return date.toLocaleDateString();
  };

  const getStatusBadgeStyle = (status: IntegrationStatus) => {
    const baseStyle = {
      padding: '4px 8px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: '600',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.5px'
    };

    switch (status) {
      case IntegrationStatus.Working:
        return { ...baseStyle, backgroundColor: '#dcfce7', color: '#15803d' };
      case IntegrationStatus.Degraded:
        return { ...baseStyle, backgroundColor: '#fef3c7', color: '#d97706' };
      case IntegrationStatus.Broken:
        return { ...baseStyle, backgroundColor: '#fee2e2', color: '#dc2626' };
      default:
        return { ...baseStyle, backgroundColor: '#f3f4f6', color: '#6b7280' };
    }
  };

  const getCategoryChipStyle = () => {
    return {
      padding: '2px 6px',
      borderRadius: '4px',
      fontSize: '11px',
      backgroundColor: '#f8fafc',
      color: '#64748b',
      border: '1px solid #e2e8f0'
    };
  };

  const handlePhaseStepUpdate = (projectId: string, phaseId: string, stepId: string, updates: Partial<PhaseStep>) => {
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
              return { ...step, ...updates };
            })
          };
        })
      };
    }));
  };

  const stats = getOperationalStats();
  
  // Filter projects for display based on active project selection
  const displayProjects = activeProjectId 
    ? projects.filter(p => p.id === activeProjectId)
    : projects;

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '700', color: '#1f2937', marginBottom: '8px' }}>
          Orbis Health Overview
        </h1>
        <p style={{ color: '#6b7280', fontSize: '16px' }}>
          Monitor the status of core system integrations and SDLC control panel
        </p>
      </div>

      {/* Summary Row */}
      <div 
        data-testid="status-rollup"
        style={{ 
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#1f2937' }}>
            {stats.working} of {stats.total} integrations operational
          </div>
          <div style={{ color: '#6b7280', fontSize: '14px' }}>
            {stats.percentage}% system health
          </div>
        </div>
        <div style={{ 
          fontSize: '48px', 
          fontWeight: '700',
          color: stats.percentage >= 80 ? '#15803d' : stats.percentage >= 60 ? '#d97706' : '#dc2626'
        }}>
          {stats.percentage}%
        </div>
      </div>

      {/* Filters */}
      <div style={{ 
        display: 'flex', 
        gap: '16px', 
        marginBottom: '24px', 
        alignItems: 'center',
        flexWrap: 'wrap' as const
      }}>
        <select 
          data-testid="status-filter"
          value={statusFilter} 
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ 
            padding: '8px 12px', 
            border: '1px solid #d1d5db', 
            borderRadius: '6px',
            backgroundColor: 'white',
            fontSize: '14px'
          }}
        >
          <option value="all">All Status</option>
          <option value={IntegrationStatus.Working}>Working</option>
          <option value={IntegrationStatus.Degraded}>Degraded</option>
          <option value={IntegrationStatus.Broken}>Broken</option>
        </select>

        <select 
          data-testid="category-filter"
          value={categoryFilter} 
          onChange={(e) => setCategoryFilter(e.target.value)}
          style={{ 
            padding: '8px 12px', 
            border: '1px solid #d1d5db', 
            borderRadius: '6px',
            backgroundColor: 'white',
            fontSize: '14px'
          }}
        >
          <option value="all">All Categories</option>
          {Object.values(IntegrationCategory).map(category => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>

        <button 
          data-testid="refresh-button"
          onClick={handleRefresh}
          disabled={isRefreshing}
          style={{ 
            padding: '8px 16px', 
            backgroundColor: isRefreshing ? '#9ca3af' : '#3b82f6', 
            color: 'white', 
            border: 'none', 
            borderRadius: '6px',
            cursor: isRefreshing ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          {isRefreshing ? 'Refreshing...' : 'Refresh All'}
        </button>
      </div>

      {/* Integration List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filteredIntegrations.map((integration) => (
          <IntegrationCard
            key={integration.name}
            integration={integration}
            onHealthCheck={runHealthCheck}
            onDispatch={handleDispatch}
            dispatchStatus={dispatchStatus[integration.name] || DispatchStatus.Idle}
          />
        ))}
      </div>

      {filteredIntegrations.length === 0 && (
        <div style={{ 
          textAlign: 'center', 
          padding: '60px 20px', 
          color: '#6b7280',
          backgroundColor: '#f9fafb',
          borderRadius: '8px',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ fontSize: '18px', marginBottom: '8px' }}>No integrations found</div>
          <div style={{ fontSize: '14px' }}>Try adjusting your filters to see more results.</div>
        </div>
      )}

      {/* Phase Tracker Section */}
      <div style={{ marginTop: '32px' }}>
        <div 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            marginBottom: '16px',
            padding: '16px',
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px'
          }}
        >
          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              cursor: 'pointer',
              flex: 1
            }}
            onClick={() => setShowPhaseTracker(!showPhaseTracker)}
            data-testid="phase-tracker-toggle"
          >
            <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#1f2937', margin: 0 }}>
              📊 Phase Tracker
            </h2>
            <span style={{ 
              backgroundColor: '#8b5cf6', 
              color: 'white', 
              padding: '2px 8px', 
              borderRadius: '12px', 
              fontSize: '12px',
              fontWeight: '600'
            }}>
              {displayProjects.length} {activeProjectId ? 'project' : 'projects'}
            </span>
            <div style={{ 
              fontSize: '18px', 
              transform: showPhaseTracker ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s',
              marginLeft: '8px'
            }}>
              ⌄
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {/* Development Seed Button */}
            {import.meta.env?.MODE === 'development' && (
              <button
                onClick={() => forceSeedPhaseTracker(setProjects)}
                data-testid="seed-phase-tracker-button"
                style={{
                  padding: '6px 12px',
                  backgroundColor: isPhaseTrackerSeeded() ? '#22c55e' : '#f59e0b',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                title={isPhaseTrackerSeeded() ? 'Phase Tracker seeded (click to refresh)' : 'Seed Phase Tracker with ORB-2.x history'}
              >
                {isPhaseTrackerSeeded() ? '✅' : '🌱'} Seed
              </button>
            )}
            
            <button
              onClick={() => setShowPhaseAdmin(true)}
              data-testid="manage-projects-button"
              style={{
                padding: '8px 16px',
                backgroundColor: '#6366f1',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              ⚙️ Manage Projects
            </button>
          </div>
        </div>

        {showPhaseTracker && (
          <div data-testid="phase-tracker-content" style={{ marginBottom: '32px' }}>
            {/* Project Switcher */}
            <div style={{ marginBottom: '16px' }}>
              <ProjectSwitcher
                projects={projects}
                activeProjectId={activeProjectId}
                onProjectSelect={setActiveProjectId}
                showArchived={showArchivedProjects}
                onToggleArchived={setShowArchivedProjects}
              />
            </div>
            
            <PhaseTracker 
              projects={displayProjects}
              onStepUpdate={handlePhaseStepUpdate}
            />
          </div>
        )}
      </div>

      {/* Execution History Section */}
      <div style={{ marginTop: '32px' }}>
        <div 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            marginBottom: '16px',
            padding: '16px',
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
          onClick={() => setShowExecutionHistory(!showExecutionHistory)}
          data-testid="execution-history-toggle"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#1f2937', margin: 0 }}>
              📋 Execution History
            </h2>
            <span style={{ 
              backgroundColor: '#3b82f6', 
              color: 'white', 
              padding: '2px 8px', 
              borderRadius: '12px', 
              fontSize: '12px',
              fontWeight: '600'
            }}>
              {executionHistory.length}
            </span>
          </div>
          <div style={{ 
            fontSize: '18px', 
            transform: showExecutionHistory ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s'
          }}>
            ⌄
          </div>
        </div>

        {showExecutionHistory && (
          <div 
            data-testid="execution-history-list"
            style={{ 
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              maxHeight: '400px',
              overflowY: 'auto'
            }}
          >
            {executionHistory.length === 0 ? (
              <div style={{ 
                padding: '32px', 
                textAlign: 'center', 
                color: '#6b7280',
                fontSize: '14px'
              }}>
                No execution history yet. Try dispatching a template to see logs here.
              </div>
            ) : (
              executionHistory.map((execution, index) => (
                <div 
                  key={execution.id}
                  data-testid={`execution-entry-${execution.id}`}
                  style={{ 
                    padding: '12px 16px',
                    borderBottom: index < executionHistory.length - 1 ? '1px solid #f3f4f6' : 'none',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ 
                      fontSize: '14px', 
                      fontWeight: '500', 
                      color: '#1f2937',
                      marginBottom: '4px'
                    }}>
                      [{execution.integrationName}] — {execution.templateName}
                    </div>
                    <div style={{ 
                      fontSize: '12px', 
                      color: '#6b7280',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <span>{execution.platform}</span>
                      <span>•</span>
                      <span>ID: {execution.executionId}</span>
                      {execution.endTime && (
                        <>
                          <span>•</span>
                          <span>
                            {Math.round((execution.endTime.getTime() - execution.startTime.getTime()) / 1000)}s
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ 
                      fontSize: '24px',
                      display: 'flex',
                      alignItems: 'center'
                    }}>
                      {execution.status === 'done' && '✅'}
                      {execution.status === 'error' && '❌'}
                      {execution.status === 'in_progress' && '⏳'}
                      {execution.status === 'queued' && '⏸️'}
                    </div>
                    
                    <div style={{ 
                      fontSize: '12px', 
                      color: '#6b7280',
                      textAlign: 'right',
                      minWidth: '80px'
                    }}>
                      {execution.status} @ {execution.startTime.toLocaleTimeString()}
                    </div>
                  </div>
                  
                  {execution.error && (
                    <div 
                      style={{ 
                        marginLeft: '12px',
                        padding: '4px 8px',
                        backgroundColor: '#fee2e2',
                        color: '#dc2626',
                        borderRadius: '4px',
                        fontSize: '11px',
                        maxWidth: '200px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                      title={execution.error}
                    >
                      {execution.error}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Phase Admin Modal */}
      <PhaseAdminModal
        isOpen={showPhaseAdmin}
        onClose={() => setShowPhaseAdmin(false)}
        projects={projects}
        onProjectsUpdate={setProjects}
      />
    </div>
  );
};