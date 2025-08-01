import fs from 'fs/promises';
import path from 'path';

/**
 * AI-Assisted Screenshot and Console Log Verification Utilities
 * 
 * This module provides utilities for automatically analyzing QA artifacts
 * to detect common issues before human QA sign-off.
 */

export class AIVerificationUtils {
  constructor() {
    this.verificationRules = {
      console: {
        criticalErrors: [
          'TypeError',
          'ReferenceError', 
          'Cannot read properties of null',
          'Cannot read properties of undefined',
          'Maximum update depth exceeded',
          'Warning: Maximum update depth',
          'Uncaught',
          'Failed to fetch',
          'NetworkError'
        ],
        warningPatterns: [
          'Warning:',
          'deprecated',
          'Deprecated',
          'console.warn'
        ]
      },
      ui: {
        errorIndicators: [
          'Admin UI Error',
          'error-banner',
          'Something went wrong',
          'Error loading',
          'Failed to load',
          'Not Found',
          '404',
          '500'
        ],
        blankPageIndicators: [
          'no content elements',
          'empty dashboard',
          'loading failed'
        ]
      }
    };
  }

  /**
   * Analyze console logs for critical errors and warnings
   */
  async analyzeConsoleLogs(consoleLogs) {
    const analysis = {
      criticalErrors: [],
      warnings: [],
      summary: {
        totalLogs: consoleLogs.length,
        errorCount: 0,
        warningCount: 0,
        criticalErrorCount: 0
      }
    };

    for (const log of consoleLogs) {
      // Check for critical errors
      const isCriticalError = this.verificationRules.console.criticalErrors.some(
        pattern => log.text.includes(pattern)
      );
      
      if (isCriticalError) {
        analysis.criticalErrors.push({
          timestamp: log.timestamp,
          type: log.type,
          message: log.text,
          url: log.url,
          severity: this.categorizeErrorSeverity(log.text)
        });
        analysis.summary.criticalErrorCount++;
      }

      // Check for warnings
      const isWarning = this.verificationRules.console.warningPatterns.some(
        pattern => log.text.includes(pattern)
      ) || log.type === 'warn';

      if (isWarning) {
        analysis.warnings.push({
          timestamp: log.timestamp,
          type: log.type,
          message: log.text,
          url: log.url
        });
        analysis.summary.warningCount++;
      }

      // Count all errors
      if (log.type === 'error') {
        analysis.summary.errorCount++;
      }
    }

    return analysis;
  }

  /**
   * Analyze screenshots for visual issues
   */
  async analyzeScreenshots(screenshotPaths, testResults) {
    const analysis = {
      issues: [],
      summary: {
        totalScreenshots: screenshotPaths.length,
        issueCount: 0,
        blankDashboards: 0,
        errorBanners: 0,
        sidebarIssues: 0
      }
    };

    for (const screenshotPath of screenshotPaths) {
      const routeName = this.extractRouteFromPath(screenshotPath);
      const validation = testResults[this.pathToRoute(routeName)]?.validation;
      
      if (!validation) continue;

      // Check for blank dashboards
      if (validation.isBlankDashboard) {
        analysis.issues.push({
          type: 'blank_dashboard',
          route: routeName,
          severity: 'high',
          description: 'Dashboard appears blank with no content elements',
          screenshotPath
        });
        analysis.summary.blankDashboards++;
        analysis.summary.issueCount++;
      }

      // Check for error banners
      if (validation.hasErrorBanner) {
        analysis.issues.push({
          type: 'error_banner',
          route: routeName,
          severity: 'high',
          description: 'Error banner or error text detected in UI',
          screenshotPath
        });
        analysis.summary.errorBanners++;
        analysis.summary.issueCount++;
      }

      // Check sidebar issues
      if (validation.sidebarWidth < 60) {
        analysis.issues.push({
          type: 'sidebar_issue',
          route: routeName,
          severity: 'medium',
          description: `Sidebar too narrow (${validation.sidebarWidth}px) or missing`,
          screenshotPath
        });
        analysis.summary.sidebarIssues++;
        analysis.summary.issueCount++;
      }

      // Check for slow load times
      if (validation.loadTime > 10000) {
        analysis.issues.push({
          type: 'slow_load',
          route: routeName,
          severity: 'medium',
          description: `Slow page load time: ${validation.loadTime}ms`,
          screenshotPath
        });
        analysis.summary.issueCount++;
      }
    }

    return analysis;
  }

  /**
   * Generate comprehensive verification report
   */
  async generateVerificationReport(consoleLogs, screenshotPaths, testResults) {
    const consoleAnalysis = await this.analyzeConsoleLogs(consoleLogs);
    const screenshotAnalysis = await this.analyzeScreenshots(screenshotPaths, testResults);
    
    const report = {
      timestamp: new Date().toISOString(),
      overall: {
        passed: this.determineOverallPass(consoleAnalysis, screenshotAnalysis),
        confidence: this.calculateConfidenceScore(consoleAnalysis, screenshotAnalysis)
      },
      console: consoleAnalysis,
      screenshots: screenshotAnalysis,
      recommendations: this.generateRecommendations(consoleAnalysis, screenshotAnalysis)
    };

    return report;
  }

