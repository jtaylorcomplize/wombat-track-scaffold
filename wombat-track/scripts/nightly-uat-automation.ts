/**
 * OF-8.5 Nightly UAT & QA Evidence Capture Automation
 * Daily automated testing with screenshot capture and governance logging
 */

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { enhancedGovernanceLogger } from '../src/services/enhancedGovernanceLogger';
import { continuousOrchestrator } from '../src/services/continuousOrchestrator';
import { agenticCloudOrchestrator } from '../src/services/agenticCloudOrchestrator';

interface UATTestResult {
  testName: string;
  status: 'PASSED' | 'FAILED' | 'SKIPPED';
  duration: number;
  screenshots: string[];
  errors: string[];
  memoryAnchor?: string;
}

interface UATSession {
  sessionId: string;
  timestamp: string;
  environment: string;
  version: string;
  tests: UATTestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    duration: number;
  };
  evidencePath: string;
  governanceEvents: string[];
}

class NightlyUATAutomation {
  private browser: any = null;
  private page: any = null;
  private session: UATSession;
  private baseURL: string;
  private evidenceBasePath: string;

  constructor() {
    this.baseURL = process.env.BASE_URL || 'http://localhost:5173';
    this.evidenceBasePath = path.join(process.cwd(), 'DriveMemory', 'OF-8.5', 'NightlyUAT');
    
    const dateStr = new Date().toISOString().split('T')[0];
    const timestamp = new Date().toISOString();
    
    this.session = {
      sessionId: `nightly-uat-${Date.now()}`,
      timestamp,
      environment: process.env.NODE_ENV || 'development',
      version: 'OF-8.5',
      tests: [],
      summary: { total: 0, passed: 0, failed: 0, skipped: 0, duration: 0 },
      evidencePath: path.join(this.evidenceBasePath, dateStr),
      governanceEvents: []
    };

    // Ensure evidence directory exists
    fs.mkdirSync(this.session.evidencePath, { recursive: true });
  }

  async initialize(): Promise<void> {
    console.log('🌙 Starting Nightly UAT Automation...');
    
    this.browser = await puppeteer.launch({
      headless: process.env.HEADLESS !== 'false',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding'
      ],
      defaultViewport: { width: 1920, height: 1080 }
    });

    this.page = await this.browser.newPage();
    
    // Set up comprehensive logging
    this.page.on('console', msg => console.log(`[BROWSER] ${msg.text()}`));
    this.page.on('pageerror', error => console.error(`[PAGE ERROR] ${error.message}`));
    
    // Monitor network requests for cloud services
    this.page.on('response', response => {
      if (response.url().includes('azure') || response.url().includes('anthropic')) {
        console.log(`[CLOUD API] ${response.status()} ${response.url()}`);
      }
    });

    // Navigate to application
    await this.page.goto(`${this.baseURL}/orbis`, { waitUntil: 'networkidle2', timeout: 30000 });
    
