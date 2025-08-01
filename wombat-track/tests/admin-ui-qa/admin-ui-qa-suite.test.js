const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

describe('Admin UI QA Suite - Phase 1', () => {
  let browser;
  let page;
  const qaResults = {
    testSuite: 'Admin UI QA Suite - Phase 1',
    timestamp: new Date().toISOString(),
    routes: {},
    summary: {
      totalRoutes: 0,
      successfulRoutes: 0,
      failedRoutes: 0,
      totalErrors: 0,
      totalWarnings: 0
    }
  };

  // Admin routes to test
  const adminRoutes = [
    {
      id: 'admin-root',
      path: '/admin',
      name: 'Admin Dashboard Root',
      description: 'Main admin dashboard overview'
    },
    {
      id: 'admin-data-explorer',
      path: '/admin/data',
      name: 'Data Explorer',
      description: 'Database table browser and explorer'
    },
    {
      id: 'admin-runtime-panel',
      path: '/admin/runtime',
      name: 'Runtime Status Panel',
      description: 'System health and performance monitoring'
    },
    {
      id: 'admin-import-export',
      path: '/admin/import-export',
      name: 'Import/Export Panel',
      description: 'CSV and JSON data operations'
    },
    {
      id: 'admin-orphan-inspector',
      path: '/admin/orphan-inspector',
      name: 'Orphan Inspector',
      description: 'Detect and fix orphaned records'
    },
    {
      id: 'admin-secrets-manager',
      path: '/admin/secrets',
      name: 'Secrets Manager',
      description: 'MCP GSuite credential management'
    }
  ];

  beforeAll(async () => {
    console.log('🚀 Starting Admin UI QA Suite - Phase 1');
    
    browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    page = await browser.newPage();
    
    // Set viewport for consistent screenshots
    await page.setViewport({ width: 1920, height: 1080 });
    
    qaResults.summary.totalRoutes = adminRoutes.length;
  });

  afterAll(async () => {
    // Generate final QA report
    await generateQAReport();
    
    if (browser) {
      await browser.close();
    }
    
    console.log('📊 Admin UI QA Suite Complete');
    console.log(`✅ Successful routes: ${qaResults.summary.successfulRoutes}/${qaResults.summary.totalRoutes}`);
    console.log(`❌ Failed routes: ${qaResults.summary.failedRoutes}`);
    console.log(`⚠️ Total errors: ${qaResults.summary.totalErrors}`);
  });

  // Test each admin route
  adminRoutes.forEach((route) => {
    it(`should load and validate ${route.name} (${route.path})`, async () => {
      console.log(`\n🔍 Testing: ${route.name} - ${route.path}`);
      
      const routeResult = {
        id: route.id,
        name: route.name,
        path: route.path,
        description: route.description,
        status: 'pending',
        timestamp: new Date().toISOString(),
        screenshots: [],
        consoleMessages: [],
        errors: [],
        warnings: [],
        metrics: {
          loadTime: 0,
          elementCount: 0,
          resourceErrors: 0
        },
        validation: {
          pageLoaded: false,
          noBlankPage: false,
          noErrorBoundary: false,
          hasExpectedContent: false,
          responsiveLayout: false
        }
      };

      try {
        const startTime = Date.now();
        
        // Setup console and error monitoring
        const consoleMessages = [];
        const pageErrors = [];
        
        page.on('console', msg => {
          const message = {
            type: msg.type(),
            text: msg.text(),
            timestamp: new Date().toISOString()
          };
          consoleMessages.push(message);
          
          if (msg.type() === 'error') {
            pageErrors.push(message);
          }
        });

        page.on('pageerror', error => {
          const errorInfo = {
            type: 'pageerror',
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
          };
          pageErrors.push(errorInfo);
        });

        // Navigate to the admin route
        console.log(`📍 Navigating to: http://localhost:5178${route.path}`);
        await page.goto(`http://localhost:5178${route.path}`, { 
          waitUntil: 'networkidle2',
          timeout: 15000 
        });

        const loadTime = Date.now() - startTime;
        routeResult.metrics.loadTime = loadTime;

        // Wait for admin UI to initialize
        try {
          await page.waitForSelector('body', { timeout: 5000 });
          routeResult.validation.pageLoaded = true;
        } catch (error) {
          console.log('⚠️ Basic page load failed');
        }

        // Take full page screenshot
        const screenshotPath = `screenshots/admin-ui/${route.id}-full.png`;
        await page.screenshot({ 
          path: screenshotPath,
          fullPage: true
        });
        routeResult.screenshots.push({
          type: 'full-page',
          filename: `${route.id}-full.png`,
          path: screenshotPath
        });

        // Take viewport screenshot
        const viewportScreenshotPath = `screenshots/admin-ui/${route.id}-viewport.png`;
        await page.screenshot({ 
          path: viewportScreenshotPath,
          fullPage: false
        });
        routeResult.screenshots.push({
          type: 'viewport',
          filename: `${route.id}-viewport.png`,
          path: viewportScreenshotPath
        });

        console.log(`📸 Screenshots captured: ${route.id}-full.png, ${route.id}-viewport.png`);

        // Validate page content
        await validatePageContent(page, route, routeResult);
        
        // Count elements and detect issues
        const elementCount = await page.$$eval('*', elements => elements.length);
        routeResult.metrics.elementCount = elementCount;

        // Check for error boundaries
        const errorBoundaryText = await page.evaluate(() => {
          return document.body.textContent?.includes('Something went wrong') ||
                 document.body.textContent?.includes('Error Boundary') ||
                 document.body.textContent?.includes('crashed');
        });
        
        routeResult.validation.noErrorBoundary = !errorBoundaryText;

        // Check for blank page
        const bodyText = await page.evaluate(() => document.body.textContent?.trim());
        const hasMinimumContent = bodyText && bodyText.length > 50;
        routeResult.validation.noBlankPage = hasMinimumContent;

        // Store console messages and errors
        routeResult.consoleMessages = consoleMessages;
        routeResult.errors = pageErrors;
        routeResult.warnings = consoleMessages.filter(msg => msg.type === 'warning');

        // Calculate final status
        const validationPassed = Object.values(routeResult.validation).every(v => v === true);
        const noSeriousErrors = pageErrors.length === 0;
        
        if (validationPassed && noSeriousErrors) {
          routeResult.status = 'success';
          qaResults.summary.successfulRoutes++;
          console.log(`✅ ${route.name}: PASSED`);
        } else {
          routeResult.status = 'warning';
          console.log(`⚠️ ${route.name}: PASSED WITH WARNINGS`);
          console.log(`   Validation issues: ${JSON.stringify(routeResult.validation)}`);
          console.log(`   Errors: ${pageErrors.length}`);
        }

        qaResults.summary.totalErrors += pageErrors.length;
        qaResults.summary.totalWarnings += routeResult.warnings.length;

      } catch (error) {
        console.error(`❌ ${route.name}: FAILED`);
        console.error(`   Error: ${error.message}`);
        
        routeResult.status = 'failed';
        routeResult.errors.push({
          type: 'test-error',
          message: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString()
        });
        
        qaResults.summary.failedRoutes++;
        
        // Still try to take a screenshot of the failed state
        try {
          const errorScreenshotPath = `screenshots/admin-ui/${route.id}-error.png`;
          await page.screenshot({ 
            path: errorScreenshotPath,
            fullPage: true
          });
          routeResult.screenshots.push({
            type: 'error-state',
            filename: `${route.id}-error.png`,
            path: errorScreenshotPath
          });
        } catch (screenshotError) {
          console.error(`Failed to capture error screenshot: ${screenshotError.message}`);
        }
      }

      // Store route results
      qaResults.routes[route.id] = routeResult;
      
      // Basic assertions for Jest
      expect(routeResult.validation.pageLoaded).toBe(true);
      expect(routeResult.validation.noErrorBoundary).toBe(true);
    });
  });

  // Validation helper function
  async function validatePageContent(page, route, routeResult) {
    console.log(`🔍 Validating content for ${route.name}...`);
    
    try {
      // Check for route-specific content
      switch (route.id) {
        case 'admin-root':
          const hasAdminHeader = await page.$eval('body', body => 
            body.textContent?.includes('Admin') || 
            body.textContent?.includes('Dashboard')
          );
          routeResult.validation.hasExpectedContent = hasAdminHeader;
          break;
          
        case 'admin-data-explorer':
          const hasDataExplorer = await page.$eval('body', body => 
            body.textContent?.includes('Data Explorer') ||
            body.textContent?.includes('Browse') ||
            body.textContent?.includes('Table')
          );
          routeResult.validation.hasExpectedContent = hasDataExplorer;
          break;
          
        case 'admin-runtime-panel':
          const hasRuntimeContent = await page.$eval('body', body => 
            body.textContent?.includes('Runtime') ||
            body.textContent?.includes('Status') ||
            body.textContent?.includes('Health')
          );
          routeResult.validation.hasExpectedContent = hasRuntimeContent;
          break;
          
        default:
          // Generic content check
          const hasGenericContent = await page.$eval('body', body => 
            body.textContent && body.textContent.trim().length > 100
          );
          routeResult.validation.hasExpectedContent = hasGenericContent;
      }

      // Check for responsive layout
      const hasResponsiveElements = await page.$$eval('[class*="responsive"], [class*="grid"], [class*="flex"]', 
        elements => elements.length > 0
      );
      routeResult.validation.responsiveLayout = hasResponsiveElements;

    } catch (error) {
      console.log(`⚠️ Content validation failed: ${error.message}`);
      routeResult.validation.hasExpectedContent = false;
    }
  }

  // Generate comprehensive QA report
  async function generateQAReport() {
    console.log('📋 Generating QA Report...');
    
    try {
      // Create qa-report.json
      const reportPath = 'qa-artifacts/qa-report.json';
      await fs.writeFile(reportPath, JSON.stringify(qaResults, null, 2));
      console.log(`✅ QA Report saved: ${reportPath}`);
      
      // Create summary markdown report
      const summaryPath = 'qa-artifacts/qa-summary.md';
      const summaryContent = generateSummaryMarkdown();
      await fs.writeFile(summaryPath, summaryContent);
      console.log(`✅ QA Summary saved: ${summaryPath}`);
      
      // Create console logs for each route
      for (const [routeId, routeResult] of Object.entries(qaResults.routes)) {
        if (routeResult.consoleMessages.length > 0) {
          const logPath = `qa-artifacts/${routeId}-console.log`;
          const logContent = routeResult.consoleMessages
            .map(msg => `[${msg.timestamp}] ${msg.type.toUpperCase()}: ${msg.text}`)
            .join('\n');
          await fs.writeFile(logPath, logContent);
        }
      }
      
    } catch (error) {
      console.error('❌ Failed to generate QA report:', error.message);
    }
  }

  function generateSummaryMarkdown() {
    const { summary, routes } = qaResults;
    
    let md = `# Admin UI QA Report - Phase 1\n\n`;
    md += `**Generated:** ${qaResults.timestamp}\n\n`;
    md += `## Summary\n\n`;
    md += `- **Total Routes Tested:** ${summary.totalRoutes}\n`;
    md += `- **Successful Routes:** ${summary.successfulRoutes}\n`;
    md += `- **Failed Routes:** ${summary.failedRoutes}\n`;
    md += `- **Total Errors:** ${summary.totalErrors}\n`;
    md += `- **Total Warnings:** ${summary.totalWarnings}\n\n`;
    
    md += `## Route Details\n\n`;
    
    for (const [routeId, result] of Object.entries(routes)) {
      const statusEmoji = result.status === 'success' ? '✅' : 
                         result.status === 'warning' ? '⚠️' : '❌';
      
      md += `### ${statusEmoji} ${result.name}\n\n`;
      md += `- **Path:** \`${result.path}\`\n`;
      md += `- **Status:** ${result.status.toUpperCase()}\n`;
      md += `- **Load Time:** ${result.metrics.loadTime}ms\n`;
      md += `- **Elements:** ${result.metrics.elementCount}\n`;
      md += `- **Errors:** ${result.errors.length}\n`;
      md += `- **Warnings:** ${result.warnings.length}\n`;
      
      if (result.screenshots.length > 0) {
        md += `- **Screenshots:** ${result.screenshots.map(s => s.filename).join(', ')}\n`;
      }
      
      // Validation results
      md += `- **Validation:**\n`;
      for (const [key, value] of Object.entries(result.validation)) {
        const icon = value ? '✅' : '❌';
        md += `  - ${key}: ${icon}\n`;
      }
      
      md += `\n`;
    }
    
    return md;
  }
});