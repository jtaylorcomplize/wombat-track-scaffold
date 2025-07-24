import React, { useState, useEffect } from 'react';
import type { Integration } from '../types/integration';
import { IntegrationCategory, IntegrationStatus, DispatchStatus } from '../types/integration';
import type { TemplateExecution } from '../types/template';
import type { Project, PhaseStep } from '../types/phase';
import { IntegrationCard } from '../components/integration/IntegrationCard';
import { PhaseTracker } from '../components/phase/PhaseTracker';
import { PhaseAdminModal } from '../components/phase/PhaseAdminModal';
import ProjectSidebar from '../components/project/ProjectSidebar';
import { triggerTemplate } from '../lib/templateDispatcher';
import { fetchExecutionLogs } from '../api/executionLogAPI';
import { harmonisedProjects } from '../data/harmonisedProjects';
import { seedPhaseTracker, forceSeedPhaseTracker, isPhaseTrackerSeeded } from '../dev/seedPhaseTracker';

// Import mock integrations
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
    templateName: 'Sync Recovery Script',
    templateId: 'sync-recover-004'
  },
  {
    name: 'memory-monitor',
    status: IntegrationStatus.Working,
    lastChecked: new Date(Date.now() - 1 * 60 * 1000),
    isActive: true,
    category: IntegrationCategory.Sync,
    templateName: 'Memory Optimize Task',
    templateId: 'memory-optimize-005'
  }
];

interface WombatConsoleProps {
  onHealthCheck?: (integrationId: string) => Promise<void>;
}

