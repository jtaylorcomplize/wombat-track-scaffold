#!/usr/bin/env npx tsx

/**
 * Simple OpenAI → oApp Integration Service
 * Minimal service for immediate testing without Azure dependencies
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import * as fs from 'fs/promises';
import * as path from 'path';

interface AuthenticatedRequest extends Request {
  requestId?: string;
  user?: {
    clientId: string;
    identity: string;
  };
}

class SimpleOpenAIIntegration {
  private app: express.Application;
  private requestCount = 0;

  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(cors({
      origin: '*', // Allow all origins for local testing
      credentials: true,
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID']
    }));

    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Mock authentication for local testing
    this.app.use('/api', (req: AuthenticatedRequest, res, next) => {
      req.user = {
        clientId: 'openai-test-client',
        identity: 'local-integration-test'
      };
      req.requestId = `openai_${Date.now()}_${++this.requestCount}`;
      console.log(`🤖 OpenAI Request: ${req.method} ${req.path} - ID: ${req.requestId}`);
      next();
    });
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', async (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'Simple OpenAI Integration',
        version: '1.0.0',
        components: {
          filesystem: 'healthy',
          governance_logs: 'healthy',
          memory_system: 'healthy'
        },
        metrics: {
          uptime: process.uptime(),
          requestCount: this.requestCount
        }
      });
    });

    // API Documentation
    this.app.get('/api-docs', async (req, res) => {
      res.json({
        title: 'Simple OpenAI → oApp Integration',
        version: '1.0.0',
        description: 'Direct OpenAI integration with local oApp codebase',
        baseUrl: 'http://localhost:3001',
        endpoints: {
          'GET /health': 'Service health check',
          'GET /api/codebase/query': 'Query local codebase information',
          'GET /api/governance/query': 'Query governance logs',
          'POST /api/memory/query': 'Execute knowledge queries',
          'POST /api/governance/append': 'Add governance entries',
          'POST /api/codebase/analyze': 'Analyze codebase structure'
        }
      });
    });

    // Codebase query - Direct file system access
    this.app.get('/api/codebase/query', async (req: AuthenticatedRequest, res) => {
      try {
        const { pattern, directory = '.', limit = 10 } = req.query as any;
        
        const results: any = {
          query: { pattern, directory, limit },
          requestId: req.requestId,
          timestamp: new Date().toISOString(),
          results: []
        };

        if (pattern) {
          // Search for files containing the pattern
          const { execSync } = await import('child_process');
          try {
            const output = execSync(`rg -l "${pattern}" ${directory} | head -${limit}`, { encoding: 'utf-8' });
            results.results = output.trim().split('\n').filter(f => f);
          } catch (e) {
            results.results = [];
          }
        } else {
          // List recent files
          const { execSync } = await import('child_process');
          try {
            const output = execSync(`find ${directory} -type f -name "*.ts" -o -name "*.js" -o -name "*.json" -o -name "*.md" | head -${limit}`, { encoding: 'utf-8' });
            results.results = output.trim().split('\n').filter(f => f);
          } catch (e) {
            results.results = [];
          }
        }

        await this.logToGovernance('codebase_query', {
          pattern,
          directory,
          resultCount: results.results.length,
          clientId: req.user?.clientId
        });

        res.json(results);
      } catch (error: any) {
        res.status(500).json({
          error: 'Codebase query failed',
          message: error.message,
          requestId: req.requestId
        });
      }
    });

    // Governance query
    this.app.get('/api/governance/query', async (req: AuthenticatedRequest, res) => {
      try {
        const { projectId, limit = 10 } = req.query as any;
        
        const governanceLogPath = path.join(process.cwd(), 'logs', 'governance.jsonl');
        let entries: any[] = [];
        
        try {
          const content = await fs.readFile(governanceLogPath, 'utf-8');
          entries = content
            .split('\n')
            .filter(line => line.trim())
            .map(line => JSON.parse(line))
            .filter(entry => !projectId || entry.project_id === projectId)
            .slice(-parseInt(limit));
        } catch (e) {
          entries = [];
        }

        await this.logToGovernance('governance_query', {
          projectId,
          limit,
          resultCount: entries.length,
          clientId: req.user?.clientId
        });

        res.json({
          success: true,
          count: entries.length,
          data: entries,
          requestId: req.requestId,
          timestamp: new Date().toISOString()
        });
      } catch (error: any) {
        res.status(500).json({
          error: 'Governance query failed',
          message: error.message,
          requestId: req.requestId
        });
      }
    });

    // Memory/Knowledge query
    this.app.post('/api/memory/query', async (req: AuthenticatedRequest, res) => {
      try {
        const { query, scope = 'combined' } = req.body;

        if (!query) {
          return res.status(400).json({
            error: 'Missing required field: query',
            requestId: req.requestId
          });
        }

        // Simple knowledge extraction from governance logs and files
        let answer = await this.generateSimpleAnswer(query, scope);

        await this.logToGovernance('memory_query', {
          query,
          scope,
          answerLength: answer.length,
          clientId: req.user?.clientId
        });

        res.json({
          success: true,
          query,
          answer,
          scope,
          requestId: req.requestId,
          timestamp: new Date().toISOString()
        });
      } catch (error: any) {
        res.status(500).json({
          error: 'Memory query failed',
          message: error.message,
          requestId: req.requestId
        });
      }
    });

    // Add governance entry
    this.app.post('/api/governance/append', async (req: AuthenticatedRequest, res) => {
      try {
        const { entryType, projectId, summary, details = {} } = req.body;

        if (!entryType || !projectId || !summary) {
          return res.status(400).json({
            error: 'Missing required fields: entryType, projectId, summary',
            requestId: req.requestId
          });
        }

        await this.logToGovernance(entryType, {
          projectId,
          summary,
          details,
          clientId: req.user?.clientId,
          source: 'openai_integration'
        });

        res.json({
          success: true,
          message: 'Governance entry added successfully',
          entryId: `${projectId}_${Date.now()}`,
          requestId: req.requestId,
          timestamp: new Date().toISOString()
        });
      } catch (error: any) {
        res.status(500).json({
          error: 'Failed to add governance entry',
          message: error.message,
          requestId: req.requestId
        });
      }
    });

    // Codebase analysis
    this.app.post('/api/codebase/analyze', async (req: AuthenticatedRequest, res) => {
      try {
        const { analysisType = 'structure', directory = '.' } = req.body;

        const analysis = await this.analyzeCodebase(analysisType, directory);

        await this.logToGovernance('codebase_analysis', {
          analysisType,
          directory,
          resultCount: analysis.files?.length || 0,
          clientId: req.user?.clientId
        });

        res.json({
          success: true,
          analysisType,
          data: analysis,
          requestId: req.requestId,
          timestamp: new Date().toISOString()
        });
      } catch (error: any) {
        res.status(500).json({
          error: 'Codebase analysis failed',
          message: error.message,
          requestId: req.requestId
        });
      }
    });
  }

  private async generateSimpleAnswer(query: string, scope: string): Promise<string> {
    // Simple pattern matching and information extraction
    const lowerQuery = query.toLowerCase();
    
    let answer = "";

    // Check governance logs
    try {
      const governanceLogPath = path.join(process.cwd(), 'logs', 'governance.jsonl');
      const content = await fs.readFile(governanceLogPath, 'utf-8');
      const entries = content.split('\n').filter(line => line.trim()).map(line => JSON.parse(line));
      
      const relevantEntries = entries.filter(entry => 
        entry.summary?.toLowerCase().includes(lowerQuery) ||
        entry.entry_type?.toLowerCase().includes(lowerQuery) ||
        JSON.stringify(entry.details || {}).toLowerCase().includes(lowerQuery)
      ).slice(-3);

      if (relevantEntries.length > 0) {
        answer += "Based on governance logs:\n";
        relevantEntries.forEach(entry => {
          answer += `• ${entry.entry_type}: ${entry.summary}\n`;
        });
        answer += "\n";
      }
    } catch (e) {
      // Governance logs not available
    }

    // Check recent files if asking about code/implementation
    if (lowerQuery.includes('code') || lowerQuery.includes('implement') || lowerQuery.includes('service') || lowerQuery.includes('integration')) {
      try {
        const { execSync } = await import('child_process');
        const recentFiles = execSync('find . -name "*.ts" -o -name "*.js" | head -5', { encoding: 'utf-8' });
        answer += "Recent code files:\n";
        recentFiles.trim().split('\n').forEach(file => {
          answer += `• ${file}\n`;
        });
        answer += "\n";
      } catch (e) {
        // File listing failed
      }
    }

    // Check for integration service status
    if (lowerQuery.includes('integration') || lowerQuery.includes('openai') || lowerQuery.includes('service')) {
      answer += "OF Integration Service Status:\n";
      answer += "• Local integration service: Running on http://localhost:3001\n";
      answer += "• API endpoints: Available for direct OpenAI access\n";
      answer += "• Authentication: Bypassed for local testing\n";
      answer += "• Governance logging: Active\n\n";
    }

    if (!answer) {
      answer = `The query "${query}" was processed. Based on available information from the local codebase and governance logs, I can provide access to project files, governance entries, and system status. For more specific information, try queries about 'integration service', 'project status', or 'recent changes'.`;
    }

    return answer.trim();
  }

  private async analyzeCodebase(analysisType: string, directory: string): Promise<any> {
    const { execSync } = await import('child_process');

    const analysis: any = {
      analysisType,
      directory,
      timestamp: new Date().toISOString()
    };

    try {
      switch (analysisType) {
        case 'structure':
          const structure = execSync(`find ${directory} -type f -name "*.ts" -o -name "*.js" -o -name "*.json" | head -20`, { encoding: 'utf-8' });
          analysis.files = structure.trim().split('\n').filter(f => f);
          analysis.fileCount = analysis.files.length;
          break;

        case 'recent':
          const recent = execSync(`find ${directory} -type f \\( -name "*.ts" -o -name "*.js" -o -name "*.json" \\) -mtime -1 | head -10`, { encoding: 'utf-8' });
          analysis.recentFiles = recent.trim().split('\n').filter(f => f);
          break;

        case 'services':
          const services = execSync(`find ${directory}/src/services -name "*.ts" 2>/dev/null | head -10`, { encoding: 'utf-8' });
          analysis.services = services.trim().split('\n').filter(f => f);
          break;

        default:
          analysis.error = `Unknown analysis type: ${analysisType}`;
      }
    } catch (error: any) {
      analysis.error = error.message;
    }

    return analysis;
  }

  private async logToGovernance(entryType: string, details: any): Promise<void> {
    try {
      const entry = {
        timestamp: new Date().toISOString(),
        entry_type: entryType,
        project_id: details.projectId || 'OPENAI-INTEGRATION',
        phase_id: 'OF-8.8',
        memory_anchor: `openai-integration-${Date.now()}`,
        summary: details.summary || `OpenAI integration: ${entryType}`,
        details: details,
        audit_traceability: true,
        source: 'simple_openai_integration'
      };

      const governanceLogPath = path.join(process.cwd(), 'logs', 'governance.jsonl');
      await fs.appendFile(governanceLogPath, JSON.stringify(entry) + '\n');
    } catch (error) {
      console.warn('Failed to log to governance:', error);
    }
  }

  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.app.listen(3001, () => {
        console.log('\n' + '='.repeat(70));
        console.log('🤖 SIMPLE OPENAI → oApp INTEGRATION SERVICE');
        console.log('='.repeat(70));
        console.log('');
        console.log('🌐 Service URL: http://localhost:3001');
        console.log('💚 Health Check: http://localhost:3001/health');
        console.log('📖 API Documentation: http://localhost:3001/api-docs');
        console.log('');
        console.log('🔓 Authentication: DISABLED (local testing)');
        console.log('📁 Direct codebase access: ENABLED');
        console.log('📋 Governance logging: ENABLED');
        console.log('');
        console.log('🧪 Test Commands:');
        console.log('curl "http://localhost:3001/api/codebase/query?pattern=integration&limit=5"');
        console.log('curl "http://localhost:3001/api/governance/query?projectId=OF-SDLC-IMP2"');
        console.log('curl -X POST http://localhost:3001/api/memory/query -d \'{"query":"What is the integration service status?"}\'');
        console.log('');
        console.log('🛑 Stop with Ctrl+C');
        console.log('='.repeat(70));
        resolve();
      });
    });
  }
}

// Start the service
const service = new SimpleOpenAIIntegration();
service.start().catch(error => {
  console.error('Failed to start service:', error);
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down Simple OpenAI Integration Service...');
  process.exit(0);
});

export { SimpleOpenAIIntegration };