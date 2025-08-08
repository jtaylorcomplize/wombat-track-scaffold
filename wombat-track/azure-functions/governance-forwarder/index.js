const axios = require('axios');

module.exports = async function (context, req) {
    context.log('GovernanceLog Forwarder triggered');
    
    try {
        // Extract App Insights telemetry data
        const telemetryData = req.body;
        
        // Transform telemetry to governance log format
        const governanceLog = {
            timestamp: new Date().toISOString(),
            source: 'azure-app-insights',
            level: 'info',
            category: 'observability',
            event: 'telemetry-ingestion',
            details: {
                resourceName: telemetryData.resourceName || 'unknown',
                metricName: telemetryData.metricName || 'unknown',
                value: telemetryData.value || 0,
                timestamp: telemetryData.timestamp || new Date().toISOString(),
                dimensions: telemetryData.dimensions || {},
                rawTelemetry: telemetryData
            },
            metadata: {
                forwardedFrom: 'azure-function',
                functionName: 'governance-forwarder',
                phase: 'OF-9.2.4'
            }
        };
        
        // Determine target API endpoint
        const targetUrl = process.env.GOVERNANCE_API_URL || 'https://wombat-track-api-prod.azurewebsites.net/api/admin/governance_logs';
        
        // Forward to governance logging API
        const response = await axios.post(targetUrl, governanceLog, {
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Azure-Function-GovernanceForwarder/1.0'
            },
            timeout: 10000
        });
        
        context.log(`Governance log forwarded successfully: ${response.status}`);
        
        context.res = {
            status: 200,
            body: {
                message: 'Telemetry forwarded to governance logs',
                governanceLogId: response.data?.id || null,
                forwardedAt: new Date().toISOString(),
                targetUrl: targetUrl
            }
        };
        
    } catch (error) {
        context.log.error('Error forwarding telemetry to governance logs:', error.message);
        
        context.res = {
            status: 500,
            body: {
                error: 'Failed to forward telemetry',
                message: error.message,
                timestamp: new Date().toISOString()
            }
        };
    }
};