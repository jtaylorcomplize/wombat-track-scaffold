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
 * @returns {Promise<Page>} Configured page instance
 */
export async function createPage(browser) {
  const page = await browser.newPage();
  
  // Set default timeout
  page.setDefaultTimeout(30000);
  
  // Set user agent to avoid detection
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
  
  // Enable request interception for debugging
  await page.setRequestInterception(true);
  page.on('request', (request) => {
    // Log failed requests for debugging
    request.continue();
  });
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.error('Page Error:', msg.text());
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
 * Clean up browser instance
 * @param {Browser} browser - Puppeteer browser instance
 */
export async function cleanup(browser) {
  if (browser) {
    await browser.close();
  }
}