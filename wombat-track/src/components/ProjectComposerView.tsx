import React, { useState, useMemo } from 'react';
import { Plus, Rocket } from 'lucide-react';
import { SubAppSelector } from './composer/SubAppSelector';
import { FeatureTable } from './composer/FeatureTable';
import { AddFeatureModal } from './composer/AddFeatureModal';
import { ExportPlanButton } from './composer/ExportPlanButton';
import { AISummaryPanel } from './composer/AISummaryPanel';
import { getAllFeatures, getUniqueApps, getUniqueSubApps, getUniqueOwners } from '../mockData/featureSeeds';
import type { FeaturePlanRow, FeatureFilter, AIPromptSession } from '../types/feature';

export const ProjectComposerView: React.FC = () => {
  // State management
  const [features, setFeatures] = useState<FeaturePlanRow[]>(getAllFeatures());
  const [filter, setFilter] = useState<FeatureFilter>({});
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Derived data
  const apps = useMemo(() => getUniqueApps(), []);
  const subApps = useMemo(() => getUniqueSubApps(), []);
  const owners = useMemo(() => getUniqueOwners(), []);

  // Filtered features based on current filter
  const filteredFeatures = useMemo(() => {
    return features.filter(feature => {
      if (filter.app && feature.app !== filter.app) return false;
      if (filter.subApp && feature.subApp !== filter.subApp) return false;
      if (filter.status && feature.ragStatus !== filter.status) return false;
      if (filter.owner && feature.ownerName !== filter.owner) return false;
      return true;
    });
  }, [features, filter]);

  // Event handlers
  const handleFeatureSelect = (featureId: string) => {
    setSelectedFeatures(prev => 
      prev.includes(featureId)
        ? prev.filter(id => id !== featureId)
        : [...prev, featureId]
    );
  };

  const handleAddFeature = (newFeature: Omit<FeaturePlanRow, 'id' | 'createdAt' | 'updatedAt'>) => {
    const feature: FeaturePlanRow = {
      ...newFeature,
      id: String(features.length + 1).padStart(2, '0'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    setFeatures(prev => [...prev, feature]);
  };

  const handleEditAI = async (feature: FeaturePlanRow) => {
    setIsLoading(true);
    
    // Mock AI edit functionality
    const prompt = `Edit the feature plan for "${feature.featureName}" in ${feature.app} → ${feature.subApp}. 
Current status: ${feature.ragStatus}
Current description: ${feature.description || 'No description'}

Please provide suggestions for improvement, risk mitigation, and next steps.`;

    console.log('AI Edit Prompt:', prompt);
    
    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Mock AI response
    const aiResponse = `Based on the analysis of "${feature.featureName}":

**Suggestions:**
- Break down into smaller, testable components
- Define clear acceptance criteria
- Identify potential integration points

**Risk Mitigation:**
- Set up regular check-ins with ${feature.ownerName || 'assigned owner'}
- Create fallback plan for critical dependencies
- Implement progressive rollout strategy

**Next Steps:**
1. Conduct technical design review
2. Create detailed implementation plan
3. Set up monitoring and alerting`;

    // Store the AI session (in real app, this would go to backend)
    const aiSession: AIPromptSession = {
      id: `ai-${Date.now()}`,
      featureId: feature.id,
      prompt,
      response: aiResponse,
      timestamp: new Date().toISOString(),
      actionType: 'edit'
    };

    console.log('AI Response:', aiSession);
    alert(`AI suggestions generated for "${feature.featureName}".\nCheck console for details.`);
    
    setIsLoading(false);
  };

  const handleScaffoldAI = async (feature: FeaturePlanRow) => {
    setIsLoading(true);
    
    // Mock AI scaffolding functionality
    const prompt = `Create a Phase Plan for the feature: "${feature.featureName}", within the ${feature.subApp} sub-app of ${feature.app}. 
Include setup, error handling, governance, and testing phases.

Feature details:
- Description: ${feature.description || 'No description provided'}
- Priority: ${feature.priority || 'Not specified'}
- Owner: ${feature.ownerName || 'To be assigned'}
- Dependencies: ${feature.dependencies?.join(', ') || 'None specified'}`;

    console.log('AI Scaffold Prompt:', prompt);
    
    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Mock generated phase steps
    const generatedSteps = [
      {
        id: `${feature.id}-step-1`,
        phaseId: `${feature.id}-phase-setup`,
        name: 'Initial Setup and Requirements Gathering',
        status: 'not_started' as const,
        description: `Set up development environment and gather detailed requirements for ${feature.featureName}`,
        stepInstruction: 'Create development environment and document requirements',
        isSideQuest: false
      },
      {
        id: `${feature.id}-step-2`,
        phaseId: `${feature.id}-phase-development`,
        name: 'Core Feature Implementation',
        status: 'not_started' as const,
        description: `Implement the main functionality for ${feature.featureName}`,
        stepInstruction: 'Develop core feature according to specifications',
        isSideQuest: false
      },
      {
        id: `${feature.id}-step-3`,
        phaseId: `${feature.id}-phase-testing`,
        name: 'Testing and Quality Assurance',
        status: 'not_started' as const,
        description: 'Comprehensive testing including unit, integration, and user acceptance tests',
        stepInstruction: 'Execute test plan and resolve any issues',
        isSideQuest: false
      },
      {
        id: `${feature.id}-step-4`,
        phaseId: `${feature.id}-phase-governance`,
        name: 'Governance Review and Documentation',
        status: 'not_started' as const,
        description: 'Final review and documentation for governance compliance',
        stepInstruction: 'Complete governance review and update documentation',
        isSideQuest: true
      }
    ];

    // Update feature with generated phase steps
    setFeatures(prev => prev.map(f => 
      f.id === feature.id 
        ? { ...f, generatedPhaseSteps: generatedSteps, updatedAt: new Date().toISOString() }
        : f
    ));

    const aiSession: AIPromptSession = {
      id: `scaffold-${Date.now()}`,
      featureId: feature.id,
      prompt,
      response: `Generated ${generatedSteps.length} phase steps for ${feature.featureName}`,
      timestamp: new Date().toISOString(),
      actionType: 'scaffold'
    };

    console.log('Generated Phase Steps:', generatedSteps);
    console.log('AI Session:', aiSession);
    alert(`Phase plan generated for "${feature.featureName}"!\n${generatedSteps.length} steps created.`);
    
    setIsLoading(false);
  };

  const handleExport = (format: 'markdown' | 'csv' | 'json', exportFeatures: FeaturePlanRow[]) => {
    const timestamp = new Date().toISOString().split('T')[0];
    let content = '';
    let filename = '';
    let mimeType = '';

    switch (format) {
      case 'markdown':
        content = generateMarkdownExport(exportFeatures);
        filename = `features-export-${timestamp}.md`;
        mimeType = 'text/markdown';
        break;
      case 'csv':
        content = generateCSVExport(exportFeatures);
        filename = `features-export-${timestamp}.csv`;
        mimeType = 'text/csv';
        break;
      case 'json':
        content = JSON.stringify(exportFeatures, null, 2);
        filename = `features-export-${timestamp}.json`;
        mimeType = 'application/json';
        break;
    }

    // Create and download file
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log(`Exported ${exportFeatures.length} features as ${format.toUpperCase()}`);
  };

  const generateMarkdownExport = (exportFeatures: FeaturePlanRow[]): string => {
    return `# Feature Plan Export

Generated on: ${new Date().toLocaleString()}

## Summary
- Total Features: ${exportFeatures.length}
- Apps: ${[...new Set(exportFeatures.map(f => f.app))].join(', ')}
- Sub-Apps: ${[...new Set(exportFeatures.map(f => f.subApp))].join(', ')}

## Features

${exportFeatures.map(feature => `
### ${feature.featureName} (ID: ${feature.id})

- **App**: ${feature.app} → ${feature.subApp}
- **RAG Status**: ${feature.ragStatus}
- **Owner**: ${feature.ownerName || 'Unassigned'}
- **Priority**: ${feature.priority || 'Not specified'}
- **Estimated Effort**: ${feature.estimatedEffort || 'Not specified'}

${feature.description ? `**Description**: ${feature.description}` : ''}

${feature.dependencies && feature.dependencies.length > 0 ? `**Dependencies**: ${feature.dependencies.join(', ')}` : ''}

${feature.artefactLinks && feature.artefactLinks.length > 0 ? `**Links**: ${feature.artefactLinks.join(', ')}` : ''}

---
`).join('')}
`;
  };

  const generateCSVExport = (exportFeatures: FeaturePlanRow[]): string => {
    const headers = ['ID', 'Feature Name', 'App', 'Sub-App', 'RAG Status', 'Owner', 'Priority', 'Description', 'Estimated Effort'];
    const rows = exportFeatures.map(feature => [
      feature.id,
      feature.featureName,
      feature.app,
      feature.subApp,
      feature.ragStatus,
      feature.ownerName || '',
      feature.priority || '',
      feature.description || '',
      feature.estimatedEffort || ''
    ]);

    return [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
  };

  const handleGenerateSummary = (summaryFeatures: FeaturePlanRow[]) => {
    console.log('Generating AI summary for', summaryFeatures.length, 'features');
    // AI summary generation is handled within AISummaryPanel
  };

  const handleSaveToGovernanceLog = (summary: string) => {
    // Mock saving to governance log
    const logEntry = {
      id: `log-${Date.now()}`,
      entryType: 'Review' as const,
      summary: 'AI-generated feature plan analysis',
      gptDraftEntry: summary,
      timestamp: new Date().toISOString()
    };

    console.log('Saving to Governance Log:', logEntry);
    alert('Summary saved to Governance Log! Check console for details.');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <Rocket className="w-6 h-6 text-blue-600" />
                🚀 Project Composer: Complize Platform
              </h1>
              <p className="text-gray-600 mt-1">
                Dynamic planning interface for features and system modules
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors duration-200"
              >
                <Plus className="w-4 h-4" />
                Add Feature
              </button>
              <ExportPlanButton
                features={filteredFeatures}
                selectedFeatures={selectedFeatures}
                onExport={handleExport}
              />
            </div>
          </div>
        </div>

        {/* Filters */}
        <SubAppSelector
          apps={apps}
          subApps={subApps}
          owners={owners}
          filter={filter}
          onFilterChange={setFilter}
        />

        {/* AI Summary Panel */}
        <AISummaryPanel
          features={filteredFeatures}
          onGenerateSummary={handleGenerateSummary}
          onSaveToGovernanceLog={handleSaveToGovernanceLog}
          isLoading={isLoading}
        />

        {/* Feature Table */}
        <FeatureTable
          features={filteredFeatures}
          selectedFeatures={selectedFeatures}
          onFeatureSelect={handleFeatureSelect}
          onEditAI={handleEditAI}
          onScaffoldAI={handleScaffoldAI}
          isLoading={isLoading}
        />

        {/* Add Feature Modal */}
        <AddFeatureModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onAdd={handleAddFeature}
          apps={apps}
          subApps={subApps}
        />
      </div>
    </div>
  );
};