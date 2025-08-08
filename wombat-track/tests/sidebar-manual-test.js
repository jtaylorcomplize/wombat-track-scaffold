/**
 * Manual Test: Quick validation of sidebar toggle
 * Bypasses puppeteer complexity to test basic functionality
 */

const puppeteer = require('puppeteer');

async function testSidebarToggle() {
  const browser = await puppeteer.launch({ 
    headless: false,
    devtools: true 
  });
  
  try {
    const page = await browser.newPage();
    
    // Navigate to app
    await page.goto('http://localhost:5173/orbis', { waitUntil: 'networkidle2' });
    
    console.log('Page loaded, looking for sidebar...');
    
    // Wait for sidebar to be visible
    await page.waitForSelector('.fixed.left-0.top-0.h-screen', { timeout: 10000 });
    console.log('Sidebar found');
    
    // Look for collapse button
    const collapseBtn = await page.$('button[aria-label="Collapse sidebar"]');
    if (collapseBtn) {
      console.log('Collapse button found');
      
      // Try to click it
      await collapseBtn.click();
      console.log('Clicked collapse button');
      
      // Wait for animation
      await page.waitForTimeout(1000);
      
      // Check if collapsed
      const collapsed = await page.$('.fixed.left-0.top-0.h-screen.w-16');
      console.log('Sidebar collapsed:', !!collapsed);
      
      // Look for expand button
      const expandBtn = await page.$('button[aria-label="Expand sidebar"]');
      if (expandBtn) {
        console.log('Expand button found');
        
        await expandBtn.click();
        console.log('Clicked expand button');
        
        await page.waitForTimeout(1000);
        
        const expanded = await page.$('.fixed.left-0.top-0.h-screen.w-80');
        console.log('Sidebar expanded:', !!expanded);
      } else {
        console.error('Expand button not found');
      }
    } else {
      console.error('Collapse button not found');
    }
    
    // Keep browser open for manual inspection
    console.log('Test complete. Browser will remain open for manual inspection...');
    await page.waitForTimeout(30000);
    
  } finally {
    await browser.close();
  }
}

testSidebarToggle().catch(console.error);