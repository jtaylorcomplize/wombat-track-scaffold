import React, { useEffect, useRef, useState } from 'react';
import { LookerEmbedSDK } from '@looker/embed-sdk';

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

interface SPQRDashboardEmbedProps {
  cardData: SPQRCardData;
  dashboardId: string;
  userRole: string;
  onLoadStart?: () => void;
  onLoadComplete?: (loadTime: number) => void;
  onUserAction?: (action: string, details: Record<string, unknown>) => void;
  onError?: (error: Error) => void;
}

interface EmbedConfig {
  host: string;
  auth_url: string;
  dashboard_id: string;
  theme: string;
  filters?: Record<string, unknown>;
}

export const SPQRDashboardEmbed: React.FC<SPQRDashboardEmbedProps> = ({
  cardData,
  dashboardId,
  userRole,
  onLoadStart,
  onLoadComplete,
  onUserAction,
  onError
}) => {
  const embedRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [embedStartTime, setEmbedStartTime] = useState<number>(0);

  const hasViewPermission = () => {
    return cardData.permissions.viewRoles.includes(userRole) || 
           cardData.permissions.editRoles.includes(userRole);
  };

  const buildEmbedConfig = (): EmbedConfig => {
    const config: EmbedConfig = {
      host: process.env.LOOKER_HOST || 'your-looker-instance.looker.com',
      auth_url: '/api/looker/auth',
      dashboard_id: dashboardId,
      theme: 'actionstep_theme'
    };

    const filters: Record<string, unknown> = {};
    cardData.filters.defaultFilters.forEach(filter => {
      filters[filter.field_name] = filter.value;
    });

    if (Object.keys(filters).length > 0) {
      config.filters = filters;
    }

    return config;
  };

  const logUsageEvent = (eventType: string, details: Record<string, unknown>) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      user_role: userRole,
      card_id: cardData.id,
      card_name: cardData.name,
      event_type: eventType,
      details: details
    };

    console.log('SPQR Dashboard Usage:', logEntry);
    
    if (onUserAction) {
      onUserAction(eventType, details);
    }
  };

  useEffect(() => {
    if (!hasViewPermission()) {
      setError(`Access denied: User role '${userRole}' does not have permission to view this dashboard.`);
      setIsLoading(false);
      return;
    }

    if (!embedRef.current) return;

    const loadDashboard = async () => {
      try {
        setIsLoading(true);
        setEmbedStartTime(Date.now());
        
        if (onLoadStart) {
          onLoadStart();
        }

        const embedConfig = buildEmbedConfig();
        
        LookerEmbedSDK.init(embedConfig.host, embedConfig.auth_url);

        const dashboard = LookerEmbedSDK.createDashboardWithId(embedConfig.dashboard_id)
          .appendTo(embedRef.current!)
          .withTheme(embedConfig.theme)
          .withClassName('spqr-dashboard-embed')
          .on('dashboard:loaded', () => {
            const loadTime = Date.now() - embedStartTime;
            setIsLoading(false);
            
            logUsageEvent('dashboard_loaded', {
              load_time_ms: loadTime,
              dashboard_id: dashboardId
            });

            if (onLoadComplete) {
              onLoadComplete(loadTime);
            }
          })
          .on('dashboard:run:start', () => {
            logUsageEvent('query_started', {
              dashboard_id: dashboardId
            });
          })
          .on('dashboard:run:complete', () => {
            logUsageEvent('query_completed', {
              dashboard_id: dashboardId
            });
          })
          .on('dashboard:filters:changed', (event: Record<string, unknown>) => {
            logUsageEvent('filters_changed', {
              dashboard_id: dashboardId,
              filters: event.dashboard.dashboard_filters
            });
          })
          .on('page:changed', (event: Record<string, unknown>) => {
            logUsageEvent('page_changed', {
              dashboard_id: dashboardId,
              page: event.page
            });
          })
          .on('dashboard:edit:start', () => {
            if (!cardData.permissions.editRoles.includes(userRole)) {
              logUsageEvent('unauthorized_edit_attempt', {
                dashboard_id: dashboardId,
                user_role: userRole
              });
              return false;
            }
            
            logUsageEvent('edit_started', {
              dashboard_id: dashboardId
            });
          });

        if (embedConfig.filters) {
          dashboard.withFilters(embedConfig.filters);
        }

        await dashboard.build();

      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to load dashboard');
        setError(error.message);
        setIsLoading(false);
        
        logUsageEvent('load_error', {
          dashboard_id: dashboardId,
          error: error.message
        });

        if (onError) {
          onError(error);
        }
      }
    };

    loadDashboard();

    return () => {
      if (embedRef.current) {
        embedRef.current.innerHTML = '';
      }
    };
  }, [cardData, dashboardId, userRole]);

  const renderFilters = () => {
    if (!cardData.filters.availableFilters.length) return null;

    return (
      <div className="spqr-dashboard-filters mb-4 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cardData.filters.availableFilters.map(filter => (
            <div key={filter.field_name} className="flex flex-col">
              <label className="text-xs font-medium text-gray-600 mb-1">
                {filter.display_name}
              </label>
              {filter.filter_type === 'dropdown' && filter.options ? (
                <select 
                  className="text-sm border border-gray-300 rounded px-2 py-1"
                  defaultValue={cardData.filters.defaultFilters.find(df => df.field_name === filter.field_name)?.value || ''}
                >
                  {filter.options.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              ) : (
                <input 
                  type="text" 
                  className="text-sm border border-gray-300 rounded px-2 py-1"
                  defaultValue={cardData.filters.defaultFilters.find(df => df.field_name === filter.field_name)?.value || ''}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (!hasViewPermission()) {
    return (
      <div className="spqr-dashboard-embed-container p-6 border rounded-lg bg-red-50">
        <div className="text-center">
          <div className="text-red-600 mb-2">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-red-800 mb-1">Access Denied</h3>
          <p className="text-red-600">
            Your role ({userRole}) does not have permission to view this dashboard.
          </p>
          <p className="text-sm text-red-500 mt-2">
            Required roles: {cardData.permissions.viewRoles.join(', ')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="spqr-dashboard-embed-container">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-gray-900">{cardData.name}</h2>
        <p className="text-sm text-gray-600">{cardData.description}</p>
      </div>

      {renderFilters()}

      {error ? (
        <div className="p-6 border rounded-lg bg-red-50">
          <div className="text-center">
            <div className="text-red-600 mb-2">
              <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-red-800 mb-1">Error Loading Dashboard</h3>
            <p className="text-red-600">{error}</p>
          </div>
        </div>
      ) : (
        <>
          {isLoading && (
            <div className="flex items-center justify-center p-12 bg-gray-50 rounded-lg">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading dashboard...</p>
              </div>
            </div>
          )}
          <div 
            ref={embedRef} 
            className={`spqr-dashboard-embed min-h-96 ${isLoading ? 'hidden' : ''}`}
            style={{ width: '100%', height: '600px' }}
          />
        </>
      )}
    </div>
  );
};

export default SPQRDashboardEmbed;