import React, { useState } from 'react';
import { Plus, Layout, Target, Bot, Calendar, Users } from 'lucide-react';
import { StatusCard } from '../common/StatusCard';
import { ClaudePromptButton } from '../common/ClaudePromptButton';
import { PhaseBreadcrumb } from '../common/PhaseBreadcrumb';
import { ProgressBar } from '../common/ProgressBar';
import { HelpTooltip } from '../common/HelpTooltip';
import { SmartSuggestion } from '../common/SmartSuggestion';
import { EmptyState } from '../common/EmptyState';
import type { Project, Phase, PhaseStep as Step } from '../../types/phase';

interface PlanSurfaceProps {
  currentProject: Project | null;
  currentPhase: Phase | null;
  currentStep: Step | null;
  onPhaseChange: (phase: Phase) => void;
  onStepChange: (step: Step) => void;
}

export const PlanSurface: React.FC<PlanSurfaceProps> = ({
  currentProject,
  currentPhase,
  currentStep,
  onPhaseChange,
  onStepChange
}) => {
  const [activeTab, setActiveTab] = useState<'composer' | 'phases' | 'scaffold'>('composer');

  if (!currentProject) {
    return (
      <EmptyState
        icon={Layout}
        title="No Project Selected"
        description="Select a project from the sidebar to start planning your work surfaces and phases."
        action={{
          label: "Create New Project",
          onClick: () => console.log("Create project clicked"),
          variant: "primary"
        }}
        secondaryAction={{
          label: "Browse Templates",
          onClick: () => console.log("Browse templates clicked")
        }}
      />
    );
  }

  const handleClaudePrompt = async (prompt: string, context?: any) => {
    // Mock Claude API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    if (prompt.toLowerCase().includes('phase')) {
      return `Based on your project "${currentProject.name}", I recommend the following phases:

1. **Discovery & Requirements** (2-3 weeks)
   - Stakeholder interviews
   - Technical requirements gathering
   - Risk assessment

2. **Design & Architecture** (3-4 weeks)
   - System design
   - Database schema
   - API specifications

3. **Development** (8-12 weeks)
   - Core feature implementation
   - Integration development
   - Testing framework setup

4. **Testing & QA** (2-3 weeks)
   - Unit and integration testing
   - User acceptance testing
   - Performance optimization

5. **Deployment & Launch** (1-2 weeks)
   - Production deployment
   - Monitoring setup
   - Go-live activities

This structure ensures comprehensive coverage while maintaining agility.`;
    }

    return `I can help you plan your project "${currentProject.name}". Here are some suggestions:

**Project Planning Recommendations:**
- Break down complex features into manageable phases
- Define clear success criteria for each milestone
- Identify dependencies and potential bottlenecks
- Plan for iterative feedback and adjustments

**Next Steps:**
1. Review and prioritize feature requirements
2. Create detailed phase plans with specific deliverables
3. Set up governance checkpoints
4. Define testing and quality gates

Would you like me to elaborate on any of these areas?`;
  };

  const getProjectStats = () => {
    const totalPhases = currentProject.phases.length;
    const completedPhases = currentProject.phases.filter(p => p.status === 'completed').length;
    const inProgressPhases = currentProject.phases.filter(p => p.status === 'in_progress').length;
    const totalSteps = currentProject.phases.reduce((sum, phase) => sum + (phase.steps?.length || 0), 0);
    const completedSteps = currentProject.phases.reduce((sum, phase) => 
      sum + (phase.steps?.filter(step => step.status === 'complete' || step.status === 'completed').length || 0), 0);

    return {
      totalPhases,
      completedPhases,
      inProgressPhases,
      totalSteps,
      completedSteps,
      completionRate: totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0
    };
  };

  const stats = getProjectStats();

  return (
    <div className="wt-section-spacing" data-testid="plan-surface">
      {/* Smart Suggestions */}
      {stats.completionRate < 20 && (
        <SmartSuggestion
          title="Get Started with AI Scaffolding"
          description="Let Claude help you create a complete project structure based on your requirements. This can save hours of planning time."
          variant="tip"
          actions={[
            {
              label: "Try AI Scaffold",
              onClick: () => setActiveTab('scaffold'),
              variant: "primary"
            },
            {
              label: "Learn More",
              onClick: () => console.log("Learn more clicked")
            }
          ]}
        />
      )}

      {stats.totalPhases === 0 && (
        <SmartSuggestion
          title="Create Your First Phase"
          description="Break your project into manageable phases to track progress and organize work effectively."
          variant="info"
          actions={[
            {
              label: "Add Phase",
              onClick: () => console.log("Add phase clicked"),
              variant: "primary"
            }
          ]}
        />
      )}

      {/* Header */}
      <div className="wt-card wt-breathing-room mb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center mb-2" style={{ gap: 'var(--wt-space-3)' }}>
              <h1 className="wt-heading-2 flex items-center" style={{ gap: 'var(--wt-space-3)' }}>
                <Layout className="w-6 h-6" style={{ color: 'var(--wt-primary-600)' }} />
                <span>Set Up</span>
              </h1>
              <HelpTooltip 
                content="The Set Up surface helps you plan your project structure, create phases, and use AI to scaffold your work."
                position="right"
              />
            </div>
            <p className="wt-body-large">
              Composer, phase setup, and AI scaffolding for {currentProject.name}
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <ClaudePromptButton
              type="scaffold"
              label="AI Scaffold"
              onPrompt={handleClaudePrompt}
              testId="plan-ai-scaffold"
            />
            <button className="wt-button-primary wt-focus-ring wt-mobile-full-width flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" />
              <span>New Phase</span>
            </button>
          </div>
        </div>

        {/* Project Progress Overview */}
        <div className="wt-card mb-6" style={{ padding: 'var(--wt-space-6)' }}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="wt-heading-4">Project Progress</h3>
            <span className="wt-caption">{stats.completedSteps} of {stats.totalSteps} steps complete</span>
          </div>
          <ProgressBar
            value={stats.completionRate}
            max={100}
            variant={stats.completionRate >= 80 ? 'success' : stats.completionRate >= 50 ? 'default' : 'warning'}
            showPercentage={true}
            animated={true}
          />
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 wt-section-spacing">
          <StatusCard
            title="Active Phases"
            status="in_progress"
            value={stats.inProgressPhases}
            description={`${stats.completedPhases} completed`}
            testId="plan-phases-card"
          />
          <StatusCard
            title="Project Type"
            status="info"
            value={currentProject.projectType}
            description={`Owner: ${currentProject.projectOwner}`}
            testId="plan-type-card"
          />
          <StatusCard
            title="Status"
            status={currentProject.status === 'Active' ? 'success' : 'warning'}
            value={currentProject.status}
            description="Project health"
            testId="plan-status-card"
          />
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" role="tablist">
            {[
              { id: 'composer', label: 'Project Composer', icon: Target },
              { id: 'phases', label: 'Phase Setup', icon: Calendar },
              { id: 'scaffold', label: 'AI Scaffold', icon: Bot }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as any)}
                className={`flex items-center space-x-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                data-testid={`plan-tab-${id}`}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'composer' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Project Composer</h2>
                <ClaudePromptButton
                  type="ask"
                  label="Ask Claude"
                  onPrompt={handleClaudePrompt}
                  testId="composer-claude-ask"
                />
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-3">Feature Planning</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Plan and organize features for your project with AI assistance.
                  </p>
                  <button className="w-full bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors">
                    Open Feature Composer
                  </button>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-3">Requirements</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Define and manage project requirements and acceptance criteria.
                  </p>
                  <button className="w-full bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition-colors">
                    Manage Requirements
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'phases' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Phase Setup</h2>
                <button className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
                  <Plus className="w-4 h-4" />
                  <span>Add Phase</span>
                </button>
              </div>

              <PhaseBreadcrumb
                phases={currentProject.phases}
                currentPhase={currentPhase}
                currentStep={currentStep}
                onPhaseSelect={onPhaseChange}
                onStepSelect={onStepChange}
                showSteps={true}
                testId="plan-phase-breadcrumb"
              />
            </div>
          )}

          {activeTab === 'scaffold' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">AI Scaffold</h2>
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">Powered by Claude</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ClaudePromptButton
                  type="scaffold"
                  prompt="Generate a comprehensive project plan with phases, milestones, and deliverables"
                  onPrompt={handleClaudePrompt}
                  className="w-full"
                  testId="scaffold-project-plan"
                />
                
                <ClaudePromptButton
                  type="analyze"
                  prompt="Analyze current project structure and suggest improvements"
                  onPrompt={handleClaudePrompt}
                  className="w-full"
                  testId="scaffold-analyze"
                />
                
                <ClaudePromptButton
                  type="ask"
                  prompt="What are the key risks and mitigation strategies for this project?"
                  onPrompt={handleClaudePrompt}
                  className="w-full"
                  testId="scaffold-risks"
                />
                
                <ClaudePromptButton
                  type="revise"
                  prompt="Review and optimize the current phase structure"
                  onPrompt={handleClaudePrompt}
                  className="w-full"
                  testId="scaffold-optimize"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 mb-2">AI Scaffolding Tips</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Be specific about your project goals and constraints</li>
                  <li>• Include context about your team size and timeline</li>
                  <li>• Mention any existing systems or dependencies</li>
                  <li>• Ask for iterative refinements based on feedback</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};