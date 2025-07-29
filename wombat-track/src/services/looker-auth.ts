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
  user_attributes?: Record<string, any>;
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

    try {
      const response = await axios.post(`https://${this.config.host}/api/4.0/login`, {
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret
      });

      this.accessToken = response.data;
      this.tokenExpiryTime = now + (this.accessToken!.expires_in * 1000) - 60000;

      return this.accessToken.access_token;
    } catch (error) {
      console.error('Failed to authenticate with Looker:', error);
      throw new Error('Looker authentication failed');
    }
  }

  async createEmbedUrl(request: EmbedUrlRequest): Promise<string> {
    const token = await this.getAccessToken();

    try {
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

      return response.data.url;
    } catch (error) {
      console.error('Failed to create embed URL:', error);
      throw new Error('Failed to create embed URL');
    }
  }

  async validateEmbedPermissions(userRole: string, cardPermissions: { viewRoles: string[]; editRoles: string[] }): Promise<{ canView: boolean; canEdit: boolean; permissions: string[] }> {
    const canView = cardPermissions.viewRoles.includes(userRole) || cardPermissions.editRoles.includes(userRole);
    const canEdit = cardPermissions.editRoles.includes(userRole);

    const permissions: string[] = [];
    
    if (canView) {
      permissions.push('access_data', 'see_lookml_dashboards', 'see_looks');
    }
    
    if (canEdit) {
      permissions.push('save_content', 'create_content', 'download_with_limit');
    } else {
      permissions.push('download_without_limit');
    }

    if (userRole === 'admin') {
      permissions.push('admin', 'develop', 'deploy');
    }

    return {
      canView,
      canEdit,
      permissions
    };
  }

  getUserAttributesForRole(userRole: string): Record<string, any> {
    const attributes: Record<string, any> = {
      user_role: userRole,
      can_see_sensitive_data: ['partner', 'admin'].includes(userRole) ? 'yes' : 'no'
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