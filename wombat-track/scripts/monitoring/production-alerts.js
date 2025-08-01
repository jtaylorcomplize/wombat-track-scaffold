/**
 * OF-BEV Phase 3 Production Monitoring & Alert Script
 * Monitors system health, performance, and governance events
 * Integrates with Slack, Email, and governance logging
 */

const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const nodemailer = require('nodemailer');

// Configuration
const config = {
  // Performance thresholds
  thresholds: {
    pageLoad: 2000,        // ms - Page load time
    crudLatency: 500,      // ms - CRUD operation response time
    dbQuery: 100,          // ms - Database query time
    errorRate: 0.1,        // % - Error rate threshold
    systemHealth: 90,      // % - Overall system health score
    diskSpace: 80,         // % - Disk space usage
    memoryUsage: 85,       // % - Memory usage
    cpuUsage: 80          // % - CPU usage
  },
  
  // Monitoring intervals
  intervals: {
    healthCheck: 5 * 60 * 1000,     // 5 minutes
    performanceCheck: 2 * 60 * 1000, // 2 minutes
    governanceCheck: 10 * 60 * 1000, // 10 minutes
    systemCheck: 1 * 60 * 1000      // 1 minute
  },
  
  // Alert configuration
  alerts: {
    slackWebhook: process.env.SLACK_WEBHOOK_URL,
    emailFrom: process.env.ALERT_EMAIL_FROM || 'alerts@orbis-forge.com',
    emailTo: process.env.ALERT_RECIPIENTS || 'devops@orbis-forge.com,security@orbis-forge.com',
    escalationDelay: 15 * 60 * 1000, // 15 minutes
    maxRetries: 3
  },
  
  // Environment
  productionUrl: process.env.PRODUCTION_URL || 'https://orbis-forge-admin.oapp.io',
  environment: process.env.NODE_ENV || 'production'
};

