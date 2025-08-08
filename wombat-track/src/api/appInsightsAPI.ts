/**
 * App Insights API Service
 * Interfaces with Azure Application Insights to retrieve telemetry and health data
 */

export interface AppInsightsQueryResult {
  tables: Array<{
    name: string;
    columns: Array<{ name: string; type: string }>;
    rows: Array<Array<string | number>>;
  }>;
}

export interface AppInsightsHealthMetric {
  name: string;
  value: number | string;
  unit?: string;
  status: 'healthy' | 'warning' | 'error' | 'unknown';
  timestamp: string;
  threshold?: {
    warning: number;
    error: number;
  };
}

export interface AppInsightsServiceHealth {
  serviceName: string;
  instrumentationKey: string;
  status: 'healthy' | 'warning' | 'error' | 'unknown';
  availability: number;
  responseTime: number;
  requestRate: number;
  errorRate: number;
  lastUpdated: string;
  metrics: AppInsightsHealthMetric[];
  rawData?: any;
}

/**
 * Configuration for App Insights services
 */
const APP_INSIGHTS_CONFIG = {
  backend: {
    name: 'WT-Backend-API',
    instrumentationKey: 'e772a6e3-86c9-48f6-a220-e4fff3d32f25',
    appId: '6b7f280c-cf44-4fda-9985-215c272b3ad9'
  },
  frontend: {
    name: 'WT-Frontend-UI',
    instrumentationKey: '919391a9-ea0c-4aac-97da-804672a75c19',
    appId: '8404bd9a-2eda-40de-a2d5-11015a59d55f'
  }
};

/**
 * Query App Insights using KQL (Kusto Query Language)
 */
export async function queryAppInsights(
  appId: string,
  query: string,
  timespan: string = 'PT1H'
): Promise<AppInsightsQueryResult> {
  try {
    // In production, this would call the Azure App Insights REST API
    // For now, return mock data for development
    console.log(`[AppInsights] Querying ${appId} with: ${query}`);
    
    // Mock response structure based on actual App Insights API
    return {
      tables: [{
        name: 'PrimaryResult',
        columns: [
          { name: 'timestamp', type: 'datetime' },
          { name: 'name', type: 'string' },
          { name: 'duration', type: 'real' },
          { name: 'success', type: 'bool' },
          { name: 'resultCode', type: 'string' }
        ],
        rows: [
          [new Date().toISOString(), 'GET /api/health', 145.3, true, '200'],
          [new Date().toISOString(), 'POST /api/governance/log', 89.7, true, '200'],
          [new Date().toISOString(), 'GET /api/admin/runtime/status', 234.1, true, '200']
        ]
      }]
    };
  } catch (error) {
    console.error('[AppInsights] Query failed:', error);
    throw new Error(`Failed to query App Insights: ${error}`);
  }
}

/**
 * Get health metrics for a specific service
 */
