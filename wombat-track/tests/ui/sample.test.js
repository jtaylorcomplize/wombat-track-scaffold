import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { launchBrowser, createPage, safeNavigate, cleanup } from '../utils/puppeteer-setup.js';

describe('Sample Puppeteer Test', () => {
  let browser;
  let page;

  beforeAll(async () => {
    browser = await launchBrowser(true);
    page = await createPage(browser);
  });

  afterAll(async () => {
    await cleanup(browser);
  });

  it('should navigate to Google and search', async () => {
    // Navigate to Google
    await safeNavigate(page, 'https://www.google.com');
    
    // Type in search box
    await page.type('input[name="q"]', 'Puppeteer automation');
    
    // Press Enter
    await page.keyboard.press('Enter');
    
    // Wait for results
    await page.waitForSelector('#search', { timeout: 5000 });
    
    // Get page title
    const title = await page.title();
    expect(title).toContain('Puppeteer automation');
  });

  it('should take a screenshot', async () => {
    await safeNavigate(page, 'https://example.com');
    
    // Take screenshot
    await page.screenshot({ path: 'example-screenshot.png' });
    
    // Verify page loaded
    const heading = await page.$eval('h1', el => el.textContent);
    expect(heading).toBe('Example Domain');
  });

  it('should evaluate JavaScript in the page context', async () => {
    await safeNavigate(page, 'https://example.com');
    
    // Execute JS in page context
    const dimensions = await page.evaluate(() => {
      return {
        width: document.documentElement.clientWidth,
        height: document.documentElement.clientHeight,
        deviceScaleFactor: window.devicePixelRatio
      };
    });
    
    expect(dimensions.width).toBeGreaterThan(0);
    expect(dimensions.height).toBeGreaterThan(0);
  });
});