import puppeteer from 'puppeteer';

async function testDataExplorerColumns() {
  const browser = await puppeteer.launch({ 
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    console.log('🔍 Testing Data Explorer column improvements...');
    
    await page.goto('http://localhost:5173/orbis/admin/data-explorer', { 
      waitUntil: 'networkidle2',
      timeout: 15000
    });
    
    await page.waitForSelector('main', { timeout: 10000 });
    
    // Wait for the page to load
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check if we can create mock data for testing if no real data exists
    const mockDataResult = await page.evaluate(() => {
      // Check if there's already data
      const existingTable = document.querySelector('table');
      if (existingTable) {
        return { hadData: true, message: 'Table already exists' };
      }
      
      // If no data, we can't test properly, but we can check the structure
      const hasToggleButton = Array.from(document.querySelectorAll('button')).some(btn => 
        btn.textContent.includes('Show All') || btn.textContent.includes('Show Key')
      );
      
      return { 
        hadData: false, 
        message: 'No existing data found',
        hasToggleButton: Array.from(document.querySelectorAll('button')).some(btn => 
          btn.textContent.includes('Show All') || btn.textContent.includes('Show Key')
        )
      };
    });
    
    console.log('📄 Mock Data Check:', mockDataResult);
    
    // Test the layout improvements by checking CSS classes and structure
    const layoutTest = await page.evaluate(() => {
      const table = document.querySelector('table');
      const container = document.querySelector('.overflow-x-auto');
      
      return {
        tableExists: !!table,
        containerExists: !!container,
        tableClasses: table ? table.className : 'No table',
        tableStyle: table ? table.getAttribute('style') : 'No table',
        containerClasses: container ? container.className : 'No container',
        headerColumnCount: document.querySelectorAll('th').length,
        hasProperMinWidth: table ? table.style.width === 'max-content' : false,
        tableWidth: table ? table.getBoundingClientRect().width : 0,
        containerWidth: container ? container.getBoundingClientRect().width : 0
      };
    });
    
    console.log('📊 Layout Test Results:');
    console.log(`   Table exists: ${layoutTest.tableExists}`);
    console.log(`   Table classes: ${layoutTest.tableClasses}`);
    console.log(`   Table style: ${layoutTest.tableStyle}`);
    console.log(`   Table width: ${layoutTest.tableWidth}px`);
    console.log(`   Container width: ${layoutTest.containerWidth}px`);
    console.log(`   Has proper width styling: ${layoutTest.hasProperMinWidth}`);
    console.log(`   Header columns: ${layoutTest.headerColumnCount}`);
    
    // Test if the table overflow is properly handled
    const overflowTest = layoutTest.tableWidth <= layoutTest.containerWidth * 2; // Allow for some reasonable overflow
    
    console.log(`\n✅ Overflow Handling: ${overflowTest ? 'GOOD' : 'NEEDS ATTENTION'}`);
    
    if (layoutTest.tableExists) {
      // Test column width constraints
      const columnWidthTest = await page.evaluate(() => {
        const headers = Array.from(document.querySelectorAll('th'));
        const cells = Array.from(document.querySelectorAll('td'));
        
        const headerWidths = headers.map(th => ({
          width: th.getBoundingClientRect().width,
          hasMinWidth: th.style.minWidth !== '',
          hasMaxWidth: th.style.maxWidth !== '',
          text: th.textContent.trim().substring(0, 20)
        }));
        
        const cellWidths = cells.slice(0, Math.min(cells.length, 10)).map(td => ({
          width: td.getBoundingClientRect().width,
          hasMinWidth: td.style.minWidth !== '',
          hasMaxWidth: td.style.maxWidth !== '',
        }));
        
        return {
          headerWidths,
          cellWidths,
          minHeaderWidth: Math.min(...headerWidths.map(h => h.width)),
          maxHeaderWidth: Math.max(...headerWidths.map(h => h.width)),
          averageHeaderWidth: headerWidths.reduce((sum, h) => sum + h.width, 0) / headerWidths.length
        };
      });
      
      console.log('\n📏 Column Width Analysis:');
      console.log(`   Min header width: ${columnWidthTest.minHeaderWidth.toFixed(1)}px`);
      console.log(`   Max header width: ${columnWidthTest.maxHeaderWidth.toFixed(1)}px`);
      console.log(`   Average header width: ${columnWidthTest.averageHeaderWidth.toFixed(1)}px`);
      
      const widthDistributionGood = columnWidthTest.minHeaderWidth >= 80 && columnWidthTest.maxHeaderWidth <= 250;
      console.log(`   Width distribution: ${widthDistributionGood ? 'GOOD' : 'NEEDS ADJUSTMENT'}`);
    }
    
    // Take screenshot
    await page.screenshot({ 
      path: '/home/jtaylor/wombat-track-scaffold/wombat-track/data-explorer-columns-test.png',
      fullPage: false
    });
    console.log('\n📸 Screenshot saved: data-explorer-columns-test.png');
    
    // Test summary
    const overallTest = layoutTest.tableExists && overflowTest && (layoutTest.tableWidth < 3000); // Reasonable max width
    
    console.log(`\n${overallTest ? '✅' : '❌'} Overall Test: ${overallTest ? 'PASSED' : 'FAILED'}`);
    
    if (!overallTest) {
      console.log('🔧 Issues found:');
      if (!layoutTest.tableExists) console.log('   - No table found (likely no data)');
      if (!overflowTest) console.log('   - Table overflow handling needs improvement');
      if (layoutTest.tableWidth >= 3000) console.log('   - Table too wide for reasonable viewing');
    } else {
      console.log('🎉 Data Explorer table layout improvements are working correctly!');
    }
    
    return overallTest;
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  } finally {
    await browser.close();
  }
}

testDataExplorerColumns()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Test error:', error);
    process.exit(1);
  });