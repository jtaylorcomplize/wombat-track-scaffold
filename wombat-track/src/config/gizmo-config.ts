/**
 * Gizmo Integration Configuration
 * Centralized configuration for Gizmo OAuth2 authentication and agent integration
 */

import { createGizmoAuthService, GizmoAgentRoles } from '../services/gizmo-auth';
import type { GizmoAgentCredentials, GizmoAuthConfig } from '../services/gizmo-auth';

/**
 * Load Gizmo credentials from environment variables or oApp secrets
 */
function loadGizmoCredentials(): GizmoAgentCredentials {
  const clientId = process.env.GIZMO_CLIENT_ID;
  const clientSecret = process.env.GIZMO_CLIENT_SECRET;
  const tokenEndpoint = process.env.GIZMO_TOKEN_ENDPOINT;
  const authEndpoint = process.env.GIZMO_AUTH_ENDPOINT;

  if (!clientId || !clientSecret || !tokenEndpoint || !authEndpoint) {
    throw new Error(
      'Missing required Gizmo OAuth2 configuration. Please ensure GIZMO_CLIENT_ID, ' +
      'GIZMO_CLIENT_SECRET, GIZMO_TOKEN_ENDPOINT, and GIZMO_AUTH_ENDPOINT are set.'
    );
  }

  // Parse scopes from environment or use default
  const scopesString = process.env.GIZMO_AGENT_SCOPES || GizmoAgentRoles.MEMORY_AGENT.join(',');
  const scopes = scopesString.split(',').map(scope => scope.trim());

  return {
    clientId,
    clientSecret,
    scopes,
    tokenEndpoint,
    authEndpoint,
    revokeEndpoint: process.env.GIZMO_REVOKE_ENDPOINT,
    redirectUri: process.env.GIZMO_REDIRECT_URI
  };
}

/**
 * Load Gizmo authentication configuration
 */
function loadGizmoAuthConfig(): Partial<GizmoAuthConfig> {
  return {
    autoRefresh: process.env.GIZMO_AUTO_REFRESH !== 'false',
    refreshThreshold: parseInt(process.env.GIZMO_REFRESH_THRESHOLD || '300'),
    retryAttempts: parseInt(process.env.GIZMO_RETRY_ATTEMPTS || '3'),
    timeout: parseInt(process.env.GIZMO_REQUEST_TIMEOUT || '10000')
  };
}

/**
 * Environment-specific configurations
 */
export const GizmoEnvironments = {
  development: {
    // Development environment typically uses mock or staging Gizmo instance
    mockMode: process.env.NODE_ENV === 'development' && !process.env.GIZMO_PRODUCTION_MODE,
    debugLogging: true,
    tokenRefreshThreshold: 600, // 10 minutes for development
    requestTimeout: 15000 // Longer timeout for debugging
  },
  
  staging: {
    mockMode: false,
    debugLogging: true,
    tokenRefreshThreshold: 300, // 5 minutes
    requestTimeout: 10000
  },
  
  production: {
    mockMode: false,
    debugLogging: false,
    tokenRefreshThreshold: 300, // 5 minutes
    requestTimeout: 8000 // Shorter timeout for production
  }
} as const;

/**
 * Get current environment configuration
 */
function getCurrentEnvironmentConfig() {
  const env = process.env.NODE_ENV as keyof typeof GizmoEnvironments;
  return GizmoEnvironments[env] || GizmoEnvironments.development;
}

/**
 * Create and configure Gizmo authentication service
 */
function createConfiguredGizmoAuthService() {
  try {
    const credentials = loadGizmoCredentials();
    const authConfig = loadGizmoAuthConfig();
    const envConfig = getCurrentEnvironmentConfig();

    // Merge configurations with environment-specific overrides
    const finalConfig: Partial<GizmoAuthConfig> = {
      ...authConfig,
      refreshThreshold: envConfig.tokenRefreshThreshold,
      timeout: envConfig.requestTimeout
    };

    const authService = createGizmoAuthService(credentials, finalConfig);

    // Add environment-specific event handlers
    if (envConfig.debugLogging) {
      authService.on('token-acquired', (data) => {
        console.log('🔐 Gizmo OAuth2: Token acquired', {
          token_type: data.token_type,
          expires_in: data.expires_in,
          scope: data.scope
        });
      });

      authService.on('token-refreshed', (data) => {
        console.log('🔄 Gizmo OAuth2: Token refreshed', {
          expires_in: data.expires_in,
          scope: data.scope
        });
      });

      authService.on('auth-error', (error) => {
        console.error('❌ Gizmo OAuth2: Authentication error', error);
      });

      authService.on('initialized', (data) => {
        console.log('✅ Gizmo OAuth2: Service initialized', data);
      });
    }

    return authService;

  } catch (error) {
    console.error('❌ Failed to create Gizmo auth service:', error);
    
    if (getCurrentEnvironmentConfig().mockMode) {
      console.log('🔧 Running in mock mode - Gizmo integration will use simulated responses');
      return null; // Return null to indicate mock mode
    }
    
    throw error;
  }
}

/**
 * Agent-specific Gizmo configurations
 */
export const AgentGizmoConfigs = {
  'memory-anchor-agent': {
    scopes: GizmoAgentRoles.MEMORY_AGENT,
    endpoints: {
      submit: process.env.GIZMO_MEMORY_ENDPOINT || 'http://localhost:3003/memory',
      status: process.env.GIZMO_STATUS_ENDPOINT || 'http://localhost:3003/status'
    },
    batchSize: 10,
    retryDelay: 2000
  },
  
  'auto-audit-agent': {
    scopes: GizmoAgentRoles.AUDIT_AGENT,
    endpoints: {
      submit: process.env.GIZMO_AUDIT_ENDPOINT || 'http://localhost:3003/audit',
      compliance: process.env.GIZMO_COMPLIANCE_ENDPOINT || 'http://localhost:3003/compliance'
    },
    batchSize: 5,
    retryDelay: 3000
  },
  
  'side-quest-detector': {
    scopes: GizmoAgentRoles.SIDE_QUEST_AGENT,
    endpoints: {
      detection: process.env.GIZMO_DETECTION_ENDPOINT || 'http://localhost:3003/detection',
      classification: process.env.GIZMO_CLASSIFICATION_ENDPOINT || 'http://localhost:3003/classification'
    },
    batchSize: 20,
    retryDelay: 1000
  }
} as const;

/**
 * Gizmo integration health check configuration
 */
export const GizmoHealthCheck = {
  enabled: process.env.GIZMO_HEALTH_CHECK_ENABLED !== 'false',
  interval: parseInt(process.env.GIZMO_HEALTH_CHECK_INTERVAL || '60000'), // 1 minute
  timeout: parseInt(process.env.GIZMO_HEALTH_CHECK_TIMEOUT || '5000'), // 5 seconds
  endpoint: process.env.GIZMO_HEALTH_ENDPOINT || 'http://localhost:3003/health',
  retryAttempts: 3,
  alertThreshold: 3 // Alert after 3 consecutive failures
} as const;

/**
 * Export configured Gizmo auth service
 */
export const gizmoAuthService = createConfiguredGizmoAuthService();

/**
 * Export configuration helpers
 */
export {
  loadGizmoCredentials,
  loadGizmoAuthConfig,
  getCurrentEnvironmentConfig
};

/**
 * Export types for agent implementations
 */
export type {
  GizmoAgentCredentials,
  GizmoAuthConfig
} from '../services/gizmo-auth';