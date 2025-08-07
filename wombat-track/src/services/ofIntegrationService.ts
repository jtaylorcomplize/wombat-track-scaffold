/**
 * OF Integration Service - API Gateway for AzureOpenAI → oApp Access
 * Provides secure API endpoints for multi-agent Orbis Forge integration
 */

import type { Request, Response, NextFunction } from 'express';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import type { AuthenticatedRequest, AuthConfig } from './ofIntegrationAuth';
import { createOFIntegrationAuth } from './ofIntegrationAuth';
import { ragGovernanceService } from './ragGovernanceService';
import { visionLayerAgentFramework } from './visionLayerAgent';
import { agenticCloudOrchestrator } from './agenticCloudOrchestrator';
import { enhancedGovernanceLogger } from './enhancedGovernanceLogger';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface GovernanceQueryRequest {
  projectId?: string;
  phaseId?: string;
  entryType?: string;
  timeRange?: {
    start: string;
    end: string;
  };
  limit?: number;
}

export interface GovernanceAppendRequest {
  entryType: string;
  projectId: string;
  phaseId?: string;
  summary: string;
  details: Record<string, unknown>;
  memoryAnchor?: string;
  agentId?: string;
}

export interface MemoryQueryRequest {
  query: string;
  scope: 'governance' | 'memory' | 'combined' | 'agents';
  projectId?: string;
  phaseId?: string;
  priority: 'low' | 'medium' | 'high';
}

export interface AgentExecuteRequest {
  agentId: string;
  taskType: 'analysis' | 'monitoring' | 'validation' | 'recommendation';
  priority: 'low' | 'medium' | 'high';
  payload: Record<string, unknown>;
  context?: {
    projectId?: string;
    phaseId?: string;
    memoryAnchor?: string;
  };
}

export interface OrchestrationSimulateRequest {
  workflowId: string;
  context: {
    projectId: string;
    phaseId: string;
    stepId: string;
    gitBranch: string;
    environment: 'development' | 'staging' | 'production';
  };
  inputs?: Record<string, unknown>;
  dryRun?: boolean;
}

export interface TelemetryLogRequest {
  source: 'azure_openai' | 'agent_execution' | 'validation_report';
  level: 'info' | 'warning' | 'error';
  message: string;
  metadata: Record<string, unknown>;
  timestamp?: string;
}

class OFIntegrationService {
  private app: express.Application;
  private auth: ReturnType<typeof createOFIntegrationAuth>;
  private port: number;
  private requestCount = 0;

