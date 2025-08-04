/**
 * Propagation Step - Deploy secrets to environment and storage
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, Loader2, Settings, FileText, Database, Server } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface PropagationStepProps {
  sessionId: string;
  environment: 'development' | 'staging' | 'production';
  onComplete: (data: Record<string, unknown>) => void;
  onError: (error: string) => void;
}

interface PropagationResult {
  env_file_updated: boolean;
  variables_added: string[];
  variables_updated: string[];
  secrets_manager_backup: boolean;
}

export const PropagationStep: React.FC<PropagationStepProps> = ({
  sessionId,
  environment,
  onComplete,
  onError
}) => {
  const [propagating, setPropagating] = useState(false);
  const [propagationResult, setPropagationResult] = useState<PropagationResult | null>(null);
  const [propagationError, setPropagationError] = useState<string | null>(null);
  const [autoPropagating, setAutoPropagating] = useState(true);

  useEffect(() => {
    if (autoPropagating) {
      performPropagation();
    }
  }, [autoPropagating]);

  const performPropagation = async () => {
    try {
      setPropagating(true);
      setPropagationError(null);
      setPropagationResult(null);

      const response = await fetch(`/api/secrets/gizmo/wizard/${sessionId}/propagate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Propagation failed');
      }

      const data = await response.json();
      setPropagationResult(data.propagation_result);

      // Auto-proceed if propagation is successful
      setTimeout(() => {
        onComplete({
          propagation_result: data.propagation_result,
          propagated_at: new Date().toISOString()
        });
      }, 3000);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Propagation failed';
      setPropagationError(errorMessage);
      onError(errorMessage);
    } finally {
      setPropagating(false);
      setAutoPropagating(false);
    }
  };

  const getPropagationStatusIcon = () => {
    if (propagating) {
      return <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />;
    }
    
    if (propagationError) {
      return <AlertCircle className="h-8 w-8 text-red-600" />;
    }
    
    if (propagationResult?.env_file_updated) {
      return <CheckCircle className="h-8 w-8 text-green-600" />;
    }
    
    return <Settings className="h-8 w-8 text-gray-400" />;
  };

  const getPropagationStatusText = () => {
    if (propagating) {
      return 'Propagating secrets...';
    }
    
    if (propagationError) {
      return 'Propagation failed';
    }
    
    if (propagationResult?.env_file_updated) {
      return 'Secrets propagated successfully!';
    }
    
    return 'Ready to propagate';
  };

  const renderPropagationSteps = () => {
    if (!propagationResult && !propagating) return null;

    const steps = [
      {
        icon: FileText,
        title: 'Environment File Update',
        description: 'Update .env file with Gizmo credentials',
        status: propagationResult?.env_file_updated ? 'completed' : propagating ? 'in_progress' : 'pending'
      },
      {
        icon: Database,
        title: 'Secrets Manager Backup',
        description: 'Backup credentials to encrypted storage',
        status: propagationResult?.secrets_manager_backup ? 'completed' : propagating ? 'in_progress' : 'pending'
      },
      {
        icon: Server,
        title: 'Runtime Propagation',
        description: 'Make secrets available to running services',
        status: propagationResult ? 'completed' : propagating ? 'in_progress' : 'pending'
      }
    ];

    return (
      <div className="space-y-3">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                {step.status === 'completed' ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : step.status === 'in_progress' ? (
                  <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                ) : (
                  <Icon className="h-5 w-5 text-gray-400" />
                )}
                <div>
                  <p className="font-medium">{step.title}</p>
                  <p className="text-sm text-slate-600">{step.description}</p>
                </div>
              </div>
              <Badge variant={
                step.status === 'completed' ? 'success' :
                step.status === 'in_progress' ? 'default' :
                'secondary'
              }>
                {step.status === 'completed' ? 'Done' :
                 step.status === 'in_progress' ? 'Processing' :
                 'Pending'}
              </Badge>
            </div>
          );
        })}
      </div>
    );
  };

  const renderPropagationResults = () => {
    if (!propagationResult) return null;

    return (
      <Card className="bg-green-50 border-green-200">
        <CardHeader>
          <CardTitle className="text-green-800">Propagation Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Environment Variables */}
          <div>
            <h4 className="font-medium text-green-800 mb-2">Environment Variables</h4>
            <div className="grid grid-cols-2 gap-4">
              {propagationResult.variables_added.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-green-700">Added ({propagationResult.variables_added.length})</p>
                  <ul className="text-sm text-green-600 list-disc list-inside">
                    {propagationResult.variables_added.map(varName => (
                      <li key={varName}>{varName}</li>
                    ))}
                  </ul>
                </div>
              )}
              {propagationResult.variables_updated.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-green-700">Updated ({propagationResult.variables_updated.length})</p>
                  <ul className="text-sm text-green-600 list-disc list-inside">
                    {propagationResult.variables_updated.map(varName => (
                      <li key={varName}>{varName}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Security Status */}
          <div className="pt-3 border-t border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-800">Security Status</p>
                <p className="text-xs text-green-600">All secrets encrypted and stored securely</p>
              </div>
              <Badge className="bg-green-100 text-green-800">
                ✓ Secured
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderTroubleshooting = () => {
    if (!propagationError) return null;

    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Propagation failed:</strong> {propagationError}
          
          <div className="mt-3">
            <p className="font-medium mb-2">Troubleshooting steps:</p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Check file system permissions for .env file</li>
              <li>Verify secrets manager service is running</li>
              <li>Ensure sufficient disk space for configuration files</li>
              <li>Check for conflicts with existing environment variables</li>
              <li>Verify network connectivity for backup operations</li>
            </ul>
          </div>
        </AlertDescription>
      </Alert>
    );
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        {getPropagationStatusIcon()}
        <h3 className="text-xl font-semibold mt-4 mb-2">{getPropagationStatusText()}</h3>
        <p className="text-slate-600">
          {propagating 
            ? 'Deploying your Gizmo credentials to the environment and secure storage...'
            : propagationResult?.env_file_updated
            ? 'Your credentials have been securely deployed and are ready for use.'
            : 'We need to deploy your validated credentials to make them available to services.'
          }
        </p>
      </div>

      {/* Propagation Progress */}
      {propagating && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center space-x-4">
              <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
              <div className="text-center">
                <p className="text-sm font-medium text-blue-800">Deploying Credentials</p>
                <p className="text-xs text-blue-600">Updating environment and creating backups...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Propagation Steps */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Propagation Steps
          </CardTitle>
        </CardHeader>
        <CardContent>
          {renderPropagationSteps()}
        </CardContent>
      </Card>

      {/* Propagation Results */}
      {propagationResult && renderPropagationResults()}

      {/* Troubleshooting */}
      {renderTroubleshooting()}

      {/* Security Notice */}
      <Alert>
        <CheckCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Security Notice:</strong> All secrets are encrypted at rest and transmitted securely. 
          Environment variables are only accessible to authorized services and personnel.
        </AlertDescription>
      </Alert>

      {/* Action Buttons */}
      <div className="flex justify-between pt-4">
        {propagationError && (
          <Button 
            variant="outline" 
            onClick={performPropagation}
            disabled={propagating}
          >
            {propagating ? 'Propagating...' : 'Retry Propagation'}
          </Button>
        )}
        
        {propagationResult?.env_file_updated && (
          <Button 
            onClick={() => onComplete({
              propagation_result: propagationResult,
              propagated_at: new Date().toISOString()
            })}
            className="ml-auto"
          >
            Continue to Activation
          </Button>
        )}
      </div>

      {/* Environment Info */}
      <div className="text-center text-sm text-slate-500">
        Deploying to <Badge variant="outline">{environment}</Badge> environment
      </div>
    </div>
  );
};