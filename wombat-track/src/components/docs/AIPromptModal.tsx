import React, { useState } from 'react';
import { X, Sparkles, RefreshCw, Loader2 } from 'lucide-react'; // no-unused-vars fix
import type { AIPromptOption } from '../../types/docs';
import { useProjectContext } from '../../contexts/ProjectContext';

interface AIPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyResult: (content: string, action: 'replace' | 'append' | 'insert') => void;
  currentContent: string;
  documentTitle: string;
  docType: string;
}

export const AIPromptModal: React.FC<AIPromptModalProps> = ({
  isOpen,
  onClose,
  onApplyResult,
  currentContent,
  documentTitle,
  docType
}) => {
  const { logGovernanceEvent } = useProjectContext();
  const [selectedOption, setSelectedOption] = useState<AIPromptOption | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState('');
  const [error, setError] = useState('');

  const aiOptions: AIPromptOption[] = [
    {
      id: 'scaffold-sop',
      label: 'Scaffold SOP',
      icon: '✨',
      prompt: `Create a comprehensive Standard Operating Procedure (SOP) for "${documentTitle}". Include:
1. Purpose and Scope
2. Responsibilities
3. Step-by-step Procedures
4. Quality Checkpoints
5. Related Documents
6. Revision History

Make it clear, actionable, and compliant with best practices.`,
      action: 'replace'
    },
    {
      id: 'revise-content',
      label: 'Revise Content',
      icon: '🔁',
      prompt: `Revise and improve the following ${docType} document. Make it more:
- Clear and concise
- Well-structured
- Professional in tone
- Complete with any missing sections
- Free of errors

Current content:
${currentContent}`,
      action: 'replace'
    },
    {
      id: 'summarize-governance',
      label: 'Summarize for GovernanceLog',
      icon: '📌',
      prompt: `Create a concise governance log summary for this ${docType} document titled "${documentTitle}". Include:
- Key purpose and objectives
- Main changes or decisions
- Compliance considerations
- Action items or next steps

Keep it under 200 words and focus on governance-relevant information.`,
      action: 'insert'
    }
  ];

  const handleGenerate = async () => {
    if (!selectedOption && !customPrompt.trim()) {
      setError('Please select an option or enter a custom prompt');
      return;
    }

    setIsGenerating(true);
    setError('');

    const prompt = selectedOption ? selectedOption.prompt : customPrompt;
    const _action = selectedOption?.action || 'append'; // no-unused-vars fix

    try {
      // Simulate AI generation - in real app, this would call your AI service
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock generated content based on the option
      let mockContent = '';
      
      if (selectedOption?.id === 'scaffold-sop') {
        mockContent = `# ${documentTitle} - Standard Operating Procedure

## 1. Purpose and Scope

This SOP defines the procedures for ${documentTitle.toLowerCase()}. It applies to all team members involved in the process.

## 2. Responsibilities

- **Process Owner**: Oversees implementation and updates
- **Team Members**: Follow procedures as outlined
- **Quality Assurance**: Verify compliance

## 3. Procedures

### 3.1 Preparation
1. Review all requirements
2. Gather necessary resources
3. Verify prerequisites are met

### 3.2 Execution
1. Step 1: [Detailed action]
2. Step 2: [Detailed action]
3. Step 3: [Detailed action]

### 3.3 Verification
1. Confirm all steps completed
2. Document any deviations
3. Submit for review

## 4. Quality Checkpoints

- [ ] All prerequisites verified
- [ ] Steps executed in order
- [ ] Results documented
- [ ] Review completed

## 5. Related Documents

- [Reference Doc 1]
- [Reference Doc 2]

## 6. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | ${new Date().toLocaleDateString()} | Current User | Initial creation |`;
      } else if (selectedOption?.id === 'revise-content') {
        mockContent = `${currentContent}\n\n---\n\n## Revised Content\n\nThis content has been revised for clarity and completeness. Key improvements include:\n- Enhanced structure\n- Clearer language\n- Additional context where needed`;
      } else if (selectedOption?.id === 'summarize-governance') {
        mockContent = `## Governance Summary

**Document**: ${documentTitle}
**Type**: ${docType}
**Date**: ${new Date().toLocaleDateString()}

**Purpose**: This document establishes procedures and guidelines for the subject matter.

**Key Decisions**:
- Defined clear responsibilities
- Established quality checkpoints
- Created review process

**Compliance**: Aligns with organizational standards and regulatory requirements.

**Next Steps**:
- Review and approval by stakeholders
- Implementation training
- Regular review cycle establishment`;
      } else {
        mockContent = `Generated content based on your prompt: "${prompt.substring(0, 50)}..."`;
      }

      setGeneratedContent(mockContent);
      
      // Log AI generation event
      logGovernanceEvent({
        phaseStepId: `ai-gen-${Date.now()}`,
        newStatus: 'complete',
        triggeredBy: 'current-user',
        eventType: 'StepStatusUpdated',
        details: {
          action: 'ai_content_generated',
          promptType: selectedOption?.id || 'custom',
          documentTitle
        }
      });
    } catch (err) {
      setError('Failed to generate content. Please try again.');
      console.error('AI generation error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApply = () => {
    if (generatedContent) {
      const action = selectedOption?.action || 'append';
      onApplyResult(generatedContent, action);
      
      // Log application event
      logGovernanceEvent({
        phaseStepId: `ai-apply-${Date.now()}`,
        newStatus: 'complete',
        triggeredBy: 'current-user',
        eventType: 'StepStatusUpdated',
        details: {
          action: 'ai_content_applied',
          applyAction: action,
          documentTitle
        }
      });
      
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-purple-600" />
            AI Content Assistant
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Options */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Select an AI action:</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {aiOptions.map(option => (
                <button
                  key={option.id}
                  onClick={() => {
                    setSelectedOption(option);
                    setCustomPrompt('');
                  }}
                  className={`p-4 border rounded-lg text-left transition-all ${
                    selectedOption?.id === option.id
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-2xl mb-2">{option.icon}</div>
                  <div className="font-medium text-gray-900">{option.label}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Action: {option.action}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Custom prompt */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Or enter a custom prompt:</h3>
            <textarea
              value={customPrompt}
              onChange={(e) => {
                setCustomPrompt(e.target.value);
                setSelectedOption(null);
              }}
              placeholder="Describe what you want the AI to help with..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              rows={4}
            />
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Generated content preview */}
          {generatedContent && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Generated Content:</h3>
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-md max-h-64 overflow-y-auto">
                <pre className="whitespace-pre-wrap text-sm text-gray-800">{generatedContent}</pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
          >
            Cancel
          </button>
          
          <div className="flex items-center gap-3">
            {generatedContent && (
              <button
                onClick={() => {
                  setGeneratedContent('');
                  handleGenerate();
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Regenerate
              </button>
            )}
            
            {!generatedContent ? (
              <button
                onClick={handleGenerate}
                disabled={isGenerating || (!selectedOption && !customPrompt.trim())}
                className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleApply}
                className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
              >
                Apply to Document
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};