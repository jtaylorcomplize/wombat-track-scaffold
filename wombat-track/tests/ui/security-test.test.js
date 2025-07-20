import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { 
  launchBrowser, 
  createPage, 
  setupRequestInterception,
  cleanup 
} from '../utils/puppeteer-setup.js';

describe('Security Fixes Test', () => {
  let browser;
  let page;

  beforeAll(async () => {
    browser = await launchBrowser(true);
  });

  beforeEach(async () => {
    page = await createPage(browser);
  });

  afterEach(async () => {
    if (page) {
      try {
        await page.setRequestInterception(false);
      } catch (error) {
        // Ignore if not enabled
      }
      await page.close();
    }
  });

  afterAll(async () => {
    await cleanup(browser);
  });

  it('should properly clean up request interception', async () => {
    // Test request interception setup and cleanup
    const requestHandler = (request) => {
      request.continue();
    };
    
    const cleanupHandler = await setupRequestInterception(page, requestHandler);
    
    // Navigate to test page
    await page.goto('https://example.com', { waitUntil: 'networkidle2' });
    
    // Clean up handler
    cleanupHandler();
    
    // Verify page is functional
    const title = await page.title();
    expect(title).toContain('Example');
  });

  it('should filter console errors properly', async () => {
    const errors = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    // Navigate to a page
    await page.goto('https://example.com', { waitUntil: 'networkidle2' });
    
    // Check that no sensitive errors are logged
    const sensitiveErrors = errors.filter(error => 
      error.includes('password') || 
      error.includes('token') || 
      error.includes('sensitive')
    );
    
    expect(sensitiveErrors).toHaveLength(0);
  });
});