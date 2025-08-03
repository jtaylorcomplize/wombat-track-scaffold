const fs = require('fs').promises;
const path = require('path');

class SubAppAIVerifier {
  constructor() {
    this.verificationResults = {
      timestamp: new Date().toISOString(),
      phase: 'Phase 5 - Sub-App QA',
      totalScreenshots: 0,
      verifiedScreenshots: 0,
      detectedIssues: [],
      recommendations: [],
      subAppAnalysis: {}
    };
  }

  /**
   * Analyze Sub-App screenshot for specific issues
   * @param {string} screenshotPath - Path to screenshot file
   * @param {Object} routeInfo - Information about the Sub-App route
   * @returns {Object} Analysis results
   */
  async analyzeSubAppScreenshot(screenshotPath, routeInfo) {
    console.log(`🤖 AI Analysis: ${routeInfo.subAppName} - ${routeInfo.name}`);
    
    const analysis = {
      routeId: routeInfo.id,
      subAppId: routeInfo.subAppId,
      subAppName: routeInfo.subAppName,
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
      
      // Sub-App specific file size analysis
      const expectedSizes = this.getExpectedSizesForSubApp(routeInfo.subAppId);
      
      if (stats.size < 2000) {
        analysis.issues.push({
          type: 'blank-subapp-dashboard',
          severity: 'high',
          message: 'Sub-App dashboard appears blank or failed to load',
          recommendation: 'Check Sub-App routing and component mounting'
        });
        analysis.status = 'failed';
        analysis.confidence = 0.9;
      } else if (stats.size < expectedSizes.minimum) {
        analysis.issues.push({
          type: 'minimal-subapp-content',
          severity: 'medium',
          message: `Sub-App content below expected threshold for ${routeInfo.subAppName}`,
          recommendation: 'Verify Sub-App components loaded correctly and data is populated'
        });
        analysis.status = 'warning';
        analysis.confidence = 0.7;
      } else if (stats.size > expectedSizes.maximum) {
        analysis.issues.push({
          type: 'excessive-content-size',
          severity: 'low',
          message: 'Sub-App screenshot unusually large, may indicate rendering issues',
          recommendation: 'Check for repeated elements or infinite scroll issues'
        });
        analysis.status = 'warning';
        analysis.confidence = 0.6;
      }

      // Sub-App specific content analysis
      await this.performSubAppSpecificAnalysis(analysis, routeInfo);
      
      // If no issues found and reasonable file size, mark as passed
      if (analysis.issues.length === 0 && stats.size >= expectedSizes.minimum) {
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

      // Track Sub-App specific analysis
      if (!this.verificationResults.subAppAnalysis[routeInfo.subAppId]) {
        this.verificationResults.subAppAnalysis[routeInfo.subAppId] = {
          name: routeInfo.subAppName,
          screenshots: 0,
          issues: 0,
          passed: 0
        };
      }
      
      this.verificationResults.subAppAnalysis[routeInfo.subAppId].screenshots++;
      this.verificationResults.subAppAnalysis[routeInfo.subAppId].issues += analysis.issues.length;
      if (analysis.status === 'passed') {
        this.verificationResults.subAppAnalysis[routeInfo.subAppId].passed++;
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
        message: `Failed to analyze Sub-App screenshot: ${error.message}`,
        recommendation: 'Check screenshot file exists and is accessible'
      });
      analysis.status = 'error';
      analysis.confidence = 0;
    }

    return analysis;
  }

  /**
   * Get expected file sizes for different Sub-Apps
   */
  getExpectedSizesForSubApp(subAppId) {
    const sizeExpectations = {
      'visacalc': {
        minimum: 15000,
        maximum: 500000,
        description: 'VisaCalc should have calculator interface and data forms'
      },
      'spqr': {
        minimum: 25000,  
        maximum: 800000,
        description: 'SPQR should have rich dashboard with charts and reports'
      },
      'bkgm': {
        minimum: 20000,
        maximum: 600000,
        description: 'BKGM should have compliance interface and data tables'
      }
    };

    return sizeExpectations[subAppId] || { minimum: 10000, maximum: 500000 };
  }

  /**
   * Perform Sub-App specific analysis
   */
  async performSubAppSpecificAnalysis(analysis, routeInfo) {
    const subAppExpectations = {
      'visacalc': {
        expectedFeatures: ['Calculator interface', 'Form inputs', 'Visa processing'],
        commonIssues: ['Form validation errors', 'API connection failures', 'Calculation logic issues'],
        description: 'Should show visa calculation forms and processing interface'
      },
      'spqr': {
        expectedFeatures: ['Dashboard charts', 'Report tables', 'Analytics widgets'], 
        commonIssues: ['Chart rendering failures', 'Data loading errors', 'Looker embed issues'],
        description: 'Should show rich analytics dashboard with embedded reports'
      },
      'bkgm': {
        expectedFeatures: ['Compliance checklists', 'Audit trails', 'Status indicators'],
        commonIssues: ['Permission errors', 'Data access failures', 'Compliance validation issues'],
        description: 'Should show background management and compliance interface'
      }
    };

    const expectations = subAppExpectations[routeInfo.subAppId];
    if (!expectations) return;

    // Check file size against Sub-App expectations
    const stats = await fs.stat(analysis.screenshotPath);
    const expectedSizes = this.getExpectedSizesForSubApp(routeInfo.subAppId);
    
    if (stats.size < expectedSizes.minimum) {
      analysis.issues.push({
        type: 'subapp-content-insufficient',
        severity: 'medium',
        message: `${routeInfo.subAppName} content below expected minimum`,
        recommendation: `Expected features: ${expectations.expectedFeatures.join(', ')}`
      });
    }

    // Add Sub-App specific recommendations
    analysis.recommendations.push({
      type: 'subapp-verification',
      message: `Verify ${routeInfo.subAppName} contains: ${expectations.expectedFeatures.join(', ')}`,
      description: expectations.description,
      commonIssues: expectations.commonIssues
    });
  }

