const fs = require('fs').promises;
const path = require('path');

class AIScreenshotVerifier {
  constructor() {
    this.verificationResults = {
      timestamp: new Date().toISOString(),
      totalScreenshots: 0,
      verifiedScreenshots: 0,
      detectedIssues: [],
      recommendations: []
    };
  }

  /**
   * Analyze screenshot for common UI issues
   * @param {string} screenshotPath - Path to screenshot file
   * @param {Object} routeInfo - Information about the route being tested
   * @returns {Object} Analysis results
   */
  async analyzeScreenshot(screenshotPath, routeInfo) {
    console.log(`🤖 AI Analysis: ${routeInfo.name} (${path.basename(screenshotPath)})`);
    
    const analysis = {
      routeId: routeInfo.id,
      screenshotPath,
      timestamp: new Date().toISOString(),
      issues: [],
      confidence: 0,
      recommendations: [],
      status: 'unknown'
    };

    try {
      // Check if screenshot file exists and has reasonable size
      const stats = await fs.stat(screenshotPath);
      const fileSizeKB = Math.round(stats.size / 1024);
      
      console.log(`📊 Screenshot size: ${fileSizeKB}KB`);
      
      // Basic file size analysis
      if (stats.size < 1000) {
        analysis.issues.push({
          type: 'file-size-too-small',
          severity: 'high',
          message: 'Screenshot file size suspiciously small, likely blank or corrupted',
          recommendation: 'Investigate why screenshot capture failed or page is blank'
        });
        analysis.status = 'failed';
        analysis.confidence = 0.9;
      } else if (stats.size < 5000) {
        analysis.issues.push({
          type: 'minimal-content',
          severity: 'medium', 
          message: 'Screenshot file size suggests minimal page content',
          recommendation: 'Verify page loaded correctly and contains expected content'
        });
        analysis.status = 'warning';
        analysis.confidence = 0.7;
      } else if (stats.size > 2000000) {
        analysis.issues.push({
          type: 'large-file-size',
          severity: 'low',
          message: 'Screenshot file size unusually large, may indicate rendering issues',
          recommendation: 'Check for repeated elements or layout problems'
        });
        analysis.status = 'warning';
        analysis.confidence = 0.6;
      }

      // Route-specific content analysis
      await this.performRouteSpecificAnalysis(analysis, routeInfo);
      
      // If no issues found and reasonable file size, mark as passed
      if (analysis.issues.length === 0 && stats.size >= 5000) {
        analysis.status = 'passed';
        analysis.confidence = 0.8;
      }

      this.verificationResults.totalScreenshots++;
      if (analysis.status === 'passed') {
        this.verificationResults.verifiedScreenshots++;
      }

      if (analysis.issues.length > 0) {
        this.verificationResults.detectedIssues.push(...analysis.issues);
      }

      console.log(`🔍 Analysis result: ${analysis.status.toUpperCase()} (confidence: ${analysis.confidence})`);
      if (analysis.issues.length > 0) {
        console.log(`⚠️ Issues found: ${analysis.issues.length}`);
        analysis.issues.forEach(issue => {
          console.log(`   - ${issue.type}: ${issue.message}`);
        });
      }

    } catch (error) {
      console.error(`❌ AI Analysis failed: ${error.message}`);
      analysis.issues.push({
        type: 'analysis-error',
        severity: 'high',
        message: `Failed to analyze screenshot: ${error.message}`,
        recommendation: 'Check screenshot file exists and is accessible'
      });
      analysis.status = 'error';
      analysis.confidence = 0;
    }

    return analysis;
  }

  /**
   * Perform route-specific analysis based on expected content
   */
  async performRouteSpecificAnalysis(analysis, routeInfo) {
    const routeExpectations = {
      'admin-root': {
        expectedElements: ['Admin', 'Dashboard', 'Overview'],
        minExpectedSize: 20000,
        description: 'Should show admin dashboard with navigation and content panels'
      },
      'admin-data-explorer': {
        expectedElements: ['Data Explorer', 'Table', 'Records'],
        minExpectedSize: 30000,
        description: 'Should show data tables and browser interface'
      },
      'admin-runtime-panel': {
        expectedElements: ['Runtime', 'Status', 'Health', 'System'],
        minExpectedSize: 25000,
        description: 'Should show system status and monitoring information'
      },
      'admin-import-export': {
        expectedElements: ['Import', 'Export', 'CSV', 'JSON'],
        minExpectedSize: 20000,
        description: 'Should show file upload/download interface'
      },
      'admin-orphan-inspector': {
        expectedElements: ['Orphan', 'Inspector', 'Records'],
        minExpectedSize: 25000,
        description: 'Should show orphaned records detection interface'
      },
      'admin-secrets-manager': {
        expectedElements: ['Secrets', 'Credentials', 'MCP'],
        minExpectedSize: 20000,
        description: 'Should show credential management interface'
      }
    };

    const expectations = routeExpectations[routeInfo.id];
    if (!expectations) return;

    // Check file size against route expectations
    const stats = await fs.stat(analysis.screenshotPath);
    if (stats.size < expectations.minExpectedSize) {
      analysis.issues.push({
        type: 'route-content-insufficient',
        severity: 'medium',
        message: `Screenshot size below expected for ${routeInfo.name}`,
        recommendation: `Expected content: ${expectations.description}`
      });
    }

    // Add route-specific recommendations
    analysis.recommendations.push({
      type: 'content-verification',
      message: `Verify screenshot contains: ${expectations.expectedElements.join(', ')}`,
      description: expectations.description
    });
  }

