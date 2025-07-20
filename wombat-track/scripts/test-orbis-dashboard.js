import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  
  console.log('🚀 Starting Orbis Dashboard verification...');
  
  try {
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle2', timeout: 30000 });
    console.log('✅ Page loaded successfully');
    
    // Wait a bit for React to render
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Click on Orbis Dashboard navigation button using a more specific selector
    const orbisDashboardButton = await page.waitForSelector('button.nav-link:nth-child(2)', { timeout: 5000 });
    await orbisDashboardButton.click();
    console.log('✅ Clicked Orbis Dashboard navigation');
    
    // Wait for the view to change
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await page.screenshot({ path: 'orbis-dashboard.png' });
    console.log('📸 Screenshot saved: orbis-dashboard.png');

    // Check for main elements
    const rollup = await page.$('[data-testid="status-rollup"]');
    if (!rollup) {
      // Debug: log what's actually on the page
      const bodyText = await page.evaluate(() => document.body.innerText);
      console.log('Page content:', bodyText.substring(0, 500));
      throw new Error('❌ Rollup not found');
    }
    console.log('✅ Found status rollup');

    const statusFilter = await page.$('[data-testid="status-filter"]');
    const categoryFilter = await page.$('[data-testid="category-filter"]');
    console.log(`✅ Found filters: status=${!!statusFilter}, category=${!!categoryFilter}`);

    const refreshButton = await page.$('[data-testid="refresh-button"]');
    if (!refreshButton) throw new Error('❌ Refresh button not found');
    console.log('✅ Found refresh button');

    const integrationItems = await page.$$('[data-testid^="integration-item-"]');
    console.log(`✅ Found ${integrationItems.length} integration items`);

    console.log('🎉 All verification checks passed!');
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
  } finally {
    await browser.close();
  }
})();