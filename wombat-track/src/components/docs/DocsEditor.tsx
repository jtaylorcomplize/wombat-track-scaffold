import React, { useState, useEffect, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Typography from '@tiptap/extension-typography';
import { 
  Bold, Italic, Underline, Code, Heading1, Heading2, 
  List, Quote, Save, Download, Sparkles, Clock,
  Check, AlertCircle, Loader2, Tag, Link2, FileText
} from 'lucide-react';
import type { DocsEntry, DocType, SaveStatus } from '../../types/docs';
import { useProjectContext } from '../../contexts/ProjectContext';
import { AIPromptModal } from './AIPromptModal';

interface DocsEditorProps {
  initialDoc?: DocsEntry;
  onSave?: (doc: DocsEntry) => Promise<void>;
  onExport?: (format: 'markdown' | 'drive' | 'memory', content: string) => Promise<void>;
}

export const DocsEditor: React.FC<DocsEditorProps> = ({ 
  initialDoc, 
  onSave,
  onExport 
}) => {
  const { projects, logGovernanceEvent } = useProjectContext();
  
  // Metadata state
  const [title, setTitle] = useState(initialDoc?.title || '');
  const [docType, setDocType] = useState<DocType>(initialDoc?.docType || 'SOP');
  const [relatedFeatureId, setRelatedFeatureId] = useState(initialDoc?.relatedFeatureId || '');
  const [relatedPhaseId, setRelatedPhaseId] = useState(initialDoc?.relatedPhaseId || '');
  const [relatedProjectId, setRelatedProjectId] = useState(initialDoc?.relatedProjectId || '');
  const [tags, setTags] = useState<string[]>(initialDoc?.tags || []);
  const [tagInput, setTagInput] = useState('');
  
  // Editor state
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showAIModal, setShowAIModal] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  
  // Initialize Tiptap editor
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3]
        }
      }),
      Placeholder.configure({
        placeholder: 'Start writing your document...',
        emptyEditorClass: 'is-editor-empty',
      }),
      Typography
    ],
    content: initialDoc?.content || '<p></p>',
    onUpdate: ({ editor }) => {
      setSaveStatus('unsaved');
      // Trigger autosave after 2 seconds of inactivity
      clearTimeout(window.autoSaveTimeout);
      window.autoSaveTimeout = setTimeout(() => {
        handleAutoSave();
      }, 2000);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[400px] p-4'
      }
    }
  });

  // Autosave handler
  const handleAutoSave = useCallback(async () => {
    if (!editor || saveStatus === 'saving') return;
    
    setSaveStatus('saving');
    
    const doc: DocsEntry = {
      id: initialDoc?.id || `doc-${Date.now()}`,
      title,
      docType,
      content: editor.getHTML(),
      relatedFeatureId: relatedFeatureId || undefined,
      relatedPhaseId: relatedPhaseId || undefined,
      relatedProjectId: relatedProjectId || undefined,
      memoryAnchorId: initialDoc?.memoryAnchorId,
      driveLink: initialDoc?.driveLink,
      tags: tags.length > 0 ? tags : undefined,
      lastUpdated: new Date().toISOString(),
      createdBy: 'current-user' // In real app, get from auth context
    };
    
    try {
      if (onSave) {
        await onSave(doc);
      }
      setSaveStatus('saved');
      setLastSaved(new Date());
      
      // Log to governance
      logGovernanceEvent({
        phaseStepId: doc.id,
        newStatus: 'complete',
        triggeredBy: 'current-user',
        eventType: 'StepStatusUpdated',
        details: {
          action: 'document_saved',
          docType: doc.docType,
          title: doc.title
        }
      });
    } catch (error) {
      setSaveStatus('failed');
      console.error('Failed to save document:', error);
    }
  }, [editor, title, docType, relatedFeatureId, relatedPhaseId, relatedProjectId, tags, initialDoc, onSave, logGovernanceEvent]);

  // Toolbar actions
  const toolbarActions = [
    { 
      icon: Bold, 
      action: () => editor?.chain().focus().toggleBold().run(),
      isActive: () => editor?.isActive('bold'),
      tooltip: 'Bold'
    },
    { 
      icon: Italic, 
      action: () => editor?.chain().focus().toggleItalic().run(),
      isActive: () => editor?.isActive('italic'),
      tooltip: 'Italic'
    },
    { 
      icon: Code, 
      action: () => editor?.chain().focus().toggleCode().run(),
      isActive: () => editor?.isActive('code'),
      tooltip: 'Code'
    },
    { 
      icon: Heading1, 
      action: () => editor?.chain().focus().toggleHeading({ level: 1 }).run(),
      isActive: () => editor?.isActive('heading', { level: 1 }),
      tooltip: 'Heading 1'
    },
    { 
      icon: Heading2, 
      action: () => editor?.chain().focus().toggleHeading({ level: 2 }).run(),
      isActive: () => editor?.isActive('heading', { level: 2 }),
      tooltip: 'Heading 2'
    },
    { 
      icon: List, 
      action: () => editor?.chain().focus().toggleBulletList().run(),
      isActive: () => editor?.isActive('bulletList'),
      tooltip: 'Bullet List'
    },
    { 
      icon: Quote, 
      action: () => editor?.chain().focus().toggleBlockquote().run(),
      isActive: () => editor?.isActive('blockquote'),
      tooltip: 'Quote'
    }
  ];

  const handleExport = async (format: 'markdown' | 'drive' | 'memory') => {
    if (!editor) return;
    
    const content = editor.getHTML();
    
    try {
      if (onExport) {
        await onExport(format, content);
      }
      
      // Log export action
      logGovernanceEvent({
        phaseStepId: initialDoc?.id || 'new-doc',
        newStatus: 'complete',
        triggeredBy: 'current-user',
        eventType: 'StepStatusUpdated',
        details: {
          action: 'document_exported',
          format,
          title
        }
      });
      
      setShowExportMenu(false);
    } catch (error) {
      console.error(`Failed to export as ${format}:`, error);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
      setSaveStatus('unsaved');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
    setSaveStatus('unsaved');
  };

  // Get related items for dropdowns
  const allPhases = projects.flatMap(p => p.phases.map(phase => ({ 
    id: phase.id, 
    name: phase.name, 
    projectName: p.name 
  })));

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header with title and status */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setSaveStatus('unsaved');
              }}
              placeholder="Document Title"
              className="w-full text-2xl font-bold text-gray-900 border-none outline-none focus:ring-0 placeholder-gray-400"
            />
          </div>
          
          <div className="flex items-center gap-2">
            {/* Save status indicator */}
            <div className="flex items-center gap-2 text-sm">
              {saveStatus === 'saved' && (
                <>
                  <Check className="w-4 h-4 text-green-600" />
                  <span className="text-gray-600">Saved</span>
                </>
              )}
              {saveStatus === 'saving' && (
                <>
                  <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                  <span className="text-gray-600">Saving...</span>
                </>
              )}
              {saveStatus === 'failed' && (
                <>
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <span className="text-red-600">Failed</span>
                </>
              )}
              {saveStatus === 'unsaved' && (
                <>
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span className="text-amber-600">Unsaved</span>
                </>
              )}
            </div>
            
            {lastSaved && (
              <span className="text-xs text-gray-500">
                Last saved: {lastSaved.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Metadata fields */}
      <div className="border-b border-gray-200 p-4 bg-gray-50">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Document Type
            </label>
            <select
              value={docType}
              onChange={(e) => {
                setDocType(e.target.value as DocType);
                setSaveStatus('unsaved');
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="SOP">SOP</option>
              <option value="ProjectSpec">Project Spec</option>
              <option value="Template">Template</option>
              <option value="Checklist">Checklist</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Related Project
            </label>
            <select
              value={relatedProjectId}
              onChange={(e) => {
                setRelatedProjectId(e.target.value);
                setSaveStatus('unsaved');
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">None</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Related Phase
            </label>
            <select
              value={relatedPhaseId}
              onChange={(e) => {
                setRelatedPhaseId(e.target.value);
                setSaveStatus('unsaved');
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">None</option>
              {allPhases.map(phase => (
                <option key={phase.id} value={phase.id}>
                  {phase.name} ({phase.projectName})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tags
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="Add tag..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleAddTag}
                className="p-2 text-gray-600 hover:text-gray-900"
              >
                <Tag className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Tags display */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {tags.map(tag => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-sm"
              >
                {tag}
                <button
                  onClick={() => handleRemoveTag(tag)}
                  className="hover:text-blue-900"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Memory and Drive links */}
        {(initialDoc?.memoryAnchorId || initialDoc?.driveLink) && (
          <div className="flex items-center gap-4 mt-3 text-sm text-gray-600">
            {initialDoc.memoryAnchorId && (
              <div className="flex items-center gap-1">
                <Link2 className="w-4 h-4" />
                <span>Memory: {initialDoc.memoryAnchorId}</span>
              </div>
            )}
            {initialDoc.driveLink && (
              <div className="flex items-center gap-1">
                <FileText className="w-4 h-4" />
                <a href={initialDoc.driveLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  Drive Link
                </a>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="border-b border-gray-200 p-2 flex items-center justify-between">
        <div className="flex items-center gap-1">
          {toolbarActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <button
                key={index}
                onClick={action.action}
                className={`p-2 rounded hover:bg-gray-100 transition-colors ${
                  action.isActive?.() ? 'bg-gray-200 text-blue-600' : 'text-gray-600'
                }`}
                title={action.tooltip}
              >
                <Icon className="w-4 h-4" />
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAIModal(true)}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors text-sm"
          >
            <Sparkles className="w-4 h-4" />
            Ask AI
          </button>

          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            
            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10">
                <button
                  onClick={() => handleExport('markdown')}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Markdown (.md)
                </button>
                <button
                  onClick={() => handleExport('drive')}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Google Drive
                </button>
                <button
                  onClick={() => handleExport('memory')}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  MemoryPlugin
                </button>
              </div>
            )}
          </div>

          <button
            onClick={handleAutoSave}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
          >
            <Save className="w-4 h-4" />
            Save & Log
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="min-h-[400px]">
        <EditorContent editor={editor} />
      </div>

      {/* AI Modal */}
      <AIPromptModal
        isOpen={showAIModal}
        onClose={() => setShowAIModal(false)}
        onApplyResult={(content, action) => {
          if (!editor) return;
          
          if (action === 'replace') {
            editor.commands.setContent(content);
          } else if (action === 'append') {
            const currentContent = editor.getHTML();
            editor.commands.setContent(currentContent + '\n\n' + content);
          } else if (action === 'insert') {
            editor.commands.insertContent(content);
          }
          
          setSaveStatus('unsaved');
        }}
        currentContent={editor?.getHTML() || ''}
        documentTitle={title}
        docType={docType}
      />
    </div>
  );
};

// Extend window type for autosave timeout
declare global {
  interface Window {
    autoSaveTimeout: NodeJS.Timeout;
  }
}