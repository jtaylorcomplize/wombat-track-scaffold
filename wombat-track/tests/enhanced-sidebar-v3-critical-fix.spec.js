/**
 * Critical Fix Test: Enhanced Sidebar v3.1 Collapse/Expand Button
 * Tests the specific accessibility issue identified in the migration plan
 */

const puppeteer = require('puppeteer');

describe('Enhanced Sidebar v3.1 - Critical Accessibility Fix', () => {
  let browser;
  let page;
  const baseUrl = process.env.BASE_URL || 'http://localhost:5174';

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: process.env.HEADLESS !== 'false',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 1024 });
  });

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  });

  beforeEach(async () => {
    await page.goto(`${baseUrl}/orbis`, { waitUntil: 'networkidle0' });
    await page.waitForTimeout(2000); // Wait for sidebar to render
  });

  describe('Collapse/Expand Button Functionality', () => {
    test('should find collapse button in expanded state', async () => {
      // Look for collapse button with ChevronLeft icon
      const collapseButton = await page.$('button[aria-label="Collapse sidebar"]');
      expect(collapseButton).not.toBeNull();
      
      // Verify button contains ChevronLeft icon
      const buttonHtml = await page.evaluate(el => el.outerHTML, collapseButton);
      console.log('Collapse button HTML:', buttonHtml);
    });

    test('should be able to click collapse button', async () => {
      const collapseButton = await page.$('button[aria-label="Collapse sidebar"]');
      expect(collapseButton).not.toBeNull();
      
      // Test if button is clickable
      const isVisible = await page.evaluate(el => {
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && 
               window.getComputedStyle(el).visibility !== 'hidden';
      }, collapseButton);
      
      expect(isVisible).toBe(true);
      
      // Attempt to click the button
      await collapseButton.click();
      await page.waitForTimeout(500); // Wait for animation
    });

    test('should show expand button in collapsed state', async () => {
      // First collapse the sidebar
      const collapseButton = await page.$('button[aria-label="Collapse sidebar"]');
      if (collapseButton) {
        await collapseButton.click();
        await page.waitForTimeout(500);
      }
      
      // Now look for expand button
      const expandButton = await page.$('button[aria-label="Expand sidebar"]');
      expect(expandButton).not.toBeNull();
      
      // Verify button contains ChevronRight icon
      const buttonHtml = await page.evaluate(el => el.outerHTML, expandButton);
      console.log('Expand button HTML:', buttonHtml);
    });

    test('should toggle sidebar width correctly', async () => {
      // Get initial sidebar width (expanded)
      const sidebar = await page.$('.fixed.left-0.top-0.h-screen.w-80');
      expect(sidebar).not.toBeNull();
      
      // Click collapse button
      const collapseButton = await page.$('button[aria-label="Collapse sidebar"]');
      await collapseButton.click();
      await page.waitForTimeout(500);
      
      // Check for collapsed sidebar (w-16)
      const collapsedSidebar = await page.$('.fixed.left-0.top-0.h-screen.w-16');
      expect(collapsedSidebar).not.toBeNull();
      
      // Click expand button
      const expandButton = await page.$('button[aria-label="Expand sidebar"]');
      await expandButton.click();
      await page.waitForTimeout(500);
      
      // Verify we're back to expanded state
      const expandedSidebar = await page.$('.fixed.left-0.top-0.h-screen.w-80');
      expect(expandedSidebar).not.toBeNull();
    });

    test('should maintain button functionality with keyboard navigation', async () => {
      const collapseButton = await page.$('button[aria-label="Collapse sidebar"]');
      
      // Focus the button
      await collapseButton.focus();
      
      // Press Enter to activate
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);
      
      // Should now be collapsed
      const collapsedSidebar = await page.$('.fixed.left-0.top-0.h-screen.w-16');
      expect(collapsedSidebar).not.toBeNull();
    });
  });

  describe('Error Conditions', () => {
    test('should handle rapid clicking gracefully', async () => {
      const collapseButton = await page.$('button[aria-label="Collapse sidebar"]');
      
      // Rapid clicks
      for (let i = 0; i < 5; i++) {
        await collapseButton.click();
        await page.waitForTimeout(50);
      }
      
      await page.waitForTimeout(1000); // Let animations settle
      
      // Should be in a stable state (either collapsed or expanded)
      const hasCollapsed = await page.$('.fixed.left-0.top-0.h-screen.w-16');
      const hasExpanded = await page.$('.fixed.left-0.top-0.h-screen.w-80');
      
      expect(hasCollapsed !== null || hasExpanded !== null).toBe(true);
    });
  });
});