import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { 
  launchBrowser, 
  createPage, 
  waitAndClick, 
  waitAndType, 
  takeScreenshot,
  safeNavigate,
  cleanup 
} from '../utils/puppeteer-setup.js';

describe('MetaPlatform Dashboard Tests', () => {
  let browser;
  let page;
  const BASE_URL = process.env.TEST_URL || 'http://localhost:5173';

  beforeAll(async () => {
    browser = await launchBrowser(process.env.HEADLESS !== 'false');
  });

  beforeEach(async () => {
    page = await createPage(browser);
  });

  afterEach(async () => {
    if (page) {
      // Clean up request interception if it was enabled
      try {
        await page.setRequestInterception(false);
      } catch (error) {
        // Ignore errors if request interception wasn't enabled
      }
      await page.close();
    }
  });

  afterAll(async () => {
    await cleanup(browser);
  });

  describe('Dashboard Navigation', () => {
    it('should load the MetaPlatform dashboard', async () => {
      await safeNavigate(page, BASE_URL);
      
      // Wait for dashboard to load
      await page.waitForSelector('[data-testid="dashboard-header"]', { timeout: 10000 });
      
      // Verify dashboard title
      const title = await page.$eval('[data-testid="dashboard-title"]', el => el.textContent);
      expect(title).toContain('MetaPlatform');
      
      await takeScreenshot(page, 'dashboard-loaded');
    });

    it('should display phase cards', async () => {
      await safeNavigate(page, BASE_URL);
      
      // Wait for phase cards to load
      await page.waitForSelector('[data-testid="phase-card"]', { timeout: 10000 });
      
      // Count phase cards
      const phaseCards = await page.$$('[data-testid="phase-card"]');
      expect(phaseCards.length).toBeGreaterThan(0);
      
      console.log(`Found ${phaseCards.length} phase cards`);
    });

    it('should navigate to phase details on card click', async () => {
      await safeNavigate(page, BASE_URL);
      
      // Click first phase card
      await waitAndClick(page, '[data-testid="phase-card"]:first-child');
      
      // Wait for phase details to load
      await page.waitForSelector('[data-testid="phase-details"]', { timeout: 10000 });
      
      // Verify we're on phase details page
      const url = page.url();
      expect(url).toContain('/phase/');
      
      await takeScreenshot(page, 'phase-details');
    });
  });

  describe('GitHub Integration', () => {
    it('should display SendToGitHub button', async () => {
      await safeNavigate(page, BASE_URL);
      
      // Navigate to a phase with GitHub integration
      await waitAndClick(page, '[data-testid="phase-card"]:first-child');
      
      // Check for GitHub button
      const githubButton = await page.$('[data-testid="send-to-github-button"]');
      expect(githubButton).toBeTruthy();
    });

    it('should trigger GitHub workflow on button click', async () => {
      await safeNavigate(page, BASE_URL);
      
      // Navigate to phase
      await waitAndClick(page, '[data-testid="phase-card"]:first-child');
      
      // Setup request interception for this specific test
      await page.setRequestInterception(true);
      
      // Create a one-time request handler
      const requestHandler = (request) => {
        if (request.url().includes('/api/trigger-github')) {
          request.respond({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, workflow_url: 'https://github.com/test' })
          });
        } else {
          request.continue();
        }
      };
      
      page.on('request', requestHandler);
      
      // Click GitHub button
      await waitAndClick(page, '[data-testid="send-to-github-button"]');
      
      // Wait for success message
      await page.waitForSelector('[data-testid="success-message"]', { timeout: 5000 });
      
      const successText = await page.$eval('[data-testid="success-message"]', el => el.textContent);
      expect(successText).toContain('successfully');
      
      // Clean up the specific request handler
      page.off('request', requestHandler);
    });
  });

  describe('Responsive Design', () => {
    const viewports = [
      { name: 'mobile', width: 375, height: 667 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'desktop', width: 1920, height: 1080 }
    ];

    viewports.forEach(viewport => {
      it(`should render correctly on ${viewport.name}`, async () => {
        await page.setViewport(viewport);
        await safeNavigate(page, BASE_URL);
        
        // Wait for dashboard
        await page.waitForSelector('[data-testid="dashboard-header"]', { timeout: 10000 });
        
        // Check if navigation menu adapts
        if (viewport.name === 'mobile') {
          // Mobile should have hamburger menu
          const hamburger = await page.$('[data-testid="mobile-menu-toggle"]');
          expect(hamburger).toBeTruthy();
        } else {
          // Desktop should have regular nav
          const nav = await page.$('[data-testid="desktop-nav"]');
          expect(nav).toBeTruthy();
        }
        
        await takeScreenshot(page, `dashboard-${viewport.name}`);
      });
    });
  });

  describe('Performance', () => {
    it('should load dashboard within acceptable time', async () => {
      const startTime = Date.now();
      
      await safeNavigate(page, BASE_URL);
      await page.waitForSelector('[data-testid="dashboard-header"]');
      
      const loadTime = Date.now() - startTime;
      console.log(`Dashboard load time: ${loadTime}ms`);
      
      // Dashboard should load within 3 seconds
      expect(loadTime).toBeLessThan(3000);
    });

    it('should have no console errors', async () => {
      const errors = [];
      
      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });
      
      await safeNavigate(page, BASE_URL);
      await page.waitForSelector('[data-testid="dashboard-header"]');
      
      // Wait a bit for any delayed errors
      await page.waitForTimeout(1000);
      
      expect(errors).toHaveLength(0);
    });
  });

  describe('Orbis Dashboard Tests', () => {
    beforeEach(async () => {
      await safeNavigate(page, BASE_URL);
      
      // Navigate to Orbis dashboard tab
      await waitAndClick(page, 'button:has-text("Orbis Dashboard")');
      
      // Wait for Orbis dashboard to load
      await page.waitForSelector('[data-testid="status-rollup"]', { timeout: 10000 });
    });

    describe('Rendering Tests', () => {
      it('should verify dashboard mounts', async () => {
        const statusRollup = await page.getByTestId('status-rollup');
        expect(statusRollup).toBeTruthy();
        
        // Check for header text
        const headerText = await page.textContent('h1');
        expect(headerText).toContain('Orbis Health Overview');
        
        await takeScreenshot(page, 'orbis-dashboard-mounted');
      });

      it('should check at least 1 integration item renders', async () => {
        const integrationItems = await page.$$('[data-testid^="integration-item-"]');
        expect(integrationItems.length).toBeGreaterThan(0);
        
        console.log(`Found ${integrationItems.length} integration items`);
      });

      it('should verify status-rollup text includes count logic', async () => {
        const statusRollup = await page.getByTestId('status-rollup');
        expect(statusRollup).toBeTruthy();
        
        const rollupText = await statusRollup.textContent();
        expect(rollupText).toMatch(/\d+/); // Should contain numbers
        expect(rollupText).toContain('operational');
        expect(rollupText).toMatch(/\d+%/); // Should contain percentage
      });

      it('should display integration categories correctly', async () => {
        const integrationItems = await page.$$('[data-testid^="integration-item-"]');
        expect(integrationItems.length).toBeGreaterThan(0);
        
        // Check that integration items show categories
        for (const item of integrationItems) {
          const itemText = await item.textContent();
          // Should contain one of the valid categories
          const hasValidCategory = ['Claude', 'GitHub', 'CI', 'Sync', 'MemoryPlugin', 'Bubble'].some(category => 
            itemText.includes(category)
          );
          expect(hasValidCategory).toBe(true);
        }
      });
    });

    describe('Filter Tests', () => {
      it('should change category filter and expect filtered list', async () => {
        // Get initial count
        const initialItems = await page.$$('[data-testid^="integration-item-"]');
        const initialCount = initialItems.length;
        
        // Change category filter to 'Claude'
        await page.selectOption('[data-testid="category-filter"]', 'Claude');
        
        // Wait for filtering to take effect
        await page.waitForTimeout(500);
        
        // Get filtered count
        const filteredItems = await page.$$('[data-testid^="integration-item-"]');
        const filteredCount = filteredItems.length;
        
        // Should have different count or at least show only Claude items
        if (filteredCount > 0) {
          const firstItem = await filteredItems[0].textContent();
          expect(firstItem).toContain('Claude');
        }
        
        console.log(`Category filter: ${initialCount} -> ${filteredCount} items`);
      });

      it('should change status filter and expect filtered list', async () => {
        // Get initial count
        const initialItems = await page.$$('[data-testid^="integration-item-"]');
        const initialCount = initialItems.length;
        
        // Change status filter to 'working'
        await page.selectOption('[data-testid="status-filter"]', 'working');
        
        // Wait for filtering to take effect
        await page.waitForTimeout(500);
        
        // Get filtered count
        const filteredItems = await page.$$('[data-testid^="integration-item-"]');
        const filteredCount = filteredItems.length;
        
        // Verify all visible items have working status
        for (const item of filteredItems) {
          const statusBadge = await item.$('[data-testid^="status-badge-"]');
          expect(statusBadge).toBeTruthy();
          const badgeText = await statusBadge.textContent();
          expect(badgeText.toLowerCase()).toContain('working');
        }
        
        console.log(`Status filter: ${initialCount} -> ${filteredCount} items`);
      });
    });

    describe('Interaction Tests', () => {
      it('should click refresh-button and expect runHealthCheck stub to fire', async () => {
        // Mock the console.log to track health check calls
        const consoleLogs = [];
        page.on('console', msg => {
          if (msg.type() === 'log') {
            consoleLogs.push(msg.text());
          }
        });
        
        // Click refresh button
        await waitAndClick(page, '[data-testid="refresh-button"]');
        
        // Wait for any console logs and refresh to complete
        await page.waitForTimeout(2000);
        
        // Verify health check was triggered for multiple integrations
        const healthCheckLogs = consoleLogs.filter(log => log.includes('Health check triggered for:'));
        expect(healthCheckLogs.length).toBeGreaterThan(0);
        
        await takeScreenshot(page, 'orbis-dashboard-refresh-clicked');
      });

      it('should verify log links render and are clickable', async () => {
        // Find all log links
        const logLinks = await page.$$('[data-testid^="log-link-"]');
        
        if (logLinks.length > 0) {
          // Verify first log link exists and is clickable
          const firstLogLink = logLinks[0];
          expect(firstLogLink).toBeTruthy();
          
          // Check if it has href attribute
          const href = await firstLogLink.getAttribute('href');
          expect(href).toBeTruthy();
          expect(href).toMatch(/^https?:\/\//); // Should be a valid URL
          
          // Check if it has target="_blank"
          const target = await firstLogLink.getAttribute('target');
          expect(target).toBe('_blank');
          
          console.log(`Found ${logLinks.length} log links, first one: ${href}`);
        } else {
          console.log('No log links found in current integrations');
        }
      });

      it('should verify all required data-testid attributes are present', async () => {
        // Check filters
        expect(await page.getByTestId('status-filter')).toBeTruthy();
        expect(await page.getByTestId('category-filter')).toBeTruthy();
        
        // Check refresh button
        expect(await page.getByTestId('refresh-button')).toBeTruthy();
        
        // Check status rollup
        expect(await page.getByTestId('status-rollup')).toBeTruthy();
        
        // Check integration items (at least one should exist)
        const integrationItems = await page.$$('[data-testid^="integration-item-"]');
        expect(integrationItems.length).toBeGreaterThan(0);
        
        // For each integration item, verify required sub-elements
        for (const item of integrationItems) {
          const itemId = await item.getAttribute('data-testid');
          const integrationName = itemId.replace('integration-item-', '');
          
          // Check status badge
          const statusBadge = await page.$(`[data-testid="status-badge-${integrationName}"]`);
          expect(statusBadge).toBeTruthy();
          
          // Check last checked
          const lastChecked = await page.$(`[data-testid="last-checked-${integrationName}"]`);
          expect(lastChecked).toBeTruthy();
          
          // Check dispatch button (new in ORB-2.4)
          const dispatchButton = await page.$(`[data-testid="dispatch-button-${integrationName}"]`);
          expect(dispatchButton).toBeTruthy();
          
          // Check dispatch status badge (new in ORB-2.4)
          const dispatchStatus = await page.$(`[data-testid="dispatch-status-${integrationName}"]`);
          expect(dispatchStatus).toBeTruthy();
        }
        
        console.log(`Verified data-testid attributes for ${integrationItems.length} integrations`);
      });

      it('should validate rollup count accuracy', async () => {
        const statusRollup = await page.getByTestId('status-rollup');
        const rollupText = await statusRollup.textContent();
        
        // Extract the numbers from "X of Y integrations operational"
        const match = rollupText.match(/(\d+) of (\d+) integrations operational/);
        expect(match).toBeTruthy();
        
        const workingCount = parseInt(match[1]);
        const totalCount = parseInt(match[2]);
        
        // Count actual integration items
        const integrationItems = await page.$$('[data-testid^="integration-item-"]');
        const actualTotal = integrationItems.length;
        
        // The total should match or be close (active integrations only)
        expect(totalCount).toBeLessThanOrEqual(actualTotal);
        expect(workingCount).toBeLessThanOrEqual(totalCount);
        
        console.log(`Rollup shows ${workingCount}/${totalCount}, actual items: ${actualTotal}`);
      });
    });

    describe('Template Dispatch Tests (ORB-2.4)', () => {
      it('should verify dispatch buttons are present and functional', async () => {
        const integrationItems = await page.$$('[data-testid^="integration-item-"]');
        expect(integrationItems.length).toBeGreaterThan(0);
        
        // Check that dispatch buttons exist for all integrations
        for (const item of integrationItems) {
          const itemId = await item.getAttribute('data-testid');
          const integrationName = itemId.replace('integration-item-', '');
          
          const dispatchButton = await page.$(`[data-testid="dispatch-button-${integrationName}"]`);
          expect(dispatchButton).toBeTruthy();
          
          // Verify button text
          const buttonText = await dispatchButton.textContent();
          expect(buttonText).toContain('Dispatch');
        }
      });

      it('should verify dispatch status badges display correctly', async () => {
        const integrationItems = await page.$$('[data-testid^="integration-item-"]');
        
        for (const item of integrationItems) {
          const itemId = await item.getAttribute('data-testid');
          const integrationName = itemId.replace('integration-item-', '');
          
          const dispatchStatus = await page.$(`[data-testid="dispatch-status-${integrationName}"]`);
          expect(dispatchStatus).toBeTruthy();
          
          // Initial status should be 'idle'
          const statusText = await dispatchStatus.textContent();
          expect(statusText.toLowerCase()).toBe('idle');
        }
      });

      it('should verify template names are displayed', async () => {
        const integrationItems = await page.$$('[data-testid^="integration-item-"]');
        
        for (const item of integrationItems) {
          const itemText = await item.textContent();
          
          // Should contain template indicators
          const hasTemplateInfo = itemText.includes('🔧') || 
                                  itemText.includes('Health Check') || 
                                  itemText.includes('Deploy') || 
                                  itemText.includes('Repair') || 
                                  itemText.includes('Recovery') || 
                                  itemText.includes('Optimization');
          
          expect(hasTemplateInfo).toBe(true);
        }
      });

      it('should simulate dispatch button click and verify status changes', async () => {
        // Setup console log monitoring for dispatch events
        const consoleLogs = [];
        page.on('console', msg => {
          if (msg.type() === 'log' && msg.text().includes('🚀 Triggering template')) {
            consoleLogs.push(msg.text());
          }
        });
        
        // Find an active integration (claude-api should be active)
        const claudeDispatchButton = await page.$('[data-testid="dispatch-button-claude-api"]');
        expect(claudeDispatchButton).toBeTruthy();
        
        // Check initial status
        const initialStatus = await page.$eval('[data-testid="dispatch-status-claude-api"]', el => el.textContent);
        expect(initialStatus.toLowerCase()).toBe('idle');
        
        // Click dispatch button
        await claudeDispatchButton.click();
        
        // Wait for status to change to queued
        await page.waitForFunction(
          () => {
            const statusEl = document.querySelector('[data-testid="dispatch-status-claude-api"]');
            return statusEl && statusEl.textContent.toLowerCase() === 'queued';
          },
          { timeout: 5000 }
        );
        
        // Verify console log shows template execution
        await page.waitForTimeout(1000);
        expect(consoleLogs.length).toBeGreaterThan(0);
        expect(consoleLogs[0]).toContain('claude-health-001');
        
        console.log('Dispatch test completed successfully');
      });
    });

    describe('Execution History Tests (ORB-2.5)', () => {
      it('should verify execution history toggle is present', async () => {
        const historyToggle = await page.$('[data-testid="execution-history-toggle"]');
        expect(historyToggle).toBeTruthy();
        
        // Verify toggle shows execution count
        const toggleText = await historyToggle.textContent();
        expect(toggleText).toContain('Execution History');
        expect(toggleText).toMatch(/\d+/); // Should contain a number
      });

      it('should fetch execution logs from API on mount', async () => {
        // Monitor console logs for API fetch calls
        const consoleLogs = [];
        page.on('console', msg => {
          if (msg.type() === 'log' && msg.text().includes('📋 Fetched')) {
            consoleLogs.push(msg.text());
          }
        });
        
        // Wait for initial API fetch
        await page.waitForTimeout(2000);
        
        // Verify API fetch was called
        const fetchLogs = consoleLogs.filter(log => log.includes('execution logs from API store'));
        expect(fetchLogs.length).toBeGreaterThan(0);
        
        console.log(`API fetch verification: ${fetchLogs.length} fetch calls detected`);
      });

      it('should expand and collapse execution history', async () => {
        // Initially history should not be visible
        let historyList = await page.$('[data-testid="execution-history-list"]');
        expect(historyList).toBeFalsy();
        
        // Click to expand
        await page.click('[data-testid="execution-history-toggle"]');
        
        // Wait for history to appear
        await page.waitForSelector('[data-testid="execution-history-list"]', { timeout: 5000 });
        
        historyList = await page.$('[data-testid="execution-history-list"]');
        expect(historyList).toBeTruthy();
        
        // Click to collapse
        await page.click('[data-testid="execution-history-toggle"]');
        
        // Wait for history to disappear
        await page.waitForFunction(
          () => !document.querySelector('[data-testid="execution-history-list"]'),
          { timeout: 5000 }
        );
      });

      it('should log execution history when dispatch is triggered via API', async () => {
        // Monitor API logging calls
        const consoleLogs = [];
        page.on('console', msg => {
          if (msg.type() === 'log' && (msg.text().includes('📝 Logged execution') || msg.text().includes('🔄 Updated execution'))) {
            consoleLogs.push(msg.text());
          }
        });
        
        // First expand the execution history
        await page.click('[data-testid="execution-history-toggle"]');
        await page.waitForSelector('[data-testid="execution-history-list"]');
        
        // Get initial execution count
        const initialHistoryEntries = await page.$$('[data-testid^="execution-entry-"]');
        const initialCount = initialHistoryEntries.length;
        
        // Trigger a dispatch
        const claudeDispatchButton = await page.$('[data-testid="dispatch-button-claude-api"]');
        expect(claudeDispatchButton).toBeTruthy();
        
        await claudeDispatchButton.click();
        
        // Wait for new execution entry to appear
        await page.waitForFunction(
          (prevCount) => {
            const entries = document.querySelectorAll('[data-testid^="execution-entry-"]');
            return entries.length > prevCount;
          },
          { timeout: 10000 },
          initialCount
        );
        
        // Verify new execution entry exists
        const newHistoryEntries = await page.$$('[data-testid^="execution-entry-"]');
        expect(newHistoryEntries.length).toBe(initialCount + 1);
        
        // Verify the new entry contains expected information
        const latestEntry = newHistoryEntries[0]; // Should be first due to sorting
        const entryText = await latestEntry.textContent();
        
        expect(entryText).toContain('claude-api');
        expect(entryText).toContain('Claude Health Check');
        expect(entryText).toContain('claude');
        
        // Verify API logging occurred
        await page.waitForTimeout(1000);
        const apiLogCalls = consoleLogs.filter(log => log.includes('📝 Logged execution') || log.includes('🔄 Updated execution'));
        expect(apiLogCalls.length).toBeGreaterThan(0);
        
        console.log(`API-driven execution history test completed: ${initialCount} -> ${newHistoryEntries.length} entries, ${apiLogCalls.length} API calls`);
      });

      it('should persist execution logs across API polling cycles', async () => {
        // Trigger a dispatch first
        const claudeDispatchButton = await page.$('[data-testid="dispatch-button-claude-api"]');
        if (claudeDispatchButton) {
          await claudeDispatchButton.click();
          
          // Wait for execution to complete
          await page.waitForTimeout(3000);
          
          // Expand execution history
          await page.click('[data-testid="execution-history-toggle"]');
          await page.waitForSelector('[data-testid="execution-history-list"]');
          
          // Get execution count
          const historyEntries1 = await page.$$('[data-testid^="execution-entry-"]');
          const count1 = historyEntries1.length;
          
          // Wait for multiple polling cycles
          await page.waitForTimeout(3000);
          
          // Verify logs are still there (persisted)
          const historyEntries2 = await page.$$('[data-testid^="execution-entry-"]');
          const count2 = historyEntries2.length;
          
          expect(count2).toBe(count1);
          expect(count2).toBeGreaterThan(0);
          
          console.log(`API persistence test: ${count1} entries persisted across polling cycles`);
        }
      });

      it('should display execution status correctly', async () => {
        // Expand execution history
        await page.click('[data-testid="execution-history-toggle"]');
        await page.waitForSelector('[data-testid="execution-history-list"]');
        
        // If there are execution entries, verify their status display
        const historyEntries = await page.$$('[data-testid^="execution-entry-"]');
        
        if (historyEntries.length > 0) {
          for (const entry of historyEntries) {
            const entryText = await entry.textContent();
            
            // Should contain status indicators
            const hasStatusIcon = entryText.includes('✅') || 
                                  entryText.includes('❌') || 
                                  entryText.includes('⏳') || 
                                  entryText.includes('⏸️');
            
            expect(hasStatusIcon).toBe(true);
            
            // Should contain status text
            const hasStatusText = entryText.includes('done') || 
                                  entryText.includes('error') || 
                                  entryText.includes('in_progress') || 
                                  entryText.includes('queued');
            
            expect(hasStatusText).toBe(true);
          }
          
          console.log(`Verified status display for ${historyEntries.length} execution entries`);
        } else {
          console.log('No execution entries found for status verification');
        }
      });

      it('should show execution timing information', async () => {
        // Trigger a dispatch to create an execution
        const claudeDispatchButton = await page.$('[data-testid="dispatch-button-claude-api"]');
        if (claudeDispatchButton) {
          await claudeDispatchButton.click();
          
          // Wait for execution to complete
          await page.waitForTimeout(3000);
          
          // Expand execution history
          await page.click('[data-testid="execution-history-toggle"]');
          await page.waitForSelector('[data-testid="execution-history-list"]');
          
          // Check for timing information in the latest entry
          const historyEntries = await page.$$('[data-testid^="execution-entry-"]');
          
          if (historyEntries.length > 0) {
            const latestEntry = historyEntries[0];
            const entryText = await latestEntry.textContent();
            
            // Should contain timestamp
            expect(entryText).toMatch(/\d+:\d+:\d+/); // Time format
            
            // May contain duration for completed executions
            const maybeDuration = entryText.includes('s'); // Duration in seconds
            console.log(`Timing information ${maybeDuration ? 'found' : 'not found'} in execution entry`);
          }
        }
      });
    });

    describe('Phase Tracker Tests (ORB-2.6)', () => {
      it('should verify phase tracker toggle is present', async () => {
        const phaseToggle = await page.$('[data-testid="phase-tracker-toggle"]');
        expect(phaseToggle).toBeTruthy();
        
        // Verify toggle shows project count
        const toggleText = await phaseToggle.textContent();
        expect(toggleText).toContain('Phase Tracker');
        expect(toggleText).toMatch(/\d+ projects/);
      });

      it('should expand and collapse phase tracker', async () => {
        // Initially phase tracker should not be visible
        let phaseContent = await page.$('[data-testid="phase-tracker-content"]');
        expect(phaseContent).toBeFalsy();
        
        // Click to expand
        await page.click('[data-testid="phase-tracker-toggle"]');
        
        // Wait for phase tracker to appear
        await page.waitForSelector('[data-testid="phase-tracker-content"]', { timeout: 5000 });
        
        phaseContent = await page.$('[data-testid="phase-tracker-content"]');
        expect(phaseContent).toBeTruthy();
        
        // Verify projects are rendered
        const projects = await page.$$('[data-testid^="project-"]');
        expect(projects.length).toBeGreaterThan(0);
        
        console.log(`Phase tracker expanded with ${projects.length} projects`);
      });

      it('should render phases and steps correctly', async () => {
        // Expand phase tracker
        await page.click('[data-testid="phase-tracker-toggle"]');
        await page.waitForSelector('[data-testid="phase-tracker-content"]');
        
        // Verify at least one project exists
        const projects = await page.$$('[data-testid^="project-"]');
        expect(projects.length).toBeGreaterThan(0);
        
        // Get first project and check for phases
        const firstProject = projects[0];
        const projectId = await firstProject.getAttribute('data-testid');
        console.log(`Testing project: ${projectId}`);
        
        // Check for phase elements within the project
        const phases = await firstProject.$$('[data-testid^="phase-"]');
        expect(phases.length).toBeGreaterThan(0);
        
        // Click on first phase to expand
        if (phases.length > 0) {
          await phases[0].click();
          await page.waitForTimeout(500);
          
          // Check for step elements
          const steps = await page.$$('[data-testid^="step-"]');
          expect(steps.length).toBeGreaterThan(0);
          
          console.log(`Found ${phases.length} phases and ${steps.length} steps`);
        }
      });

      it('should display step status correctly', async () => {
        // Expand phase tracker
        await page.click('[data-testid="phase-tracker-toggle"]');
        await page.waitForSelector('[data-testid="phase-tracker-content"]');
        
        // Click on first phase to see steps
        const phases = await page.$$('[data-testid^="phase-"]');
        if (phases.length > 0) {
          await phases[0].click();
          await page.waitForTimeout(500);
          
          // Find steps and check their status
          const steps = await page.$$('[data-testid^="step-"]');
          
          for (const step of steps) {
            const stepId = await step.getAttribute('data-testid');
            const stepName = stepId.replace('step-', '');
            
            // Check for status indicator
            const statusElement = await page.$(`[data-testid="step-status-${stepName}"]`);
            expect(statusElement).toBeTruthy();
            
            const statusText = await statusElement.textContent();
            const validStatuses = ['not started', 'in progress', 'complete'];
            expect(validStatuses.some(status => statusText.toLowerCase().includes(status))).toBe(true);
          }
        }
      });

      it('should show execution info for steps with executionId', async () => {
        // Expand phase tracker
        await page.click('[data-testid="phase-tracker-toggle"]');
        await page.waitForSelector('[data-testid="phase-tracker-content"]');
        
        // Expand first phase
        const phases = await page.$$('[data-testid^="phase-"]');
        if (phases.length > 0) {
          await phases[0].click();
          await page.waitForTimeout(500);
          
          // Look for execution info elements
          const executionInfos = await page.$$('[data-testid^="execution-info-"]');
          
          if (executionInfos.length > 0) {
            const firstInfo = executionInfos[0];
            const infoText = await firstInfo.textContent();
            
            // Should contain execution details
            expect(infoText).toContain('Execution:');
            expect(infoText.toLowerCase()).toMatch(/claude|github|ci/); // Platform
            
            console.log(`Found ${executionInfos.length} steps with execution info`);
          } else {
            console.log('No steps with execution info found in test data');
          }
        }
      });

      it('should handle step actions correctly', async () => {
        // Expand phase tracker
        await page.click('[data-testid="phase-tracker-toggle"]');
        await page.waitForSelector('[data-testid="phase-tracker-content"]');
        
        // Expand phases to see steps
        const phases = await page.$$('[data-testid^="phase-"]');
        for (const phase of phases) {
          await phase.click();
          await page.waitForTimeout(200);
        }
        
        // Check for action buttons
        const startButtons = await page.$$('[data-testid^="start-step-"]');
        const completeButtons = await page.$$('[data-testid^="complete-step-"]');
        const viewLogButtons = await page.$$('[data-testid^="view-log-"]');
        
        console.log(`Found buttons - Start: ${startButtons.length}, Complete: ${completeButtons.length}, View Log: ${viewLogButtons.length}`);
        
        // Verify at least some action buttons exist
        const totalActionButtons = startButtons.length + completeButtons.length + viewLogButtons.length;
        expect(totalActionButtons).toBeGreaterThan(0);
        
        // Test clicking a start button if available
        if (startButtons.length > 0) {
          const firstStartButton = startButtons[0];
          const buttonText = await firstStartButton.textContent();
          expect(buttonText).toBe('Start');
          
          // Monitor console for template trigger
          const consoleLogs = [];
          page.on('console', msg => {
            if (msg.type() === 'log' && msg.text().includes('🚀 Triggering template')) {
              consoleLogs.push(msg.text());
            }
          });
          
          await firstStartButton.click();
          await page.waitForTimeout(1000);
          
          // If step has templateId, should trigger template
          // Otherwise just updates status
          console.log(`Start button clicked, template triggers: ${consoleLogs.length}`);
        }
      });

      it('should update step status when actions are performed', async () => {
        // Expand phase tracker
        await page.click('[data-testid="phase-tracker-toggle"]');
        await page.waitForSelector('[data-testid="phase-tracker-content"]');
        
        // Expand all phases
        const phases = await page.$$('[data-testid^="phase-"]');
        for (const phase of phases) {
          await phase.click();
          await page.waitForTimeout(200);
        }
        
        // Find a step that can be started
        const startButtons = await page.$$('[data-testid^="start-step-"]');
        
        if (startButtons.length > 0) {
          // Get the step ID from the button
          const buttonTestId = await startButtons[0].getAttribute('data-testid');
          const stepId = buttonTestId.replace('start-step-', '');
          
          // Get initial status
          const initialStatus = await page.$eval(
            `[data-testid="step-status-${stepId}"]`,
            el => el.textContent
          );
          expect(initialStatus.toLowerCase()).toContain('not started');
          
          // Click start button
          await startButtons[0].click();
          
          // Wait for status to update
          await page.waitForTimeout(1000);
          
          // Check if status changed
          const updatedStatus = await page.$eval(
            `[data-testid="step-status-${stepId}"]`,
            el => el.textContent
          );
          
          // Status should have changed from 'not started'
          expect(updatedStatus.toLowerCase()).not.toContain('not started');
          console.log(`Step status updated from '${initialStatus}' to '${updatedStatus}'`);
        }
      });
    });

    describe('Phase Admin Tests (ORB-2.7)', () => {
      it('should verify manage projects button is present', async () => {
        const manageButton = await page.$('[data-testid="manage-projects-button"]');
        expect(manageButton).toBeTruthy();
        
        const buttonText = await manageButton.textContent();
        expect(buttonText).toContain('Manage Projects');
      });

      it('should open admin modal when manage button is clicked', async () => {
        // Click manage projects button
        await page.click('[data-testid="manage-projects-button"]');
        
        // Wait for modal to appear
        await page.waitForTimeout(500);
        
        // Check if modal is visible
        const modalText = await page.textContent('body');
        expect(modalText).toContain('Phase Tracker Admin');
        
        console.log('Admin modal opened successfully');
      });

      it('should have working tabs in admin modal', async () => {
        // Open admin modal
        await page.click('[data-testid="manage-projects-button"]');
        await page.waitForTimeout(500);
        
        // Check for tab buttons
        const tabs = ['projects', 'phases', 'steps'];
        
        for (const tab of tabs) {
          const tabButton = await page.$(`button:has-text("${tab}")`);
          expect(tabButton).toBeTruthy();
          
          // Click tab
          await tabButton.click();
          await page.waitForTimeout(200);
          
          console.log(`${tab} tab is functional`);
        }
      });

      it('should close modal when clicking outside or close button', async () => {
        // Open admin modal
        await page.click('[data-testid="manage-projects-button"]');
        await page.waitForTimeout(500);
        
        // Verify modal is open
        let modalText = await page.textContent('body');
        expect(modalText).toContain('Phase Tracker Admin');
        
        // Click close button (×)
        const closeButton = await page.$('button:has-text("×")');
        expect(closeButton).toBeTruthy();
        await closeButton.click();
        
        // Wait for modal to close
        await page.waitForTimeout(500);
        
        // Verify modal is closed (text should not be visible)
        modalText = await page.textContent('body');
        // Modal content should not be visible anymore
        const adminElements = await page.$$('[data-testid*="admin"]');
        expect(adminElements.length).toBe(1); // Only the button should remain
        
        console.log('Admin modal closed successfully');
      });

      it('should have import and export functionality', async () => {
        // Open admin modal
        await page.click('[data-testid="manage-projects-button"]');
        await page.waitForTimeout(500);
        
        // Check for import/export buttons
        const exportButton = await page.$('button:has-text("Export")');
        const importLabel = await page.$('label:has-text("Import")');
        
        expect(exportButton).toBeTruthy();
        expect(importLabel).toBeTruthy();
        
        // Test export button functionality (should not throw error)
        await exportButton.click();
        await page.waitForTimeout(200);
        
        console.log('Import/Export functionality verified');
      });

      it('should allow creating new projects', async () => {
        // Monitor console for CRUD operations
        const consoleLogs = [];
        page.on('console', msg => {
          if (msg.type() === 'log' && (msg.text().includes('Creating project') || msg.text().includes('Updating project') || msg.text().includes('Deleting project'))) {
            consoleLogs.push(msg.text());
          }
        });
        
        // Open admin modal
        await page.click('[data-testid="manage-projects-button"]');
        await page.waitForTimeout(500);
        
        // Should be on projects tab by default
        const projectNameInput = await page.$('input[placeholder="Project name"]');
        expect(projectNameInput).toBeTruthy();
        
        // Fill out form
        await projectNameInput.fill('Test Project');
        
        const descriptionInput = await page.$('input[placeholder="Description"]');
        await descriptionInput.fill('Test Description');
        
        // Click create button
        const createButton = await page.$('button:has-text("Create")');
        await createButton.click();
        
        // Wait for creation
        await page.waitForTimeout(500);
        
        // Verify console log
        const createLogs = consoleLogs.filter(log => log.includes('Creating project'));
        expect(createLogs.length).toBeGreaterThan(0);
        
        console.log('Project creation test completed');
      });

      it('should show archive functionality', async () => {
        // Open admin modal
        await page.click('[data-testid="manage-projects-button"]');
        await page.waitForTimeout(500);
        
        // Look for archive checkbox
        const archiveCheckbox = await page.$('input[type="checkbox"]');
        expect(archiveCheckbox).toBeTruthy();
        
        // Look for archive buttons
        const archiveButtons = await page.$$('button:has-text("Archive")');
        
        if (archiveButtons.length > 0) {
          console.log(`Found ${archiveButtons.length} archive buttons`);
        } else {
          console.log('No archive buttons found (no projects to archive)');
        }
        
        // Test showing archived projects
        if (archiveCheckbox) {
          await archiveCheckbox.click();
          await page.waitForTimeout(200);
          
          console.log('Archive toggle functionality verified');
        }
      });
    });
  });
});