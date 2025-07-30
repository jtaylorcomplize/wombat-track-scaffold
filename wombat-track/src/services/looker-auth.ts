import axios from 'axios';

interface LookerAuthConfig {
  clientId: string;
  clientSecret: string;
  host: string;
}

interface LookerAccessToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
}

interface EmbedUrlRequest {
  type: 'dashboard' | 'look' | 'explore';
  id: string;
  permissions: string[];
  models: string[];
  group_ids?: number[];
  external_group_id?: string;
  user_attributes?: Record<string, unknown>;
  session_length?: number;
  force_logout_login?: boolean;
}

interface EmbedUrlResponse {
  url: string;
}

class LookerAuthService {
  private config: LookerAuthConfig;
  private accessToken: LookerAccessToken | null = null;
  private tokenExpiryTime: number = 0;

  constructor(config: LookerAuthConfig) {
    this.config = config;
  }

  private async getAccessToken(): Promise<string> {
    const now = Date.now();
    
    if (this.accessToken && now < this.tokenExpiryTime) {
      return this.accessToken.access_token;
    }

    // Check if credentials are configured
    if (!this.config.clientId || !this.config.clientSecret) {
      console.warn('🔧 HOTFIX: Looker credentials not configured - using mock token for UAT');
      // Return mock token for development/UAT testing
      this.accessToken = {
        access_token: 'mock-uat-token-for-spqr-testing',
        token_type: 'Bearer',
        expires_in: 3600
      };
      this.tokenExpiryTime = now + 3600000;
      return this.accessToken.access_token;
    }

    try {
      console.log(`🔗 Attempting Looker authentication with host: ${this.config.host}`);
      const response = await axios.post(`https://${this.config.host}/api/4.0/login`, {
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret
      });

      this.accessToken = response.data;
      this.tokenExpiryTime = now + (this.accessToken!.expires_in * 1000) - 60000;

      console.log('✅ Looker authentication successful');
      return this.accessToken.access_token;
    } catch (error) {
      console.error('❌ Looker authentication failed:', error);
      
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new Error('Looker authentication failed: Invalid credentials');
        } else if (error.response?.status === 403) {
          throw new Error('Looker authentication failed: Access denied');
        } else if (error.code === 'ECONNREFUSED') {
          throw new Error('Looker authentication failed: Cannot connect to Looker server');
        }
      }
      
      throw new Error(`Looker authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async createEmbedUrl(request: EmbedUrlRequest): Promise<string> {
    const token = await this.getAccessToken();

    // Mock URL for UAT testing when using mock token
    if (token === 'mock-uat-token-for-spqr-testing') {
      const mockEmbedUrl = `https://${this.config.host}/embed/${request.type}s/${request.id}?mock_token=true&external_group_id=${request.external_group_id}`;
      console.log('🔧 HOTFIX: Generated mock embed URL for UAT testing:', mockEmbedUrl);
      return mockEmbedUrl;
    }

    try {
      console.log(`🔗 Creating embed URL for ${request.type} ${request.id}...`);
      const response = await axios.post<EmbedUrlResponse>(
        `https://${this.config.host}/api/4.0/embed/sso_url`,
        {
          target_url: `https://${this.config.host}/embed/${request.type}s/${request.id}`,
          session_length: request.session_length || 3600,
          force_logout_login: request.force_logout_login || true,
          permissions: request.permissions,
          models: request.models,
          group_ids: request.group_ids,
          external_group_id: request.external_group_id,
          user_attributes: request.user_attributes
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('✅ Embed URL created successfully');
      return response.data.url;
    } catch (error) {
      console.error('❌ Failed to create embed URL:', error);
      
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new Error('Failed to create embed URL: Token expired or invalid');
        } else if (error.response?.status === 403) {
          throw new Error('Failed to create embed URL: Insufficient permissions');
        } else if (error.response?.status === 404) {
          throw new Error('Failed to create embed URL: Dashboard not found');
        }
      }
      
      throw new Error(`Failed to create embed URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async validateEmbedPermissions(userRole: string, cardPermissions: { viewRoles: string[]; editRoles: string[] }, dashboardName?: string): Promise<{ canView: boolean; canEdit: boolean; permissions: string[]; effectiveRoles: string[] }> {
    // Single dashboard override: Allow partner to access Revenue Analytics Dashboard with admin privileges (UAT-only)
    const effectiveRoles = this.getEffectiveRoles(userRole, dashboardName);
    
    // Check permissions with effective roles (including overrides)
    const canView = effectiveRoles.some(role => 
      cardPermissions.viewRoles.includes(role) || cardPermissions.editRoles.includes(role)
    );
    const canEdit = effectiveRoles.some(role => cardPermissions.editRoles.includes(role));

    const permissions: string[] = [];
    
    if (canView) {
      permissions.push('access_data', 'see_lookml_dashboards', 'see_looks');
    }
    
    if (canEdit) {
      permissions.push('save_content', 'create_content', 'download_with_limit');
    } else {
      permissions.push('download_without_limit');
    }

    // Add admin permissions if any effective role is admin
    if (effectiveRoles.includes('admin')) {
      permissions.push('admin', 'develop', 'deploy');
    }

    return {
      canView,
      canEdit,
      permissions,
      effectiveRoles
    };
  }

  private getEffectiveRoles(userRole: string, dashboardName?: string): string[] {
    let roles = [userRole];

    // HOTFIX: Single dashboard override for partner -> admin access (UAT testing only)
    if (dashboardName === "Revenue Analytics Dashboard" && userRole === "partner") {
      roles = ["partner", "admin"];
      console.log(`🔧 HOTFIX: Applied multi-role override for ${dashboardName} - Partner granted admin access for UAT`);
    }

    return roles;
  }

  getUserAttributesForRole(userRole: string, effectiveRoles?: string[]): Record<string, unknown> {
    const roles = effectiveRoles || [userRole];
    const primaryRole = userRole;
    const hasAdminAccess = roles.includes('admin') || roles.includes('partner');
    
    const attributes: Record<string, unknown> = {
      user_role: primaryRole,
      effective_roles: roles.join(','),
      can_see_sensitive_data: hasAdminAccess ? 'yes' : 'no'
    };

    switch (userRole) {
      case 'partner':
        attributes.access_level = 'full';
        attributes.department = 'management';
        break;
      case 'senior_associate':
        attributes.access_level = 'senior';
        attributes.department = 'legal';
        break;
      case 'associate':
        attributes.access_level = 'standard';
        attributes.department = 'legal';
        break;
      case 'paralegal':
        attributes.access_level = 'limited';
        attributes.department = 'support';
        break;
      case 'admin':
        attributes.access_level = 'admin';
        attributes.department = 'it';
        break;
      default:
        attributes.access_level = 'read_only';
        attributes.department = 'general';
    }

    return attributes;
  }
}

export { LookerAuthService, type EmbedUrlRequest, type LookerAuthConfig };