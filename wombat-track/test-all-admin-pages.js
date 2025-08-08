import puppeteer from 'puppeteer';

async function testAllAdminPages() {
  const browser = await puppeteer.launch({ 
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    console.log('🔍 Testing all admin subpages for full width layout...\n');
    
    // Admin pages to test (excluding overview which should stay centered)
    const adminPages = [
      { name: 'Data Explorer', url: 'data-explorer' },
      { name: 'Import/Export', url: 'import-export' },
      { name: 'Orphan Inspector', url: 'orphan-inspector' },
      { name: 'Runtime Panel', url: 'runtime-panel' },
      { name: 'Secrets Manager', url: 'secrets-manager' },
      { name: 'SDLC Dashboard', url: 'sdlc-dashboard' }
    ];
    
    const results = [];
    
    for (const adminPage of adminPages) {
      console.log(`📍 Testing ${adminPage.name}...`);
      
      try {
        await page.goto(`http://localhost:5173/orbis/admin/${adminPage.url}`, { 
          waitUntil: 'networkidle2',
          timeout: 15000
        });
        
        await page.waitForSelector('main', { timeout: 10000 });
        
        // Get layout measurements
        const layoutInfo = await page.evaluate(() => {
          const main = document.querySelector('main');
          const sidebar = document.querySelector('.min-h-screen.flex > div:first-child');
          const viewportWidth = window.innerWidth;
          const sidebarWidth = sidebar ? sidebar.getBoundingClientRect().width : 0;
          const mainWidth = main ? main.getBoundingClientRect().width : 0;
          const expectedFullWidth = viewportWidth - sidebarWidth;
          
          // Check if the main content uses close to full width (within 50px tolerance)
          const isUsingFullWidth = Math.abs(mainWidth - expectedFullWidth) < 50;
          const widthPercentage = (mainWidth / expectedFullWidth * 100).toFixed(1);
          
          return {
            viewport: viewportWidth,
            sidebar: sidebarWidth,
            main: mainWidth,
            expected: expectedFullWidth,
            isFullWidth: isUsingFullWidth,
            widthDifference: Math.abs(mainWidth - expectedFullWidth),
            widthPercentage: widthPercentage
          };
        });
        
        const testPassed = layoutInfo.isFullWidth && parseFloat(layoutInfo.widthPercentage) > 95;
        
        results.push({
          page: adminPage.name,
          passed: testPassed,
          widthPercentage: layoutInfo.widthPercentage,
          widthDifference: layoutInfo.widthDifference,
          details: layoutInfo
        });
        
        console.log(`   ${testPassed ? '✅' : '❌'} ${adminPage.name}: ${layoutInfo.widthPercentage}% width (${layoutInfo.main}px)`);
        
      } catch (error) {
        console.log(`   ❌ ${adminPage.name}: Error - ${error.message}`);
        results.push({
          page: adminPage.name,
          passed: false,
          error: error.message
        });
      }
    }
    
    // Take a screenshot of the last page for reference
    await page.screenshot({ 
      path: '/home/jtaylor/wombat-track-scaffold/wombat-track/all-admin-pages-test.png',
      fullPage: false
    });
    
    // Summary
    console.log('\n📊 Test Summary:');
    const passedCount = results.filter(r => r.passed).length;
    const totalCount = results.length;
    
    console.log(`   Total pages tested: ${totalCount}`);  
    console.log(`   Pages passing: ${passedCount}`);
    console.log(`   Pages failing: ${totalCount - passedCount}`);
    
    if (passedCount === totalCount) {
      console.log('\n🎉 All admin pages are now using full screen width!');
    } else {
      console.log('\n❌ Some admin pages still have width constraints:');
      results.filter(r => !r.passed).forEach(result => {
        console.log(`   - ${result.page}: ${result.error || `Only ${result.widthPercentage}% width`}`);
      });
    }
    
    console.log('\n📸 Screenshot saved: all-admin-pages-test.png');
    
    return passedCount === totalCount;
    
  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
    return false;
  } finally {
    await browser.close();
  }
}

testAllAdminPages()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Test error:', error);
    process.exit(1);
  });