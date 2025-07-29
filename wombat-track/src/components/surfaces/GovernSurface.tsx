import React, { useState } from 'react';
import { Shield, Search, Filter, Bot, FileText, Calendar } from 'lucide-react';
import { StatusCard } from '../common/StatusCard';
import { ClaudePromptButton } from '../common/ClaudePromptButton';
import { GovernanceLogItem, type GovernanceLogEntry } from '../common/GovernanceLogItem';
import type { Project, Phase, PhaseStep as Step } from '../../types/phase';

interface GovernSurfaceProps {
  currentProject: Project | null;
  currentPhase: Phase | null;
  currentStep: Step | null;
  onPhaseChange: (phase: Phase) => void;
  onStepChange: (step: Step) => void;
}

const mockGovernanceEntries: GovernanceLogEntry[] = [
  {
    id: 'gov-1',
    entryType: 'Review',
    title: 'Phase 2 Development Review',
    summary: 'Comprehensive review of development progress and quality gates',
    details: `## Review Summary
Conducted thorough review of Phase 2 development activities:

### Key Findings:
- All critical features implemented on schedule
- Code quality metrics exceed baseline requirements
- Test coverage at 85% (target: 80%)
- Documentation completeness at 90%

### Decisions Made:
1. Approved progression to next development milestone
2. Allocated additional resources for performance optimization
3. Scheduled stakeholder demo for next week

### Action Items:
- Update project timeline with revised estimates
- Schedule security review with InfoSec team
- Prepare client presentation materials

### Risk Assessment:
- Low risk: Technical implementation
- Medium risk: Resource availability for Q4
- High risk: Third-party API dependencies`,
    author: 'project-manager',
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    projectId: 'proj-1',
    phaseId: 'phase-2',
    tags: ['review', 'development', 'quality'],
    aiGenerated: false,
    attachments: ['phase2-review-report.pdf', 'quality-metrics.xlsx']
  },
  {
    id: 'gov-2',
    entryType: 'AI_Session',
    title: 'AI Risk Assessment for API Integration',
    summary: 'Claude-generated analysis of risks associated with third-party API dependencies',
    details: `## AI Risk Assessment Report

### Analysis Scope:
Third-party API integration risks for Complize Platform

### Identified Risks:
1. **Rate Limiting (High)**
   - Current API limits may be insufficient for peak usage
   - Mitigation: Implement caching and request batching

2. **Service Availability (Medium)**
   - SLA guarantees 99.5% uptime
   - Mitigation: Implement fallback mechanisms and graceful degradation

3. **Data Security (High)**
   - Sensitive data transmitted via API
   - Mitigation: End-to-end encryption and data minimization

4. **Cost Escalation (Medium)**
   - Usage-based pricing model
   - Mitigation: Implement usage monitoring and alerts

### Recommendations:
- Establish monitoring dashboards for API health
- Create incident response procedures
- Negotiate better SLA terms with vendor
- Implement circuit breaker patterns`,
    author: 'claude-ai',
    timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    projectId: 'proj-1',
    phaseId: 'phase-2',
    stepId: 'step-2',
    tags: ['AI', 'risk-assessment', 'API', 'security'],
    aiGenerated: true
  },
  {
    id: 'gov-3',
    entryType: 'Decision',
    title: 'Technology Stack Approval',
    summary: 'Final approval of technology choices for platform implementation',
    details: `## Technology Stack Decision

### Approved Technologies:
- **Frontend**: React 18 with TypeScript
- **Backend**: Node.js with Express
- **Database**: PostgreSQL with Redis cache
- **Infrastructure**: AWS with Docker containers
- **CI/CD**: GitHub Actions with automated testing

### Decision Rationale:
1. Team expertise and familiarity
2. Strong community support and documentation
3. Scalability and performance characteristics
4. Integration capabilities with existing systems
5. Long-term maintainability considerations

### Alternatives Considered:
- Vue.js (rejected due to team familiarity)
- MongoDB (rejected due to ACID requirements)
- Azure (rejected due to existing AWS infrastructure)

### Implementation Timeline:
- Setup and configuration: 2 weeks
- Development environment: 1 week
- Production deployment: 3 weeks`,
    author: 'technical-lead',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    projectId: 'proj-1',
    phaseId: 'phase-1',
    tags: ['decision', 'technology', 'architecture'],
    aiGenerated: false
  },
  {
    id: 'gov-4',
    entryType: 'Audit',
    title: 'Security Compliance Audit',
    summary: 'Quarterly security audit findings and compliance status',
    details: `## Security Compliance Audit Report

### Audit Scope:
- Code security review
- Infrastructure security assessment
- Data protection compliance
- Access control verification

### Findings:
#### Critical (0):
None identified

#### High (1):
- Insufficient logging for authentication events

#### Medium (3):
- Missing rate limiting on public APIs
- Outdated dependency versions
- Incomplete data retention policies

#### Low (5):
- Various minor configuration improvements

### Compliance Status:
- GDPR: Compliant
- SOC2: Compliant with minor recommendations
- ISO 27001: In progress (85% complete)

### Remediation Plan:
1. Immediate: Implement comprehensive audit logging
2. Short-term: Update dependencies and implement rate limiting
3. Long-term: Complete ISO 27001 certification process`,
    author: 'security-team',
    timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    projectId: 'proj-1',
    tags: ['audit', 'security', 'compliance'],
    aiGenerated: false,
    relatedEntries: ['gov-2']
  }
];

