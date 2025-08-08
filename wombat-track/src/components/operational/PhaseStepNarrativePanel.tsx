/**
 * OF-8.5 Phase Step Narrative Panel
 * Enhanced SDLC UX with narrative panels and AI commentary
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { 
  MessageSquareText, 
  User, 
  Bot, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  PlayCircle,
  PauseCircle,
  Edit3,
  Save,
  X,
  Lightbulb,
  Target,
  TrendingUp
} from 'lucide-react';
import type { PhaseStep, StepProgress } from '../../services/continuousOrchestrator';
import { governanceLogger as enhancedGovernanceLogger } from '../../services/governanceLoggerBrowser';

interface NarrativeEntry {
  id: string;
  stepId: string;
  timestamp: string;
  author: 'human' | 'ai' | 'system';
  authorName: string;
  content: string;
  type: 'comment' | 'insight' | 'recommendation' | 'checkpoint' | 'status_update';
  metadata?: Record<string, unknown>;
  memoryAnchor?: string;
}

interface PhaseStepNarrativePanelProps {
  step: PhaseStep;
  progress: StepProgress[];
  onStepUpdate?: (stepId: string, updates: Partial<PhaseStep>) => void;
  className?: string;
}

export const PhaseStepNarrativePanel: React.FC<PhaseStepNarrativePanelProps> = ({
  step,
  progress,
  onStepUpdate,
  className = ''
}) => {
  const [narrativeEntries, setNarrativeEntries] = useState<NarrativeEntry[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [aiInsightsEnabled, setAiInsightsEnabled] = useState(true);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  useEffect(() => {
    loadNarrativeEntries();
    if (aiInsightsEnabled) {
      generateAIInsights();
    }
  }, [step.stepId]);

  const loadNarrativeEntries = (): void => {
    // In a real implementation, this would load from database
    const mockEntries: NarrativeEntry[] = [
      {
        id: 'entry_1',
        stepId: step.stepId,
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        author: 'human',
        authorName: 'Project Lead',
        content: 'Starting work on this phase. Initial analysis shows good progress alignment with project goals.',
        type: 'comment',
        memoryAnchor: `narrative_${step.stepId}_init`
      },
      {
        id: 'entry_2',
        stepId: step.stepId,
        timestamp: new Date(Date.now() - 1800000).toISOString(),
        author: 'ai',
        authorName: 'Claude Assistant',
        content: 'Based on similar project patterns, I recommend focusing on the technical debt reduction before proceeding to the next phase. This will improve overall project velocity by ~15%.',
        type: 'recommendation',
        metadata: { confidence: 0.85, basis: 'historical_patterns' }
      }
    ];

    setNarrativeEntries(mockEntries);
  };

  const generateAIInsights = async (): Promise<void> => {
    if (isGeneratingAI) return;
    
    setIsGeneratingAI(true);
    
    try {
      // Simulate AI analysis
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const aiInsight: NarrativeEntry = {
        id: `ai_insight_${Date.now()}`,
        stepId: step.stepId,
        timestamp: new Date().toISOString(),
        author: 'ai',
        authorName: 'Claude Assistant',
        content: generateContextualAIInsight(),
        type: 'insight',
        metadata: { 
          triggerEvent: 'step_analysis',
          confidence: 0.78,
          dataPoints: ['completion_percentage', 'time_elapsed', 'similar_projects']
        },
        memoryAnchor: `ai_insight_${step.stepId}_${Date.now()}`
      };

      setNarrativeEntries(prev => [aiInsight, ...prev]);
      
      // Log AI insight generation
      enhancedGovernanceLogger.logWorkSurfaceNav(
        step.projectId,
        step.projectId,
        'govern'
      );
    } catch (error) {
      console.error('Error generating AI insights:', error);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const generateContextualAIInsight = (): string => {
    const insights = [
      `Step completion at ${step.completionPercentage}% suggests steady progress. Consider scheduling a checkpoint review to validate assumptions and adjust timeline if needed.`,
      `Based on governance logs, this step has high user engagement. This indicates strong stakeholder alignment - good time to gather feedback for next phase planning.`,
      `Memory anchors show this step is linked to ${step.memoryAnchor}. Previous similar steps took ~15% longer than estimated. Recommend buffer time for dependencies.`,
      `Step status '${step.status}' aligns with project velocity patterns. Consider documenting key decisions now while context is fresh for future reference.`,
      `Progress tracking shows consistent updates. This indicates good project hygiene. Consider creating a template from this step for future similar work.`
    ];

    return insights[Math.floor(Math.random() * insights.length)];
  };

  const addNarrativeEntry = (): void => {
    if (!newComment.trim()) return;

    const entry: NarrativeEntry = {
      id: `entry_${Date.now()}`,
      stepId: step.stepId,
      timestamp: new Date().toISOString(),
      author: 'human',
      authorName: 'Current User',
      content: newComment.trim(),
      type: 'comment',
      memoryAnchor: `narrative_${step.stepId}_${Date.now()}`
    };

    setNarrativeEntries(prev => [entry, ...prev]);
    setNewComment('');

    // Log narrative addition
    enhancedGovernanceLogger.logWorkSurfaceNav(
      step.projectId,
      step.projectId,
      'document'
    );
  };

  const createCheckpoint = (): void => {
    const checkpoint: NarrativeEntry = {
      id: `checkpoint_${Date.now()}`,
      stepId: step.stepId,
      timestamp: new Date().toISOString(),
      author: 'system',
      authorName: 'System',
      content: `Checkpoint created: Step "${step.stepName}" at ${step.completionPercentage}% completion. Status: ${step.status}`,
      type: 'checkpoint',
      metadata: {
        completionPercentage: step.completionPercentage,
        status: step.status,
        memoryAnchors: [step.memoryAnchor]
      },
      memoryAnchor: `checkpoint_${step.stepId}_${Date.now()}`
    };

    setNarrativeEntries(prev => [checkpoint, ...prev]);
    
    // Trigger AI analysis for checkpoint
    if (aiInsightsEnabled) {
      generateAIInsights();
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'in_progress': return <PlayCircle className="w-4 h-4 text-blue-600" />;
      case 'blocked': return <AlertCircle className="w-4 h-4 text-red-600" />;
      default: return <PauseCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  const getAuthorIcon = (author: string) => {
    switch (author) {
      case 'ai': return <Bot className="w-4 h-4" />;
      case 'system': return <Target className="w-4 h-4" />;
      default: return <User className="w-4 h-4" />;
    }
  };

  const getEntryTypeIcon = (type: string) => {
    switch (type) {
      case 'insight': return <Lightbulb className="w-4 h-4 text-yellow-600" />;
      case 'recommendation': return <TrendingUp className="w-4 h-4 text-blue-600" />;
      case 'checkpoint': return <Target className="w-4 h-4 text-purple-600" />;
      default: return <MessageSquareText className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Step Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {getStatusIcon(step.status)}
              <h3 className="text-lg font-semibold">{step.stepName}</h3>
              <Badge variant="outline">{step.status}</Badge>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">{step.completionPercentage}%</span>
              <div className="w-20 h-2 bg-gray-200 rounded-full">
                <div 
                  className="h-2 bg-blue-600 rounded-full transition-all duration-300"
                  style={{ width: `${step.completionPercentage}%` }}
                />
              </div>
            </div>
          </div>
          {step.stepDescription && (
            <p className="text-sm text-gray-600 mt-2">{step.stepDescription}</p>
          )}
        </CardHeader>
      </Card>

      {/* Action Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button 
            onClick={createCheckpoint}
            size="sm"
            variant="outline"
          >
            <Target className="w-4 h-4 mr-1" />
            Checkpoint
          </Button>
          <Button 
            onClick={generateAIInsights}
            size="sm"
            variant="outline"
            disabled={isGeneratingAI}
          >
            <Bot className="w-4 h-4 mr-1" />
            {isGeneratingAI ? 'Analyzing...' : 'AI Insights'}
          </Button>
        </div>
        <Badge variant="secondary">
          {narrativeEntries.length} entries
        </Badge>
      </div>

      {/* New Comment Input */}
      <Card>
        <CardContent className="pt-4">
          <div className="space-y-3">
            <Textarea
              placeholder="Add commentary, insights, or notes about this step..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={3}
              className="resize-none"
            />
            <div className="flex justify-end space-x-2">
              <Button 
                onClick={addNarrativeEntry}
                disabled={!newComment.trim()}
                size="sm"
              >
                <MessageSquareText className="w-4 h-4 mr-1" />
                Add Comment
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Narrative Timeline */}
      <div className="space-y-3">
        {narrativeEntries.map((entry) => (
          <Card key={entry.id} className="transition-all duration-200 hover:shadow-md">
            <CardContent className="pt-4">
              <div className="flex space-x-3">
                <Avatar className="w-8 h-8 mt-1">
                  <AvatarFallback className="text-xs">
                    {getAuthorIcon(entry.author)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-sm">{entry.authorName}</span>
                      <div className="flex items-center space-x-1">
                        {getEntryTypeIcon(entry.type)}
                        <Badge variant="secondary" className="text-xs">
                          {entry.type}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {entry.content}
                  </p>
                  {entry.metadata && (
                    <div className="text-xs text-gray-500 space-y-1">
                      {entry.metadata.confidence && (
                        <div>Confidence: {Math.round(Number(entry.metadata.confidence) * 100)}%</div>
                      )}
                      {entry.memoryAnchor && (
                        <div>Memory Anchor: {entry.memoryAnchor}</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {narrativeEntries.length === 0 && (
        <Card>
          <CardContent className="pt-8 pb-8 text-center text-gray-500">
            <MessageSquareText className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No narrative entries yet. Add the first comment to start the conversation.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PhaseStepNarrativePanel;