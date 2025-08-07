/**
 * OF-8.5 Checkpoint Reviews with RAG Audit Integration
 * Enhanced SDLC UX with governance-rich workflows
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  CheckCircle2, 
  AlertTriangle,
  Clock,
  FileText,
  Search,
  Zap,
  BookOpen,
  Users,
  TrendingUp,
  Archive,
  ExternalLink
} from 'lucide-react';
import type { PhaseStep } from '../../services/continuousOrchestrator';
import { enhancedGovernanceLogger } from '../../services/enhancedGovernanceLogger';

interface CheckpointReview {
  id: string;
  stepId: string;
  reviewType: 'milestone' | 'quality' | 'governance' | 'technical' | 'stakeholder';
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'requires_action';
  createdAt: string;
  completedAt?: string;
  reviewer?: string;
  ragAuditResults?: RAGAuditResult;
  memoryAnchor?: string;
  relatedDocuments: string[];
  stakeholders: string[];
}

interface RAGAuditResult {
  overallScore: number;
  categories: {
    compliance: { score: number; findings: string[] };
    quality: { score: number; findings: string[] };
    completeness: { score: number; findings: string[] };
    alignment: { score: number; findings: string[] };
  };
  recommendations: string[];
  riskFactors: string[];
  documentReferences: string[];
  lastAuditDate: string;
}

interface CheckpointReviewSystemProps {
  step: PhaseStep;
  onReviewComplete?: (reviewId: string, results: CheckpointReview) => void;
  className?: string;
}

export const CheckpointReviewSystem: React.FC<CheckpointReviewSystemProps> = ({
  step,
  onReviewComplete,
  className = ''
}) => {
  const [reviews, setReviews] = useState<CheckpointReview[]>([]);
  const [activeReview, setActiveReview] = useState<CheckpointReview | null>(null);
  const [isRunningRAGAudit, setIsRunningRAGAudit] = useState(false);
  const [ragResults, setRagResults] = useState<RAGAuditResult | null>(null);

  useEffect(() => {
    loadCheckpointReviews();
    generateAutomaticCheckpoints();
  }, [step.stepId]);

  const loadCheckpointReviews = (): void => {
    // Mock data - in real implementation, load from database
    const mockReviews: CheckpointReview[] = [
      {
        id: 'review_milestone_1',
        stepId: step.stepId,
        reviewType: 'milestone',
        title: 'Phase Completion Review',
        description: 'Comprehensive review of phase deliverables and milestone achievements',
        status: 'completed',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        completedAt: new Date(Date.now() - 3600000).toISOString(),
        reviewer: 'Project Lead',
        relatedDocuments: ['requirements.md', 'technical-spec.md', 'test-results.md'],
        stakeholders: ['Product Owner', 'Tech Lead', 'QA Lead'],
        memoryAnchor: `checkpoint_${step.stepId}_milestone_1`
      },
      {
        id: 'review_quality_1',
        stepId: step.stepId,
        reviewType: 'quality',
        title: 'Code Quality & Standards Audit',
        description: 'Review of code quality, adherence to standards, and technical debt',
        status: 'pending',
        createdAt: new Date(Date.now() - 7200000).toISOString(),
        relatedDocuments: ['coding-standards.md', 'architecture-guide.md'],
        stakeholders: ['Tech Lead', 'Senior Developer'],
        memoryAnchor: `checkpoint_${step.stepId}_quality_1`
      }
    ];

    setReviews(mockReviews);
  };

  const generateAutomaticCheckpoints = (): void => {
    // Auto-generate checkpoints based on step progress and governance events
    if (step.completionPercentage >= 25 && step.completionPercentage < 50) {
      createAutomaticCheckpoint('governance', '25% Progress Governance Review');
    } else if (step.completionPercentage >= 50 && step.completionPercentage < 75) {
      createAutomaticCheckpoint('technical', 'Mid-Point Technical Review');
    } else if (step.completionPercentage >= 75) {
      createAutomaticCheckpoint('stakeholder', 'Pre-Completion Stakeholder Review');
    }
  };

  const createAutomaticCheckpoint = (type: CheckpointReview['reviewType'], title: string): void => {
    const newReview: CheckpointReview = {
      id: `auto_review_${type}_${Date.now()}`,
      stepId: step.stepId,
      reviewType: type,
      title,
      description: `Automatically generated checkpoint review based on step progress (${step.completionPercentage}%)`,
      status: 'pending',
      createdAt: new Date().toISOString(),
      relatedDocuments: [],
      stakeholders: [],
      memoryAnchor: `auto_checkpoint_${step.stepId}_${type}_${Date.now()}`
    };

    setReviews(prev => [...prev, newReview]);
    
    // Log checkpoint creation
    enhancedGovernanceLogger.logWorkSurfaceNav(
      step.projectId,
      step.projectId,
      'govern'
    );
  };

  const runRAGAudit = async (reviewId: string): Promise<void> => {
    setIsRunningRAGAudit(true);
    
    try {
      // Simulate RAG audit process
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const auditResult: RAGAuditResult = generateMockRAGResults();
      
      // Update review with RAG results
      setReviews(prev => prev.map(review => 
        review.id === reviewId 
          ? { ...review, ragAuditResults: auditResult, status: 'completed' as const }
          : review
      ));
      
      setRagResults(auditResult);
      
      // Create memory anchor for RAG audit
      const memoryAnchor = `rag_audit_${reviewId}_${Date.now()}`;
      
      enhancedGovernanceLogger.logWorkSurfaceNav(
        step.projectId,
        step.projectId,
        'govern'
      );
      
      console.log(`✅ RAG Audit completed for review ${reviewId}`);
    } catch (error) {
      console.error('RAG Audit failed:', error);
    } finally {
      setIsRunningRAGAudit(false);
    }
  };

  const generateMockRAGResults = (): RAGAuditResult => {
    return {
      overallScore: 0.82,
      categories: {
        compliance: {
          score: 0.88,
          findings: [
            'All regulatory requirements addressed',
            'Documentation standards met',
            'Approval workflows followed'
          ]
        },
        quality: {
          score: 0.75,
          findings: [
            'Code coverage above 80%',
            'Performance benchmarks met',
            'Minor technical debt identified'
          ]
        },
        completeness: {
          score: 0.90,
          findings: [
            'All deliverables present',
            'Test cases comprehensive',
            'Documentation complete'
          ]
        },
        alignment: {
          score: 0.78,
          findings: [
            'Project goals alignment verified',
            'Stakeholder requirements met',
            'Strategic objectives on track'
          ]
        }
      },
      recommendations: [
        'Address identified technical debt before next phase',
        'Schedule additional stakeholder review for alignment',
        'Update performance monitoring for production readiness'
      ],
      riskFactors: [
        'Dependency on external API may cause delays',
        'Resource allocation tight for next phase',
        'Integration testing requires more time'
      ],
      documentReferences: [
        'project-charter.md',
        'technical-requirements.md',
        'governance-checklist.md',
        'stakeholder-feedback.md'
      ],
      lastAuditDate: new Date().toISOString()
    };
  };

  const getReviewStatusColor = (status: CheckpointReview['status']) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'requires_action': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getReviewTypeIcon = (type: CheckpointReview['reviewType']) => {
    switch (type) {
      case 'milestone': return <CheckCircle2 className="w-4 h-4" />;
      case 'quality': return <Zap className="w-4 h-4" />;
      case 'governance': return <BookOpen className="w-4 h-4" />;
      case 'technical': return <FileText className="w-4 h-4" />;
      case 'stakeholder': return <Users className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getRiskLevelColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Checkpoint Reviews</h2>
        <Badge variant="secondary">
          {reviews.length} reviews
        </Badge>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.map((review) => (
          <Card key={review.id} className="transition-all duration-200 hover:shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getReviewTypeIcon(review.reviewType)}
                  <h3 className="font-semibold">{review.title}</h3>
                  <Badge className={getReviewStatusColor(review.status)}>
                    {review.status.replace('_', ' ')}
                  </Badge>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={() => runRAGAudit(review.id)}
                    disabled={isRunningRAGAudit || review.status === 'completed'}
                    size="sm"
                    variant="outline"
                  >
                    <Search className="w-4 h-4 mr-1" />
                    {isRunningRAGAudit ? 'Running...' : 'RAG Audit'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">{review.description}</p>
              
              {/* RAG Audit Results */}
              {review.ragAuditResults && (
                <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">RAG Audit Results</h4>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">Overall Score:</span>
                      <span className={`font-semibold ${getRiskLevelColor(review.ragAuditResults.overallScore)}`}>
                        {Math.round(review.ragAuditResults.overallScore * 100)}%
                      </span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(review.ragAuditResults.categories).map(([category, data]) => (
                      <div key={category} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium capitalize">{category}</span>
                          <span className={`text-sm font-semibold ${getRiskLevelColor(data.score)}`}>
                            {Math.round(data.score * 100)}%
                          </span>
                        </div>
                        <div className="space-y-1">
                          {data.findings.slice(0, 2).map((finding, idx) => (
                            <div key={idx} className="text-xs text-gray-600 flex items-start">
                              <CheckCircle2 className="w-3 h-3 mr-1 mt-0.5 text-green-500" />
                              {finding}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {review.ragAuditResults.recommendations.length > 0 && (
                    <div className="space-y-2">
                      <h5 className="text-sm font-medium">Recommendations</h5>
                      <div className="space-y-1">
                        {review.ragAuditResults.recommendations.slice(0, 3).map((rec, idx) => (
                          <div key={idx} className="text-xs text-gray-600 flex items-start">
                            <TrendingUp className="w-3 h-3 mr-1 mt-0.5 text-blue-500" />
                            {rec}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {review.ragAuditResults.riskFactors.length > 0 && (
                    <div className="space-y-2">
                      <h5 className="text-sm font-medium">Risk Factors</h5>
                      <div className="space-y-1">
                        {review.ragAuditResults.riskFactors.slice(0, 2).map((risk, idx) => (
                          <div key={idx} className="text-xs text-gray-600 flex items-start">
                            <AlertTriangle className="w-3 h-3 mr-1 mt-0.5 text-yellow-500" />
                            {risk}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* Review Metadata */}
              <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                <div className="flex items-center space-x-4">
                  <span>Created: {new Date(review.createdAt).toLocaleDateString()}</span>
                  {review.reviewer && <span>Reviewer: {review.reviewer}</span>}
                </div>
                <div className="flex items-center space-x-2">
                  <Archive className="w-4 h-4" />
                  <span>{review.relatedDocuments.length} documents</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {reviews.length === 0 && (
        <Card>
          <CardContent className="pt-8 pb-8 text-center text-gray-500">
            <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No checkpoint reviews yet. Reviews will be automatically generated based on step progress.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CheckpointReviewSystem;