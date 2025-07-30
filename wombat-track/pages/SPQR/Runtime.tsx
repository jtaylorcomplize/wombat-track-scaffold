import React, { useEffect } from 'react';
import { SPQRRuntimeDashboard } from '../../src/components/SPQR/SPQRRuntimeDashboard';
import { GovernanceLogger } from '../../src/services/governance-logger';

const SPQRRuntimePage: React.FC = () => {
  const governanceLogger = GovernanceLogger.getInstance();

  useEffect(() => {
    // Log page access for Phase 5 UAT tracking
    governanceLogger.log({
      event_type: 'page_access',
      user_id: 'runtime-user',
      user_role: 'uat-tester',
      resource_type: 'dashboard',
      resource_id: 'spqr_runtime_page',
      action: 'page_load',
      success: true,
      details: {
        phase: 'Phase5–LiveRuntimeSurface',
        page_path: '/SPQR/Runtime',
        page_component: 'SPQRRuntimePage',
        load_timestamp: new Date().toISOString(),
        expected_features: [
          'Role-based dashboard filtering',
          'RAG health status display',
          'UAT interaction logging',
          'Usage reports integration',
          'Alert management interface'
        ]
      },
      runtime_context: {
        phase: 'Phase5–LiveRuntimeSurface',
        environment: 'uat',
        page_type: 'runtime_surface'
      }
    });

    // Page unload cleanup
    return () => {
      governanceLogger.log({
        event_type: 'page_unload',
        user_id: 'runtime-user',
        user_role: 'uat-tester',
        resource_type: 'dashboard',
        resource_id: 'spqr_runtime_page',
        action: 'page_unload',
        success: true,
        details: {
          phase: 'Phase5–LiveRuntimeSurface',
          session_duration_ms: performance.now(),
          page_path: '/SPQR/Runtime'
        }
      });
    };
  }, [governanceLogger]);

  return (
    <div className="min-h-screen bg-gray-50">
      <SPQRRuntimeDashboard />
    </div>
  );
};

export default SPQRRuntimePage;