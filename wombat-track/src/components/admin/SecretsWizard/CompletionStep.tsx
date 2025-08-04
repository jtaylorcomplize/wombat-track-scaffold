/**
 * Completion Step - Wizard success summary and next steps
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, Trophy, ExternalLink, BookOpen, Settings, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface CompletionStepProps {
  sessionId: string;
  environment: 'development' | 'staging' | 'production';
  completedAt: string;
  onComplete?: () => void;
}

export const CompletionStep: React.FC<CompletionStepProps> = ({
  sessionId,
  environment,
  completedAt,
  onComplete
}) => {
  const getDurationText = () => {
    const duration = Date.now() - new Date(completedAt).getTime();
    const minutes = Math.round(duration / (1000 * 60));
    return minutes > 0 ? `${minutes} minutes` : 'Less than a minute';
  };

  const nextSteps = [
    {
      icon: Settings,
      title: 'Monitor Agent Status',
      description: 'Check the Admin dashboard to see your AI agents in action',
      action: 'Go to Admin Panel',
      link: '/admin'
    },
    {
      icon: Zap,
      title: 'View Memory Anchors',
      description: 'See the memory anchors being created for your SDLC events',
      action: 'View Memory System',
      link: '/admin/memory-anchors'
    },
    {
      icon: BookOpen,
      title: 'Review Documentation',
      description: 'Learn about AI agent capabilities and configuration options',
      action: 'Read Docs',
      link: '/docs/gizmo-integration'
    }
  ];

  const integrationFeatures = [
    'OAuth2 authentication configured and validated',
    'Environment variables securely propagated',
    'Memory Anchor Agent creating semantic anchors',
    'Auto-Audit Agent monitoring compliance',
    'Side Quest Detector classifying development tasks',
    'Real-time agent monitoring and health checks',
    'Governance logging for all integration events',
    'Encrypted backup of all credentials'
  ];

  return (
    <div className="space-y-6">
      {/* Success Header */}
      <div className="text-center mb-8">
        <div className="relative">
          <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
          <Trophy className="h-8 w-8 text-yellow-500 absolute -top-2 -right-2" />
        </div>
        <h3 className="text-2xl font-bold text-green-700 mb-2">
          Gizmo Integration Complete!
        </h3>
        <p className="text-slate-600 text-lg">
          Your AI agents are now active and enhancing your SDLC workflow
        </p>
        <div className="flex items-center justify-center gap-4 mt-4">
          <Badge variant="outline" className="text-green-700 border-green-300">
            <CheckCircle className="h-3 w-3 mr-1" />
            Setup Complete
          </Badge>
          <Badge variant="outline">
            Environment: {environment}
          </Badge>
          <Badge variant="outline">
            Duration: {getDurationText()}
          </Badge>
        </div>
      </div>

      {/* Integration Summary */}
      <Card className="bg-green-50 border-green-200">
        <CardHeader>
          <CardTitle className="text-green-800 flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Integration Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {integrationFeatures.map((feature, index) => (
              <div key={index} className="flex items-center gap-3 p-2">
                <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                <span className="text-sm text-green-700">{feature}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Session Details */}
      <Card>
        <CardHeader>
          <CardTitle>Session Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-slate-700">Session ID</p>
              <p className="text-sm text-slate-600 font-mono">{sessionId}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700">Environment</p>
              <p className="text-sm text-slate-600">{environment}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700">Completed At</p>
              <p className="text-sm text-slate-600">
                {new Date(completedAt).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700">Setup Duration</p>
              <p className="text-sm text-slate-600">{getDurationText()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Next Steps */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5" />
            Recommended Next Steps
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {nextSteps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50">
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium">{step.title}</p>
                    <p className="text-sm text-slate-600">{step.description}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <a href={step.link} target="_blank" rel="noopener noreferrer">
                    {step.action}
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </a>
                </Button>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Important Notes */}
      <Alert>
        <BookOpen className="h-4 w-4" />
        <AlertDescription>
          <strong>Important:</strong> Your Gizmo credentials are now active in the {environment} environment.
          <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
            <li>AI agents will automatically create memory anchors for SDLC events</li>
            <li>All agent activities are logged in the governance system</li>
            <li>Credentials are encrypted and backed up securely</li>
            <li>Agent monitoring is available in the Admin dashboard</li>
          </ul>
        </AlertDescription>
      </Alert>

      {/* Success Metrics */}
      <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
        <CardContent className="pt-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-green-600">100%</p>
              <p className="text-sm text-slate-600">Setup Success</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">3</p>
              <p className="text-sm text-slate-600">Agents Active</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-600">∞</p>
              <p className="text-sm text-slate-600">Possibilities</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-center gap-4 pt-6">
        <Button onClick={onComplete} size="lg" className="min-w-40">
          <CheckCircle className="h-4 w-4 mr-2" />
          Finish Setup
        </Button>
        <Button variant="outline" size="lg" asChild>
          <a href="/admin" target="_blank" rel="noopener noreferrer">
            <Settings className="h-4 w-4 mr-2" />
            Go to Admin Panel
          </a>
        </Button>
      </div>

      {/* Footer */}
      <div className="text-center text-sm text-slate-500 pt-4 border-t">
        <p>
          🎉 Congratulations! Your Gizmo OAuth2 integration is complete and your AI agents are ready to enhance your development workflow.
        </p>
      </div>
    </div>
  );
};