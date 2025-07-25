import React from 'react';
import { GizmoConsole } from '../GizmoConsole';

interface GizmoConsoleExampleProps {
  className?: string;
}

export const GizmoConsoleExample: React.FC<GizmoConsoleExampleProps> = ({ className = '' }) => {
  // Example custom prompt handler with governance context
  const handlePrompt = async (prompt: string, agent: 'claude' | 'gizmo') => {
    // Simulate API call to Claude/Gizmo
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    if (agent === 'claude') {
      return `Claude's response to: "${prompt.slice(0, 30)}${prompt.length > 30 ? '...' : ''}"\n\nThis response includes project context and will be automatically logged to the governance system for tracking and audit purposes.`;
    } else {
      return `Gizmo's response: "${prompt}"\n\n⚡ Processed with project context\n🔧 Available actions logged\n📊 Metrics recorded`;
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          AI Console with Governance Logging
        </h2>
        <p className="text-gray-600 mb-4">
          This example demonstrates the GizmoConsole with full governance logging integration.
          All conversations can be tracked, logged, and audited through the governance system.
        </p>
      </div>

      {/* Basic Console */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-3">Basic Console</h3>
        <GizmoConsole 
          onPrompt={handlePrompt}
          placeholder="Ask Claude or Gizmo about your project..."
          maxHeight="max-h-80"
        />
      </div>

      {/* Console with Project Context */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-3">Console with Project Context & Auto-Logging</h3>
        <GizmoConsole 
          onPrompt={handlePrompt}
          projectId="wt-self-managed-app-migration"
          phaseStepId="phase-3-metaproject-activation"
          promptType="development"
          autoLog={true}
          userId="developer-user"
          placeholder="This console automatically logs all conversations to governance..."
          maxHeight="max-h-80"
        />
      </div>

      {/* Usage Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">🎯 Governance Logging Features:</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>Auto-log toggle:</strong> Click the ⚙️ settings icon to enable/disable automatic logging</li>
          <li>• <strong>Manual save:</strong> Click the 💾 save icon to log the latest exchange</li>
          <li>• <strong>Batch save:</strong> Use settings menu to save all unlogged conversations</li>
          <li>• <strong>Context tracking:</strong> Project ID, phase/step ID, and prompt type are recorded</li>
          <li>• <strong>Audit trail:</strong> All interactions tagged with DriveMemory + MemoryPlugin identifiers</li>
          <li>• <strong>Visual indicators:</strong> 📝 Logged status appears on saved conversations</li>
        </ul>
      </div>

      {/* Integration Notes */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <h4 className="font-semibold text-amber-900 mb-2">🔗 Integration Notes:</h4>
        <div className="text-sm text-amber-800 space-y-2">
          <p><strong>DriveMemory Tags:</strong> All logged conversations include 'wt-5.5-governance-log-hook' and 'ai-console-logging' tags for memory system integration.</p>
          <p><strong>Context Awareness:</strong> When integrated into Work Surfaces, the console automatically inherits project and phase context for enhanced governance tracking.</p>
          <p><strong>Error Handling:</strong> Logging failures are handled gracefully and don't block the UI - errors are logged to console for debugging.</p>
        </div>
      </div>
    </div>
  );
};