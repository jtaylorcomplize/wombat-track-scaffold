import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { launchBrowser, createPage, cleanup } from '../utils/puppeteer-setup.js';

describe('Basic Puppeteer Setup Test', () => {
  let browser;
  let page;

  beforeAll(async () => {
    console.log('Launching browser...');
    browser = await launchBrowser(true);
  });

  afterAll(async () => {
    console.log('Cleaning up browser...');
    await cleanup(browser);
  });

  it('should launch browser and navigate to a page', async () => {
    page = await createPage(browser);
    
    // Try to navigate to example.com as a simple test
    await page.goto('https://example.com', { waitUntil: 'networkidle2' });
    
    const title = await page.title();
    expect(title).toContain('Example');
    
    await page.close();
  });
});