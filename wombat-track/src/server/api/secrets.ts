/**
 * Secrets Management API for MCP GSuite Integration
 * Secure credential storage and .env file generation
 */

import express from 'express';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Encryption key for stored secrets (in production, use proper key management)
const ENCRYPTION_KEY = process.env.SECRETS_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const SECRETS_FILE_PATH = path.join(__dirname, '../../../config/secrets.json');
const ENV_OUTPUT_PATH = path.join(__dirname, '../../../.env.mcp');

interface Secret {
  id: string;
  name: string;
  value: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  encrypted: boolean;
}

// Ensure config directory exists
async function ensureConfigDir() {
  const configDir = path.dirname(SECRETS_FILE_PATH);
  try {
    await fs.mkdir(configDir, { recursive: true });
  } catch {
    // Directory might already exist, that's OK
  }
}

// Simple encryption/decryption (for production, use proper encryption)
function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(encryptedText: string): string {
  const parts = encryptedText.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// Load secrets from file
async function loadSecrets(): Promise<Secret[]> {
  try {
    await ensureConfigDir();
    const data = await fs.readFile(SECRETS_FILE_PATH, 'utf8');
    const secrets = JSON.parse(data);
    
    // Decrypt values
    return secrets.map((secret: Secret) => ({
      ...secret,
      value: secret.encrypted ? decrypt(secret.value) : secret.value
    }));
  } catch {
    // File doesn't exist yet, return empty array
    return [];
  }
}

// Save secrets to file
async function saveSecrets(secrets: Secret[]): Promise<void> {
  await ensureConfigDir();
  
  // Encrypt values before saving
  const encryptedSecrets = secrets.map(secret => ({
    ...secret,
    value: encrypt(secret.value),
    encrypted: true
  }));
  
  await fs.writeFile(SECRETS_FILE_PATH, JSON.stringify(encryptedSecrets, null, 2));
}

// GET /api/admin/secrets - List all secrets (values hidden in response)
router.get('/', async (req, res) => {
  try {
    const secrets = await loadSecrets();
    
    // Return secrets without actual values for security
    const safeSecrets = secrets.map(secret => ({
      ...secret,
      value: '••••••••••••••••' // Hidden in API response
    }));
    
    res.json({
      success: true,
      secrets: safeSecrets,
      count: secrets.length
    });
  } catch {
    res.status(500).json({
      success: false,
      error: 'Failed to load secrets',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/admin/secrets/:id - Get specific secret (with actual value)
router.get('/:id', async (req, res) => {
  try {
    const secrets = await loadSecrets();
    const secret = secrets.find(s => s.id === req.params.id);
    
    if (!secret) {
      return res.status(404).json({
        success: false,
        error: 'Secret not found'
      });
    }
    
    res.json({
      success: true,
      secret
    });
  } catch {
    res.status(500).json({
      success: false,
      error: 'Failed to load secret',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/admin/secrets - Create new secret
router.post('/', async (req, res) => {
  try {
    const { name, value, description } = req.body;
    
    if (!name || !value) {
      return res.status(400).json({
        success: false,
        error: 'Name and value are required'
      });
    }
    
    const secrets = await loadSecrets();
    
    // Check if secret with same name already exists
    if (secrets.find(s => s.name === name)) {
      return res.status(409).json({
        success: false,
        error: 'Secret with this name already exists'
      });
    }
    
    const newSecret: Secret = {
      id: crypto.randomUUID(),
      name,
      value,
      description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      encrypted: false // Will be encrypted when saved
    };
    
    secrets.push(newSecret);
    await saveSecrets(secrets);
    
    res.json({
      success: true,
      message: 'Secret created successfully',
      secret: {
        ...newSecret,
        value: '••••••••••••••••'
      }
    });
  } catch {
    res.status(500).json({
      success: false,
      error: 'Failed to create secret',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// PUT /api/admin/secrets/:id - Update existing secret
router.put('/:id', async (req, res) => {
  try {
    const { name, value, description } = req.body;
    const secrets = await loadSecrets();
    const secretIndex = secrets.findIndex(s => s.id === req.params.id);
    
    if (secretIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Secret not found'
      });
    }
    
    // Update secret
    secrets[secretIndex] = {
      ...secrets[secretIndex],
      name: name || secrets[secretIndex].name,
      value: value || secrets[secretIndex].value,
      description: description !== undefined ? description : secrets[secretIndex].description,
      updatedAt: new Date().toISOString()
    };
    
    await saveSecrets(secrets);
    
    res.json({
      success: true,
      message: 'Secret updated successfully',
      secret: {
        ...secrets[secretIndex],
        value: '••••••••••••••••'
      }
    });
  } catch {
    res.status(500).json({
      success: false,
      error: 'Failed to update secret',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// DELETE /api/admin/secrets/:id - Delete secret
router.delete('/:id', async (req, res) => {
  try {
    const secrets = await loadSecrets();
    const secretIndex = secrets.findIndex(s => s.id === req.params.id);
    
    if (secretIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Secret not found'
      });
    }
    
    const deletedSecret = secrets.splice(secretIndex, 1)[0];
    await saveSecrets(secrets);
    
    res.json({
      success: true,
      message: 'Secret deleted successfully',
      deletedSecret: {
        id: deletedSecret.id,
        name: deletedSecret.name
      }
    });
  } catch {
    res.status(500).json({
      success: false,
      error: 'Failed to delete secret',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/admin/secrets/generate-env - Generate .env.mcp file
router.post('/generate-env', async (req, res) => {
  try {
    const secrets = await loadSecrets();
    
    // Generate .env file content
    let envContent = '# MCP GSuite Environment Variables\n';
    envContent += '# Generated by Secrets Manager\n';
    envContent += `# Generated: ${new Date().toISOString()}\n\n`;
    
    // Add each secret as environment variable
    for (const secret of secrets) {
      if (secret.description) {
        envContent += `# ${secret.description}\n`;
      }
      
      // Handle multi-line values (like private keys)
      const value = secret.value.includes('\n') 
        ? `"${secret.value.replace(/"/g, '\\"')}"` 
        : secret.value;
      
      envContent += `${secret.name}=${value}\n\n`;
    }
    
    // Write to file
    await fs.writeFile(ENV_OUTPUT_PATH, envContent);
    
    // Also return as downloadable file
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', 'attachment; filename=".env.mcp"');
    res.send(envContent);
    
  } catch {
    res.status(500).json({
      success: false,
      error: 'Failed to generate .env file',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/admin/secrets/health - Health check for secrets system
router.get('/health', async (req, res) => {
  try {
    const secrets = await loadSecrets();
    const requiredSecrets = [
      'GOOGLE_PROJECT_ID',
      'GOOGLE_CLIENT_EMAIL', 
      'GOOGLE_PRIVATE_KEY',
      'MEMORYPLUGIN_KEY',
      'DRIVE_MEMORY_PATH'
    ];
    
    const missingSecrets = requiredSecrets.filter(
      required => !secrets.find(s => s.name === required)
    );
    
    const configStatus = missingSecrets.length === 0 ? 'complete' : 'incomplete';
    
    res.json({
      success: true,
      status: 'healthy',
      secrets_count: secrets.length,
      config_status: configStatus,
      missing_secrets: missingSecrets,
      env_file_exists: await fs.access(ENV_OUTPUT_PATH).then(() => true).catch(() => false),
      timestamp: new Date().toISOString()
    });
  } catch {
    res.status(500).json({
      success: false,
      error: 'Secrets system unhealthy',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;