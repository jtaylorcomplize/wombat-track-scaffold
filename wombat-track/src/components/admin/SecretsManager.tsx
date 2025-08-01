import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Eye, EyeOff, Plus, Trash2, Save, Key, Shield } from 'lucide-react';

interface Secret {
  id: string;
  name: string;
  value: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

interface SecretsManagerProps {
  className?: string;
}

export const SecretsManager: React.FC<SecretsManagerProps> = ({ className }) => {
  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showValues, setShowValues] = useState<Record<string, boolean>>({});
  const [editingSecret, setEditingSecret] = useState<Partial<Secret> | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // MCP GSuite required secrets template
  const requiredSecrets = [
    {
      name: 'GOOGLE_PROJECT_ID',
      description: 'Google Cloud Project ID for MCP GSuite integration',
      placeholder: 'your-project-id'
    },
    {
      name: 'GOOGLE_CLIENT_EMAIL',
      description: 'Service Account Email from Google Cloud Console',
      placeholder: 'service-account@project.iam.gserviceaccount.com'
    },
    {
      name: 'GOOGLE_PRIVATE_KEY',
      description: 'Private Key from Service Account JSON (entire key including headers)',
      placeholder: '-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n'
    },
    {
      name: 'MEMORYPLUGIN_KEY',
      description: 'MemoryPlugin API key for semantic anchoring',
      placeholder: 'your-memoryplugin-key'
    },
    {
      name: 'DRIVE_MEMORY_PATH',
      description: 'Path for DriveMemory JSONL logging',
      placeholder: '/app/logs'
    }
  ];

  useEffect(() => {
    loadSecrets();
  }, []);

  const loadSecrets = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/secrets');
      if (response.ok) {
        const data = await response.json();
        setSecrets(data.secrets || []);
      } else {
        throw new Error('Failed to load secrets');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load secrets');
    } finally {
      setLoading(false);
    }
  };

  const saveSecret = async (secret: Partial<Secret>) => {
    try {
      const method = secret.id ? 'PUT' : 'POST';
      const url = secret.id ? `/api/admin/secrets/${secret.id}` : '/api/admin/secrets';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(secret),
      });

      if (response.ok) {
        await loadSecrets();
        setEditingSecret(null);
        setShowAddForm(false);
      } else {
        throw new Error('Failed to save secret');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save secret');
    }
  };

  const deleteSecret = async (id: string) => {
    if (!confirm('Are you sure you want to delete this secret?')) return;

    try {
      const response = await fetch(`/api/admin/secrets/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await loadSecrets();
      } else {
        throw new Error('Failed to delete secret');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete secret');
    }
  };

  const toggleShowValue = (id: string) => {
    setShowValues(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const generateEnvFile = async () => {
    try {
      const response = await fetch('/api/admin/secrets/generate-env', {
        method: 'POST',
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = '.env.mcp';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        throw new Error('Failed to generate .env file');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate .env file');
    }
  };

  const SecretForm = ({ secret, onSave, onCancel }: {
    secret: Partial<Secret>;
    onSave: (secret: Partial<Secret>) => void;
    onCancel: () => void;
  }) => {
    const [formData, setFormData] = useState(secret);

    return (
      <Card className="border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            {secret.id ? 'Edit Secret' : 'Add New Secret'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">Secret Name</Label>
            <Input
              id="name"
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="GOOGLE_PROJECT_ID"
            />
          </div>
          <div>
            <Label htmlFor="value">Secret Value</Label>
            <Textarea
              id="value"
              value={formData.value || ''}
              onChange={(e) => setFormData({ ...formData, value: e.target.value })}
              placeholder="Enter secret value..."
              rows={3}
            />
          </div>
          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <Input
              id="description"
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="What this secret is used for..."
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={() => onSave(formData)}>
              <Save className="h-4 w-4 mr-2" />
              Save Secret
            </Button>
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) return <div className="p-4">Loading secrets...</div>;

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Secrets Management</h2>
          <p className="text-slate-600">Secure credential storage for MCP GSuite integration</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={generateEnvFile} variant="outline">
            <Key className="h-4 w-4 mr-2" />
            Generate .env
          </Button>
          <Button onClick={() => setShowAddForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Secret
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Required Secrets Template */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            MCP GSuite Required Secrets
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {requiredSecrets.map((template) => {
              const existing = secrets.find(s => s.name === template.name);
              return (
                <div key={template.name} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{template.name}</div>
                    <div className="text-sm text-slate-600">{template.description}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {existing ? (
                      <span className="text-green-600 text-sm">✅ Configured</span>
                    ) : (
                      <Button 
                        size="sm" 
                        onClick={() => setEditingSecret({ 
                          name: template.name, 
                          description: template.description 
                        })}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Form */}
      {(showAddForm || editingSecret) && (
        <SecretForm
          secret={editingSecret || {}}
          onSave={saveSecret}
          onCancel={() => {
            setShowAddForm(false);
            setEditingSecret(null);
          }}
        />
      )}

      {/* Current Secrets */}
      <Card>
        <CardHeader>
          <CardTitle>Current Secrets ({secrets.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {secrets.length === 0 ? (
            <p className="text-slate-600 text-center py-8">
              No secrets configured. Add your first secret to get started.
            </p>
          ) : (
            <div className="space-y-3">
              {secrets.map((secret) => (
                <div key={secret.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Key className="h-4 w-4 text-slate-500" />
                        <span className="font-medium">{secret.name}</span>
                      </div>
                      {secret.description && (
                        <p className="text-sm text-slate-600 mt-1">{secret.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-slate-500">
                          {showValues[secret.id] ? secret.value : '••••••••••••••••'}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleShowValue(secret.id)}
                        >
                          {showValues[secret.id] ? (
                            <EyeOff className="h-3 w-3" />
                          ) : (
                            <Eye className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingSecret(secret)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteSecret(secret.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 mt-2">
                    Created: {new Date(secret.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};