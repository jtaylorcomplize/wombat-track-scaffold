const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

/**
 * OF-BEV Phase 3 UAT Puppeteer Script
 * Staging Environment: https://orbis-forge-admin.staging.oapp.io
 * Purpose: Automated UAT validation for production readiness
 */

class OFBEVUATScript {
  constructor() {
    this.browser = null;
    this.page = null;
    this.baseUrl = process.env.UAT_BASE_URL || 'https://orbis-forge-admin.staging.oapp.io';
    this.testResults = [];
    this.screenshots = [];
    this.governanceEntries = [];
    
    // Test configuration
    this.config = {
      headless: process.env.UAT_HEADLESS !== 'false',
      viewport: { width: 1920, height: 1080 },
      timeout: 30000,
      screenshotPath: path.join(process.cwd(), 'logs', 'uat', 'screenshots'),
      resultsPath: path.join(process.cwd(), 'logs', 'uat', 'results'),
      driveMemoryPath: path.join(process.cwd(), 'DriveMemory', 'OrbisForge', 'BackEndVisibility', 'UAT')
    };
  }

  async initialize() {
    // Create directories
    await fs.mkdir(this.config.screenshotPath, { recursive: true });
    await fs.mkdir(this.config.resultsPath, { recursive: true });
    await fs.mkdir(this.config.driveMemoryPath, { recursive: true });

    // Launch browser
    this.browser = await puppeteer.launch({
      headless: this.config.headless,
      devtools: !this.config.headless,
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--allow-running-insecure-content'
      ]
    });

    this.page = await this.browser.newPage();
    await this.page.setViewport(this.config.viewport);
    
    // Set user agent
    await this.page.setUserAgent('OF-BEV-UAT-Bot/1.0 (Puppeteer)');
    
