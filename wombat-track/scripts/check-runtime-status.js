/**
 * Runtime Status Check Script for OF-BEV Production Monitoring
 * Provides detailed system metrics for monitoring alerts
 */

const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

const config = {
  productionUrl: process.env.PRODUCTION_URL || 'https://orbis-forge-admin.oapp.io',
  databasePath: process.env.DATABASE_PATH || './databases/production.db',
  timeout: 10000 // 10 second timeout
};

// Fetch with timeout
async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeout);
    return response;
  } catch (error) {
    clearTimeout(timeout);
    throw error;
  }
}

// Check page load performance
async function checkPageLoad() {
  const startTime = Date.now();
  try {
    const response = await fetchWithTimeout(`${config.productionUrl}/admin/data-explorer`);
    const endTime = Date.now();
    
    return {
      success: response.ok,
      loadTime: endTime - startTime,
      status: response.status,
      statusText: response.statusText
    };
  } catch (error) {
    return {
      success: false,
      loadTime: Date.now() - startTime,
      error: error.message
    };
  }
}

// Check CRUD API performance
async function checkCrudLatency() {
  const startTime = Date.now();
  try {
    const response = await fetchWithTimeout(`${config.productionUrl}/api/live-admin/projects`);
    const endTime = Date.now();
    
    let data = null;
    if (response.ok) {
      try {
        data = await response.json();
      } catch (parseError) {
        // Non-JSON response is still a successful connection
      }
    }
    
    return {
      success: response.ok,
      latency: endTime - startTime,
      status: response.status,
      statusText: response.statusText,
      recordCount: data?.recordCount || null
    };
  } catch (error) {
    return {
      success: false,
      latency: Date.now() - startTime,
      error: error.message
    };
  }
}

// Check database health
async function checkDatabaseHealth() {
  return new Promise((resolve) => {
    const sqlite3 = `sqlite3 "${config.databasePath}"`;
    const startTime = Date.now();
    
    exec(`${sqlite3} "PRAGMA integrity_check; SELECT COUNT(*) FROM projects; SELECT COUNT(*) FROM governance_logs;"`, 
      (error, stdout, stderr) => {
        const endTime = Date.now();
        
        if (error) {
          resolve({
            success: false,
            responseTime: endTime - startTime,
            error: error.message,
            stderr: stderr
          });
          return;
        }
        
        try {
          const lines = stdout.trim().split('\n');
          const integrityCheck = lines[0];
          const projectCount = parseInt(lines[1]) || 0;
          const governanceCount = parseInt(lines[2]) || 0;
          
          resolve({
            success: integrityCheck === 'ok',
            responseTime: endTime - startTime,
            integrityCheck: integrityCheck,
            projectCount: projectCount,
            governanceLogCount: governanceCount
          });
        } catch (parseError) {
          resolve({
            success: false,
            responseTime: endTime - startTime,
            error: 'Failed to parse database response',
            rawOutput: stdout
          });
        }
      });
  });
}

// Check system resources
async function checkSystemResources() {
  return new Promise((resolve) => {
    exec('df -h / | tail -1 && free -m | grep Mem && uptime', (error, stdout, stderr) => {
      if (error) {
        resolve({
          success: false,
          error: error.message,
          stderr: stderr
        });
        return;
      }
      
      try {
        const lines = stdout.trim().split('\n');
        
        // Parse disk usage
        const diskLine = lines[0];
        const diskParts = diskLine.split(/\s+/);
        const diskUsage = parseInt(diskParts[4]?.replace('%', '') || '0');
        
        // Parse memory usage
        const memLine = lines[1];
        const memParts = memLine.split(/\s+/);
        const totalMem = parseInt(memParts[1]) || 0;
        const usedMem = parseInt(memParts[2]) || 0;
        const memUsage = totalMem > 0 ? Math.round((usedMem / totalMem) * 100) : 0;
        
        // Parse load average
        const uptimeLine = lines[2];
        const loadMatch = uptimeLine.match(/load average: ([\d.]+),/);
        const loadAverage = loadMatch ? parseFloat(loadMatch[1]) : 0;
        
        resolve({
          success: true,
          disk: {
            usage: diskUsage,
            total: diskParts[1],
            used: diskParts[2],
            available: diskParts[3]
          },
          memory: {
            usage: memUsage,
            total: totalMem,
            used: usedMem,
            free: parseInt(memParts[3]) || 0
          },
          system: {
            loadAverage: loadAverage,
            uptime: uptimeLine
          }
        });
      } catch (parseError) {
        resolve({
          success: false,
          error: 'Failed to parse system resource data',
          rawOutput: stdout
        });
      }
    });
  });
}