export const WombatConsoleWithSidebar: React.FC<WombatConsoleProps> = ({ onHealthCheck }) => {
  const [integrations, setIntegrations] = useState<Integration[]>(mockIntegrations);
  const [dispatchStatus, setDispatchStatus] = useState<Record<string, DispatchStatus>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<IntegrationStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<IntegrationCategory | 'all'>('all');
  const [showPhaseTracker, setShowPhaseTracker] = useState(true);
  const [showPhaseAdmin, setShowPhaseAdmin] = useState(false);
  const [executionHistory, setExecutionHistory] = useState<TemplateExecution[]>([]);
  const [showIntegrations, setShowIntegrations] = useState(true);
  const [projects, setProjects] = useState<Project[]>(harmonisedProjects);
  const [activeProjectId, setActiveProjectId] = useState<string>('');
  const [showSidebar, setShowSidebar] = useState(true);

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
      
      // Refresh execution history after dispatch
      setTimeout(() => {
        refreshExecutionHistory();
      }, 100);
    } catch (error) {
      console.error(`Dispatch error for ${integrationId}:`, error);
      setDispatchStatus(prev => ({ ...prev, [integrationId]: DispatchStatus.Idle }));
    }
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

  const getStatusChipStyle = (status: IntegrationStatus) => {
    const baseStyle = {
      padding: '2px 8px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: '600' as const,
      marginRight: '8px',
      display: 'inline-block'
    };

    switch (status) {
      case IntegrationStatus.Working:
        return { ...baseStyle, backgroundColor: '#dcfce7', color: '#16a34a' };
      case IntegrationStatus.Degraded:
        return { ...baseStyle, backgroundColor: '#fef3c7', color: '#d97706' };
      case IntegrationStatus.Broken:
        return { ...baseStyle, backgroundColor: '#fee2e2', color: '#dc2626' };
      default:
        return { ...baseStyle, backgroundColor: '#f3f4f6', color: '#6b7280' };
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#f9fafb' }}>
      {/* Sidebar */}
      {showSidebar && (
        <div style={{ width: '300px', flexShrink: 0 }}>
          <ProjectSidebar
            projects={projects}
            selectedProjectId={activeProjectId}
            onProjectSelect={setActiveProjectId}
          />
        </div>
      )}

      {/* Main Content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
          {/* Header */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                style={{
                  padding: '8px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  backgroundColor: 'white',
                  cursor: 'pointer'
                }}
                title="Toggle Sidebar"
              >
                ☰
              </button>
              <h1 style={{ fontSize: '32px', fontWeight: '700', color: '#1f2937' }}>
                WombatConsole Health Overview
              </h1>
            </div>
            <p style={{ color: '#6b7280', fontSize: '16px' }}>
              Monitor the status of core system integrations and SDLC control panel
            </p>
          </div>

          {/* Integration Health Section */}
          <div style={{ marginBottom: '32px' }}>
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
                  gap: '12px',
                  cursor: 'pointer',
                  flex: 1
                }}
                onClick={() => setShowIntegrations(!showIntegrations)}
                data-testid="integrations-toggle"
              >
                <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#1f2937', margin: 0 }}>
                  🏥 Integration Health
                </h2>
                <span style={{ 
                  backgroundColor: stats.percentage >= 80 ? '#15803d' : stats.percentage >= 60 ? '#d97706' : '#dc2626',
                  color: 'white', 
                  padding: '3px 10px', 
                  borderRadius: '12px', 
                  fontSize: '14px',
                  fontWeight: '700'
                }}>
                  {stats.percentage}%
                </span>
                <span style={{ 
                  backgroundColor: '#6b7280', 
                  color: 'white', 
                  padding: '2px 8px', 
                  borderRadius: '12px', 
                  fontSize: '12px',
                  fontWeight: '500'
                }}>
                  {stats.working}/{stats.total} healthy
                </span>
                <span style={{ color: '#6b7280', fontSize: '14px' }}>
                  {showIntegrations ? '▼' : '▶'}
                </span>
              </div>
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: isRefreshing ? 'not-allowed' : 'pointer',
                  opacity: isRefreshing ? 0.5 : 1
                }}
              >
                {isRefreshing ? 'Refreshing...' : '🔄 Refresh All'}
              </button>
            </div>

            {showIntegrations && (
              <>
                {/* Filters */}
                <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as IntegrationStatus | 'all')}
                    style={{
                      padding: '8px 12px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      fontSize: '14px',
                      backgroundColor: 'white'
                    }}
                  >
                    <option value="all">All Statuses</option>
                    <option value={IntegrationStatus.Working}>Working</option>
                    <option value={IntegrationStatus.Degraded}>Degraded</option>
                    <option value={IntegrationStatus.Broken}>Broken</option>
                  </select>

                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value as IntegrationCategory | 'all')}
                    style={{
                      padding: '8px 12px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      fontSize: '14px',
                      backgroundColor: 'white'
                    }}
                  >
                    <option value="all">All Categories</option>
                    <option value={IntegrationCategory.Claude}>Claude</option>
                    <option value={IntegrationCategory.GitHub}>GitHub</option>
                    <option value={IntegrationCategory.CI}>CI</option>
                    <option value={IntegrationCategory.Sync}>Sync</option>
                  </select>
                </div>

                {/* Integration Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                  {filteredIntegrations.map(integration => (
                    <IntegrationCard
                      key={integration.name}
                      integration={integration}
                      onHealthCheck={onHealthCheck}
                      onDispatch={handleDispatch}
                      dispatchStatus={dispatchStatus[integration.name] || DispatchStatus.Idle}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Phase Tracker Section */}
          {showPhaseTracker && (
            <div data-testid="phase-tracker-content" style={{ marginBottom: '32px' }}>
              <PhaseTracker 
                projects={displayProjects}
                onStepUpdate={handlePhaseStepUpdate}
              />
              
              {/* Show recent executions */}
              {executionHistory.length > 0 && (
                <div style={{ marginTop: '24px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>
                    📜 Recent Executions
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {executionHistory.slice(0, 5).map(execution => (
                      <div
                        key={execution.id}
                        style={{
                          padding: '12px',
                          backgroundColor: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div>
                          <span style={{ fontWeight: '500' }}>{execution.templateName}</span>
                          <span style={{ color: '#6b7280', marginLeft: '8px' }}>
                            ({execution.templateId})
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={getStatusChipStyle(
                            execution.status === 'done' ? IntegrationStatus.Working :
                            execution.status === 'error' ? IntegrationStatus.Broken :
                            IntegrationStatus.Degraded
                          )}>
                            {execution.status}
                          </span>
                          <span style={{ color: '#6b7280', fontSize: '12px' }}>
                            {new Date().toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Phase Admin Modal */}
          {showPhaseAdmin && (
            <PhaseAdminModal
              isOpen={showPhaseAdmin}
              projects={projects}
              onClose={() => setShowPhaseAdmin(false)}
              onProjectsUpdate={setProjects}
            />
          )}
        </div>
      </div>
    </div>
  );
};