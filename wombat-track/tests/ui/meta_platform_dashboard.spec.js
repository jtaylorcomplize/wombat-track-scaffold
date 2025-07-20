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
      expect(title).toContain('Wombat Track');
      
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
      
      // Navigate to Orbis dashboard tab using CSS selector
      await waitAndClick(page, 'button.nav-link:nth-child(2)');
      
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

      it('should dispatch integration and show status transition', async () => {
        // Click dispatch button for claude-api (first active integration)
        await waitAndClick(page, '[data-testid="dispatch-button-claude-api"]');
        
        // Wait for status to change to Queued
        await page.waitForSelector('[data-testid="dispatch-status-claude-api"]:has-text("queued")', { timeout: 3000 });
        
        // Wait for status to change to Done
        await page.waitForSelector('[data-testid="dispatch-status-claude-api"]:has-text("done")', { timeout: 3000 });
        
        // Take screenshot after dispatch is complete
        await takeScreenshot(page, 'orbis-dispatch-confirmed');
        
        console.log('✅ Dispatch test completed successfully');
      });

      it('should verify dispatch button is disabled for inactive integrations', async () => {
        // Find an inactive integration (sync-service should be inactive)
        const inactiveButton = await page.$('[data-testid="dispatch-button-sync-service"]');
        
        if (inactiveButton) {
          const isDisabled = await page.evaluate(button => button.disabled, inactiveButton);
          expect(isDisabled).toBe(true);
          
          console.log('✅ Dispatch button correctly disabled for inactive integrations');
        } else {
          console.log('ℹ️  No inactive integrations found to test disabled state');
        }
      });

      it('should verify dispatch status badges exist for all integrations', async () => {
        const integrationItems = await page.$$('[data-testid^="integration-item-"]');
        
        for (const item of integrationItems) {
          const itemId = await item.getAttribute('data-testid');
          const integrationName = itemId.replace('integration-item-', '');
          
          // Check dispatch button exists
          const dispatchButton = await page.$(`[data-testid="dispatch-button-${integrationName}"]`);
          expect(dispatchButton).toBeTruthy();
          
          // Check dispatch status badge exists
          const statusBadge = await page.$(`[data-testid="dispatch-status-${integrationName}"]`);
          expect(statusBadge).toBeTruthy();
        }
        
        console.log(`Verified dispatch components for ${integrationItems.length} integrations`);
      });
    });
  });
});