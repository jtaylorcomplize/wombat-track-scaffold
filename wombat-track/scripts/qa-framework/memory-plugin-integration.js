import fs from 'fs/promises';
import path from 'path';

/**
 * Memory Plugin Integration for QA Framework
 * 
 * Handles storage and retrieval of QA artifacts, maintains memory anchors,
 * and provides semantic linking for AI-assisted QA processes.
 */
export class MemoryPluginIntegration {
  constructor() {
    this.memoryBasePath = 'DriveMemory/QA-Framework';
    this.anchorBasePath = 'DriveMemory/QA-Framework/Anchors';
    this.artifactBasePath = 'DriveMemory/QA-Framework/Artifacts';
    this.sessionBasePath = 'DriveMemory/QA-Framework/Sessions';
  }

  async init() {
    // Ensure memory directories exist
    await this.ensureDirectories();
    console.log('🧠 Memory Plugin Integration initialized');
  }

  async ensureDirectories() {
    const directories = [
      this.memoryBasePath,
      this.anchorBasePath,
      this.artifactBasePath,
      this.sessionBasePath
    ];

    for (const dir of directories) {
      await fs.mkdir(dir, { recursive: true });
    }
  }

  /**
   * Create a memory anchor for QA session
   */
  async createMemoryAnchor(qaReport, governanceEntry) {
    const anchorId = `WT-ADMIN-UI-QA-FRAMEWORK-${qaReport.timestamp.replace(/[:.]/g, '-')}`;
    
    const anchor = {
      id: anchorId,
      version: '1.0',
      timestamp: qaReport.timestamp,
      type: 'QA_FRAMEWORK_SESSION',
      phase: 'WT-Admin-UI',
      branch: qaReport.branch,
      environment: qaReport.environment,
      status: qaReport.summary.passRate >= 75 && qaReport.aiVerification.overall.passed ? 'PASSED' : 'FAILED',
      
      // Core QA metrics
      metrics: {
        totalTests: qaReport.summary.totalTests,
        passedTests: qaReport.summary.passedTests,
        passRate: qaReport.summary.passRate,
        aiConfidence: qaReport.aiVerification.overall.confidence,
        screenshotCount: qaReport.artifacts.screenshots.length,
        consoleLogCount: qaReport.artifacts.logs.length
      },
      
      // Test suite breakdown
      testSuites: Object.keys(qaReport.testSuites),
      
      // AI verification results
      aiVerification: {
        status: qaReport.aiVerification.overall.passed ? 'PASSED' : 'FAILED',
        confidence: qaReport.aiVerification.overall.confidence,
        criticalErrors: qaReport.aiVerification.console.summary.criticalErrorCount,
        visualIssues: qaReport.aiVerification.screenshots.summary.issueCount,
        recommendations: qaReport.aiVerification.recommendations.length
      },
      
      // Semantic links
      links: {
        governanceEntry: governanceEntry?.id || null,
        artifactBundle: `${this.artifactBasePath}/${anchorId}`,
        sessionData: `${this.sessionBasePath}/${anchorId}.json`
      },
      
      // Memory classification tags
      memoryTags: [
        'qa-framework',
        'admin-ui-testing',
        'ai-assisted-verification',
        'puppeteer-automation',
        'screenshot-analysis',
        'console-log-analysis',
        qaReport.environment,
        qaReport.branch.replace(/\//g, '-')
      ],
      
      // Search and retrieval metadata
      searchMetadata: {
        testTypes: ['ui-testing', 'visual-regression', 'console-analysis'],
        frameworks: ['puppeteer', 'ai-verification'],
        routes: this.extractAllRoutes(qaReport),
        issues: this.extractIssueTypes(qaReport),
        keywords: [
          'admin-dashboard',
          'data-explorer', 
          'runtime-status',
          'ai-verification',
          'governance-compliance'
        ]
      }
    };

    // Save anchor
    const anchorPath = path.join(this.anchorBasePath, `${anchorId}.anchor`);
    await fs.writeFile(anchorPath, JSON.stringify(anchor, null, 2));
    
    console.log(`🔗 Memory anchor created: ${anchorId}`);
    return { anchor, path: anchorPath };
  }

  /**
   * Store QA artifacts in memory structure
   */  
  async storeArtifacts(qaReport, anchorId) {
    const artifactDir = path.join(this.artifactBasePath, anchorId);
    await fs.mkdir(artifactDir, { recursive: true });
    
    const storedArtifacts = {
      screenshots: [],
      logs: [],
      reports: []
    };

    // Copy screenshots
    for (const screenshotPath of qaReport.artifacts.screenshots) {
      const filename = path.basename(screenshotPath);
      const destPath = path.join(artifactDir, 'screenshots', filename);
      await fs.mkdir(path.dirname(destPath), { recursive: true });
      await fs.copyFile(screenshotPath, destPath);
      storedArtifacts.screenshots.push(destPath);
    }

    // Copy logs
    for (const logPath of qaReport.artifacts.logs) {
      const filename = path.basename(logPath);
      const destPath = path.join(artifactDir, 'logs', filename);
      await fs.mkdir(path.dirname(destPath), { recursive: true });
      await fs.copyFile(logPath, destPath);
      storedArtifacts.logs.push(destPath);
    }

    // Store main QA report
    const reportPath = path.join(artifactDir, 'qa-report.json');
    await fs.writeFile(reportPath, JSON.stringify(qaReport, null, 2));
    storedArtifacts.reports.push(reportPath);

    console.log(`📁 Artifacts stored in: ${artifactDir}`);
    return storedArtifacts;
  }

  /**
   * Store session data for future analysis
   */
  async storeSessionData(qaReport, anchorId, additionalData = {}) {
    const sessionData = {
      anchorId,
      timestamp: qaReport.timestamp,
      framework: qaReport.framework,
      environment: qaReport.environment,
      branch: qaReport.branch,
      
      // Execution context
      executionContext: {
        nodeVersion: process.version,
        platform: process.platform,
        cwd: process.cwd(),
        argv: process.argv,
        ...additionalData.executionContext
      },
      
      // Detailed test results
      detailedResults: qaReport.testSuites,
      
      // Performance metrics
      performance: {
        totalExecutionTime: additionalData.executionTime || null,
        averageRouteTime: this.calculateAverageRouteTime(qaReport),
        slowestRoute: this.findSlowestRoute(qaReport),
        fastestRoute: this.findFastestRoute(qaReport)
      },
      
      // Error analysis
      errorAnalysis: {
        consoleErrors: qaReport.aiVerification.console.criticalErrors,
        visualIssues: qaReport.aiVerification.screenshots.issues,
        patterns: this.analyzeErrorPatterns(qaReport)
      },
      
      // Trend data for historical analysis
      trendData: {
        passRateHistory: await this.getPassRateHistory(qaReport.branch),
        issueFrequency: await this.getIssueFrequency(),
        performanceTrends: await this.getPerformanceTrends()
      }
    };

    const sessionPath = path.join(this.sessionBasePath, `${anchorId}.json`);
    await fs.writeFile(sessionPath, JSON.stringify(sessionData, null, 2));
    
    console.log(`💾 Session data stored: ${sessionPath}`);
    return sessionPath;
  }

  /**
   * Create governance-compliant memory entry
   */
  async createGovernanceCompliantEntry(qaReport, governanceEntry) {
    const { anchor } = await this.createMemoryAnchor(qaReport, governanceEntry);
    const storedArtifacts = await this.storeArtifacts(qaReport, anchor.id);
    const sessionPath = await this.storeSessionData(qaReport, anchor.id);
    
    // Create index entry for searchability
    await this.updateMemoryIndex(anchor);
    
    return {
      anchorId: anchor.id,
      anchorPath: path.join(this.anchorBasePath, `${anchor.id}.anchor`),
      artifactsPath: path.join(this.artifactBasePath, anchor.id),
      sessionPath,
      storedArtifacts,
      memoryTags: anchor.memoryTags
    };
  }

  /**
   * Update searchable memory index
   */
  async updateMemoryIndex(anchor) {
    const indexPath = path.join(this.memoryBasePath, 'memory-index.json');
    
    let index = { entries: [] };
    try {
      const existingIndex = await fs.readFile(indexPath, 'utf8');
      index = JSON.parse(existingIndex);
    } catch (error) {
      // Index doesn't exist yet, start fresh
    }

    // Add new entry
    index.entries.push({
      id: anchor.id,
      timestamp: anchor.timestamp,
      type: anchor.type,
      status: anchor.status,
      branch: anchor.branch,
      environment: anchor.environment,
      passRate: anchor.metrics.passRate,
      aiConfidence: anchor.metrics.aiConfidence,
      tags: anchor.memoryTags,
      searchKeywords: anchor.searchMetadata.keywords
    });

    // Keep only last 100 entries for performance
    if (index.entries.length > 100) {
      index.entries = index.entries.slice(-100);
    }

    // Sort by timestamp (newest first)
    index.entries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    await fs.writeFile(indexPath, JSON.stringify(index, null, 2));
  }

  /**
   * Helper methods for data analysis
   */
  extractAllRoutes(qaReport) {
    const routes = [];
    Object.values(qaReport.testSuites).forEach(suite => {
      routes.push(...Object.keys(suite.routes));
    });
    return [...new Set(routes)];
  }

  extractIssueTypes(qaReport) {
    const issues = new Set();
    
    // Console error types
    qaReport.aiVerification.console.criticalErrors.forEach(error => {
      if (error.message.includes('TypeError')) issues.add('TypeError');
      if (error.message.includes('ReferenceError')) issues.add('ReferenceError');
      if (error.message.includes('Cannot read')) issues.add('PropertyAccess');
    });
    
    // Visual issue types
    qaReport.aiVerification.screenshots.issues.forEach(issue => {
      issues.add(issue.type);
    });
    
    return Array.from(issues);
  }

  calculateAverageRouteTime(qaReport) {
    const times = [];
    Object.values(qaReport.testSuites).forEach(suite => {
      Object.values(suite.routes).forEach(route => {
        if (route.validation?.loadTime) {
          times.push(route.validation.loadTime);
        }
      });
    });
    
    return times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
  }

  findSlowestRoute(qaReport) {
    let slowest = { route: null, time: 0 };
    
    Object.values(qaReport.testSuites).forEach(suite => {
      Object.entries(suite.routes).forEach(([route, result]) => {
        if (result.validation?.loadTime > slowest.time) {
          slowest = { route, time: result.validation.loadTime };
        }
      });
    });
    
    return slowest;
  }

  findFastestRoute(qaReport) {
    let fastest = { route: null, time: Infinity };
    
    Object.values(qaReport.testSuites).forEach(suite => {
      Object.entries(suite.routes).forEach(([route, result]) => {
        if (result.validation?.loadTime && result.validation.loadTime < fastest.time) {
          fastest = { route, time: result.validation.loadTime };
        }
      });
    });
    
    return fastest.time === Infinity ? { route: null, time: 0 } : fastest;
  }

  analyzeErrorPatterns(qaReport) {
    const patterns = {};
    
    qaReport.aiVerification.console.criticalErrors.forEach(error => {
      const pattern = error.message.split(':')[0]; // Get error type
      patterns[pattern] = (patterns[pattern] || 0) + 1;
    });
    
    return patterns;
  }

  // Placeholder methods for historical data (would integrate with actual storage)
  async getPassRateHistory(branch) {
    // In a real implementation, this would query historical data
    return [];
  }

  async getIssueFrequency() {
    return {};
  }

  async getPerformanceTrends() {
    return {};
  }

  /**
   * Query methods for retrieving stored data
   */
  async findAnchorsByTag(tag) {
    const indexPath = path.join(this.memoryBasePath, 'memory-index.json');
    try {
      const index = JSON.parse(await fs.readFile(indexPath, 'utf8'));
      return index.entries.filter(entry => entry.tags.includes(tag));
    } catch (error) {
      return [];
    }
  }

  async getAnchorById(anchorId) {
    const anchorPath = path.join(this.anchorBasePath, `${anchorId}.anchor`);
    try {
      return JSON.parse(await fs.readFile(anchorPath, 'utf8'));
    } catch (error) {
      return null;
    }
  }
}

export default MemoryPluginIntegration;