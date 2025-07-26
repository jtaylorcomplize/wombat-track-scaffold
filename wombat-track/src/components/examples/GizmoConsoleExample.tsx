import React from 'react';
import { GizmoConsole } from '../GizmoConsole';
import { handleAIPrompt, testDispatchers } from '../../lib/aiDispatchers';

interface GizmoConsoleExampleProps {
  className?: string;
}

export const GizmoConsoleExample: React.FC<GizmoConsoleExampleProps> = ({ className = '' }) => {
  // Test dispatcher functionality
  const runDispatcherTest = async () => {
    console.log('Running dispatcher test...');
    const results = await testDispatchers('Test prompt for Phase WT-5.6 integration');
    console.log('Test results:', results);
  };

  // Example custom prompt handler (legacy - for comparison)
  const handleLegacyPrompt = async (prompt: string, agent: 'claude' | 'gizmo') => {
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    if (agent === 'claude') {
      return `Legacy Claude response to: "${prompt.slice(0, 30)}${prompt.length > 30 ? '...' : ''}"\n\nThis is using the old mock system for comparison.`;
    } else {
      return `Legacy Gizmo response: "${prompt}"\n\n⚡ This is the old mock response system`;
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Phase WT-5.6: Real-Time AI Console with Live Dispatchers
        </h2>
        <p className="text-gray-600 mb-4">
          This example demonstrates the enhanced GizmoConsole with real-time Claude + Gizmo integration,
          live/fallback indicators, performance tracking, and governance logging with isLive metadata.
        </p>
        <button
          onClick={runDispatcherTest}
          className="mb-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          🧪 Test Dispatchers (Check Console)
        </button>
      </div>

      {/* Real-Time AI Console */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-3">🚀 Real-Time AI Console (Phase WT-5.6)</h3>
        <p className="text-sm text-gray-600 mb-3">
          Uses live dispatchers with fallback handling. Notice the live/fallback indicators!
        </p>
        <GizmoConsole 
          projectId="wt-self-managed-app-migration"
          phaseStepId="phase-3-metaproject-activation"
          promptType="development"
          autoLog={true}
          userId="developer-user"
          placeholder="Real-time AI with live status indicators and performance tracking..."
          maxHeight="max-h-80"
        />
      </div>

      {/* Legacy Console for Comparison */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-3">📝 Legacy Console (For Comparison)</h3>
        <p className="text-sm text-yellow-800 mb-3">
          Uses old mock system - compare the response quality and indicators
        </p>
        <GizmoConsole 
          onPrompt={handleLegacyPrompt}
          projectId="legacy-test"
          phaseStepId="comparison-test"
          promptType="testing"
          autoLog={false}
          placeholder="Legacy mock responses for comparison..."
          maxHeight="max-h-80"
        />
      </div>

      {/* Phase WT-5.6 Features */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h4 className="font-semibold text-green-900 mb-2">🚀 Phase WT-5.6 New Features:</h4>
        <ul className="text-sm text-green-800 space-y-1">
          <li>• <strong>Live Indicators:</strong> 🟢 Live API / 🟡 Fallback status on agent selector and messages</li>
          <li>• <strong>Performance Tracking:</strong> Response times displayed in message tooltips</li>
          <li>• <strong>Real Dispatchers:</strong> dispatchToClaude() with /api/claude/dispatch integration</li>
          <li>• <strong>Enhanced Gizmo:</strong> Context-aware responses ready for AI integration</li>
          <li>• <strong>Governance Metadata:</strong> isLive, responseTime, and dispatchMode tracked</li>
          <li>• <strong>Fallback Handling:</strong> Graceful degradation when APIs are unavailable</li>
        </ul>
      </div>

      {/* Usage Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">🎯 Governance Logging Features:</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>Auto-log toggle:</strong> Click the ⚙️ settings icon to enable/disable automatic logging</li>
          <li>• <strong>Manual save:</strong> Click the 💾 save icon to log the latest exchange</li>
          <li>• <strong>Batch save:</strong> Use settings menu to save all unlogged conversations</li>
          <li>• <strong>Context tracking:</strong> Project ID, phase/step ID, and prompt type are recorded</li>
          <li>• <strong>Live metadata:</strong> isLive status and performance metrics in governance logs</li>
          <li>• <strong>Visual indicators:</strong> 📝 Logged, 🟢 Live, 🟡 Fallback status on messages</li>
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