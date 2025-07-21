import React, { useState, useEffect } from 'react';

interface PhasePlanEditorProps {
  projectId: string;
  projectName: string;
  initialContent?: string;
  onSave: (content: string) => void;
  readOnly?: boolean;
}

export const PhasePlanEditor: React.FC<PhasePlanEditorProps> = ({
  projectId,
  projectName,
  initialContent = '',
  onSave,
  readOnly = false
}) => {
  const [content, setContent] = useState(initialContent);
  const [isEditing, setIsEditing] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [autoSaveTimeout, setAutoSaveTimeout] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setContent(initialContent);
    setHasUnsavedChanges(false);
  }, [initialContent]);

  // Auto-save functionality
  useEffect(() => {
    if (hasUnsavedChanges && !readOnly) {
      // Clear existing timeout
      if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout);
      }

      // Set new timeout for auto-save
      const timeout = setTimeout(() => {
        handleSave();
      }, 2000); // Auto-save after 2 seconds of inactivity

      setAutoSaveTimeout(timeout);

      return () => {
        if (timeout) clearTimeout(timeout);
      };
    }
  }, [content, hasUnsavedChanges]);

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    setHasUnsavedChanges(newContent !== initialContent);
  };

  const handleSave = () => {
    onSave(content);
    setHasUnsavedChanges(false);
    setLastSaved(new Date());
    console.log(`[WT] Phase plan saved for project: ${projectName}`);
  };

  const handleCancel = () => {
    setContent(initialContent);
    setHasUnsavedChanges(false);
    setIsEditing(false);
  };

  // Markdown shortcuts and helpers
  const insertMarkdown = (prefix: string, suffix: string = '') => {
    const textarea = document.getElementById(`phase-plan-${projectId}`) as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const newText = content.substring(0, start) + prefix + selectedText + suffix + content.substring(end);
    
    setContent(newText);
    handleContentChange(newText);
    
    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 0);
  };

  const renderPreview = (text: string) => {
    // Simple markdown-like rendering for preview
    return text
      .replace(/^# (.+)$/gm, '<h1 style="font-size: 24px; font-weight: 700; margin: 16px 0 8px 0; color: #1f2937;">$1</h1>')
      .replace(/^## (.+)$/gm, '<h2 style="font-size: 20px; font-weight: 600; margin: 14px 0 6px 0; color: #374151;">$1</h2>')
      .replace(/^### (.+)$/gm, '<h3 style="font-size: 16px; font-weight: 600; margin: 12px 0 4px 0; color: #4b5563;">$1</h3>')
      .replace(/\*\*(.+?)\*\*/g, '<strong style="font-weight: 600;">$1</strong>')
      .replace(/\*(.+?)\*/g, '<em style="font-style: italic;">$1</em>')
      .replace(/^- (.+)$/gm, '<li style="margin: 2px 0;">$1</li>')
      .replace(/(<li.*<\/li>)/s, '<ul style="margin: 8px 0; padding-left: 20px;">$1</ul>')
      .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" style="color: #3b82f6; text-decoration: underline;" target="_blank" rel="noopener noreferrer">$1</a>')
      .replace(/\n\n/g, '</p><p style="margin: 8px 0;">')
      .replace(/^(.+)$/gm, '<p style="margin: 8px 0;">$1</p>');
  };

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
        padding: '12px 0',
        borderBottom: '1px solid #e5e7eb'
      }}>
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: '600', margin: 0, color: '#1f2937' }}>
            Phase Plan - {projectName}
          </h3>
          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
            {lastSaved && (
              <span>Last saved: {lastSaved.toLocaleTimeString()}</span>
            )}
            {hasUnsavedChanges && (
              <span style={{ color: '#f59e0b', marginLeft: '8px' }}>
                • Unsaved changes
              </span>
            )}
          </div>
        </div>
        
        {!readOnly && (
          <div style={{ display: 'flex', gap: '8px' }}>
            {isEditing ? (
              <>
                <button
                  onClick={handleSave}
                  disabled={!hasUnsavedChanges}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: hasUnsavedChanges ? '#10b981' : '#e5e7eb',
                    color: hasUnsavedChanges ? 'white' : '#9ca3af',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '12px',
                    cursor: hasUnsavedChanges ? 'pointer' : 'not-allowed'
                  }}
                >
                  Save
                </button>
                <button
                  onClick={handleCancel}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#f3f4f6',
                    color: '#374151',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
                data-testid="edit-phase-plan-button"
              >
                ✏️ Edit Plan
              </button>
            )}
          </div>
        )}
      </div>

      {/* Editing Mode */}
      {isEditing && !readOnly ? (
        <div>
          {/* Markdown Toolbar */}
          <div style={{
            display: 'flex',
            gap: '4px',
            marginBottom: '8px',
            padding: '8px',
            backgroundColor: '#f9fafb',
            borderRadius: '6px',
            flexWrap: 'wrap'
          }}>
            <button
              onClick={() => insertMarkdown('# ')}
              style={{ padding: '4px 8px', fontSize: '11px', backgroundColor: 'white', border: '1px solid #d1d5db', borderRadius: '3px', cursor: 'pointer' }}
              title="Heading 1"
            >
              H1
            </button>
            <button
              onClick={() => insertMarkdown('## ')}
              style={{ padding: '4px 8px', fontSize: '11px', backgroundColor: 'white', border: '1px solid #d1d5db', borderRadius: '3px', cursor: 'pointer' }}
              title="Heading 2"
            >
              H2
            </button>
            <button
              onClick={() => insertMarkdown('### ')}
              style={{ padding: '4px 8px', fontSize: '11px', backgroundColor: 'white', border: '1px solid #d1d5db', borderRadius: '3px', cursor: 'pointer' }}
              title="Heading 3"
            >
              H3
            </button>
            <div style={{ width: '1px', backgroundColor: '#d1d5db', margin: '0 4px' }} />
            <button
              onClick={() => insertMarkdown('**', '**')}
              style={{ padding: '4px 8px', fontSize: '11px', backgroundColor: 'white', border: '1px solid #d1d5db', borderRadius: '3px', cursor: 'pointer' }}
              title="Bold"
            >
              B
            </button>
            <button
              onClick={() => insertMarkdown('*', '*')}
              style={{ padding: '4px 8px', fontSize: '11px', backgroundColor: 'white', border: '1px solid #d1d5db', borderRadius: '3px', cursor: 'pointer' }}
              title="Italic"
            >
              I
            </button>
            <button
              onClick={() => insertMarkdown('- ')}
              style={{ padding: '4px 8px', fontSize: '11px', backgroundColor: 'white', border: '1px solid #d1d5db', borderRadius: '3px', cursor: 'pointer' }}
              title="List Item"
            >
              •
            </button>
            <button
              onClick={() => insertMarkdown('[Link Text](URL)')}
              style={{ padding: '4px 8px', fontSize: '11px', backgroundColor: 'white', border: '1px solid #d1d5db', borderRadius: '3px', cursor: 'pointer' }}
              title="Link"
            >
              🔗
            </button>
          </div>

          {/* Text Editor */}
          <textarea
            id={`phase-plan-${projectId}`}
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            placeholder="Enter your phase plan content here...

Examples:
# Project Overview
Brief description of the project goals and scope.

## Key Phases
- Phase 1: Discovery and Planning
- Phase 2: Core Implementation
- Phase 3: Testing and Deployment

## Success Criteria
Define what success looks like for this project.

## Resources & Links
- [Template Library](https://templates.example.com)
- [Project Documentation](https://docs.example.com)"
            style={{
              width: '100%',
              height: '400px',
              padding: '12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              fontFamily: 'Monaco, "Roboto Mono", monospace',
              lineHeight: 1.5,
              resize: 'vertical'
            }}
            data-testid="phase-plan-editor"
          />

          <div style={{
            fontSize: '11px',
            color: '#6b7280',
            marginTop: '4px',
            display: 'flex',
            justifyContent: 'space-between'
          }}>
            <span>Supports basic Markdown formatting</span>
            <span>{content.length} characters</span>
          </div>
        </div>
      ) : (
        /* Preview Mode */
        <div 
          style={{
            minHeight: '200px',
            padding: '16px',
            backgroundColor: '#fafbfc',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            lineHeight: 1.6
          }}
          data-testid="phase-plan-preview"
        >
          {content ? (
            <div 
              dangerouslySetInnerHTML={{ 
                __html: renderPreview(content) 
              }}
            />
          ) : (
            <div style={{
              textAlign: 'center',
              color: '#6b7280',
              padding: '40px 20px'
            }}>
              <div style={{ fontSize: '16px', marginBottom: '8px' }}>📝</div>
              <div style={{ fontSize: '14px', marginBottom: '4px' }}>No phase plan content yet</div>
              <div style={{ fontSize: '12px' }}>
                {readOnly ? 'No plan has been created for this project.' : 'Click "Edit Plan" to get started.'}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Help Text */}
      {isEditing && (
        <div style={{
          marginTop: '12px',
          padding: '8px 12px',
          backgroundColor: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: '6px',
          fontSize: '12px',
          color: '#1e40af'
        }}>
          💡 <strong>Tip:</strong> Use this space to document project goals, phase breakdowns, success criteria, 
          and links to relevant resources. Content auto-saves as you type.
        </div>
      )}
    </div>
  );
};