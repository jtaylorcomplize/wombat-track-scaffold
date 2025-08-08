const https = require('https');

/**
 * GovernanceLog Forwarder Function
 * Receives telemetry events from App Insights and forwards to Wombat Track governance API
 */
module.exports = async function (context, req) {
    context.log('GovernanceLog Forwarder triggered');
    
    try {
        // Parse incoming telemetry data
        const telemetryData = req.body;
        
        if (!telemetryData || !telemetryData.records) {
            context.res = {
                status: 400,
                body: { error: 'Invalid telemetry data format' }
            };
            return;
        }
        
        // Transform App Insights telemetry to governance log format
        const governanceEntries = telemetryData.records.map(record => ({
            timestamp: record.time || new Date().toISOString(),
            entryType: 'Telemetry',
            summary: `App Insights: ${record.operationName || 'Telemetry Event'}`,
            phaseRef: 'OF-9.2.4',
            projectRef: 'OF-CloudMig',
            source: {
                service: record.cloud?.roleName || 'unknown',
                instance: record.cloud?.roleInstance || 'unknown',
                operation: record.operationName || 'unknown'
            },
            metrics: {
                duration: record.duration,
                resultCode: record.resultCode,
                success: record.success,
                customMeasurements: record.customMeasurements || {},
                customDimensions: record.customDimensions || {}
            },
            telemetryType: record.itemType,
            correlationId: record.operation_Id,
            sessionId: record.session_Id,
            userId: record.user_Id,
            rawData: record
        }));
        
        // Forward to governance API
        const governanceApiUrl = process.env.GOVERNANCE_API_URL || 'https://wombat-track-api-prod.azurewebsites.net';
        
        for (const entry of governanceEntries) {
            await forwardToGovernanceAPI(entry, governanceApiUrl, context);
        }
        
        context.res = {
            status: 200,
            body: { 
                message: 'Telemetry forwarded successfully',
                processedRecords: governanceEntries.length,
                timestamp: new Date().toISOString()
            }
        };
        
    } catch (error) {
        context.log.error('Error processing telemetry:', error);
        context.res = {
            status: 500,
            body: { error: 'Internal server error', details: error.message }
        };
    }
};

/**
 * Forward governance entry to the main API
 */
async function forwardToGovernanceAPI(entry, apiUrl, context) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify(entry);
        const options = {
            hostname: apiUrl.replace('https://', '').replace('http://', ''),
            port: 443,
            path: '/api/admin/governance_logs',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData),
                'User-Agent': 'GovernanceLog-Forwarder/1.0'
            }
        };
        
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    context.log(`Successfully forwarded entry: ${entry.summary}`);
                    resolve(data);
                } else {
                    context.log.error(`Failed to forward entry: ${res.statusCode} ${data}`);
                    reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                }
            });
        });
        
        req.on('error', (error) => {
            context.log.error('Request error:', error);
            reject(error);
        });
        
        req.write(postData);
        req.end();
    });
}

/**
 * Test endpoint for validation
 */
module.exports.testForward = async function (context, req) {
    context.log('Test forward triggered');
    
    const testEntry = {
        timestamp: new Date().toISOString(),
        entryType: 'Test',
        summary: 'GovernanceLog Forwarder Test Entry',
        phaseRef: 'OF-9.2.4',
        projectRef: 'OF-CloudMig',
        source: {
            service: 'governance-forwarder',
            instance: 'test',
            operation: 'testForward'
        },
        metrics: {
            testValue: 42,
            success: true
        },
        telemetryType: 'test',
        rawData: { test: true }
    };
    
    try {
        const apiUrl = process.env.GOVERNANCE_API_URL || 'https://wombat-track-api-prod.azurewebsites.net';
        await forwardToGovernanceAPI(testEntry, apiUrl, context);
        
        context.res = {
            status: 200,
            body: { 
                message: 'Test entry forwarded successfully',
                entry: testEntry,
                timestamp: new Date().toISOString()
            }
        };
    } catch (error) {
        context.res = {
            status: 500,
            body: { error: 'Test forward failed', details: error.message }
        };
    }
};