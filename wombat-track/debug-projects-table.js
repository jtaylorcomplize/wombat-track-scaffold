import puppeteer from 'puppeteer';

async function debugProjectsTable() {
  const browser = await puppeteer.launch({ 
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    console.log('🔍 Debugging Data Explorer projects table...');
    
    await page.goto('http://localhost:5173/orbis/admin/data-explorer', { 
      waitUntil: 'networkidle2',
      timeout: 15000
    });
    
    await page.waitForSelector('main', { timeout: 10000 });
    
    // Wait for projects to be selected by default
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Get table information
    const tableInfo = await page.evaluate(() => {
      const table = document.querySelector('table');
      const headers = Array.from(document.querySelectorAll('th')).map(th => ({
        text: th.textContent.trim(),
        width: th.getBoundingClientRect().width,
        computedWidth: window.getComputedStyle(th).width
      }));
      
      const firstRow = document.querySelector('tbody tr');
      const cells = firstRow ? Array.from(firstRow.querySelectorAll('td')).map(td => ({
        text: td.textContent.trim().substring(0, 50) + '...',
        width: td.getBoundingClientRect().width,
        computedWidth: window.getComputedStyle(td).width
      })) : [];
      
      return {
        tableWidth: table ? table.getBoundingClientRect().width : 0,
        tableComputedWidth: table ? window.getComputedStyle(table).width : '0',
        columnCount: headers.length,
        headers: headers,
        sampleRow: cells,
        containerWidth: document.querySelector('.overflow-x-auto').getBoundingClientRect().width
      };
    });
    
    console.log('📊 Projects Table Analysis:');
    console.log(`   Table width: ${tableInfo.tableWidth}px (computed: ${tableInfo.tableComputedWidth})`);
    console.log(`   Container width: ${tableInfo.containerWidth}px`);
    console.log(`   Number of columns: ${tableInfo.columnCount}`);
    
    console.log('\n📋 Column Headers and Widths:');
    tableInfo.headers.forEach((header, index) => {
      console.log(`   ${index + 1}. "${header.text}": ${header.width}px`);
    });
    
    console.log('\n📄 Sample Row Data:');
    tableInfo.sampleRow.forEach((cell, index) => {
      console.log(`   ${index + 1}. "${cell.text}": ${cell.width}px`);
    });
    
    // Take screenshot
    await page.screenshot({ 
      path: '/home/jtaylor/wombat-track-scaffold/wombat-track/projects-table-debug.png',
      fullPage: false
    });
    console.log('\n📸 Debug screenshot saved: projects-table-debug.png');
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  } finally {
    await browser.close();
  }
}

debugProjectsTable();