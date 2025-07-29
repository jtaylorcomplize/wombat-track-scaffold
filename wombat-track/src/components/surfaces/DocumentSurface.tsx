import React, { useState } from 'react';
import { FileText, Download, Save, Edit, Bot, Upload } from 'lucide-react';
import { StatusCard } from '../common/StatusCard';
import { ClaudePromptButton } from '../common/ClaudePromptButton';
import type { Project, Phase, PhaseStep as Step } from '../../types/phase';

interface DocumentSurfaceProps {
  currentProject: Project | null;
  currentPhase: Phase | null;
  currentStep: Step | null;
  onPhaseChange: (phase: Phase) => void;
  onStepChange: (step: Step) => void;
}

interface Document {
  id: string;
  title: string;
  type: 'SOP' | 'Guide' | 'Requirements' | 'Design' | 'Notes';
  content: string;
  lastModified: string;
  author: string;
  projectId: string;
  phaseId?: string;
  stepId?: string;
  tags: string[];
  wordCount: number;
  aiGenerated: boolean;
}

const mockDocuments: Document[] = [
  {
    id: 'doc-1',
    title: 'Development Environment Setup SOP',
    type: 'SOP',
    content: `# Development Environment Setup

## Prerequisites
- Node.js 18+
- Docker Desktop
- Git 2.3+

## Setup Steps
1. Clone the repository
2. Install dependencies with npm install
3. Configure environment variables
4. Start development server

## Verification
- Run npm test to verify setup
- Check that all services are running
- Confirm database connection`,
    lastModified: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    author: 'dev-team',
    projectId: 'proj-1',
    phaseId: 'phase-2',
    stepId: 'step-1',
    tags: ['setup', 'development', 'SOP'],
    wordCount: 89,
    aiGenerated: false
  },
  {
    id: 'doc-2',
    title: 'API Integration Requirements',
    type: 'Requirements',
    content: `# API Integration Requirements

## Overview
This document outlines the requirements for integrating with third-party APIs.

## Functional Requirements
- Support for REST API calls
- Authentication token management
- Rate limiting compliance
- Error handling and retry logic

## Non-Functional Requirements
- 99.9% uptime
- < 200ms response time
- Secure data transmission
- Comprehensive logging`,
    lastModified: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    author: 'product-team',
    projectId: 'proj-1',
    phaseId: 'phase-1',
    tags: ['requirements', 'API', 'integration'],
    wordCount: 67,
    aiGenerated: true
  }
];