export async function getServiceHealth(serviceKey: 'backend' | 'frontend'): Promise<AppInsightsServiceHealth> {
  const config = APP_INSIGHTS_CONFIG[serviceKey];
  
  try {
    // In production, these would be actual KQL queries to App Insights
    const [
      availabilityResult,
      performanceResult,
      errorResult
    ] = await Promise.all([
      queryAppInsights(config.appId, `requests | where timestamp > ago(1h) | summarize availability = (count() - countif(success == false)) * 100.0 / count()`),
      queryAppInsights(config.appId, `requests | where timestamp > ago(1h) | summarize avgDuration = avg(duration), requestRate = count()`),
      queryAppInsights(config.appId, `requests | where timestamp > ago(1h) | summarize errorRate = countif(success == false) * 100.0 / count()`)
    ]);
    
    // Mock data based on service type
    const mockHealth: AppInsightsServiceHealth = serviceKey === 'backend' ? {
      serviceName: config.name,
      instrumentationKey: config.instrumentationKey,
      status: 'healthy',
      availability: 99.8,
      responseTime: 145,
      requestRate: 42,
      errorRate: 0.2,
      lastUpdated: new Date().toISOString(),
      metrics: [
        {
          name: 'CPU Usage',
          value: 23,
          unit: '%',
          status: 'healthy',
          timestamp: new Date().toISOString(),
          threshold: { warning: 70, error: 90 }
        },
        {
          name: 'Memory Usage',
          value: 67,
          unit: '%',
          status: 'warning',
          timestamp: new Date().toISOString(),
          threshold: { warning: 60, error: 85 }
        },
        {
          name: 'Active Connections',
          value: 84,
          status: 'healthy',
          timestamp: new Date().toISOString()
        },
        {
          name: 'Database Queries/min',
          value: 156,
          status: 'healthy',
          timestamp: new Date().toISOString()
        }
      ]
    } : {
      serviceName: config.name,
      instrumentationKey: config.instrumentationKey,
      status: 'healthy',
      availability: 99.9,
      responseTime: 89,
      requestRate: 156,
      errorRate: 0.1,
      lastUpdated: new Date().toISOString(),
      metrics: [
        {
          name: 'Page Load Time',
          value: 1.2,
          unit: 's',
          status: 'healthy',
          timestamp: new Date().toISOString(),
          threshold: { warning: 3, error: 5 }
        },
        {
          name: 'JavaScript Errors',
          value: 1,
          status: 'healthy',
          timestamp: new Date().toISOString()
        },
        {
          name: 'User Sessions',
          value: 23,
          status: 'healthy',
          timestamp: new Date().toISOString()
        },
        {
          name: 'Bounce Rate',
          value: 12,
          unit: '%',
          status: 'healthy',
          timestamp: new Date().toISOString(),
          threshold: { warning: 40, error: 60 }
        }
      ]
    };
    
    return mockHealth;
  } catch (error) {
    console.error(`[AppInsights] Failed to get health for ${serviceKey}:`, error);
    throw error;
  }
}

/**
 * Get health for all configured services
 */
export async function getAllServicesHealth(): Promise<AppInsightsServiceHealth[]> {
  try {
    const [backendHealth, frontendHealth] = await Promise.all([
      getServiceHealth('backend'),
      getServiceHealth('frontend')
    ]);
    
    return [backendHealth, frontendHealth];
  } catch (error) {
    console.error('[AppInsights] Failed to get all services health:', error);
    throw error;
  }
}

/**
 * Send custom telemetry event to App Insights
 */
export async function sendCustomEvent(
  serviceKey: 'backend' | 'frontend',
  eventName: string,
  properties: Record<string, string>,
  measurements?: Record<string, number>
): Promise<void> {
  const config = APP_INSIGHTS_CONFIG[serviceKey];
  
  try {
    console.log(`[AppInsights] Sending custom event to ${config.name}:`, {
      eventName,
      properties,
      measurements
    });
    
    // In production, this would send to App Insights via the REST API or SDK
    // For now, just log the event
    
    // Also forward to governance API
    await fetch('/api/admin/governance_logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        entryType: 'Telemetry',
        summary: `Custom event: ${eventName}`,
        phaseRef: 'OF-9.2.4',
        projectRef: 'OF-CloudMig',
        source: {
          service: config.name,
          instrumentationKey: config.instrumentationKey
        },
        eventData: {
          name: eventName,
          properties,
          measurements
        }
      })
    });
  } catch (error) {
    console.error(`[AppInsights] Failed to send custom event:`, error);
    throw error;
  }
}

/**
 * Test connection to App Insights
 */
export async function testAppInsightsConnection(): Promise<{
  backend: boolean;
  frontend: boolean;
  errors: string[];
}> {
  const errors: string[] = [];
  let backendOk = false;
  let frontendOk = false;
  
  try {
    await getServiceHealth('backend');
    backendOk = true;
  } catch (error) {
    errors.push(`Backend: ${error}`);
  }
  
  try {
    await getServiceHealth('frontend');
    frontendOk = true;
  } catch (error) {
    errors.push(`Frontend: ${error}`);
  }
  
  return {
    backend: backendOk,
    frontend: frontendOk,
    errors
  };
}