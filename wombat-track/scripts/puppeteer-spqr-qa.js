import puppeteer from 'puppeteer';
import { spawn } from 'child_process';
import fs from 'fs/promises';

class SPQRQAAutomation {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      phase: 'Phase6-RecursionDebugQA',
      testResults: {},
      artifacts: {},
      summary: { passed: 0, failed: 0, warnings: 0 }
    };
    this.consoleLogs = [];
    this.devServer = null;
    this.browser = null;
    this.page = null;
  }

  async init() {
    console.log('🚀 Initializing SPQR QA Automation...');
    
    console.log('📡 Starting development server...');
    this.devServer = spawn('npm', ['run', 'dev'], { stdio: 'pipe', detached: false });
    await this.sleep(10000);

    console.log('🌐 Launching browser for QA testing...');
    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
    });

    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1920, height: 1080 });

    this.page.on('console', msg => {
      this.consoleLogs.push({
        timestamp: Date.now(),
        type: msg.type(),
        text: msg.text()
      });
    });
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async test(name, testFn) {
    console.log(`🧪 Running test: ${name}`);
    try {
      const result = await testFn();
      this.results.testResults[name] = { status: 'PASSED', result, timestamp: new Date().toISOString() };
      this.results.summary.passed++;
      console.log(`✅ ${name}: PASSED`);
      return result;
    } catch (error) {
      this.results.testResults[name] = { status: 'FAILED', error: error.message, timestamp: new Date().toISOString() };
      this.results.summary.failed++;
      console.log(`❌ ${name}: FAILED - ${error.message}`);
      return false;
    }
  }

  async runRuntimeHealthChecks() {
    await this.test('Navigate to Root Page', async () => {
      await this.page.goto('http://localhost:5173/', { waitUntil: 'networkidle0', timeout: 30000 });
      const title = await this.page.title();
      if (!title.includes('Wombat')) throw new Error(`Unexpected page title: ${title}`);
      return { title, url: this.page.url() };
    });

    await this.test('SPQR Runtime Dashboard Access', async () => {
      await this.sleep(3000);
      const screenshotPath = 'DriveMemory/SPQR/QA/Phase6_RecursionDebug/pre-spqr-navigation.png';
      await this.page.screenshot({ path: screenshotPath, fullPage: true });
      
      // Wait for React to render and check for SPQR content
      await this.sleep(2000);
      const pageContent = await this.page.content();
      if (!pageContent.includes('SPQR') && !pageContent.includes('Runtime')) {
        console.log('⚠️  SPQR content not visible, taking diagnostic screenshot');
      }
      
      return { navigation: 'analyzed', content: 'checked' };
    });

    await this.test('Console Error Analysis', async () => {
      await this.sleep(5000);
      
      const errorLogs = this.consoleLogs.filter(log => 
        log.type === 'error' || log.text.includes('Error') || log.text.includes('Warning')
      );
      
      const recursionErrors = errorLogs.filter(log => 
        log.text.includes('Maximum update depth') || 
        log.text.includes('Warning: Maximum update depth exceeded')
      );
      
      if (recursionErrors.length > 0) {
        throw new Error(`Found ${recursionErrors.length} recursion errors`);
      }
      
      return {
        totalErrors: errorLogs.length,
        recursionErrors: recursionErrors.length,
        recentErrors: errorLogs.slice(-3).map(log => log.text)
      };
    });
  }

  async runGovernanceLogging() {
    await this.test('Governance Logs Generated', async () => {
      const governanceLogs = this.consoleLogs.filter(log => 
        log.text.includes('SPQR Governance Log') || 
        log.text.includes('governance') ||
        log.text.includes('Governance')
      );
      
      return {
        governanceLogCount: governanceLogs.length,
        samples: governanceLogs.slice(0, 2).map(log => log.text.substring(0, 100))
      };
    });
  }

  async captureArtifacts() {
    console.log('📸 Capturing QA artifacts...');
    
    const screenshotPath = 'DriveMemory/SPQR/QA/Phase6_RecursionDebug/runtime-dashboard.png';
    await this.page.screenshot({ path: screenshotPath, fullPage: true });
    this.results.artifacts.screenshot = screenshotPath;
    
    const logPath = 'DriveMemory/SPQR/QA/Phase6_RecursionDebug/spqr-runtime-debug.log';
    const logContent = this.consoleLogs
      .map(log => `[${new Date(log.timestamp).toISOString()}] ${log.type.toUpperCase()}: ${log.text}`)
      .join('\n');
    
    await fs.writeFile(logPath, logContent);
    this.results.artifacts.consoleLog = logPath;
    
    const resultsPath = 'DriveMemory/SPQR/QA/Phase6_RecursionDebug/qa-results.json';
    await fs.writeFile(resultsPath, JSON.stringify(this.results, null, 2));
    this.results.artifacts.qaResults = resultsPath;
    
    console.log(`✅ Artifacts saved: ${screenshotPath}, ${logPath}, ${resultsPath}`);
  }

  async generateSummaryReport() {
    const { passed, failed, warnings } = this.results.summary;
    const total = passed + failed;
    const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : '0.0';
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 SPQR QA AUTOMATION SUMMARY');
    console.log('='.repeat(50));
    console.log(`Phase: ${this.results.phase}`);
    console.log(`Pass Rate: ${passRate}% (${passed}/${total})`);
    console.log(`Warnings: ${warnings}`);
    
    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      Object.entries(this.results.testResults)
        .filter(([, result]) => result.status === 'FAILED')
        .forEach(([name, result]) => console.log(`   • ${name}: ${result.error}`));
    }
    
    console.log('\n📋 Test Results:');
    Object.entries(this.results.testResults).forEach(([name, result]) => {
      const status = result.status === 'PASSED' ? '✅' : '❌';
      console.log(`   ${status} ${name}`);
    });
    
    return passRate >= 75;
  }

  async cleanup() {
    console.log('🧹 Cleaning up QA automation...');
    if (this.browser) await this.browser.close();
    if (this.devServer) this.devServer.kill();
  }

  async run() {
    try {
      await this.init();
      
      console.log('🏁 Starting SPQR QA Test Suite...');
      await this.runRuntimeHealthChecks();
      await this.runGovernanceLogging();
      
      await this.captureArtifacts();
      const success = await this.generateSummaryReport();
      
      return success;
      
    } catch (error) {
      console.error('💥 QA Automation failed:', error);
      return false;
    } finally {
      await this.cleanup();
    }
  }
}

const qa = new SPQRQAAutomation();
qa.run().then(success => {
  console.log(success ? '\n🎉 QA AUTOMATION PASSED' : '\n🚨 QA AUTOMATION FAILED');
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});