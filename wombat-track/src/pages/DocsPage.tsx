import React, { useState } from 'react';
import { DocsEditor } from '../components/docs/DocsEditor';
import { ProjectProvider } from '../contexts/ProjectContext';
import type { DocsEntry } from '../types/docs';

// Mock data for demonstration
const mockProjects = [
  {
    id: 'proj-1',
    name: 'Complize Platform',
    description: 'Main platform project',
    createdAt: new Date().toISOString(),
    createdBy: 'user',
    projectOwner: 'user',
    projectType: 'Platform' as const,
    status: 'Active' as const,
    phases: [
      {
        id: 'phase-1',
        projectId: 'proj-1',
        name: 'Phase 1: Planning',
        description: 'Initial planning phase',
        order: 1,
        steps: []
      }
    ]
  }
];

export const DocsPage: React.FC = () => {
  const [savedDocs, setSavedDocs] = useState<DocsEntry[]>([]);

  const handleSave = async (doc: DocsEntry) => {
    // Simulate saving to backend
    await new Promise(resolve => setTimeout(resolve, 500));
    
    setSavedDocs(prev => {
      const existing = prev.findIndex(d => d.id === doc.id);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = doc;
        return updated;
      }
      return [...prev, doc];
    });
    
    console.log('Document saved:', doc);
  };

  const handleExport = async (format: 'markdown' | 'drive' | 'memory', content: string) => {
    console.log(`Exporting as ${format}:`, content);
    
    if (format === 'markdown') {
      // Convert HTML to markdown (simplified)
      const markdown = content
        .replace(/<h1[^>]*>(.*?)<\/h1>/g, '# $1\n')
        .replace(/<h2[^>]*>(.*?)<\/h2>/g, '## $1\n')
        .replace(/<h3[^>]*>(.*?)<\/h3>/g, '### $1\n')
        .replace(/<p[^>]*>(.*?)<\/p>/g, '$1\n\n')
        .replace(/<strong[^>]*>(.*?)<\/strong>/g, '**$1**')
        .replace(/<em[^>]*>(.*?)<\/em>/g, '*$1*')
        .replace(/<code[^>]*>(.*?)<\/code>/g, '`$1`')
        .replace(/<li[^>]*>(.*?)<\/li>/g, '- $1\n')
        .replace(/<[^>]*>/g, ''); // Remove remaining HTML tags
      
      // Download markdown file
      const blob = new Blob([markdown], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'document.md';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else if (format === 'drive') {
      alert('Google Drive export would be implemented here');
    } else if (format === 'memory') {
      alert('MemoryPlugin export would be implemented here');
    }
  };

  return (
    <ProjectProvider initialProjects={mockProjects}>
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">📝 WT Docs Module</h1>
            <p className="text-gray-600">
              Rich-text document editor with AI assistance and governance tracking
            </p>
          </div>

          <DocsEditor
            onSave={handleSave}
            onExport={handleExport}
          />

          {/* Saved documents list */}
          {savedDocs.length > 0 && (
            <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Saved Documents</h3>
              <div className="space-y-2">
                {savedDocs.map(doc => (
                  <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                    <div>
                      <div className="font-medium text-gray-900">{doc.title || 'Untitled'}</div>
                      <div className="text-sm text-gray-600">
                        {doc.docType} • Last updated: {new Date(doc.lastUpdated).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      {doc.tags?.map(tag => (
                        <span key={tag} className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </ProjectProvider>
  );
};