import puppeteer from 'puppeteer';

/**
 * Launch browser with standard configuration
 * @param {boolean} headless - Run in headless mode
 * @returns {Promise<Browser>} Puppeteer browser instance
 */
export async function launchBrowser(headless = true) {
  return await puppeteer.launch({
    headless,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-gpu'
    ],
    defaultViewport: {
      width: 1280,
      height: 720
    }
  });
}

/**
 * Create a new page with standard settings
 * @param {Browser} browser - Puppeteer browser instance
 * @param {boolean} enableRequestInterception - Whether to enable request interception
 * @returns {Promise<Page>} Configured page instance
 */
export async function createPage(browser, enableRequestInterception = false) {
  const page = await browser.newPage();
  
  // Set default timeout
  page.setDefaultTimeout(30000);
  
  // Set user agent to avoid detection (updated to modern version)
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  
  // Only enable request interception if explicitly requested
  if (enableRequestInterception) {
    await page.setRequestInterception(true);
  }
  
  // Add console error logging with filtering
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const errorText = msg.text();
      // Filter out sensitive information and common non-critical errors
      if (!errorText.includes('sensitive') && 
          !errorText.includes('password') && 
          !errorText.includes('token') &&
          !errorText.includes('Failed to load resource: the server responded with a status of 404')) {
        console.error('Page Error:', errorText);
      }
    }
  });
  
  return page;
}

/**
 * Wait for and click an element
 * @param {Page} page - Puppeteer page instance
 * @param {string} selector - CSS selector
 * @param {number} timeout - Max wait time in ms
 */
export async function waitAndClick(page, selector, timeout = 5000) {
  await page.waitForSelector(selector, { visible: true, timeout });
  await page.click(selector);
}

/**
 * Wait for and type into an element
 * @param {Page} page - Puppeteer page instance
 * @param {string} selector - CSS selector
 * @param {string} text - Text to type
 * @param {number} timeout - Max wait time in ms
 */
export async function waitAndType(page, selector, text, timeout = 5000) {
  await page.waitForSelector(selector, { visible: true, timeout });
  await page.type(selector, text);
}

/**
 * Take a screenshot with timestamp
 * @param {Page} page - Puppeteer page instance
 * @param {string} name - Screenshot name
 */
export async function takeScreenshot(page, name) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `screenshots/${name}-${timestamp}.png`;
  await page.screenshot({ path: filename, fullPage: true });
  console.log(`Screenshot saved: ${filename}`);
}

/**
 * Wait for navigation with error handling
 * @param {Page} page - Puppeteer page instance
 * @param {Object} options - Navigation options
 */
export async function safeNavigate(page, url, options = {}) {
  try {
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000,
      ...options
    });
  } catch (error) {
    console.error(`Navigation failed to ${url}:`, error.message);
    throw error;
  }
}

/**
 * Setup request interception for a page with custom handler
 * @param {Page} page - Puppeteer page instance
 * @param {Function} requestHandler - Custom request handler function
 * @returns {Promise<Function>} Cleanup function to remove the handler
 */
export async function setupRequestInterception(page, requestHandler) {
  await page.setRequestInterception(true);
  page.on('request', requestHandler);
  
  // Return cleanup function
  return () => {
    page.off('request', requestHandler);
  };
}

/**
 * Clean up browser instance
 * @param {Browser} browser - Puppeteer browser instance
 */
export async function cleanup(browser) {
  if (browser) {
    await browser.close();
  }
}