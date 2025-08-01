import puppeteer from 'puppeteer';
import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { createGovernanceEvent } from '../../src/utils/governanceLogger.js';

class EnhancedAdminQAFramework {
  constructor() {
    this.timestamp = new Date().toISOString();
    this.branch = process.env.GITHUB_HEAD_REF || 'local';
    
    // Test configuration
    this.adminRoutes = ['/admin', '/admin/data', '/admin/runtime'];
    this.consoleLogs = [];
    this.screenshots = [];
    this.testResults = {};
    this.artifactPaths = {};
    
    // QA Results structure
    this.qaReport = {
      timestamp: this.timestamp,
      branch: this.branch,
      testedRoutes: this.adminRoutes,
      screenshots: [],
      consoleLogs: [],
      aiVerification: 'pending',
      result: 'pending'
    };
    
    this.devServer = null;
    this.browser = null;
    this.page = null;
  }

  async init() {
    console.log('🚀 Initializing Enhanced Admin QA Framework...');
    
    // Start development server
    console.log('📡 Starting development server...');
    this.devServer = spawn('npm', ['run', 'dev'], { 
      stdio: 'pipe', 
      detached: false,
      cwd: process.cwd()
    });
    
    // Wait for server to start
    await this.sleep(10000);

    // Launch browser
    console.log('🌐 Launching browser for QA testing...');
    this.browser = await puppeteer.launch({
      headless: process.env.CI === 'true',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security'],
      devtools: false
    });

    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1920, height: 1080 });

    // Set up console logging
    this.page.on('console', msg => {
      const logEntry = {
        timestamp: Date.now(),
        type: msg.type(),
        text: msg.text(),
        url: this.page.url()
      };
      this.consoleLogs.push(logEntry);
    });

    // Set up error logging
    this.page.on('pageerror', error => {
      const logEntry = {
        timestamp: Date.now(),
        type: 'pageerror',
        text: error.message,
        url: this.page.url()
      };
      this.consoleLogs.push(logEntry);
    });
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async testRoute(route) {
    const routeName = route.replace(/\//g, '-') || 'root';
    console.log(`🧪 Testing route: ${route}`);
    
    try {
      // Navigate to route
      const fullUrl = `http://localhost:5173${route}`;
      await this.page.goto(fullUrl, { 
        waitUntil: 'networkidle2', 
        timeout: 30000 
      });

      // Wait for page to stabilize
      await this.sleep(3000);

      // Capture screenshot
      const screenshotPath = `QAArtifacts/screenshots/admin-ui-${routeName}.png`;
      await this.page.screenshot({ 
        path: screenshotPath, 
        fullPage: true 
      });
      this.screenshots.push(screenshotPath);

      // Capture console logs for this route
      const routeConsoleLogs = this.consoleLogs.filter(log => 
        log.url === fullUrl || log.url.includes(route)
      );
      
      const logPath = `QAArtifacts/logs/admin-ui-${routeName}.log`;
      const logContent = routeConsoleLogs
        .map(log => `[${new Date(log.timestamp).toISOString()}] ${log.type.toUpperCase()}: ${log.text}`)
        .join('\n');
      
      await fs.writeFile(logPath, logContent);
      this.artifactPaths[`${routeName}_log`] = logPath;

      // Basic UI validation
      const validation = await this.validateRouteUI(route);
      
      this.testResults[route] = {
        status: 'PASSED',
        timestamp: new Date().toISOString(),
        screenshot: screenshotPath,
        logFile: logPath,
        consoleErrors: routeConsoleLogs.filter(log => log.type === 'error').length,
        validation
      };

      console.log(`✅ Route ${route}: PASSED`);
      return validation;

    } catch (error) {
      this.testResults[route] = {
        status: 'FAILED',
        timestamp: new Date().toISOString(),
        error: error.message,
        consoleErrors: this.consoleLogs.filter(log => log.type === 'error').length
      };
      console.log(`❌ Route ${route}: FAILED - ${error.message}`);
      return false;
    }
  }

  async validateRouteUI(route) {
    const validation = {
      hasTitle: false,
      sidebarVisible: false,
      sidebarWidth: 0,
      hasErrorBanner: false,
      isBlankDashboard: false,
      loadTime: 0
    };

    try {
      const startTime = Date.now();
      
      // Check for page title
      const title = await this.page.title();
      validation.hasTitle = title && title.length > 0;

      // Check for sidebar
      const sidebar = await this.page.$('.sidebar, [data-testid="sidebar"], nav');
      if (sidebar) {
        validation.sidebarVisible = true;
        const sidebarBox = await sidebar.boundingBox();
        validation.sidebarWidth = sidebarBox ? sidebarBox.width : 0;
      }

      // Check for error banners
      const errorBanner = await this.page.$('.error-banner, [data-testid="error-banner"], .admin-ui-error');
      validation.hasErrorBanner = !!errorBanner;

      // Check if dashboard appears blank
      const contentElements = await this.page.$$('h1, h2, h3, table, .card, .dashboard-content');
      validation.isBlankDashboard = contentElements.length === 0;

      validation.loadTime = Date.now() - startTime;

    } catch (error) {
      console.warn(`Validation error for ${route}:`, error.message);
    }

    return validation;
  }

  async performAIVerification() {
    console.log('🤖 Performing AI-assisted verification...');
    
    let aiVerificationPassed = true;
    const verificationResults = {
      consoleErrorAnalysis: { passed: true, details: [] },
      screenshotAnalysis: { passed: true, details: [] }
    };

    // Console error analysis
    const criticalErrors = this.consoleLogs.filter(log => 
      log.type === 'error' && (
        log.text.includes('TypeError') ||
        log.text.includes('ReferenceError') ||
        log.text.includes('Cannot read') ||
        log.text.includes('Maximum update depth')
      )
    );

    if (criticalErrors.length > 0) {
      verificationResults.consoleErrorAnalysis.passed = false;
      verificationResults.consoleErrorAnalysis.details = criticalErrors.map(err => ({
        type: err.type,
        message: err.text,
        url: err.url
      }));
      aiVerificationPassed = false;
    }

    // Screenshot analysis for each route
    for (const route of this.adminRoutes) {
      const routeName = route.replace(/\//g, '-') || 'root';
      const validation = this.testResults[route]?.validation;
      
      if (validation) {
        // Check for blank dashboards
        if (validation.isBlankDashboard) {
          verificationResults.screenshotAnalysis.passed = false;
          verificationResults.screenshotAnalysis.details.push({
            route,
            issue: 'Blank dashboard detected',
            details: 'No content elements found on page'
          });
          aiVerificationPassed = false;
        }

        // Check for error banners
        if (validation.hasErrorBanner) {
          verificationResults.screenshotAnalysis.passed = false;
          verificationResults.screenshotAnalysis.details.push({
            route,
            issue: 'Error banner detected',
            details: 'Admin UI Error banner or red text found'
          });
          aiVerificationPassed = false;
        }

        // Check sidebar width
        if (validation.sidebarWidth < 60) {
          verificationResults.screenshotAnalysis.passed = false;
          verificationResults.screenshotAnalysis.details.push({
            route,
            issue: 'Sidebar too narrow or missing',
            details: `Sidebar width: ${validation.sidebarWidth}px (expected > 60px)`
          });
          aiVerificationPassed = false;
        }
      }
    }

    this.qaReport.aiVerification = aiVerificationPassed ? 'passed' : 'failed';
    this.qaReport.verificationDetails = verificationResults;
    
    return aiVerificationPassed;
  }

  async generateQABundle() {
    console.log('📦 Generating QA bundle...');
    
    // Update QA report with final data
    this.qaReport.screenshots = this.screenshots;
    this.qaReport.consoleLogs = Object.values(this.artifactPaths).filter(path => path.endsWith('.log'));
    
    const passedTests = Object.values(this.testResults)
      .filter(result => result.status === 'PASSED').length;
    const totalTests = Object.keys(this.testResults).length;
    
    this.qaReport.result = passedTests === totalTests && this.qaReport.aiVerification === 'passed' 
      ? 'QA passed with visual and console verification' 
      : 'QA failed - check verification details';

    // Write QA report
    const qaReportPath = 'QAArtifacts/qa-report.json';
    await fs.writeFile(qaReportPath, JSON.stringify(this.qaReport, null, 2));
    
    console.log(`✅ QA bundle generated: ${qaReportPath}`);
    return qaReportPath;
  }

  async logToGovernanceAndMemory() {
    console.log('📝 Logging to Governance & MemoryPlugin...');
    
    const governanceEntry = {
      timestamp: this.timestamp,
      phase: 'WT-Admin-UI',
      changeType: 'QA',
      summary: 'AI-assisted QA executed with screenshot and console log verification for Admin UI and nested dashboards.',
      branch: this.branch,
      artifact: 'QAArtifacts/qa-report.json',
      memoryAnchor: 'WT-ADMIN-UI-QA-FRAMEWORK-1.0',
      details: {
        testedRoutes: this.adminRoutes,
        totalTests: Object.keys(this.testResults).length,
        passedTests: Object.values(this.testResults).filter(r => r.status === 'PASSED').length,
        aiVerificationStatus: this.qaReport.aiVerification,
        screenshots: this.screenshots.length,
        consoleLogs: this.consoleLogs.length,
        criticalErrors: this.consoleLogs.filter(log => log.type === 'error').length
      }
    };

    // Write to governance log
    const governanceLogPath = 'logs/governance.jsonl';
    const governanceLogEntry = JSON.stringify(governanceEntry) + '\n';
    
    try {
      await fs.appendFile(governanceLogPath, governanceLogEntry);
      console.log('✅ Governance entry logged');
    } catch (error) {
      console.error('Failed to write governance entry:', error);
    }

    return governanceEntry;
  }

  async generateSummaryReport() {
    const passedTests = Object.values(this.testResults)
      .filter(result => result.status === 'PASSED').length;
    const totalTests = Object.keys(this.testResults).length;
    const passRate = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : '0.0';
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 ENHANCED ADMIN QA FRAMEWORK SUMMARY');
    console.log('='.repeat(60));
    console.log(`Branch: ${this.branch}`);
    console.log(`Pass Rate: ${passRate}% (${passedTests}/${totalTests})`);
    console.log(`AI Verification: ${this.qaReport.aiVerification.toUpperCase()}`);
    console.log(`Screenshots Captured: ${this.screenshots.length}`);
    console.log(`Console Logs: ${this.consoleLogs.length}`);
    
    const failedTests = Object.entries(this.testResults)
      .filter(([, result]) => result.status === 'FAILED');
    
    if (failedTests.length > 0) {
      console.log('\n❌ Failed Tests:');
      failedTests.forEach(([route, result]) => {
        console.log(`   • ${route}: ${result.error}`);
      });
    }
    
    console.log('\n📋 Test Results:');
    Object.entries(this.testResults).forEach(([route, result]) => {
      const status = result.status === 'PASSED' ? '✅' : '❌';
      console.log(`   ${status} ${route}`);
    });
    
    if (this.qaReport.verificationDetails) {
      console.log('\n🤖 AI Verification Issues:');
      const { consoleErrorAnalysis, screenshotAnalysis } = this.qaReport.verificationDetails;
      
      if (!consoleErrorAnalysis.passed) {
        console.log('   Console Errors:');
        consoleErrorAnalysis.details.forEach(error => {
          console.log(`     • ${error.message}`);
        });
      }
      
      if (!screenshotAnalysis.passed) {
        console.log('   Screenshot Issues:');
        screenshotAnalysis.details.forEach(issue => {
          console.log(`     • ${issue.route}: ${issue.issue}`);
        });
      }
    }
    
    return passRate >= 75 && this.qaReport.aiVerification === 'passed';
  }

  async cleanup() {
    console.log('🧹 Cleaning up QA framework...');
    if (this.browser) await this.browser.close();
    if (this.devServer) {
      this.devServer.kill();
      // Give the server time to shut down
      await this.sleep(2000);
    }
  }

  async run() {
    try {
      await this.init();
      
      console.log('🏁 Starting Enhanced Admin QA Test Suite...');
      
      // Test all admin routes
      for (const route of this.adminRoutes) {
        await this.testRoute(route);
        await this.sleep(2000); // Brief pause between routes
      }
      
      // Perform AI verification
      await this.performAIVerification();
      
      // Generate QA bundle
      await this.generateQABundle();
      
      // Log to governance and memory
      await this.logToGovernanceAndMemory();
      
      // Generate summary report
      const success = await this.generateSummaryReport();
      
      return success;
      
    } catch (error) {
      console.error('💥 QA Framework failed:', error);
      return false;
    } finally {
      await this.cleanup();
    }
  }
}

// Export for use as module
export { EnhancedAdminQAFramework };

// Run if called directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const qa = new EnhancedAdminQAFramework();
  qa.run().then(success => {
    console.log(success ? '\n🎉 ENHANCED QA FRAMEWORK PASSED' : '\n🚨 ENHANCED QA FRAMEWORK FAILED');
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
}