export const GovernSurface: React.FC<GovernSurfaceProps> = ({
  currentProject,
  currentPhase: _currentPhase, // eslint-disable-line @typescript-eslint/no-unused-vars
  currentStep: _currentStep, // eslint-disable-line @typescript-eslint/no-unused-vars
  onPhaseChange: _onPhaseChange, // eslint-disable-line @typescript-eslint/no-unused-vars
  onStepChange: _onStepChange // eslint-disable-line @typescript-eslint/no-unused-vars
}) => {
  const [activeTab, setActiveTab] = useState<'logs' | 'reviews' | 'audit'>('logs');
  const [governanceEntries] = useState<GovernanceLogEntry[]>(mockGovernanceEntries);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  if (!currentProject) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Project Selected</h3>
          <p className="text-gray-600">Select a project to view governance information.</p>
        </div>
      </div>
    );
  }

  const handleClaudePrompt = async (prompt: string, _context?: Record<string, unknown>) => { // eslint-disable-line @typescript-eslint/no-unused-vars
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    if (prompt.toLowerCase().includes('audit')) {
      return `I'll help you prepare for an audit of "${currentProject.name}". Here's a comprehensive audit framework:

## Pre-Audit Preparation Checklist

### Documentation Review:
- [ ] Project charter and scope documents
- [ ] Risk assessments and mitigation plans
- [ ] Change management logs
- [ ] Quality assurance reports
- [ ] Security compliance documentation

### Process Verification:
- [ ] Development lifecycle adherence
- [ ] Code review processes
- [ ] Testing procedures and coverage
- [ ] Deployment and rollback procedures
- [ ] Incident response protocols

### Compliance Assessment:
- [ ] Regulatory requirements (GDPR, SOX, etc.)
- [ ] Industry standards (ISO 27001, SOC2)
- [ ] Internal policy compliance
- [ ] Data protection measures
- [ ] Access control verification

### Key Areas of Focus:
1. **Technical Controls**: Security implementations, monitoring systems
2. **Operational Controls**: Processes, procedures, training
3. **Administrative Controls**: Policies, governance structures

### Audit Trail Requirements:
- Complete change history
- Decision rationale documentation
- Approval workflows
- Exception handling procedures
- Performance metrics and KPIs

Would you like me to elaborate on any specific audit area?`;
    }

    return `I can help you with governance activities for "${currentProject.name}". Here are some areas I can assist with:

**Governance Support:**
- Generate audit trails and compliance reports
- Create risk assessment documentation
- Draft governance review summaries
- Analyze project compliance status

**Review Activities:**
- Quality gate assessments  
- Phase completion reviews
- Risk evaluation and mitigation
- Decision documentation and rationale

**Audit Preparation:**
- Compliance checklists
- Evidence collection guidance
- Gap analysis and remediation plans
- Audit response preparation

**AI Insights:**
- Pattern analysis across governance events
- Risk trend identification
- Compliance status monitoring
- Automated report generation

What specific governance activity would you like assistance with?`;
  };

  const getGovernanceStats = () => {
    const projectEntries = governanceEntries.filter(entry => entry.projectId === currentProject.id);
    const recentEntries = projectEntries.filter(entry =>
      new Date(entry.timestamp) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );
    const aiGeneratedEntries = projectEntries.filter(entry => entry.aiGenerated);
    const reviewsCount = projectEntries.filter(entry => entry.entryType === 'Review').length;
    const auditsCount = projectEntries.filter(entry => entry.entryType === 'Audit').length;
    const decisionsCount = projectEntries.filter(entry => entry.entryType === 'Decision').length;

    return {
      totalEntries: projectEntries.length,
      recentEntries: recentEntries.length,
      aiGeneratedEntries: aiGeneratedEntries.length,
      reviewsCount,
      auditsCount,
      decisionsCount
    };
  };

  const filteredEntries = governanceEntries
    .filter(entry => entry.projectId === currentProject.id)
    .filter(entry => filterType === 'all' || entry.entryType === filterType)
    .filter(entry => 
      searchTerm === '' || 
      entry.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const stats = getGovernanceStats();

  const handleViewEntry = (entryId: string) => {
    console.log('View entry:', entryId);
  };

  const handleEditEntry = (entryId: string) => {
    console.log('Edit entry:', entryId);
  };

  const handleDeleteEntry = (entryId: string) => {
    console.log('Delete entry:', entryId);
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6" data-testid="govern-surface">
      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-3">
              <Shield className="w-6 h-6 text-orange-600" />
              <span>Govern Surface</span>
            </h1>
            <p className="text-gray-600 mt-1">
              Logs, reviews, and AI audit trails for {currentProject.name}
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <ClaudePromptButton
              type="analyze"
              label="AI Audit"
              onPrompt={handleClaudePrompt}
              testId="govern-ai-audit"
            />
            <button className="flex items-center space-x-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors">
              <FileText className="w-4 h-4" />
              <span>New Entry</span>
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatusCard
            title="Total Entries"
            status="info"
            value={stats.totalEntries}
            description="Governance records"
            testId="govern-total-card"
          />
          <StatusCard
            title="Recent Activity"
            status={stats.recentEntries > 0 ? 'success' : 'warning'}
            value={stats.recentEntries}
            description="This week"
            testId="govern-recent-card"
          />
          <StatusCard
            title="AI Generated"
            status={stats.aiGeneratedEntries > 0 ? 'success' : 'info'}
            value={stats.aiGeneratedEntries}
            description={`${Math.round((stats.aiGeneratedEntries / stats.totalEntries) * 100)}% of total`}
            testId="govern-ai-card"
          />
          <StatusCard
            title="Reviews"
            status="success"
            value={stats.reviewsCount}
            description={`${stats.auditsCount} audits, ${stats.decisionsCount} decisions`}
            testId="govern-reviews-card"
          />
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" role="tablist">
            {[
              { id: 'logs', label: 'Governance Logs', icon: FileText },
              { id: 'reviews', label: 'Reviews & Decisions', icon: Calendar },
              { id: 'audit', label: 'AI Audit Trail', icon: Bot }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as 'logs' | 'reviews' | 'audit')}
                className={`flex items-center space-x-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === id
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                data-testid={`govern-tab-${id}`}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Search and Filter Controls */}
          <div className="flex items-center space-x-4 mb-6">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search governance entries..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                data-testid="govern-search"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                data-testid="govern-filter"
              >
                <option value="all">All Types</option>
                <option value="Review">Reviews</option>
                <option value="Decision">Decisions</option>
                <option value="Change">Changes</option>
                <option value="AI_Session">AI Sessions</option>
                <option value="Audit">Audits</option>
                <option value="Risk_Assessment">Risk Assessments</option>
              </select>
            </div>
          </div>

          {activeTab === 'logs' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">
                  Governance Logs ({filteredEntries.length})
                </h2>
                <ClaudePromptButton
                  type="ask"
                  label="Ask About Logs"
                  onPrompt={handleClaudePrompt}
                  testId="logs-claude-ask"
                />
              </div>

              {filteredEntries.length > 0 ? (
                <div className="space-y-4">
                  {filteredEntries.map((entry) => (
                    <GovernanceLogItem
                      key={entry.id}
                      entry={entry}
                      onView={handleViewEntry}
                      onEdit={handleEditEntry}
                      onDelete={handleDeleteEntry}
                      testId={`log-item-${entry.id}`}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Entries Found</h3>
                  <p className="text-gray-600">
                    {searchTerm || filterType !== 'all' 
                      ? 'Try adjusting your search or filter criteria.'
                      : 'No governance entries have been created yet.'
                    }
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Reviews & Decisions</h2>
                <button className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
                  <Calendar className="w-4 h-4" />
                  <span>Schedule Review</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-medium text-blue-900 mb-2">Upcoming Reviews</h3>
                  <div className="space-y-2">
                    <div className="text-sm text-blue-800">Phase 3 Kickoff Review - Tomorrow</div>
                    <div className="text-sm text-blue-800">Security Audit - Next Week</div>
                    <div className="text-sm text-blue-800">Quarterly Governance Review - Next Month</div>
                  </div>
                </div>
                
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-medium text-green-900 mb-2">Recent Decisions</h3>
                  <div className="space-y-2">
                    <div className="text-sm text-green-800">Technology stack approved</div>
                    <div className="text-sm text-green-800">Budget allocation finalized</div>
                    <div className="text-sm text-green-800">Resource assignments confirmed</div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {filteredEntries
                  .filter(entry => entry.entryType === 'Review' || entry.entryType === 'Decision')
                  .map((entry) => (
                    <GovernanceLogItem
                      key={entry.id}
                      entry={entry}
                      onView={handleViewEntry}
                      onEdit={handleEditEntry}
                      testId={`review-item-${entry.id}`}
                    />
                  ))}
              </div>
            </div>
          )}

          {activeTab === 'audit' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">AI Audit Trail</h2>
                <ClaudePromptButton
                  type="analyze"
                  prompt="Perform a comprehensive audit analysis of the current project governance"
                  onPrompt={handleClaudePrompt}
                  testId="audit-comprehensive-analysis"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <ClaudePromptButton
                  type="scaffold"
                  prompt="Generate an audit checklist for this project phase"
                  onPrompt={handleClaudePrompt}
                  className="w-full"
                  testId="audit-checklist"
                />
                
                <ClaudePromptButton
                  type="ask"
                  prompt="What are the key compliance requirements for this project?"
                  onPrompt={handleClaudePrompt}
                  className="w-full"
                  testId="audit-compliance"
                />
                
                <ClaudePromptButton
                  type="revise"
                  prompt="Review governance processes and suggest improvements"
                  onPrompt={handleClaudePrompt}
                  className="w-full"
                  testId="audit-improvements"
                />
              </div>

              <div className="space-y-4">
                {filteredEntries
                  .filter(entry => entry.entryType === 'AI_Session' || entry.entryType === 'Audit')
                  .map((entry) => (
                    <GovernanceLogItem
                      key={entry.id}
                      entry={entry}
                      onView={handleViewEntry}
                      testId={`audit-item-${entry.id}`}
                    />
                  ))}
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <h3 className="font-medium text-orange-900 mb-2">AI Audit Capabilities</h3>
                <ul className="text-sm text-orange-800 space-y-1">
                  <li>• Automated compliance checking against industry standards</li>
                  <li>• Risk pattern analysis across project phases</li>
                  <li>• Gap identification in governance processes</li>
                  <li>• Audit trail validation and completeness verification</li>
                  <li>• Continuous monitoring and alerting for compliance issues</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};