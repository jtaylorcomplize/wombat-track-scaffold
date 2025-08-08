import puppeteer from 'puppeteer';

async function testOrphanInspectorWidth() {
  const browser = await puppeteer.launch({ 
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    console.log('🔍 Testing Orphan Inspector full width layout...');
    
    // Navigate to the admin orphan inspector page
    console.log('📍 Navigating to orphan inspector...');
    await page.goto('http://localhost:5173/orbis/admin/orphan-inspector', { 
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    // Wait for the page to load - look for main element instead
    await page.waitForSelector('main', { timeout: 10000 });
    console.log('✅ Main content loaded');
    
    // Check if we're on the admin page
    const isAdminPage = await page.evaluate(() => {
      return window.location.pathname.includes('/admin/orphan-inspector');
    });
    console.log(`📍 Current page is admin orphan inspector: ${isAdminPage}`);
    
    // Get the main content container dimensions
    const mainContentInfo = await page.evaluate(() => {
      const mainElement = document.querySelector('main');
      const contentContainer = document.querySelector('main div');
      const sidebar = document.querySelector('.min-h-screen.flex > div:first-child');
      
      if (!mainElement || !contentContainer) {
        return { error: 'Main content elements not found' };
      }
      
      const mainRect = mainElement.getBoundingClientRect();
      const contentRect = contentContainer.getBoundingClientRect();
      const sidebarRect = sidebar ? sidebar.getBoundingClientRect() : { width: 0 };
      const viewportWidth = window.innerWidth;
      
      return {
        viewport: {
          width: viewportWidth,
          height: window.innerHeight
        },
        sidebar: {
          width: sidebarRect.width
        },
        main: {
          width: mainRect.width,
          left: mainRect.left,
          classes: mainElement.className
        },
        content: {
          width: contentRect.width,
          left: contentRect.left,
          classes: contentContainer.className,
          styles: {
            maxWidth: window.getComputedStyle(contentContainer).maxWidth,
            width: window.getComputedStyle(contentContainer).width
          }
        },
        expectedFullWidth: viewportWidth - sidebarRect.width,
        isFullWidth: Math.abs(contentRect.width - (viewportWidth - sidebarRect.width)) < 50
      };
    });
    
    console.log('📊 Layout Analysis:');
    console.log(`   Viewport: ${mainContentInfo.viewport.width}x${mainContentInfo.viewport.height}`);
    console.log(`   Sidebar width: ${mainContentInfo.sidebar.width}px`);
    console.log(`   Main content width: ${mainContentInfo.main.width}px`);
    console.log(`   Content container width: ${mainContentInfo.content.width}px`);
    console.log(`   Content container classes: "${mainContentInfo.content.classes}"`);
    console.log(`   Content max-width style: ${mainContentInfo.content.styles.maxWidth}`);
    console.log(`   Expected full width: ${mainContentInfo.expectedFullWidth}px`);
    console.log(`   Is using full width: ${mainContentInfo.isFullWidth}`);
    
    // Check if the content container has the full width class
    const hasFullWidthClass = mainContentInfo.content.classes.includes('w-full');
    const hasConstrainedClass = mainContentInfo.content.classes.includes('wt-content-max-width');
    
    console.log(`\n🔍 Class Analysis:`);
    console.log(`   Has 'w-full' class: ${hasFullWidthClass}`);
    console.log(`   Has 'wt-content-max-width' class: ${hasConstrainedClass}`);
    
    // Take a screenshot for visual confirmation
    await page.screenshot({ 
      path: '/home/jtaylor/wombat-track-scaffold/wombat-track/orphan-inspector-width-test.png',
      fullPage: true 
    });
    console.log('📸 Screenshot saved: orphan-inspector-width-test.png');
    
    // Test result
    const testPassed = hasFullWidthClass && !hasConstrainedClass && mainContentInfo.isFullWidth;
    
    console.log(`\n${testPassed ? '✅' : '❌'} Test Result: ${testPassed ? 'PASSED' : 'FAILED'}`);
    
    if (!testPassed) {
      console.log('\n🔧 Issues found:');
      if (!hasFullWidthClass) console.log('   - Missing w-full class');
      if (hasConstrainedClass) console.log('   - Still has constraining wt-content-max-width class');
      if (!mainContentInfo.isFullWidth) console.log('   - Content is not using full available width');
    }
    
    return testPassed;
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    return false;
  } finally {
    await browser.close();
  }
}

// Run the test
testOrphanInspectorWidth()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Test error:', error);
    process.exit(1);
  });