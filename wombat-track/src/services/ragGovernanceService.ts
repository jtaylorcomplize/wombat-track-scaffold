/**
 * RAG Governance & Memory Integration Service - OF-8.8.2
 * Enables RAG queries across GovernanceLog + DriveMemory with intelligent context retrieval
 */

import { getAzureOpenAIService } from './azureOpenAIService';
import { enhancedGovernanceLogger } from './enhancedGovernanceLogger';
import { visionLayerAgentFramework } from './visionLayerAgent';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface RAGQuery {
  id: string;
  query: string;
  context: {
    projectId?: string;
    phaseId?: string;
    timeRange?: { start: string; end: string };
    scope: 'governance' | 'memory' | 'combined' | 'agents';
    priority: 'low' | 'medium' | 'high';
  };
  timestamp: string;
}

export interface RAGResult {
  queryId: string;
  answer: string;
  confidence: number;
  sources: RAGSource[];
  context: {
    governanceEntries: number;
    memoryAnchors: number;
    agentInsights: number;
    relevanceScore: number;
  };
  recommendations: string[];
  relatedQueries: string[];
}

export interface RAGSource {
  type: 'governance_log' | 'memory_anchor' | 'drive_memory' | 'agent_insight';
  id: string;
  path: string;
  relevance: number;
  excerpt: string;
  metadata: Record<string, unknown>;
}

export interface MemoryAnchor {
  anchorId: string;
  phaseId: string;
  projectId: string;
  description: string;
  status: string;
  linkedDrivePath: string;
  createdAt: string;
  content?: Record<string, unknown>;
}

export interface GovernanceEntry {
  timestamp: string;
  entryType: string;
  phaseId: string;
  projectId: string;
  memoryAnchor: string;
  summary: string;
  details: Record<string, unknown>;
}

class RAGGovernanceService {
  private azureService = getAzureOpenAIService();
  private governanceCache = new Map<string, GovernanceEntry[]>();
  private memoryCache = new Map<string, MemoryAnchor[]>();
  private embeddings = new Map<string, number[]>();
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log('🧠 Initializing RAG Governance Service...');
    
    // Load and index governance logs
    await this.loadGovernanceLogs();
    
    // Load and index memory anchors
    await this.loadMemoryAnchors();
    
    // Create embeddings for semantic search
    await this.createEmbeddings();
    
    this.initialized = true;
    
