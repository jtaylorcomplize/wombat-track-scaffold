import React, { useState, useEffect, useRef } from 'react';
import { SPQRDashboardEmbed } from './SPQRDashboardEmbed';
import { LookerAuthService, type EmbedUrlRequest } from '../../services/looker-auth';

interface SPQRCardData {
  id: string;
  name: string;
  description: string;
  permissions: {
    viewRoles: string[];
    editRoles: string[];
  };
  filters: {
    defaultFilters: Array<{
      field_name: string;
      operator: string;
      value: string;
    }>;
    availableFilters: Array<{
      field_name: string;
      display_name: string;
      filter_type: string;
      options?: string[];
    }>;
  };
  embedConfig?: {
    allowExternalEmbed: boolean;
    domains: string[];
  };
}

interface SPQRDashboardContainerProps {
  cardData: SPQRCardData;
  userRole: string;
  userId: string;
  onGovernanceLog?: (entry: Record<string, unknown>) => void;
}

interface UsageMetrics {
  loadTime: number;
  userActions: Array<{
    action: string;
    timestamp: string;
    details: Record<string, unknown>;
  }>;
  sessionStart: string;
}

export const SPQRDashboardContainer: React.FC<SPQRDashboardContainerProps> = ({
  cardData,
  userRole,
  userId,
  onGovernanceLog
}) => {
  const [dashboardId, setDashboardId] = useState<string>('');
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [usageMetrics, setUsageMetrics] = useState<UsageMetrics>({
    loadTime: 0,
    userActions: [],
    sessionStart: new Date().toISOString()
  });

  // Use refs to prevent infinite loops
  const initializedRef = useRef(false);
  const loggedRef = useRef(false);
  const lastCardDataRef = useRef<string>('');

  const lookerAuth = new LookerAuthService({
    clientId: import.meta.env.VITE_LOOKER_CLIENT_ID || '',
    clientSecret: import.meta.env.VITE_LOOKER_CLIENT_SECRET || '',
    host: import.meta.env.VITE_LOOKER_HOST || 'actionstep.looker.com'
  });

  useEffect(() => {
    // Prevent infinite loops by checking if already initialized
    const cardDataKey = JSON.stringify({ id: cardData.id, role: userRole });
    if (lastCardDataRef.current !== cardDataKey) {
      lastCardDataRef.current = cardDataKey;\n      initializedRef.current = false; // Reset for new card/role combination
      initializeDashboard();
    }
  }, [cardData, userRole]);

  const initializeDashboard = async () => {
    // Guard against repeated initialization
    if (initializedRef.current) {
      return;
    }
    
    try {
      initializedRef.current = true;
      setAuthError(null);
      
      const permissionCheck = await lookerAuth.validateEmbedPermissions(userRole, cardData.permissions, cardData.name);
      
      if (!permissionCheck.canView) {
        setIsAuthorized(false);
        setAuthError(`Access denied: Role '${userRole}' cannot view this dashboard. Required roles: ${cardData.permissions.viewRoles.join(', ')}`);
        return;
      }

      setIsAuthorized(true);
      
      const targetDashboardId = import.meta.env.VITE_LOOKER_DASHBOARD_ID || 'b13a3784-7e6d-4e6b-acb5-4dae3202fd74';
      setDashboardId(targetDashboardId);

      // Log effective roles for debugging
      console.log(`🔐 Dashboard Authorization: ${cardData.name}`, {
        originalRole: userRole,
        effectiveRoles: permissionCheck.effectiveRoles,
        permissions: permissionCheck.permissions,
        canView: permissionCheck.canView,
        canEdit: permissionCheck.canEdit
      });

      const embedRequest: EmbedUrlRequest = {
        type: 'dashboard',
        id: targetDashboardId,
        permissions: permissionCheck.permissions,
        models: ['Actionstep_Model_v1'],
        external_group_id: `spqr_${permissionCheck.effectiveRoles.join('_')}`,
        user_attributes: lookerAuth.getUserAttributesForRole(userRole, permissionCheck.effectiveRoles),
        session_length: 3600,
        force_logout_login: true
      };

      await lookerAuth.createEmbedUrl(embedRequest);

      logGovernanceEntryOnce('dashboard_authorized', {
        card_id: cardData.id,
        card_name: cardData.name,
        dashboard_id: targetDashboardId,
        original_role: userRole,
        effective_roles: permissionCheck.effectiveRoles,
        user_permissions: permissionCheck.permissions,
        can_edit: permissionCheck.canEdit,
        hotfix_applied: permissionCheck.effectiveRoles.length > 1 ? 'single_dashboard_override' : 'none'
      });

    } catch (error) {
      console.error('Dashboard initialization failed:', error);
      setAuthError(error instanceof Error ? error.message : 'Unknown authorization error');
      setIsAuthorized(false);

      logGovernanceEntryOnce('dashboard_auth_failed', {
        card_id: cardData.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      // Reset initialization flag on error so it can be retried
      initializedRef.current = false;
    }
  };

  const handleLoadStart = () => {
    logGovernanceEntry('dashboard_load_start', {
      card_id: cardData.id,
      dashboard_id: dashboardId
    });
  };

  const handleLoadComplete = (loadTime: number) => {
    setUsageMetrics(prev => ({
      ...prev,
      loadTime
    }));

    logGovernanceEntry('dashboard_load_complete', {
      card_id: cardData.id,
      dashboard_id: dashboardId,
      load_time_ms: loadTime,
      performance_category: loadTime < 3000 ? 'fast' : loadTime < 7000 ? 'medium' : 'slow'
    });
  };

  const handleUserAction = (action: string, details: Record<string, unknown>) => {
    const actionEntry = {
      action,
      timestamp: new Date().toISOString(),
      details
    };

    setUsageMetrics(prev => ({
      ...prev,
      userActions: [...prev.userActions, actionEntry]
    }));

    logGovernanceEntry('user_action', {
      card_id: cardData.id,
      dashboard_id: dashboardId,
      action,
      details,
      session_duration_ms: Date.now() - new Date(usageMetrics.sessionStart).getTime()
    });
  };

  const handleError = (error: Error) => {
    logGovernanceEntry('dashboard_error', {
      card_id: cardData.id,
      dashboard_id: dashboardId,
      error: error.message,
      stack: error.stack
    });
  };

  const logGovernanceEntry = (eventType: string, details: Record<string, unknown>) => {
    const entry = {
      timestamp: new Date().toISOString(),
      event_type: eventType,
      user_id: userId,
      user_role: userRole,
      card_id: cardData.id,
      card_name: cardData.name,
      phase: 'Phase3–RuntimeEnablement',
      ...details
    };

    console.log('SPQR Governance Log:', entry);

    if (onGovernanceLog) {
      onGovernanceLog(entry);
    }
  };

  const logGovernanceEntryOnce = (eventType: string, details: Record<string, unknown>) => {
    if (!loggedRef.current) {
      logGovernanceEntry(eventType, details);
      loggedRef.current = true;
    }
  };

  const renderMetricsSummary = () => {
    if (!isAuthorized || usageMetrics.userActions.length === 0) return null;

    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <h4 className="text-sm font-medium text-blue-800 mb-2">Session Metrics</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-blue-600 font-medium">Load Time:</span>
            <div className="text-blue-800">{usageMetrics.loadTime}ms</div>
          </div>
          <div>
            <span className="text-blue-600 font-medium">Actions:</span>
            <div className="text-blue-800">{usageMetrics.userActions.length}</div>
          </div>
          <div>
            <span className="text-blue-600 font-medium">Session:</span>
            <div className="text-blue-800">
              {Math.round((Date.now() - new Date(usageMetrics.sessionStart).getTime()) / 1000 / 60)}m
            </div>
          </div>
          <div>
            <span className="text-blue-600 font-medium">Status:</span>
            <div className="text-green-600 font-medium">Active</div>
          </div>
        </div>
      </div>
    );
  };

  if (authError || !isAuthorized) {
    return (
      <div className="spqr-dashboard-container p-6 border rounded-lg bg-red-50">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M12 15v2m-6 0h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="text-xl font-medium text-red-800 mb-2">Authorization Required</h3>
          <p className="text-red-600 mb-4">
            {authError || 'Unable to authorize dashboard access'}
          </p>
          <div className="bg-white p-4 rounded border">
            <h4 className="font-medium text-gray-800 mb-2">Dashboard Information</h4>
            <p className="text-sm text-gray-600 mb-1"><strong>Name:</strong> {cardData.name}</p>
            <p className="text-sm text-gray-600 mb-1"><strong>Description:</strong> {cardData.description}</p>
            <p className="text-sm text-gray-600 mb-1"><strong>Your Role:</strong> {userRole}</p>
            <p className="text-sm text-gray-600">
              <strong>Required Roles:</strong> {cardData.permissions.viewRoles.join(', ')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!dashboardId) {
    return (
      <div className="spqr-dashboard-container p-6 border rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="spqr-dashboard-container">
      {renderMetricsSummary()}
      
      <SPQRDashboardEmbed
        cardData={cardData}
        dashboardId={dashboardId}
        userRole={userRole}
        onLoadStart={handleLoadStart}
        onLoadComplete={handleLoadComplete}
        onUserAction={handleUserAction}
        onError={handleError}
      />

      <div className="mt-4 p-3 bg-gray-50 rounded text-xs text-gray-500">
        <div className="flex justify-between items-center">
          <span>SPQR Phase 3 – Runtime Enablement</span>
          <span>Dashboard ID: {dashboardId}</span>
        </div>
      </div>
    </div>
  );
};

export default SPQRDashboardContainer;