// Check governance log health
async function checkGovernanceLogs() {
  try {
    const governanceLogPath = path.join(process.cwd(), 'logs', 'governance.jsonl');
    const stats = await fs.stat(governanceLogPath);
    
    // Read last few lines to check for recent activity
    const content = await fs.readFile(governanceLogPath, 'utf-8');
    const lines = content.trim().split('\n').filter(line => line.trim());
    const recentLines = lines.slice(-10); // Last 10 entries
    
    // Parse recent entries
    const recentEntries = recentLines.map(line => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    }).filter(entry => entry !== null);
    
    // Check for recent activity (last hour)
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    const recentActivity = recentEntries.filter(entry => {
      const entryTime = new Date(entry.timestamp).getTime();
      return entryTime > oneHourAgo;
    });
    
    // Count success/failure rates
    const failures = recentActivity.filter(entry => entry.success === false);
    
    return {
      success: true,
      fileSize: stats.size,
      lastModified: stats.mtime.toISOString(),
      totalEntries: lines.length,
      recentEntries: recentActivity.length,
      recentFailures: failures.length,
      errorRate: recentActivity.length > 0 ? (failures.length / recentActivity.length) * 100 : 0
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Check API endpoints health
async function checkApiEndpoints() {
  const endpoints = [
    '/health',
    '/health/database',
    '/api/live-admin/projects',
    '/api/json-operations/export',
    '/admin/runtime-status'
  ];
  
  const results = {};
  
  for (const endpoint of endpoints) {
    const startTime = Date.now();
    try {
      const response = await fetchWithTimeout(`${config.productionUrl}${endpoint}`);
      const endTime = Date.now();
      
      results[endpoint] = {
        success: response.ok,
        status: response.status,
        responseTime: endTime - startTime
      };
    } catch (error) {
      results[endpoint] = {
        success: false,
        error: error.message,
        responseTime: Date.now() - startTime
      };
    }
  }
  
  return results;
}

// Main status check function
async function performStatusCheck() {
  const startTime = Date.now();
  
  console.log('🔍 Performing comprehensive status check...');
  
  const [
    pageLoad,
    crudLatency,
    dbHealth,
    systemResources,
    governanceLogs,
    apiEndpoints
  ] = await Promise.allSettled([
    checkPageLoad(),
    checkCrudLatency(),  
    checkDatabaseHealth(),
    checkSystemResources(),
    checkGovernanceLogs(),
    checkApiEndpoints()
  ]);
  
  const totalTime = Date.now() - startTime;
  
  const results = {
    timestamp: new Date().toISOString(),
    checkDuration: totalTime,
    pageLoad: pageLoad.status === 'fulfilled' ? pageLoad.value : { success: false, error: pageLoad.reason?.message },
    crudLatency: crudLatency.status === 'fulfilled' ? crudLatency.value : { success: false, error: crudLatency.reason?.message },
    database: dbHealth.status === 'fulfilled' ? dbHealth.value : { success: false, error: dbHealth.reason?.message },
    system: systemResources.status === 'fulfilled' ? systemResources.value : { success: false, error: systemResources.reason?.message },
    governance: governanceLogs.status === 'fulfilled' ? governanceLogs.value : { success: false, error: governanceLogs.reason?.message },
    endpoints: apiEndpoints.status === 'fulfilled' ? apiEndpoints.value : { success: false, error: apiEndpoints.reason?.message },
    
    // Summary
    summary: {
      overallHealth: 'unknown',
      criticalIssues: [],
      warnings: [],
      performanceScore: 0
    }
  };
  
  // Calculate overall health
  const checks = [pageLoad, crudLatency, dbHealth, systemResources, governanceLogs, apiEndpoints];
  const successfulChecks = checks.filter(check => check.status === 'fulfilled' && check.value.success).length;
  const healthPercentage = (successfulChecks / checks.length) * 100;
  
  if (healthPercentage >= 90) {
    results.summary.overallHealth = 'healthy';
  } else if (healthPercentage >= 70) {
    results.summary.overallHealth = 'degraded';
  } else {
    results.summary.overallHealth = 'critical';
  }
  
  // Identify issues
  if (results.pageLoad.success && results.pageLoad.loadTime > 2000) {
    results.summary.warnings.push(`Slow page load: ${results.pageLoad.loadTime}ms`);
  }
  
  if (results.crudLatency.success && results.crudLatency.latency > 500) {
    results.summary.warnings.push(`Slow API response: ${results.crudLatency.latency}ms`);
  }
  
  if (!results.database.success) {
    results.summary.criticalIssues.push('Database health check failed');
  }
  
  if (results.system.success && results.system.disk.usage > 80) {
    results.summary.warnings.push(`High disk usage: ${results.system.disk.usage}%`);
  }
  
  if (results.governance.success && results.governance.errorRate > 10) {
    results.summary.warnings.push(`High governance error rate: ${results.governance.errorRate.toFixed(1)}%`);
  }

  // Performance score calculation
  let performanceScore = 100;
  if (results.pageLoad.success) {
    performanceScore -= Math.max(0, (results.pageLoad.loadTime - 1000) / 100); // Deduct for load time > 1s
  }
  if (results.crudLatency.success) {
    performanceScore -= Math.max(0, (results.crudLatency.latency - 200) / 30); // Deduct for latency > 200ms
  }
  results.summary.performanceScore = Math.max(0, Math.round(performanceScore));
  
  return results;
}

// CLI execution
if (require.main === module) {
  performStatusCheck()
    .then(results => {
      // Output JSON for consumption by monitoring script
      console.log(JSON.stringify(results, null, 2));
      
      // Exit with appropriate code
      if (results.summary.overallHealth === 'critical') {
        process.exit(2);
      } else if (results.summary.overallHealth === 'degraded') {
        process.exit(1);
      } else {
        process.exit(0);
      }
    })
    .catch(error => {
      console.error('Status check failed:', error);
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        success: false,
        error: error.message,
        summary: {
          overallHealth: 'critical',
          criticalIssues: ['Status check script failed'],
          warnings: [],
          performanceScore: 0
        }
      }, null, 2));
      process.exit(2);
    });
}

module.exports = {
  performStatusCheck,
  checkPageLoad,
  checkCrudLatency,
  checkDatabaseHealth,
  checkSystemResources,
  checkGovernanceLogs,
  checkApiEndpoints
};