import React, { useState, useEffect } from 'react';
import { Download, FileText, Shield, AlertCircle, ExternalLink, Bookmark } from 'lucide-react';

interface GovernanceDocument {
  name: string;
  path: string;
  title: string;
  content: string;
  memoryAnchors: string[];
  lastModified?: string;
}

interface MemoryAnchor {
  id: string;
  description: string;
  purpose: string;
  category: string;
}

const AdminGovernancePolicies: React.FC = () => {
  const [documents, setDocuments] = useState<GovernanceDocument[]>([]);
  const [activeDocument, setActiveDocument] = useState<string>('GPT-USAGE-POLICY.md');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  // Memory anchors metadata
  const memoryAnchors: Record<string, MemoryAnchor> = {
    'WT-ANCHOR-GOVERNANCE': {
      id: 'WT-ANCHOR-GOVERNANCE',
      description: 'Policy framework and compliance automation',
      purpose: 'Primary governance framework anchor for AI usage governance',
      category: 'System Architecture'
    },
    'WT-ANCHOR-QUALITY': {
      id: 'WT-ANCHOR-QUALITY',
      description: 'Code standards and continuous improvement',
      purpose: 'Quality assurance and validation anchor',
      category: 'System Architecture'
    },
    'WT-ANCHOR-DEPLOYMENT': {
      id: 'WT-ANCHOR-DEPLOYMENT',
      description: 'Environment lifecycle and deployment management',
      purpose: 'Deployment governance and validation',
      category: 'System Architecture'
    },
    'WT-ANCHOR-IMPLEMENTATION': {
      id: 'WT-ANCHOR-IMPLEMENTATION',
      description: 'Technical implementation patterns',
      purpose: 'Implementation governance and AI workflows',
      category: 'System Architecture'
    }
  };

  useEffect(() => {
    loadGovernanceDocuments();
  }, []);

  const loadGovernanceDocuments = async () => {
    try {
      setLoading(true);
      
      // Mock governance documents - in a real implementation, these would be fetched from the server
      const governanceDocs: GovernanceDocument[] = [
        {
          name: 'GPT-USAGE-POLICY.md',
          path: 'docs/governance/GPT-USAGE-POLICY.md',
          title: 'GPT & AI Usage Policy',
          content: `# GPT & AI Usage Policy - Wombat Track

## Purpose
This policy defines responsible AI usage guidelines for Wombat Track's recursive development workflows, ensuring ethical AI integration while maintaining code quality and governance compliance.

## Usage Guidelines

### Permitted AI Usage
- **Claude Code Integration**: Primary AI development partner for code generation, debugging, and documentation
- **Recursive Development**: AI-assisted feature development using established patterns and templates
- **Documentation Generation**: Automated creation of technical documentation and governance logs
- **Code Review Assistance**: AI-powered analysis for quality assurance and best practice compliance
- **Memory Anchor Classification**: Automated tagging and organization of project artifacts

### Required Governance Controls
- **Human Oversight**: All AI-generated code must be reviewed by human developers
- **Governance Logging**: AI actions must be recorded in GovernanceLog with audit trails
- **Memory Plugin Integration**: AI decisions tracked through MemoryPlugin anchor system
- **Quality Gates**: AI-generated content must pass lint, typecheck, and test validations

### Prohibited AI Usage
- **Autonomous Production Deployment**: AI cannot directly deploy to production without human approval
- **Security Policy Changes**: AI cannot modify security configurations or access controls
- **Financial Operations**: AI cannot initiate billing, purchasing, or financial transactions
- **External API Keys**: AI cannot generate, modify, or share authentication credentials

## References

### Memory Plugin Anchors
- **WT-ANCHOR-GOVERNANCE**: Policy framework and compliance automation
- **WT-ANCHOR-QUALITY**: Code quality standards and AI-generated content validation
- **WT-ANCHOR-IMPLEMENTATION**: Technical implementation patterns and AI workflows`,
          memoryAnchors: ['WT-ANCHOR-GOVERNANCE', 'WT-ANCHOR-QUALITY', 'WT-ANCHOR-IMPLEMENTATION'],
          lastModified: '2025-08-07'
        },
        {
          name: 'GOVERNANCELOG_SCHEMA.md',
          path: 'docs/governance/GOVERNANCELOG_SCHEMA.md',
          title: 'GovernanceLog Schema Specification',
          content: `# GovernanceLog Schema Specification - Wombat Track

## Purpose
This document defines the canonical schema for GovernanceLog entries, enabling consistent audit trails, compliance tracking, and AI agent integration across all Wombat Track systems.

## Schema Structure

### Core GovernanceLog Entry Format
\`\`\`json
{
  "timestamp": "ISO 8601 datetime string",
  "phase_id": "WT-X.Y format (e.g., WT-8.9)",
  "step_id": "WT-X.Y.Z format (e.g., WT-8.9.2)",
  "actor": "human|ai|system identifier",
  "action": "standardized action type",
  "status": "pending|in_progress|completed|failed|blocked",
  "description": "human-readable action description",
  "metadata": {
    "files_affected": ["array of file paths"],
    "memory_anchors": ["array of anchor IDs"],
    "validation_results": {},
    "compliance_flags": ["array of compliance markers"]
  }
}
\`\`\`

## References

### Memory Plugin Anchors
- **WT-ANCHOR-GOVERNANCE**: Primary governance framework anchor
- **WT-ANCHOR-QUALITY**: Quality assurance and validation anchor
- **WT-ANCHOR-DEPLOYMENT**: Deployment governance and validation`,
          memoryAnchors: ['WT-ANCHOR-GOVERNANCE', 'WT-ANCHOR-QUALITY', 'WT-ANCHOR-DEPLOYMENT'],
          lastModified: '2025-08-07'
        },
        {
          name: 'MEMORYPLUGIN_ANCHORS.md',
          path: 'docs/governance/MEMORYPLUGIN_ANCHORS.md',
          title: 'MemoryPlugin Anchors Specification',
          content: `# MemoryPlugin Anchors Specification - Wombat Track

## Purpose
This document defines the MemoryPlugin anchor system for semantic classification, cross-system integration, and AI agent context awareness across the Wombat Track ecosystem.

## Anchor Architecture

### Core Anchor Structure
\`\`\`json
{
  "anchor_id": "Unique identifier (e.g., WT-ANCHOR-GOVERNANCE)",
  "timestamp": "ISO 8601 creation timestamp",
  "classification": "Semantic category for AI processing",
  "location": "Physical or logical location reference",
  "purpose": "Human-readable purpose statement",
  "agent_integrations": ["Array of AI agents that use this anchor"],
  "memory_relevance": {
    "primary_topic": 1.0,
    "related_topics": [0.8, 0.6, 0.4]
  }
}
\`\`\`

## Current Anchor Registry

### Active Anchors
- **WT-ANCHOR-GOVERNANCE** (Created: 2025-08-07)
  - Location: \`docs/governance/\`
  - Purpose: Policy framework and AI usage governance
  - Agents: GovernanceLog Summariser, Policy Validator

- **WT-ANCHOR-DEPLOYMENT** (Created: 2025-08-07)
  - Location: \`docs/deployment/\`
  - Purpose: Environment lifecycle and deployment automation
  - Agents: Deployment Trigger Agent, Environment Health Monitor`,
          memoryAnchors: ['WT-ANCHOR-GOVERNANCE', 'WT-ANCHOR-DEPLOYMENT', 'WT-ANCHOR-QUALITY', 'WT-ANCHOR-IMPLEMENTATION'],
          lastModified: '2025-08-07'
        }
      ];

      setDocuments(governanceDocs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load governance documents');
      console.error('Error loading governance documents:', err);
    } finally {
      setLoading(false);
    }
  };

  const downloadSchema = (docName: string, format: 'json' | 'yaml') => {
    try {
      let content: string;
      let filename: string;

      if (docName === 'GOVERNANCELOG_SCHEMA.md') {
        const schema = {
          type: 'object',
          properties: {
            timestamp: { type: 'string', format: 'date-time' },
            phase_id: { type: 'string', pattern: '^WT-[0-9]+\\.[0-9]+$' },
            step_id: { type: 'string', pattern: '^WT-[0-9]+\\.[0-9]+\\.[0-9]+$' },
            actor: { type: 'string' },
            action: { type: 'string' },
            status: { 
              type: 'string', 
              enum: ['pending', 'in_progress', 'completed', 'failed', 'blocked'] 
            },
            description: { type: 'string' },
            metadata: {
              type: 'object',
              properties: {
                files_affected: { type: 'array', items: { type: 'string' } },
                memory_anchors: { type: 'array', items: { type: 'string' } },
                validation_results: { type: 'object' },
                compliance_flags: { type: 'array', items: { type: 'string' } }
              }
            }
          },
          required: ['timestamp', 'phase_id', 'actor', 'action', 'status']
        };
        content = JSON.stringify(schema, null, 2);
        filename = `governance-log-schema.${format}`;
      } else if (docName === 'MEMORYPLUGIN_ANCHORS.md') {
        const schema = {
          type: 'object',
          properties: {
            anchor_id: { type: 'string' },
            timestamp: { type: 'string', format: 'date-time' },
            classification: { type: 'string' },
            location: { type: 'string' },
            purpose: { type: 'string' },
            description: { type: 'string' },
            agent_integrations: { type: 'array', items: { type: 'string' } },
            memory_relevance: {
              type: 'object',
              properties: {
                primary_topic: { type: 'number', minimum: 0, maximum: 1 },
                related_topics: { type: 'array', items: { type: 'number' } }
              }
            },
            linked_anchors: { type: 'array', items: { type: 'string' } },
            phase_association: { type: 'string' }
          },
          required: ['anchor_id', 'timestamp', 'classification', 'purpose']
        };
        content = JSON.stringify(schema, null, 2);
        filename = `memory-plugin-anchors-schema.${format}`;
      } else {
        throw new Error('Schema not available for this document');
      }

      const blob = new Blob([content], { type: `application/${format}` });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading schema:', err);
    }
  };

  const renderMemoryAnchorChip = (anchorId: string) => {
    const anchor = memoryAnchors[anchorId];
    if (!anchor) return null;

    return (
      <span
        key={anchorId}
        className="inline-flex items-center space-x-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full hover:bg-blue-200 cursor-pointer transition-colors"
        title={`${anchor.purpose}\nCategory: ${anchor.category}`}
      >
        <Bookmark size={10} />
        <span>{anchorId}</span>
      </span>
    );
  };

  const renderContent = (content: string, memoryAnchors: string[]) => {
    // Simple markdown-to-HTML conversion for basic formatting
    let html = content
      .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold text-gray-900 mb-4">$1</h1>')
      .replace(/^## (.*$)/gm, '<h2 class="text-xl font-semibold text-gray-800 mb-3 mt-6">$1</h2>')
      .replace(/^### (.*$)/gm, '<h3 class="text-lg font-medium text-gray-700 mb-2 mt-4">$1</h3>')
      .replace(/^- (.*$)/gm, '<li class="ml-4">$1</li>')
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
      .replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">$1</code>')
      .replace(/```json\n([\s\S]*?)\n```/g, '<pre class="bg-gray-100 p-4 rounded-lg overflow-x-auto"><code class="text-sm font-mono">$1</code></pre>')
      .replace(/```typescript\n([\s\S]*?)\n```/g, '<pre class="bg-gray-100 p-4 rounded-lg overflow-x-auto"><code class="text-sm font-mono">$1</code></pre>')
      .replace(/\n/g, '<br />');

    // Highlight memory anchors in the content
    memoryAnchors.forEach(anchorId => {
      const regex = new RegExp(`\\b${anchorId}\\b`, 'g');
      html = html.replace(regex, `<span class="bg-blue-100 text-blue-800 px-1 py-0.5 rounded font-medium" title="Memory Anchor: ${anchorId}">${anchorId}</span>`);
    });

    return html;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600">Loading governance documents...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-red-600 flex items-center space-x-2">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  const activeDoc = documents.find(doc => doc.name === activeDocument);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center space-x-3 mb-2">
          <Shield className="text-blue-600" size={32} />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Governance Index</h1>
            <p className="text-gray-600">Policy documentation and memory anchor management</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Document Navigation */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg border shadow-sm p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Documents</h2>
            <div className="space-y-2">
              {documents.map((doc) => (
                <button
                  key={doc.name}
                  onClick={() => setActiveDocument(doc.name)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    activeDocument === doc.name
                      ? 'bg-blue-50 border-blue-200 text-blue-800'
                      : 'hover:bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <FileText size={16} />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{doc.title}</p>
                      <p className="text-xs text-gray-500 mt-1">{doc.name}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Schema Export */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <h3 className="text-md font-medium text-gray-700 mb-3">Schema Export</h3>
              <div className="space-y-2">
                <button
                  onClick={() => downloadSchema('GOVERNANCELOG_SCHEMA.md', 'json')}
                  className="w-full text-left p-2 text-sm rounded border hover:bg-gray-50 flex items-center space-x-2"
                >
                  <Download size={14} />
                  <span>GovernanceLog JSON Schema</span>
                </button>
                <button
                  onClick={() => downloadSchema('MEMORYPLUGIN_ANCHORS.md', 'json')}
                  className="w-full text-left p-2 text-sm rounded border hover:bg-gray-50 flex items-center space-x-2"
                >
                  <Download size={14} />
                  <span>MemoryPlugin JSON Schema</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Document Content */}
        <div className="lg:col-span-3">
          {activeDoc && (
            <div className="bg-white rounded-lg border shadow-sm">
              {/* Document Header */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">{activeDoc.title}</h2>
                    <p className="text-gray-600 mt-1">{activeDoc.path}</p>
                    {activeDoc.lastModified && (
                      <p className="text-sm text-gray-500 mt-2">
                        Last modified: {activeDoc.lastModified}
                      </p>
                    )}
                  </div>
                  <button className="text-blue-600 hover:text-blue-800 flex items-center space-x-1">
                    <ExternalLink size={16} />
                    <span className="text-sm">View File</span>
                  </button>
                </div>

                {/* Memory Anchors */}
                {activeDoc.memoryAnchors.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Memory Anchors:</p>
                    <div className="flex flex-wrap gap-2">
                      {activeDoc.memoryAnchors.map(anchorId => renderMemoryAnchorChip(anchorId))}
                    </div>
                  </div>
                )}
              </div>

              {/* Document Content */}
              <div className="p-6">
                <div 
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{
                    __html: renderContent(activeDoc.content, activeDoc.memoryAnchors)
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminGovernancePolicies;