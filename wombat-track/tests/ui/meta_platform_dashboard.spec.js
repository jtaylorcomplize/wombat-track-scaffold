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
});