/**
 * Vault Service for secure credential storage
 * Phase 9.0.4 - AES-256 encrypted credential management
 */

import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

interface VaultEntry {
  key: string;
  value: string;
  encrypted: boolean;
  createdAt: string;
  updatedAt: string;
  scopes?: string[];
}

interface VaultConfig {
  algorithm: string;
  keyLength: number;
  ivLength: number;
  saltLength: number;
  iterations: number;
}

class VaultService {
  private vaultPath: string;
  private masterKey: Buffer | null = null;
  private config: VaultConfig = {
    algorithm: 'aes-256-gcm',
    keyLength: 32,
    ivLength: 16,
    saltLength: 64,
    iterations: 100000
  };
  
  constructor() {
    this.vaultPath = path.join(
      '/home/jtaylor/wombat-track-scaffold/wombat-track',
      '.vault',
      'credentials.vault'
    );
    this.initializeVault();
  }

  /**
   * Initialize vault and derive master key
   */
  private async initializeVault() {
    try {
      // Ensure vault directory exists
      await fs.mkdir(path.dirname(this.vaultPath), { recursive: true });
      
      // Derive master key from environment or secure store
      const masterPassword = process.env.VAULT_MASTER_PASSWORD || 'default-dev-password';
      const salt = process.env.VAULT_SALT || 'default-salt';
      
      this.masterKey = crypto.pbkdf2Sync(
        masterPassword,
        salt,
        this.config.iterations,
        this.config.keyLength,
        'sha256'
      );
      
      // Initialize vault file if not exists
      try {
        await fs.access(this.vaultPath);
      } catch {
        await this.saveVault({});
      }
    } catch (error) {
      console.error('Failed to initialize vault:', error);
    }
  }

  /**
   * Encrypt data using AES-256-GCM
   */
  private encrypt(text: string): { encrypted: string; iv: string; authTag: string } {
    if (!this.masterKey) throw new Error('Vault not initialized');
    
    const iv = crypto.randomBytes(this.config.ivLength);
    const cipher = crypto.createCipheriv(this.config.algorithm, this.masterKey, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = (cipher as any).getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }

  /**
   * Decrypt data using AES-256-GCM
   */
  private decrypt(encryptedData: { encrypted: string; iv: string; authTag: string }): string {
    if (!this.masterKey) throw new Error('Vault not initialized');
    
    const decipher = crypto.createDecipheriv(
      this.config.algorithm,
      this.masterKey,
      Buffer.from(encryptedData.iv, 'hex')
    );
    
    (decipher as any).setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Load vault from disk
   */
  private async loadVault(): Promise<Record<string, VaultEntry>> {
    try {
      const data = await fs.readFile(this.vaultPath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      return {};
    }
  }

  /**
   * Save vault to disk
   */
  private async saveVault(vault: Record<string, VaultEntry>) {
    await fs.writeFile(this.vaultPath, JSON.stringify(vault, null, 2), 'utf-8');
  }

  /**
   * Store a secret in the vault
   */
  async setSecret(key: string, value: string, scopes?: string[]): Promise<void> {
    const vault = await this.loadVault();
    
    const encryptedData = this.encrypt(value);
    
    vault[key] = {
      key,
      value: JSON.stringify(encryptedData),
      encrypted: true,
      createdAt: vault[key]?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      scopes
    };
    
    await this.saveVault(vault);
  }

  /**
   * Retrieve a secret from the vault
   */
  async getSecret(key: string): Promise<string | null> {
    const vault = await this.loadVault();
    const entry = vault[key];
    
    if (!entry) return null;
    
    if (entry.encrypted) {
      const encryptedData = JSON.parse(entry.value);
      return this.decrypt(encryptedData);
    }
    
    return entry.value;
  }

  /**
   * Delete a secret from the vault
   */
  async deleteSecret(key: string): Promise<boolean> {
    const vault = await this.loadVault();
    
    if (!vault[key]) return false;
    
    delete vault[key];
    await this.saveVault(vault);
    
    return true;
  }

  /**
   * List all secret keys (not values)
   */
  async listSecrets(): Promise<Array<{ key: string; scopes?: string[]; updatedAt: string }>> {
    const vault = await this.loadVault();
    
    return Object.values(vault).map(entry => ({
      key: entry.key,
      scopes: entry.scopes,
      updatedAt: entry.updatedAt
    }));
  }

  /**
   * Validate token scopes
   */
  async validateScopes(key: string, requiredScopes: string[]): Promise<boolean> {
    const vault = await this.loadVault();
    const entry = vault[key];
    
    if (!entry || !entry.scopes) return false;
    
    return requiredScopes.every(scope => entry.scopes?.includes(scope));
  }

  /**
   * Initialize default secrets for development
   */
  async initializeDefaultSecrets() {
    const defaults = [
      { key: 'github_token', value: process.env.GITHUB_TOKEN || '', scopes: ['github:repo'] },
      { key: 'azure_openai_key', value: process.env.AZURE_OPENAI_KEY || '', scopes: ['azure:openai'] },
      { key: 'oapp_api_key', value: process.env.OAPP_API_KEY || crypto.randomBytes(32).toString('hex'), scopes: ['oapp:governance'] },
      { key: 'jwt_secret', value: process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex'), scopes: ['auth:jwt'] }
    ];
    
    for (const secret of defaults) {
      const existing = await this.getSecret(secret.key);
      if (!existing && secret.value) {
        await this.setSecret(secret.key, secret.value, secret.scopes);
      }
    }
  }

  /**
   * Rotate a secret (generate new value)
   */
  async rotateSecret(key: string): Promise<string> {
    const vault = await this.loadVault();
    const entry = vault[key];
    
    if (!entry) throw new Error(`Secret ${key} not found`);
    
    // Generate new secret based on type
    let newValue: string;
    
    if (key.includes('token') || key.includes('key')) {
      newValue = crypto.randomBytes(32).toString('hex');
    } else {
      newValue = crypto.randomBytes(16).toString('base64');
    }
    
    await this.setSecret(key, newValue, entry.scopes);
    
    return newValue;
  }

  /**
   * Export vault for backup (encrypted)
   */
  async exportVault(): Promise<string> {
    const vault = await this.loadVault();
    const exportData = {
      version: '1.0',
      exported: new Date().toISOString(),
      vault: vault
    };
    
    const encrypted = this.encrypt(JSON.stringify(exportData));
    return Buffer.from(JSON.stringify(encrypted)).toString('base64');
  }

  /**
   * Import vault from backup
   */
  async importVault(backupData: string): Promise<void> {
    try {
      const encrypted = JSON.parse(Buffer.from(backupData, 'base64').toString());
      const decrypted = this.decrypt(encrypted);
      const importData = JSON.parse(decrypted);
      
      if (importData.version !== '1.0') {
        throw new Error('Incompatible vault version');
      }
      
      await this.saveVault(importData.vault);
    } catch (error) {
      throw new Error('Failed to import vault: ' + (error as Error).message);
    }
  }
}

// Singleton instance
const vaultService = new VaultService();

// Initialize default secrets on startup
vaultService.initializeDefaultSecrets().catch(console.error);

export { vaultService, VaultService, VaultEntry };