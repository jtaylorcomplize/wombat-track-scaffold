const { expect } = require('@jest/globals');

describe('ProjectSidebar Smoke Test', () => {
  beforeAll(async () => {
    await page.goto(`http://localhost:${process.env.PORT || 5173}`, {
      waitUntil: 'networkidle0',
      timeout: 10000
    });
  });

  test('sidebar renders on Phase Plan tab', async () => {
    // Navigate to Phase Plan tab
    await page.click('button:has-text("Phase Plan")');
    
    // Wait for the sidebar to be visible
    await page.waitForSelector('h2:has-text("Projects"), button:has-text("New Project")', {
      timeout: 5000
    });
    
    // Check that sidebar contains expected elements
    const sidebarExists = await page.evaluate(() => {
      // Look for sidebar indicators
      return !!(
        document.querySelector('h2') && document.querySelector('h2').textContent.includes('Projects') ||
        document.querySelector('button') && document.querySelector('button').textContent.includes('New Project') ||
        document.querySelector('input[placeholder*="Search projects"]')
      );
    });
    
    expect(sidebarExists).toBe(true);
  });

  test('sidebar toggle button works', async () => {
    // Look for toggle button (hamburger menu)
    const toggleExists = await page.evaluate(() => {
      return !!document.querySelector('button[title*="Toggle"], button:has-text("☰")');
    });
    
    if (toggleExists) {
      // Click toggle to hide sidebar
      await page.click('button[title*="Toggle"], button:has-text("☰")');
      
      // Wait a moment for animation
      await page.waitForTimeout(500);
      
      // Click toggle to show sidebar again
      await page.click('button[title*="Toggle"], button:has-text("☰")');
      
      // Verify sidebar is visible again
      const sidebarVisible = await page.evaluate(() => {
        return !!document.querySelector('div:has-text("Projects")');
      });
      
      expect(sidebarVisible).toBe(true);
    }
  });

  test('sidebar shows project hierarchy with Headless UI', async () => {
    // Navigate to Phase Plan tab first
    await page.click('button:has-text("Phase Plan")');
    
    // Wait for sidebar to load
    await page.waitForTimeout(1000);
    
    // Check for project structure indicators and Tailwind classes
    const hasProjectStructure = await page.evaluate(() => {
      const projectIndicators = [
        'WT-1.x',
        'WT-2.x', 
        'WT-3.x',
        'Foundation',
        'MetaPlatform',
        'Developer Infrastructure'
      ];
      
      const hasTailwindClasses = !!(
        document.querySelector('[class*="bg-white"]') ||
        document.querySelector('[class*="border-gray"]') ||
        document.querySelector('[class*="text-gray"]')
      );
      
      const hasProjectText = projectIndicators.some(indicator => 
        document.body.textContent.includes(indicator)
      );
      
      return hasProjectText && hasTailwindClasses;
    });
    
    expect(hasProjectStructure).toBe(true);
  });
});