  constructor(authConfig: AuthConfig, port: number = 3001) {
    this.app = express();
    this.auth = createOFIntegrationAuth(authConfig);
    this.port = port;

    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet());
    this.app.use(cors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ['https://wombat-track-openai-au.openai.azure.com'],
      credentials: true,
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID']
    }));

    // Rate limiting (global)
    this.app.use(rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000, // Limit each IP to 1000 requests per windowMs
      message: 'Too many requests from this IP, please try again later',
      standardHeaders: true,
      legacyHeaders: false
    }));

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Request logging and ID assignment
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      const authReq = req as AuthenticatedRequest;
      if (!authReq.requestId) {
        authReq.requestId = `req_${Date.now()}_${++this.requestCount}`;
      }
      
      console.log(`🌐 ${req.method} ${req.path} - Request ID: ${authReq.requestId}`);
      next();
    });

    // Authentication middleware (applied to all protected routes)
    this.app.use('/api', this.auth.authenticate());
  }

  private setupRoutes(): void {
    // Health check (unprotected)
    this.app.get('/health', this.healthCheck.bind(this));

    // API Documentation (unprotected)
    this.app.get('/api-docs', this.apiDocs.bind(this));

    // Protected API endpoints
    this.app.get('/api/governance/query', this.governanceQuery.bind(this));
    this.app.post('/api/governance/append', this.governanceAppend.bind(this));
    this.app.post('/api/memory/query', this.memoryQuery.bind(this));
    this.app.post('/api/agent/execute', this.agentExecute.bind(this));
    this.app.post('/api/orchestration/simulate', this.orchestrationSimulate.bind(this));
    this.app.post('/api/telemetry/log', this.telemetryLog.bind(this));

    // Admin endpoints (require special permissions)
    this.app.get('/api/admin/access-logs', this.getAccessLogs.bind(this));
    this.app.get('/api/admin/system-status', this.getSystemStatus.bind(this));
  }

  private setupErrorHandling(): void {
    // 404 handler
    this.app.use('*', (req: Request, res: Response) => {
      res.status(404).json({
        error: 'Endpoint not found',
        requestId: (req as AuthenticatedRequest).requestId,
        availableEndpoints: [
          'GET /health',
          'GET /api-docs',
          'GET /api/governance/query',
          'POST /api/governance/append',
          'POST /api/memory/query',
          'POST /api/agent/execute',
          'POST /api/orchestration/simulate',
          'POST /api/telemetry/log'
        ]
      });
    });

    // Global error handler
    this.app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
      const authReq = req as AuthenticatedRequest;
      
      console.error(`❌ Error in ${req.method} ${req.path}:`, error);
      
      // Log error for governance
      this.logToGovernance({
        entryType: 'integration_error',
        projectId: 'OF-INTEGRATION',
        summary: `API error in ${req.method} ${req.path}: ${error.message}`,
        details: {
          error: error.message,
          stack: error.stack,
          requestId: authReq.requestId,
          clientId: authReq.user?.clientId || 'unknown'
        }
      });

      res.status(500).json({
        error: 'Internal server error',
        requestId: authReq.requestId,
        timestamp: new Date().toISOString()
      });
    });
  }

  // ========== ENDPOINT IMPLEMENTATIONS ==========

  private async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      const authHealth = await this.auth.healthCheck();
      const ragStatus = ragGovernanceService.getStatus();
      const agentHealth = await visionLayerAgentFramework.getSystemHealth();

      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        components: {
          authentication: authHealth.status,
          ragGovernance: ragStatus.initialized ? 'healthy' : 'degraded',
          visionAgents: agentHealth.status,
          orchestration: 'healthy'
        },
        metrics: {
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage(),
          requestCount: this.requestCount
        }
      };

      // Overall status
      const componentStatuses = Object.values(health.components);
      if (componentStatuses.includes('unhealthy')) {
        health.status = 'unhealthy';
      } else if (componentStatuses.includes('degraded')) {
        health.status = 'degraded';
      }

      const statusCode = health.status === 'healthy' ? 200 : 503;
      res.status(statusCode).json(health);
    } catch (error: any) {
      res.status(503).json({
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  private async apiDocs(req: Request, res: Response): Promise<void> {
    const docs = {
      title: 'OF Integration Service API',
      version: '1.0.0',
      description: 'Secure API gateway for AzureOpenAI → oApp (Orbis Forge) integration',
      baseUrl: `http://localhost:${this.port}`,
      authentication: 'Bearer token (Azure AD Managed Identity)',
      endpoints: {
        'GET /health': {
          description: 'Health check endpoint',
          authentication: 'None',
          response: 'System health status'
        },
        'GET /api/governance/query': {
          description: 'Query governance logs',
          authentication: 'Required',
          parameters: 'projectId, phaseId, entryType, timeRange, limit',
          response: 'Array of governance entries'
        },
        'POST /api/governance/append': {
          description: 'Add new governance log entry',
          authentication: 'Required',
          body: 'GovernanceAppendRequest',
          response: 'Success confirmation'
        },
        'POST /api/memory/query': {
          description: 'Execute RAG query on memory and governance data',
          authentication: 'Required',
          body: 'MemoryQueryRequest',
          response: 'Intelligent answer with sources'
        },
        'POST /api/agent/execute': {
          description: 'Execute Vision Layer Agent task',
          authentication: 'Required',
          body: 'AgentExecuteRequest',
          response: 'Agent execution result'
        },
        'POST /api/orchestration/simulate': {
          description: 'Trigger orchestration workflow',
          authentication: 'Required',
          body: 'OrchestrationSimulateRequest',
          response: 'Workflow execution status'
        },
        'POST /api/telemetry/log': {
          description: 'Log telemetry data from AzureOpenAI',
          authentication: 'Required',
          body: 'TelemetryLogRequest',
          response: 'Log confirmation'
        }
      }
    };

    res.json(docs);
  }

  private async governanceQuery(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const query: GovernanceQueryRequest = req.query as any;
      
      // Load governance logs with filtering
      const governanceLogPath = path.join(process.cwd(), 'logs', 'governance.jsonl');
      const content = await fs.readFile(governanceLogPath, 'utf-8');
      
      let entries = content
        .split('\n')
        .filter(line => line.trim())
        .map(line => JSON.parse(line))
        .filter(entry => {
          if (query.projectId && entry.project_id !== query.projectId) return false;
          if (query.phaseId && entry.phase_id !== query.phaseId) return false;
          if (query.entryType && entry.entry_type !== query.entryType) return false;
          if (query.timeRange) {
            const entryTime = new Date(entry.timestamp);
            if (entryTime < new Date(query.timeRange.start) || entryTime > new Date(query.timeRange.end)) {
              return false;
            }
          }
          return true;
        });

      // Apply limit
      if (query.limit) {
        entries = entries.slice(-query.limit);
      }

      // Log this access
      await this.logToGovernance({
        entryType: 'integration_access',
        projectId: query.projectId || 'ALL',
        summary: `Governance query executed by ${req.user?.clientId}`,
        details: {
          query,
          resultCount: entries.length,
          clientId: req.user?.clientId
        }
      });

      res.json({
        success: true,
        count: entries.length,
        data: entries,
        requestId: req.requestId,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Governance query error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to query governance logs',
        requestId: req.requestId
      });
    }
  }

  private async governanceAppend(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const appendReq: GovernanceAppendRequest = req.body;

      // Validate required fields
      if (!appendReq.entryType || !appendReq.projectId || !appendReq.summary) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: entryType, projectId, summary',
          requestId: req.requestId
        });
      }

      // Create governance entry
      const entry = {
        timestamp: new Date().toISOString(),
        entry_type: appendReq.entryType,
        project_id: appendReq.projectId,
        phase_id: appendReq.phaseId,
        memory_anchor: appendReq.memoryAnchor,
        summary: appendReq.summary,
        details: appendReq.details,
        agent_id: appendReq.agentId,
        client_id: req.user?.clientId,
        integration_source: 'azure_openai',
        audit_traceability: true
      };

      // Append to governance log
      const governanceLogPath = path.join(process.cwd(), 'logs', 'governance.jsonl');
      await fs.appendFile(governanceLogPath, JSON.stringify(entry) + '\n');

      res.json({
        success: true,
        message: 'Governance entry added successfully',
        entryId: `${entry.project_id}_${Date.now()}`,
        requestId: req.requestId,
        timestamp: entry.timestamp
      });

    } catch (error: any) {
      console.error('Governance append error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to append governance entry',
        requestId: req.requestId
      });
    }
  }

  private async memoryQuery(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const queryReq: MemoryQueryRequest = req.body;

      if (!queryReq.query || !queryReq.scope) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: query, scope',
          requestId: req.requestId
        });
      }

      // Execute RAG query
      const answer = await ragGovernanceService.createQuery(queryReq.query, {
        scope: queryReq.scope,
        priority: queryReq.priority,
        projectId: queryReq.projectId,
        phaseId: queryReq.phaseId
      });

      // Log the query
      await this.logToGovernance({
        entryType: 'rag_query',
        projectId: queryReq.projectId || 'GLOBAL',
        summary: `RAG query executed: "${queryReq.query}"`,
        details: {
          scope: queryReq.scope,
          priority: queryReq.priority,
          clientId: req.user?.clientId,
          answerLength: answer.length
        }
      });

      res.json({
        success: true,
        query: queryReq.query,
        answer,
        scope: queryReq.scope,
        requestId: req.requestId,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Memory query error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to execute RAG query',
        requestId: req.requestId
      });
    }
  }

  private async agentExecute(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const executeReq: AgentExecuteRequest = req.body;

      if (!executeReq.agentId || !executeReq.taskType) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: agentId, taskType',
          requestId: req.requestId
        });
      }

      // Create agent task
      const taskId = await visionLayerAgentFramework.createTask(
        executeReq.agentId,
        executeReq.taskType,
        executeReq.priority,
        executeReq.payload,
        executeReq.context
      );

      // Execute the task
      const result = await visionLayerAgentFramework.executeTask(taskId);

      // Log the execution
      await this.logToGovernance({
        entryType: 'agent_execution',
        projectId: executeReq.context?.projectId || 'INTEGRATION',
        summary: `Agent ${executeReq.agentId} executed ${executeReq.taskType} task`,
        details: {
          agentId: executeReq.agentId,
          taskType: executeReq.taskType,
          taskId,
          success: result.success,
          clientId: req.user?.clientId,
          recommendationCount: result.recommendations.length
        }
      });

      res.json({
        success: true,
        taskId,
        result: {
          success: result.success,
          data: result.data,
          recommendations: result.recommendations,
          issues: result.issues,
          artifacts: result.artifacts
        },
        requestId: req.requestId,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Agent execute error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to execute agent task',
        requestId: req.requestId
      });
    }
  }

  private async orchestrationSimulate(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const simulateReq: OrchestrationSimulateRequest = req.body;

      if (!simulateReq.workflowId || !simulateReq.context) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: workflowId, context',
          requestId: req.requestId
        });
      }

      let executionId: string;
      let status: string;

      if (simulateReq.dryRun) {
        // Dry run - just validate the workflow exists
        const workflows = agenticCloudOrchestrator.getActiveWorkflows();
        const workflow = workflows.find(w => w.id === simulateReq.workflowId);
        
        if (!workflow) {
          return res.status(404).json({
            success: false,
            error: 'Workflow not found',
            requestId: req.requestId
          });
        }

        executionId = `dry_run_${Date.now()}`;
        status = 'simulated';
      } else {
        // Actually execute the workflow
        executionId = await agenticCloudOrchestrator.executeWorkflow(
          simulateReq.workflowId,
          simulateReq.context,
          simulateReq.inputs
        );
        status = 'executing';
      }

      // Log the orchestration
      await this.logToGovernance({
        entryType: 'orchestration_trigger',
        projectId: simulateReq.context.projectId,
        phaseId: simulateReq.context.phaseId,
        summary: `Workflow ${simulateReq.workflowId} ${simulateReq.dryRun ? 'simulated' : 'executed'}`,
        details: {
          workflowId: simulateReq.workflowId,
          executionId,
          dryRun: simulateReq.dryRun,
          context: simulateReq.context,
          clientId: req.user?.clientId
        }
      });

      res.json({
        success: true,
        workflowId: simulateReq.workflowId,
        executionId,
        status,
        dryRun: simulateReq.dryRun,
        requestId: req.requestId,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Orchestration simulate error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to execute orchestration workflow',
        requestId: req.requestId
      });
    }
  }

  private async telemetryLog(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const logReq: TelemetryLogRequest = req.body;

      if (!logReq.source || !logReq.level || !logReq.message) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: source, level, message',
          requestId: req.requestId
        });
      }

      // Create telemetry entry
      const entry = {
        timestamp: logReq.timestamp || new Date().toISOString(),
        source: logReq.source,
        level: logReq.level,
        message: logReq.message,
        metadata: logReq.metadata,
        clientId: req.user?.clientId,
        requestId: req.requestId
      };

      // Store in DriveMemory telemetry logs
      const telemetryDir = path.join(process.cwd(), 'DriveMemory', 'OF-Integration', 'telemetry');
      await fs.mkdir(telemetryDir, { recursive: true });
      
      const today = new Date().toISOString().split('T')[0];
      const telemetryFile = path.join(telemetryDir, `${today}.jsonl`);
      await fs.appendFile(telemetryFile, JSON.stringify(entry) + '\n');

      // Also log to governance for high-level tracking
      if (logReq.level === 'error' || logReq.level === 'warning') {
        await this.logToGovernance({
          entryType: 'telemetry_alert',
          projectId: 'OF-INTEGRATION',
          summary: `${logReq.level.toUpperCase()}: ${logReq.message}`,
          details: {
            source: logReq.source,
            level: logReq.level,
            metadata: logReq.metadata,
            clientId: req.user?.clientId
          }
        });
      }

      res.json({
        success: true,
        message: 'Telemetry logged successfully',
        logFile: `telemetry/${today}.jsonl`,
        requestId: req.requestId,
        timestamp: entry.timestamp
      });

    } catch (error: any) {
      console.error('Telemetry log error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to log telemetry data',
        requestId: req.requestId
      });
    }
  }

  private async getAccessLogs(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Check if user has admin permissions
      if (!req.user?.roles.includes('Integration.Admin')) {
        return res.status(403).json({
          success: false,
          error: 'Admin permissions required',
          requestId: req.requestId
        });
      }

      const limit = parseInt(req.query.limit as string) || 100;
      const accessLogs = this.auth.getAccessLogs(limit);
      const governanceExport = this.auth.exportAccessLogsForGovernance();

      res.json({
        success: true,
        accessLogs,
        summary: governanceExport,
        requestId: req.requestId,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Get access logs error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve access logs',
        requestId: req.requestId
      });
    }
  }

  private async getSystemStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Check if user has admin permissions
      if (!req.user?.roles.includes('Integration.Admin')) {
        return res.status(403).json({
          success: false,
          error: 'Admin permissions required',
          requestId: req.requestId
        });
      }

      const authHealth = await this.auth.healthCheck();
      const ragStatus = ragGovernanceService.getStatus();
      const agentHealth = await visionLayerAgentFramework.getSystemHealth();
      const agents = visionLayerAgentFramework.getAgents();
      const workflows = agenticCloudOrchestrator.getActiveWorkflows();

      const systemStatus = {
        timestamp: new Date().toISOString(),
        overall: 'healthy',
        components: {
          authentication: authHealth,
          ragGovernance: {
            status: ragStatus.initialized ? 'healthy' : 'degraded',
            details: ragStatus
          },
          visionAgents: {
            status: agentHealth.status,
            details: agentHealth,
            agents: agents.length
          },
          orchestration: {
            status: 'healthy',
            workflows: workflows.length
          }
        },
        metrics: {
          uptime: process.uptime(),
          requestCount: this.requestCount,
          memoryUsage: process.memoryUsage(),
          nodeVersion: process.version
        }
      };

      res.json({
        success: true,
        systemStatus,
        requestId: req.requestId
      });

    } catch (error: any) {
      console.error('Get system status error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve system status',
        requestId: req.requestId
      });
    }
  }

  // ========== UTILITY METHODS ==========

  private async logToGovernance(entry: Omit<GovernanceAppendRequest, 'agentId'>): Promise<void> {
    try {
      const governanceEntry = {
        timestamp: new Date().toISOString(),
        entry_type: entry.entryType,
        project_id: entry.projectId,
        phase_id: entry.phaseId,
        memory_anchor: entry.memoryAnchor,
        summary: entry.summary,
        details: entry.details,
        integration_service: true,
        audit_traceability: true
      };

      const governanceLogPath = path.join(process.cwd(), 'logs', 'governance.jsonl');
      await fs.appendFile(governanceLogPath, JSON.stringify(governanceEntry) + '\n');
    } catch (error: any) {
      console.error('Failed to log to governance:', error);
    }
  }

  public async start(): Promise<void> {
    return new Promise((resolve) => {
      this.app.listen(this.port, () => {
        console.log(`🚀 OF Integration Service running on port ${this.port}`);
        console.log(`📖 API Documentation: http://localhost:${this.port}/api-docs`);
        console.log(`💚 Health Check: http://localhost:${this.port}/health`);
        resolve();
      });
    });
  }

  public getApp(): express.Application {
    return this.app;
  }
}

export default OFIntegrationService;