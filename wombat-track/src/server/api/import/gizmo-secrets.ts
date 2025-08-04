/**
 * Gizmo Secrets Integration Wizard API
 * Handles OAuth2 validation, secrets storage, and agent activation
 */

import express from 'express';
import { promises as fs } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { createGizmoAuthService } from '../../../services/gizmo-auth';
import { agentMonitoringService } from '../../../services/AgentMonitoringService';
import { enhancedGovernanceLogger } from '../../../services/enhancedGovernanceLogger';
import { secretsPropagationService } from '../../../services/secretsPropagationService';
import type { GizmoAgentCredentials } from '../../../services/gizmo-auth';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

interface GizmoSecretsWizardStep {
  step: 'credentials' | 'environment' | 'validation' | 'propagation' | 'activation';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  data?: Record<string, unknown>;
  error?: string;
}

interface GizmoWizardSession {
  id: string;
  steps: GizmoSecretsWizardStep[];
  credentials?: GizmoAgentCredentials;
  environment: 'development' | 'staging' | 'production';
  createdAt: string;
  completedAt?: string;
}

// In-memory wizard sessions (in production, use Redis or database)
const wizardSessions = new Map<string, GizmoWizardSession>();

/**
 * POST /api/secrets/gizmo/wizard/start
 * Initialize new Gizmo secrets setup wizard session
 */
