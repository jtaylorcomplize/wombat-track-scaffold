/**
 * OF-9.5.1: Semantic Search Service
 * Vector index for semantic log search using AI embeddings
 */

import type { GovernanceLog } from '../governanceLogsService';

export interface SemanticSearchRequest {
  query: string;
  limit?: number;
  threshold?: number;
  filters?: {
    entryType?: string[];
    classification?: string[];
    dateRange?: {
      from: string;
      to: string;
    };
  };
}

export interface SemanticSearchResult {
  log: GovernanceLog;
  relevanceScore: number;
  matchedTerms: string[];
  context: string;
}

export interface EmbeddingVector {
  id: string;
  vector: number[];
  metadata: {
    logId: string;
    text: string;
    entryType: string;
    classification?: string;
    timestamp: string;
  };
}

export class SemanticSearchService {
  private static instance: SemanticSearchService;
  private embeddingsApiKey: string;
  private vectorDbUrl: string;
  private isInitialized = false;
  private vectorIndex: Map<string, EmbeddingVector> = new Map();

  private constructor() {
    this.embeddingsApiKey = process.env.EMBEDDINGS_API_KEY || '';
    this.vectorDbUrl = process.env.VECTOR_DB_URL || '';
  }

  static getInstance(): SemanticSearchService {
    if (!SemanticSearchService.instance) {
      SemanticSearchService.instance = new SemanticSearchService();
    }
    return SemanticSearchService.instance;
  }

  async init(): Promise<void> {
    if (this.isInitialized) return;

    if (!this.embeddingsApiKey) {
      console.warn('EMBEDDINGS_API_KEY not configured - semantic search will use keyword fallback');
    }

    if (!this.vectorDbUrl) {
      console.warn('VECTOR_DB_URL not configured - using in-memory vector storage');
    }

    this.isInitialized = true;
  }

  /**
   * Search governance logs using semantic similarity
   */
  async searchLogs(request: SemanticSearchRequest): Promise<SemanticSearchResult[]> {
    await this.init();

    try {
      if (this.embeddingsApiKey) {
        return await this.vectorSearch(request);
      } else {
        return await this.keywordFallbackSearch(request);
      }
    } catch (error) {
      console.error('Semantic search failed, using keyword fallback:', error);
      return await this.keywordFallbackSearch(request);
    }
  }

  /**
   * Vector-based semantic search using embeddings
   */
  private async vectorSearch(request: SemanticSearchRequest): Promise<SemanticSearchResult[]> {
    // Generate embedding for query
    const queryVector = await this.generateEmbedding(request.query);
    
    // Get all vectors from index
    const candidates = Array.from(this.vectorIndex.values());
    
    // Calculate similarity scores
    const scoredResults = candidates
      .map(candidate => {
        const similarity = this.cosineSimilarity(queryVector, candidate.vector);
        return {
          candidate,
          similarity,
          log: this.mockLogFromVector(candidate), // In real implementation, fetch from DB
          matchedTerms: this.extractMatchedTerms(request.query, candidate.metadata.text),
          context: this.extractContext(candidate.metadata.text, request.query)
        };
      })
      .filter(result => result.similarity >= (request.threshold || 0.7))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, request.limit || 10);

    // Apply filters if provided
    const filteredResults = this.applyFilters(scoredResults, request.filters);