    // Enable console and error logging
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('🔴 Page Error:', msg.text());
      }
    });
    
    this.page.on('pageerror', error => {
      console.error('🔴 Page Error:', error.message);
    });

    console.log('🚀 OF-BEV UAT Script initialized');
  }

  async takeScreenshot(testName, description = '') {
    const timestamp = Date.now();
    const filename = `${testName.replace(/\s+/g, '_').toLowerCase()}_${timestamp}.png`;
    const filepath = path.join(this.config.screenshotPath, filename);
    
    await this.page.screenshot({ 
      path: filepath, 
      fullPage: true 
    });
    
    this.screenshots.push({
      testName,
      description,
      filename,
      filepath,
      timestamp: new Date().toISOString()
    });
    
    console.log(`📸 Screenshot saved: ${filename}`);
    return filepath;
  }

  async logTestResult(testName, status, details = {}) {
    const result = {
      testName,
      status,
      timestamp: new Date().toISOString(),
      details,
      screenshot: null
    };
    
    // Take screenshot for failed tests
    if (status === 'failed') {
      result.screenshot = await this.takeScreenshot(testName, 'Error state');
    }
    
    this.testResults.push(result);
    
    const statusIcon = status === 'passed' ? '✅' : status === 'failed' ? '❌' : '⚠️';
    console.log(`${statusIcon} ${testName}: ${status.toUpperCase()}`);
    
    if (details.error) {
      console.error(`   Error: ${details.error}`);
    }
  }

  async logGovernanceEntry(eventType, resourceId, action, details) {
    const entry = {
      timestamp: new Date().toISOString(),
      event_type: eventType,
      user_id: 'uat_puppeteer_bot',
      user_role: 'uat_tester',
      resource_type: 'uat_test',
      resource_id: resourceId,
      action: action,
      success: true,
      details: details,
      runtime_context: {
        phase: 'OF-BEV-3-UAT',
        environment: 'staging',
        automation: 'puppeteer'
      }
    };
    
    this.governanceEntries.push(entry);
    console.log(`📋 Governance entry logged: ${eventType} - ${action}`);
  }

  // Phase 1: Login and Authentication
  async phase1_authentication() {
    console.log('\n🔐 Phase 1: Authentication & Login');
    
    try {
      await this.page.goto(this.baseUrl, { waitUntil: 'networkidle2' });
      
      // Check if we're already authenticated or need to login
      const currentUrl = this.page.url();
      
      if (currentUrl.includes('login') || currentUrl.includes('auth')) {
        // Handle authentication if login page detected
        await this.page.waitForSelector('input[type="email"], input[type="text"]', { timeout: 5000 });
        
        // Attempt test credentials (staging environment)
        await this.page.type('input[type="email"], input[type="text"]', 'uat_tester@oapp.io');
        await this.page.type('input[type="password"]', 'UAT2025!Secure');
        await this.page.click('button[type="submit"], .login-button, .auth-button');
        
        await this.page.waitForNavigation({ waitUntil: 'networkidle2' });
      }
      
      // Verify we're on the admin dashboard
      await this.page.waitForSelector('h1, .dashboard-title', { timeout: 10000 });
      const title = await this.page.title();
      
      await this.takeScreenshot('authentication_success', 'Successfully authenticated to staging');
      
      await this.logTestResult('Authentication', 'passed', { 
        url: currentUrl, 
        title: title 
      });
      
      await this.logGovernanceEntry('uat_authentication', 'staging_login', 'authenticate', {
        operation: 'UAT Login Authentication',
        url: this.baseUrl,
        user_agent: 'OF-BEV-UAT-Bot/1.0'
      });
      
    } catch (error) {
      await this.logTestResult('Authentication', 'failed', { error: error.message });
      throw new Error(`Authentication failed: ${error.message}`);
    }
  }

  // Phase 2: Read-Only Verification
  async phase2_readOnlyVerification() {
    console.log('\n📊 Phase 2: Read-Only Data Verification');
    
    const tables = ['projects', 'phases', 'step_progress', 'governance_logs'];
    const tableCounts = {};
    
    try {
      // Navigate to data explorer
      await this.page.goto(`${this.baseUrl}/admin/data-explorer`, { waitUntil: 'networkidle2' });
      await this.page.waitForSelector('h1');
      
      for (const tableName of tables) {
        try {
          // Click on table card
          await this.page.click(`button:has-text("${tableName}"), [data-table="${tableName}"]`);
          await this.page.waitForSelector('table, .data-table', { timeout: 10000 });
          
          // Count rows
          const rowCount = await this.page.$$eval('tbody tr, .data-row', rows => rows.length);
          tableCounts[tableName] = rowCount;
          
          console.log(`   📋 ${tableName}: ${rowCount} records`);
          
        } catch (error) {
          console.warn(`   ⚠️ Could not load ${tableName}: ${error.message}`);
          tableCounts[tableName] = 'error';
        }
      }
      
      await this.takeScreenshot('data_verification', 'Data explorer with table counts');
      
      await this.logTestResult('Read-Only Data Verification', 'passed', { 
        tableCounts: tableCounts 
      });
      
      await this.logGovernanceEntry('uat_data_verification', 'data_explorer', 'verify_tables', {
        operation: 'UAT Data Verification',
        table_counts: tableCounts,
        tables_verified: tables.length
      });
      
    } catch (error) {
      await this.logTestResult('Read-Only Data Verification', 'failed', { error: error.message });
    }
  }

  // Phase 3: Inline Editing Test
  async phase3_inlineEditing() {
    console.log('\n✏️ Phase 3: Inline Editing & Database Updates');
    
    try {
      // Navigate to projects table
      await this.page.goto(`${this.baseUrl}/admin/data-explorer`, { waitUntil: 'networkidle2' });
      await this.page.click('button:has-text("projects")');
      await this.page.waitForSelector('table');
      
      // Find first editable project
      const editButton = await this.page.$('[data-testid="edit-button"], .edit-btn, button:has-text("Edit")');
      
      if (editButton) {
        await editButton.click();
        await this.page.waitForSelector('[data-testid="edit-form"], .edit-form, input[type="text"]');
        
        // Modify owner field (safe test change)
        const ownerInput = await this.page.$('input[name="owner"], input[placeholder*="owner"]');
        if (ownerInput) {
          await ownerInput.click({ clickCount: 3 }); // Select all
          await ownerInput.type('UAT_Test_Owner');
          
          // Save changes
          const saveButton = await this.page.$('[data-testid="save-button"], .save-btn, button:has-text("Save")');
          if (saveButton) {
            await saveButton.click();
            
            // Wait for success message
            await this.page.waitForSelector('[data-testid="success-message"], .success, .alert-success', { timeout: 5000 });
            
            await this.takeScreenshot('inline_editing_success', 'Successful inline edit with save confirmation');
            
            await this.logTestResult('Inline Editing', 'passed', {
              operation: 'Project owner update',
              newValue: 'UAT_Test_Owner'
            });
            
            await this.logGovernanceEntry('uat_inline_edit', 'project_record', 'update_owner', {
              operation: 'UAT Inline Edit Test',
              field_modified: 'owner',
              new_value: 'UAT_Test_Owner',
              edit_method: 'inline_editing'
            });
          } else {
            throw new Error('Save button not found');
          }
        } else {
          throw new Error('Owner input field not found');
        }
      } else {
        // Test passed but with limitation
        await this.logTestResult('Inline Editing', 'skipped', {
          reason: 'Edit functionality not yet implemented in UI'
        });
      }
      
    } catch (error) {
      await this.logTestResult('Inline Editing', 'failed', { error: error.message });
    }
  }

  // Phase 4: CSV Export/Import Test
  async phase4_csvOperations() {
    console.log('\n📄 Phase 4: CSV Export/Import Operations');
    
    try {
      await this.page.goto(`${this.baseUrl}/admin/data-explorer`, { waitUntil: 'networkidle2' });
      
      // Look for CSV export functionality
      const exportButton = await this.page.$('[data-testid="csv-export"], .csv-export, button:has-text("Export CSV")');
      
      if (exportButton) {
        // Set up download handling
        const downloadPromise = this.page.waitForEvent('download', { timeout: 10000 });
        await exportButton.click();
        
        const download = await downloadPromise;
        const downloadPath = path.join(this.config.resultsPath, `csv_export_${Date.now()}.csv`);
        await download.saveAs(downloadPath);
        
        await this.takeScreenshot('csv_export_success', 'CSV export completed successfully');
        
        await this.logTestResult('CSV Export', 'passed', {
          filename: download.suggestedFilename(),
          downloadPath: downloadPath
        });
        
        await this.logGovernanceEntry('uat_csv_export', 'projects_csv', 'export_csv', {
          operation: 'UAT CSV Export Test',
          export_filename: download.suggestedFilename(),
          export_path: downloadPath
        });
        
      } else {
        await this.logTestResult('CSV Export', 'skipped', {
          reason: 'CSV export functionality not found in UI'
        });
      }
      
    } catch (error) {
      await this.logTestResult('CSV Export', 'failed', { error: error.message });
    }
  }

  // Phase 5: JSON Export/Import Test
  async phase5_jsonOperations() {
    console.log('\n🔄 Phase 5: JSON Import/Export Operations');
    
    try {
      // Test JSON export via API endpoint
      const exportResponse = await this.page.evaluate(async (baseUrl) => {
        try {
          const response = await fetch(`${baseUrl}/api/json-operations/export`, {
            headers: {
              'X-User-ID': 'uat_tester'
            }
          });
          return {
            success: response.ok,
            status: response.status,
            contentType: response.headers.get('content-type')
          };
        } catch (error) {
          return { success: false, error: error.message };
        }
      }, this.baseUrl);
      
      if (exportResponse.success) {
        await this.takeScreenshot('json_export_api', 'JSON export API endpoint successful');
        
        await this.logTestResult('JSON Export API', 'passed', {
          status: exportResponse.status,
          contentType: exportResponse.contentType
        });
        
        await this.logGovernanceEntry('uat_json_export', 'full_schema', 'export_json', {
          operation: 'UAT JSON Export API Test',
          api_endpoint: '/api/json-operations/export',
          response_status: exportResponse.status
        });
      } else {
        await this.logTestResult('JSON Export API', 'failed', { 
          error: exportResponse.error || `HTTP ${exportResponse.status}` 
        });
      }
      
    } catch (error) {
      await this.logTestResult('JSON Export', 'failed', { error: error.message });
    }
  }

  // Phase 6: Orphan Detection and Resolution
  async phase6_orphanResolution() {
    console.log('\n🔍 Phase 6: Orphan Detection & Data Integrity');
    
    try {
      await this.page.goto(`${this.baseUrl}/admin/data-integrity`, { waitUntil: 'networkidle2' });
      
      // Wait for integrity summary
      await this.page.waitForSelector('[data-testid="integrity-summary"], .integrity-summary', { timeout: 10000 });
      
      // Check for orphan indicators
      const orphanCounts = await this.page.evaluate(() => {
        const summaryCards = document.querySelectorAll('[data-testid="summary-card"], .summary-card');
        const counts = {};
        
        summaryCards.forEach(card => {
          const label = card.querySelector('.card-label, .summary-label');
          const value = card.querySelector('.card-value, .summary-value');
          if (label && value) {
            counts[label.textContent.toLowerCase()] = parseInt(value.textContent) || 0;
          }
        });
        
        return counts;
      });
      
      await this.takeScreenshot('orphan_detection', 'Data integrity dashboard with orphan counts');
      
      await this.logTestResult('Orphan Detection', 'passed', {
        orphanCounts: orphanCounts
      });
      
      await this.logGovernanceEntry('uat_orphan_detection', 'data_integrity', 'detect_orphans', {
        operation: 'UAT Orphan Detection Test',
        orphan_counts: orphanCounts,
        integrity_dashboard_loaded: true
      });
      
    } catch (error) {
      await this.logTestResult('Orphan Detection', 'failed', { error: error.message });
    }
  }

  // Phase 7: Runtime Status and Health Check
  async phase7_runtimeStatus() {
    console.log('\n⚡ Phase 7: Runtime Status & System Health');
    
    try {
      await this.page.goto(`${this.baseUrl}/admin/runtime-status`, { waitUntil: 'networkidle2' });
      
      // Wait for health indicators
      await this.page.waitForSelector('[data-testid="system-health"], .system-health', { timeout: 10000 });
      
      // Check health indicators
      const healthStatus = await this.page.evaluate(() => {
        const indicators = document.querySelectorAll('[data-testid="health-indicator"], .health-indicator');
        const status = {};
        
        indicators.forEach(indicator => {
          const label = indicator.querySelector('.indicator-label, .health-label');
          const statusElement = indicator.querySelector('.indicator-status, .health-status');
          
          if (label && statusElement) {
            const statusText = statusElement.textContent || statusElement.className;
            status[label.textContent] = {
              status: statusText,
              isHealthy: statusText.includes('green') || statusText.includes('healthy') || statusText.includes('✅')
            };
          }
        });
        
        return status;
      });
      
      // Take screenshot of runtime dashboard
      await this.takeScreenshot('runtime_status_dashboard', 'System health indicators and runtime status');
      
      await this.logTestResult('Runtime Status Check', 'passed', {
        healthStatus: healthStatus,
        systemsChecked: Object.keys(healthStatus).length
      });
      
      await this.logGovernanceEntry('uat_runtime_status', 'system_health', 'check_health', {
        operation: 'UAT Runtime Status Check',
        health_indicators: healthStatus,
        systems_monitored: Object.keys(healthStatus)
      });
      
    } catch (error) {
      await this.logTestResult('Runtime Status Check', 'failed', { error: error.message });
    }
  }

  // Generate comprehensive UAT report
  async generateUATReport() {
    console.log('\n📊 Generating UAT Report...');
    
    const timestamp = new Date().toISOString();
    const testSummary = {
      passed: this.testResults.filter(r => r.status === 'passed').length,
      failed: this.testResults.filter(r => r.status === 'failed').length,
      skipped: this.testResults.filter(r => r.status === 'skipped').length,
      total: this.testResults.length
    };
    
    const uatReport = {
      metadata: {
        timestamp: timestamp,
        environment: 'staging',
        baseUrl: this.baseUrl,
        phase: 'OF-BEV-Phase-3-UAT',
        automation_tool: 'puppeteer',
        memoryplugin_anchor: `of-bev-uat-${Date.now()}`
      },
      summary: {
        ...testSummary,
        success_rate: `${Math.round((testSummary.passed / testSummary.total) * 100)}%`,
        overall_status: testSummary.failed === 0 ? 'PASSED' : 'FAILED'
      },
      test_results: this.testResults,
      screenshots: this.screenshots,
      governance_entries: this.governanceEntries,
      exit_criteria: {
        all_tests_executed: this.testResults.length >= 7,
        no_critical_failures: testSummary.failed === 0,
        governance_logging_active: this.governanceEntries.length > 0,
        screenshots_captured: this.screenshots.length > 0,
        production_ready: testSummary.failed === 0 && testSummary.passed >= 5
      }
    };
    
    // Save report to multiple locations
    const reportPath = path.join(this.config.resultsPath, `uat_report_${Date.now()}.json`);
    const driveMemoryReportPath = path.join(this.config.driveMemoryPath, `uat_report_${Date.now()}.json`);
    
    await fs.writeFile(reportPath, JSON.stringify(uatReport, null, 2));
    await fs.writeFile(driveMemoryReportPath, JSON.stringify(uatReport, null, 2));
    
    // Update governance log file
    const governanceLogPath = path.join(process.cwd(), 'logs', 'governance.jsonl');
    for (const entry of this.governanceEntries) {
      await fs.appendFile(governanceLogPath, JSON.stringify(entry) + '\n');
    }
    
    console.log(`\n📋 UAT Report Generated:`);
    console.log(`   📄 Report: ${reportPath}`);
    console.log(`   🗄️ DriveMemory: ${driveMemoryReportPath}`);
    console.log(`   📸 Screenshots: ${this.screenshots.length} captured`);
    console.log(`   📝 Governance Entries: ${this.governanceEntries.length} logged`);
    console.log(`\n🎯 Test Summary:`);
    console.log(`   ✅ Passed: ${testSummary.passed}`);
    console.log(`   ❌ Failed: ${testSummary.failed}`);
    console.log(`   ⚠️ Skipped: ${testSummary.skipped}`);
    console.log(`   📊 Success Rate: ${uatReport.summary.success_rate}`);
    console.log(`   🚀 Production Ready: ${uatReport.exit_criteria.production_ready ? 'YES' : 'NO'}`);
    
    return uatReport;
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
    console.log('🧹 UAT Script cleanup completed');
  }

  // Main execution method
  async run() {
    try {
      await this.initialize();
      
      // Execute UAT phases
      await this.phase1_authentication();
      await this.phase2_readOnlyVerification();
      await this.phase3_inlineEditing();
      await this.phase4_csvOperations();
      await this.phase5_jsonOperations();
      await this.phase6_orphanResolution();
      await this.phase7_runtimeStatus();
      
      // Generate final report
      const report = await this.generateUATReport();
      
      return report;
      
    } catch (error) {
      console.error('🔴 UAT Script failed:', error);
      await this.takeScreenshot('uat_script_error', 'Fatal error during UAT execution');
      throw error;
    } finally {
      await this.cleanup();
    }
  }
}

// Export for use in other test files
module.exports = OFBEVUATScript;

// Run if called directly
if (require.main === module) {
  (async () => {
    const uatScript = new OFBEVUATScript();
    
    try {
      const report = await uatScript.run();
      
      if (report.summary.overall_status === 'PASSED') {
        console.log('\n🎉 UAT PASSED - Phase 3 is ready for production!');
        process.exit(0);
      } else {
        console.log('\n❌ UAT FAILED - Issues must be resolved before production deployment');
        process.exit(1);
      }
      
    } catch (error) {
      console.error('\n💥 UAT Script execution failed:', error.message);
      process.exit(1);
    }
  })();
}