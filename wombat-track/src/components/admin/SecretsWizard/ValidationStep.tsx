/**
 * Validation Step - Test Gizmo OAuth2 credentials
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, Loader2, Shield, Zap, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ValidationStepProps {
  sessionId: string;
  environment: 'development' | 'staging' | 'production';
  onComplete: (data: Record<string, unknown>) => void;
  onError: (error: string) => void;
}

interface ValidationResult {
  token_acquired: boolean;
  token_type?: string;
  expires_in?: number;
  scope?: string;
  memory_endpoint_healthy?: boolean;
  agent_endpoint_healthy?: boolean;
}

export const ValidationStep: React.FC<ValidationStepProps> = ({
  sessionId,
  environment,
  onComplete,
  onError
}) => {
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [autoValidating, setAutoValidating] = useState(true);

  useEffect(() => {
    if (autoValidating) {
      performValidation();
    }
  }, [autoValidating]);

  const performValidation = async () => {
    try {
      setValidating(true);
      setValidationError(null);
      setValidationResult(null);

      const response = await fetch(`/api/secrets/gizmo/wizard/${sessionId}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Validation failed');
      }

      const data = await response.json();
      setValidationResult(data.validation_result);

      // Auto-proceed if validation is successful
      setTimeout(() => {
        onComplete({
          validation_result: data.validation_result,
          validated_at: new Date().toISOString()
        });
      }, 2000);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Validation failed';
      setValidationError(errorMessage);
      onError(errorMessage);
    } finally {
      setValidating(false);
      setAutoValidating(false);
    }
  };

  const getValidationStatusIcon = () => {
    if (validating) {
      return <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />;
    }
    
    if (validationError) {
      return <AlertCircle className="h-8 w-8 text-red-600" />;
    }
    
    if (validationResult?.token_acquired) {
      return <CheckCircle className="h-8 w-8 text-green-600" />;
    }
    
    return <Shield className="h-8 w-8 text-gray-400" />;
  };

  const getValidationStatusText = () => {
    if (validating) {
      return 'Validating credentials...';
    }
    
    if (validationError) {
      return 'Validation failed';
    }
    
    if (validationResult?.token_acquired) {
      return 'Credentials validated successfully!';
    }
    
    return 'Ready to validate';
  };

  const renderValidationChecks = () => {
    if (!validationResult && !validationError) return null;

    return (
      <div className="space-y-3">
        {/* Token Acquisition Check */}
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div className="flex items-center gap-3">
            {validationResult?.token_acquired ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600" />
            )}
            <div>
              <p className="font-medium">OAuth2 Token Acquisition</p>
              <p className="text-sm text-slate-600">
                {validationResult?.token_acquired 
                  ? 'Successfully acquired access token'
                  : 'Failed to acquire access token'
                }
              </p>
            </div>
          </div>
          <Badge variant={validationResult?.token_acquired ? 'success' : 'destructive'}>
            {validationResult?.token_acquired ? 'Success' : 'Failed'}
          </Badge>
        </div>

        {/* Token Details */}
        {validationResult?.token_acquired && (
          <Card className="bg-green-50 border-green-200">
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-green-800">Token Type</p>
                  <p className="text-sm text-green-700">{validationResult.token_type || 'Bearer'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-green-800">Expires In</p>
                  <p className="text-sm text-green-700">
                    {validationResult.expires_in ? `${validationResult.expires_in}s` : 'N/A'}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm font-medium text-green-800">Scopes</p>
                  <p className="text-sm text-green-700">{validationResult.scope || 'Default scopes'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Service Endpoint Checks */}
        {validationResult && (
          <div className="space-y-2">
            {/* Memory Endpoint */}
            <div className="flex items-center justify-between p-3 border rounded-lg bg-slate-50">
              <div className="flex items-center gap-3">
                <ExternalLink className="h-4 w-4 text-slate-500" />
                <div>
                  <p className="text-sm font-medium">Memory Service Connectivity</p>
                  <p className="text-xs text-slate-600">Optional service for Memory Anchor Agent</p>
                </div>
              </div>
              <Badge variant="secondary">
                Optional
              </Badge>
            </div>

            {/* Agent Endpoint */}
            <div className="flex items-center justify-between p-3 border rounded-lg bg-slate-50">
              <div className="flex items-center gap-3">
                <Zap className="h-4 w-4 text-slate-500" />
                <div>
                  <p className="text-sm font-medium">Agent Service Connectivity</p>
                  <p className="text-xs text-slate-600">Optional service for AI Agent monitoring</p>
                </div>
              </div>
              <Badge variant="secondary">
                Optional
              </Badge>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderTroubleshooting = () => {
    if (!validationError) return null;

    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Validation failed:</strong> {validationError}
          
          <div className="mt-3">
            <p className="font-medium mb-2">Troubleshooting steps:</p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Verify your Client ID and Client Secret are correct</li>
              <li>Check that OAuth2 endpoints are accessible</li>
              <li>Ensure your application has the required scopes</li>
              <li>Confirm network connectivity to Gizmo services</li>
              <li>Check if your credentials are active and not expired</li>
            </ul>
          </div>
        </AlertDescription>
      </Alert>
    );
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        {getValidationStatusIcon()}
        <h3 className="text-xl font-semibold mt-4 mb-2">{getValidationStatusText()}</h3>
        <p className="text-slate-600">
          {validating 
            ? 'Testing your OAuth2 credentials with Gizmo services...'
            : validationResult?.token_acquired
            ? 'Your credentials are working correctly and ready to use.'
            : 'We need to verify your credentials before proceeding.'
          }
        </p>
      </div>

      {/* Validation Progress */}
      {validating && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center space-x-4">
              <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
              <div className="text-center">
                <p className="text-sm font-medium text-blue-800">Testing OAuth2 Connection</p>
                <p className="text-xs text-blue-600">This may take a few moments...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Validation Results */}
      {(validationResult || validationError) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Validation Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderValidationChecks()}
          </CardContent>
        </Card>
      )}

      {/* Troubleshooting */}
      {renderTroubleshooting()}

      {/* Action Buttons */}
      <div className="flex justify-between pt-4">
        {validationError && (
          <Button 
            variant="outline" 
            onClick={performValidation}
            disabled={validating}
          >
            {validating ? 'Validating...' : 'Try Again'}
          </Button>
        )}
        
        {validationResult?.token_acquired && (
          <Button 
            onClick={() => onComplete({
              validation_result: validationResult,
              validated_at: new Date().toISOString()
            })}
            className="ml-auto"
          >
            Continue to Propagation
          </Button>
        )}
      </div>

      {/* Environment Info */}
      <div className="text-center text-sm text-slate-500">
        Validating against <Badge variant="outline">{environment}</Badge> environment
      </div>
    </div>
  );
};