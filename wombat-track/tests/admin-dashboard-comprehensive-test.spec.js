const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

describe('Admin Dashboard Comprehensive Test', () => {
  let browser;
  let page;
  const baseUrl = process.env.BASE_URL || 'http://localhost:5174';
  const testResults = {
    sidebar_version_detected: null,
    admin_components_tested: [],
    issues_found: [],
    form_interactions_tested: [],
    modal_behaviors_tested: [],
    navigation_paths_tested: [],
    timestamp: new Date().toISOString()
  };

  beforeAll(async () => {
    console.log('🚀 Starting Admin Dashboard Comprehensive Test...');
    console.log(`📊 Testing URL: ${baseUrl}`);
    
    browser = await puppeteer.launch({
      headless: true,
      devtools: false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    });

    page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Set up console and error logging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        testResults.issues_found.push({
          type: 'console_error',
          message: msg.text(),
          location: 'browser_console',
          timestamp: new Date().toISOString()
        });
      }
      console.log(`📝 ${msg.type()}: ${msg.text()}`);
    });

    page.on('pageerror', error => {
      testResults.issues_found.push({
        type: 'page_error',
        message: error.message,
        location: 'page_runtime',
        timestamp: new Date().toISOString()
      });
    });

  }, 60000);

  afterAll(async () => {
    // Save comprehensive test results
    const resultsPath = path.join(__dirname, '..', 'test-results', 'admin-dashboard-test-results.json');
    await fs.promises.mkdir(path.dirname(resultsPath), { recursive: true });
    await fs.promises.writeFile(resultsPath, JSON.stringify(testResults, null, 2));
    
    console.log(`📊 Test results saved to: ${resultsPath}`);
    console.log(`🔍 Total issues found: ${testResults.issues_found.length}`);
    console.log(`✅ Components tested: ${testResults.admin_components_tested.length}`);
    
    if (browser) {
      await browser.close();
    }
  }, 30000);

  test('should identify actual sidebar version and navigate to admin', async () => {
    try {
      await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(3000);

      // Detect sidebar version
      const sidebarInfo = await page.evaluate(() => {
        const body = document.body;
        const bodyText = body.textContent || '';
        
        // Look for version indicators
        const hasV1Indicator = bodyText.includes('Enhanced Sidebar v1.2');
        const hasV3Indicator = bodyText.includes('Enhanced Sidebar v3.1');
        const hasV3Code = !!document.querySelector('[class*="EnhancedSidebarV3"]');
        
        // Look for sidebar structure
        const sidebar = document.querySelector('[class*="fixed left-0"], [class*="sidebar"]');
        const sidebarWidth = sidebar ? sidebar.offsetWidth : 0;
        
        // Check for specific v3 elements
        const hasProjectSurfaces = bodyText.includes('Project Surfaces');
        const hasSubApps = bodyText.includes('Sub-Apps');
        const hasSystemSurfaces = bodyText.includes('System Surfaces');
        
        return {
          detected_version: hasV3Indicator ? 'v3.1' : hasV1Indicator ? 'v1.2' : 'unknown',
          has_v3_code: hasV3Code,
          sidebar_width: sidebarWidth,
          has_project_surfaces: hasProjectSurfaces,
          has_sub_apps: hasSubApps,
          has_system_surfaces: hasSystemSurfaces,
          body_text_sample: bodyText.substring(0, 500)
        };
      });

      testResults.sidebar_version_detected = sidebarInfo.detected_version;
      console.log(`📊 Detected sidebar version: ${sidebarInfo.detected_version}`);
      console.log(`📏 Sidebar width: ${sidebarInfo.sidebar_width}px`);

      if (sidebarInfo.detected_version === 'unknown') {
        testResults.issues_found.push({
          type: 'sidebar_version_unknown',
          message: 'Could not identify sidebar version from page content',
          details: sidebarInfo,
          timestamp: new Date().toISOString()
        });
      }

      // Try to navigate to admin
      console.log('🔍 Looking for admin navigation...');
      
      // Look for admin-related buttons/links
      const adminNavigation = await page.evaluate(() => {
        const allElements = Array.from(document.querySelectorAll('button, a, [role="button"]'));
        const adminElements = allElements.filter(el => {
          const text = el.textContent || '';
          return text.toLowerCase().includes('admin') || 
                 text.toLowerCase().includes('dashboard') ||
                 el.href?.includes('admin');
        });
        
        return adminElements.map(el => ({
          tagName: el.tagName,
          textContent: el.textContent?.substring(0, 50),
          href: el.href,
          className: el.className
        }));
      });

      console.log(`📋 Found ${adminNavigation.length} potential admin navigation elements`);
      
      if (adminNavigation.length > 0) {
        // Try to click the first admin link
        await page.click('button:has-text("Admin"), a:has-text("Admin"), button:has-text("admin"), a[href*="admin"]');
        await page.waitForTimeout(2000);
        
        const currentUrl = page.url();
        testResults.navigation_paths_tested.push({
          target: 'admin_dashboard',
          success: currentUrl.includes('admin'),
          final_url: currentUrl
        });
      } else {
        testResults.issues_found.push({
          type: 'admin_navigation_missing',
          message: 'No admin navigation elements found',
          timestamp: new Date().toISOString()
        });
      }

    } catch (error) {
      testResults.issues_found.push({
        type: 'navigation_test_failure',
        message: `Navigation test failed: ${error.message}`,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }, 45000);

  test('should test admin dashboard tabs and components', async () => {
    testResults.admin_components_tested.push('AdminDashboardTabs');
    
    try {
      // Look for admin tabs
      const adminTabs = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button, [role="tab"]'));
        const tabButtons = buttons.filter(btn => {
          const text = btn.textContent || '';
          return text.includes('Data Explorer') ||
                 text.includes('Import/Export') ||
                 text.includes('Editable Tables') ||
                 text.includes('Overview') ||
                 text.includes('Runtime Panel') ||
                 text.includes('Secrets Manager');
        });
        
        return tabButtons.map(btn => ({
          text: btn.textContent?.substring(0, 30),
          className: btn.className,
          disabled: btn.disabled,
          ariaSelected: btn.getAttribute('aria-selected')
        }));
      });

      console.log(`📊 Found ${adminTabs.length} admin tab elements`);
      
      if (adminTabs.length === 0) {
        testResults.issues_found.push({
          type: 'admin_tabs_missing',
          message: 'No admin dashboard tabs found',
          timestamp: new Date().toISOString()
        });
      }

      // Test clicking different tabs
      const tabsToTest = ['Data Explorer', 'Import/Export', 'Editable Tables'];
      
      for (const tabName of tabsToTest) {
        try {
          const tabButton = await page.$(`button:has-text("${tabName}")`);
          if (tabButton) {
            await tabButton.click();
            await page.waitForTimeout(1000);
            
            console.log(`✅ Successfully clicked ${tabName} tab`);
            testResults.admin_components_tested.push(`${tabName}_tab`);
          } else {
            testResults.issues_found.push({
              type: 'tab_not_found',
              message: `${tabName} tab button not found`,
              timestamp: new Date().toISOString()
            });
          }
        } catch (error) {
          testResults.issues_found.push({
            type: 'tab_click_failure',
            message: `Failed to click ${tabName} tab: ${error.message}`,
            timestamp: new Date().toISOString()
          });
        }
      }

    } catch (error) {
      testResults.issues_found.push({
        type: 'admin_components_test_failure',
        message: `Admin components test failed: ${error.message}`,
        timestamp: new Date().toISOString()
      });
    }
  }, 30000);

  test('should test editable tables form interactions', async () => {
    testResults.form_interactions_tested.push('EditableTablesTest');
    
    try {
      // Navigate to Editable Tables tab
      const editableTablesButton = await page.$('button:has-text("Editable Tables")');
      if (editableTablesButton) {
        await editableTablesButton.click();
        await page.waitForTimeout(2000);
      }

      // Look for editable table elements
      const tableElements = await page.evaluate(() => {
        // Look for table-related elements
        const tables = Array.from(document.querySelectorAll('table, [role="table"], .table'));
        const editableCells = Array.from(document.querySelectorAll('[contenteditable], input[type="text"], select, textarea'));
        const saveButtons = Array.from(document.querySelectorAll('button')).filter(btn => 
          btn.textContent?.includes('Save') || btn.textContent?.includes('Commit')
        );
        
        return {
          tables_found: tables.length,
          editable_cells_found: editableCells.length,
          save_buttons_found: saveButtons.length,
          table_info: tables.slice(0, 3).map(table => ({
            tagName: table.tagName,
            className: table.className,
            rowCount: table.querySelectorAll('tr').length,
            colCount: table.querySelectorAll('th, td').length
          }))
        };
      });

      console.log(`📊 Tables found: ${tableElements.tables_found}`);
      console.log(`📊 Editable cells: ${tableElements.editable_cells_found}`);
      console.log(`📊 Save buttons: ${tableElements.save_buttons_found}`);

      if (tableElements.editable_cells_found === 0) {
        testResults.issues_found.push({
          type: 'no_editable_cells',
          message: 'No editable cells found in admin tables',
          timestamp: new Date().toISOString()
        });
      }

      // Test clicking on editable cells
      if (tableElements.editable_cells_found > 0) {
        try {
          const firstEditableCell = await page.$('input[type="text"], select, [contenteditable="true"]');
          if (firstEditableCell) {
            await firstEditableCell.click();
            await page.waitForTimeout(500);
            
            console.log('✅ Successfully clicked editable cell');
            testResults.form_interactions_tested.push('cell_click_interaction');
            
            // Try typing in the cell
            await page.type('input[type="text"], [contenteditable="true"]', 'TEST', { delay: 100 });
            testResults.form_interactions_tested.push('cell_typing_interaction');
            
          }
        } catch (error) {
          testResults.issues_found.push({
            type: 'cell_interaction_failure',
            message: `Failed to interact with editable cell: ${error.message}`,
            timestamp: new Date().toISOString()
          });
        }
      }

      // Test save/commit buttons
      if (tableElements.save_buttons_found > 0) {
        try {
          const saveButton = await page.$('button:has-text("Save"), button:has-text("Commit")');
          if (saveButton) {
            await saveButton.click();
            await page.waitForTimeout(1000);
            
            console.log('✅ Successfully clicked save/commit button');
            testResults.form_interactions_tested.push('save_button_interaction');
          }
        } catch (error) {
          testResults.issues_found.push({
            type: 'save_button_failure',
            message: `Save/commit button interaction failed: ${error.message}`,
            timestamp: new Date().toISOString()
          });
        }
      }

    } catch (error) {
      testResults.issues_found.push({
        type: 'editable_tables_test_failure',
        message: `Editable tables test failed: ${error.message}`,
        timestamp: new Date().toISOString()
      });
    }
  }, 30000);

  test('should test modal dialogs and popups', async () => {
    testResults.modal_behaviors_tested.push('ModalDialogTest');
    
    try {
      // Look for elements that might trigger modals
      const modalTriggers = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const modalButtons = buttons.filter(btn => {
          const text = btn.textContent || '';
          const ariaLabel = btn.getAttribute('aria-label') || '';
          return text.includes('Edit') || 
                 text.includes('View') || 
                 text.includes('Add') ||
                 ariaLabel.includes('modal') ||
                 ariaLabel.includes('dialog');
        });
        
        return modalButtons.map(btn => ({
          text: btn.textContent?.substring(0, 30),
          ariaLabel: btn.getAttribute('aria-label'),
          className: btn.className
        }));
      });

      console.log(`📊 Found ${modalTriggers.length} potential modal trigger buttons`);

      if (modalTriggers.length > 0) {
        // Try to trigger a modal
        try {
          const modalTriggerButton = await page.$('button:has-text("Edit"), button[aria-label*="modal"]');
          if (modalTriggerButton) {
            await modalTriggerButton.click();
            await page.waitForTimeout(1000);
            
            // Check if modal appeared
            const modalPresent = await page.evaluate(() => {
              const modals = document.querySelectorAll('[role="dialog"], .modal, [class*="modal"]');
              return {
                modal_count: modals.length,
                modal_visible: Array.from(modals).some(modal => {
                  const styles = window.getComputedStyle(modal);
                  return styles.display !== 'none' && styles.opacity !== '0';
                })
              };
            });

            if (modalPresent.modal_visible) {
              console.log('✅ Modal dialog appeared');
              testResults.modal_behaviors_tested.push('modal_opening');
              
              // Test modal closing
              const closeButton = await page.$('button[aria-label*="close"], button[aria-label*="Close"], .close');
              if (closeButton) {
                await closeButton.click();
                await page.waitForTimeout(500);
                testResults.modal_behaviors_tested.push('modal_closing');
              }
            } else {
              testResults.issues_found.push({
                type: 'modal_not_appearing',
                message: 'Modal dialog did not appear after trigger click',
                timestamp: new Date().toISOString()
              });
            }
          }
        } catch (error) {
          testResults.issues_found.push({
            type: 'modal_trigger_failure',
            message: `Modal trigger test failed: ${error.message}`,
            timestamp: new Date().toISOString()
          });
        }
      }

      // Test ESC key for modal closing
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
      testResults.modal_behaviors_tested.push('escape_key_test');

    } catch (error) {
      testResults.issues_found.push({
        type: 'modal_test_failure',
        message: `Modal test failed: ${error.message}`,
        timestamp: new Date().toISOString()
      });
    }
  }, 30000);

  test('should test sidebar change issues and responsiveness', async () => {
    try {
      // Test sidebar collapse/expand (major issue mentioned)
      const collapseButton = await page.$('button[aria-label*="ollapse"], button[aria-label*="Expand"]');
      
      if (collapseButton) {
        // Get initial state
        const initialState = await page.evaluate(() => {
          const sidebar = document.querySelector('[class*="fixed left-0"], [class*="sidebar"]');
          return {
            width: sidebar ? sidebar.offsetWidth : 0,
            isVisible: sidebar ? !sidebar.hidden : false
          };
        });

        console.log(`📏 Initial sidebar state: ${initialState.width}px, visible: ${initialState.isVisible}`);

        // Try to change sidebar state
        await collapseButton.click();
        await page.waitForTimeout(1000);

        const changedState = await page.evaluate(() => {
          const sidebar = document.querySelector('[class*="fixed left-0"], [class*="sidebar"]');
          return {
            width: sidebar ? sidebar.offsetWidth : 0,
            isVisible: sidebar ? !sidebar.hidden : false
          };
        });

        console.log(`📏 Changed sidebar state: ${changedState.width}px, visible: ${changedState.isVisible}`);

        // Check if change actually occurred
        if (initialState.width === changedState.width && initialState.isVisible === changedState.isVisible) {
          testResults.issues_found.push({
            type: 'sidebar_change_broken',
            message: 'Sidebar collapse/expand functionality not working - no state change detected',
            details: { initial: initialState, changed: changedState },
            severity: 'critical',
            timestamp: new Date().toISOString()
          });
        } else {
          console.log('✅ Sidebar state change detected');
        }

        // Test responsiveness at different viewport sizes
        const viewports = [
          { width: 1920, height: 1080, name: 'desktop' },
          { width: 768, height: 1024, name: 'tablet' },
          { width: 375, height: 667, name: 'mobile' }
        ];

        for (const viewport of viewports) {
          await page.setViewport(viewport);
          await page.waitForTimeout(500);

          const responsiveState = await page.evaluate(() => {
            const sidebar = document.querySelector('[class*="fixed left-0"], [class*="sidebar"]');
            return {
              width: sidebar ? sidebar.offsetWidth : 0,
              zIndex: sidebar ? window.getComputedStyle(sidebar).zIndex : 0,
              position: sidebar ? window.getComputedStyle(sidebar).position : 'static'
            };
          });

          console.log(`📱 ${viewport.name} (${viewport.width}x${viewport.height}): ${responsiveState.width}px`);
          
          testResults.admin_components_tested.push(`responsive_${viewport.name}`);
        }

      } else {
        testResults.issues_found.push({
          type: 'sidebar_toggle_missing',
          message: 'Sidebar collapse/expand button not found',
          severity: 'high',
          timestamp: new Date().toISOString()
        });
      }

    } catch (error) {
      testResults.issues_found.push({
        type: 'sidebar_change_test_failure',
        message: `Sidebar change test failed: ${error.message}`,
        timestamp: new Date().toISOString()
      });
    }
  }, 30000);
});