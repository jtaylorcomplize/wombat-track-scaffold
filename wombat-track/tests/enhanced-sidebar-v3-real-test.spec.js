const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

describe('Enhanced Sidebar v3.1 - Real System Test', () => {
  let browser;
  let page;
  const baseUrl = process.env.BASE_URL || 'http://localhost:5174';
  const testResults = {
    sidebar_version: 'v3.1',
    tests_run: [],
    issues_found: [],
    components_tested: [],
    timestamp: new Date().toISOString()
  };

  beforeAll(async () => {
    console.log('🚀 Starting Enhanced Sidebar v3.1 Real System Test...');
    console.log(`📊 Testing URL: ${baseUrl}`);
    
    browser = await puppeteer.launch({
      headless: false, // Run in visible mode for debugging
      devtools: false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--allow-running-insecure-content'
      ]
    });

    page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Set up console logging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        testResults.issues_found.push({
          type: 'console_error',
          message: msg.text(),
          timestamp: new Date().toISOString()
        });
      }
      console.log(`📝 Console ${msg.type()}: ${msg.text()}`);
    });

    // Set up error logging
    page.on('pageerror', error => {
      testResults.issues_found.push({
        type: 'page_error',
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      console.error(`❌ Page Error: ${error.message}`);
    });

  }, 60000);

  afterAll(async () => {
    // Save test results
    const resultsPath = path.join(__dirname, '..', 'test-results', 'sidebar-v3-real-test.json');
    await fs.promises.mkdir(path.dirname(resultsPath), { recursive: true });
    await fs.promises.writeFile(resultsPath, JSON.stringify(testResults, null, 2));
    
    console.log(`📊 Test results saved to: ${resultsPath}`);
    console.log(`🔍 Issues found: ${testResults.issues_found.length}`);
    console.log(`✅ Components tested: ${testResults.components_tested.length}`);
    
    if (browser) {
      await browser.close();
    }
  }, 30000);

  beforeEach(async () => {
    // Navigate to application
    try {
      await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2000); // Allow React to render
    } catch (error) {
      testResults.issues_found.push({
        type: 'navigation_error',
        message: `Failed to navigate to ${baseUrl}: ${error.message}`,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  });

  test('should load Enhanced Sidebar v3.1 component', async () => {
    const testName = 'sidebar_component_load';
    testResults.tests_run.push(testName);
    testResults.components_tested.push('EnhancedSidebarV3');

    try {
      // Wait for sidebar to be present
      await page.waitForSelector('[class*="fixed left-0"]', { timeout: 10000 });
      
      // Check for specific v3.1 elements
      const sidebarElements = await page.evaluate(() => {
        const sidebar = document.querySelector('[class*="fixed left-0"]');
        if (!sidebar) return { found: false };
        
        return {
          found: true,
          hasProjectSurfaces: !!sidebar.textContent.includes('Project Surfaces'),
          hasSubApps: !!sidebar.textContent.includes('Sub-Apps'),
          hasSystemSurfaces: !!sidebar.textContent.includes('System Surfaces'),
          hasVersionIndicator: !!sidebar.textContent.includes('Enhanced Sidebar v3.1'),
          width: sidebar.offsetWidth,
          height: sidebar.offsetHeight
        };
      });

      expect(sidebarElements.found).toBe(true);
      console.log('✅ Enhanced Sidebar v3.1 loaded successfully');
      console.log(`📏 Sidebar dimensions: ${sidebarElements.width}x${sidebarElements.height}`);
      
      if (!sidebarElements.hasVersionIndicator) {
        testResults.issues_found.push({
          type: 'missing_version_indicator',
          message: 'Enhanced Sidebar v3.1 version indicator not found',
          timestamp: new Date().toISOString()
        });
      }

    } catch (error) {
      testResults.issues_found.push({
        type: 'component_load_failure',
        message: `Enhanced Sidebar v3.1 failed to load: ${error.message}`,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }, 30000);

  test('should test sidebar section accordion functionality', async () => {
    const testName = 'accordion_functionality';
    testResults.tests_run.push(testName);
    testResults.components_tested.push('AccordionSections');

    try {
      // Test Project Surfaces accordion
      const projectSurfacesButton = await page.$('button:has-text("Project Surfaces")') || 
                                   await page.$('button[aria-expanded]');
      
      if (projectSurfacesButton) {
        console.log('🔍 Testing Project Surfaces accordion...');
        await projectSurfacesButton.click();
        await page.waitForTimeout(500);
        
        // Check if accordion expanded/collapsed
        const ariaExpanded = await projectSurfacesButton.evaluate(el => el.getAttribute('aria-expanded'));
        console.log(`📊 Project Surfaces expanded: ${ariaExpanded}`);
      } else {
        testResults.issues_found.push({
          type: 'missing_accordion_button',
          message: 'Project Surfaces accordion button not found',
          timestamp: new Date().toISOString()
        });
      }

      // Test Sub-Apps accordion
      const subAppsButtons = await page.$$('button');
      let subAppsButton = null;
      
      for (const button of subAppsButtons) {
        const text = await button.evaluate(el => el.textContent);
        if (text.includes('Sub-Apps')) {
          subAppsButton = button;
          break;
        }
      }
      
      if (subAppsButton) {
        console.log('🔍 Testing Sub-Apps accordion...');
        await subAppsButton.click();
        await page.waitForTimeout(500);
      }

      console.log('✅ Accordion functionality tested');

    } catch (error) {
      testResults.issues_found.push({
        type: 'accordion_test_failure',
        message: `Accordion functionality test failed: ${error.message}`,
        timestamp: new Date().toISOString()
      });
      console.error(`❌ Accordion test error: ${error.message}`);
    }
  }, 30000);

  test('should test sidebar collapse/expand functionality', async () => {
    const testName = 'collapse_expand_functionality';
    testResults.tests_run.push(testName);
    testResults.components_tested.push('SidebarToggle');

    try {
      // Find collapse button (could be ChevronLeft or ChevronRight)
      const collapseButton = await page.$('button[aria-label*="ollapse"], button[aria-label*="Expand"]');
      
      if (collapseButton) {
        console.log('🔍 Testing sidebar collapse/expand...');
        
        // Get initial sidebar width
        const initialWidth = await page.evaluate(() => {
          const sidebar = document.querySelector('[class*="fixed left-0"]');
          return sidebar ? sidebar.offsetWidth : 0;
        });
        console.log(`📏 Initial sidebar width: ${initialWidth}px`);
        
        // Click collapse button
        await collapseButton.click();
        await page.waitForTimeout(1000); // Allow animation time
        
        // Check new width
        const collapsedWidth = await page.evaluate(() => {
          const sidebar = document.querySelector('[class*="fixed left-0"]');
          return sidebar ? sidebar.offsetWidth : 0;
        });
        console.log(`📏 Collapsed sidebar width: ${collapsedWidth}px`);
        
        // Verify collapse actually happened
        if (collapsedWidth >= initialWidth) {
          testResults.issues_found.push({
            type: 'collapse_functionality_broken',
            message: `Sidebar did not collapse properly. Initial: ${initialWidth}px, After: ${collapsedWidth}px`,
            timestamp: new Date().toISOString()
          });
        }
        
        // Try to expand again
        const expandButton = await page.$('button[aria-label*="Expand"], button[aria-label*="ollapse"]');
        if (expandButton) {
          await expandButton.click();
          await page.waitForTimeout(1000);
          
          const expandedWidth = await page.evaluate(() => {
            const sidebar = document.querySelector('[class*="fixed left-0"]');
            return sidebar ? sidebar.offsetWidth : 0;
          });
          console.log(`📏 Re-expanded sidebar width: ${expandedWidth}px`);
        }
        
        console.log('✅ Collapse/expand functionality tested');
      } else {
        testResults.issues_found.push({
          type: 'missing_collapse_button',
          message: 'Sidebar collapse/expand button not found',
          timestamp: new Date().toISOString()
        });
      }

    } catch (error) {
      testResults.issues_found.push({
        type: 'collapse_expand_test_failure',
        message: `Collapse/expand test failed: ${error.message}`,
        timestamp: new Date().toISOString()
      });
      console.error(`❌ Collapse/expand test error: ${error.message}`);
    }
  }, 30000);

  test('should test navigation to admin dashboard', async () => {
    const testName = 'admin_navigation';
    testResults.tests_run.push(testName);
    testResults.components_tested.push('AdminNavigation');

    try {
      console.log('🔍 Testing admin dashboard navigation...');
      
      // Look for Admin Dashboard button/link
      const adminButtons = await page.$$('button, a');
      let adminButton = null;
      
      for (const button of adminButtons) {
        const text = await button.evaluate(el => el.textContent);
        if (text.includes('Admin') || text.includes('admin')) {
          adminButton = button;
          console.log(`📍 Found admin button: "${text}"`);
          break;
        }
      }
      
      if (adminButton) {
        await adminButton.click();
        await page.waitForTimeout(2000);
        
        // Check if we navigated to admin area
        const currentUrl = page.url();
        const hasAdminInUrl = currentUrl.includes('admin') || currentUrl.includes('Admin');
        
        if (hasAdminInUrl) {
          console.log(`✅ Successfully navigated to admin: ${currentUrl}`);
          
          // Check for admin dashboard elements
          const adminElements = await page.evaluate(() => {
            return {
              hasAdminDashboard: document.body.textContent.includes('Admin Dashboard'),
              hasDataExplorer: document.body.textContent.includes('Data Explorer'),
              hasImportExport: document.body.textContent.includes('Import/Export'),
              hasEditableTables: document.body.textContent.includes('Editable Tables')
            };
          });
          
          console.log('📊 Admin elements found:', adminElements);
        } else {
          testResults.issues_found.push({
            type: 'admin_navigation_failed',
            message: `Admin navigation did not change URL. Current: ${currentUrl}`,
            timestamp: new Date().toISOString()
          });
        }
      } else {
        testResults.issues_found.push({
          type: 'missing_admin_button',
          message: 'Admin dashboard button/link not found in sidebar',
          timestamp: new Date().toISOString()
        });
      }

    } catch (error) {
      testResults.issues_found.push({
        type: 'admin_navigation_test_failure',
        message: `Admin navigation test failed: ${error.message}`,
        timestamp: new Date().toISOString()
      });
      console.error(`❌ Admin navigation test error: ${error.message}`);
    }
  }, 30000);

  test('should test sub-app status indicators', async () => {
    const testName = 'subapp_status_indicators';
    testResults.tests_run.push(testName);
    testResults.components_tested.push('SubAppStatusIndicators');

    try {
      console.log('🔍 Testing sub-app status indicators...');
      
      // Look for status indicator elements (colored dots/badges)
      const statusElements = await page.evaluate(() => {
        // Look for elements that might be status indicators
        const possibleStatusElements = Array.from(document.querySelectorAll('*')).filter(el => {
          const classes = el.className;
          const styles = window.getComputedStyle(el);
          
          return (
            (typeof classes === 'string' && (
              classes.includes('bg-green') || 
              classes.includes('bg-red') || 
              classes.includes('bg-amber') ||
              classes.includes('bg-yellow') ||
              classes.includes('rounded-full')
            )) ||
            styles.backgroundColor !== 'rgba(0, 0, 0, 0)' ||
            el.title?.includes('Status') ||
            el.title?.includes('Uptime')
          );
        });
        
        return {
          count: possibleStatusElements.length,
          elements: possibleStatusElements.slice(0, 5).map(el => ({
            tagName: el.tagName,
            className: el.className,
            title: el.title,
            textContent: el.textContent?.substring(0, 50),
            backgroundColor: window.getComputedStyle(el).backgroundColor
          }))
        };
      });
      
      console.log(`📊 Found ${statusElements.count} potential status elements`);
      console.log('📋 Status elements:', statusElements.elements);
      
      if (statusElements.count === 0) {
        testResults.issues_found.push({
          type: 'missing_status_indicators',
          message: 'No sub-app status indicators found',
          timestamp: new Date().toISOString()
        });
      }
      
      console.log('✅ Sub-app status indicators tested');

    } catch (error) {
      testResults.issues_found.push({
        type: 'status_indicators_test_failure',
        message: `Status indicators test failed: ${error.message}`,
        timestamp: new Date().toISOString()
      });
      console.error(`❌ Status indicators test error: ${error.message}`);
    }
  }, 30000);

  test('should capture final sidebar state and structure', async () => {
    const testName = 'sidebar_state_capture';
    testResults.tests_run.push(testName);

    try {
      console.log('🔍 Capturing final sidebar state...');
      
      // Take screenshot
      await page.screenshot({
        path: path.join(__dirname, '..', 'test-results', 'sidebar-v3-final-state.png'),
        fullPage: false,
        clip: { x: 0, y: 0, width: 400, height: 1080 }
      });
      
      // Capture sidebar HTML structure
      const sidebarStructure = await page.evaluate(() => {
        const sidebar = document.querySelector('[class*="fixed left-0"]');
        if (!sidebar) return { found: false };
        
        const getElementInfo = (element) => {
          if (!element) return null;
          
          return {
            tagName: element.tagName,
            className: element.className,
            id: element.id,
            textContent: element.textContent?.substring(0, 100),
            children: Array.from(element.children).slice(0, 10).map(getElementInfo)
          };
        };
        
        return {
          found: true,
          structure: getElementInfo(sidebar)
        };
      });
      
      // Save structure to file
      const structurePath = path.join(__dirname, '..', 'test-results', 'sidebar-v3-structure.json');
      await fs.promises.mkdir(path.dirname(structurePath), { recursive: true });
      await fs.promises.writeFile(structurePath, JSON.stringify(sidebarStructure, null, 2));
      
      console.log('✅ Sidebar state captured');
      console.log(`📸 Screenshot saved`);
      console.log(`📋 Structure saved to: ${structurePath}`);

    } catch (error) {
      testResults.issues_found.push({
        type: 'state_capture_failure',
        message: `Failed to capture sidebar state: ${error.message}`,
        timestamp: new Date().toISOString()
      });
      console.error(`❌ State capture error: ${error.message}`);
    }
  }, 30000);
});