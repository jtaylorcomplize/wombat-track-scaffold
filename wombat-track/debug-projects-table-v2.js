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
    
    // Wait for projects to be selected and data to load
    console.log('⏳ Waiting for data to load...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Check what's actually on the page
    const pageContent = await page.evaluate(() => {
      return {
        hasTable: !!document.querySelector('table'),
        hasProjectsButton: Array.from(document.querySelectorAll('button')).some(btn => btn.textContent.toLowerCase().includes('projects')),
        allButtons: Array.from(document.querySelectorAll('button')).map(btn => btn.textContent.trim()),
        tableContent: document.querySelector('table') ? 'Table exists' : 'No table found',
        bodyText: document.body.textContent.includes('projects') ? 'Projects text found' : 'No projects text',
        loadingStates: Array.from(document.querySelectorAll('div')).filter(div => 
          div.textContent.includes('Loading') || div.textContent.includes('loading')
        ).map(div => div.textContent.trim())
      };
    });
    
    console.log('📄 Page Content Analysis:');
    console.log(`   Has table: ${pageContent.hasTable}`);
    console.log(`   Has projects button: ${pageContent.hasProjectsButton}`);
    console.log(`   Available buttons: ${pageContent.allButtons.join(', ')}`);
    console.log(`   Loading states: ${pageContent.loadingStates.join(', ')}`);
    
    // Try to click on projects table selector if it exists
    try {
      const projectsSelector = 'button[class*="border-blue-500"], button[class*="bg-blue-50"]';
      await page.waitForSelector(projectsSelector, { timeout: 5000 });
      console.log('📍 Found selected projects button, clicking to ensure it loads...');
      await page.click(projectsSelector);
      await new Promise(resolve => setTimeout(resolve, 3000));
    } catch (e) {
      console.log('⚠️ No projects button found or already selected');
    }
    
    // Now get table information
    const tableInfo = await page.evaluate(() => {
      const table = document.querySelector('table');
      const headers = Array.from(document.querySelectorAll('th')).map(th => ({
        text: th.textContent.trim(),
        width: th.getBoundingClientRect().width,
        computedWidth: window.getComputedStyle(th).width
      }));
      
      const rows = Array.from(document.querySelectorAll('tbody tr'));
      const firstRow = rows[0];
      const cells = firstRow ? Array.from(firstRow.querySelectorAll('td')).map(td => ({
        text: td.textContent.trim().substring(0, 30) + (td.textContent.trim().length > 30 ? '...' : ''),
        width: td.getBoundingClientRect().width,
        isVisible: td.getBoundingClientRect().width > 5
      })) : [];
      
      return {
        tableExists: !!table,
        tableWidth: table ? table.getBoundingClientRect().width : 0,
        tableComputedWidth: table ? window.getComputedStyle(table).width : '0',
        columnCount: headers.length,
        rowCount: rows.length,
        headers: headers,
        sampleRow: cells,
        containerWidth: document.querySelector('.overflow-x-auto') ? 
          document.querySelector('.overflow-x-auto').getBoundingClientRect().width : 0,
        visibleColumns: cells.filter(c => c.isVisible).length
      };
    });
    
    console.log('\n📊 Projects Table Analysis:');
    console.log(`   Table exists: ${tableInfo.tableExists}`);
    console.log(`   Table width: ${tableInfo.tableWidth}px (computed: ${tableInfo.tableComputedWidth})`);
    console.log(`   Container width: ${tableInfo.containerWidth}px`);
    console.log(`   Number of columns: ${tableInfo.columnCount}`);
    console.log(`   Number of rows: ${tableInfo.rowCount}`);
    console.log(`   Visible columns: ${tableInfo.visibleColumns}`);
    
    if (tableInfo.headers.length > 0) {
      console.log('\n📋 Column Headers and Widths:');
      tableInfo.headers.forEach((header, index) => {
        const isVisible = header.width > 5;
        console.log(`   ${index + 1}. "${header.text}": ${header.width}px ${!isVisible ? '(TOO NARROW!)' : ''}`);
      });
      
      console.log('\n📄 Sample Row Data:');
      tableInfo.sampleRow.forEach((cell, index) => {
        console.log(`   ${index + 1}. "${cell.text}": ${cell.width}px ${!cell.isVisible ? '(TOO NARROW!)' : ''}`);
      });
    }
    
    // Take screenshot
    await page.screenshot({ 
      path: '/home/jtaylor/wombat-track-scaffold/wombat-track/projects-table-debug-v2.png',
      fullPage: false
    });
    console.log('\n📸 Debug screenshot saved: projects-table-debug-v2.png');
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  } finally {
    await browser.close();
  }
}

debugProjectsTable();