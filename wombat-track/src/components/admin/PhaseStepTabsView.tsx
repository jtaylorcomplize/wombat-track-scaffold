/**
 * Phase Step Tabs View - OF-9.0.8.5
 * Expanded tabbed interface for step-level documentation and orchestration details
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { 
  FileText, 
  Link as LinkIcon, 
  Shield, 
  Activity,
  ExternalLink,
  Clock,
  User,
  CheckCircle,
  AlertTriangle,
  Copy,
  Download,
  Eye,
  Bot
} from 'lucide-react';
import type { PhaseStep, OrchestrationLog } from '../../pages/admin/ProjectAdminEdit';

interface PhaseStepTabsViewProps {
  step: PhaseStep;
  onClose?: () => void;
  className?: string;
}

interface LinkedDocument {
  id: string;
  name: string;
  type: string;
  size?: string;
  uploadedAt: string;
  uploadedBy: string;
  url?: string;
}

interface MemoryAnchor {
  id: string;
  name: string;
  description: string;
  category: string;
  linkedAt: string;
  status: 'active' | 'deprecated' | 'pending';
  url?: string;
}

interface GovernanceLogEntry {
  id: number;
  timestamp: string;
  event_type: string;
  action: string;
  user_id: string;
  success: boolean;
  details: string;
  resource_id?: string;
}

export const PhaseStepTabsView: React.FC<PhaseStepTabsViewProps> = ({
  step,
  onClose,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState<'governance' | 'anchors' | 'documents' | 'execution'>('governance');
  const [linkedDocs, setLinkedDocs] = useState<LinkedDocument[]>([]);
  const [memoryAnchors, setMemoryAnchors] = useState<MemoryAnchor[]>([]);
  const [governanceLogs, setGovernanceLogs] = useState<GovernanceLogEntry[]>([]);
  const [executionLogs, setExecutionLogs] = useState<OrchestrationLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Mock data loading
  useEffect(() => {
    const loadStepData = async () => {
      setLoading(true);
      
      // Simulate API calls
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock linked documents
      if (step.linkedDocuments && step.linkedDocuments.length > 0) {
        setLinkedDocs([
          {
            id: 'doc-1',
            name: 'Requirements Specification.pdf',
            type: 'pdf',
            size: '2.4 MB',
            uploadedAt: '2025-08-06T10:30:00Z',
            uploadedBy: 'john.doe',
            url: '#'
          },
          {
            id: 'doc-2', 
            name: 'Technical Design Document.docx',
            type: 'docx',
            size: '1.8 MB',
            uploadedAt: '2025-08-05T14:20:00Z',
            uploadedBy: 'jane.smith',
            url: '#'
          }
        ]);
      }

      // Mock memory anchors
      if (step.memoryAnchors && step.memoryAnchors.length > 0) {
        setMemoryAnchors([
          {
            id: 'anchor-1',
            name: `${step.stepName} - Process Anchor`,
            description: 'Memory anchor tracking process completion and validation requirements',
            category: 'Process Documentation',
            linkedAt: '2025-08-06T09:15:00Z',
            status: 'active',
            url: '#'
          },
          {
            id: 'anchor-2',
            name: `${step.stepName} - Compliance Anchor`,
            description: 'Compliance requirements and regulatory validation checkpoints',
            category: 'Governance Framework',
            linkedAt: '2025-08-05T16:45:00Z', 
            status: 'active',
            url: '#'
          }
        ]);
      }

      // Mock governance logs
      if (step.governanceLogs && step.governanceLogs > 0) {
        setGovernanceLogs([
          {
            id: 1,
            timestamp: '2025-08-07T10:30:00Z',
            event_type: 'step_initialization',
            action: 'initialize',
            user_id: 'claude',
            success: true,
            details: `Step ${step.stepName} initialized with orchestration hooks`,
            resource_id: step.stepId
          },
          {
            id: 2,
            timestamp: '2025-08-07T11:15:00Z',
            event_type: 'orchestration_status',
            action: 'update',
            user_id: 'system',
            success: true,
            details: `Orchestration status updated to ${step.orchestrationStatus}`,
            resource_id: step.stepId
          },
          {
            id: 3,
            timestamp: '2025-08-07T12:00:00Z',
            event_type: 'memory_anchor_link',
            action: 'auto_link',
            user_id: 'claude',
            success: true,
            details: 'Memory anchors automatically linked via live-admin.ts',
            resource_id: step.stepId
          }
        ]);
      }

      // Mock execution logs
      if (step.orchestrationStatus && step.orchestrationStatus !== 'pending') {
        setExecutionLogs([
          {
            timestamp: '2025-08-07T10:30:00Z',
            event: 'orchestration_hook_triggered',
            executor: 'claude',
            status: 'success',
            details: 'SDLC phase step hook triggered via sdlc-phasestep-hooks.ts'
          },
          {
            timestamp: '2025-08-07T10:32:00Z',
            event: 'dual_orchestrator_workflow_started',
            executor: 'system',
            status: 'info',
            details: 'executeDualOrchestratorWorkflow() initiated for step execution'
          },
          {
            timestamp: '2025-08-07T10:35:00Z',
            event: 'governance_logging_complete',
            executor: 'system',
            status: 'success',
            details: 'Governance entries created in DriveMemory and oApp DB'
          }
        ]);
      }

      setLoading(false);
    };

    loadStepData();
  }, [step]);

  const getExecutorIcon = (executor: string) => {
    switch (executor) {
      case 'claude': return <Bot className="h-4 w-4 text-blue-600" />;
      case 'cc': return <User className="h-4 w-4 text-green-600" />;
      case 'zoi': return <User className="h-4 w-4 text-purple-600" />;
      case 'user': return <User className="h-4 w-4 text-gray-600" />;
      case 'system': return <Activity className="h-4 w-4 text-orange-600" />;
      default: return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default: return <Activity className="h-4 w-4 text-blue-600" />;
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">{step.stepName}</h3>
            <p className="text-sm text-gray-600 mt-1">{step.description}</p>
          </div>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              ×
            </Button>
          )}
        </div>
        
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mt-4">
          <nav className="-mb-px flex space-x-8">
            {(['governance', 'anchors', 'documents', 'execution'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-2 px-1 border-b-2 font-medium text-sm capitalize ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab === 'governance' && (
                  <>
                    <Shield className="inline h-4 w-4 mr-1" />
                    Governance Logs ({governanceLogs.length})
                  </>
                )}
                {tab === 'anchors' && (
                  <>
                    <LinkIcon className="inline h-4 w-4 mr-1" />
                    Memory Anchors ({memoryAnchors.length})
                  </>
                )}
                {tab === 'documents' && (
                  <>
                    <FileText className="inline h-4 w-4 mr-1" />
                    Step Documents ({linkedDocs.length})
                  </>
                )}
                {tab === 'execution' && (
                  <>
                    <Activity className="inline h-4 w-4 mr-1" />
                    Execution Log ({executionLogs.length})
                  </>
                )}
              </button>
            ))}
          </nav>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading step data...</span>
          </div>
        ) : (
          <>
            {/* Governance Logs Tab */}
            {activeTab === 'governance' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Governance Activity</h4>
                  <Badge variant="outline" className="text-xs">
                    {governanceLogs.length} entries
                  </Badge>
                </div>
                
                {governanceLogs.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Shield size={48} className="mx-auto mb-3 text-gray-300" />
                    <p>No governance logs for this step yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {governanceLogs.map((log) => (
                      <div key={log.id} className="border rounded-lg p-3 bg-gray-50">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <Badge variant="outline" className="text-xs">
                                {log.event_type}
                              </Badge>
                              <span className="text-xs text-gray-500">
                                {new Date(log.timestamp).toLocaleString()}
                              </span>
                              <span className="text-xs text-gray-500">
                                by {log.user_id}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700">{log.details}</p>
                          </div>
                          {log.success ? (
                            <CheckCircle className="h-4 w-4 text-green-600 ml-2" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-red-600 ml-2" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Memory Anchors Tab */}
            {activeTab === 'anchors' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Linked Memory Anchors</h4>
                  <Badge variant="outline" className="text-xs">
                    {memoryAnchors.length} anchors
                  </Badge>
                </div>
                
                {memoryAnchors.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <LinkIcon size={48} className="mx-auto mb-3 text-gray-300" />
                    <p>No memory anchors linked to this step.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {memoryAnchors.map((anchor) => (
                      <div key={anchor.id} className="border rounded-lg p-4 bg-white">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h5 className="font-medium text-gray-900">{anchor.name}</h5>
                              <Badge 
                                variant={anchor.status === 'active' ? 'default' : 'outline'}
                                className="text-xs"
                              >
                                {anchor.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{anchor.description}</p>
                            <div className="flex items-center text-xs text-gray-500 space-x-4">
                              <span>Category: {anchor.category}</span>
                              <span>Linked: {new Date(anchor.linkedAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 ml-4">
                            {anchor.url && (
                              <Button size="sm" variant="outline" className="text-xs">
                                <ExternalLink className="h-3 w-3 mr-1" />
                                View
                              </Button>
                            )}
                            <Button size="sm" variant="outline" className="text-xs">
                              <Copy className="h-3 w-3 mr-1" />
                              Copy ID
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Documents Tab */}
            {activeTab === 'documents' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Step Documents</h4>
                  <Badge variant="outline" className="text-xs">
                    {linkedDocs.length} documents
                  </Badge>
                </div>
                
                {linkedDocs.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <FileText size={48} className="mx-auto mb-3 text-gray-300" />
                    <p>No documents linked to this step.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {linkedDocs.map((doc) => (
                      <div key={doc.id} className="border rounded-lg p-4 bg-white">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3">
                            <FileText className="h-5 w-5 text-gray-600 mt-1" />
                            <div>
                              <h5 className="font-medium text-gray-900">{doc.name}</h5>
                              <div className="flex items-center text-xs text-gray-500 space-x-4 mt-1">
                                <span>Type: {doc.type.toUpperCase()}</span>
                                {doc.size && <span>Size: {doc.size}</span>}
                                <span>Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}</span>
                                <span>By: {doc.uploadedBy}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button size="sm" variant="outline" className="text-xs">
                              <Eye className="h-3 w-3 mr-1" />
                              View
                            </Button>
                            <Button size="sm" variant="outline" className="text-xs">
                              <Download className="h-3 w-3 mr-1" />
                              Download
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Execution Log Tab */}
            {activeTab === 'execution' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Orchestration Execution Log</h4>
                  <Badge variant="outline" className="text-xs">
                    {executionLogs.length} events
                  </Badge>
                </div>
                
                {executionLogs.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Activity size={48} className="mx-auto mb-3 text-gray-300" />
                    <p>No execution logs available.</p>
                    <p className="text-xs mt-1">Logs will appear when orchestration hooks are triggered.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {executionLogs.map((log, index) => (
                      <div key={index} className="border rounded-lg p-3 bg-gray-50">
                        <div className="flex items-start space-x-3">
                          {getExecutorIcon(log.executor)}
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="text-sm font-medium text-gray-900">{log.event}</span>
                              {getStatusIcon(log.status)}
                              <span className="text-xs text-gray-500">
                                {new Date(log.timestamp).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700">{log.details}</p>
                            <div className="text-xs text-gray-500 mt-1">
                              Executor: {log.executor}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default PhaseStepTabsView;