const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

describe('Sub-App QA Suite - Phase 5', () => {
  let browser;
  let page;
  const qaResults = {
    testSuite: 'Sub-App QA Suite - Phase 5',
    timestamp: new Date().toISOString(),
    subApps: {},
    summary: {
      totalSubApps: 0,
      totalRoutes: 0,
      successfulRoutes: 0,
      failedRoutes: 0,
      totalErrors: 0,
      totalWarnings: 0,
      criticalIssues: 0
    }
  };

  // Sub-App routes to test
  const subAppRoutes = [
    {
      subAppId: 'visacalc',
      subAppName: 'VisaCalc',
      description: 'Visa calculation and processing application',
      routes: [
        {
          id: 'visacalc-main',
          path: '/subapps/visacalc',
          name: 'VisaCalc Dashboard',
          description: 'Main VisaCalc dashboard and calculator interface'
        },
        {
          id: 'visacalc-project',
          path: '/subapps/visacalc/project/demo-project-1',
          name: 'VisaCalc Project View',
          description: 'Individual project visa calculation view'
        }
      ]
    },
    {
      subAppId: 'spqr',
      subAppName: 'SPQR Looker Studio',
      description: 'SPQR reporting and analytics dashboard',
      routes: [
        {
          id: 'spqr-main',
          path: '/subapps/spqr',
          name: 'SPQR Dashboard',
          description: 'Main SPQR Looker Studio dashboard'
        },
        {
          id: 'spqr-report',
          path: '/subapps/spqr/report/quarterly-analysis',
          name: 'SPQR Report View',
          description: 'Individual SPQR report analysis view'
        }
      ]
    },
    {
      subAppId: 'bkgm',
      subAppName: 'Cz-BKGM',
      description: 'Background management and compliance system',
      routes: [
        {
          id: 'bkgm-main',
          path: '/subapps/bkgm',
          name: 'BKGM Dashboard',
          description: 'Main Cz-BKGM compliance dashboard'
        },
        {
          id: 'bkgm-project',
          path: '/subapps/bkgm/project/compliance-audit-1',
          name: 'BKGM Project View',
          description: 'Individual BKGM compliance project view'
        }
      ]
    }
  ];

  beforeAll(async () => {
    console.log('🚀 Starting Sub-App QA Suite - Phase 5');
    
    browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    page = await browser.newPage();
    
    // Set viewport for consistent screenshots
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Calculate totals
    qaResults.summary.totalSubApps = subAppRoutes.length;
    qaResults.summary.totalRoutes = subAppRoutes.reduce((total, subApp) => total + subApp.routes.length, 0);
  });

  afterAll(async () => {
    // Generate final QA report
    await generateSubAppQAReport();
    
    if (browser) {
      await browser.close();
    }
    
    console.log('📊 Sub-App QA Suite Complete');
    console.log(`✅ Successful routes: ${qaResults.summary.successfulRoutes}/${qaResults.summary.totalRoutes}`);
    console.log(`❌ Failed routes: ${qaResults.summary.failedRoutes}`);
    console.log(`⚠️ Total errors: ${qaResults.summary.totalErrors}`);
    console.log(`🚨 Critical issues: ${qaResults.summary.criticalIssues}`);
  });

  // Test each Sub-App and its routes
  subAppRoutes.forEach((subApp) => {
    describe(`${subApp.subAppName} Sub-App`, () => {
      beforeAll(() => {
        qaResults.subApps[subApp.subAppId] = {
          id: subApp.subAppId,
          name: subApp.subAppName,
          description: subApp.description,
          routes: {},
          summary: {
            totalRoutes: subApp.routes.length,
            successfulRoutes: 0,
            failedRoutes: 0,
            totalErrors: 0,
            totalWarnings: 0
          }
        };
      });

      subApp.routes.forEach((route) => {
        it(`should load and validate ${route.name} (${route.path})`, async () => {
          console.log(`\n🔍 Testing: ${subApp.subAppName} - ${route.name}`);
          console.log(`📍 Route: ${route.path}`);
          
          const routeResult = {
            id: route.id,
            name: route.name,
            path: route.path,
            description: route.description,
            subAppId: subApp.subAppId,
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
              responsiveLayout: false,
              subAppSpecificContent: false
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

            // Navigate to the Sub-App route
            console.log(`📍 Navigating to: http://localhost:5178${route.path}`);
            await page.goto(`http://localhost:5178${route.path}`, { 
              waitUntil: 'networkidle2',
              timeout: 20000 
            });

            const loadTime = Date.now() - startTime;
            routeResult.metrics.loadTime = loadTime;

            // Wait for Sub-App to initialize
            try {
              await page.waitForSelector('body', { timeout: 5000 });
              routeResult.validation.pageLoaded = true;
            } catch (error) {
              console.log('⚠️ Basic page load failed');
            }

            // Take full page screenshot
            const screenshotPath = `qa-artifacts/subapps/screenshots/${route.id}-full.png`;
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
            const viewportScreenshotPath = `qa-artifacts/subapps/screenshots/${route.id}-viewport.png`;
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

            // Validate Sub-App specific content
            await validateSubAppContent(page, subApp, route, routeResult);
            
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
            const hasMinimumContent = bodyText && bodyText.length > 100;
            routeResult.validation.noBlankPage = hasMinimumContent;

            // Check for responsive layout
            const hasResponsiveElements = await page.$$eval(
              '[class*="responsive"], [class*="grid"], [class*="flex"], [class*="container"]', 
              elements => elements.length > 0
            );
            routeResult.validation.responsiveLayout = hasResponsiveElements;

            // Store console messages and errors
            routeResult.consoleMessages = consoleMessages;
            routeResult.errors = pageErrors;
            routeResult.warnings = consoleMessages.filter(msg => msg.type === 'warning');

            // Check for critical issues
            const hasCriticalErrors = pageErrors.some(error => 
              error.message?.includes('TypeError') || 
              error.message?.includes('ReferenceError') ||
              error.message?.includes('Cannot read property')
            );

            if (hasCriticalErrors) {
              qaResults.summary.criticalIssues++;
              console.log('🚨 Critical JavaScript errors detected');
            }

            // Calculate final status
            const validationPassed = Object.values(routeResult.validation).filter(v => v === true).length >= 4;
            const noSeriousErrors = pageErrors.length <= 2;
            
            if (validationPassed && noSeriousErrors && !hasCriticalErrors) {
              routeResult.status = 'success';
              qaResults.summary.successfulRoutes++;
              qaResults.subApps[subApp.subAppId].summary.successfulRoutes++;
              console.log(`✅ ${subApp.subAppName} - ${route.name}: PASSED`);
            } else if (hasCriticalErrors) {
              routeResult.status = 'failed';
              qaResults.summary.failedRoutes++;
              qaResults.subApps[subApp.subAppId].summary.failedRoutes++;
              console.log(`❌ ${subApp.subAppName} - ${route.name}: FAILED (Critical errors)`);
            } else {
              routeResult.status = 'warning';
              console.log(`⚠️ ${subApp.subAppName} - ${route.name}: PASSED WITH WARNINGS`);
              console.log(`   Validation issues: ${JSON.stringify(routeResult.validation)}`);
              console.log(`   Errors: ${pageErrors.length}`);
            }

            qaResults.summary.totalErrors += pageErrors.length;
            qaResults.summary.totalWarnings += routeResult.warnings.length;
            qaResults.subApps[subApp.subAppId].summary.totalErrors += pageErrors.length;
            qaResults.subApps[subApp.subAppId].summary.totalWarnings += routeResult.warnings.length;

            // Save console logs to file
            if (consoleMessages.length > 0) {
              const logPath = `qa-artifacts/subapps/logs/${route.id}-console.log`;
              const logContent = consoleMessages
                .map(msg => `[${msg.timestamp}] ${msg.type.toUpperCase()}: ${msg.text}`)
                .join('\n');
              await fs.writeFile(logPath, logContent);
              console.log(`📋 Console log saved: ${route.id}-console.log`);
            }

          } catch (error) {
            console.error(`❌ ${subApp.subAppName} - ${route.name}: FAILED`);
            console.error(`   Error: ${error.message}`);
            
            routeResult.status = 'failed';
            routeResult.errors.push({
              type: 'test-error',
              message: error.message,
              stack: error.stack,
              timestamp: new Date().toISOString()
            });
            
            qaResults.summary.failedRoutes++;
            qaResults.subApps[subApp.subAppId].summary.failedRoutes++;
            
            // Still try to take a screenshot of the failed state
            try {
              const errorScreenshotPath = `qa-artifacts/subapps/screenshots/${route.id}-error.png`;
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
          qaResults.subApps[subApp.subAppId].routes[route.id] = routeResult;
          
          // Basic assertions for Jest
          expect(routeResult.validation.pageLoaded).toBe(true);
          expect(routeResult.validation.noErrorBoundary).toBe(true);
        });
      });
    });
  });

  // Sub-App specific content validation
  async function validateSubAppContent(page, subApp, route, routeResult) {
    console.log(`🔍 Validating ${subApp.subAppName} specific content...`);
    
    try {
      switch (subApp.subAppId) {
        case 'visacalc':
          const hasVisaCalcContent = await page.$eval('body', body => 
            body.textContent?.includes('Visa') || 
            body.textContent?.includes('Calculator') ||
            body.textContent?.includes('VisaCalc')
          );
          routeResult.validation.subAppSpecificContent = hasVisaCalcContent;
          routeResult.validation.hasExpectedContent = hasVisaCalcContent;
          break;
          
        case 'spqr':
          const hasSPQRContent = await page.$eval('body', body => 
            body.textContent?.includes('SPQR') ||
            body.textContent?.includes('Looker') ||
            body.textContent?.includes('Report') ||
            body.textContent?.includes('Analytics')
          );
          routeResult.validation.subAppSpecificContent = hasSPQRContent;
          routeResult.validation.hasExpectedContent = hasSPQRContent;
          break;
          
        case 'bkgm':
          const hasBKGMContent = await page.$eval('body', body => 
            body.textContent?.includes('BKGM') ||
            body.textContent?.includes('Background') ||
            body.textContent?.includes('Compliance') ||
            body.textContent?.includes('Audit')
          );
          routeResult.validation.subAppSpecificContent = hasBKGMContent;
          routeResult.validation.hasExpectedContent = hasBKGMContent;
          break;
          
        default:
          // Generic content check
          const hasGenericContent = await page.$eval('body', body => 
            body.textContent && body.textContent.trim().length > 200
          );
          routeResult.validation.hasExpectedContent = hasGenericContent;
      }

    } catch (error) {
      console.log(`⚠️ Content validation failed: ${error.message}`);
      routeResult.validation.hasExpectedContent = false;
      routeResult.validation.subAppSpecificContent = false;
    }
  }

  // Generate comprehensive Sub-App QA report
  async function generateSubAppQAReport() {
    console.log('📋 Generating Sub-App QA Report...');
    
    try {
      // Create qa-report-subapps.json
      const reportPath = 'qa-artifacts/subapps/qa-report-subapps.json';
      await fs.writeFile(reportPath, JSON.stringify(qaResults, null, 2));
      console.log(`✅ Sub-App QA Report saved: ${reportPath}`);
      
      // Create summary markdown report
      const summaryPath = 'qa-artifacts/subapps/qa-summary-subapps.md';
      const summaryContent = generateSubAppSummaryMarkdown();
      await fs.writeFile(summaryPath, summaryContent);
      console.log(`✅ Sub-App QA Summary saved: ${summaryPath}`);
      
    } catch (error) {
      console.error('❌ Failed to generate Sub-App QA report:', error.message);
    }
  }

  function generateSubAppSummaryMarkdown() {
    const { summary, subApps } = qaResults;
    
    let md = `# Sub-App QA Report - Phase 5\n\n`;
    md += `**Generated:** ${qaResults.timestamp}\n\n`;
    md += `## Summary\n\n`;
    md += `- **Total Sub-Apps Tested:** ${summary.totalSubApps}\n`;
    md += `- **Total Routes Tested:** ${summary.totalRoutes}\n`;
    md += `- **Successful Routes:** ${summary.successfulRoutes}\n`;
    md += `- **Failed Routes:** ${summary.failedRoutes}\n`;
    md += `- **Total Errors:** ${summary.totalErrors}\n`;
    md += `- **Total Warnings:** ${summary.totalWarnings}\n`;
    md += `- **Critical Issues:** ${summary.criticalIssues}\n\n`;
    
    md += `## Sub-App Details\n\n`;
    
    for (const [subAppId, subAppResult] of Object.entries(subApps)) {
      md += `### ${subAppResult.name}\n\n`;
      md += `**Description:** ${subAppResult.description}\n\n`;
      md += `**Summary:**\n`;
      md += `- Routes Tested: ${subAppResult.summary.totalRoutes}\n`;
      md += `- Successful: ${subAppResult.summary.successfulRoutes}\n`;
      md += `- Failed: ${subAppResult.summary.failedRoutes}\n`;
      md += `- Errors: ${subAppResult.summary.totalErrors}\n`;
      md += `- Warnings: ${subAppResult.summary.totalWarnings}\n\n`;
      
      md += `**Routes:**\n\n`;
      
      for (const [routeId, routeResult] of Object.entries(subAppResult.routes)) {
        const statusEmoji = routeResult.status === 'success' ? '✅' : 
                           routeResult.status === 'warning' ? '⚠️' : '❌';
        
        md += `#### ${statusEmoji} ${routeResult.name}\n\n`;
        md += `- **Path:** \`${routeResult.path}\`\n`;
        md += `- **Status:** ${routeResult.status.toUpperCase()}\n`;
        md += `- **Load Time:** ${routeResult.metrics.loadTime}ms\n`;
        md += `- **Elements:** ${routeResult.metrics.elementCount}\n`;
        md += `- **Errors:** ${routeResult.errors.length}\n`;
        md += `- **Warnings:** ${routeResult.warnings.length}\n`;
        
        if (routeResult.screenshots.length > 0) {
          md += `- **Screenshots:** ${routeResult.screenshots.map(s => s.filename).join(', ')}\n`;
        }
        
        // Validation results
        md += `- **Validation:**\n`;
        for (const [key, value] of Object.entries(routeResult.validation)) {
          const icon = value ? '✅' : '❌';
          md += `  - ${key}: ${icon}\n`;
        }
        
        md += `\n`;
      }
      
      md += `\n`;
    }
    
    return md;
  }
});