export const DocumentSurface: React.FC<DocumentSurfaceProps> = ({
  currentProject
  // currentPhase, currentStep, onPhaseChange, onStepChange - @typescript-eslint/no-unused-vars fix
}) => {
  const [activeTab, setActiveTab] = useState<'documents' | 'editor' | 'ai-assist'>('documents');
  const [documents] = useState<Document[]>(mockDocuments);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [editorContent, setEditorContent] = useState('');
  const [documentTitle, setDocumentTitle] = useState('');

  if (!currentProject) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Project Selected</h3>
          <p className="text-gray-600">Select a project to manage documents.</p>
        </div>
      </div>
    );
  }

  const handleClaudePrompt = async (prompt: string, _context?: Record<string, unknown>) => { // context unused
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    if (prompt.toLowerCase().includes('sop')) {
      return `I'll help you create a comprehensive SOP for "${currentProject.name}". Here's a structured template:

# Standard Operating Procedure: ${currentStep?.name || 'Process Name'}

## Purpose
Define the step-by-step process for completing this task efficiently and consistently.

## Scope
This SOP applies to all team members working on ${currentProject.name}.

## Prerequisites
- Access to project resources
- Required tools and permissions
- Understanding of project context

## Procedure
1. **Preparation Phase**
   - Review requirements and dependencies
   - Gather necessary resources
   - Set up working environment

2. **Execution Phase**
   - Follow the detailed steps below
   - Document any deviations or issues
   - Validate outputs at each checkpoint

3. **Completion Phase**
   - Verify all deliverables meet criteria
   - Update project tracking systems
   - Notify relevant stakeholders

## Quality Gates
- [ ] Requirements understood and documented
- [ ] Implementation follows standards
- [ ] Testing completed successfully
- [ ] Documentation updated

## References
- Project requirements document
- Technical specifications
- Team collaboration guidelines

Would you like me to expand on any particular section?`;
    }

    return `I can help you with documentation for "${currentProject.name}". Here are some suggestions:

**Document Types I can help create:**
- Standard Operating Procedures (SOPs)
- Technical requirements
- Design specifications
- User guides and tutorials
- Process documentation

**AI Assistance Features:**
- Generate document outlines
- Expand bullet points into full sections
- Review and improve existing content
- Create templates for common document types
- Suggest improvements for clarity and completeness

**Best Practices:**
- Keep documents concise and actionable
- Use consistent formatting and structure
- Include relevant examples and screenshots
- Regular updates and version control
- Clear ownership and review processes

What type of document would you like me to help you create?`;
  };

  const handleExport = (format: 'markdown' | 'drive' | 'memory') => {
    const doc = selectedDocument;
    if (!doc) return;

    switch (format) {
      case 'markdown': {
        // no-case-declarations fix
        const blob = new Blob([doc.content], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${doc.title.replace(/\s+/g, '-').toLowerCase()}.md`;
        a.click();
        URL.revokeObjectURL(url);
        break;
      }
      case 'drive':
        alert('Google Drive export would be implemented here');
        break;
      case 'memory':
        alert('MemoryPlugin export would be implemented here');
        break;
    }
  };

  const getDocumentStats = () => {
    const projectDocs = documents.filter(doc => doc.projectId === currentProject.id);
    const totalWords = projectDocs.reduce((sum, doc) => sum + doc.wordCount, 0);
    const aiGeneratedCount = projectDocs.filter(doc => doc.aiGenerated).length;
    const recentDocs = projectDocs.filter(doc => 
      new Date(doc.lastModified) > new Date(Date.now() - 24 * 60 * 60 * 1000)
    ).length;

    return {
      totalDocuments: projectDocs.length,
      totalWords,
      aiGeneratedCount,
      recentDocs
    };
  };

  const stats = getDocumentStats();

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6" data-testid="document-surface">
      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-3">
              <FileText className="w-6 h-6 text-purple-600" />
              <span>Document Surface</span>
            </h1>
            <p className="text-gray-600 mt-1">
              Rich-text SOP and AI-assisted documentation for {currentProject.name}
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <ClaudePromptButton
              type="scaffold"
              label="Generate Doc"
              onPrompt={handleClaudePrompt}
              testId="document-ai-generate"
            />
            <button className="flex items-center space-x-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors">
              <Edit className="w-4 h-4" />
              <span>New Document</span>
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatusCard
            title="Total Documents"
            status="info"
            value={stats.totalDocuments}
            description="In this project"
            testId="document-total-card"
          />
          <StatusCard
            title="Total Words"
            status="info"
            value={stats.totalWords}
            description="Across all documents"
            testId="document-words-card"
          />
          <StatusCard
            title="AI Generated"
            status={stats.aiGeneratedCount > 0 ? 'success' : 'info'}
            value={stats.aiGeneratedCount}
            description={`${Math.round((stats.aiGeneratedCount / stats.totalDocuments) * 100)}% of total`}
            testId="document-ai-card"
          />
          <StatusCard
            title="Recent Updates"
            status={stats.recentDocs > 0 ? 'success' : 'warning'}
            value={stats.recentDocs}
            description="Updated today"
            testId="document-recent-card"
          />
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" role="tablist">
            {[
              { id: 'documents', label: 'Document Library', icon: FileText },
              { id: 'editor', label: 'Rich Text Editor', icon: Edit },
              { id: 'ai-assist', label: 'AI Assistant', icon: Bot }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as 'documents' | 'editor' | 'ai-assist')} // @typescript-eslint/no-explicit-any fix
                className={`flex items-center space-x-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === id
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                data-testid={`document-tab-${id}`}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'documents' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Document Library</h2>
                <div className="flex items-center space-x-2">
                  <button className="flex items-center space-x-2 px-3 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors text-sm">
                    <Upload className="w-4 h-4" />
                    <span>Import</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {documents
                  .filter(doc => doc.projectId === currentProject.id)
                  .map((doc) => (
                    <div
                      key={doc.id}
                      className={`bg-white border rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow ${
                        selectedDocument?.id === doc.id ? 'border-purple-300 bg-purple-50' : 'border-gray-200'
                      }`}
                      onClick={() => setSelectedDocument(doc)}
                      data-testid={`document-card-${doc.id}`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className={`px-2 py-1 text-xs font-medium rounded-full ${
                          doc.type === 'SOP' ? 'bg-blue-100 text-blue-700' :
                          doc.type === 'Requirements' ? 'bg-green-100 text-green-700' :
                          doc.type === 'Design' ? 'bg-purple-100 text-purple-700' :
                          doc.type === 'Guide' ? 'bg-amber-100 text-amber-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {doc.type}
                        </div>
                        {doc.aiGenerated && (
                          <div className="flex items-center space-x-1 text-xs text-purple-600">
                            <Bot className="w-3 h-3" />
                            <span>AI</span>
                          </div>
                        )}
                      </div>

                      <h3 className="font-medium text-gray-900 mb-2 line-clamp-2">
                        {doc.title}
                      </h3>

                      <div className="text-sm text-gray-600 mb-3 line-clamp-3">
                        {doc.content.substring(0, 100)}...
                      </div>

                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{doc.wordCount} words</span>
                        <span>{new Date(doc.lastModified).toLocaleDateString()}</span>
                      </div>

                      <div className="flex flex-wrap gap-1 mt-2">
                        {doc.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>

              {/* Export Options */}
              {selectedDocument && (
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h3 className="font-medium text-gray-900 mb-3">
                    Export: {selectedDocument.title}
                  </h3>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => handleExport('markdown')}
                      className="flex items-center space-x-2 px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm"
                    >
                      <Download className="w-4 h-4" />
                      <span>Markdown</span>
                    </button>
                    <button
                      onClick={() => handleExport('drive')}
                      className="flex items-center space-x-2 px-3 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors text-sm"
                    >
                      <Download className="w-4 h-4" />
                      <span>Google Drive</span>
                    </button>
                    <button
                      onClick={() => handleExport('memory')}
                      className="flex items-center space-x-2 px-3 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 transition-colors text-sm"
                    >
                      <Download className="w-4 h-4" />
                      <span>MemoryPlugin</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'editor' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Rich Text Editor</h2>
                <div className="flex items-center space-x-2">
                  <button className="flex items-center space-x-2 px-3 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors text-sm">
                    <Save className="w-4 h-4" />
                    <span>Save</span>
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Document title..."
                  value={documentTitle}
                  onChange={(e) => setDocumentTitle(e.target.value)}
                  className="w-full px-4 py-2 text-lg font-medium border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  data-testid="document-title-input"
                />

                <div className="border border-gray-300 rounded-lg">
                  <div className="border-b border-gray-200 p-3 bg-gray-50">
                    <div className="flex items-center space-x-2">
                      <button className="px-2 py-1 text-sm font-bold border border-gray-300 rounded hover:bg-gray-100">
                        B
                      </button>
                      <button className="px-2 py-1 text-sm italic border border-gray-300 rounded hover:bg-gray-100">
                        I
                      </button>
                      <button className="px-2 py-1 text-sm underline border border-gray-300 rounded hover:bg-gray-100">
                        U
                      </button>
                      <div className="w-px h-6 bg-gray-300" />
                      <button className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100">
                        H1
                      </button>
                      <button className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100">
                        H2
                      </button>
                      <button className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100">
                        List
                      </button>
                    </div>
                  </div>
                  
                  <textarea
                    value={editorContent}
                    onChange={(e) => setEditorContent(e.target.value)}
                    placeholder="Start writing your document..."
                    rows={16}
                    className="w-full p-4 border-none focus:outline-none resize-none font-mono text-sm"
                    data-testid="document-editor"
                  />
                </div>

                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>{editorContent.split(/\s+/).filter(word => word.length > 0).length} words</span>
                  <span>Last saved: Never</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ai-assist' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">AI Documentation Assistant</h2>
                <div className="flex items-center space-x-2">
                  <Bot className="w-4 h-4 text-purple-500" />
                  <span className="text-sm text-gray-600">Powered by Claude</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ClaudePromptButton
                  type="scaffold"
                  prompt="Create a comprehensive SOP template for this project phase"
                  onPrompt={handleClaudePrompt}
                  className="w-full"
                  testId="ai-sop-template"
                />
                
                <ClaudePromptButton
                  type="ask"
                  prompt="What documentation do we need for this project phase?"
                  onPrompt={handleClaudePrompt}
                  className="w-full"
                  testId="ai-doc-recommendations"
                />
                
                <ClaudePromptButton
                  type="revise"
                  prompt="Review and improve the existing documentation structure"
                  onPrompt={handleClaudePrompt}
                  className="w-full"
                  testId="ai-doc-review"
                />
                
                <ClaudePromptButton
                  type="analyze"
                  prompt="Analyze documentation gaps and suggest improvements"
                  onPrompt={handleClaudePrompt}
                  className="w-full" 
                  testId="ai-gap-analysis"
                />
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h3 className="font-medium text-purple-900 mb-2">AI Documentation Tips</h3>
                <ul className="text-sm text-purple-800 space-y-1">
                  <li>• Provide context about your project and current phase</li>
                  <li>• Specify the type of documentation you need (SOP, guide, requirements)</li>
                  <li>• Include target audience and complexity level</li>
                  <li>• Ask for specific sections or formats you need</li>
                  <li>• Request examples and templates for consistency</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};