// Slack notification function
async function sendSlackAlert(severity, subject, message, metadata = {}) {
  if (!config.alerts.slackWebhook) {
    console.warn('Slack webhook not configured');
    return;
  }

  const severityEmojis = {
    critical: '🚨',
    high: '⚠️',
    medium: '⚡',
    low: 'ℹ️',
    info: '📊'
  };

  const payload = {
    text: `${severityEmojis[severity]} *OF-BEV Production Alert*`,
    attachments: [{
      color: severity === 'critical' ? 'danger' : severity === 'high' ? 'warning' : 'good',
      fields: [
        {
          title: subject,
          value: message,
          short: false
        },
        {
          title: 'Environment',
          value: config.environment,
          short: true
        },
        {
          title: 'Timestamp',
          value: new Date().toISOString(),
          short: true
        },
        ...(Object.keys(metadata).length > 0 ? [{
          title: 'Details',
          value: JSON.stringify(metadata, null, 2),
          short: false
        }] : [])
      ]
    }]
  };

  try {
    const response = await fetch(config.alerts.slackWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.status}`);
    }

    console.log(`✅ Slack alert sent: ${subject}`);
  } catch (error) {
    console.error('Failed to send Slack alert:', error);
  }
}

// Email notification function
async function sendEmailAlert(severity, subject, message, metadata = {}) {
  try {
    const transporter = nodemailer.createTransporter({
      sendmail: true,
      newline: 'unix',
      path: '/usr/sbin/sendmail'
    });

    const emailBody = `
OF-BEV Production Alert - ${severity.toUpperCase()}

Subject: ${subject}
Environment: ${config.environment}
Timestamp: ${new Date().toISOString()}

Message:
${message}

${Object.keys(metadata).length > 0 ? `
Metadata:
${JSON.stringify(metadata, null, 2)}
` : ''}

---
This is an automated alert from the OF-BEV monitoring system.
For immediate assistance, contact the on-call engineer.
    `.trim();

    await transporter.sendMail({
      from: config.alerts.emailFrom,
      to: config.alerts.emailTo,
      subject: `[${severity.toUpperCase()}] OF-BEV Production: ${subject}`,
      text: emailBody
    });

    console.log(`✅ Email alert sent: ${subject}`);
  } catch (error) {
    console.error('Failed to send email alert:', error);
  }
}

// Unified alert function
async function alertTeam(severity, subject, message, metadata = {}) {
  console.log(`🔔 ALERT [${severity.toUpperCase()}]: ${subject}`);
  console.log(`   Message: ${message}`);
  if (Object.keys(metadata).length > 0) {
    console.log(`   Metadata:`, metadata);
  }

  // Log to governance system
  await logGovernanceAlert(severity, subject, message, metadata);

  // Send notifications
  await Promise.all([
    sendSlackAlert(severity, subject, message, metadata),
    sendEmailAlert(severity, subject, message, metadata)
  ]);
}

// Governance logging for alerts
async function logGovernanceAlert(severity, subject, message, metadata) {
  const governanceEntry = {
    timestamp: new Date().toISOString(),
    event_type: 'production_alert',
    user_id: 'monitoring_system',
    user_role: 'system_monitor',
    resource_type: 'production_monitoring',
    resource_id: 'of-bev-production',
    action: 'alert_triggered',
    success: true,
    details: {
      operation: 'Production Alert Triggered',
      alert_severity: severity,
      alert_subject: subject,
      alert_message: message,
      alert_metadata: metadata,
      environment: config.environment,
      monitoring_system: 'of-bev-production-alerts'
    },
    runtime_context: {
      phase: 'OF-BEV-3-Production-Monitoring',
      environment: 'production',
      alert_system: 'automated_monitoring',
      memoryplugin_anchor: `production-alert-${Date.now()}`
    }
  };

  try {
    const governanceLogPath = path.join(process.cwd(), 'logs', 'governance.jsonl');
    await fs.appendFile(governanceLogPath, JSON.stringify(governanceEntry) + '\n');
  } catch (error) {
    console.error('Failed to log governance entry:', error);
  }
}

// System health check
async function runSystemHealthCheck() {
  try {
    const healthResponse = await fetch(`${config.productionUrl}/health`);
    const healthData = await healthResponse.json();

    if (!healthResponse.ok) {
      await alertTeam('critical', 'System Health Check Failed', 
        `Health endpoint returned ${healthResponse.status}`, 
        { status: healthResponse.status, response: healthData });
      return;
    }

    // Check individual health indicators
    const issues = [];
    
    if (healthData.database && healthData.database.status !== 'healthy') {
      issues.push(`Database: ${healthData.database.status}`);
    }
    
    if (healthData.ai_service && healthData.ai_service.status !== 'healthy') {
      issues.push(`AI Service: ${healthData.ai_service.status}`);
    }
    
    if (healthData.github && healthData.github.status !== 'healthy') {
      issues.push(`GitHub Integration: ${healthData.github.status}`);
    }

    if (issues.length > 0) {
      await alertTeam('high', 'System Health Degraded', 
        `Health indicators showing issues: ${issues.join(', ')}`, 
        healthData);
    }

    console.log('✅ System health check completed');
    return healthData;

  } catch (error) {
    await alertTeam('critical', 'System Health Check Error', 
      `Failed to perform health check: ${error.message}`, 
      { error: error.message, stack: error.stack });
  }
}

// Performance monitoring
async function runPerformanceCheck() {
  try {
    const startTime = Date.now();
    
    // Test page load time
    const pageResponse = await fetch(`${config.productionUrl}/admin/data-explorer`);
    const pageLoadTime = Date.now() - startTime;

    if (!pageResponse.ok) {
      await alertTeam('high', 'Page Load Failed', 
        `Admin page returned ${pageResponse.status}`, 
        { status: pageResponse.status, loadTime: pageLoadTime });
      return;
    }

    if (pageLoadTime > config.thresholds.pageLoad) {
      await alertTeam('medium', 'Page Load Performance Degraded', 
        `Page load time ${pageLoadTime}ms exceeds threshold ${config.thresholds.pageLoad}ms`, 
        { loadTime: pageLoadTime, threshold: config.thresholds.pageLoad });
    }

    // Test API response time
    const apiStartTime = Date.now();
    const apiResponse = await fetch(`${config.productionUrl}/api/live-admin/projects`);
    const apiResponseTime = Date.now() - apiStartTime;

    if (!apiResponse.ok) {
      await alertTeam('high', 'API Response Failed', 
        `API endpoint returned ${apiResponse.status}`, 
        { status: apiResponse.status, responseTime: apiResponseTime });
      return;
    }

    if (apiResponseTime > config.thresholds.crudLatency) {
      await alertTeam('medium', 'API Performance Degraded', 
        `API response time ${apiResponseTime}ms exceeds threshold ${config.thresholds.crudLatency}ms`, 
        { responseTime: apiResponseTime, threshold: config.thresholds.crudLatency });
    }

    console.log(`✅ Performance check completed - Page: ${pageLoadTime}ms, API: ${apiResponseTime}ms`);
    return { pageLoadTime, apiResponseTime };

  } catch (error) {
    await alertTeam('high', 'Performance Check Error', 
      `Failed to perform performance check: ${error.message}`, 
      { error: error.message });
  }
}

// Database monitoring
async function runDatabaseCheck() {
  try {
    const dbHealthResponse = await fetch(`${config.productionUrl}/health/database`);
    const dbHealthData = await dbHealthResponse.json();

    if (!dbHealthResponse.ok) {
      await alertTeam('critical', 'Database Health Check Failed', 
        `Database health endpoint returned ${dbHealthResponse.status}`, 
        { status: dbHealthResponse.status, response: dbHealthData });
      return;
    }

    // Check database metrics
    if (dbHealthData.responseTime && dbHealthData.responseTime > config.thresholds.dbQuery) {
      await alertTeam('medium', 'Database Performance Degraded', 
        `Database response time ${dbHealthData.responseTime}ms exceeds threshold ${config.thresholds.dbQuery}ms`, 
        dbHealthData);
    }

    if (dbHealthData.connectionPool && dbHealthData.connectionPool.utilization > 80) {
      await alertTeam('medium', 'Database Connection Pool High', 
        `Connection pool utilization at ${dbHealthData.connectionPool.utilization}%`, 
        dbHealthData);
    }

    console.log('✅ Database check completed');
    return dbHealthData;

  } catch (error) {
    await alertTeam('critical', 'Database Check Error', 
      `Failed to perform database check: ${error.message}`, 
      { error: error.message });
  }
}

// Governance monitoring
async function runGovernanceCheck() {
  try {
    // Check if governance logs are being written
    const governanceLogPath = path.join(process.cwd(), 'logs', 'governance.jsonl');
    const stats = await fs.stat(governanceLogPath);
    const lastModified = stats.mtime;
    const timeSinceLastLog = Date.now() - lastModified.getTime();

    // Alert if no governance logs in last 30 minutes
    if (timeSinceLastLog > 30 * 60 * 1000) {
      await alertTeam('medium', 'Governance Logging Stale', 
        `No governance log entries in the last ${Math.round(timeSinceLastLog / 60000)} minutes`, 
        { lastModified: lastModified.toISOString(), minutesSinceLastLog: Math.round(timeSinceLastLog / 60000) });
    }

    // Check recent error entries in governance logs
    const logContent = await fs.readFile(governanceLogPath, 'utf-8');
    const recentLogs = logContent.split('\n')
      .filter(line => line.trim())
      .slice(-100)  // Last 100 entries
      .map(line => JSON.parse(line))
      .filter(entry => {
        const entryTime = new Date(entry.timestamp).getTime();
        return Date.now() - entryTime < 60 * 60 * 1000; // Last hour
      });

    const errorLogs = recentLogs.filter(entry => entry.success === false);
    const errorRate = errorLogs.length / recentLogs.length;

    if (errorRate > config.thresholds.errorRate / 100) {
      await alertTeam('high', 'High Error Rate Detected', 
        `Error rate ${(errorRate * 100).toFixed(1)}% exceeds threshold ${config.thresholds.errorRate}%`, 
        { errorCount: errorLogs.length, totalLogs: recentLogs.length, errorRate: `${(errorRate * 100).toFixed(1)}%` });
    }

    console.log(`✅ Governance check completed - ${recentLogs.length} recent logs, ${errorLogs.length} errors`);
    return { recentLogs: recentLogs.length, errors: errorLogs.length, errorRate };

  } catch (error) {
    await alertTeam('medium', 'Governance Check Error', 
      `Failed to perform governance check: ${error.message}`, 
      { error: error.message });
  }
}

// System resource monitoring
async function runSystemResourceCheck() {
  return new Promise((resolve) => {
    exec('df -h / && free -m && top -bn1 | head -10', (error, stdout, stderr) => {
      if (error) {
        alertTeam('medium', 'System Resource Check Error', 
          `Failed to check system resources: ${error.message}`, 
          { error: error.message, stderr });
        resolve(null);
        return;
      }

      try {
        const output = stdout.toString();
        const lines = output.split('\n');
        
        // Parse disk usage (simple parsing - may need adjustment based on system)
        const dfLine = lines.find(line => line.includes('/'));
        if (dfLine) {
          const parts = dfLine.split(/\s+/);
          const usagePercent = parseInt(parts[4]?.replace('%', '') || '0');
          
          if (usagePercent > config.thresholds.diskSpace) {
            alertTeam('high', 'Disk Space Critical', 
              `Disk usage at ${usagePercent}% exceeds threshold ${config.thresholds.diskSpace}%`, 
              { diskUsage: `${usagePercent}%`, threshold: `${config.thresholds.diskSpace}%` });
          }
        }

        console.log('✅ System resource check completed');
        resolve({ output });

      } catch (parseError) {
        alertTeam('medium', 'System Resource Parse Error', 
          `Failed to parse system resource output: ${parseError.message}`, 
          { error: parseError.message, output: stdout });
        resolve(null);
      }
    });
  });
}

// Runtime status monitoring
async function runRuntimeStatusCheck() {
  try {
    const runtimeResponse = await fetch(`${config.productionUrl}/admin/runtime-status`);
    
    if (!runtimeResponse.ok) {
      await alertTeam('high', 'Runtime Status Page Failed', 
        `Runtime status page returned ${runtimeResponse.status}`, 
        { status: runtimeResponse.status });
      return;
    }

    // Check if the runtime status API is available
    const apiResponse = await fetch(`${config.productionUrl}/api/runtime-status`);
    if (apiResponse.ok) {
      const statusData = await apiResponse.json();
      
      // Check for any critical status indicators
      if (statusData.systemHealth && statusData.systemHealth < config.thresholds.systemHealth) {
        await alertTeam('high', 'System Health Score Low', 
          `System health score ${statusData.systemHealth}% below threshold ${config.thresholds.systemHealth}%`, 
          statusData);
      }
    }

    console.log('✅ Runtime status check completed');

  } catch (error) {
    await alertTeam('medium', 'Runtime Status Check Error', 
      `Failed to check runtime status: ${error.message}`, 
      { error: error.message });
  }
}

// Comprehensive monitoring function
async function runComprehensiveCheck() {
  console.log(`🔍 Starting comprehensive monitoring check at ${new Date().toISOString()}`);
  
  const results = await Promise.allSettled([
    runSystemHealthCheck(),
    runPerformanceCheck(),
    runDatabaseCheck(),
    runGovernanceCheck(),
    runSystemResourceCheck(),
    runRuntimeStatusCheck()
  ]);

  // Log results
  const failed = results.filter(result => result.status === 'rejected');
  if (failed.length > 0) {
    await alertTeam('high', 'Monitoring Check Failures', 
      `${failed.length} monitoring checks failed`, 
      { failedChecks: failed.map(f => f.reason?.message || 'Unknown error') });
  }

  console.log(`✅ Comprehensive monitoring check completed - ${results.length - failed.length}/${results.length} checks passed`);
}

// Startup function
async function startMonitoring() {
  console.log('🚀 OF-BEV Production Monitoring Started');
  console.log(`   Environment: ${config.environment}`);
  console.log(`   Production URL: ${config.productionUrl}`);
  console.log(`   Health Check Interval: ${config.intervals.healthCheck / 1000}s`);
  console.log(`   Performance Check Interval: ${config.intervals.performanceCheck / 1000}s`);
  console.log(`   Governance Check Interval: ${config.intervals.governanceCheck / 1000}s`);

  // Send startup notification
  await alertTeam('info', 'Monitoring System Started', 
    'OF-BEV production monitoring system has started successfully', 
    { 
      environment: config.environment,
      url: config.productionUrl,
      thresholds: config.thresholds
    });

  // Run initial comprehensive check
  await runComprehensiveCheck();

  // Schedule periodic checks
  setInterval(runSystemHealthCheck, config.intervals.healthCheck);
  setInterval(runPerformanceCheck, config.intervals.performanceCheck);
  setInterval(runGovernanceCheck, config.intervals.governanceCheck);
  setInterval(runSystemResourceCheck, config.intervals.systemCheck);
  
  // Run comprehensive check every hour
  setInterval(runComprehensiveCheck, 60 * 60 * 1000);
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Monitoring system shutting down...');
  await alertTeam('info', 'Monitoring System Shutdown', 
    'OF-BEV production monitoring system is shutting down', 
    { timestamp: new Date().toISOString() });
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Monitoring system terminated...');
  await alertTeam('info', 'Monitoring System Terminated', 
    'OF-BEV production monitoring system was terminated', 
    { timestamp: new Date().toISOString() });
  process.exit(0);
});

// Error handling
process.on('unhandledRejection', async (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  await alertTeam('critical', 'Monitoring System Error', 
    `Unhandled rejection in monitoring system: ${reason}`, 
    { error: reason?.toString(), stack: reason?.stack });
});

process.on('uncaughtException', async (error) => {
  console.error('Uncaught Exception:', error);
  await alertTeam('critical', 'Monitoring System Crash', 
    `Uncaught exception in monitoring system: ${error.message}`, 
    { error: error.message, stack: error.stack });
  process.exit(1);
});

// Export for testing
module.exports = {
  alertTeam,
  runSystemHealthCheck,
  runPerformanceCheck,
  runDatabaseCheck,
  runGovernanceCheck,
  runSystemResourceCheck,
  runRuntimeStatusCheck,
  runComprehensiveCheck,
  startMonitoring,
  config
};

// Start monitoring if this file is run directly
if (require.main === module) {
  startMonitoring().catch(error => {
    console.error('Failed to start monitoring:', error);
    process.exit(1);
  });
}