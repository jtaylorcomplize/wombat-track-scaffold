/**
 * Template Suggestion Engine - OF-9.0.8.4
 * AI-powered template suggestions based on step instructions and context
 */

import React, { useState, useCallback } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { 
  Lightbulb, 
  Bot, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  Copy,
  BookOpen,
  Wand2,
  ExternalLink
} from 'lucide-react';

interface TemplateResource {
  id: string;
  title: string;
  type: 'Step Instruction' | 'Compliance Trigger' | 'Process Template' | 'Governance Framework';
  content: string;
  metadata: {
    usageType: string;
    category: string;
    aiGenerated: boolean;
    confidence: number;
  };
  memoryAnchor?: string;
}

interface TemplateSuggestionEngineProps {
  stepId: string;
  stepName: string;
  stepInstruction?: string;
  currentContext?: {
    projectType?: string;
    phaseType?: string;
    compliance?: string[];
    existingTemplates?: string[];
  };
  onTemplateSave?: (template: TemplateResource) => void;
  className?: string;
}

interface AIResponse {
  suggestions: TemplateResource[];
  reasoning: string;
  confidence: number;
}

export const TemplateSuggestionEngine: React.FC<TemplateSuggestionEngineProps> = ({
  stepId,
  stepName,
  stepInstruction,
  currentContext,
  onTemplateSave,
  className = ''
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState<TemplateResource[]>([]);
  const [aiResponse, setAiResponse] = useState<AIResponse | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [error, setError] = useState<string>('');

  // AI template generation
  const generateTemplateSuggestions = useCallback(async () => {
    setIsGenerating(true);
    setError('');

    try {
      // Construct AI prompt based on step context
      const prompt = `
Based on the following step instruction and context, suggest relevant templates:

Step Name: ${stepName}
Step Instruction: ${stepInstruction || 'Not specified'}
Project Type: ${currentContext?.projectType || 'General'}
Phase Type: ${currentContext?.phaseType || 'Development'}
Compliance Requirements: ${currentContext?.compliance?.join(', ') || 'None specified'}

${customPrompt ? `Additional Context: ${customPrompt}` : ''}

Please suggest templates with usageType = 'Step Instruction' or 'Compliance Trigger' that would be most helpful for this step.
Focus on practical, actionable templates that align with the step objectives.
      `;

      // Mock AI response (in production, this would call Claude/OpenAI API)
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call

      const mockResponse: AIResponse = {
        suggestions: [
          {
            id: `template-${stepId}-1`,
            title: `${stepName} - Process Checklist`,
            type: 'Step Instruction',
            content: `## ${stepName} Process Checklist

### Pre-requisites
- [ ] Verify previous step completion
- [ ] Review step instruction: ${stepInstruction}
- [ ] Gather required resources and documentation

### Implementation Steps
1. **Planning Phase**
   - Define scope and objectives
   - Identify stakeholders and dependencies
   - Create detailed work breakdown

2. **Execution Phase**
   - Follow established procedures
   - Document progress and decisions
   - Monitor quality and compliance

3. **Validation Phase**
   - Verify deliverables meet requirements
   - Conduct peer review
   - Update governance logs

### Success Criteria
- All checklist items completed
- Quality standards met
- Documentation updated
- Stakeholders informed

### Templates and Resources
- Process documentation template
- Quality assurance checklist
- Stakeholder communication plan`,
            metadata: {
              usageType: 'Step Instruction',
              category: 'Process Template',
              aiGenerated: true,
              confidence: 0.92
            },
            memoryAnchor: `step-${stepId}-process-anchor`
          },
          {
            id: `template-${stepId}-2`,
            title: `Compliance Trigger - ${currentContext?.compliance?.[0] || 'General'} Requirements`,
            type: 'Compliance Trigger',
            content: `## Compliance Requirements for ${stepName}

### Regulatory Framework
${currentContext?.compliance?.map(comp => `- ${comp} compliance requirements`).join('\n') || '- General compliance requirements'}

### Mandatory Actions
1. **Documentation Requirements**
   - Maintain audit trail for all decisions
   - Record risk assessments and mitigation plans
   - Document approval workflows

2. **Review and Approval Process**
   - Submit for peer review
   - Obtain necessary approvals
   - Validate against compliance criteria

3. **Quality Assurance**
   - Conduct compliance checklist review
   - Verify adherence to standards
   - Document exceptions and remediation

### Compliance Checklist
- [ ] Risk assessment completed
- [ ] Regulatory requirements reviewed
- [ ] Approval workflows followed
- [ ] Documentation standards met
- [ ] Audit trail established

### Escalation Procedures
If compliance issues are identified:
1. Document the issue immediately
2. Notify compliance officer
3. Implement remediation plan
4. Update risk register`,
            metadata: {
              usageType: 'Compliance Trigger',
              category: 'Governance Framework',
              aiGenerated: true,
              confidence: 0.87
            }
          }
        ],
        reasoning: `Generated templates based on step instruction "${stepInstruction}" and project context. Focus on process structure and compliance requirements typical for ${currentContext?.projectType || 'development'} projects.`,
        confidence: 0.89
      };

      setAiResponse(mockResponse);
      setSuggestions(mockResponse.suggestions);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate template suggestions');
    } finally {
      setIsGenerating(false);
    }
  }, [stepId, stepName, stepInstruction, currentContext, customPrompt]);

  const copyTemplateContent = (content: string) => {
    navigator.clipboard.writeText(content);
    // Could add toast notification here
  };

  const saveTemplate = (template: TemplateResource) => {
    if (onTemplateSave) {
      onTemplateSave(template);
    }
    setSelectedTemplate(template.id);
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Wand2 className="h-5 w-5 text-purple-600" />
          <h3 className="text-lg font-semibold">AI Template Suggestions</h3>
          <Badge variant="outline" className="text-xs">
            <Bot className="h-3 w-3 mr-1" />
            Powered by Claude
          </Badge>
        </div>
        <p className="text-sm text-gray-600">
          Generate contextual templates based on step instructions and project requirements
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Custom Prompt Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Additional Context (Optional)
          </label>
          <Textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="Provide any additional context or specific requirements for template generation..."
            rows={2}
            className="w-full"
          />
        </div>

        {/* Generate Button */}
        <Button
          onClick={generateTemplateSuggestions}
          disabled={isGenerating}
          className="w-full"
          variant="default"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating Templates...
            </>
          ) : (
            <>
              <Lightbulb className="h-4 w-4 mr-2" />
              Generate AI Template Suggestions
            </>
          )}
        </Button>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        )}

        {/* AI Response & Suggestions */}
        {aiResponse && (
          <div className="space-y-4">
            {/* AI Reasoning */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-2">
                <Bot className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">AI Analysis</span>
                <Badge variant="outline" className="text-xs">
                  {Math.round(aiResponse.confidence * 100)}% confidence
                </Badge>
              </div>
              <p className="text-sm text-blue-700">{aiResponse.reasoning}</p>
            </div>

            {/* Template Suggestions */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900 flex items-center">
                <BookOpen className="h-4 w-4 mr-2" />
                Suggested Templates ({suggestions.length})
              </h4>
              
              {suggestions.map((template) => (
                <div
                  key={template.id}
                  className={`border rounded-lg p-4 transition-all ${
                    selectedTemplate === template.id 
                      ? 'border-green-500 bg-green-50' 
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h5 className="font-medium text-gray-900">{template.title}</h5>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge 
                          variant={template.type === 'Step Instruction' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {template.type}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {Math.round(template.metadata.confidence * 100)}% match
                        </Badge>
                        {template.metadata.aiGenerated && (
                          <Badge variant="outline" className="text-xs text-purple-600">
                            <Bot className="h-3 w-3 mr-1" />
                            AI Generated
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyTemplateContent(template.content)}
                        className="text-xs"
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        Copy
                      </Button>
                      <Button
                        size="sm"
                        variant={selectedTemplate === template.id ? "default" : "outline"}
                        onClick={() => saveTemplate(template)}
                        className="text-xs"
                      >
                        {selectedTemplate === template.id ? (
                          <>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Saved
                          </>
                        ) : (
                          'Save Template'
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Template Preview */}
                  <div className="bg-gray-50 rounded border p-3 mt-3">
                    <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono overflow-x-auto">
                      {template.content.length > 300 
                        ? `${template.content.substring(0, 300)}...\n\n[Template truncated - click Copy to see full content]`
                        : template.content
                      }
                    </pre>
                  </div>

                  {/* Memory Anchor Link */}
                  {template.memoryAnchor && (
                    <div className="mt-2 flex items-center text-xs text-gray-500">
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Memory Anchor: {template.memoryAnchor}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No suggestions message */}
        {!isGenerating && suggestions.length === 0 && !error && (
          <div className="text-center py-8 text-gray-500">
            <Lightbulb size={48} className="mx-auto mb-3 text-gray-300" />
            <p>Click "Generate AI Template Suggestions" to get started</p>
            <p className="text-xs mt-1">AI will analyze your step context and suggest relevant templates</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TemplateSuggestionEngine;