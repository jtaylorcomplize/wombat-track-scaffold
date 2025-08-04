/**
 * Gizmo OAuth2 Authentication Service
 * Handles authentication and authorization for Gizmo AI agent integration
 * Implements OAuth2 with least privilege access and secure token management
 */

import type { AxiosInstance } from 'axios';
import axios from 'axios';
import { EventEmitter } from 'events';

export interface GizmoAgentCredentials {
  clientId: string;
  clientSecret: string;
  scopes: string[];
  tokenEndpoint: string;
  authEndpoint: string;
  revokeEndpoint?: string;
  redirectUri?: string;
}

export interface GizmoAccessToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
  issued_at: number;
}

export interface GizmoAuthConfig {
  credentials: GizmoAgentCredentials;
  autoRefresh: boolean;
  refreshThreshold: number; // seconds before expiry to refresh
  retryAttempts: number;
  timeout: number; // milliseconds
}

export interface GizmoUserInfo {
  id: string;
  username: string;
  email?: string;
  roles: string[];
  permissions: string[];
  agentScopes: string[];
}

export interface GizmoAuthError {
  error: string;
  error_description?: string;
  error_uri?: string;
  statusCode?: number;
}

export class GizmoAuthService extends EventEmitter {
  private config: GizmoAuthConfig;
  private accessToken: GizmoAccessToken | null = null;
  private refreshTimer?: NodeJS.Timeout;
  private httpClient: AxiosInstance;
  private isInitialized: boolean = false;

  constructor(config: GizmoAuthConfig) {
    super();
    
    this.config = config;
    
    // Create HTTP client with default configuration
    this.httpClient = axios.create({
      timeout: config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'WombatTrack-GizmoAgent/1.0'
      }
    });

