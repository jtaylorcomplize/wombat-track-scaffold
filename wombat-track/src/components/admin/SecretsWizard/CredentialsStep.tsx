/**
 * Credentials Step - Gizmo OAuth2 credential input
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, Key, Shield, HelpCircle, ExternalLink } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface CredentialsStepProps {
  sessionId: string;
  environment: 'development' | 'staging' | 'production';
  onComplete: (data: Record<string, unknown>) => void;
  onError: (error: string) => void;
}

export const CredentialsStep: React.FC<CredentialsStepProps> = ({
  sessionId,
  environment,
  onComplete,
  onError
}) => {
  const [formData, setFormData] = useState({
    clientId: '',
    clientSecret: '',
    tokenEndpoint: 'https://auth.gizmo.ai/oauth/token',
    authEndpoint: 'https://auth.gizmo.ai/oauth/authorize',
    memoryEndpoint: 'https://api.gizmo.ai/memory',
    agentEndpoint: 'https://api.gizmo.ai/agents'
  });
  
  const [showSecrets, setShowSecrets] = useState({
    clientSecret: false
  });
  
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.clientId.trim()) {
      errors.clientId = 'Client ID is required';
    }

    if (!formData.clientSecret.trim()) {
      errors.clientSecret = 'Client Secret is required';
    }

    if (!formData.tokenEndpoint.trim()) {
      errors.tokenEndpoint = 'Token endpoint is required';
    } else if (!isValidUrl(formData.tokenEndpoint)) {
      errors.tokenEndpoint = 'Token endpoint must be a valid URL';
    }

    if (!formData.authEndpoint.trim()) {
      errors.authEndpoint = 'Auth endpoint is required';
    } else if (!isValidUrl(formData.authEndpoint)) {
      errors.authEndpoint = 'Auth endpoint must be a valid URL';
    }

    if (formData.memoryEndpoint && !isValidUrl(formData.memoryEndpoint)) {
      errors.memoryEndpoint = 'Memory endpoint must be a valid URL';
    }

    if (formData.agentEndpoint && !isValidUrl(formData.agentEndpoint)) {
      errors.agentEndpoint = 'Agent endpoint must be a valid URL';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const isValidUrl = (string: string): boolean => {
    try {
      new URL(string);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      onError('Please fix the validation errors below');
      return;
    }

    try {
      setLoading(true);
      
      const response = await fetch(`/api/secrets/gizmo/wizard/${sessionId}/credentials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save credentials');
      }

      await response.json();
      onComplete({
        credentials_saved: true,
        client_id: formData.clientId,
        endpoints_configured: {
          token: formData.tokenEndpoint,
          auth: formData.authEndpoint,
          memory: formData.memoryEndpoint,
          agent: formData.agentEndpoint
        }
      });

    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to save credentials');
    } finally {
      setLoading(false);
    }
  };

  const toggleSecretVisibility = (field: keyof typeof showSecrets) => {
    setShowSecrets(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const environmentTemplates = {
    development: {
      tokenEndpoint: 'https://dev.auth.gizmo.ai/oauth/token',
      authEndpoint: 'https://dev.auth.gizmo.ai/oauth/authorize',
      memoryEndpoint: 'https://dev.api.gizmo.ai/memory',
      agentEndpoint: 'https://dev.api.gizmo.ai/agents'
    },
    staging: {
      tokenEndpoint: 'https://staging.auth.gizmo.ai/oauth/token',
      authEndpoint: 'https://staging.auth.gizmo.ai/oauth/authorize',
      memoryEndpoint: 'https://staging.api.gizmo.ai/memory',
      agentEndpoint: 'https://staging.api.gizmo.ai/agents'
    },
    production: {
      tokenEndpoint: 'https://auth.gizmo.ai/oauth/token',
      authEndpoint: 'https://auth.gizmo.ai/oauth/authorize',
      memoryEndpoint: 'https://api.gizmo.ai/memory',
      agentEndpoint: 'https://api.gizmo.ai/agents'
    }
  };

  const loadEnvironmentTemplate = () => {
    const template = environmentTemplates[environment];
    setFormData(prev => ({
      ...prev,
      ...template
    }));
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <Shield className="h-12 w-12 text-blue-600 mx-auto mb-4" />
        <h3 className="text-xl font-semibold mb-2">Enter Gizmo OAuth2 Credentials</h3>
        <p className="text-slate-600">
          Provide your Gizmo application credentials to enable AI agent integration
        </p>
      </div>

      {/* Environment Template Loader */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">
                Load {environment} environment defaults
              </span>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={loadEnvironmentTemplate}
              className="text-blue-600 border-blue-300 hover:bg-blue-100"
            >
              Load Defaults
            </Button>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Required Credentials */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              OAuth2 Application Credentials
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Client ID */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="clientId">Client ID *</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="h-4 w-4 text-slate-400" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>OAuth2 Client ID from your Gizmo application settings</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input
                id="clientId"
                type="text"
                value={formData.clientId}
                onChange={(e) => setFormData(prev => ({ ...prev, clientId: e.target.value }))}
                placeholder="gizmo_client_abc123..."
              />
              {validationErrors.clientId && (
                <p className="text-sm text-red-600">{validationErrors.clientId}</p>
              )}
            </div>

            {/* Client Secret */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="clientSecret">Client Secret *</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="h-4 w-4 text-slate-400" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>OAuth2 Client Secret from your Gizmo application settings</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="relative">
                <Input
                  id="clientSecret"
                  type={showSecrets.clientSecret ? "text" : "password"}
                  value={formData.clientSecret}
                  onChange={(e) => setFormData(prev => ({ ...prev, clientSecret: e.target.value }))}
                  placeholder="Enter client secret..."
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1"
                  onClick={() => toggleSecretVisibility('clientSecret')}
                >
                  {showSecrets.clientSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {validationErrors.clientSecret && (
                <p className="text-sm text-red-600">{validationErrors.clientSecret}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* OAuth2 Endpoints */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ExternalLink className="h-5 w-5" />
              OAuth2 Endpoints
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Token Endpoint */}
            <div className="space-y-2">
              <Label htmlFor="tokenEndpoint">Token Endpoint *</Label>
              <Input
                id="tokenEndpoint"
                type="url"
                value={formData.tokenEndpoint}
                onChange={(e) => setFormData(prev => ({ ...prev, tokenEndpoint: e.target.value }))}
                placeholder="https://auth.gizmo.ai/oauth/token"
              />
              {validationErrors.tokenEndpoint && (
                <p className="text-sm text-red-600">{validationErrors.tokenEndpoint}</p>
              )}
            </div>

            {/* Auth Endpoint */}
            <div className="space-y-2">
              <Label htmlFor="authEndpoint">Authorization Endpoint *</Label>
              <Input
                id="authEndpoint"
                type="url"
                value={formData.authEndpoint}
                onChange={(e) => setFormData(prev => ({ ...prev, authEndpoint: e.target.value }))}
                placeholder="https://auth.gizmo.ai/oauth/authorize"
              />
              {validationErrors.authEndpoint && (
                <p className="text-sm text-red-600">{validationErrors.authEndpoint}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Optional Service Endpoints */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Service Endpoints (Optional)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Memory Endpoint */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="memoryEndpoint">Memory Service Endpoint</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="h-4 w-4 text-slate-400" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Endpoint for Memory Anchor Agent integration</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input
                id="memoryEndpoint"
                type="url"
                value={formData.memoryEndpoint}
                onChange={(e) => setFormData(prev => ({ ...prev, memoryEndpoint: e.target.value }))}
                placeholder="https://api.gizmo.ai/memory"
              />
              {validationErrors.memoryEndpoint && (
                <p className="text-sm text-red-600">{validationErrors.memoryEndpoint}</p>
              )}
            </div>

            {/* Agent Endpoint */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="agentEndpoint">Agent Service Endpoint</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="h-4 w-4 text-slate-400" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Endpoint for AI Agent communication and monitoring</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input
                id="agentEndpoint"
                type="url"
                value={formData.agentEndpoint}
                onChange={(e) => setFormData(prev => ({ ...prev, agentEndpoint: e.target.value }))}
                placeholder="https://api.gizmo.ai/agents"
              />
              {validationErrors.agentEndpoint && (
                <p className="text-sm text-red-600">{validationErrors.agentEndpoint}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Setup Guide */}
        <Alert>
          <HelpCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Need help getting credentials?</strong>
            <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
              <li>Visit the Gizmo Developer Console</li>
              <li>Create or select your OAuth2 application</li>
              <li>Copy the Client ID and Client Secret</li>
              <li>Verify the OAuth2 endpoints match your environment</li>
            </ol>
          </AlertDescription>
        </Alert>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4">
          <Button 
            type="submit" 
            disabled={loading}
            className="min-w-32"
          >
            {loading ? 'Saving...' : 'Save & Continue'}
          </Button>
        </div>
      </form>
    </div>
  );
};