    enhancedGovernanceLogger.createPhaseAnchor('nightly-uat-session', 'init');
    console.log(`✅ UAT Session initialized: ${this.session.sessionId}`);
  }

  async runFullUATSuite(): Promise<void> {
    const testSuites = [
      () => this.testContinuousOrchestration(),
      () => this.testNarrativeMode(),
      () => this.testCheckpointReviews(),
      () => this.testAgenticCloudOrchestration(),
      () => this.testDataIntegrity(),
      () => this.testPerformanceMetrics(),
      () => this.testGovernanceCompliance()
    ];

    const sessionStartTime = Date.now();

    for (const testSuite of testSuites) {
      try {
        await testSuite();
      } catch (error) {
        console.error(`❌ Test suite failed:`, error);
      }
    }

    this.session.summary.duration = Date.now() - sessionStartTime;
    this.session.summary.total = this.session.tests.length;
    this.session.summary.passed = this.session.tests.filter(t => t.status === 'PASSED').length;
    this.session.summary.failed = this.session.tests.filter(t => t.status === 'FAILED').length;
    this.session.summary.skipped = this.session.tests.filter(t => t.status === 'SKIPPED').length;

    await this.generateEvidenceReport();
    console.log(`✅ Nightly UAT completed: ${this.session.summary.passed}/${this.session.summary.total} passed`);
  }

  private async runTest(testName: string, testFn: () => Promise<void>): Promise<UATTestResult> {
    const startTime = Date.now();
    const screenshots: string[] = [];
    const errors: string[] = [];

    console.log(`🧪 Running test: ${testName}`);

    try {
      await testFn();
      
      // Capture success screenshot
      const screenshotPath = path.join(this.session.evidencePath, `${testName}-success.png`);
      await this.page.screenshot({ path: screenshotPath, fullPage: true });
      screenshots.push(screenshotPath);

      const result: UATTestResult = {
        testName,
        status: 'PASSED',
        duration: Date.now() - startTime,
        screenshots,
        errors,
        memoryAnchor: `uat_${testName}_passed_${Date.now()}`
      };

      this.session.tests.push(result);
      console.log(`✅ Test passed: ${testName}`);
      return result;

    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
      
      // Capture failure screenshot
      const screenshotPath = path.join(this.session.evidencePath, `${testName}-failure.png`);
      await this.page.screenshot({ path: screenshotPath, fullPage: true });
      screenshots.push(screenshotPath);

      const result: UATTestResult = {
        testName,
        status: 'FAILED',
        duration: Date.now() - startTime,
        screenshots,
        errors,
        memoryAnchor: `uat_${testName}_failed_${Date.now()}`
      };

      this.session.tests.push(result);
      console.log(`❌ Test failed: ${testName}`, error);
      return result;
    }
  }

  private async testContinuousOrchestration(): Promise<void> {
    await this.runTest('continuous-orchestration-status', async () => {
      await this.page.goto(`${this.baseURL}/orbis/admin`);
      await this.page.waitForSelector('[data-testid="admin-dashboard"]', { timeout: 15000 });
      
      // Check orchestration status
      const orchestrationPanel = await this.page.$('[data-testid="continuous-orchestration-panel"]');
      if (!orchestrationPanel) throw new Error('Continuous orchestration panel not found');
      
      const status = await orchestrationPanel.$eval('[data-testid="orchestration-status"]', el => el.textContent);
      if (!status?.includes('Active')) throw new Error('Orchestration is not active');
    });

    await this.runTest('auto-step-generation', async () => {
      // Trigger governance event
      await this.page.goto(`${this.baseURL}/orbis/projects`);
      await this.page.click('[data-testid="project-card"]:first-child');
      await this.page.waitForTimeout(3000);
      
      // Check for auto-generated steps
      await this.page.waitForSelector('[data-testid="phase-steps-panel"]', { timeout: 10000 });
      const steps = await this.page.$$('[data-testid="phase-step-item"]');
      if (steps.length === 0) throw new Error('No auto-generated steps found');
    });
  }

  private async testNarrativeMode(): Promise<void> {
    await this.runTest('narrative-panel-display', async () => {
      await this.page.goto(`${this.baseURL}/orbis/projects`);
      await this.page.click('[data-testid="project-card"]:first-child');
      await this.page.click('[data-testid="phase-step-item"]:first-child');
      
      await this.page.waitForSelector('[data-testid="narrative-panel"]', { timeout: 10000 });
      const narrativePanel = await this.page.$('[data-testid="narrative-panel"]');
      if (!narrativePanel) throw new Error('Narrative panel not displayed');
    });

    await this.runTest('ai-insights-generation', async () => {
      await this.page.click('[data-testid="generate-ai-insights-btn"]');
      await this.page.waitForSelector('[data-testid="ai-insight-entry"]', { timeout: 20000 });
      
      const insights = await this.page.$$('[data-testid="ai-insight-entry"]');
      if (insights.length === 0) throw new Error('AI insights not generated');
      
      const insightContent = await insights[0].$eval('[data-testid="insight-content"]', el => el.textContent);
      if (!insightContent || insightContent.length < 50) throw new Error('AI insight content insufficient');
    });
  }

  private async testCheckpointReviews(): Promise<void> {
    await this.runTest('checkpoint-reviews-display', async () => {
      await this.page.click('[data-testid="checkpoint-reviews-tab"]');
      await this.page.waitForSelector('[data-testid="checkpoint-reviews-panel"]', { timeout: 10000 });
      
      const reviewCards = await this.page.$$('[data-testid="checkpoint-review-card"]');
      if (reviewCards.length === 0) throw new Error('No checkpoint reviews found');
    });

    await this.runTest('rag-audit-execution', async () => {
      await this.page.click('[data-testid="rag-audit-btn"]:first-child');
      await this.page.waitForSelector('[data-testid="rag-audit-results"]', { timeout: 25000 });
      
      const auditScore = await this.page.$eval('[data-testid="overall-audit-score"]', el => el.textContent);
      const scoreMatch = auditScore?.match(/(\d+)%/);
      if (!scoreMatch || parseInt(scoreMatch[1]) <= 0) throw new Error('Invalid RAG audit score');
    });
  }

  private async testAgenticCloudOrchestration(): Promise<void> {
    await this.runTest('cloud-providers-status', async () => {
      await this.page.goto(`${this.baseURL}/orbis/admin/cloud-orchestration`);
      await this.page.waitForSelector('[data-testid="cloud-orchestration-panel"]', { timeout: 15000 });
      
      const azureStatus = await this.page.$('[data-testid="azure-openai-status"]');
      const claudeStatus = await this.page.$('[data-testid="claude-enterprise-status"]');
      
      if (!azureStatus || !claudeStatus) throw new Error('Cloud provider status not displayed');
    });

    await this.runTest('workflow-execution', async () => {
      await this.page.click('[data-testid="trigger-code-gen-workflow-btn"]');
      await this.page.waitForSelector('[data-testid="workflow-execution-status"]', { timeout: 30000 });
      
      const executionStatus = await this.page.$eval('[data-testid="workflow-execution-status"]', el => el.textContent);
      if (!executionStatus?.match(/running|completed/i)) throw new Error('Workflow execution failed');
    });
  }

  private async testDataIntegrity(): Promise<void> {
    await this.runTest('database-consistency', async () => {
      await this.page.goto(`${this.baseURL}/orbis/admin/data-explorer`);
      await this.page.waitForSelector('[data-testid="data-explorer-panel"]', { timeout: 15000 });
      
      // Check table counts
      const tables = ['Projects', 'Phases', 'PhaseSteps', 'GovernanceEvents'];
      for (const table of tables) {
        await this.page.click(`[data-testid="table-tab-${table}"]`);
        await this.page.waitForSelector(`[data-testid="${table}-table"]`, { timeout: 5000 });
        
        const rows = await this.page.$$(`[data-testid="${table}-table"] tbody tr`);
        if (rows.length === 0) console.warn(`Warning: ${table} table is empty`);
      }
    });

    await this.runTest('governance-log-sync', async () => {
      // Generate governance event
      await this.page.goto(`${this.baseURL}/orbis/projects`);
      await this.page.click('[data-testid="project-surface-select"]');
      await this.page.waitForTimeout(2000);
      
      // Check if event was logged
      await this.page.goto(`${this.baseURL}/orbis/admin/data-explorer`);
      await this.page.click('[data-testid="table-tab-GovernanceEvents"]');
      
      const recentEvents = await this.page.$$('[data-testid="governance-event-row"]');
      if (recentEvents.length === 0) throw new Error('Governance events not syncing');
    });
  }

  private async testPerformanceMetrics(): Promise<void> {
    await this.runTest('page-load-performance', async () => {
      const startTime = Date.now();
      await this.page.goto(`${this.baseURL}/orbis/projects`, { waitUntil: 'networkidle2' });
      const loadTime = Date.now() - startTime;
      
      if (loadTime > 10000) throw new Error(`Page load too slow: ${loadTime}ms`);
      console.log(`✅ Page load time: ${loadTime}ms`);
    });

    await this.runTest('memory-usage-check', async () => {
      const metrics = await this.page.metrics();
      const jsHeapUsed = metrics.JSHeapUsedSize / 1024 / 1024; // MB
      
      if (jsHeapUsed > 100) console.warn(`High memory usage: ${jsHeapUsed.toFixed(2)}MB`);
      console.log(`📊 JS Heap Usage: ${jsHeapUsed.toFixed(2)}MB`);
    });
  }

  private async testGovernanceCompliance(): Promise<void> {
    await this.runTest('memory-anchors-creation', async () => {
      await this.page.goto(`${this.baseURL}/orbis/admin/memory-anchors`);
      await this.page.waitForSelector('[data-testid="memory-anchors-panel"]', { timeout: 15000 });
      
      const memoryAnchors = await this.page.$$('[data-testid="memory-anchor-item"]');
      if (memoryAnchors.length === 0) throw new Error('No memory anchors found');
      
      // Check for OF-8.5 anchors
      const of85Anchors = await this.page.$$('[data-testid="memory-anchor-item"][data-context*="of-8.5"]');
      if (of85Anchors.length === 0) console.warn('Warning: No OF-8.5 memory anchors found');
    });

    await this.runTest('audit-trail-completeness', async () => {
      await this.page.goto(`${this.baseURL}/orbis/admin/governance-audit`);
      await this.page.waitForSelector('[data-testid="audit-trail-panel"]', { timeout: 15000 });
      
      const auditEntries = await this.page.$$('[data-testid="audit-entry"]');
      if (auditEntries.length === 0) throw new Error('No audit trail entries found');
      
      // Verify memory anchor linkage
      const linkedEntries = await this.page.$$('[data-testid="audit-entry"] [data-testid="memory-anchor-ref"]');
      const linkagePercentage = (linkedEntries.length / auditEntries.length) * 100;
      
      if (linkagePercentage < 50) console.warn(`Low anchor linkage: ${linkagePercentage.toFixed(1)}%`);
    });
  }

  private async generateEvidenceReport(): Promise<void> {
    // Create comprehensive UAT report
    const reportPath = path.join(this.session.evidencePath, 'uat-evidence-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(this.session, null, 2));

    // Generate HTML report
    const htmlReport = this.generateHTMLReport();
    const htmlPath = path.join(this.session.evidencePath, 'uat-report.html');
    fs.writeFileSync(htmlPath, htmlReport);

    // Create governance log entry
    const governanceEntry = {
      event: 'nightly_uat_completed',
      entityId: this.session.sessionId,
      timestamp: new Date().toISOString(),
      context: {
        total_tests: this.session.summary.total,
        passed_tests: this.session.summary.passed,
        failed_tests: this.session.summary.failed,
        duration_ms: this.session.summary.duration,
        evidence_path: this.session.evidencePath,
        success_rate: (this.session.summary.passed / this.session.summary.total * 100).toFixed(1)
      },
      memoryAnchor: `nightly_uat_${this.session.sessionId}`
    };

    const governancePath = path.join(this.session.evidencePath, 'governance-log.jsonl');
    fs.writeFileSync(governancePath, JSON.stringify(governanceEntry) + '\n');

    enhancedGovernanceLogger.createPhaseAnchor('nightly-uat-session', 'complete');
    
    console.log(`📊 Evidence report generated: ${reportPath}`);
    console.log(`📝 HTML report generated: ${htmlPath}`);
    console.log(`📋 Governance log created: ${governancePath}`);
  }

  private generateHTMLReport(): string {
    const passRate = (this.session.summary.passed / this.session.summary.total * 100).toFixed(1);
    const statusClass = this.session.summary.failed === 0 ? 'success' : 'warning';

    return `
<!DOCTYPE html>
<html>
<head>
    <title>OF-8.5 Nightly UAT Report - ${this.session.timestamp.split('T')[0]}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric { background: #f8f9fa; padding: 15px; border-radius: 6px; text-align: center; }
        .metric h3 { margin: 0 0 10px 0; color: #333; }
        .metric .value { font-size: 24px; font-weight: bold; }
        .success .value { color: #28a745; }
        .warning .value { color: #ffc107; }
        .danger .value { color: #dc3545; }
        .test-results { overflow-x: auto; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f8f9fa; font-weight: 600; }
        .passed { color: #28a745; font-weight: bold; }
        .failed { color: #dc3545; font-weight: bold; }
        .screenshot-link { color: #007bff; text-decoration: none; }
        .screenshot-link:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>OF-8.5 Nightly UAT Report</h1>
            <p>Session: ${this.session.sessionId}</p>
            <p>Date: ${this.session.timestamp}</p>
            <p>Environment: ${this.session.environment}</p>
        </div>
        
        <div class="summary">
            <div class="metric ${statusClass}">
                <h3>Pass Rate</h3>
                <div class="value">${passRate}%</div>
            </div>
            <div class="metric success">
                <h3>Passed</h3>
                <div class="value">${this.session.summary.passed}</div>
            </div>
            <div class="metric ${this.session.summary.failed > 0 ? 'danger' : 'success'}">
                <h3>Failed</h3>
                <div class="value">${this.session.summary.failed}</div>
            </div>
            <div class="metric">
                <h3>Duration</h3>
                <div class="value">${(this.session.summary.duration / 1000).toFixed(1)}s</div>
            </div>
        </div>
        
        <div class="test-results">
            <h2>Test Results</h2>
            <table>
                <thead>
                    <tr>
                        <th>Test Name</th>
                        <th>Status</th>
                        <th>Duration</th>
                        <th>Screenshots</th>
                        <th>Errors</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.session.tests.map(test => `
                    <tr>
                        <td>${test.testName}</td>
                        <td class="${test.status.toLowerCase()}">${test.status}</td>
                        <td>${(test.duration / 1000).toFixed(2)}s</td>
                        <td>
                            ${test.screenshots.map(screenshot => 
                                `<a href="${path.basename(screenshot)}" class="screenshot-link">${path.basename(screenshot)}</a>`
                            ).join(', ')}
                        </td>
                        <td>${test.errors.length > 0 ? test.errors.join('; ') : 'None'}</td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        
        <div class="footer">
            <p><strong>Evidence Path:</strong> ${this.session.evidencePath}</p>
            <p><strong>Generated:</strong> ${new Date().toISOString()}</p>
        </div>
    </div>
</body>
</html>`;
  }

  async cleanup(): Promise<void> {
    if (this.page) await this.page.close();
    if (this.browser) await this.browser.close();
    console.log('🧹 UAT automation cleanup completed');
  }

  static async runNightlyUAT(): Promise<void> {
    const automation = new NightlyUATAutomation();
    
    try {
      await automation.initialize();
      await automation.runFullUATSuite();
    } catch (error) {
      console.error('❌ Nightly UAT failed:', error);
    } finally {
      await automation.cleanup();
    }
  }
}

// CLI interface
async function main() {
  const command = process.argv[2];

  switch (command) {
    case 'run':
      await NightlyUATAutomation.runNightlyUAT();
      break;
    case 'schedule':
      console.log('📅 To schedule nightly UAT, add to crontab:');
      console.log('0 2 * * * cd /path/to/project && npm run uat:nightly');
      break;
    default:
      console.log('Usage: npx tsx scripts/nightly-uat-automation.ts [run|schedule]');
      process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { NightlyUATAutomation };
export default NightlyUATAutomation;