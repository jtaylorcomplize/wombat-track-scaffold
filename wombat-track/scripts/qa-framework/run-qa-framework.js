#!/usr/bin/env node

import { ConfigurableQAFramework } from './configurable-qa-framework.js';
import { MemoryPluginIntegration } from './memory-plugin-integration.js';
import fs from 'fs/promises';
import path from 'path';

/**
 * Main QA Framework Runner
 * 
 * Orchestrates the complete AI-assisted QA pipeline:
 * 1. Configurable multi-route testing
 * 2. AI-assisted verification
 * 3. Governance logging  
 * 4. Memory plugin integration
 * 5. Artifact bundling
 */

class QAFrameworkRunner {
  constructor(options = {}) {
    this.options = {
      environment: options.environment || 'development',
      configPath: options.configPath || path.join(process.cwd(), 'scripts/qa-framework/qa-config.json'),
      enableMemoryPlugin: options.enableMemoryPlugin !== false,
      enableGovernance: options.enableGovernance !== false,
      ...options
    };
    
    this.startTime = Date.now();
    this.memoryPlugin = null;
    this.qaFramework = null;
  }

  async init() {
    console.log('🚀 Initializing QA Framework Runner...');
    console.log(`Environment: ${this.options.environment}`);
    console.log(`Config: ${this.options.configPath}`);
    
    // Initialize QA framework
    this.qaFramework = new ConfigurableQAFramework(
      this.options.configPath, 
      this.options.environment
    );
    
    // Initialize Memory Plugin if enabled
    if (this.options.enableMemoryPlugin) {
      this.memoryPlugin = new MemoryPluginIntegration();
      await this.memoryPlugin.init();
    }
  }

  async run() {
    try {
      await this.init();
      
      console.log('\n🏁 Starting Complete QA Pipeline...');
      
      // Run QA framework
      const success = await this.qaFramework.run();
      const executionTime = Date.now() - this.startTime;
      
      // Get QA report from the framework
      const qaReport = await this.getLatestQAReport();
      
      if (!qaReport) {
        throw new Error('Failed to retrieve QA report');
      }
      
      // Enhanced governance and memory integration
      await this.processQAResults(qaReport, success, executionTime);
      
      // Generate final summary
      await this.generateFinalSummary(qaReport, success, executionTime);
      
      return success;
      
    } catch (error) {
      console.error('💥 QA Framework Runner failed:', error);
      await this.handleFailure(error);
      return false;
    }
  }

  async getLatestQAReport() {
    try {
      // Look for the most recent QA report
      const qaReportPath = path.join(process.cwd(), 'QAArtifacts/qa-report.json');
      const reportData = await fs.readFile(qaReportPath, 'utf8');
      return JSON.parse(reportData);
    } catch (error) {
      console.error('Failed to read QA report:', error);
      return null;
    }
  }

  async processQAResults(qaReport, success, executionTime) {
    console.log('\n📊 Processing QA Results...');
    
    let governanceEntry = null;
    let memoryEntry = null;
    
    // Enhanced governance logging
    if (this.options.enableGovernance) {
      governanceEntry = await this.createEnhancedGovernanceEntry(qaReport, success, executionTime);
    }
    
    // Memory plugin integration
    if (this.options.enableMemoryPlugin && this.memoryPlugin) {
      memoryEntry = await this.memoryPlugin.createGovernanceCompliantEntry(qaReport, governanceEntry);
      console.log(`🧠 Memory anchor created: ${memoryEntry.anchorId}`);
    }
    
    return { governanceEntry, memoryEntry };
  }

