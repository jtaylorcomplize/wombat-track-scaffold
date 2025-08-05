import puppeteer from 'puppeteer';

async function testLiveDataExplorer() {
  const browser = await puppeteer.launch({ 
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    console.log('🔍 Testing Data Explorer with live admin database...');
    
    // Navigate to Data Explorer with full dev environment
    await page.goto('http://localhost:5174/orbis/admin/data-explorer', { 
      waitUntil: 'networkidle2',
      timeout: 20000
    });
    
    await page.waitForSelector('main', { timeout: 10000 });
    
    // Wait for data to load from admin API
    console.log('⏳ Waiting for live data to load from admin database...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Check if we have live data
    const dataStatus = await page.evaluate(() => {
      const projectsButton = Array.from(document.querySelectorAll('button')).find(btn => 
        btn.textContent.includes('projects') && btn.textContent.includes('records')
      );
      
      const projectsCount = projectsButton ? 
        parseInt(projectsButton.textContent.match(/(\d+)\s+records/)?.[1] || '0') : 0;
      
      return {
        hasProjectsButton: !!projectsButton,
        projectsButtonText: projectsButton ? projectsButton.textContent.trim() : null,
        projectsCount: projectsCount,
        hasTable: !!document.querySelector('table'),
        allButtons: Array.from(document.querySelectorAll('button')).map(btn => btn.textContent.trim()).slice(0, 10)
      };
    });
    
    console.log('📊 Live Data Status:');
    console.log(`   Projects count: ${dataStatus.projectsCount}`);
    console.log(`   Projects button: ${dataStatus.projectsButtonText}`);
    console.log(`   Has table: ${dataStatus.hasTable}`);
    
    if (dataStatus.projectsCount > 0) {
      console.log('✅ Live data found! Testing column layout with real projects...');
      
      // Click on projects if not already selected
      if (!dataStatus.hasTable) {
        const projectsButton = await page.$('button:has-text("projects"), button[class*="border-blue-500"]');
        if (projectsButton) {
          await projectsButton.click();
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }
      
      // Analyze the live table
      const liveTableAnalysis = await page.evaluate(() => {
        const table = document.querySelector('table');
        const headers = Array.from(document.querySelectorAll('th'));
        const rows = Array.from(document.querySelectorAll('tbody tr'));
        const toggleButton = Array.from(document.querySelectorAll('button')).find(btn => 
          btn.textContent.includes('Show All') || btn.textContent.includes('Show Key')
        );
        
        const headerInfo = headers.map(th => ({
          text: th.textContent.trim(),
          width: th.getBoundingClientRect().width,
          minWidth: th.style.minWidth,
          maxWidth: th.style.maxWidth,
          isReadable: th.getBoundingClientRect().width >= 80
        }));
        
        const sampleRowData = rows.length > 0 ? 
          Array.from(rows[0].querySelectorAll('td')).map(td => ({
            text: td.textContent.trim().substring(0, 30) + '...',
            width: td.getBoundingClientRect().width,
            isReadable: td.getBoundingClientRect().width >= 80
          })) : [];
        
        return {
          tableExists: !!table,
          tableWidth: table ? table.getBoundingClientRect().width : 0,
          headerCount: headers.length,
          rowCount: rows.length,
          hasToggleButton: !!toggleButton,
          toggleButtonText: toggleButton ? toggleButton.textContent.trim() : null,
          headerInfo: headerInfo,
          sampleRowData: sampleRowData,
          allColumnsReadable: headerInfo.every(h => h.isReadable),
          containerWidth: document.querySelector('.overflow-x-auto')?.getBoundingClientRect().width || 0
        };
      });
      
      console.log('\n📋 Live Table Analysis:');
      console.log(`   Table width: ${liveTableAnalysis.tableWidth}px`);
      console.log(`   Container width: ${liveTableAnalysis.containerWidth}px`);
      console.log(`   Headers: ${liveTableAnalysis.headerCount}, Rows: ${liveTableAnalysis.rowCount}`);
      console.log(`   Has toggle button: ${liveTableAnalysis.hasToggleButton}`);
      console.log(`   Toggle button: "${liveTableAnalysis.toggleButtonText}"`);
      console.log(`   All columns readable: ${liveTableAnalysis.allColumnsReadable ? '✅' : '❌'}`);
      
      console.log('\n📏 Column Readability Check:');
      liveTableAnalysis.headerInfo.forEach((header, i) => {
        const status = header.isReadable ? '✅' : '❌';
        console.log(`   ${i+1}. "${header.text}" (${header.width.toFixed(0)}px) ${status}`);
      });
      
      // Test column toggle if available
      if (liveTableAnalysis.hasToggleButton) {
        console.log('\n🔄 Testing column toggle functionality...');
        
        const beforeToggle = liveTableAnalysis.headerCount;
        
        // Click the toggle button
        await page.click('button:has-text("Show All"), button:has-text("Show Key")');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const afterToggleAnalysis = await page.evaluate(() => {
          const headers = Array.from(document.querySelectorAll('th'));
          const toggleButton = Array.from(document.querySelectorAll('button')).find(btn => 
            btn.textContent.includes('Show All') || btn.textContent.includes('Show Key')
          );
          
          return {
            headerCount: headers.length,
            toggleButtonText: toggleButton ? toggleButton.textContent.trim() : null,
            tableWidth: document.querySelector('table')?.getBoundingClientRect().width || 0
          };
        });
        
        console.log(`   Before toggle: ${beforeToggle} columns`);
        console.log(`   After toggle: ${afterToggleAnalysis.headerCount} columns`);
        console.log(`   Toggle button now: "${afterToggleAnalysis.toggleButtonText}"`);
        console.log(`   Toggle working: ${beforeToggle !== afterToggleAnalysis.headerCount ? '✅' : '❌'}`);
      }
      
      // Overall assessment
      const fixWorking = liveTableAnalysis.allColumnsReadable && 
                        liveTableAnalysis.tableWidth < 3000 &&
                        liveTableAnalysis.tableWidth > 800;
      
      console.log(`\n${fixWorking ? '✅' : '❌'} Column Fix Assessment: ${fixWorking ? 'SUCCESS' : 'NEEDS WORK'}`);
      
      if (fixWorking) {
        console.log('🎉 The column compression fix is working with live data!');
        console.log('   - All columns are readable (>=80px width)');
        console.log('   - Table width is reasonable for viewing');
        console.log('   - Column constraints are properly applied');
      } else {
        console.log('⚠️  Issues detected:');
        if (!liveTableAnalysis.allColumnsReadable) console.log('   - Some columns are too narrow');
        if (liveTableAnalysis.tableWidth >= 3000) console.log('   - Table is too wide');
        if (liveTableAnalysis.tableWidth <= 800) console.log('   - Table might be too narrow');
      }
      
    } else {
      console.log('⚠️  No live data found in admin database');
      console.log('   This could mean:');
      console.log('   - Database is empty');
      console.log('   - API connection failed');
      console.log('   - Admin server is not properly connected');
    }
    
    // Take screenshot of current state
    await page.screenshot({ 
      path: '/home/jtaylor/wombat-track-scaffold/wombat-track/live-data-explorer-test.png',
      fullPage: false
    });
    console.log('\n📸 Screenshot saved: live-data-explorer-test.png');
    
    return dataStatus.projectsCount > 0;
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  } finally {
    await browser.close();
  }
}

testLiveDataExplorer();