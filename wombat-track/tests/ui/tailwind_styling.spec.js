// tailwind_styling.spec.js
// Visual regression test to confirm Tailwind CSS is properly applied

const { takeScreenshot } = require('../utils/puppeteer-setup');

describe('Tailwind CSS Styling Tests', () => {
  let page;

  beforeEach(async () => {
    page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800 });
  });

  afterEach(async () => {
    await page.close();
  });

  test('Sidebar renders with proper Tailwind styling', async () => {
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });
    
    // Wait for sidebar to load
    await page.waitForSelector('.w-64', { timeout: 5000 });
    
    // Get computed styles for sidebar container
    const sidebarStyles = await page.evaluate(() => {
      const sidebar = document.querySelector('.w-64');
      if (!sidebar) return null;
      
      const computedStyles = getComputedStyle(sidebar);
      return {
        width: computedStyles.width,
        backgroundColor: computedStyles.backgroundColor,
        borderRight: computedStyles.borderRight
      };
    });
    
    expect(sidebarStyles).toBeTruthy();
    expect(sidebarStyles.width).toBe('256px'); // w-64 = 16rem = 256px
    expect(sidebarStyles.backgroundColor).toBe('rgb(255, 255, 255)'); // bg-white
    
    // Take screenshot of styled sidebar
    await takeScreenshot(page, 'sidebar-with-tailwind-styling');
  });

  test('Button styling is not default grey', async () => {
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });
    
    // Find the sidebar toggle button
    const toggleBtnStyles = await page.evaluate(() => {
      const toggleBtn = document.querySelector('button');
      if (!toggleBtn) return null;
      
      const computedStyles = getComputedStyle(toggleBtn);
      return {
        backgroundColor: computedStyles.backgroundColor,
        borderColor: computedStyles.borderColor,
        borderRadius: computedStyles.borderRadius,
        padding: computedStyles.padding
      };
    });
    
    expect(toggleBtnStyles).toBeTruthy();
    // Should not be default browser grey
    expect(toggleBtnStyles.backgroundColor).not.toBe('rgb(239, 239, 239)');
    expect(toggleBtnStyles.backgroundColor).not.toBe('rgb(240, 240, 240)');
    
    // Should have Tailwind styling
    expect(toggleBtnStyles.borderRadius).not.toBe('0px'); // Should be rounded
    
    await takeScreenshot(page, 'styled-buttons');
  });

  test('ProjectSidebarSimple buttons have correct Tailwind classes applied', async () => {
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });
    
    await page.waitForSelector('.w-64 button', { timeout: 5000 });
    
    // Get styles for sidebar buttons
    const sidebarButtonStyles = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('.w-64 button'));
      return buttons.map(btn => {
        const computedStyles = getComputedStyle(btn);
        return {
          backgroundColor: computedStyles.backgroundColor,
          color: computedStyles.color,
          padding: computedStyles.padding,
          borderRadius: computedStyles.borderRadius
        };
      });
    });
    
    expect(sidebarButtonStyles.length).toBeGreaterThan(0);
    
    // Check that buttons have proper styling (not browser defaults)
    sidebarButtonStyles.forEach(styles => {
      expect(styles.borderRadius).not.toBe('0px'); // Should have border radius
      expect(styles.backgroundColor).not.toBe('rgba(0, 0, 0, 0)'); // Should have background
    });
    
    await takeScreenshot(page, 'sidebar-button-styling');
  });

  test('Status badges and icons are properly styled', async () => {
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });
    
    // Wait for dashboard to load
    await page.waitForSelector('[data-testid="project-switcher-trigger"]', { timeout: 5000 });
    
    // Look for status badges/chips
    const statusElements = await page.evaluate(() => {
      // Look for elements that should be styled status indicators
      const statusChips = Array.from(document.querySelectorAll('span, div')).filter(el => {
        const text = el.textContent?.toLowerCase();
        const hasStatusText = text && (
          text.includes('active') || 
          text.includes('complete') || 
          text.includes('progress') ||
          text.includes('%')
        );
        const hasClasses = el.className && (
          el.className.includes('bg-') || 
          el.className.includes('text-') ||
          el.className.includes('border-')
        );
        return hasStatusText || hasClasses;
      });
      
      return statusChips.slice(0, 3).map(el => {
        const computedStyles = getComputedStyle(el);
        return {
          backgroundColor: computedStyles.backgroundColor,
          color: computedStyles.color,
          borderRadius: computedStyles.borderRadius,
          padding: computedStyles.padding
        };
      });
    });
    
    if (statusElements.length > 0) {
      // Check that status elements have proper styling
      statusElements.forEach(styles => {
        // Should have background color (not transparent)
        expect(styles.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
        expect(styles.backgroundColor).not.toBe('transparent');
      });
    }
    
    await takeScreenshot(page, 'status-badge-styling');
  });

  test('Header navigation styling is applied correctly', async () => {
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });
    
    // Wait for header to load
    await page.waitForSelector('[data-testid="dashboard-header"]', { timeout: 5000 });
    
    // Check header styles
    const headerStyles = await page.evaluate(() => {
      const header = document.querySelector('[data-testid="dashboard-header"]');
      if (!header) return null;
      
      const computedStyles = getComputedStyle(header);
      return {
        backgroundColor: computedStyles.backgroundColor,
        borderBottom: computedStyles.borderBottom,
        boxShadow: computedStyles.boxShadow
      };
    });
    
    expect(headerStyles).toBeTruthy();
    expect(headerStyles.backgroundColor).toBe('rgb(255, 255, 255)'); // bg-white
    expect(headerStyles.borderBottom).toContain('rgb(229, 231, 235)'); // border-gray-200
    
    // Check nav buttons
    const navButtonStyles = await page.evaluate(() => {
      const navButtons = Array.from(document.querySelectorAll('.nav-link'));
      return navButtons.map(btn => {
        const computedStyles = getComputedStyle(btn);
        return {
          backgroundColor: computedStyles.backgroundColor,
          borderRadius: computedStyles.borderRadius,
          padding: computedStyles.padding
        };
      });
    });
    
    expect(navButtonStyles.length).toBeGreaterThan(0);
    navButtonStyles.forEach(styles => {
      expect(styles.borderRadius).not.toBe('0px'); // Should be rounded
    });
    
    await takeScreenshot(page, 'header-navigation-styling');
  });

  test('Overall layout uses Flexbox and proper spacing', async () => {
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });
    
    await page.waitForSelector('.flex', { timeout: 5000 });
    
    // Check that flex classes are working
    const layoutStyles = await page.evaluate(() => {
      const flexElements = Array.from(document.querySelectorAll('.flex'));
      return flexElements.slice(0, 3).map(el => {
        const computedStyles = getComputedStyle(el);
        return {
          display: computedStyles.display,
          flexDirection: computedStyles.flexDirection,
          alignItems: computedStyles.alignItems,
          justifyContent: computedStyles.justifyContent
        };
      });
    });
    
    expect(layoutStyles.length).toBeGreaterThan(0);
    layoutStyles.forEach(styles => {
      expect(styles.display).toBe('flex');
    });
    
    await takeScreenshot(page, 'flex-layout-styling');
  });
});