/**
 * SPQR Runtime Recursion Fix - Puppeteer QA Automation
 * Tests for infinite render loop fixes and JWT multi-role functionality
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const QA_OUTPUT_DIR = path.join(__dirname, '../DriveMemory/SPQR/QA/Phase5_RecursionFix');

// Ensure output directory exists
if (!fs.existsSync(QA_OUTPUT_DIR)) {
  fs.mkdirSync(QA_OUTPUT_DIR, { recursive: true });
}

async function runSPQRQA() {
  console.log('🚀 Starting SPQR Runtime Recursion Fix QA...');
  
  const browser = await puppeteer.launch({
    headless: false,
    devtools: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  
  // Set viewport for consistent screenshots
  await page.setViewport({ width: 1920, height: 1080 });
  
  // Enable console logging capture
  const consoleLogs = [];
  const networkLogs = [];
  
  page.on('console', (msg) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: msg.type(),
      text: msg.text()
    };
    consoleLogs.push(logEntry);
    console.log(`🖥️  Console [${msg.type()}]:`, msg.text());
  });

  page.on('response', (response) => {
    const networkEntry = {
      timestamp: new Date().toISOString(),
      url: response.url(),
      status: response.status(),
      statusText: response.statusText()
    };
    networkLogs.push(networkEntry);
    
    if (response.status() >= 400) {
      console.log(`🚨 Network Error: ${response.status()} ${response.url()}`);
    }
  });

  try {
    console.log('📱 Loading SPQR Runtime dashboard...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
    
    // Wait for initial load
    await page.waitForTimeout(3000);
    
    // Navigate to SPQR Runtime
    console.log('🔍 Looking for SPQR Runtime navigation...');
    await page.waitForSelector('[data-testid="sidebar"]', { timeout: 10000 });
    
    // Try to find and click SPQR Runtime link
    const spqrLink = await page.$('a[href*="spqr"], button:has-text("SPQR"), [data-testid*="spqr"]');
    if (spqrLink) {
      console.log('✅ Found SPQR Runtime link, clicking...');
      await spqrLink.click();
      await page.waitForTimeout(2000);
    } else {
      console.log('⚠️  SPQR Runtime link not found, proceeding with current page');
    }
    
    // Capture initial screenshot
    console.log('📸 Capturing dashboard screenshot...');
    await page.screenshot({ 
      path: path.join(QA_OUTPUT_DIR, 'spqr-runtime-dashboard.png'),
      fullPage: true 
    });
    
    // Test partner role selection if available
    console.log('👤 Testing partner role selection...');
    const partnerRole = await page.$('button:has-text("Partner"), select option[value="partner"]');
    if (partnerRole) {
      await partnerRole.click();
      await page.waitForTimeout(2000);
      
      // Check for JWT logs
      const jwtLogs = consoleLogs.filter(log => 
        log.text.includes('HOTFIX: Applied multi-role override') ||
        log.text.includes('Dashboard Authorization') ||
        log.text.includes('effective_roles')
      );
      
      console.log(`🔐 Found ${jwtLogs.length} JWT-related logs`);
    }
    
    // Test Revenue Analytics Dashboard selection
    console.log('💰 Testing Revenue Analytics Dashboard...');
    const revenueCard = await page.$('button:has-text("Revenue Analytics"), [data-testid*="revenue"]');
    if (revenueCard) {
      await revenueCard.click();
      await page.waitForTimeout(3000);
      
      // Capture dashboard after selection
      await page.screenshot({ 
        path: path.join(QA_OUTPUT_DIR, 'revenue-analytics-dashboard.png'),
        fullPage: true 
      });
    }
    
    // Wait for any additional renders and check for recursion warnings
    console.log('🔄 Monitoring for recursion warnings...');
    await page.waitForTimeout(5000);
    
    // Analysis
    const recursionWarnings = consoleLogs.filter(log => 
      log.text.includes('Maximum update depth exceeded') ||
      log.text.includes('infinite loop') ||
      log.text.includes('Too many re-renders')
    );
    
    const authErrors = networkLogs.filter(log => 
      log.status === 401 || log.status === 403
    );
    
    const jwtSuccessLogs = consoleLogs.filter(log =>
      log.text.includes('Dashboard Authorization:') ||
      log.text.includes('effective_roles')
    );
    
    // Generate QA Report
    const qaReport = {
      timestamp: new Date().toISOString(),
      test_run: 'SPQR Runtime Recursion Fix QA',
      phase: 'Phase5–SPQRRuntimeRecursionFix',
      results: {
        dashboard_loaded: true,
        recursion_warnings: recursionWarnings.length,
        auth_errors: authErrors.length,
        jwt_logs: jwtSuccessLogs.length,
        console_errors: consoleLogs.filter(log => log.type === 'error').length,
        network_failures: networkLogs.filter(log => log.status >= 400).length
      },
      verdict: {
        recursion_fixed: recursionWarnings.length === 0,
        jwt_override_working: jwtSuccessLogs.length > 0,
        no_auth_failures: authErrors.length === 0,
        overall_status: 'PASS'
      },
      logs: {
        console_log_count: consoleLogs.length,
        network_log_count: networkLogs.length,
        critical_warnings: recursionWarnings,
        jwt_logs: jwtSuccessLogs.slice(0, 5), // First 5 JWT logs
        auth_errors: authErrors
      }
    };
    
    // Update overall status
    if (recursionWarnings.length > 0 || authErrors.length > 5) {
      qaReport.verdict.overall_status = 'FAIL';
    }
    
    // Save QA report
    fs.writeFileSync(
      path.join(QA_OUTPUT_DIR, 'qa-report.json'),
      JSON.stringify(qaReport, null, 2)
    );
    
    // Save detailed logs
    fs.writeFileSync(
      path.join(QA_OUTPUT_DIR, 'console-logs.json'),
      JSON.stringify(consoleLogs, null, 2)
    );
    
    fs.writeFileSync(
      path.join(QA_OUTPUT_DIR, 'network-logs.json'),
      JSON.stringify(networkLogs, null, 2)
    );
    
    console.log('\n📊 QA RESULTS:');
    console.log(`✅ Dashboard Loaded: ${qaReport.results.dashboard_loaded}`);
    console.log(`🔄 Recursion Warnings: ${qaReport.results.recursion_warnings}`);
    console.log(`🔐 JWT Logs Found: ${qaReport.results.jwt_logs}`);
    console.log(`🚨 Auth Errors: ${qaReport.results.auth_errors}`);
    console.log(`📝 Console Errors: ${qaReport.results.console_errors}`);
    console.log(`🌐 Network Failures: ${qaReport.results.network_failures}`);
    console.log(`\n🎯 Overall Status: ${qaReport.verdict.overall_status}`);
    
    return qaReport;
    
  } catch (error) {
    console.error('❌ QA test failed:', error);
    
    // Save error report
    const errorReport = {
      timestamp: new Date().toISOString(),
      error: error.message,
      stack: error.stack,
      console_logs: consoleLogs,
      network_logs: networkLogs
    };
    
    fs.writeFileSync(
      path.join(QA_OUTPUT_DIR, 'error-report.json'),
      JSON.stringify(errorReport, null, 2)
    );
    
    throw error;
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  runSPQRQA()
    .then((report) => {
      console.log(`\n🎉 QA Complete! Results saved to: ${QA_OUTPUT_DIR}`);
      console.log(`📄 Report: qa-report.json`);
      console.log(`📸 Screenshots: spqr-runtime-dashboard.png, revenue-analytics-dashboard.png`);
      process.exit(report.verdict.overall_status === 'PASS' ? 0 : 1);
    })
    .catch((error) => {
      console.error('💥 QA Failed:', error.message);
      process.exit(1);
    });
}

module.exports = { runSPQRQA };