/**
 * Activation Step - Activate Gizmo agents and monitoring
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, Loader2, Zap, Bot, Activity, Anchor } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface ActivationStepProps {
  sessionId: string;
  environment: 'development' | 'staging' | 'production';
  onComplete: (data: Record<string, unknown>) => void;
  onError: (error: string) => void;
}

interface ActivationResult {
  agents_activated: boolean;
  memory_anchor_id: string;
  activation_completed_at: string;
  active_agents?: Array<{
    id: string;
    name: string;
    status: 'active' | 'inactive' | 'error';
  }>;
}

export const ActivationStep: React.FC<ActivationStepProps> = ({
  sessionId,
  environment,
  onComplete,
  onError
}) => {
  const [activating, setActivating] = useState(false);
  const [activationResult, setActivationResult] = useState<ActivationResult | null>(null);
  const [activationError, setActivationError] = useState<string | null>(null);
  const [autoActivating, setAutoActivating] = useState(true);
  const [activationProgress, setActivationProgress] = useState(0);

  const agentTypes = [
    { id: 'memory-anchor-agent', name: 'Memory Anchor Agent', icon: Anchor, description: 'Creates semantic memory anchors for SDLC events' },
    { id: 'auto-audit-agent', name: 'Auto-Audit Agent', icon: Activity, description: 'Automated compliance and quality auditing' },
    { id: 'side-quest-detector', name: 'Side Quest Detector', icon: Bot, description: 'Detects and classifies development side quests' }
  ];

  useEffect(() => {
    if (autoActivating) {
      performActivation();
    }
  }, [autoActivating]);

  const performActivation = async () => {
    try {
      setActivating(true);
      setActivationError(null);
      setActivationResult(null);
      setActivationProgress(0);

      // Simulate progressive activation
      const progressSteps = [
        { progress: 20, message: 'Initializing agent monitoring...' },
        { progress: 40, message: 'Setting up Gizmo authentication...' },
        { progress: 60, message: 'Activating Memory Anchor Agent...' },
        { progress: 80, message: 'Activating Auto-Audit Agent...' },
        { progress: 90, message: 'Activating Side Quest Detector...' },
        { progress: 100, message: 'Finalizing activation...' }
      ];

      for (const step of progressSteps) {
        setActivationProgress(step.progress);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      const response = await fetch(`/api/secrets/gizmo/wizard/${sessionId}/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Activation failed');
      }

      const data = await response.json();
      setActivationResult(data.wizard_result);

      // Auto-complete after showing results
      setTimeout(() => {
        onComplete({
          activation_result: data.wizard_result,
          activated_at: new Date().toISOString()
        });
      }, 3000);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Activation failed';
      setActivationError(errorMessage);
      onError(errorMessage);
    } finally {
      setActivating(false);
      setAutoActivating(false);
      setActivationProgress(100);
    }
  };

  const getActivationStatusIcon = () => {
    if (activating) {
      return <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />;
    }
    
    if (activationError) {
      return <AlertCircle className="h-8 w-8 text-red-600" />;
    }
    
    if (activationResult?.agents_activated) {
      return <CheckCircle className="h-8 w-8 text-green-600" />;
    }
    
    return <Zap className="h-8 w-8 text-gray-400" />;
  };

  const getActivationStatusText = () => {
    if (activating) {
      return 'Activating AI agents...';
    }
    
    if (activationError) {
      return 'Activation failed';
    }
    
    if (activationResult?.agents_activated) {
      return 'AI agents activated successfully!';
    }
    
    return 'Ready to activate';
  };

  const renderAgentStatus = () => {
    return (
      <div className="space-y-3">
        {agentTypes.map((agent) => {
          const Icon = agent.icon;
          let status: 'pending' | 'activating' | 'active' | 'error' = 'pending';
          
          if (activating) {
            status = 'activating';
          } else if (activationResult?.agents_activated) {
            status = 'active';
          } else if (activationError) {
            status = 'error';
          }

          return (
            <div key={agent.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                {status === 'active' ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : status === 'activating' ? (
                  <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                ) : status === 'error' ? (
                  <AlertCircle className="h-5 w-5 text-red-600" />
                ) : (
                  <Icon className="h-5 w-5 text-gray-400" />
                )}
                <div>
                  <p className="font-medium">{agent.name}</p>
                  <p className="text-sm text-slate-600">{agent.description}</p>
                </div>
              </div>
              <Badge variant={
                status === 'active' ? 'success' :
                status === 'activating' ? 'default' :
                status === 'error' ? 'destructive' :
                'secondary'
              }>
                {status === 'active' ? 'Active' :
                 status === 'activating' ? 'Activating' :
                 status === 'error' ? 'Error' :
                 'Pending'}
              </Badge>
            </div>
          );
        })}
      </div>
    );
  };

  const renderActivationResults = () => {
    if (!activationResult) return null;

    return (
      <Card className="bg-green-50 border-green-200">
        <CardHeader>
          <CardTitle className="text-green-800">Activation Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Memory Anchor */}
          <div className="flex items-center justify-between p-3 bg-white border border-green-200 rounded-lg">
            <div className="flex items-center gap-3">
              <Anchor className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium text-green-800">Memory Anchor Created</p>
                <p className="text-sm text-green-600">{activationResult.memory_anchor_id}</p>
              </div>
            </div>
            <Badge className="bg-green-100 text-green-800">
              ✓ Created
            </Badge>
          </div>

          {/* Agent Count */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-white border border-green-200 rounded-lg">
              <p className="text-2xl font-bold text-green-700">{agentTypes.length}</p>
              <p className="text-sm text-green-600">Agents Activated</p>
            </div>
            <div className="text-center p-3 bg-white border border-green-200 rounded-lg">
              <p className="text-2xl font-bold text-green-700">100%</p>
              <p className="text-sm text-green-600">Success Rate</p>
            </div>
          </div>

          {/* Completion Time */}
          <div className="pt-3 border-t border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-800">Activation Completed</p>
                <p className="text-xs text-green-600">
                  {activationResult.activation_completed_at ? 
                    new Date(activationResult.activation_completed_at).toLocaleString() :
                    'Just now'
                  }
                </p>
              </div>
              <Badge className="bg-green-100 text-green-800">
                ✓ Complete
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderTroubleshooting = () => {
    if (!activationError) return null;

    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Activation failed:</strong> {activationError}
          
          <div className="mt-3">
            <p className="font-medium mb-2">Troubleshooting steps:</p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Verify agent monitoring service is running</li>
              <li>Check if environment variables are properly loaded</li>
              <li>Ensure Gizmo authentication is working</li>
              <li>Verify network connectivity to agent services</li>
              <li>Check system resources and permissions</li>
            </ul>
          </div>
        </AlertDescription>
      </Alert>
    );
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        {getActivationStatusIcon()}
        <h3 className="text-xl font-semibold mt-4 mb-2">{getActivationStatusText()}</h3>
        <p className="text-slate-600">
          {activating 
            ? 'Starting AI agents and creating memory anchors for your SDLC workflow...'
            : activationResult?.agents_activated
            ? 'Your AI agents are now active and ready to enhance your development workflow.'
            : 'We\'re ready to activate your AI agents and create the initial memory anchor.'
          }
        </p>
      </div>

      {/* Activation Progress */}
      {activating && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center justify-center space-x-4">
              <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
              <div className="text-center">
                <p className="text-sm font-medium text-blue-800">Activating AI Agents</p>
                <p className="text-xs text-blue-600">Initializing agent monitoring and memory systems...</p>
              </div>
            </div>
            <Progress value={activationProgress} className="h-2" />
            <p className="text-center text-sm text-blue-600">
              {activationProgress}% Complete
            </p>
          </CardContent>
        </Card>
      )}

      {/* Agent Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            AI Agent Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {renderAgentStatus()}
        </CardContent>
      </Card>

      {/* Activation Results */}
      {activationResult && renderActivationResults()}

      {/* Troubleshooting */}
      {renderTroubleshooting()}

      {/* Benefits Info */}
      <Alert>
        <Zap className="h-4 w-4" />
        <AlertDescription>
          <strong>What happens next:</strong> Your AI agents will now automatically:
          <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
            <li>Create memory anchors for all SDLC events and decisions</li>
            <li>Perform automated compliance and quality audits</li>
            <li>Detect and classify development side quests</li>
            <li>Provide real-time insights and recommendations</li>
          </ul>
        </AlertDescription>
      </Alert>

      {/* Action Buttons */}
      <div className="flex justify-between pt-4">
        {activationError && (
          <Button 
            variant="outline" 
            onClick={performActivation}
            disabled={activating}
          >
            {activating ? 'Activating...' : 'Retry Activation'}
          </Button>
        )}
        
        {activationResult?.agents_activated && (
          <Button 
            onClick={() => onComplete({
              activation_result: activationResult,
              activated_at: new Date().toISOString()
            })}
            className="ml-auto"
          >
            Complete Setup
          </Button>
        )}
      </div>

      {/* Environment Info */}
      <div className="text-center text-sm text-slate-500">
        Activating agents in <Badge variant="outline">{environment}</Badge> environment
      </div>
    </div>
  );
};