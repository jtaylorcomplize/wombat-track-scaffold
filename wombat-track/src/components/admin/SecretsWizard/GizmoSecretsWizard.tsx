/**
 * Gizmo Secrets Integration Wizard
 * Step-by-step UI for automated Gizmo OAuth2 setup
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, CheckCircle, Loader2, Settings, Shield, Zap } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { CredentialsStep } from './CredentialsStep';
import { ValidationStep } from './ValidationStep';
import { PropagationStep } from './PropagationStep';
import { ActivationStep } from './ActivationStep';
import { CompletionStep } from './CompletionStep';

interface WizardStep {
  step: 'credentials' | 'environment' | 'validation' | 'propagation' | 'activation';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  data?: Record<string, unknown>;
  error?: string;
}

interface WizardSession {
  id: string;
  steps: WizardStep[];
  environment: 'development' | 'staging' | 'production';
  createdAt: string;
  completedAt?: string;
}

interface GizmoSecretsWizardProps {
  onComplete?: (sessionId: string) => void;
  onCancel?: () => void;
  defaultEnvironment?: 'development' | 'staging' | 'production';
}

export const GizmoSecretsWizard: React.FC<GizmoSecretsWizardProps> = ({
  onComplete,
  onCancel,
  defaultEnvironment = 'development'
}) => {
  const [session, setSession] = useState<WizardSession | null>(null);
  // const [currentStepIndex] = useState(0); // Unused variable
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stepLabels = [
    { key: 'credentials', label: 'Credentials', icon: Shield },
    { key: 'validation', label: 'Validation', icon: CheckCircle },
    { key: 'propagation', label: 'Propagation', icon: Settings },
    { key: 'activation', label: 'Activation', icon: Zap }
  ];

  useEffect(() => {
    initializeWizard();
  }, []);

  const initializeWizard = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/secrets/gizmo/wizard/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ environment: defaultEnvironment })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start wizard');
      }

      const data = await response.json();
      setSession({
        id: data.session_id,
        environment: data.environment,
        steps: data.steps,
        createdAt: new Date().toISOString()
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize wizard');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentStep = (): WizardStep | null => {
    if (!session) return null;
    
    const inProgressStep = session.steps.find(step => step.status === 'in_progress');
    if (inProgressStep) return inProgressStep;
    
    const pendingStep = session.steps.find(step => step.status === 'pending');
    if (pendingStep) return pendingStep;
    
    return session.steps[session.steps.length - 1];
  };

  const getStepStatus = (stepKey: string): 'pending' | 'in_progress' | 'completed' | 'failed' => {
    if (!session) return 'pending';
    const step = session.steps.find(s => s.step === stepKey);
    return step?.status || 'pending';
  };

  const getStepProgress = (): number => {
    if (!session) return 0;
    const completedSteps = session.steps.filter(step => step.status === 'completed').length;
    return (completedSteps / session.steps.length) * 100;
  };

  const handleStepComplete = async (stepData?: Record<string, unknown>) => {
    if (!session) return;

    const currentStep = getCurrentStep();
    if (!currentStep) return;

    // Update the step status and move to next step
    const updatedSteps = session.steps.map(step => 
      step.step === currentStep.step 
        ? { ...step, status: 'completed' as const, data: stepData }
        : step
    );

    setSession({ ...session, steps: updatedSteps });

    // Move to next step if not at the end
    const currentIndex = session.steps.findIndex(s => s.step === currentStep.step);
    if (currentIndex < session.steps.length - 1) {
      setCurrentStepIndex(currentIndex + 1);
    } else {
      // Wizard completed
      if (onComplete) {
        onComplete(session.id);
      }
    }
  };

  const handleStepError = (error: string) => {
    setError(error);
  };

  const renderCurrentStepContent = () => {
    if (!session) return null;

    const currentStep = getCurrentStep();
    if (!currentStep) return null;

    const commonProps = {
      sessionId: session.id,
      environment: session.environment,
      onComplete: handleStepComplete,
      onError: handleStepError
    };

    switch (currentStep.step) {
      case 'credentials':
        return <CredentialsStep {...commonProps} />;
      case 'validation':
        return <ValidationStep {...commonProps} />;
      case 'propagation':
        return <PropagationStep {...commonProps} />;
      case 'activation':
        return <ActivationStep {...commonProps} />;
      default:
        return null;
    }
  };

  const renderStepIndicator = () => {
    return (
      <div className="flex items-center justify-between mb-8">
        {stepLabels.map((stepLabel, index) => {
          const status = getStepStatus(stepLabel.key);
          const Icon = stepLabel.icon;
          const isActive = getCurrentStep()?.step === stepLabel.key;

          return (
            <div key={stepLabel.key} className="flex items-center">
              <div className={`
                flex items-center justify-center w-10 h-10 rounded-full border-2 
                ${status === 'completed' ? 'bg-green-100 border-green-500 text-green-700' :
                  status === 'failed' ? 'bg-red-100 border-red-500 text-red-700' :
                  isActive ? 'bg-blue-100 border-blue-500 text-blue-700' :
                  'bg-gray-100 border-gray-300 text-gray-500'}
              `}>
                {status === 'completed' ? (
                  <CheckCircle className="h-5 w-5" />
                ) : status === 'failed' ? (
                  <AlertCircle className="h-5 w-5" />
                ) : status === 'in_progress' ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Icon className="h-5 w-5" />
                )}
              </div>
              <div className="ml-3">
                <p className={`text-sm font-medium ${
                  status === 'completed' ? 'text-green-700' :
                  status === 'failed' ? 'text-red-700' :
                  isActive ? 'text-blue-700' :
                  'text-gray-500'
                }`}>
                  {stepLabel.label}
                </p>
                <Badge variant={
                  status === 'completed' ? 'success' :
                  status === 'failed' ? 'destructive' :
                  isActive ? 'default' :
                  'secondary'
                } className="text-xs">
                  {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                </Badge>
              </div>
              {index < stepLabels.length - 1 && (
                <div className={`
                  w-16 h-0.5 mx-4
                  ${session?.steps[index]?.status === 'completed' ? 'bg-green-300' : 'bg-gray-200'}
                `} />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mr-3" />
          <span>Initializing Gizmo secrets wizard...</span>
        </CardContent>
      </Card>
    );
  }

  if (error && !session) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="py-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to initialize wizard: {error}
            </AlertDescription>
          </Alert>
          <div className="flex gap-3 mt-4">
            <Button onClick={initializeWizard}>
              Try Again
            </Button>
            {onCancel && (
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-blue-600" />
            Gizmo OAuth2 Integration Wizard
          </CardTitle>
          <div className="flex items-center justify-between">
            <p className="text-slate-600">
              Automated setup for Gizmo authentication and AI agent integration
            </p>
            <Badge variant="outline">
              Environment: {session?.environment || defaultEnvironment}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Overall Progress</span>
              <span className="text-sm text-slate-600">
                {Math.round(getStepProgress())}% Complete
              </span>
            </div>
            <Progress value={getStepProgress()} className="h-2" />
          </div>

          {/* Step Indicators */}
          {renderStepIndicator()}
        </CardContent>
      </Card>

      {/* Current Step Content */}
      <Card>
        <CardContent className="py-6">
          {session?.completedAt ? (
            <CompletionStep 
              sessionId={session.id}
              environment={session.environment}
              completedAt={session.completedAt}
              onComplete={() => onComplete?.(session.id)}
            />
          ) : (
            renderCurrentStepContent()
          )}
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onCancel}>
          Cancel Setup
        </Button>
        <div className="text-sm text-slate-500">
          Session ID: {session?.id}
        </div>
      </div>
    </div>
  );
};