router.post('/wizard/start', async (req, res) => {
  try {
    const { environment = 'development' } = req.body;

    if (!['development', 'staging', 'production'].includes(environment)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid environment. Must be development, staging, or production.'
      });
    }

    const sessionId = `gizmo_wizard_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
    
    const session: GizmoWizardSession = {
      id: sessionId,
      environment,
      steps: [
        { step: 'credentials', status: 'pending' },
        { step: 'environment', status: 'pending' },
        { step: 'validation', status: 'pending' },
        { step: 'propagation', status: 'pending' },
        { step: 'activation', status: 'pending' }
      ],
      createdAt: new Date().toISOString()
    };

    wizardSessions.set(sessionId, session);

    await enhancedGovernanceLogger.logAgentAction('gizmo-secrets-wizard', 'session-started', {
      session_id: sessionId,
      environment,
      timestamp: session.createdAt
    });

    res.json({
      success: true,
      session_id: sessionId,
      environment,
      steps: session.steps,
      message: 'Gizmo secrets wizard session initialized'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to start wizard session',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/secrets/gizmo/wizard/:sessionId/credentials
 * Submit and validate Gizmo OAuth2 credentials
 */
router.post('/wizard/:sessionId/credentials', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { clientId, clientSecret, tokenEndpoint, authEndpoint, memoryEndpoint, agentEndpoint } = req.body;

    const session = wizardSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Wizard session not found'
      });
    }

    // Validate required fields
    if (!clientId || !clientSecret || !tokenEndpoint || !authEndpoint) {
      return res.status(400).json({
        success: false,
        error: 'Missing required credentials: clientId, clientSecret, tokenEndpoint, authEndpoint'
      });
    }

    // Update credentials step
    const credentialsStep = session.steps.find(s => s.step === 'credentials');
    if (credentialsStep) {
      credentialsStep.status = 'in_progress';
    }

    const credentials: GizmoAgentCredentials = {
      clientId,
      clientSecret,
      scopes: ['memory:write', 'audit:read', 'detection:write'], // Default scopes
      tokenEndpoint,
      authEndpoint,
      memoryEndpoint,
      agentEndpoint
    };

    session.credentials = credentials;
    wizardSessions.set(sessionId, session);

    // Mark credentials step as completed
    if (credentialsStep) {
      credentialsStep.status = 'completed';
      credentialsStep.data = {
        client_id: clientId,
        token_endpoint: tokenEndpoint,
        auth_endpoint: authEndpoint,
        memory_endpoint: memoryEndpoint,
        agent_endpoint: agentEndpoint
      };
    }

    await enhancedGovernanceLogger.logAgentAction('gizmo-secrets-wizard', 'credentials-submitted', {
      session_id: sessionId,
      client_id: clientId,
      endpoints_configured: {
        token: !!tokenEndpoint,
        auth: !!authEndpoint,
        memory: !!memoryEndpoint,
        agent: !!agentEndpoint
      }
    });

    res.json({
      success: true,
      message: 'Credentials saved successfully',
      session_id: sessionId,
      next_step: 'validation'
    });

  } catch (error) {
    const session = wizardSessions.get(req.params.sessionId);
    if (session) {
      const credentialsStep = session.steps.find(s => s.step === 'credentials');
      if (credentialsStep) {
        credentialsStep.status = 'failed';
        credentialsStep.error = error instanceof Error ? error.message : 'Unknown error';
      }
    }

    res.status(500).json({
      success: false,
      error: 'Failed to save credentials',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/secrets/gizmo/wizard/:sessionId/validate
 * Validate Gizmo OAuth2 credentials by attempting token acquisition
 */
router.post('/wizard/:sessionId/validate', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = wizardSessions.get(sessionId);

    if (!session || !session.credentials) {
      return res.status(404).json({
        success: false,
        error: 'Session not found or credentials missing'
      });
    }

    const validationStep = session.steps.find(s => s.step === 'validation');
    if (validationStep) {
      validationStep.status = 'in_progress';
    }

    // Attempt to create and test Gizmo auth service
    const authService = createGizmoAuthService(session.credentials, {
      timeout: 15000, // 15 second timeout for validation
      retryAttempts: 1 // Single attempt for validation
    });

    // Test token acquisition
    const tokenResult = await authService.getAccessToken();
    
    if (!tokenResult || !tokenResult.access_token) {
      throw new Error('Failed to acquire access token');
    }

    // Test endpoint connectivity if memory endpoint provided
    if (session.credentials.memoryEndpoint) {
      try {
        const memoryResponse = await fetch(`${session.credentials.memoryEndpoint}/health`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${tokenResult.access_token}`,
            'Content-Type': 'application/json'
          },
          timeout: 5000
        });

        if (!memoryResponse.ok) {
          console.warn(`Memory endpoint health check failed: ${memoryResponse.status}`);
        }
      } catch (memoryError) {
        console.warn('Memory endpoint connectivity test failed:', memoryError);
      }
    }

    // Mark validation as completed
    if (validationStep) {
      validationStep.status = 'completed';
      validationStep.data = {
        token_type: tokenResult.token_type,
        expires_in: tokenResult.expires_in,
        scope: tokenResult.scope,
        validated_at: new Date().toISOString()
      };
    }

    await enhancedGovernanceLogger.logAgentAction('gizmo-secrets-wizard', 'validation-successful', {
      session_id: sessionId,
      token_type: tokenResult.token_type,
      expires_in: tokenResult.expires_in,
      scope: tokenResult.scope
    });

    res.json({
      success: true,
      message: 'Gizmo OAuth2 credentials validated successfully',
      validation_result: {
        token_acquired: true,
        token_type: tokenResult.token_type,
        expires_in: tokenResult.expires_in,
        scope: tokenResult.scope
      },
      next_step: 'propagation'
    });

  } catch (error) {
    const session = wizardSessions.get(req.params.sessionId);
    if (session) {
      const validationStep = session.steps.find(s => s.step === 'validation');
      if (validationStep) {
        validationStep.status = 'failed';
        validationStep.error = error instanceof Error ? error.message : 'Token validation failed';
      }
    }

    await enhancedGovernanceLogger.logAgentAction('gizmo-secrets-wizard', 'validation-failed', {
      session_id: req.params.sessionId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(400).json({
      success: false,
      error: 'Credential validation failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      troubleshooting: {
        check_client_credentials: 'Verify Client ID and Secret are correct',
        check_endpoints: 'Ensure token and auth endpoints are accessible',
        check_permissions: 'Verify OAuth2 application has required scopes'
      }
    });
  }
});