  async createEnhancedGovernanceEntry(qaReport, success, executionTime) {
    const governanceEntry = {
      timestamp: new Date().toISOString(),
      event_type: 'qa_framework_execution',
      user_id: 'system',
      user_role: 'qa-automation',
      resource_type: 'admin_ui',
      resource_id: 'WT-ADMIN-UI-QA-FRAMEWORK-1.0',
      action: 'automated_qa_verification',
      success,
      details: {
        phase: 'WT-Admin-UI',
        changeType: 'QA',
        summary: `AI-assisted QA framework executed for ${Object.keys(qaReport.testSuites).join(', ')} test suites`,
        branch: qaReport.branch,
        environment: qaReport.environment,
        artifact: 'QAArtifacts/qa-report.json',
        memoryAnchor: 'WT-ADMIN-UI-QA-FRAMEWORK-1.0',
        
        // Detailed metrics
        metrics: {
          executionTimeMs: executionTime,
          totalTests: qaReport.summary.totalTests,
          passedTests: qaReport.summary.passedTests,
          failedTests: qaReport.summary.failedTests,
          passRate: parseFloat(qaReport.summary.passRate),
          screenshotCount: qaReport.artifacts.screenshots.length,
          logFileCount: qaReport.artifacts.logs.length
        },
        
        // AI verification details
        aiVerification: {
          status: qaReport.aiVerification.overall.passed ? 'PASSED' : 'FAILED',
          confidence: qaReport.aiVerification.overall.confidence,
          criticalErrors: qaReport.aiVerification.console.summary.criticalErrorCount,
          visualIssues: qaReport.aiVerification.screenshots.summary.issueCount,
          recommendationCount: qaReport.aiVerification.recommendations.length
        },
        
        // Test suite breakdown
        testSuites: Object.entries(qaReport.testSuites).map(([name, suite]) => ({
          name,
          description: suite.description,
          total: suite.summary.total,
          passed: suite.summary.passed,
          failed: suite.summary.failed,
          passRate: ((suite.summary.passed / suite.summary.total) * 100).toFixed(1)
        })),
        
        // Critical issues requiring attention
        criticalIssues: this.extractCriticalIssues(qaReport),
        
        // Framework metadata
        framework: qaReport.framework
      },
      runtime_context: {
        phase: 'WT-Admin-UI',
        environment: qaReport.environment,
        automation_tool: 'configurable-qa-framework',
        node_version: process.version,
        platform: process.platform
      }
    };

    // Write to governance log
    const governanceLogPath = path.join(process.cwd(), 'logs/governance.jsonl');
    const governanceLogEntry = JSON.stringify(governanceEntry) + '\n';
    
    try {
      await fs.appendFile(governanceLogPath, governanceLogEntry);
      console.log('✅ Enhanced governance entry logged');
    } catch (error) {
      console.error('Failed to write governance entry:', error);
    }
    
    return governanceEntry;
  }

  extractCriticalIssues(qaReport) {
    const issues = [];
    
    // Console errors
    qaReport.aiVerification.console.criticalErrors.forEach(error => {
      issues.push({
        type: 'console_error',
        severity: error.severity,
        message: error.message,
        url: error.url
      });
    });
    
    // Visual issues
    qaReport.aiVerification.screenshots.issues
      .filter(issue => issue.severity === 'high')
      .forEach(issue => {
        issues.push({
          type: 'visual_issue',
          severity: issue.severity,
          description: issue.description,
          route: issue.route
        });
      });
    
    return issues;
  }

