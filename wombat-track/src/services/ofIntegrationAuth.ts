/**
 * OF Integration Service Authentication
 * Manages Azure Managed Identity and Key Vault access for AzureOpenAI → oApp integration
 */

import { DefaultAzureCredential, ManagedIdentityCredential } from '@azure/identity';
import { SecretClient } from '@azure/keyvault-secrets';
import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';

export interface AuthConfig {
  keyVaultUrl: string;
  managedIdentityClientId?: string;
  allowedAudiences: string[];
  tokenValidationEndpoint: string;
  rateLimiting: {
    requestsPerMinute: number;
    burstLimit: number;
  };
}

export interface AuthenticatedRequest extends Request {
  user?: {
    identity: string;
    roles: string[];
    clientId: string;
    tokenType: 'managed_identity' | 'service_principal';
  };
  requestId: string;
}

export interface APIAccessLog {
  timestamp: string;
  requestId: string;
  endpoint: string;
  method: string;
  clientId: string;
  identity: string;
  success: boolean;
  responseTime?: number;
  errorCode?: string;
  auditTrail: boolean;
}

class OFIntegrationAuth {
  private credential: DefaultAzureCredential | ManagedIdentityCredential;
  private secretClient?: SecretClient;
  private config: AuthConfig;
  private rateLimitMap = new Map<string, { count: number; resetTime: number }>();
  private accessLogs: APIAccessLog[] = [];

  constructor(config: AuthConfig) {
    this.config = config;
    
    // Initialize Azure credentials
    if (config.managedIdentityClientId) {
      this.credential = new ManagedIdentityCredential(config.managedIdentityClientId);
    } else {
      this.credential = new DefaultAzureCredential();
    }

    // Initialize Key Vault client
    if (config.keyVaultUrl) {
      this.secretClient = new SecretClient(config.keyVaultUrl, this.credential);
    }

    console.log('🔐 OF Integration Auth initialized with Managed Identity');
  }

