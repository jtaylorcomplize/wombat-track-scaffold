import puppeteer from 'puppeteer';
import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { AIVerificationUtils } from './ai-verification-utils.js';

/**
 * Configurable QA Framework
 * 
 * A modular, configuration-driven QA framework that can adapt to:
 * - Admin UI testing
 * - Future Work Surfaces
 * - Sub-App dashboards
 * - Custom test suites
 */
export class ConfigurableQAFramework {
  constructor(configPath = './qa-config.json', environment = 'development') {
    this.configPath = configPath;
    this.environment = environment;
    this.config = null;
    this.aiVerification = new AIVerificationUtils();
    
    // Runtime state
    this.timestamp = new Date().toISOString();
    this.branch = process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME || 'local';
    this.consoleLogs = [];
    this.screenshots = [];
    this.testResults = {};
    this.artifactPaths = {};
    
    // Browser and server instances
    this.devServer = null;
    this.browser = null;
    this.page = null;
  }

  async loadConfig() {
    try {
      const configData = await fs.readFile(this.configPath, 'utf8');
      this.config = JSON.parse(configData);
      console.log(`✅ Configuration loaded: ${this.config.framework.name} v${this.config.framework.version}`);
    } catch (error) {
      throw new Error(`Failed to load configuration from ${this.configPath}: ${error.message}`);
    }
  }

  async init() {
    console.log('🚀 Initializing Configurable QA Framework...');
    
    await this.loadConfig();
    
    const envConfig = this.config.environments[this.environment];
    if (!envConfig) {
      throw new Error(`Environment '${this.environment}' not found in configuration`);
    }

    // Start development server if needed
    if (envConfig.serverCommand) {
      console.log('📡 Starting development server...');
      this.devServer = spawn(envConfig.serverCommand[0], envConfig.serverCommand.slice(1), {
        stdio: 'pipe',
        detached: false,
        cwd: process.cwd()
      });
      
      // Wait for server to start
      await this.sleep(envConfig.startDelay);
    }

    // Launch browser
    console.log('🌐 Launching browser for QA testing...');
    this.browser = await puppeteer.launch({
      headless: this.config.browser.headless,
      args: this.config.browser.args,
      devtools: false
    });

    this.page = await this.browser.newPage();
    await this.page.setViewport(this.config.browser.viewport);

    // Set up console and error logging
    this.setupLogging();
  }

