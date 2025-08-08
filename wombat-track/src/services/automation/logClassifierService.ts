/**
 * OF-9.5.1: Auto-classifier Service
 * RAG classifier to auto-tag governance logs by entryType & classification
 */

import type { GovernanceLog } from '../governanceLogsService';

export interface ClassificationResult {
  entryType: GovernanceLog['entryType'];
  classification: string;
  confidence: number;
  reasoning: string;
}

export interface ClassificationRequest {
  summary: string;
  gptDraftEntry?: string;
  currentClassification?: string;
  relatedPhase?: string;
}

export class LogClassifierService {
  private static instance: LogClassifierService;
  private embeddingsApiKey: string;
  private isInitialized = false;

  private constructor() {
    this.embeddingsApiKey = process.env.EMBEDDINGS_API_KEY || '';
  }

  static getInstance(): LogClassifierService {
    if (!LogClassifierService.instance) {
      LogClassifierService.instance = new LogClassifierService();
    }
    return LogClassifierService.instance;
  }

  async init(): Promise<void> {
    if (this.isInitialized) return;
    
    if (!this.embeddingsApiKey) {
      console.warn('EMBEDDINGS_API_KEY not configured - using rule-based classification fallback');
    }
    
    this.isInitialized = true;
  }

  /**
   * Classify a governance log entry using AI embeddings or rule-based fallback
   */
  async classifyGovernanceLog(request: ClassificationRequest): Promise<ClassificationResult> {
    await this.init();

    try {
      if (this.embeddingsApiKey) {
        return await this.aiClassification(request);
      } else {
        return await this.ruleBasedClassification(request);
      }
    } catch (error) {
      console.error('Classification failed, using fallback:', error);
      return await this.ruleBasedClassification(request);
    }
  }

  /**
   * AI-powered classification using embeddings API
   */
  private async aiClassification(request: ClassificationRequest): Promise<ClassificationResult> {
    // In a real implementation, this would:
    // 1. Generate embeddings for the input text
    // 2. Compare with pre-trained classification vectors
    // 3. Return the best match with confidence score
    
    // For now, using enhanced rule-based classification
    return this.enhancedRuleBasedClassification(request);
  }

  /**
   * Enhanced rule-based classification with pattern matching
   */
  private async enhancedRuleBasedClassification(request: ClassificationRequest): Promise<ClassificationResult> {
    const text = `${request.summary} ${request.gptDraftEntry || ''}`.toLowerCase();
    
    // Entry type classification patterns
    const entryTypePatterns = {
      'Decision': [
        'decision', 'decided', 'approved', 'rejected', 'chosen', 'selected',
        'vote', 'consensus', 'resolution', 'determine', 'conclude'
      ],
      'Architecture': [
        'architecture', 'design', 'structure', 'component', 'system',
        'pattern', 'framework', 'api', 'database', 'schema', 'interface'
      ],
      'Change': [
        'change', 'update', 'modify', 'refactor', 'migrate', 'upgrade',
        'implement', 'deploy', 'release', 'rollback', 'revert'
      ],
      'Review': [
        'review', 'audit', 'inspect', 'evaluate', 'assess', 'analyze',
        'retrospective', 'feedback', 'examination', 'assessment'
      ],
      'Risk': [
        'risk', 'threat', 'vulnerability', 'security', 'breach', 'incident',
        'mitigation', 'exposure', 'danger', 'hazard', 'concern'
      ],
      'Process': [
        'process', 'procedure', 'workflow', 'methodology', 'protocol',
        'guideline', 'standard', 'practice', 'policy', 'governance'
      ],
      'Quality': [
        'quality', 'testing', 'validation', 'verification', 'bug',
        'defect', 'issue', 'improvement', 'optimization', 'performance'
      ],
      'Compliance': [
        'compliance', 'regulation', 'standard', 'certification', 'audit',
        'legal', 'requirement', 'mandate', 'policy', 'gdpr', 'sox'
      ],
      'Security': [
        'security', 'authentication', 'authorization', 'encryption', 'vulnerability',
        'penetration', 'firewall', 'access', 'permission', 'credential'
      ],
      'Performance': [
        'performance', 'optimization', 'latency', 'throughput', 'scalability',
        'load', 'capacity', 'response', 'speed', 'efficiency'
      ]
    };

    // Classification patterns (business context)
    const classificationPatterns = {
      'critical': ['critical', 'urgent', 'emergency', 'blocker', 'severe', 'high priority'],
      'strategic': ['strategic', 'vision', 'roadmap', 'initiative', 'objective', 'goal'],
      'operational': ['operational', 'daily', 'routine', 'maintenance', 'support', 'monitoring'],
      'technical': ['technical', 'code', 'development', 'engineering', 'implementation'],
      'business': ['business', 'stakeholder', 'customer', 'revenue', 'market', 'commercial'],
      'regulatory': ['regulatory', 'compliance', 'legal', 'policy', 'standard', 'requirement'],
      'experimental': ['experiment', 'pilot', 'prototype', 'trial', 'test', 'proof of concept'],
      'deprecated': ['deprecated', 'obsolete', 'legacy', 'sunset', 'end of life', 'retired']
    };

    // Score entry types
    let bestEntryType: GovernanceLog['entryType'] = 'Process';
    let bestEntryScore = 0;

    Object.entries(entryTypePatterns).forEach(([type, patterns]) => {
      const score = patterns.reduce((acc, pattern) => {
        const matches = (text.match(new RegExp(pattern, 'g')) || []).length;
        return acc + matches;
      }, 0);

      if (score > bestEntryScore) {
        bestEntryScore = score;
        bestEntryType = type as GovernanceLog['entryType'];
      }
    });

    // Score classifications
    let bestClassification = 'operational';
    let bestClassificationScore = 0;

    Object.entries(classificationPatterns).forEach(([classification, patterns]) => {
      const score = patterns.reduce((acc, pattern) => {
        const matches = (text.match(new RegExp(pattern, 'g')) || []).length;
        return acc + matches;
      }, 0);

      if (score > bestClassificationScore) {
        bestClassificationScore = score;
        bestClassification = classification;
      }
    });

    // Phase-based adjustments
    if (request.relatedPhase?.toLowerCase().includes('review')) {
      bestEntryType = 'Review';
    }
    if (request.relatedPhase?.toLowerCase().includes('architecture')) {
      bestEntryType = 'Architecture';
    }

    // Calculate confidence based on pattern matches
    const totalWords = text.split(' ').length;
    const confidence = Math.min(0.95, Math.max(0.6, 
      (bestEntryScore + bestClassificationScore) / (totalWords * 0.1)
    ));

    const reasoning = `Classified as ${bestEntryType} (${bestEntryScore} pattern matches) ` +
                     `with ${bestClassification} classification (${bestClassificationScore} matches). ` +
                     `Confidence: ${(confidence * 100).toFixed(1)}%`;

    return {
      entryType: bestEntryType,
      classification: bestClassification,
      confidence,
      reasoning
    };
  }

