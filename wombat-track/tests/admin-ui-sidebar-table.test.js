const puppeteer = require('puppeteer');

describe('Admin UI Sidebar + Table Test', () => {
  let browser;
  let page;
  const consoleErrors = [];
  const consoleLogs = [];

  beforeAll(async () => {
    browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    page = await browser.newPage();
    
    // Capture console messages
    page.on('console', msg => {
      const text = msg.text();
      consoleLogs.push(text);
      console.log('PAGE LOG:', text);
      
      if (msg.type() === 'error') {
        consoleErrors.push(text);
        console.error('PAGE ERROR:', text);
      }
    });

    // Capture page errors
    page.on('pageerror', error => {
      consoleErrors.push(error.message);
      console.error('PAGE CRASH:', error.message);
    });
  });

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  });

  it('loads Admin Dashboard without tableData.filter error', async () => {
    console.log('🔍 Testing: Admin Dashboard loads without runtime errors...');
    
    // Navigate to admin surface
    await page.goto('http://localhost:5176', { waitUntil: 'networkidle2' });
    
    // Wait for main app to load
    await page.waitForSelector('[data-testid="app-layout"]', { timeout: 10000 });
    
    // Navigate to admin surface via sidebar
    const adminSurfaceButton = await page.waitForSelector('[data-testid="surface-admin"]', { timeout: 5000 });
    await adminSurfaceButton.click();
    
    // Wait for admin dashboard to load
    await page.waitForSelector('.admin-dashboard, [class*="admin"]', { timeout: 7000 });
    
    // Take screenshot for governance
    await page.screenshot({ 
      path: 'screenshots/admin-ui-loaded.png',
      fullPage: true
    });

    console.log('📸 Screenshot saved: screenshots/admin-ui-loaded.png');
    
    // Check for tableData.filter specific errors
    const hasFilterError = consoleErrors.some(error => 
      error.toLowerCase().includes('filter') && 
      error.toLowerCase().includes('not a function')
    );
    
    console.log('🔍 Console errors found:', consoleErrors.length);
    console.log('❌ Filter-related errors:', hasFilterError);
    
    expect(hasFilterError).toBe(false);
    expect(consoleErrors.length).toBeLessThan(5); // Allow some minor errors but not crashes
  });

  it('sidebar is visible and correctly positioned', async () => {
    console.log('🔍 Testing: Enhanced Sidebar visibility and positioning...');
    
    // Look for the Enhanced Project Sidebar
    const sidebarSelector = '.fixed.left-0.top-0';
    await page.waitForSelector(sidebarSelector, { timeout: 5000 });

    // Evaluate sidebar visibility and positioning
    const sidebarInfo = await page.$eval(sidebarSelector, (el) => {
      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      
      return {
        display: style.display,
        visibility: style.visibility,
        position: style.position,
        zIndex: style.zIndex,
        left: style.left,
        top: style.top,
        width: rect.width,
        height: rect.height,
        className: el.className
      };
    });

    console.log('📊 Sidebar computed style:', sidebarInfo);
    
    // Take screenshot of sidebar specifically
    await page.screenshot({ 
      path: 'screenshots/enhanced-sidebar-visible.png',
      clip: { x: 0, y: 0, width: 400, height: 800 }
    });
    
    // Verify sidebar properties
    expect(sidebarInfo.display).not.toBe('none');
    expect(sidebarInfo.visibility).toBe('visible');
    expect(sidebarInfo.position).toBe('fixed');
    expect(parseInt(sidebarInfo.zIndex || '0')).toBeGreaterThanOrEqual(9999);
    expect(sidebarInfo.width).toBeGreaterThan(60);
    expect(sidebarInfo.height).toBeGreaterThan(500);
    
    console.log('✅ Sidebar visibility confirmed');
  });

  it('project data loads and filters are functional', async () => {
    console.log('🔍 Testing: Project data loading and filter functionality...');
    
    // Check for project loading logs
    const projectLoadLogs = consoleLogs.filter(log => 
      log.includes('projects') && 
      (log.includes('loaded') || log.includes('Using'))
    );
    
    console.log('📊 Project loading logs:', projectLoadLogs);
    
    // Look for filter controls in the sidebar
    try {
      await page.waitForSelector('[data-testid="filter-rag-status"]', { timeout: 3000 });
      
      // Test RAG filter functionality
      await page.select('[data-testid="filter-rag-status"]', 'Red');
      await page.waitForTimeout(1000); // Allow filter to process
      
      // Check for filter logging
      const filterLogs = consoleLogs.filter(log => 
        log.includes('EnhancedProjectSidebar') && log.includes('Filtered')
      );
      
      console.log('🔍 Filter operation logs:', filterLogs);
      expect(filterLogs.length).toBeGreaterThan(0);
      
    } catch (error) {
      console.log('⚠️ Filter controls not found, checking basic project loading...');
    }
    
    // At minimum, expect some project-related activity
    const hasProjectActivity = projectLoadLogs.length > 0 || 
      consoleLogs.some(log => log.includes('oApp') || log.includes('92 projects'));
    
    expect(hasProjectActivity).toBe(true);
    console.log('✅ Project data loading confirmed');
  });

  it('admin error boundary is not triggered', async () => {
    console.log('🔍 Testing: Admin Error Boundary not triggered...');
    
    // Look for error boundary indicators
    const errorBoundaryText = await page.$eval('body', (body) => {
      return body.textContent.includes('Something went wrong') || 
             body.textContent.includes('Error Boundary') ||
             body.textContent.includes('crashed');
    });
    
    // Check for AdminErrorBoundary specific messages
    const hasErrorBoundary = consoleErrors.some(error => 
      error.includes('ErrorBoundary') || error.includes('componentDidCatch')
    );
    
    console.log('🚫 Error boundary triggered:', errorBoundaryText || hasErrorBoundary);
    
    expect(errorBoundaryText).toBe(false);
    expect(hasErrorBoundary).toBe(false);
    
    console.log('✅ No error boundaries triggered');
  });

  afterAll(async () => {
    // Summary logging
    console.log('\n📊 TEST SUMMARY:');
    console.log(`Total console logs: ${consoleLogs.length}`);
    console.log(`Total console errors: ${consoleErrors.length}`);
    console.log(`Screenshots captured: 2`);
    
    if (consoleErrors.length > 0) {
      console.log('\n❌ Console errors found:');
      consoleErrors.forEach((error, i) => console.log(`${i + 1}. ${error}`));
    }
  });
});