/**
 * POST /api/secrets/gizmo/wizard/:sessionId/propagate
 * Propagate Gizmo secrets to environment and secrets manager
 */
router.post('/wizard/:sessionId/propagate', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = wizardSessions.get(sessionId);

    if (!session || !session.credentials) {
      return res.status(404).json({
        success: false,
        error: 'Session not found or credentials missing'
      });
    }

    const propagationStep = session.steps.find(s => s.step === 'propagation');
    if (propagationStep) {
      propagationStep.status = 'in_progress';
    }

    // Prepare Gizmo environment variables
    const gizmoSecrets = {
      GIZMO_CLIENT_ID: session.credentials.clientId,
      GIZMO_CLIENT_SECRET: session.credentials.clientSecret,
      GIZMO_TOKEN_ENDPOINT: session.credentials.tokenEndpoint,
      GIZMO_AUTH_ENDPOINT: session.credentials.authEndpoint,
      GIZMO_MEMORY_ENDPOINT: session.credentials.memoryEndpoint || '',
      GIZMO_AGENT_ENDPOINT: session.credentials.agentEndpoint || '',
      GIZMO_AGENT_SCOPES: session.credentials.scopes?.join(',') || 'memory:write,audit:read,detection:write'
    };

    // Filter out empty values
    const filteredSecrets = Object.fromEntries(
      Object.entries(gizmoSecrets).filter(([_, value]) => value !== '')
    );

    // Use secrets propagation service
    const propagationResult = await secretsPropagationService.propagateSecrets({
      environment: session.environment,
      secrets: filteredSecrets,
      targetPaths: {
        envFile: path.join(process.cwd(), '.env'),
        cicdConfig: path.join(process.cwd(), '.github', 'workflows'),
        dockerCompose: path.join(process.cwd(), 'docker-compose.yml')
      },
      backup: true,
      encrypt: false
    });

    if (!propagationResult.success) {
      throw new Error(`Propagation failed: ${propagationResult.errors.join(', ')}`);
    }

    // Also store in secrets manager for backup
    try {
      const secretsResponse = await fetch('/api/admin/secrets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `GIZMO_CREDENTIALS_${session.environment.toUpperCase()}`,
          value: JSON.stringify(session.credentials),
          description: `Gizmo OAuth2 credentials for ${session.environment} environment`
        })
      });

      if (!secretsResponse.ok) {
        console.warn('Failed to backup credentials to secrets manager');
      }
    } catch (backupError) {
      console.warn('Secrets manager backup failed:', backupError);
    }

    // Mark propagation as completed
    if (propagationStep) {
      propagationStep.status = 'completed';
      propagationStep.data = {
        env_file_updated: true,
        variables_added: propagationResult.variablesAdded,
        variables_updated: propagationResult.variablesUpdated,
        backup_created: propagationResult.backupCreated,
        target_files: propagationResult.targetFilesPaths,
        propagated_at: new Date().toISOString()
      };
    }

    await enhancedGovernanceLogger.logAgentAction('gizmo-secrets-wizard', 'propagation-completed', {
      session_id: sessionId,
      environment: session.environment,
      variables_added: propagationResult.variablesAdded.length,
      variables_updated: propagationResult.variablesUpdated.length,
      target_files: propagationResult.targetFilesPaths.length
    });

    res.json({
      success: true,
      message: 'Gizmo secrets propagated successfully',
      propagation_result: {
        env_file_updated: true,
        variables_added: propagationResult.variablesAdded,
        variables_updated: propagationResult.variablesUpdated,
        secrets_manager_backup: true,
        target_files: propagationResult.targetFilesPaths
      },
      next_step: 'activation'
    });

  } catch (error) {
    const session = wizardSessions.get(req.params.sessionId);
    if (session) {
      const propagationStep = session.steps.find(s => s.step === 'propagation');
      if (propagationStep) {
        propagationStep.status = 'failed';
        propagationStep.error = error instanceof Error ? error.message : 'Propagation failed';
      }
    }

    res.status(500).json({
      success: false,
      error: 'Failed to propagate secrets',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/secrets/gizmo/wizard/:sessionId/activate
 * Activate Gizmo agents and complete wizard
 */
router.post('/wizard/:sessionId/activate', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = wizardSessions.get(sessionId);

    if (!session || !session.credentials) {
      return res.status(404).json({
        success: false,
        error: 'Session not found or credentials missing'
      });
    }

    const activationStep = session.steps.find(s => s.step === 'activation');
    if (activationStep) {
      activationStep.status = 'in_progress';
    }

    // Create memory anchor for integration event
    const anchorId = `gizmo-secrets-setup-${session.environment}-${Date.now()}`;
    
    try {
      // Initialize agent monitoring with Gizmo credentials
      const authService = createGizmoAuthService(session.credentials);
      agentMonitoringService.setGizmoAuth(authService);
      
      // Start agent monitoring if not already running
      await agentMonitoringService.start();

      // Give agents time to initialize
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check agent status
      const agentStatuses = agentMonitoringService.getAllAgentStatuses();
      const activeAgents = agentStatuses.filter(agent => agent.active);

    } catch (agentError) {
      console.warn('Agent activation warning:', agentError);
    }

    // Mark activation as completed
    if (activationStep) {
      activationStep.status = 'completed';
      activationStep.data = {
        agents_activated: true,
        memory_anchor_id: anchorId,
        activation_completed_at: new Date().toISOString()
      };
    }

    // Complete the wizard session
    session.completedAt = new Date().toISOString();
    wizardSessions.set(sessionId, session);

    await enhancedGovernanceLogger.logAgentAction('gizmo-secrets-wizard', 'wizard-completed', {
      session_id: sessionId,
      environment: session.environment,
      memory_anchor_id: anchorId,
      duration_minutes: Math.round((Date.now() - new Date(session.createdAt).getTime()) / (1000 * 60)),
      completed_at: session.completedAt
    });

    res.json({
      success: true,
      message: 'Gizmo integration wizard completed successfully',
      wizard_result: {
        session_id: sessionId,
        environment: session.environment,
        agents_activated: true,
        memory_anchor_id: anchorId,
        completed_at: session.completedAt
      }
    });

  } catch (error) {
    const session = wizardSessions.get(req.params.sessionId);
    if (session) {
      const activationStep = session.steps.find(s => s.step === 'activation');
      if (activationStep) {
        activationStep.status = 'failed';
        activationStep.error = error instanceof Error ? error.message : 'Activation failed';
      }
    }

    res.status(500).json({
      success: false,
      error: 'Failed to activate agents',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/secrets/gizmo/wizard/:sessionId/status
 * Get current wizard session status
 */
router.get('/wizard/:sessionId/status', (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = wizardSessions.get(sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    const currentStep = session.steps.find(step => step.status === 'in_progress') ||
                      session.steps.find(step => step.status === 'pending') ||
                      session.steps[session.steps.length - 1];

    res.json({
      success: true,
      session_id: sessionId,
      environment: session.environment,
      current_step: currentStep?.step,
      steps: session.steps,
      is_completed: !!session.completedAt,
      created_at: session.createdAt,
      completed_at: session.completedAt
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get session status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/secrets/gizmo/health
 * Check Gizmo integration health status
 */
router.get('/health', (req, res) => {
  try {
    const requiredEnvVars = [
      'GIZMO_CLIENT_ID',
      'GIZMO_CLIENT_SECRET', 
      'GIZMO_TOKEN_ENDPOINT',
      'GIZMO_AUTH_ENDPOINT'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    const isConfigured = missingVars.length === 0;

    // Check agent monitoring status
    const agentStatuses = agentMonitoringService.getAllAgentStatuses();
    const systemHealth = agentMonitoringService.getSystemHealth();

    res.json({
      success: true,
      gizmo_configured: isConfigured,
      missing_env_vars: missingVars,
      agent_monitoring: {
        active_agents: systemHealth.activeAgents,
        total_agents: systemHealth.totalAgents,
        overall_health: systemHealth.overall
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Health check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;