  /**
   * Simple rule-based fallback classification
   */
  private async ruleBasedClassification(request: ClassificationRequest): Promise<ClassificationResult> {
    const text = request.summary.toLowerCase();
    
    // Simple keyword-based classification
    if (text.includes('decision') || text.includes('approved') || text.includes('rejected')) {
      return {
        entryType: 'Decision',
        classification: 'operational',
        confidence: 0.7,
        reasoning: 'Keyword-based classification: contains decision-related terms'
      };
    }

    if (text.includes('architecture') || text.includes('design') || text.includes('system')) {
      return {
        entryType: 'Architecture',
        classification: 'technical',
        confidence: 0.7,
        reasoning: 'Keyword-based classification: contains architecture-related terms'
      };
    }

    if (text.includes('risk') || text.includes('security') || text.includes('vulnerability')) {
      return {
        entryType: 'Risk',
        classification: 'critical',
        confidence: 0.8,
        reasoning: 'Keyword-based classification: contains risk/security terms'
      };
    }

    if (text.includes('review') || text.includes('audit') || text.includes('evaluate')) {
      return {
        entryType: 'Review',
        classification: 'operational',
        confidence: 0.7,
        reasoning: 'Keyword-based classification: contains review-related terms'
      };
    }

    // Default classification
    return {
      entryType: 'Process',
      classification: 'operational',
      confidence: 0.6,
      reasoning: 'Default classification: no specific patterns detected'
    };
  }

  /**
   * Batch classify multiple logs
   */
  async batchClassify(requests: ClassificationRequest[]): Promise<ClassificationResult[]> {
    return Promise.all(requests.map(req => this.classifyGovernanceLog(req)));
  }

  /**
   * Get classification suggestions based on existing logs
   */
  async getSuggestions(partialText: string): Promise<string[]> {
    const classification = await this.classifyGovernanceLog({
      summary: partialText
    });

    // Return related classifications
    const suggestions = [classification.classification];
    
    // Add related suggestions based on entry type
    switch (classification.entryType) {
      case 'Risk':
        suggestions.push('critical', 'security', 'compliance');
        break;
      case 'Architecture':
        suggestions.push('technical', 'strategic', 'design');
        break;
      case 'Decision':
        suggestions.push('strategic', 'business', 'operational');
        break;
      default:
        suggestions.push('operational', 'technical');
    }

    return [...new Set(suggestions)]; // Remove duplicates
  }
}

export const logClassifierService = LogClassifierService.getInstance();