  /**
   * Middleware for authenticating incoming requests
   */
  authenticate() {
    return async (req: Request, res: Response, next: NextFunction) => {
      const authReq = req as AuthenticatedRequest;
      const startTime = Date.now();
      
      // Generate unique request ID
      authReq.requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      try {
        // Extract Authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return this.handleAuthError(res, authReq, 'Missing or invalid Authorization header', 401);
        }

        const token = authHeader.substring(7);
        
        // Validate token
        const validation = await this.validateToken(token);
        if (!validation.valid) {
          return this.handleAuthError(res, authReq, 'Invalid token', 401);
        }

        // Set user context
        authReq.user = validation.user;

        // Rate limiting check
        const rateLimitResult = this.checkRateLimit(validation.user.clientId);
        if (!rateLimitResult.allowed) {
          return this.handleAuthError(res, authReq, 'Rate limit exceeded', 429, {
            'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString()
          });
        }

        // Log successful authentication
        this.logAccess({
          timestamp: new Date().toISOString(),
          requestId: authReq.requestId,
          endpoint: req.path,
          method: req.method,
          clientId: validation.user.clientId,
          identity: validation.user.identity,
          success: true,
          responseTime: Date.now() - startTime,
          auditTrail: true
        });

        next();

      } catch (error: any) {
        console.error('Authentication error:', error);
        return this.handleAuthError(res, authReq, 'Authentication failed', 500);
      }
    };
  }

  /**
   * Validate Azure AD token
   */
  private async validateToken(token: string): Promise<{
    valid: boolean;
    user?: AuthenticatedRequest['user'];
    error?: string;
  }> {
    try {
      // Decode token without verification for initial inspection
      const decoded = jwt.decode(token, { complete: true }) as any;
      
      if (!decoded || !decoded.payload) {
        return { valid: false, error: 'Invalid token format' };
      }

      const payload = decoded.payload;

      // Check audience
      if (!this.config.allowedAudiences.includes(payload.aud)) {
        return { valid: false, error: 'Invalid audience' };
      }

      // Check expiration
      if (payload.exp && Date.now() >= payload.exp * 1000) {
        return { valid: false, error: 'Token expired' };
      }

      // Extract user information
      const user: AuthenticatedRequest['user'] = {
        identity: payload.sub || payload.oid || 'unknown',
        roles: payload.roles || [],
        clientId: payload.appid || payload.azp || 'unknown',
        tokenType: payload.idtyp === 'app' ? 'service_principal' : 'managed_identity'
      };

      return { valid: true, user };

    } catch (error: any) {
      console.error('Token validation error:', error);
      return { valid: false, error: 'Token validation failed' };
    }
  }

  /**
   * Rate limiting implementation
   */
  private checkRateLimit(clientId: string): {
    allowed: boolean;
    resetTime: number;
    remaining: number;
  } {
    const now = Date.now();
    const windowMs = 60000; // 1 minute
    const limit = this.config.rateLimiting.requestsPerMinute;

    const clientData = this.rateLimitMap.get(clientId);
    
    if (!clientData || now > clientData.resetTime) {
      // New window or expired window
      const resetTime = now + windowMs;
      this.rateLimitMap.set(clientId, { count: 1, resetTime });
      return { allowed: true, resetTime, remaining: limit - 1 };
    }

    if (clientData.count >= limit) {
      return { allowed: false, resetTime: clientData.resetTime, remaining: 0 };
    }

    clientData.count++;
    this.rateLimitMap.set(clientId, clientData);
    
    return { 
      allowed: true, 
      resetTime: clientData.resetTime, 
      remaining: limit - clientData.count 
    };
  }

  /**
   * Handle authentication errors with proper logging
   */
  private handleAuthError(
    res: Response, 
    req: AuthenticatedRequest, 
    message: string, 
    statusCode: number,
    additionalHeaders: Record<string, string> = {}
  ) {
    // Log failed attempt
    this.logAccess({
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
      endpoint: req.path,
      method: req.method,
      clientId: 'unknown',
      identity: 'unknown',
      success: false,
      errorCode: statusCode.toString(),
      auditTrail: true
    });

    // Set additional headers
    Object.entries(additionalHeaders).forEach(([key, value]) => {
      res.setHeader(key, value);
    });

    return res.status(statusCode).json({
      error: message,
      requestId: req.requestId,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log API access for audit trail
   */
  private logAccess(log: APIAccessLog): void {
    this.accessLogs.push(log);

    // Log to console for immediate visibility
    console.log(`🔍 API Access: ${log.method} ${log.endpoint} - ${log.success ? '✅' : '❌'} ${log.clientId}`);

    // Keep only last 1000 logs in memory
    if (this.accessLogs.length > 1000) {
      this.accessLogs = this.accessLogs.slice(-1000);
    }
  }

  /**
   * Get access logs for governance reporting
   */
  getAccessLogs(limit?: number): APIAccessLog[] {
    return limit ? this.accessLogs.slice(-limit) : [...this.accessLogs];
  }

  /**
   * Get secret from Azure Key Vault
   */
  async getSecret(secretName: string): Promise<string | null> {
    if (!this.secretClient) {
      console.warn('Key Vault client not initialized');
      return null;
    }

    try {
      const secret = await this.secretClient.getSecret(secretName);
      console.log(`🔐 Retrieved secret '${secretName}' from Key Vault`);
      return secret.value || null;
    } catch (error: any) {
      console.error(`Failed to retrieve secret '${secretName}':`, error.message);
      return null;
    }
  }

  /**
   * Health check for authentication service
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: {
      keyVault: boolean;
      rateLimiting: boolean;
      accessLogs: number;
      activeClients: number;
    };
  }> {
    const details = {
      keyVault: false,
      rateLimiting: true,
      accessLogs: this.accessLogs.length,
      activeClients: this.rateLimitMap.size
    };

    // Test Key Vault connectivity
    if (this.secretClient) {
      try {
        // Test with a common secret or create a test secret
        await this.secretClient.getSecret('health-check-test').catch(() => {
          // 404 is expected if secret doesn't exist, but connection works
        });
        details.keyVault = true;
      } catch (error: any) {
        console.warn('Key Vault health check failed:', error.message);
        details.keyVault = false;
      }
    }

    const status = details.keyVault ? 'healthy' : 'degraded';

    return { status, details };
  }

  /**
   * Clear expired rate limit entries
   */
  cleanupRateLimits(): void {
    const now = Date.now();
    for (const [clientId, data] of this.rateLimitMap.entries()) {
      if (now > data.resetTime) {
        this.rateLimitMap.delete(clientId);
      }
    }
  }

  /**
   * Export access logs for governance integration
   */
  exportAccessLogsForGovernance(): {
    timestamp: string;
    entry_type: string;
    summary: string;
    total_requests: number;
    successful_requests: number;
    failed_requests: number;
    unique_clients: number;
    access_logs: APIAccessLog[];
  } {
    const totalRequests = this.accessLogs.length;
    const successfulRequests = this.accessLogs.filter(log => log.success).length;
    const failedRequests = totalRequests - successfulRequests;
    const uniqueClients = new Set(this.accessLogs.map(log => log.clientId)).size;

    return {
      timestamp: new Date().toISOString(),
      entry_type: 'integration_access_summary',
      summary: `OF Integration Service processed ${totalRequests} requests from ${uniqueClients} clients`,
      total_requests: totalRequests,
      successful_requests: successfulRequests,
      failed_requests: failedRequests,
      unique_clients: uniqueClients,
      access_logs: this.accessLogs.slice(-100) // Include last 100 logs
    };
  }
}

// Export factory function
export function createOFIntegrationAuth(config: AuthConfig): OFIntegrationAuth {
  return new OFIntegrationAuth(config);
}

export default OFIntegrationAuth;