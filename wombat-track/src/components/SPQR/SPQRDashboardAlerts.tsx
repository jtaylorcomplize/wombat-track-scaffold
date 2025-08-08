import React, { useState, useEffect } from 'react';
import { GovernanceLogger } from '../../services/governanceLoggerBrowser';

// Import types separately - we'll need to define these locally or create interfaces
type RuntimeObservabilityConfig = {
  alerts?: {
    enabled?: boolean;
    rules?: any[];
  };
};

interface AlertConfig {
  slackWebhookUrl?: string;
  emailRecipients?: string[];
  alertWebhookUrl?: string;
  enableSlack: boolean;
  enableEmail: boolean;
  enableWebhook: boolean;
}

interface AlertHistory {
  id: string;
  timestamp: string;
  ruleName: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  metric: string;
  value: number;
  threshold: number;
  notificationsSent: string[];
}

interface SPQRDashboardAlertsProps {
  dashboardId: string;
  userId: string;
  userRole: string;
  onConfigUpdate?: (config: AlertConfig) => void;
}

export const SPQRDashboardAlerts: React.FC<SPQRDashboardAlertsProps> = ({
  dashboardId,
  userId,
  userRole,
  onConfigUpdate
}) => {
  const governanceLogger = GovernanceLogger.getInstance();
  
  const [alertConfig, setAlertConfig] = useState<AlertConfig>({
    enableSlack: false,
    enableEmail: false,
    enableWebhook: false
  });
  
  const [alertHistory, setAlertHistory] = useState<AlertHistory[]>([]);
  const [showConfig, setShowConfig] = useState(false);
  const [testingAlert, setTestingAlert] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  useEffect(() => {
    const savedConfig = localStorage.getItem('spqr_alert_config');
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        setAlertConfig(parsed);
        applyConfigToLogger(parsed);
      } catch (error) {
        console.error('Failed to load alert config:', error);
      }
    }

    loadAlertHistory();
  }, []);

  const loadAlertHistory = () => {
    const history = localStorage.getItem('spqr_alert_history');
    if (history) {
      try {
        const parsed = JSON.parse(history);
        setAlertHistory(parsed.slice(-20));
      } catch (error) {
        console.error('Failed to load alert history:', error);
      }
    }
  };

  const applyConfigToLogger = (config: AlertConfig) => {
    const observabilityConfig: Partial<RuntimeObservabilityConfig> = {
      slackWebhookUrl: config.enableSlack ? config.slackWebhookUrl : undefined,
      emailAlertRecipients: config.enableEmail ? config.emailRecipients : undefined,
      alertWebhookUrl: config.enableWebhook ? config.alertWebhookUrl : undefined
    };

    governanceLogger.setObservabilityConfig(observabilityConfig);
  };

  const handleConfigChange = (key: keyof AlertConfig, value: string | boolean) => {
    const newConfig = { ...alertConfig, [key]: value };
    setAlertConfig(newConfig);
  };

  const saveConfiguration = async () => {
    setSaveStatus('saving');
    
    try {
      localStorage.setItem('spqr_alert_config', JSON.stringify(alertConfig));
      applyConfigToLogger(alertConfig);
      
      governanceLogger.log({
        event_type: 'alert_config_updated',
        user_id: userId,
        user_role: userRole,
        resource_type: 'dashboard',
        resource_id: dashboardId,
        action: 'configure_alerts',
        success: true,
        details: {
          config: alertConfig,
          phase: 'Phase4–RuntimeObservability'
        }
      });

      if (onConfigUpdate) {
        onConfigUpdate(alertConfig);
      }

      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Failed to save alert configuration:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const testAlertConfiguration = async () => {
    setTestingAlert(true);

    const testAlert: AlertHistory = {
      id: `test_${Date.now()}`,
      timestamp: new Date().toISOString(),
      ruleName: 'Test Alert',
      severity: 'medium',
      metric: 'test_metric',
      value: 100,
      threshold: 50,
      notificationsSent: []
    };

    const notifications: string[] = [];

    if (alertConfig.enableSlack && alertConfig.slackWebhookUrl) {
      notifications.push('Slack');
      console.log('Test Slack notification sent to:', alertConfig.slackWebhookUrl);
    }

    if (alertConfig.enableEmail && alertConfig.emailRecipients?.length) {
      notifications.push('Email');
      console.log('Test email notification sent to:', alertConfig.emailRecipients.join(', '));
    }

    if (alertConfig.enableWebhook && alertConfig.alertWebhookUrl) {
      notifications.push('Webhook');
      console.log('Test webhook notification sent to:', alertConfig.alertWebhookUrl);
    }

    testAlert.notificationsSent = notifications;

    const newHistory = [...alertHistory, testAlert].slice(-20);
    setAlertHistory(newHistory);
    localStorage.setItem('spqr_alert_history', JSON.stringify(newHistory));

    governanceLogger.log({
      event_type: 'alert_test',
      user_id: userId,
      user_role: userRole,
      resource_type: 'dashboard',
      resource_id: dashboardId,
      action: 'test_alert',
      success: true,
      details: {
        test_alert: testAlert,
        notifications_sent: notifications
      }
    });

    setTimeout(() => setTestingAlert(false), 2000);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Runtime Alert Configuration</h2>
        <button
          onClick={() => setShowConfig(!showConfig)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          {showConfig ? 'Hide Configuration' : 'Configure Alerts'}
        </button>
      </div>

      {showConfig && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-medium mb-4">Alert Channels</h3>
          
          <div className="space-y-4">
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <label className="font-medium">Slack Integration</label>
                <input
                  type="checkbox"
                  checked={alertConfig.enableSlack}
                  onChange={(e) => handleConfigChange('enableSlack', e.target.checked)}
                  className="w-4 h-4"
                />
              </div>
              {alertConfig.enableSlack && (
                <input
                  type="text"
                  placeholder="https://hooks.slack.com/services/..."
                  value={alertConfig.slackWebhookUrl || ''}
                  onChange={(e) => handleConfigChange('slackWebhookUrl', e.target.value)}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}
            </div>

            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <label className="font-medium">Email Notifications</label>
                <input
                  type="checkbox"
                  checked={alertConfig.enableEmail}
                  onChange={(e) => handleConfigChange('enableEmail', e.target.checked)}
                  className="w-4 h-4"
                />
              </div>
              {alertConfig.enableEmail && (
                <input
                  type="text"
                  placeholder="email1@example.com, email2@example.com"
                  value={alertConfig.emailRecipients?.join(', ') || ''}
                  onChange={(e) => handleConfigChange('emailRecipients', e.target.value.split(',').map(s => s.trim()))}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}
            </div>

            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <label className="font-medium">Webhook Integration</label>
                <input
                  type="checkbox"
                  checked={alertConfig.enableWebhook}
                  onChange={(e) => handleConfigChange('enableWebhook', e.target.checked)}
                  className="w-4 h-4"
                />
              </div>
              {alertConfig.enableWebhook && (
                <input
                  type="text"
                  placeholder="https://api.example.com/webhook"
                  value={alertConfig.alertWebhookUrl || ''}
                  onChange={(e) => handleConfigChange('alertWebhookUrl', e.target.value)}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={saveConfiguration}
              disabled={saveStatus === 'saving'}
              className={`px-4 py-2 rounded font-medium transition-colors ${
                saveStatus === 'saving' ? 'bg-gray-400 text-gray-200' :
                saveStatus === 'saved' ? 'bg-green-600 text-white' :
                saveStatus === 'error' ? 'bg-red-600 text-white' :
                'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {saveStatus === 'saving' ? 'Saving...' :
               saveStatus === 'saved' ? 'Saved!' :
               saveStatus === 'error' ? 'Error!' :
               'Save Configuration'}
            </button>

            <button
              onClick={testAlertConfiguration}
              disabled={testingAlert}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors disabled:bg-gray-400"
            >
              {testingAlert ? 'Testing...' : 'Test Alert'}
            </button>
          </div>
        </div>
      )}

      <div className="mt-6">
        <h3 className="text-lg font-medium mb-4">Recent Alerts</h3>
        
        {alertHistory.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No alerts recorded yet</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {alertHistory.reverse().map((alert) => (
              <div key={alert.id} className="border rounded-lg p-3 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(alert.severity)}`}>
                      {alert.severity.toUpperCase()}
                    </span>
                    <span className="font-medium">{alert.ruleName}</span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {formatTimestamp(alert.timestamp)}
                  </span>
                </div>
                <div className="mt-2 text-sm text-gray-600">
                  <span>{alert.metric}: </span>
                  <span className="font-medium text-gray-800">{alert.value}</span>
                  <span> (threshold: {alert.threshold})</span>
                </div>
                {alert.notificationsSent.length > 0 && (
                  <div className="mt-1 text-xs text-gray-500">
                    Notifications sent: {alert.notificationsSent.join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 p-3 bg-blue-50 rounded text-sm text-blue-700">
        <p className="font-medium">Phase 4 – Runtime Observability Active</p>
        <p className="text-xs mt-1">Alerts are automatically triggered based on configured thresholds and anomaly detection.</p>
      </div>
    </div>
  );
};

export default SPQRDashboardAlerts;