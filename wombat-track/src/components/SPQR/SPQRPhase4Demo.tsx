import React, { useState, useEffect } from 'react';
import { SPQRDashboardContainer } from './SPQRDashboardContainer';
import { SPQRDashboardMetrics } from './SPQRDashboardMetrics';
import { SPQRDashboardAlerts } from './SPQRDashboardAlerts';
import { GovernanceLogger, type DashboardHealthReport } from '../../services/governance-logger';

interface DemoCardData {
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
}

const SPQRPhase4Demo: React.FC = () => {
  const [selectedDashboard, setSelectedDashboard] = useState<string>('revenue-analytics');
  const [healthReport, setHealthReport] = useState<DashboardHealthReport | null>(null);
  const [showHealthReport, setShowHealthReport] = useState(false);
  
  const governanceLogger = GovernanceLogger.getInstance();
  
  const demoUserId = 'demo-user-001';
  const demoUserRole = 'senior-manager';

  const demoDashboards: Record<string, DemoCardData> = {
    'revenue-analytics': {
      id: 'revenue-analytics',
      name: 'Revenue Analytics Dashboard',
      description: 'Real-time revenue tracking and analysis',
      permissions: {
        viewRoles: ['senior-manager', 'executive', 'analyst'],
        editRoles: ['executive']
      },
      filters: {
        defaultFilters: [
          { field_name: 'date_range', operator: 'equals', value: 'last_30_days' }
        ],
        availableFilters: [
          {
            field_name: 'date_range',
            display_name: 'Date Range',
            filter_type: 'date_range',
            options: ['last_7_days', 'last_30_days', 'last_quarter', 'year_to_date']
          },
          {
            field_name: 'practice_area',
            display_name: 'Practice Area',
            filter_type: 'multi_select',
            options: ['Corporate', 'Litigation', 'Real Estate', 'Tax']
          }
        ]
      }
    },
    'client-metrics': {
      id: 'client-metrics',
      name: 'Client Engagement Metrics',
      description: 'Client satisfaction and engagement tracking',
      permissions: {
        viewRoles: ['senior-manager', 'executive', 'partner'],
        editRoles: ['executive', 'partner']
      },
      filters: {
        defaultFilters: [],
        availableFilters: [
          {
            field_name: 'client_type',
            display_name: 'Client Type',
            filter_type: 'single_select',
            options: ['Corporate', 'Individual', 'Government', 'Non-Profit']
          }
        ]
      }
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      const report = governanceLogger.getDashboardHealthReport(selectedDashboard);
      if (report) {
        setHealthReport(report);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [selectedDashboard]);

  const handleMetricsUpdate = (metrics: any) => {
    console.log('Metrics updated:', metrics);
  };

  const handleAlertConfigUpdate = (config: any) => {
    console.log('Alert configuration updated:', config);
  };

  const generateTestData = async () => {
    const dashboardId = selectedDashboard;
    const cardData = demoDashboards[dashboardId];

    for (let i = 0; i < 5; i++) {
      const loadTime = Math.floor(Math.random() * 8000) + 1000;
      const success = Math.random() > 0.1;

      governanceLogger.logDashboardAccess(
        demoUserId,
        demoUserRole,
        cardData.id,
        dashboardId,
        success,
        loadTime,
        success ? undefined : 'Simulated error for testing'
      );

      if (Math.random() > 0.5) {
        governanceLogger.logUserAction(
          demoUserId,
          demoUserRole,
          cardData.id,
          'filter_change',
          { test_interaction: i }
        );
      }

      await new Promise(resolve => setTimeout(resolve, 500));
    }

    alert('Test data generated! Check the metrics and health report.');
  };

  const getHealthStatusColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'degraded': return 'text-yellow-600 bg-yellow-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">SPQR Phase 4 – Runtime Observability Demo</h1>
        <p className="text-gray-600">
          Experience real-time dashboard monitoring, automated metrics collection, and intelligent alerting
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Dashboard
            </label>
            <select
              value={selectedDashboard}
              onChange={(e) => setSelectedDashboard(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Object.entries(demoDashboards).map(([key, dashboard]) => (
                <option key={key} value={key}>
                  {dashboard.name}
                </option>
              ))}
            </select>
          </div>

          <SPQRDashboardContainer
            cardData={demoDashboards[selectedDashboard]}
            userRole={demoUserRole}
            userId={demoUserId}
          />

          <SPQRDashboardMetrics
            dashboardId={selectedDashboard}
            cardId={demoDashboards[selectedDashboard].id}
            userId={demoUserId}
            userRole={demoUserRole}
            onMetricsUpdate={handleMetricsUpdate}
          />
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">Dashboard Health</h3>
            
            {healthReport ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Overall Health</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getHealthStatusColor(healthReport.overall_health)}`}>
                    {healthReport.overall_health.toUpperCase()}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Performance Grade</span>
                  <span className="text-2xl font-bold">{healthReport.performance_grade}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">RAG Score</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    healthReport.rag_score === 'red' ? 'text-red-600 bg-red-100' :
                    healthReport.rag_score === 'amber' ? 'text-amber-600 bg-amber-100' :
                    healthReport.rag_score === 'green' ? 'text-green-600 bg-green-100' :
                    'text-blue-600 bg-blue-100'
                  }`}>
                    {healthReport.rag_score.toUpperCase()}
                  </span>
                </div>

                <div className="pt-4 border-t">
                  <h4 className="text-sm font-medium mb-2">Key Metrics</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Avg Load Time</span>
                      <span>{healthReport.metrics.avg_load_time_ms}ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Error Rate</span>
                      <span>{(healthReport.metrics.error_rate * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Sessions</span>
                      <span>{healthReport.metrics.total_sessions}</span>
                    </div>
                  </div>
                </div>

                {healthReport.recommendations.length > 0 && (
                  <div className="pt-4 border-t">
                    <h4 className="text-sm font-medium mb-2">Recommendations</h4>
                    <ul className="space-y-1">
                      {healthReport.recommendations.map((rec, idx) => (
                        <li key={idx} className="text-xs text-gray-600">• {rec}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <button
                  onClick={() => setShowHealthReport(!showHealthReport)}
                  className="w-full mt-4 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
                >
                  {showHealthReport ? 'Hide' : 'Show'} Full Report
                </button>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">
                No health data available yet. Generate test data to see metrics.
              </p>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">Demo Controls</h3>
            <button
              onClick={generateTestData}
              className="w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
            >
              Generate Test Data
            </button>
            <p className="text-xs text-gray-500 mt-2">
              Simulates dashboard access and interactions to demonstrate metrics collection
            </p>
          </div>
        </div>
      </div>

      <SPQRDashboardAlerts
        dashboardId={selectedDashboard}
        userId={demoUserId}
        userRole={demoUserRole}
        onConfigUpdate={handleAlertConfigUpdate}
      />

      {showHealthReport && healthReport && (
        <div className="mt-8 bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Full Health Report</h3>
          <pre className="bg-white p-4 rounded overflow-x-auto text-xs">
            {JSON.stringify(healthReport, null, 2)}
          </pre>
        </div>
      )}

      <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-lg">
        <h3 className="text-lg font-semibold text-green-800 mb-2">
          Phase 4 Runtime Observability Features
        </h3>
        <ul className="space-y-1 text-sm text-green-700">
          <li>✅ Real-time performance metrics collection</li>
          <li>✅ Automated RAG health scoring</li>
          <li>✅ Configurable alert channels (Slack, Email, Webhook)</li>
          <li>✅ Dashboard health reports with recommendations</li>
          <li>✅ Usage summary generation for reporting</li>
        </ul>
      </div>
    </div>
  );
};

export default SPQRPhase4Demo;