/**
 * Unit Tests for Semantic Search Service
 * OF-9.5.1: Semantic search testing
 */

import { SemanticSearchService } from '../semanticSearchService';
import type { SemanticSearchRequest, GovernanceLog } from '../semanticSearchService';

// Mock governance logs for testing
const mockLogs: any[] = [
  {
    id: 'test-1',
    timestamp: '2025-08-08T12:00:00Z',
    entryType: 'Architecture',
    summary: 'Microservices architecture decision for user management system',
    gptDraftEntry: 'Team decided to implement microservices pattern for better scalability and maintainability',
    classification: 'technical',
    created_by: 'architect'
  },
  {
    id: 'test-2', 
    timestamp: '2025-08-08T11:00:00Z',
    entryType: 'Risk',
    summary: 'Security vulnerability discovered in authentication module',
    gptDraftEntry: 'Critical security issue requires immediate attention and patching',
    classification: 'critical',
    created_by: 'security-team'
  },
  {
    id: 'test-3',
    timestamp: '2025-08-08T10:00:00Z',
    entryType: 'Review',
    summary: 'Code review completed for payment processing system',
    gptDraftEntry: 'All security requirements met, performance benchmarks exceeded',
    classification: 'operational',
    created_by: 'reviewer'
  }
];

describe('SemanticSearchService', () => {
  let searchService: SemanticSearchService;

  beforeEach(() => {
    searchService = SemanticSearchService.getInstance();
    // Pre-populate with mock logs
    mockLogs.forEach(log => {
      searchService.indexLog(log as any);
    });
  });

  describe('Vector Search', () => {
    it('should find relevant logs using semantic similarity', async () => {
      const request: SemanticSearchRequest = {
        query: 'security issues',
        limit: 5,
        threshold: 0.3
      };

      const results = await searchService.searchLogs(request);

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].log.id).toBeDefined();
      expect(results[0].relevanceScore).toBeGreaterThanOrEqual(0.3);
    });

    it('should return results sorted by relevance score', async () => {
      const request: SemanticSearchRequest = {
        query: 'architecture system design',
        limit: 10,
        threshold: 0.2
      };

      const results = await searchService.searchLogs(request);

      for (let i = 1; i < results.length; i++) {
        expect(results[i-1].relevanceScore).toBeGreaterThanOrEqualTo(results[i].relevanceScore);
      }
    });

    it('should respect threshold filtering', async () => {
      const request: SemanticSearchRequest = {
        query: 'random unrelated content xyz',
        limit: 10,
        threshold: 0.8
      };

      const results = await searchService.searchLogs(request);

      results.forEach(result => {
        expect(result.relevanceScore).toBeGreaterThanOrEqual(0.8);
      });
    });

    it('should respect result limits', async () => {
      const request: SemanticSearchRequest = {
        query: 'system',
        limit: 2,
        threshold: 0.1
      };

      const results = await searchService.searchLogs(request);

      expect(results.length).toBeLessThanOrEqual(2);
    });
  });

  describe('Keyword Fallback Search', () => {
    it('should fall back to keyword search when needed', async () => {
      const request: SemanticSearchRequest = {
        query: 'microservices',
        limit: 5,
        threshold: 0.3
      };

      const results = await searchService.searchLogs(request);

      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.log.summary.toLowerCase().includes('microservices'))).toBe(true);
    });

    it('should boost exact phrase matches', async () => {
      const request: SemanticSearchRequest = {
        query: 'security vulnerability',
        limit: 10,
        threshold: 0.3
      };

      const results = await searchService.searchLogs(request);

      // Should find the log with exact phrase match
      const exactMatch = results.find(r => 
        r.log.summary.toLowerCase().includes('security vulnerability')
      );
      
      if (exactMatch) {
        expect(exactMatch.relevanceScore).toBeGreaterThan(0.5);
      }
    });
  });

  describe('Context Extraction', () => {
    it('should provide context snippets around matches', async () => {
      const request: SemanticSearchRequest = {
        query: 'architecture',
        limit: 5
      };

      const results = await searchService.searchLogs(request);

      results.forEach(result => {
        expect(result.context).toBeDefined();
        expect(typeof result.context).toBe('string');
        expect(result.context.length).toBeLessThanOrEqual(153); // 150 + ellipsis
      });
    });

    it('should extract matched terms correctly', async () => {
      const request: SemanticSearchRequest = {
        query: 'security system',
        limit: 5
      };

      const results = await searchService.searchLogs(request);

      results.forEach(result => {
        expect(Array.isArray(result.matchedTerms)).toBe(true);
        if (result.matchedTerms.length > 0) {
          result.matchedTerms.forEach(term => {
            expect(typeof term).toBe('string');
            expect(term.length).toBeGreaterThan(0);
          });
        }
      });
    });
  });

  describe('Filtering', () => {
    it('should filter by entry type', async () => {
      const request: SemanticSearchRequest = {
        query: 'system',
        filters: {
          entryType: ['Architecture']
        }
      };

      const results = await searchService.searchLogs(request);

      results.forEach(result => {
        expect(result.log.entryType).toBe('Architecture');
      });
    });

    it('should filter by classification', async () => {
      const request: SemanticSearchRequest = {
        query: 'issue',
        filters: {
          classification: ['critical']
        }
      };

      const results = await searchService.searchLogs(request);

      results.forEach(result => {
        expect(result.log.classification).toBe('critical');
      });
    });

    it('should filter by date range', async () => {
      const request: SemanticSearchRequest = {
        query: 'system',
        filters: {
          dateRange: {
            from: '2025-08-08T10:30:00Z',
            to: '2025-08-08T12:30:00Z'
          }
        }
      };

      const results = await searchService.searchLogs(request);

      results.forEach(result => {
        const logDate = new Date(result.log.timestamp);
        expect(logDate.getTime()).toBeGreaterThanOrEqual(new Date('2025-08-08T10:30:00Z').getTime());
        expect(logDate.getTime()).toBeLessThanOrEqual(new Date('2025-08-08T12:30:00Z').getTime());
      });
    });

    it('should apply multiple filters simultaneously', async () => {
      const request: SemanticSearchRequest = {
        query: 'system',
        filters: {
          entryType: ['Risk', 'Review'],
          classification: ['critical', 'operational']
        }
      };

      const results = await searchService.searchLogs(request);

      results.forEach(result => {
        expect(['Risk', 'Review']).toContain(result.log.entryType);
        expect(['critical', 'operational']).toContain(result.log.classification);
      });
    });
  });

  describe('Log Indexing', () => {
    it('should index new logs for search', async () => {
      const newLog: any = {
        id: 'new-test-log',
        timestamp: '2025-08-08T13:00:00Z',
        entryType: 'Decision',
        summary: 'Database migration strategy approved',
        classification: 'strategic',
        created_by: 'dba-team'
      };

      await searchService.indexLog(newLog);

      const request: SemanticSearchRequest = {
        query: 'database migration',
        limit: 10,
        threshold: 0.3
      };

      const results = await searchService.searchLogs(request);
      const found = results.find(r => r.log.id === 'new-test-log');
      
      expect(found).toBeDefined();
    });

    it('should handle batch indexing', async () => {
      const newLogs: any[] = [
        {
          id: 'batch-1',
          timestamp: '2025-08-08T14:00:00Z',
          entryType: 'Process',
          summary: 'Deployment pipeline updated',
          classification: 'operational',
          created_by: 'devops'
        },
        {
          id: 'batch-2',
          timestamp: '2025-08-08T14:15:00Z',
          entryType: 'Quality',
          summary: 'Testing framework enhanced',
          classification: 'technical',
          created_by: 'qa-team'
        }
      ];

      await searchService.batchIndexLogs(newLogs);

      const request: SemanticSearchRequest = {
        query: 'pipeline testing',
        limit: 10,
        threshold: 0.2
      };

      const results = await searchService.searchLogs(request);
      
      expect(results.some(r => r.log.id === 'batch-1')).toBe(true);
      expect(results.some(r => r.log.id === 'batch-2')).toBe(true);
    });

    it('should remove logs from index', async () => {
      await searchService.removeFromIndex('test-1');

      const request: SemanticSearchRequest = {
        query: 'microservices architecture',
        limit: 10,
        threshold: 0.1
      };

      const results = await searchService.searchLogs(request);
      
      expect(results.find(r => r.log.id === 'test-1')).toBeUndefined();
    });
  });

  describe('Suggestion Engine', () => {
    it('should provide search suggestions', async () => {
      const suggestions = await searchService.getSuggestions('arch');

      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBeLessThanOrEqual(10);
      expect(suggestions.some(s => s.startsWith('arch'))).toBe(true);
    });

    it('should include common governance terms in suggestions', async () => {
      const suggestions = await searchService.getSuggestions('dec');

      expect(suggestions).toContain('decision');
    });

    it('should limit suggestion count', async () => {
      const suggestions = await searchService.getSuggestions('');

      expect(suggestions.length).toBeLessThanOrEqual(10);
    });
  });

  describe('Vector Operations', () => {
    it('should create consistent embeddings for same text', async () => {
      const text = 'test architecture decision';
      
      // Create embeddings multiple times
      const embedding1 = (searchService as any).createMockEmbedding(text);
      const embedding2 = (searchService as any).createMockEmbedding(text);

      expect(embedding1).toEqual(embedding2);
      expect(embedding1.length).toBe(384); // Default dimension
    });

    it('should calculate cosine similarity correctly', async () => {
      const vectorA = [1, 0, 0];
      const vectorB = [1, 0, 0];
      const vectorC = [0, 1, 0];

      const similarityAB = (searchService as any).cosineSimilarity(vectorA, vectorB);
      const similarityAC = (searchService as any).cosineSimilarity(vectorA, vectorC);

      expect(similarityAB).toBe(1); // Identical vectors
      expect(similarityAC).toBe(0); // Orthogonal vectors
    });

    it('should handle zero vectors gracefully', async () => {
      const vectorA = [1, 1, 1];
      const vectorZero = [0, 0, 0];

      const similarity = (searchService as any).cosineSimilarity(vectorA, vectorZero);
      
      expect(similarity).toBe(0);
    });
  });

  describe('Performance', () => {
    it('should complete search within reasonable time', async () => {
      const startTime = Date.now();
      
      const request: SemanticSearchRequest = {
        query: 'performance optimization system architecture',
        limit: 50,
        threshold: 0.1
      };

      await searchService.searchLogs(request);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle large result sets efficiently', async () => {
      const request: SemanticSearchRequest = {
        query: 'system',
        limit: 1000,
        threshold: 0.01
      };

      const results = await searchService.searchLogs(request);
      
      expect(results.length).toBeLessThanOrEqual(1000);
      expect(Array.isArray(results)).toBe(true);
    });
  });
});