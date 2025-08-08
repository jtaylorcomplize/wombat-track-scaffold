import puppeteer from 'puppeteer';

async function examineDOMStructure() {
  const browser = await puppeteer.launch({ 
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    console.log('🔍 Examining DOM structure...');
    
    await page.goto('http://localhost:5173/orbis/admin/orphan-inspector', { 
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    await page.waitForSelector('main', { timeout: 10000 });
    
    // Get detailed DOM structure
    const domInfo = await page.evaluate(() => {
      const main = document.querySelector('main');
      
      function getElementInfo(element, depth = 0) {
        if (!element || depth > 3) return null;
        
        return {
          tagName: element.tagName,
          className: element.className,
          id: element.id,
          computedStyles: {
            width: window.getComputedStyle(element).width,
            maxWidth: window.getComputedStyle(element).maxWidth,
            display: window.getComputedStyle(element).display
          },
          children: Array.from(element.children).slice(0, 5).map(child => getElementInfo(child, depth + 1))
        };
      }
      
      return getElementInfo(main);
    });
    
    console.log('📊 DOM Structure:', JSON.stringify(domInfo, null, 2));
    
    // Specifically look for the content wrapper that should have w-full class
    const contentWrapperInfo = await page.evaluate(() => {
      // Look for the content wrapper div inside main
      const main = document.querySelector('main');
      const wrappers = main.querySelectorAll('div');
      
      return Array.from(wrappers).map((div, index) => ({
        index,
        className: div.className,
        width: window.getComputedStyle(div).width,
        maxWidth: window.getComputedStyle(div).maxWidth,
        hasWFull: div.className.includes('w-full'),
        hasConstraint: div.className.includes('wt-content-max-width')
      }));
    });
    
    console.log('\n📊 Content Wrappers Analysis:');
    contentWrapperInfo.forEach(wrapper => {
      console.log(`   Wrapper ${wrapper.index}:`);
      console.log(`     Classes: "${wrapper.className}"`);
      console.log(`     Width: ${wrapper.width}`);
      console.log(`     Max-width: ${wrapper.maxWidth}`);
      console.log(`     Has w-full: ${wrapper.hasWFull}`);
      console.log(`     Has constraint: ${wrapper.hasConstraint}`);
    });
    
  } catch (error) {
    console.error('❌ Examination failed:', error.message);
  } finally {
    await browser.close();
  }
}

examineDOMStructure();