    enhancedGovernanceLogger.createPhaseAnchor('rag-governance-initialized', 'init');
    console.log('✅ RAG Governance Service initialized');
  }

  private async loadGovernanceLogs(): Promise<void> {
    try {
      const governanceLogPath = path.join(process.cwd(), 'logs', 'governance.jsonl');
      const content = await fs.readFile(governanceLogPath, 'utf-8');
      
      const entries: GovernanceEntry[] = content
        .split('\n')
        .filter(line => line.trim())
        .map(line => {
          try {
            const parsed = JSON.parse(line);
            return {
              timestamp: parsed.timestamp,
              entryType: parsed.entry_type || parsed.event_type || 'unknown',
              phaseId: parsed.phase_id || 'unknown',
              projectId: parsed.project_id || 'unknown',
              memoryAnchor: parsed.memory_anchor || '',
              summary: parsed.summary || parsed.details?.phase || 'No summary',
              details: parsed
            };
          } catch (e) {
            return null;
          }
        })
        .filter(entry => entry !== null) as GovernanceEntry[];

      // Group by project
      const projectGroups = entries.reduce((acc, entry) => {
        if (!acc.has(entry.projectId)) {
          acc.set(entry.projectId, []);
        }
        acc.get(entry.projectId)!.push(entry);
        return acc;
      }, new Map<string, GovernanceEntry[]>());

      this.governanceCache = projectGroups;
      
      console.log(`📊 Loaded ${entries.length} governance entries across ${projectGroups.size} projects`);
    } catch (error: any) {
      console.warn(`⚠️ Failed to load governance logs: ${error.message}`);
      // Initialize with empty cache for development
      this.governanceCache = new Map();
    }
  }

  private async loadMemoryAnchors(): Promise<void> {
    try {
      const memoryPluginPath = path.join(process.cwd(), 'DriveMemory', 'MemoryPlugin');
      const files = await fs.readdir(memoryPluginPath);
      
      const anchors: MemoryAnchor[] = [];
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const filePath = path.join(memoryPluginPath, file);
            const content = await fs.readFile(filePath, 'utf-8');
            const parsed = JSON.parse(content);
            
            const anchor: MemoryAnchor = {
              anchorId: parsed.anchor_id || file.replace('.json', ''),
              phaseId: parsed.phase_id || 'unknown',
              projectId: parsed.project_id || 'unknown',
              description: parsed.description || 'No description',
              status: parsed.status || 'unknown',
              linkedDrivePath: parsed.linked_drive_path || '',
              createdAt: parsed.created_at || new Date().toISOString(),
              content: parsed
            };
            
            anchors.push(anchor);
          } catch (error: any) {
            console.warn(`⚠️ Failed to parse memory anchor ${file}: ${error.message}`);
          }
        }
      }

      // Group by project
      const projectGroups = anchors.reduce((acc, anchor) => {
        if (!acc.has(anchor.projectId)) {
          acc.set(anchor.projectId, []);
        }
        acc.get(anchor.projectId)!.push(anchor);
        return acc;
      }, new Map<string, MemoryAnchor[]>());

      this.memoryCache = projectGroups;
      
      console.log(`🔗 Loaded ${anchors.length} memory anchors across ${projectGroups.size} projects`);
    } catch (error: any) {
      console.warn(`⚠️ Failed to load memory anchors: ${error.message}`);
      this.memoryCache = new Map();
    }
  }

  private async createEmbeddings(): Promise<void> {
    console.log('🔍 Creating embeddings for semantic search...');
    
    try {
      // Create embeddings for governance entries
      for (const [projectId, entries] of this.governanceCache) {
        for (const entry of entries) {
          const text = `${entry.summary} ${JSON.stringify(entry.details)}`;
          const embeddings = await this.azureService.getEmbeddings({
            input: text,
            dimensions: 512
          });
          
          this.embeddings.set(`governance_${projectId}_${entry.timestamp}`, embeddings[0]);
        }
      }
      
      // Create embeddings for memory anchors
      for (const [projectId, anchors] of this.memoryCache) {
        for (const anchor of anchors) {
          const text = `${anchor.description} ${JSON.stringify(anchor.content)}`;
          const embeddings = await this.azureService.getEmbeddings({
            input: text,
            dimensions: 512
          });
          
          this.embeddings.set(`memory_${projectId}_${anchor.anchorId}`, embeddings[0]);
        }
      }
      
      console.log(`✨ Created ${this.embeddings.size} embeddings for semantic search`);
    } catch (error: any) {
      console.warn(`⚠️ Failed to create embeddings: ${error.message}`);
      // Continue without embeddings for development
    }
  }

  async queryRAG(query: RAGQuery): Promise<RAGResult> {
    const startTime = Date.now();
    console.log(`🔍 Processing RAG query: "${query.query}"`);

    try {
      // Get relevant sources based on query context and scope
      const sources = await this.findRelevantSources(query);
      
      // Get agent insights if requested
      let agentInsights: any[] = [];
      if (query.context.scope === 'agents' || query.context.scope === 'combined') {
        agentInsights = await this.getAgentInsights(query);
      }

      // Generate AI response using Azure OpenAI with context
      const answer = await this.generateRAGResponse(query, sources, agentInsights);
      
      // Calculate confidence and relevance
      const confidence = this.calculateConfidence(sources, agentInsights.length);
      const relevanceScore = this.calculateRelevanceScore(sources);
      
      // Generate recommendations
      const recommendations = await this.generateRecommendations(query, sources, agentInsights);
      
      // Generate related queries
      const relatedQueries = this.generateRelatedQueries(query, sources);

      const result: RAGResult = {
        queryId: query.id,
        answer,
        confidence,
        sources,
        context: {
          governanceEntries: sources.filter(s => s.type === 'governance_log').length,
          memoryAnchors: sources.filter(s => s.type === 'memory_anchor').length,
          agentInsights: agentInsights.length,
          relevanceScore
        },
        recommendations,
        relatedQueries
      };

      const processingTime = Date.now() - startTime;
      console.log(`✅ RAG query completed in ${processingTime}ms with confidence ${(confidence * 100).toFixed(1)}%`);

      // Log to governance
      enhancedGovernanceLogger.createPhaseAnchor(`rag-query-${query.id}`, 'query');

      return result;

    } catch (error: any) {
      console.error(`❌ RAG query failed: ${error.message}`);
      
      // Return fallback response
      return {
        queryId: query.id,
        answer: 'I apologize, but I encountered an error processing your query. Please try again or contact support.',
        confidence: 0.0,
        sources: [],
        context: {
          governanceEntries: 0,
          memoryAnchors: 0,
          agentInsights: 0,
          relevanceScore: 0.0
        },
        recommendations: ['Try rephrasing your query', 'Check system status'],
        relatedQueries: []
      };
    }
  }

  private async findRelevantSources(query: RAGQuery): Promise<RAGSource[]> {
    const sources: RAGSource[] = [];
    
    // Search governance logs
    if (query.context.scope === 'governance' || query.context.scope === 'combined') {
      const projectId = query.context.projectId;
      const entries = projectId ? 
        (this.governanceCache.get(projectId) || []) : 
        Array.from(this.governanceCache.values()).flat();

      for (const entry of entries) {
        if (this.isRelevantToQuery(query.query, entry.summary, entry.details)) {
          sources.push({
            type: 'governance_log',
            id: `${entry.projectId}_${entry.timestamp}`,
            path: 'logs/governance.jsonl',
            relevance: this.calculateTextRelevance(query.query, entry.summary),
            excerpt: entry.summary,
            metadata: {
              timestamp: entry.timestamp,
              entryType: entry.entryType,
              phaseId: entry.phaseId,
              projectId: entry.projectId
            }
          });
        }
      }
    }

    // Search memory anchors
    if (query.context.scope === 'memory' || query.context.scope === 'combined') {
      const projectId = query.context.projectId;
      const anchors = projectId ? 
        (this.memoryCache.get(projectId) || []) : 
        Array.from(this.memoryCache.values()).flat();

      for (const anchor of anchors) {
        if (this.isRelevantToQuery(query.query, anchor.description, anchor.content)) {
          sources.push({
            type: 'memory_anchor',
            id: anchor.anchorId,
            path: `DriveMemory/MemoryPlugin/${anchor.anchorId}.json`,
            relevance: this.calculateTextRelevance(query.query, anchor.description),
            excerpt: anchor.description,
            metadata: {
              phaseId: anchor.phaseId,
              projectId: anchor.projectId,
              status: anchor.status,
              linkedDrivePath: anchor.linkedDrivePath
            }
          });
        }
      }
    }

    // Sort by relevance and take top results
    return sources
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 10);
  }

  private async getAgentInsights(query: RAGQuery): Promise<any[]> {
    try {
      // Create agent task for query analysis
      const taskId = await visionLayerAgentFramework.createTask(
        'governance-auditor-001',
        'analysis',
        query.context.priority === 'high' ? 'high' : 'medium',
        {
          query: query.query,
          context: query.context,
          analysisType: 'rag_support'
        },
        {
          projectId: query.context.projectId,
          phaseId: query.context.phaseId
        }
      );

      const result = await visionLayerAgentFramework.executeTask(taskId);
      return result.success ? [result] : [];
    } catch (error) {
      console.warn('Failed to get agent insights:', error);
      return [];
    }
  }

  private async generateRAGResponse(
    query: RAGQuery, 
    sources: RAGSource[], 
    agentInsights: any[]
  ): Promise<string> {
    const contextText = this.buildContextText(sources, agentInsights);
    
    const systemPrompt = `You are an AI assistant with access to comprehensive project governance logs, memory anchors, and agent insights. 
    
Your role is to provide accurate, contextual answers based on the provided sources. Always:
1. Reference specific sources when providing information
2. Acknowledge uncertainty when sources are insufficient
3. Provide actionable insights when possible
4. Maintain professional, clear communication

Available context: ${sources.length} sources, ${agentInsights.length} agent insights`;

    const userPrompt = `Query: ${query.query}

Context from sources:
${contextText}

Please provide a comprehensive answer based on the available context. If the context is insufficient, clearly state this and suggest how to get better information.`;

    try {
      const response = await this.azureService.getChatCompletion({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        maxTokens: 1500,
        temperature: 0.3
      });

      return response;
    } catch (error: any) {
      console.warn(`Failed to generate AI response: ${error.message}`);
      return this.generateFallbackResponse(query, sources, agentInsights);
    }
  }

  private buildContextText(sources: RAGSource[], agentInsights: any[]): string {
    let context = '';
    
    // Add governance sources
    const governanceSources = sources.filter(s => s.type === 'governance_log');
    if (governanceSources.length > 0) {
      context += 'Governance Log Entries:\n';
      governanceSources.forEach((source, index) => {
        context += `${index + 1}. [${source.metadata.timestamp}] ${source.excerpt}\n`;
      });
      context += '\n';
    }

    // Add memory anchor sources
    const memorySources = sources.filter(s => s.type === 'memory_anchor');
    if (memorySources.length > 0) {
      context += 'Memory Anchors:\n';
      memorySources.forEach((source, index) => {
        context += `${index + 1}. ${source.id}: ${source.excerpt}\n`;
      });
      context += '\n';
    }

    // Add agent insights
    if (agentInsights.length > 0) {
      context += 'Agent Insights:\n';
      agentInsights.forEach((insight, index) => {
        context += `${index + 1}. ${JSON.stringify(insight.data)}\n`;
      });
    }

    return context;
  }

  private generateFallbackResponse(query: RAGQuery, sources: RAGSource[], agentInsights: any[]): string {
    if (sources.length === 0 && agentInsights.length === 0) {
      return `I don't have sufficient information in the governance logs or memory anchors to answer your query about "${query.query}". Consider checking recent project documentation or asking team members directly.`;
    }

    let response = `Based on available governance data:\n\n`;
    
    if (sources.length > 0) {
      response += `Found ${sources.length} relevant entries:\n`;
      sources.slice(0, 3).forEach((source, index) => {
        response += `${index + 1}. ${source.excerpt} (${source.type})\n`;
      });
    }

    if (agentInsights.length > 0) {
      response += `\nAgent analysis suggests reviewing project status and governance compliance.\n`;
    }

    return response;
  }

  private async generateRecommendations(
    query: RAGQuery, 
    sources: RAGSource[], 
    agentInsights: any[]
  ): Promise<string[]> {
    const recommendations: string[] = [];
    
    // Base recommendations on query context
    if (query.context.scope === 'governance') {
      recommendations.push('Review governance compliance status');
      recommendations.push('Check for missing audit entries');
    }
    
    if (query.context.scope === 'memory') {
      recommendations.push('Verify memory anchor integrity');
      recommendations.push('Update outdated memory references');
    }

    // Add agent-based recommendations
    agentInsights.forEach(insight => {
      if (insight.recommendations) {
        recommendations.push(...insight.recommendations.slice(0, 2));
      }
    });

    return recommendations.slice(0, 5);
  }

  private generateRelatedQueries(query: RAGQuery, sources: RAGSource[]): string[] {
    const related: string[] = [];
    
    // Generate based on common patterns in sources
    if (sources.some(s => s.metadata.phaseId)) {
      related.push('What is the current phase status?');
    }
    
    if (sources.some(s => s.type === 'governance_log')) {
      related.push('Show me recent governance activities');
    }
    
    if (sources.some(s => s.type === 'memory_anchor')) {
      related.push('What memory anchors are active?');
    }

    return related.slice(0, 3);
  }

  private isRelevantToQuery(query: string, text: string, context?: any): boolean {
    const queryLower = query.toLowerCase();
    const textLower = text.toLowerCase();
    
    // Simple relevance check - in production, use more sophisticated NLP
    const keywords = queryLower.split(' ').filter(word => word.length > 2);
    const matches = keywords.filter(keyword => textLower.includes(keyword));
    
    return matches.length > 0;
  }

  private calculateTextRelevance(query: string, text: string): number {
    const queryWords = query.toLowerCase().split(' ');
    const textWords = text.toLowerCase().split(' ');
    
    const matches = queryWords.filter(word => textWords.includes(word));
    return matches.length / queryWords.length;
  }

  private calculateConfidence(sources: RAGSource[], agentInsights: number): number {
    let confidence = 0.3; // Base confidence
    
    // Add confidence based on source quality
    confidence += Math.min(sources.length * 0.1, 0.4);
    
    // Add confidence based on agent insights
    confidence += Math.min(agentInsights * 0.15, 0.3);
    
    return Math.min(confidence, 1.0);
  }

  private calculateRelevanceScore(sources: RAGSource[]): number {
    if (sources.length === 0) return 0.0;
    
    const avgRelevance = sources.reduce((sum, source) => sum + source.relevance, 0) / sources.length;
    return avgRelevance;
  }

  // Public API methods
  async createQuery(
    query: string,
    context: Partial<RAGQuery['context']> = {}
  ): Promise<string> {
    const ragQuery: RAGQuery = {
      id: `query_${Date.now()}`,
      query,
      context: {
        scope: context.scope || 'combined',
        priority: context.priority || 'medium',
        ...context
      },
      timestamp: new Date().toISOString()
    };

    const result = await this.queryRAG(ragQuery);
    return result.answer;
  }

  async getGovernanceStats(): Promise<{
    totalEntries: number;
    totalAnchors: number;
    projects: string[];
    phases: string[];
    lastUpdated: string;
  }> {
    const totalEntries = Array.from(this.governanceCache.values())
      .reduce((sum, entries) => sum + entries.length, 0);
    
    const totalAnchors = Array.from(this.memoryCache.values())
      .reduce((sum, anchors) => sum + anchors.length, 0);

    const projects = Array.from(this.governanceCache.keys());
    
    const phases = new Set<string>();
    this.governanceCache.forEach(entries => {
      entries.forEach(entry => phases.add(entry.phaseId));
    });

    return {
      totalEntries,
      totalAnchors,
      projects,
      phases: Array.from(phases),
      lastUpdated: new Date().toISOString()
    };
  }

  async refreshData(): Promise<void> {
    console.log('🔄 Refreshing RAG data...');
    
    this.governanceCache.clear();
    this.memoryCache.clear();
    this.embeddings.clear();
    
    await this.loadGovernanceLogs();
    await this.loadMemoryAnchors();
    await this.createEmbeddings();
    
    console.log('✅ RAG data refreshed');
  }

  getStatus(): {
    initialized: boolean;
    governanceEntries: number;
    memoryAnchors: number;
    embeddings: number;
    projects: number;
  } {
    return {
      initialized: this.initialized,
      governanceEntries: Array.from(this.governanceCache.values())
        .reduce((sum, entries) => sum + entries.length, 0),
      memoryAnchors: Array.from(this.memoryCache.values())
        .reduce((sum, anchors) => sum + anchors.length, 0),
      embeddings: this.embeddings.size,
      projects: this.governanceCache.size
    };
  }
}

// Export singleton instance
export const ragGovernanceService = new RAGGovernanceService();
export default ragGovernanceService;