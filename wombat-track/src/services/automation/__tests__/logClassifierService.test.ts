/**
 * Unit Tests for Log Classifier Service
 * OF-9.5.1: Auto-classifier testing
 */

import { LogClassifierService } from '../logClassifierService';
import type { ClassificationRequest } from '../logClassifierService';

describe('LogClassifierService', () => {
  let classifierService: LogClassifierService;

  beforeEach(() => {
    classifierService = LogClassifierService.getInstance();
  });

  describe('Pattern-based Classification', () => {
    it('should classify decision-related logs correctly', async () => {
      const request: ClassificationRequest = {
        summary: 'Team decided to approve the new microservices architecture proposal',
        gptDraftEntry: 'After extensive review, we have reached a consensus to proceed with the recommended approach'
      };

      const result = await classifierService.classifyGovernanceLog(request);

      expect(result.entryType).toBe('Decision');
      expect(result.classification).toBe('strategic');
      expect(result.confidence).toBeGreaterThan(0.6);
      expect(result.reasoning).toContain('Decision');
    });

    it('should classify architecture-related logs correctly', async () => {
      const request: ClassificationRequest = {
        summary: 'System architecture review for the new API gateway implementation',
        gptDraftEntry: 'Updated the database schema and component interfaces for better performance'
      };

      const result = await classifierService.classifyGovernanceLog(request);

      expect(result.entryType).toBe('Architecture');
      expect(result.classification).toBe('technical');
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    it('should classify risk-related logs with high confidence', async () => {
      const request: ClassificationRequest = {
        summary: 'Critical security vulnerability discovered in authentication system',
        gptDraftEntry: 'Immediate threat assessment required for potential breach mitigation'
      };

      const result = await classifierService.classifyGovernanceLog(request);

      expect(result.entryType).toBe('Risk');
      expect(result.classification).toBe('critical');
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should classify review-related logs correctly', async () => {
      const request: ClassificationRequest = {
        summary: 'Code review completed for the payment processing module',
        gptDraftEntry: 'Audit findings show compliance with security standards'
      };

      const result = await classifierService.classifyGovernanceLog(request);

      expect(result.entryType).toBe('Review');
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    it('should adjust classification based on related phase', async () => {
      const request: ClassificationRequest = {
        summary: 'Updated project documentation',
        relatedPhase: 'Architecture-Review-Phase'
      };

      const result = await classifierService.classifyGovernanceLog(request);

      expect(result.entryType).toBe('Review');
    });
  });

  describe('Confidence Scoring', () => {
    it('should return confidence between 0.6 and 0.95', async () => {
      const request: ClassificationRequest = {
        summary: 'Standard operational update for system maintenance'
      };

      const result = await classifierService.classifyGovernanceLog(request);

      expect(result.confidence).toBeGreaterThanOrEqual(0.6);
      expect(result.confidence).toBeLessThanOrEqual(0.95);
    });

    it('should return higher confidence for clear patterns', async () => {
      const request: ClassificationRequest = {
        summary: 'Emergency security breach response - critical vulnerability patch deployed',
        gptDraftEntry: 'Urgent mitigation required for high-severity threat detected in production'
      };

      const result = await classifierService.classifyGovernanceLog(request);

      expect(result.confidence).toBeGreaterThan(0.8);
      expect(result.classification).toBe('critical');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty content gracefully', async () => {
      const request: ClassificationRequest = {
        summary: ''
      };

      const result = await classifierService.classifyGovernanceLog(request);

      expect(result.entryType).toBe('Process');
      expect(result.classification).toBe('operational');
      expect(result.confidence).toBe(0.6);
    });

    it('should handle mixed content types', async () => {
      const request: ClassificationRequest = {
        summary: 'Decision to review architecture changes for security compliance',
        gptDraftEntry: 'Performance optimization while maintaining regulatory requirements'
      };

      const result = await classifierService.classifyGovernanceLog(request);

      // Should pick the strongest signal (Decision in this case)
      expect(['Decision', 'Review', 'Architecture']).toContain(result.entryType);
      expect(result.confidence).toBeGreaterThan(0.6);
    });
  });

  describe('Batch Processing', () => {
    it('should handle multiple classifications efficiently', async () => {
      const requests: ClassificationRequest[] = [
        { summary: 'Architecture design for new service' },
        { summary: 'Security audit completed successfully' },
        { summary: 'Performance optimization decision approved' }
      ];

      const results = await classifierService.batchClassify(requests);

      expect(results).toHaveLength(3);
      expect(results[0].entryType).toBe('Architecture');
      expect(results[1].entryType).toBe('Review');
      expect(results[2].entryType).toBe('Decision');
    });
  });

  describe('Suggestion Engine', () => {
    it('should provide relevant classification suggestions', async () => {
      const suggestions = await classifierService.getSuggestions('security vulnerability');

      expect(suggestions).toContain('critical');
      expect(suggestions).toContain('security');
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it('should provide different suggestions based on entry type', async () => {
      const architectureSuggestions = await classifierService.getSuggestions('system design patterns');
      const riskSuggestions = await classifierService.getSuggestions('security threat analysis');

      expect(architectureSuggestions).toContain('technical');
      expect(riskSuggestions).toContain('critical');
      expect(architectureSuggestions).not.toEqual(riskSuggestions);
    });
  });

  describe('Classification Categories', () => {
    it('should classify business-focused content correctly', async () => {
      const request: ClassificationRequest = {
        summary: 'Stakeholder meeting to discuss revenue impact and market strategy'
      };

      const result = await classifierService.classifyGovernanceLog(request);
      
      expect(['business', 'strategic']).toContain(result.classification);
    });

    it('should classify regulatory content correctly', async () => {
      const request: ClassificationRequest = {
        summary: 'GDPR compliance audit and policy updates for data protection'
      };

      const result = await classifierService.classifyGovernanceLog(request);
      
      expect(['regulatory', 'compliance']).toContain(result.classification);
    });

    it('should classify experimental content correctly', async () => {
      const request: ClassificationRequest = {
        summary: 'Proof of concept testing for new AI integration prototype'
      };

      const result = await classifierService.classifyGovernanceLog(request);
      
      expect(['experimental', 'technical']).toContain(result.classification);
    });
  });

  describe('Reasoning Quality', () => {
    it('should provide meaningful reasoning for classifications', async () => {
      const request: ClassificationRequest = {
        summary: 'Architecture review resulted in approval of microservices migration'
      };

      const result = await classifierService.classifyGovernanceLog(request);

      expect(result.reasoning).toContain('pattern matches');
      expect(result.reasoning).toContain('Confidence');
      expect(result.reasoning.length).toBeGreaterThan(20);
    });

    it('should explain confidence scores in reasoning', async () => {
      const request: ClassificationRequest = {
        summary: 'Critical security vulnerability requires immediate attention'
      };

      const result = await classifierService.classifyGovernanceLog(request);

      expect(result.reasoning).toMatch(/\d+(\.\d+)?%/); // Contains percentage
      expect(result.reasoning).toContain('confidence');
    });
  });
});