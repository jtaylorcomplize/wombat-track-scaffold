import React, { useState, useEffect } from 'react';
import type { Phase } from '../../types/phase';

interface PhaseMetadataModalProps {
  isOpen: boolean;
  onClose: () => void;
  phase: Phase | null;
  onUpdate: (phaseId: string, updates: Partial<Phase>) => void;
}

const phaseTypes = [
  'PlatformOps',
  'Governance', 
  'Console',
  'Infrastructure',
  'Development',
  'Testing',
  'Other'
] as const;

const ragStatusOptions = [
  { value: 'red', label: '🔴 Red', color: '#ef4444' },
  { value: 'amber', label: '🟡 Amber', color: '#f59e0b' },
  { value: 'green', label: '🟢 Green', color: '#10b981' },
  { value: 'blue', label: '🔵 Blue', color: '#3b82f6' }
] as const;

export const PhaseMetadataModal: React.FC<PhaseMetadataModalProps> = ({
  isOpen,
  onClose,
  phase,
  onUpdate
}) => {
  const [formData, setFormData] = useState<Partial<Phase>>({});

  useEffect(() => {
    if (phase) {
      setFormData({
        name: phase.name,
        description: phase.description,
        summary: phase.summary || '',
        phaseType: phase.phaseType || 'Other',
        phaseOwner: phase.phaseOwner || '',
        ragStatus: phase.ragStatus || 'green'
      });
    }
  }, [phase]);

  if (!isOpen || !phase) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(phase.id, formData);
    onClose();
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const renderMarkdown = (text: string) => {
    if (!text) return null;
    
    const html = text
      .replace(/^# (.+)$/gm, '<h1 style="font-size: 20px; font-weight: 700; margin: 12px 0 6px 0;">$1</h1>')
      .replace(/^## (.+)$/gm, '<h2 style="font-size: 16px; font-weight: 600; margin: 10px 0 4px 0;">$1</h2>')
      .replace(/^### (.+)$/gm, '<h3 style="font-size: 14px; font-weight: 600; margin: 8px 0 4px 0;">$1</h3>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/(<li.*<\/li>)/s, '<ul style="margin: 6px 0; padding-left: 16px;">$1</ul>')
      .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" style="color: #3b82f6; text-decoration: underline;" target="_blank" rel="noopener noreferrer">$1</a>')
      .replace(/\n\n/g, '</p><p style="margin: 6px 0;">')
      .replace(/^(.+)$/gm, '<p style="margin: 6px 0;">$1</p>');

    return (
      <div 
        style={{
          fontSize: '13px',
          lineHeight: 1.5,
          color: '#374151'
        }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  };

  return (
    <div
      onClick={handleOverlayClick}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1001
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          width: '90%',
          maxWidth: '600px',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
        }}
      >
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#1f2937', marginBottom: '4px' }}>
              Edit Phase Metadata
            </h2>
            <p style={{ fontSize: '13px', color: '#6b7280' }}>
              Update governance and tracking information for this phase
            </p>
          </div>

          {/* Basic Information */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>
              Phase Name
            </label>
            <input
              type="text"
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
              required
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>
              Description
            </label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                resize: 'vertical'
              }}
            />
          </div>

          {/* Governance Fields */}
          <div style={{ 
            backgroundColor: '#f9fafb', 
            padding: '16px', 
            borderRadius: '8px',
            marginBottom: '16px'
          }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '12px' }}>
              Governance Information
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>
                  Phase Type
                </label>
                <select
                  value={formData.phaseType || 'Other'}
                  onChange={(e) => setFormData({ ...formData, phaseType: e.target.value as Phase['phaseType'] })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    backgroundColor: 'white'
                  }}
                >
                  {phaseTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>
                  Phase Owner
                </label>
                <input
                  type="text"
                  value={formData.phaseOwner || ''}
                  onChange={(e) => setFormData({ ...formData, phaseOwner: e.target.value })}
                  placeholder="Enter owner name"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>
            </div>

            <div style={{ marginTop: '12px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>
                RAG Status
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {ragStatusOptions.map(option => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, ragStatus: option.value as Phase['ragStatus'] })}
                    style={{
                      padding: '8px 16px',
                      border: '2px solid',
                      borderColor: formData.ragStatus === option.value ? option.color : '#e5e7eb',
                      backgroundColor: formData.ragStatus === option.value ? option.color + '10' : 'white',
                      borderRadius: '6px',
                      fontSize: '14px',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Phase Summary */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>
              Phase Summary (Markdown)
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <textarea
                  value={formData.summary || ''}
                  onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                  rows={8}
                  placeholder="Enter phase objectives, outcomes, and key information..."
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontFamily: 'monospace',
                    resize: 'vertical'
                  }}
                />
              </div>
              <div style={{
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                padding: '12px',
                backgroundColor: '#f9fafb',
                overflow: 'auto',
                maxHeight: '200px'
              }}>
                <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '8px' }}>Preview:</div>
                {renderMarkdown(formData.summary || '')}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 16px',
                backgroundColor: '#f3f4f6',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                padding: '8px 16px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};