  /**
   * Generate comprehensive verification report
   */
  async generateVerificationReport(outputPath = 'qa-artifacts/ai-verification-report.json') {
    console.log('🤖 Generating AI Verification Report...');
    
    // Calculate summary statistics
    const passRate = this.verificationResults.totalScreenshots > 0 ? 
      (this.verificationResults.verifiedScreenshots / this.verificationResults.totalScreenshots * 100).toFixed(1) : 0;

    const summary = {
      ...this.verificationResults,
      passRate: `${passRate}%`,
      summary: {
        totalIssues: this.verificationResults.detectedIssues.length,
        highSeverityIssues: this.verificationResults.detectedIssues.filter(i => i.severity === 'high').length,
        mediumSeverityIssues: this.verificationResults.detectedIssues.filter(i => i.severity === 'medium').length,
        lowSeverityIssues: this.verificationResults.detectedIssues.filter(i => i.severity === 'low').length
      }
    };

    // Generate recommendations
    if (summary.summary.highSeverityIssues > 0) {
      this.verificationResults.recommendations.push({
        priority: 'high',
        message: 'Critical UI issues detected requiring immediate attention',
        action: 'Review high severity issues and fix before QA sign-off'
      });
    }

    if (summary.summary.mediumSeverityIssues > 0) {
      this.verificationResults.recommendations.push({
        priority: 'medium', 
        message: 'Medium severity UI issues detected',
        action: 'Review and address before production deployment'
      });
    }

    if (parseFloat(passRate) < 80) {
      this.verificationResults.recommendations.push({
        priority: 'high',
        message: `Screenshot verification pass rate (${passRate}%) below acceptable threshold`,
        action: 'Investigate failed routes and improve UI stability'
      });
    }

    try {
      await fs.writeFile(outputPath, JSON.stringify(summary, null, 2));
      console.log(`✅ AI Verification Report saved: ${outputPath}`);
      console.log(`📊 Pass Rate: ${passRate}% (${this.verificationResults.verifiedScreenshots}/${this.verificationResults.totalScreenshots})`);
      console.log(`⚠️ Issues Detected: ${summary.summary.totalIssues} (${summary.summary.highSeverityIssues} high, ${summary.summary.mediumSeverityIssues} medium)`);
      
      return summary;
    } catch (error) {
      console.error(`❌ Failed to save verification report: ${error.message}`);
      throw error;
    }
  }

  /**
   * Batch analyze all screenshots in directory
   */
  async analyzeAllScreenshots(screenshotDir, routeMapping) {
    console.log(`🤖 Starting batch AI screenshot analysis...`);
    const analyses = [];

    try {
      const files = await fs.readdir(screenshotDir);
      const screenshotFiles = files.filter(file => file.endsWith('.png'));

      console.log(`📸 Found ${screenshotFiles.length} screenshots to analyze`);

      for (const filename of screenshotFiles) {
        const screenshotPath = path.join(screenshotDir, filename);
        
        // Extract route ID from filename
        const routeId = filename.split('-')[0] + '-' + filename.split('-')[1]; // e.g., "admin-root" from "admin-root-full.png"
        const routeInfo = routeMapping[routeId];

        if (routeInfo) {
          const analysis = await this.analyzeScreenshot(screenshotPath, routeInfo);
          analyses.push(analysis);
        } else {
          console.log(`⚠️ No route mapping found for: ${filename}`);
        }
      }

      return analyses;
    } catch (error) {
      console.error(`❌ Batch analysis failed: ${error.message}`);
      return [];
    }
  }
}

/**
 * Standalone function to run AI verification on existing screenshots
 */
async function runAIVerification() {
  const verifier = new AIScreenshotVerifier();
  
  // Route mapping for AI analysis
  const routeMapping = {
    'admin-root': { id: 'admin-root', name: 'Admin Dashboard Root', path: '/admin' },
    'admin-data': { id: 'admin-data-explorer', name: 'Data Explorer', path: '/admin/data' },
    'admin-runtime': { id: 'admin-runtime-panel', name: 'Runtime Status Panel', path: '/admin/runtime' },
    'admin-import': { id: 'admin-import-export', name: 'Import/Export Panel', path: '/admin/import-export' },
    'admin-orphan': { id: 'admin-orphan-inspector', name: 'Orphan Inspector', path: '/admin/orphan-inspector' },
    'admin-secrets': { id: 'admin-secrets-manager', name: 'Secrets Manager', path: '/admin/secrets' }
  };

  try {
    console.log('🚀 Starting AI Screenshot Verification...');
    
    const analyses = await verifier.analyzeAllScreenshots('screenshots/admin-ui', routeMapping);
    const report = await verifier.generateVerificationReport();
    
    console.log('✅ AI Screenshot Verification Complete!');
    return { analyses, report };
  } catch (error) {
    console.error('❌ AI Verification failed:', error.message);
    throw error;
  }
}

module.exports = { AIScreenshotVerifier, runAIVerification };