    // Add request interceptor for automatic token inclusion
    this.httpClient.interceptors.request.use(
      async (config) => {
        if (this.accessToken && this.isTokenValid()) {
          config.headers.Authorization = `${this.accessToken.token_type} ${this.accessToken.access_token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor for token refresh on 401
    this.httpClient.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401 && this.accessToken?.refresh_token) {
          try {
            await this.refreshAccessToken();
            // Retry the original request
            error.config.headers.Authorization = `${this.accessToken!.token_type} ${this.accessToken!.access_token}`;
            return this.httpClient.request(error.config);
          } catch (refreshError) {
            this.emit('auth-error', { 
              error: 'token_refresh_failed', 
              originalError: error,
              refreshError 
            });
            return Promise.reject(error);
          }
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Initialize the authentication service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Validate configuration
      this.validateConfig();
      
      // Load existing token if available
      await this.loadStoredToken();
      
      // If no valid token, perform initial authentication
      if (!this.accessToken || !this.isTokenValid()) {
        await this.authenticateClientCredentials();
      }

      // Set up automatic token refresh
      if (this.config.autoRefresh) {
        this.setupTokenRefresh();
      }

      this.isInitialized = true;
      this.emit('initialized', { timestamp: new Date().toISOString() });

    } catch {
      this.emit('initialization-error', error);
      throw error;
    }
  }

  /**
   * Authenticate using client credentials flow (for agent-to-agent communication)
   */
  async authenticateClientCredentials(): Promise<GizmoAccessToken> {
    try {
      const response = await axios.post(
        this.config.credentials.tokenEndpoint,
        new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.config.credentials.clientId,
          client_secret: this.config.credentials.clientSecret,
          scope: this.config.credentials.scopes.join(' ')
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          timeout: this.config.timeout
        }
      );

      const tokenData = response.data;
      this.accessToken = {
        ...tokenData,
        issued_at: Math.floor(Date.now() / 1000)
      };

      // Store token securely
      await this.storeToken(this.accessToken);

      this.emit('token-acquired', { 
        token_type: this.accessToken.token_type,
        expires_in: this.accessToken.expires_in,
        scope: this.accessToken.scope
      });

      return this.accessToken;

    } catch {
      const authError = this.parseAuthError(error);
      this.emit('auth-error', authError);
      throw authError;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(): Promise<GizmoAccessToken> {
    if (!this.accessToken?.refresh_token) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await axios.post(
        this.config.credentials.tokenEndpoint,
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: this.accessToken.refresh_token,
          client_id: this.config.credentials.clientId,
          client_secret: this.config.credentials.clientSecret
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          timeout: this.config.timeout
        }
      );

      const tokenData = response.data;
      this.accessToken = {
        ...tokenData,
        issued_at: Math.floor(Date.now() / 1000),
        // Keep existing refresh token if not provided
        refresh_token: tokenData.refresh_token || this.accessToken.refresh_token
      };

      await this.storeToken(this.accessToken);

      this.emit('token-refreshed', {
        expires_in: this.accessToken.expires_in,
        scope: this.accessToken.scope
      });

      return this.accessToken;

    } catch {
      const authError = this.parseAuthError(error);
      this.emit('token-refresh-error', authError);
      throw authError;
    }
  }

  /**
   * Get current user information
   */
  async getUserInfo(): Promise<GizmoUserInfo> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await this.httpClient.get('/auth/userinfo');
      return response.data;
    } catch {
      this.emit('userinfo-error', error);
      throw error;
    }
  }

  /**
   * Revoke access token
   */
  async revokeToken(): Promise<void> {
    if (!this.accessToken || !this.config.credentials.revokeEndpoint) {
      return;
    }

    try {
      await axios.post(
        this.config.credentials.revokeEndpoint,
        new URLSearchParams({
          token: this.accessToken.access_token,
          token_type_hint: 'access_token',
          client_id: this.config.credentials.clientId,
          client_secret: this.config.credentials.clientSecret
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      this.accessToken = null;
      await this.clearStoredToken();
      
      if (this.refreshTimer) {
        clearTimeout(this.refreshTimer);
        this.refreshTimer = undefined;
      }

      this.emit('token-revoked', { timestamp: new Date().toISOString() });

    } catch {
      this.emit('revocation-error', error);
      throw error;
    }
  }

  /**
   * Check if currently authenticated with valid token
   */
  isAuthenticated(): boolean {
    return this.accessToken !== null && this.isTokenValid();
  }

  /**
   * Check if token is still valid
   */
  isTokenValid(): boolean {
    if (!this.accessToken) {
      return false;
    }

    const now = Math.floor(Date.now() / 1000);
    const expiresAt = this.accessToken.issued_at + this.accessToken.expires_in;
    
    return now < expiresAt;
  }

  /**
   * Get time until token expires (in seconds)
   */
  getTokenExpiresIn(): number {
    if (!this.accessToken) {
      return 0;
    }

    const now = Math.floor(Date.now() / 1000);
    const expiresAt = this.accessToken.issued_at + this.accessToken.expires_in;
    
    return Math.max(0, expiresAt - now);
  }

  /**
   * Get configured HTTP client with authentication
   */
  getHttpClient(): AxiosInstance {
    return this.httpClient;
  }

  /**
   * Get current access token (for debugging/monitoring)
   */
  getTokenInfo(): { hasToken: boolean; expiresIn: number; scope?: string } {
    return {
      hasToken: this.accessToken !== null,
      expiresIn: this.getTokenExpiresIn(),
      scope: this.accessToken?.scope
    };
  }

  /**
   * Private helper methods
   */
  private validateConfig(): void {
    const required = ['clientId', 'clientSecret', 'tokenEndpoint', 'scopes'];
    
    for (const field of required) {
      if (!this.config.credentials[field as keyof GizmoAgentCredentials]) {
        throw new Error(`Missing required Gizmo credentials field: ${field}`);
      }
    }

    if (!Array.isArray(this.config.credentials.scopes) || this.config.credentials.scopes.length === 0) {
      throw new Error('At least one scope must be specified');
    }
  }

  private async loadStoredToken(): Promise<void> {
    try {
      // In production, this would load from secure storage (e.g., encrypted file, keychain)
      // For now, we'll use a simple approach
      const tokenData = process.env.GIZMO_STORED_TOKEN;
      
      if (tokenData) {
        this.accessToken = JSON.parse(Buffer.from(tokenData, 'base64').toString());
      }
    } catch {
      // Ignore errors when loading stored token
      this.accessToken = null;
    }
  }

  private async storeToken(token: GizmoAccessToken): Promise<void> {
    try {
      // In production, store securely encrypted
      // For now, we'll use a simple base64 encoding
      const tokenData = Buffer.from(JSON.stringify(token)).toString('base64');
      
      // This would typically be stored in secure storage
      process.env.GIZMO_STORED_TOKEN = tokenData;
      
    } catch {
      this.emit('token-storage-error', error);
    }
  }

  private async clearStoredToken(): Promise<void> {
    try {
      delete process.env.GIZMO_STORED_TOKEN;
    } catch {
      this.emit('token-storage-error', error);
    }
  }

  private setupTokenRefresh(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    if (!this.accessToken) {
      return;
    }

    const refreshIn = Math.max(
      this.getTokenExpiresIn() - this.config.refreshThreshold,
      30 // Minimum 30 seconds
    );

    this.refreshTimer = setTimeout(async () => {
      try {
        await this.refreshAccessToken();
        this.setupTokenRefresh(); // Schedule next refresh
      } catch {
        this.emit('auto-refresh-error', error);
        // Try to re-authenticate
        try {
          await this.authenticateClientCredentials();
          this.setupTokenRefresh();
        } catch (authError) {
          this.emit('re-authentication-failed', authError);
        }
      }
    }, refreshIn * 1000);
  }

  private parseAuthError(error: unknown): GizmoAuthError {
    const errorObj = error as Record<string, unknown>;
    if (errorObj.response && typeof errorObj.response === 'object' && errorObj.response !== null) {
      const response = errorObj.response as Record<string, unknown>;
      return {
        ...(response.data as Record<string, unknown>),
        statusCode: response.status
      };
    } else if (errorObj.message) {
      return {
        error: 'network_error',
        error_description: String(errorObj.message)
      };
    } else {
      return {
        error: 'unknown_error',
        error_description: 'An unknown authentication error occurred'
      };
    }
  }
}

/**
 * Default Gizmo authentication configuration
 */
export const defaultGizmoAuthConfig: Partial<GizmoAuthConfig> = {
  autoRefresh: true,
  refreshThreshold: 300, // 5 minutes before expiry
  retryAttempts: 3,
  timeout: 10000 // 10 seconds
};

/**
 * Factory function to create Gizmo auth service
 */
export function createGizmoAuthService(
  credentials: GizmoAgentCredentials,
  config?: Partial<GizmoAuthConfig>
): GizmoAuthService {
  const fullConfig: GizmoAuthConfig = {
    credentials,
    ...defaultGizmoAuthConfig,
    ...config
  };

  return new GizmoAuthService(fullConfig);
}

/**
 * Gizmo-specific scopes for different agent operations
 */
export const GizmoScopes = {
  MEMORY_READ: 'memory:read',
  MEMORY_WRITE: 'memory:write',
  MEMORY_ADMIN: 'memory:admin',
  AGENT_EXECUTE: 'agent:execute',
  AGENT_MONITOR: 'agent:monitor',
  GOVERNANCE_READ: 'governance:read',
  GOVERNANCE_WRITE: 'governance:write',
  PROJECT_READ: 'project:read',
  PROJECT_WRITE: 'project:write'
} as const;

/**
 * Predefined scope combinations for common agent roles
 */
export const GizmoAgentRoles = {
  MEMORY_AGENT: [GizmoScopes.MEMORY_READ, GizmoScopes.MEMORY_WRITE, GizmoScopes.GOVERNANCE_READ],
  AUDIT_AGENT: [GizmoScopes.GOVERNANCE_READ, GizmoScopes.GOVERNANCE_WRITE, GizmoScopes.PROJECT_READ],
  SIDE_QUEST_AGENT: [GizmoScopes.PROJECT_READ, GizmoScopes.PROJECT_WRITE, GizmoScopes.GOVERNANCE_READ],
  MONITOR_AGENT: [GizmoScopes.AGENT_MONITOR, GizmoScopes.GOVERNANCE_READ],
  ADMIN_AGENT: [GizmoScopes.MEMORY_ADMIN, GizmoScopes.AGENT_EXECUTE, GizmoScopes.PROJECT_WRITE]
} as const;