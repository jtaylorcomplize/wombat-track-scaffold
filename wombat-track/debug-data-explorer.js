import puppeteer from 'puppeteer';

async function debugDataExplorer() {
  const browser = await puppeteer.launch({ 
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    console.log('🔍 Debugging Data Explorer layout...');
    
    await page.goto('http://localhost:5173/orbis/admin/data-explorer', { 
      waitUntil: 'networkidle2',
      timeout: 15000
    });
    
    await page.waitForSelector('main', { timeout: 10000 });
    
    // Get detailed layout information
    const layoutDebug = await page.evaluate(() => {
      const main = document.querySelector('main');
      const sidebar = document.querySelector('.min-h-screen.flex > div:first-child');
      
      // Get all divs inside main to see what's causing the width issue
      const mainChildren = main ? Array.from(main.children) : [];
      
      return {
        viewport: window.innerWidth,
        sidebar: sidebar ? {
          width: sidebar.getBoundingClientRect().width,
          classes: sidebar.className
        } : null,
        main: main ? {
          width: main.getBoundingClientRect().width,
          classes: main.className,
          children: mainChildren.map((child, index) => ({
            index,
            tagName: child.tagName,
            className: child.className,
            width: child.getBoundingClientRect().width,
            computedWidth: window.getComputedStyle(child).width,
            maxWidth: window.getComputedStyle(child).maxWidth,
            overflow: window.getComputedStyle(child).overflow,
            overflowX: window.getComputedStyle(child).overflowX
          }))
        } : null,
        // Check for any extremely wide elements
        wideElements: Array.from(document.querySelectorAll('*')).filter(el => {
          const width = el.getBoundingClientRect().width;
          return width > 2000; // Elements wider than 2000px
        }).map(el => ({
          tagName: el.tagName,
          className: el.className,
          width: el.getBoundingClientRect().width,
          innerHTML: el.innerHTML.substring(0, 100) + '...'
        }))
      };
    });
    
    console.log('📊 Data Explorer Layout Debug:');
    console.log('   Viewport:', layoutDebug.viewport);
    console.log('   Sidebar:', layoutDebug.sidebar);
    console.log('   Main:', layoutDebug.main);
    console.log('\n🔍 Wide Elements (>2000px):');
    layoutDebug.wideElements.forEach((element, index) => {
      console.log(`   ${index + 1}. ${element.tagName}.${element.className}: ${element.width}px`);
    });
    
    // Take screenshot for visual inspection
    await page.screenshot({ 
      path: '/home/jtaylor/wombat-track-scaffold/wombat-track/data-explorer-debug.png',
      fullPage: true
    });
    console.log('\n📸 Debug screenshot saved: data-explorer-debug.png');
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  } finally {
    await browser.close();
  }
}

debugDataExplorer();