  setupLogging() {
    this.page.on('console', msg => {
      const logEntry = {
        timestamp: Date.now(),
        type: msg.type(),
        text: msg.text(),
        url: this.page.url()
      };
      this.consoleLogs.push(logEntry);
    });

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

  getEnabledTestSuites() {
    return Object.entries(this.config.testSuites)
      .filter(([, suite]) => suite.enabled)
      .map(([name, suite]) => ({ name, ...suite }));
  }

  async runTestSuite(suiteName, suite) {
    console.log(`\n🧪 Running test suite: ${suite.name}`);
    console.log(`📝 ${suite.description}`);
    
    const suiteResults = {
      name: suiteName,
      description: suite.description,
      routes: {},
      summary: { passed: 0, failed: 0, total: suite.routes.length }
    };

    for (const route of suite.routes) {
      const result = await this.testRoute(route, suite);
      suiteResults.routes[route] = result;
      
      if (result.status === 'PASSED') {
        suiteResults.summary.passed++;
      } else {
        suiteResults.summary.failed++;
      }
    }

    this.testResults[suiteName] = suiteResults;
    return suiteResults;
  }

  async testRoute(route, suiteConfig) {
    const routeName = this.routeToFileName(route);
    const envConfig = this.config.environments[this.environment];
    
    console.log(`  🔍 Testing route: ${route}`);
    
    try {
      // Navigate to route
      const fullUrl = envConfig.baseUrl + route;
      await this.page.goto(fullUrl, {
        waitUntil: 'networkidle2',
        timeout: suiteConfig.timeout || this.config.browser.timeout
      });

      // Wait for page to stabilize
      await this.sleep(3000);

      // Capture screenshot
      const screenshotPath = this.generateArtifactPath('screenshots', routeName, 'png');
      await this.page.screenshot({
        path: screenshotPath,
        ...suiteConfig.screenshotOptions
      });
      this.screenshots.push(screenshotPath);

      // Capture console logs for this route
      const routeConsoleLogs = this.consoleLogs.filter(log =>
        log.url === fullUrl || log.url.includes(route)
      );

      const logPath = this.generateArtifactPath('logs', routeName, 'log');
      const logContent = routeConsoleLogs
        .map(log => `[${new Date(log.timestamp).toISOString()}] ${log.type.toUpperCase()}: ${log.text}`)
        .join('\n');

      await fs.writeFile(logPath, logContent);
      this.artifactPaths[`${routeName}_log`] = logPath;

      // Perform UI validation
      const validation = await this.validateRouteUI(route);

      const result = {
        status: 'PASSED',
        timestamp: new Date().toISOString(),
        url: fullUrl,
        screenshot: screenshotPath,
        logFile: logPath,
        consoleErrors: routeConsoleLogs.filter(log => log.type === 'error').length,
        validation
      };

      console.log(`    ✅ ${route}: PASSED`);
      return result;

    } catch (error) {
      const result = {
        status: 'FAILED',
        timestamp: new Date().toISOString(),
        error: error.message,
        consoleErrors: this.consoleLogs.filter(log => log.type === 'error').length
      };
      
      console.log(`    ❌ ${route}: FAILED - ${error.message}`);
      return result;
    }
  }

  async validateRouteUI(route) {
    const validation = {
      hasTitle: false,
      sidebarVisible: false,
      sidebarWidth: 0,
      hasErrorBanner: false,
      isBlankDashboard: false,
      loadTime: 0,
      contentElements: 0
    };

    try {
      const startTime = Date.now();

      // Check for page title
      const title = await this.page.title();
      validation.hasTitle = title && title.length > 0;

      // Check for sidebar
      const sidebar = await this.page.$('.sidebar, [data-testid="sidebar"], nav, .admin-sidebar');
      if (sidebar) {
        validation.sidebarVisible = true;
        const sidebarBox = await sidebar.boundingBox();
        validation.sidebarWidth = sidebarBox ? sidebarBox.width : 0;
      }

      // Check for error banners using config patterns
      const errorPatterns = this.config.verification.ai.screenshot_analysis.error_indicators;
      for (const pattern of errorPatterns) {
        const errorElement = await this.page.$(`*:contains("${pattern}")`).catch(() => null);
        if (errorElement) {
          validation.hasErrorBanner = true;
          break;
        }
      }

      // Check content elements
      const contentElements = await this.page.$$('h1, h2, h3, table, .card, .dashboard-content, .admin-content, main > *');
      validation.contentElements = contentElements.length;
      validation.isBlankDashboard = contentElements.length === 0;

      validation.loadTime = Date.now() - startTime;

    } catch (error) {
      console.warn(`Validation error for ${route}:`, error.message);
    }

    return validation;
  }

  async performAIVerification() {
    console.log('\n🤖 Performing AI-assisted verification...');
    
    // Use AI verification utilities
    const report = await this.aiVerification.generateVerificationReport(
      this.consoleLogs,
      this.screenshots,
      this.flattenTestResults()
    );
    
    // Generate human-readable summary
    const summary = this.aiVerification.generateHumanSummary(report);
    console.log('\n📊 AI Verification Summary:');
    console.log(summary);
    
    return report;
  }

  flattenTestResults() {
    const flattened = {};
    Object.values(this.testResults).forEach(suite => {
      Object.entries(suite.routes).forEach(([route, result]) => {
        flattened[route] = result;
      });
    });
    return flattened;
  }

  async generateQABundle() {
    console.log('\n📦 Generating QA bundle...');
    
    // Create comprehensive QA report
    const qaReport = {
      timestamp: this.timestamp,
      branch: this.branch,
      environment: this.environment,
      framework: this.config.framework,
      testSuites: this.testResults,
      artifacts: {
        screenshots: this.screenshots,
        logs: Object.values(this.artifactPaths).filter(path => path.endsWith('.log'))
      },
      summary: this.calculateOverallSummary(),
      aiVerification: await this.performAIVerification()
    };

    // Save QA report
    const qaReportPath = this.generateArtifactPath('reports', 'qa-report', 'json');
    await fs.writeFile(qaReportPath, JSON.stringify(qaReport, null, 2));
    
    console.log(`✅ QA bundle generated: ${qaReportPath}`);
    return { report: qaReport, path: qaReportPath };
  }

  calculateOverallSummary() {
    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;

    Object.values(this.testResults).forEach(suite => {
      totalTests += suite.summary.total;
      passedTests += suite.summary.passed;
      failedTests += suite.summary.failed;
    });

    return {
      totalTests,
      passedTests,
      failedTests,
      passRate: totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : '0.0'
    };
  }

  async logToGovernanceAndMemory(qaBundle) {
    if (!this.config.governance.enabled) {
      console.log('⚠️  Governance logging disabled in configuration');
      return null;
    }

    console.log('📝 Logging to Governance & MemoryPlugin...');
    
    const summary = this.calculateOverallSummary();
    const memoryAnchor = `${this.config.governance.memory_anchors.base}-${this.config.governance.memory_anchors.version}`;
    
    const governanceEntry = {
      timestamp: this.timestamp,
      phase: 'WT-Admin-UI',
      changeType: 'QA',
      summary: `AI-assisted QA executed for ${Object.keys(this.testResults).join(', ')} test suites`,
      branch: this.branch,
      artifact: qaBundle.path,
      memoryAnchor,
      details: {
        environment: this.environment,
        testSuites: Object.keys(this.testResults),
        totalTests: summary.totalTests,
        passedTests: summary.passedTests,
        passRate: summary.passRate,
        aiVerificationStatus: qaBundle.report.aiVerification.overall.passed ? 'passed' : 'failed',
        screenshots: this.screenshots.length,
        consoleLogs: this.consoleLogs.length,
        framework: this.config.framework
      }
    };

    // Write to governance log
    try {
      const governanceLogEntry = JSON.stringify(governanceEntry) + '\n';
      await fs.appendFile(this.config.governance.log_path, governanceLogEntry);
      console.log('✅ Governance entry logged');
    } catch (error) {
      console.error('Failed to write governance entry:', error);
    }

    return governanceEntry;
  }

  generateArtifactPath(type, name, extension) {
    const artifactConfig = this.config.artifacts[type];
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = artifactConfig.format
      .replace('{route}', name)
      .replace('{timestamp}', timestamp);

    return path.join(artifactConfig.path, filename);
  }

  routeToFileName(route) {
    return route.replace(/\//g, '-').replace(/^-/, '') || 'root';
  }

  async generateSummaryReport(qaBundle) {
    const summary = this.calculateOverallSummary();
    const aiReport = qaBundle.report.aiVerification;
    
    console.log('\n' + '='.repeat(70));
    console.log('📊 CONFIGURABLE QA FRAMEWORK SUMMARY');
    console.log('='.repeat(70));
    console.log(`Framework: ${this.config.framework.name} v${this.config.framework.version}`);
    console.log(`Environment: ${this.environment}`);
    console.log(`Branch: ${this.branch}`);
    console.log(`Pass Rate: ${summary.passRate}% (${summary.passedTests}/${summary.totalTests})`);
    console.log(`AI Verification: ${aiReport.overall.passed ? 'PASSED' : 'FAILED'} (${aiReport.overall.confidence}% confidence)`);
    
    // Test suite breakdown
    console.log('\n📋 Test Suite Results:');
    Object.entries(this.testResults).forEach(([suiteName, suite]) => {
      const suitePassRate = ((suite.summary.passed / suite.summary.total) * 100).toFixed(1);
      console.log(`   ${suite.summary.passed === suite.summary.total ? '✅' : '⚠️ '} ${suite.name}: ${suitePassRate}% (${suite.summary.passed}/${suite.summary.total})`);
    });
    
    // AI verification issues
    if (aiReport.recommendations.length > 0) {
      console.log('\n🤖 AI Recommendations:');
      aiReport.recommendations.forEach((rec, index) => {
        console.log(`   ${index + 1}. [${rec.priority.toUpperCase()}] ${rec.message}`);
      });
    }
    
    console.log(`\n📸 Artifacts: ${this.screenshots.length} screenshots, ${Object.keys(this.artifactPaths).length} log files`);
    
    const overallSuccess = summary.passRate >= 75 && aiReport.overall.passed;
    return overallSuccess;
  }

  async cleanup() {
    console.log('\n🧹 Cleaning up QA framework...');
    if (this.browser) await this.browser.close();
    if (this.devServer) {
      this.devServer.kill();
      await this.sleep(2000);
    }
  }

  async run() {
    try {
      await this.init();
      
      console.log('\n🏁 Starting Configurable QA Test Suite...');
      
      // Run all enabled test suites
      const enabledSuites = this.getEnabledTestSuites();
      for (const suite of enabledSuites) {
        await this.runTestSuite(suite.name, suite);
        await this.sleep(2000); // Brief pause between suites
      }
      
      // Generate QA bundle with AI verification
      const qaBundle = await this.generateQABundle();
      
      // Log to governance and memory
      await this.logToGovernanceAndMemory(qaBundle);
      
      // Generate summary report
      const success = await this.generateSummaryReport(qaBundle);
      
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
export default ConfigurableQAFramework;

// CLI interface
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const environment = process.argv[2] || 'development';
  const configPath = process.argv[3] || './qa-config.json';
  
  const qa = new ConfigurableQAFramework(configPath, environment);
  qa.run().then(success => {
    console.log(success ? '\n🎉 CONFIGURABLE QA FRAMEWORK PASSED' : '\n🚨 CONFIGURABLE QA FRAMEWORK FAILED');
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
}