  async generateFinalSummary(qaReport, success, executionTime) {
    const summary = {
      overall_status: success ? 'PASSED' : 'FAILED',
      execution_time_seconds: Math.round(executionTime / 1000),
      timestamp: new Date().toISOString(),
      environment: this.options.environment,
      
      test_results: {
        total_tests: qaReport.summary.totalTests,
        passed_tests: qaReport.summary.passedTests,
        failed_tests: qaReport.summary.failedTests,
        pass_rate_percent: parseFloat(qaReport.summary.passRate)
      },
      
      ai_verification: {
        status: qaReport.aiVerification.overall.passed ? 'PASSED' : 'FAILED',
        confidence_percent: qaReport.aiVerification.overall.confidence,
        critical_errors: qaReport.aiVerification.console.summary.criticalErrorCount,
        visual_issues: qaReport.aiVerification.screenshots.summary.issueCount
      },
      
      artifacts: {
        screenshots_captured: qaReport.artifacts.screenshots.length,
        log_files_generated: qaReport.artifacts.logs.length,
        qa_report_path: 'QAArtifacts/qa-report.json'
      }
    };

    // Save summary for external consumption
    const summaryPath = path.join(process.cwd(), 'QAArtifacts/qa-execution-summary.json');
    await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));
    
    // Console output
    console.log('\n' + '='.repeat(80));
    console.log('🎯 QA FRAMEWORK PIPELINE COMPLETE');
    console.log('='.repeat(80));
    console.log(`Status: ${success ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Execution Time: ${Math.round(executionTime / 1000)}s`);
    console.log(`Environment: ${this.options.environment}`);
    console.log(`Tests: ${qaReport.summary.passedTests}/${qaReport.summary.totalTests} passed (${qaReport.summary.passRate}%)`);
    console.log(`AI Verification: ${qaReport.aiVerification.overall.passed ? 'PASSED' : 'FAILED'} (${qaReport.aiVerification.overall.confidence}% confidence)`);
    console.log(`Artifacts: ${qaReport.artifacts.screenshots.length} screenshots, ${qaReport.artifacts.logs.length} logs`);
    
    if (this.options.enableMemoryPlugin) {
      console.log(`Memory Integration: ✅ Enabled`);
    }
    
    if (this.options.enableGovernance) {
      console.log(`Governance Logging: ✅ Enabled`);
    }
    
    console.log(`\n📋 Summary saved: ${summaryPath}`);
    
    return summary;
  }

  async handleFailure(error) {
    const failureReport = {
      timestamp: new Date().toISOString(),
      status: 'FAILED',
      error: error.message,
      stack: error.stack,
      environment: this.options.environment,
      executionTime: Date.now() - this.startTime
    };
    
    try {
      const failurePath = path.join(process.cwd(), 'QAArtifacts/qa-failure-report.json');
      await fs.writeFile(failurePath, JSON.stringify(failureReport, null, 2));
      console.log(`💥 Failure report saved: ${failurePath}`);
    } catch (writeError) {
      console.error('Failed to write failure report:', writeError);
    }
    
    // Log to governance if enabled
    if (this.options.enableGovernance) {
      const governanceEntry = {
        timestamp: new Date().toISOString(),
        event_type: 'qa_framework_failure',
        user_id: 'system',
        user_role: 'qa-automation',
        resource_type: 'admin_ui',
        resource_id: 'WT-ADMIN-UI-QA-FRAMEWORK-1.0',
        action: 'automated_qa_verification',
        success: false,
        details: {
          error: error.message,
          environment: this.options.environment,
          executionTime: Date.now() - this.startTime
        }
      };
      
      try {
        const governanceLogPath = path.join(process.cwd(), 'logs/governance.jsonl');
        await fs.appendFile(governanceLogPath, JSON.stringify(governanceEntry) + '\n');
      } catch (govError) {
        console.error('Failed to write governance failure entry:', govError);
      }
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const options = {};
  
  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--environment':
      case '-e':
        options.environment = args[++i];
        break;
      case '--config':
      case '-c':
        options.configPath = args[++i];
        break;
      case '--no-memory':
        options.enableMemoryPlugin = false;
        break;
      case '--no-governance':
        options.enableGovernance = false;
        break;
      case '--help':
      case '-h':
        console.log(`
QA Framework Runner

Usage: node run-qa-framework.js [options]

Options:
  -e, --environment <env>    Environment to test (default: development)
  -c, --config <path>        Path to configuration file
  --no-memory               Disable Memory Plugin integration
  --no-governance           Disable Governance logging
  -h, --help                Show this help message

Examples:
  node run-qa-framework.js
  node run-qa-framework.js --environment staging
  node run-qa-framework.js --config custom-qa-config.json
  node run-qa-framework.js --no-memory --no-governance
        `);
        process.exit(0);
    }
  }
  
  const runner = new QAFrameworkRunner(options);
  const success = await runner.run();
  
  console.log(success ? '\n🎉 QA FRAMEWORK PIPELINE COMPLETED SUCCESSFULLY' : '\n🚨 QA FRAMEWORK PIPELINE FAILED');
  process.exit(success ? 0 : 1);
}

// Run if called directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  main().catch(error => {
    console.error('💥 Fatal error in QA Framework Runner:', error);
    process.exit(1);
  });
}

export { QAFrameworkRunner };
export default QAFrameworkRunner;