  /**
   * Analyze console logs for Sub-App specific issues
   */
  async analyzeConsoleLogsForSubApp(logPath, routeInfo) {
    console.log(`🔍 Analyzing console logs for ${routeInfo.subAppName}...`);
    
    const analysis = {
      routeId: routeInfo.id,
      subAppId: routeInfo.subAppId,
      logPath,
      criticalErrors: [],
      warnings: [],
      recommendations: []
    };

    try {
      const logContent = await fs.readFile(logPath, 'utf8');
      const logLines = logContent.split('\n');

      // Look for critical JavaScript errors
      const criticalPatterns = [
        /TypeError:/i,
        /ReferenceError:/i,
        /Cannot read property/i,
        /Cannot read properties of null/i,
        /Cannot read properties of undefined/i,
        /Failed to fetch/i,
        /Network request failed/i
      ];

      // Look for Sub-App specific errors
      const subAppPatterns = {
        'visacalc': [
          /visa.*error/i,
          /calculation.*failed/i,
          /form.*validation/i
        ],
        'spqr': [
          /looker.*error/i,
          /report.*failed/i,
          /chart.*render/i,
          /analytics.*error/i
        ],
        'bkgm': [
          /compliance.*error/i,
          /audit.*failed/i,
          /background.*check/i
        ]
      };

      logLines.forEach(line => {
        // Check for critical errors
        criticalPatterns.forEach(pattern => {
          if (pattern.test(line)) {
            analysis.criticalErrors.push({
              type: 'critical-js-error',
              message: line.trim(),
              severity: 'high'
            });
          }
        });

        // Check for Sub-App specific errors
        const appPatterns = subAppPatterns[routeInfo.subAppId] || [];
        appPatterns.forEach(pattern => {
          if (pattern.test(line)) {
            analysis.warnings.push({
              type: 'subapp-specific-issue',
              message: line.trim(),
              severity: 'medium'
            });
          }
        });
      });

      // Generate recommendations based on findings
      if (analysis.criticalErrors.length > 0) {
        analysis.recommendations.push({
          priority: 'high',
          message: `${analysis.criticalErrors.length} critical JavaScript errors found in ${routeInfo.subAppName}`,
          action: 'Review and fix JavaScript errors before Sub-App deployment'
        });
      }

      if (analysis.warnings.length > 0) {
        analysis.recommendations.push({
          priority: 'medium',
          message: `${analysis.warnings.length} Sub-App specific issues detected`,
          action: `Review ${routeInfo.subAppName} functionality and data loading`
        });
      }

      console.log(`📊 Console analysis: ${analysis.criticalErrors.length} critical, ${analysis.warnings.length} warnings`);

    } catch (error) {
      console.error(`❌ Console log analysis failed: ${error.message}`);
    }

    return analysis;
  }

  /**
   * Generate comprehensive Sub-App verification report
   */
  async generateSubAppVerificationReport(outputPath = 'qa-artifacts/subapps/ai-verification-subapps.json') {
    console.log('🤖 Generating Sub-App AI Verification Report...');
    
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

    // Generate Sub-App specific recommendations
    for (const [subAppId, subAppData] of Object.entries(this.verificationResults.subAppAnalysis)) {
      const subAppPassRate = subAppData.screenshots > 0 ? 
        (subAppData.passed / subAppData.screenshots * 100).toFixed(1) : 0;

      if (parseFloat(subAppPassRate) < 70) {
        this.verificationResults.recommendations.push({
          priority: 'high',
          subApp: subAppData.name,
          message: `${subAppData.name} pass rate (${subAppPassRate}%) below acceptable threshold`,
          action: `Investigate ${subAppData.name} routing and component issues`
        });
      }

      if (subAppData.issues > 3) {
        this.verificationResults.recommendations.push({
          priority: 'medium',
          subApp: subAppData.name,
          message: `${subAppData.name} has ${subAppData.issues} detected issues`,
          action: `Review ${subAppData.name} implementation and fix identified problems`
        });
      }
    }

    try {
      await fs.writeFile(outputPath, JSON.stringify(summary, null, 2));
      console.log(`✅ Sub-App AI Verification Report saved: ${outputPath}`);
      console.log(`📊 Overall Pass Rate: ${passRate}% (${this.verificationResults.verifiedScreenshots}/${this.verificationResults.totalScreenshots})`);
      console.log(`⚠️ Issues Detected: ${summary.summary.totalIssues} (${summary.summary.highSeverityIssues} high, ${summary.summary.mediumSeverityIssues} medium)`);
      
      // Log Sub-App specific results
      for (const [subAppId, subAppData] of Object.entries(this.verificationResults.subAppAnalysis)) {
        const subAppPassRate = subAppData.screenshots > 0 ? 
          (subAppData.passed / subAppData.screenshots * 100).toFixed(1) : 0;
        console.log(`📱 ${subAppData.name}: ${subAppPassRate}% pass rate (${subAppData.passed}/${subAppData.screenshots})`);
      }
      
      return summary;
    } catch (error) {
      console.error(`❌ Failed to save Sub-App verification report: ${error.message}`);
      throw error;
    }
  }
}

module.exports = { SubAppAIVerifier };