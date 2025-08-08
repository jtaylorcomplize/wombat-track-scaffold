import puppeteer from 'puppeteer';

async function testFinalWidth() {
  const browser = await puppeteer.launch({ 
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    console.log('🔍 Testing final Orphan Inspector full width layout...');
    
    await page.goto('http://localhost:5173/orbis/admin/orphan-inspector', { 
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    await page.waitForSelector('main', { timeout: 10000 });
    console.log('✅ Main content loaded');
    
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
      
      // Check if any constraining max-width classes are present
      const adminDashboard = document.querySelector('.admin-theme');
      const hasConstrainingClasses = adminDashboard && (
        adminDashboard.innerHTML.includes('max-w-7xl') ||
        adminDashboard.innerHTML.includes('wt-content-max-width')
      );
      
      return {
        viewport: viewportWidth,
        sidebar: sidebarWidth,
        main: mainWidth,
        expected: expectedFullWidth,
        isFullWidth: isUsingFullWidth,
        widthDifference: Math.abs(mainWidth - expectedFullWidth),
        hasConstraints: hasConstrainingClasses,
        widthPercentage: (mainWidth / expectedFullWidth * 100).toFixed(1)
      };
    });
    
    console.log('📊 Final Layout Analysis:');
    console.log(`   Viewport: ${layoutInfo.viewport}px`);
    console.log(`   Sidebar: ${layoutInfo.sidebar}px`);
    console.log(`   Main content: ${layoutInfo.main}px`);
    console.log(`   Expected full width: ${layoutInfo.expected}px`);
    console.log(`   Width difference: ${layoutInfo.widthDifference}px`);
    console.log(`   Using ${layoutInfo.widthPercentage}% of available width`);
    console.log(`   Has constraining classes: ${layoutInfo.hasConstraints}`);
    console.log(`   Is using full width: ${layoutInfo.isFullWidth}`);
    
    // Take final screenshot
    await page.screenshot({ 
      path: '/home/jtaylor/wombat-track-scaffold/wombat-track/final-width-test.png',
      fullPage: true 
    });
    console.log('📸 Final screenshot saved: final-width-test.png');
    
    // Success criteria: using > 95% of available width and < 50px difference
    const testPassed = layoutInfo.isFullWidth && parseFloat(layoutInfo.widthPercentage) > 95;
    
    console.log(`\n${testPassed ? '✅' : '❌'} Final Test Result: ${testPassed ? 'PASSED' : 'FAILED'}`);
    
    if (testPassed) {
      console.log('🎉 Orphan Inspector is now using full screen width!');
      console.log(`   Main content uses ${layoutInfo.widthPercentage}% of available width`);
    } else {
      console.log('\n🔧 Issues:');
      if (parseFloat(layoutInfo.widthPercentage) <= 95) {
        console.log(`   - Only using ${layoutInfo.widthPercentage}% of available width (should be > 95%)`);
      }
      if (!layoutInfo.isFullWidth) {
        console.log(`   - Width difference too large: ${layoutInfo.widthDifference}px (should be < 50px)`);
      }
    }
    
    return testPassed;
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    return false;
  } finally {
    await browser.close();
  }
}

testFinalWidth()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Test error:', error);
    process.exit(1);
  });