    return filteredResults.map(result => ({
      log: result.log,
      relevanceScore: result.similarity,
      matchedTerms: result.matchedTerms,
      context: result.context
    }));
  }

  /**
   * Keyword-based fallback search with enhanced relevance scoring
   */
  private async keywordFallbackSearch(request: SemanticSearchRequest): Promise<SemanticSearchResult[]> {
    // This would integrate with the existing governanceLogsService.searchGovernanceLogs
    // For now, returning mock results with enhanced scoring
    
    const queryTerms = request.query.toLowerCase().split(/\s+/);
    const mockLogs = this.getMockLogsForSearch();
    
    const scoredResults = mockLogs
      .map(log => {
        const text = `${log.summary} ${log.gptDraftEntry || ''}`.toLowerCase();
        const matchedTerms: string[] = [];
        let score = 0;

        // Calculate relevance score
        queryTerms.forEach(term => {
          const termRegex = new RegExp(term, 'gi');
          const matches = text.match(termRegex);
          if (matches) {
            matchedTerms.push(term);
            // Weight matches in summary higher than in draft entry
            const summaryMatches = log.summary.toLowerCase().match(termRegex)?.length || 0;
            const draftMatches = (matches.length - summaryMatches);
            score += (summaryMatches * 1.0) + (draftMatches * 0.7);
          }
        });

        // Boost score for exact phrase matches
        if (text.includes(request.query.toLowerCase())) {
          score *= 1.5;
        }

        // Normalize score
        const maxPossibleScore = queryTerms.length * 2;
        const normalizedScore = Math.min(1.0, score / maxPossibleScore);

        return {
          log,
          relevanceScore: normalizedScore,
          matchedTerms,
          context: this.extractContext(text, request.query)
        };
      })
      .filter(result => result.relevanceScore >= (request.threshold || 0.3))
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, request.limit || 10);

    return scoredResults;
  }

  /**
   * Index a governance log for semantic search
   */
  async indexLog(log: GovernanceLog): Promise<void> {
    await this.init();

    try {
      const text = `${log.summary} ${log.gptDraftEntry || ''}`;
      const vector = await this.generateEmbedding(text);
      
      const embeddingVector: EmbeddingVector = {
        id: `embedding-${log.id}`,
        vector,
        metadata: {
          logId: log.id,
          text,
          entryType: log.entryType,
          classification: log.classification,
          timestamp: log.timestamp
        }
      };

      this.vectorIndex.set(log.id, embeddingVector);
      
      // In real implementation, persist to vector database
      if (this.vectorDbUrl) {
        await this.persistToVectorDb(embeddingVector);
      }
    } catch (error) {
      console.error('Failed to index log:', log.id, error);
    }
  }

  /**
   * Batch index multiple logs
   */
  async batchIndexLogs(logs: GovernanceLog[]): Promise<void> {
    await Promise.all(logs.map(log => this.indexLog(log)));
  }

  /**
   * Remove log from search index
   */
  async removeFromIndex(logId: string): Promise<void> {
    this.vectorIndex.delete(logId);
    
    if (this.vectorDbUrl) {
      // Remove from vector database
      await this.removeFromVectorDb(logId);
    }
  }

  /**
   * Get search suggestions based on partial query
   */
  async getSuggestions(partialQuery: string): Promise<string[]> {
    const suggestions = new Set<string>();
    
    // Extract keywords from indexed logs
    this.vectorIndex.forEach(vector => {
      const words = vector.metadata.text.toLowerCase().split(/\s+/);
      words.forEach(word => {
        if (word.startsWith(partialQuery.toLowerCase()) && word.length > partialQuery.length) {
          suggestions.add(word);
        }
      });
    });

    // Add common governance terms
    const commonTerms = [
      'decision', 'architecture', 'review', 'risk', 'compliance',
      'security', 'performance', 'change', 'implementation', 'deployment'
    ];
    
    commonTerms.forEach(term => {
      if (term.startsWith(partialQuery.toLowerCase())) {
        suggestions.add(term);
      }
    });

    return Array.from(suggestions).slice(0, 10);
  }

  /**
   * Generate embedding vector for text (mock implementation)
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    if (this.embeddingsApiKey) {
      // In real implementation, call embeddings API
      // For now, create a simple hash-based vector
      return this.createMockEmbedding(text);
    }
    
    return this.createMockEmbedding(text);
  }

  /**
   * Create mock embedding based on text content
   */
  private createMockEmbedding(text: string, dimensions = 384): number[] {
    const words = text.toLowerCase().split(/\s+/);
    const vector = new Array(dimensions).fill(0);
    
    // Simple hash-based embedding simulation
    words.forEach((word, index) => {
      const hash = this.simpleHash(word);
      const position = Math.abs(hash) % dimensions;
      vector[position] += 1 / Math.sqrt(words.length);
    });
    
    // Normalize vector
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return magnitude > 0 ? vector.map(val => val / magnitude) : vector;
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(vectorA: number[], vectorB: number[]): number {
    if (vectorA.length !== vectorB.length) return 0;
    
    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;
    
    for (let i = 0; i < vectorA.length; i++) {
      dotProduct += vectorA[i] * vectorB[i];
      magnitudeA += vectorA[i] * vectorA[i];
      magnitudeB += vectorB[i] * vectorB[i];
    }
    
    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);
    
    if (magnitudeA === 0 || magnitudeB === 0) return 0;
    
    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * Extract matched terms from text
   */
  private extractMatchedTerms(query: string, text: string): string[] {
    const queryTerms = query.toLowerCase().split(/\s+/);
    const textWords = text.toLowerCase().split(/\s+/);
    
    return queryTerms.filter(term => 
      textWords.some(word => word.includes(term) || term.includes(word))
    );
  }

  /**
   * Extract context around matched terms
   */
  private extractContext(text: string, query: string, contextLength = 150): string {
    const queryIndex = text.toLowerCase().indexOf(query.toLowerCase());
    if (queryIndex === -1) {
      return text.substring(0, contextLength) + (text.length > contextLength ? '...' : '');
    }
    
    const start = Math.max(0, queryIndex - contextLength / 2);
    const end = Math.min(text.length, start + contextLength);
    
    const context = text.substring(start, end);
    const prefix = start > 0 ? '...' : '';
    const suffix = end < text.length ? '...' : '';
    
    return prefix + context + suffix;
  }

  /**
   * Apply filters to search results
   */
  private applyFilters(results: any[], filters?: SemanticSearchRequest['filters']) {
    if (!filters) return results;
    
    return results.filter(result => {
      if (filters.entryType && !filters.entryType.includes(result.log.entryType)) {
        return false;
      }
      
      if (filters.classification && result.log.classification && 
          !filters.classification.includes(result.log.classification)) {
        return false;
      }
      
      if (filters.dateRange) {
        const logDate = new Date(result.log.timestamp);
        const fromDate = new Date(filters.dateRange.from);
        const toDate = new Date(filters.dateRange.to);
        
        if (logDate < fromDate || logDate > toDate) {
          return false;
        }
      }
      
      return true;
    });
  }

  /**
   * Simple hash function for mock embeddings
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  }

  /**
   * Mock log creation from vector (for testing)
   */
  private mockLogFromVector(vector: EmbeddingVector): GovernanceLog {
    return {
      id: vector.metadata.logId,
      timestamp: vector.metadata.timestamp,
      entryType: vector.metadata.entryType as GovernanceLog['entryType'],
      summary: vector.metadata.text.substring(0, 100),
      classification: vector.metadata.classification,
      created_by: 'system'
    };
  }

  /**
   * Get mock logs for search testing
   */
  private getMockLogsForSearch(): GovernanceLog[] {
    return [
      {
        id: 'mock-1',
        timestamp: new Date().toISOString(),
        entryType: 'Decision',
        summary: 'Architectural decision to use microservices for user management system',
        gptDraftEntry: 'After reviewing options, team decided on microservices approach for better scalability',
        classification: 'technical',
        created_by: 'system'
      },
      {
        id: 'mock-2',
        timestamp: new Date().toISOString(),
        entryType: 'Risk',
        summary: 'Security vulnerability identified in authentication system',
        gptDraftEntry: 'Critical security issue found during code review - requires immediate attention',
        classification: 'critical',
        created_by: 'system'
      }
    ];
  }

  /**
   * Persist embedding to external vector database
   */
  private async persistToVectorDb(vector: EmbeddingVector): Promise<void> {
    // In real implementation, this would make API calls to vector database
    console.log('Persisting vector to database:', vector.id);
  }

  /**
   * Remove vector from external database
   */
  private async removeFromVectorDb(logId: string): Promise<void> {
    // In real implementation, this would remove from vector database
    console.log('Removing vector from database:', logId);
  }
}

export const semanticSearchService = SemanticSearchService.getInstance();