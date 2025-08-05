import puppeteer from 'puppeteer';

async function debugPage() {
  const browser = await puppeteer.launch({ 
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    console.log('🔍 Debugging page load...');
    
    // Navigate to the admin orphan inspector page
    await page.goto('http://localhost:5173/orbis/admin/orphan-inspector', { 
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    
    // Wait a bit for any dynamic content
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Take screenshot
    await page.screenshot({ 
      path: '/home/jtaylor/wombat-track-scaffold/wombat-track/debug-page.png',
      fullPage: true 
    });
    
    // Get page info
    const pageInfo = await page.evaluate(() => {
      return {
        url: window.location.href,
        title: document.title,
        bodyHTML: document.body ? document.body.innerHTML.substring(0, 500) : 'No body',
        hasAppLayout: !!document.querySelector('[data-testid="app-layout"]'),
        mainElements: Array.from(document.querySelectorAll('main, [role="main"]')).map(el => ({
          tagName: el.tagName,
          className: el.className,
          id: el.id
        }))
      };
    });
    
    console.log('📊 Page Info:');
    console.log(`   URL: ${pageInfo.url}`);
    console.log(`   Title: ${pageInfo.title}`);
    console.log(`   Has app-layout: ${pageInfo.hasAppLayout}`);
    console.log(`   Main elements:`, pageInfo.mainElements);
    console.log(`   Body start: ${pageInfo.bodyHTML}`);
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  } finally {
    await browser.close();
  }
}

debugPage();