  /**
   * Determine if QA should pass based on AI analysis
   */
  determineOverallPass(consoleAnalysis, screenshotAnalysis) {
    // Fail if there are critical errors
    if (consoleAnalysis.summary.criticalErrorCount > 0) {
      return false;
    }

    // Fail if there are high-severity visual issues
    const highSeverityIssues = screenshotAnalysis.issues.filter(
      issue => issue.severity === 'high'
    );
    if (highSeverityIssues.length > 0) {
      return false;
    }

    // Fail if more than 50% of routes have issues
    const totalRoutes = screenshotAnalysis.summary.totalScreenshots;
    const routesWithIssues = new Set(
      screenshotAnalysis.issues.map(issue => issue.route)
    ).size;
    
    if (totalRoutes > 0 && (routesWithIssues / totalRoutes) > 0.5) {
      return false;
    }

    return true;
  }

  /**
   * Calculate confidence score (0-100)
   */
  calculateConfidenceScore(consoleAnalysis, screenshotAnalysis) {
    let score = 100;

    // Deduct for console errors
    score -= consoleAnalysis.summary.criticalErrorCount * 20;
    score -= consoleAnalysis.summary.warningCount * 5;

    // Deduct for visual issues
    score -= screenshotAnalysis.summary.blankDashboards * 25;
    score -= screenshotAnalysis.summary.errorBanners * 20;
    score -= screenshotAnalysis.summary.sidebarIssues * 10;

    return Math.max(0, score);
  }

  /**
   * Generate actionable recommendations
   */
  generateRecommendations(consoleAnalysis, screenshotAnalysis) {
    const recommendations = [];

    // Console-based recommendations
    if (consoleAnalysis.summary.criticalErrorCount > 0) {
      recommendations.push({
        priority: 'high',
        category: 'console_errors',
        message: `Fix ${consoleAnalysis.summary.criticalErrorCount} critical JavaScript errors before deployment`,
        details: consoleAnalysis.criticalErrors.map(err => err.message)
      });
    }

    // Screenshot-based recommendations
    if (screenshotAnalysis.summary.blankDashboards > 0) {
      recommendations.push({
        priority: 'high',
        category: 'blank_dashboards',
        message: `${screenshotAnalysis.summary.blankDashboards} dashboard(s) appear blank - check data loading`,
        details: screenshotAnalysis.issues
          .filter(issue => issue.type === 'blank_dashboard')
          .map(issue => issue.route)
      });
    }

    if (screenshotAnalysis.summary.sidebarIssues > 0) {
      recommendations.push({
        priority: 'medium',
        category: 'sidebar_layout',
        message: `Sidebar layout issues detected on ${screenshotAnalysis.summary.sidebarIssues} route(s)`,
        details: screenshotAnalysis.issues
          .filter(issue => issue.type === 'sidebar_issue')
          .map(issue => `${issue.route}: ${issue.description}`)
      });
    }

    return recommendations;
  }

  /**
   * Helper methods
   */
  categorizeErrorSeverity(errorText) {
    if (errorText.includes('TypeError') || errorText.includes('ReferenceError')) {
      return 'critical';
    }
    if (errorText.includes('Warning')) {
      return 'warning';
    }
    return 'error';
  }

  extractRouteFromPath(screenshotPath) {
    const filename = path.basename(screenshotPath, '.png');
    return filename.replace('admin-ui-', '').replace('-', '/');
  }

  pathToRoute(routeName) {
    if (routeName === 'admin') return '/admin';
    if (routeName === 'data') return '/admin/data';
    if (routeName === 'runtime') return '/admin/runtime';
    return '/' + routeName.replace('-', '/');
  }

  /**
   * Save verification report to file
   */
  async saveVerificationReport(report, outputPath) {
    await fs.writeFile(outputPath, JSON.stringify(report, null, 2));
    return outputPath;
  }

  /**
   * Generate human-readable summary
   */
  generateHumanSummary(report) {
    const { overall, console: consoleAnalysis, screenshots: screenshotAnalysis } = report;
    
    let summary = `AI Verification ${overall.passed ? 'PASSED' : 'FAILED'} (Confidence: ${overall.confidence}%)\n\n`;
    
    summary += `Console Analysis:\n`;
    summary += `  - ${consoleAnalysis.summary.totalLogs} total log entries\n`;
    summary += `  - ${consoleAnalysis.summary.criticalErrorCount} critical errors\n`;
    summary += `  - ${consoleAnalysis.summary.warningCount} warnings\n\n`;
    
    summary += `Screenshot Analysis:\n`;
    summary += `  - ${screenshotAnalysis.summary.totalScreenshots} screenshots analyzed\n`;
    summary += `  - ${screenshotAnalysis.summary.issueCount} total issues found\n`;
    summary += `  - ${screenshotAnalysis.summary.blankDashboards} blank dashboards\n`;
    summary += `  - ${screenshotAnalysis.summary.errorBanners} error banners\n\n`;
    
    if (report.recommendations.length > 0) {
      summary += `Recommendations:\n`;
      report.recommendations.forEach((rec, index) => {
        summary += `${index + 1}. [${rec.priority.toUpperCase()}] ${rec.message}\n`;
      });
    }
    
    return summary;
  }
}

export default AIVerificationUtils;