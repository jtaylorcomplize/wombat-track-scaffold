import React, { useState } from 'react';
import { Plug, Activity, RefreshCw, Network } from 'lucide-react';
import { OrbisDashboard } from '../orbis/OrbisDashboard';
import { AgentMesh } from '../mesh/AgentMesh';
import { StatusCard } from '../common/StatusCard';
import { ClaudePromptButton } from '../common/ClaudePromptButton';
import type { Project, Phase, PhaseStep as Step } from '../../types/phase';

interface IntegrateSurfaceProps {
  currentProject: Project | null;
  currentPhase: Phase | null;
  currentStep: Step | null;
  onPhaseChange: (phase: Phase) => void;
  onStepChange: (step: Step) => void;
}

export const IntegrateSurface: React.FC<IntegrateSurfaceProps> = ({
  currentProject,
  currentPhase: _currentPhase, // eslint-disable-line @typescript-eslint/no-unused-vars
  currentStep: _currentStep, // eslint-disable-line @typescript-eslint/no-unused-vars
  onPhaseChange: _onPhaseChange, // eslint-disable-line @typescript-eslint/no-unused-vars
  onStepChange: _onStepChange // eslint-disable-line @typescript-eslint/no-unused-vars
}) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'mesh'>('dashboard');
  const handleClaudePrompt = async (prompt: string, _context?: Record<string, unknown>) => { // eslint-disable-line @typescript-eslint/no-unused-vars
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    if (prompt.toLowerCase().includes('integration')) {
      return `I can help you analyze and optimize your integrations for "${currentProject?.name || 'your project'}":

**Integration Health Analysis:**
- Monitor API response times and error rates
- Track service dependencies and bottlenecks
- Identify integration patterns and anti-patterns

**Recommendations:**
1. **Performance Optimization:**
   - Implement circuit breakers for external APIs
   - Add caching layers where appropriate
   - Set up retry mechanisms with exponential backoff

2. **Monitoring & Alerting:**
   - Configure health check endpoints
   - Set up automated monitoring dashboards
   - Create alerting rules for critical failures

3. **Best Practices:**
   - Document API contracts and SLAs
   - Implement graceful degradation strategies
   - Regular integration testing and validation

**Next Steps:**
- Review current integration architecture
- Implement monitoring for critical services
- Set up automated health checks

What specific integration challenges would you like help with?`;
    }

    return `I can help you with integration management for "${currentProject?.name || 'your project'}". Here are some areas I can assist with:

**Integration Support:**
- Health check automation and monitoring
- API integration best practices
- Service dependency analysis
- Performance optimization strategies

**Troubleshooting:**
- Debug integration failures
- Analyze error patterns and trends
- Suggest fixes for common issues
- Performance bottleneck identification

**Planning:**
- Integration architecture reviews
- Service mesh recommendations
- Scaling strategies for high-traffic APIs
- Security considerations for external integrations

What would you like help with today?`;
  };

  const handleHealthCheck = async () => {
    console.log('Running health check for all integrations...');
    // This would trigger the health check for all integrations
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('Health check completed');
  };

  if (!currentProject) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Plug className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Project Selected</h3>
          <p className="text-gray-600">Select a project to view integrations.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6" data-testid="integrate-surface">
      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-3">
              <Plug className="w-6 h-6 text-purple-600" />
              <span>Integrate Surface</span>
            </h1>
            <p className="text-gray-600 mt-1">
              🔌 Integration Health monitoring and management for {currentProject.name}
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <ClaudePromptButton
              type="analyze"
              label="Analyze Integrations"
              onPrompt={handleClaudePrompt}
              testId="integrate-ai-analyze"
            />
            <button 
              onClick={handleHealthCheck}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Health Check</span>
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatusCard
            title="Integration Health"
            status="success"
            value="Healthy"
            description="All systems operational"
            testId="integrate-health-card"
          />
          <StatusCard
            title="Active Services"
            status="info"
            value="12"
            description="Connected integrations"
            testId="integrate-services-card"
          />
          <StatusCard
            title="Response Time"
            status="success"
            value="<200ms"
            description="Average API response"
            testId="integrate-response-card"
          />
          <StatusCard
            title="Uptime"
            status="success"
            value="99.9%"
            description="Last 30 days"
            testId="integrate-uptime-card"
          />
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'dashboard'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4" />
                <span>Integration Dashboard</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('mesh')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'mesh'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Network className="w-4 h-4" />
                <span>Agent Mesh</span>
              </div>
            </button>
          </nav>
        </div>
        
        <div className="p-6">
          {activeTab === 'dashboard' && (
            <div>
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2 mb-2">
                  <Activity className="w-5 h-5 text-purple-600" />
                  <span>Integration Dashboard</span>
                </h2>
                <p className="text-sm text-gray-600">
                  Real-time monitoring of all system integrations and dependencies
                </p>
              </div>
              <OrbisDashboard onHealthCheck={handleHealthCheck} />
            </div>
          )}
          
          {activeTab === 'mesh' && (
            <AgentMesh />
          )}
        </div>
      </div>
    </div>
  );
};