/**
 * Secrets Propagation Service
 * Handles deployment of secrets to CI/CD pipelines and runtime environments
 */

import { promises as fs } from 'fs';
import path from 'path';
import { enhancedGovernanceLogger } from './enhancedGovernanceLogger';

export interface SecretsPropagationConfig {
  environment: 'development' | 'staging' | 'production';
  secrets: Record<string, string>;
  targetPaths: {
    envFile: string;
    cicdConfig?: string;
    k8sSecrets?: string;
    dockerCompose?: string;
  };
  backup: boolean;
  encrypt: boolean;
}

export interface PropagationResult {
  success: boolean;
  variablesAdded: string[];
  variablesUpdated: string[];
  backupCreated: boolean;
  errors: string[];
  targetFilesPaths: string[];
}

export class SecretsPropagationService {
  private static instance: SecretsPropagationService;

  static getInstance(): SecretsPropagationService {
    if (!SecretsPropagationService.instance) {
      SecretsPropagationService.instance = new SecretsPropagationService();
    }
    return SecretsPropagationService.instance;
  }

  /**
   * Propagate secrets to multiple targets
   */
  async propagateSecrets(config: SecretsPropagationConfig): Promise<PropagationResult> {
    const result: PropagationResult = {
      success: false,
      variablesAdded: [],
      variablesUpdated: [],
      backupCreated: false,
      errors: [],
      targetFilesPaths: []
    };

    try {
      await enhancedGovernanceLogger.logAgentAction('secrets-propagation', 'start', {
        environment: config.environment,
        secrets_count: Object.keys(config.secrets).length,
        targets: Object.keys(config.targetPaths)
      });

      // 1. Backup existing files if requested
      if (config.backup) {
        await this.createBackups(config, result);
      }

      // 2. Update .env file
      if (config.targetPaths.envFile) {
        await this.updateEnvFile(config, result);
      }

      // 3. Update CI/CD configuration
      if (config.targetPaths.cicdConfig) {
        await this.updateCICDConfig(config, result);
      }

      // 4. Update Kubernetes secrets
      if (config.targetPaths.k8sSecrets) {
        await this.updateK8sSecrets(config, result);
      }

      // 5. Update Docker Compose
      if (config.targetPaths.dockerCompose) {
        await this.updateDockerCompose(config, result);
      }

      result.success = result.errors.length === 0;

      await enhancedGovernanceLogger.logAgentAction('secrets-propagation', 'complete', {
        environment: config.environment,
        success: result.success,
        variables_added: result.variablesAdded.length,
        variables_updated: result.variablesUpdated.length,
        errors_count: result.errors.length
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(errorMessage);
      result.success = false;

      await enhancedGovernanceLogger.logAgentAction('secrets-propagation', 'error', {
        environment: config.environment,
        error: errorMessage
      });
    }

    return result;
  }

  /**
   * Create backups of existing configuration files
   */
  private async createBackups(config: SecretsPropagationConfig, result: PropagationResult): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    for (const [type, filePath] of Object.entries(config.targetPaths)) {
      if (filePath) {
        try {
          const exists = await fs.access(filePath).then(() => true).catch(() => false);
          if (exists) {
            const backupPath = `${filePath}.backup.${timestamp}`;
            await fs.copyFile(filePath, backupPath);
            console.log(`✅ Backup created: ${backupPath}`);
          }
        } catch (error) {
          result.errors.push(`Failed to backup ${type}: ${error}`);
        }
      }
    }
    
    result.backupCreated = true;
  }

  /**
   * Update .env file with new secrets
   */
  private async updateEnvFile(config: SecretsPropagationConfig, result: PropagationResult): Promise<void> {
    try {
      const envPath = config.targetPaths.envFile;
      
      // Read existing .env content
      let envContent = '';
      try {
        envContent = await fs.readFile(envPath, 'utf-8');
      } catch {
        // File doesn't exist, create new
        envContent = '';
      }

      
      // Add Gizmo section header if not exists
      if (!envContent.includes('# Gizmo OAuth2 Integration')) {
        envContent += '\n# Gizmo OAuth2 Integration\n';
      }

      // Update or add each secret
      for (const [key, value] of Object.entries(config.secrets)) {
        const regex = new RegExp(`^${key}=.*$`, 'm');
        
        if (regex.test(envContent)) {
          // Update existing variable
          envContent = envContent.replace(regex, `${key}=${value}`);
          result.variablesUpdated.push(key);
        } else {
          // Add new variable
          envContent += `${key}=${value}\n`;
          result.variablesAdded.push(key);
        }
      }

      // Write updated content
      await fs.writeFile(envPath, envContent);
      result.targetFilesPaths.push(envPath);

    } catch (error) {
      result.errors.push(`Failed to update .env file: ${error}`);
    }
  }

  /**
   * Update CI/CD configuration (GitHub Actions, GitLab CI, etc.)
   */
  private async updateCICDConfig(config: SecretsPropagationConfig, result: PropagationResult): Promise<void> {
    try {
      const cicdPath = config.targetPaths.cicdConfig!;
      
      // For GitHub Actions workflow
      if (cicdPath.includes('.github/workflows')) {
        await this.updateGitHubActionsSecrets(config, result);
      }
      
      // For GitLab CI
      else if (cicdPath.includes('.gitlab-ci.yml')) {
        await this.updateGitLabCISecrets(config, result);
      }
      
      result.targetFilesPaths.push(cicdPath);

    } catch (error) {
      result.errors.push(`Failed to update CI/CD config: ${error}`);
    }
  }

  /**
   * Update GitHub Actions secrets documentation
   */
  private async updateGitHubActionsSecrets(config: SecretsPropagationConfig): Promise<void> {
    const secretsDocPath = path.join(process.cwd(), '.github', 'SECRETS.md');
    
    let docContent = `# Required Secrets for ${config.environment.toUpperCase()}\n\n`;
    docContent += `This document lists the secrets that need to be configured in GitHub Actions.\n\n`;
    docContent += `## Gizmo OAuth2 Integration\n\n`;
    
    for (const [key] of Object.entries(config.secrets)) {
      docContent += `- \`${key}\`: OAuth2 credential for Gizmo integration\n`;
    }
    
    docContent += `\n## Setup Instructions\n\n`;
    docContent += `1. Go to Settings → Secrets and variables → Actions\n`;
    docContent += `2. Add each secret listed above\n`;
    docContent += `3. Ensure the workflow has access to these secrets\n\n`;
    docContent += `Last updated: ${new Date().toISOString()}\n`;

    await fs.mkdir(path.dirname(secretsDocPath), { recursive: true });
    await fs.writeFile(secretsDocPath, docContent);
  }

  /**
   * Update GitLab CI secrets documentation
   */
  private async updateGitLabCISecrets(): Promise<void> {
    // Similar implementation for GitLab CI
    console.log('GitLab CI secrets documentation would be updated here');
  }

  /**
   * Update Kubernetes secrets
   */
  private async updateK8sSecrets(config: SecretsPropagationConfig, result: PropagationResult): Promise<void> {
    try {
      const k8sPath = config.targetPaths.k8sSecrets!;
      
      // Generate Kubernetes secret YAML
      const secretData: Record<string, string> = {};
      for (const [key, value] of Object.entries(config.secrets)) {
        secretData[key] = Buffer.from(value).toString('base64');
      }

      const k8sSecret = {
        apiVersion: 'v1',
        kind: 'Secret',
        metadata: {
          name: `gizmo-secrets-${config.environment}`,
          namespace: 'default'
        },
        type: 'Opaque',
        data: secretData
      };

      const yamlContent = `# Kubernetes Secret for Gizmo OAuth2 Integration\n` +
                         `# Environment: ${config.environment}\n` +
                         `# Generated: ${new Date().toISOString()}\n\n` +
                         JSON.stringify(k8sSecret, null, 2);

      await fs.writeFile(k8sPath, yamlContent);
      result.targetFilesPaths.push(k8sPath);

    } catch (error) {
      result.errors.push(`Failed to update Kubernetes secrets: ${error}`);
    }
  }

  /**
   * Update Docker Compose environment
   */
  private async updateDockerCompose(config: SecretsPropagationConfig, result: PropagationResult): Promise<void> {
    try {
      const composePath = config.targetPaths.dockerCompose!;
      
      // Read existing docker-compose content
      let composeContent = '';
      try {
        composeContent = await fs.readFile(composePath, 'utf-8');
      } catch {
        result.errors.push(`Docker Compose file not found: ${composePath}`);
        return;
      }

      // Create environment section for Gizmo secrets
      let envSection = '\n    # Gizmo OAuth2 Integration\n';
      for (const [key] of Object.entries(config.secrets)) {
        envSection += `    - ${key}=\${${key}}\n`;
      }

      // Simple approach: append to environment section
      // In a real implementation, you'd parse and modify the YAML properly
      composeContent += '\n# Gizmo environment variables added by wizard\n';
      composeContent += envSection;

      await fs.writeFile(composePath, composeContent);
      result.targetFilesPaths.push(composePath);

    } catch (error) {
      result.errors.push(`Failed to update Docker Compose: ${error}`);
    }
  }

  /**
   * Parse .env file content into key-value pairs
   */
  private parseEnvContent(content: string): Record<string, string> {
    const vars: Record<string, string> = {};
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          vars[key] = valueParts.join('=');
        }
      }
    }
    
    return vars;
  }

  /**
   * Validate propagation configuration
   */
  validateConfig(config: SecretsPropagationConfig): string[] {
    const errors: string[] = [];

    if (!config.environment) {
      errors.push('Environment is required');
    }

    if (!config.secrets || Object.keys(config.secrets).length === 0) {
      errors.push('At least one secret is required');
    }

    if (!config.targetPaths.envFile) {
      errors.push('Environment file path is required');
    }

    // Validate secret names
    for (const key of Object.keys(config.secrets)) {
      if (!/^[A-Z_][A-Z0-9_]*$/.test(key)) {
        errors.push(`Invalid secret name: ${key}. Must be uppercase with underscores.`);
      }
    }

    return errors;
  }
}

// Export singleton instance
export const secretsPropagationService = SecretsPropagationService.getInstance();