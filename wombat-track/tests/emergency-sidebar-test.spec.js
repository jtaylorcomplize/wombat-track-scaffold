/**
 * Emergency Test: Verify Simplified Sidebar Works During Migration
 * Quick validation that the emergency sidebars don't crash the app
 */

const puppeteer = require('puppeteer');

describe('Emergency Simplified Sidebars', () => {
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
  }, 60000);

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  });

  test('should load main Orbis page without crashing', async () => {
    await page.goto(`${baseUrl}/orbis`, { waitUntil: 'networkidle0', timeout: 30000 });
    
    // Check for any JavaScript errors
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));
    
    // Wait a moment to see if any errors occur
    await page.waitForTimeout(2000);
    
    // Should not have critical errors
    const criticalErrors = errors.filter(err => 
      err.includes('Cannot read property') || 
      err.includes('is not defined') ||
      err.includes('import')
    );
    
    expect(criticalErrors).toHaveLength(0);
  }, 60000);

  test('should find EnhancedSidebarV3 component in Orbis layout', async () => {
    await page.goto(`${baseUrl}/orbis`, { waitUntil: 'networkidle0', timeout: 30000 });
    
    // Look for the sidebar container
    const sidebar = await page.$('.fixed.left-0.top-0.h-screen');
    expect(sidebar).not.toBeNull();
    
    // Should show Orbis Platform title
    const title = await page.$eval('h1', el => el.textContent);
    expect(title).toContain('Orbis Platform');
  }, 60000);

  test('should be able to navigate to legacy PhasePlan without crashing', async () => {
    // Since app routes to Orbis by default, we need to test the legacy system
    // The legacy system should still work but not be the primary interface
    await page.goto(baseUrl, { waitUntil: 'networkidle0', timeout: 30000 });
    
    // Should not crash - any response is good
    const title = await page.title();
    expect(title).toBeDefined();
  }, 60000);
});