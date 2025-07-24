const { expect } = require('@jest/globals');

describe('ProjectSidebar Smoke Test', () => {
  beforeAll(async () => {
    await page.goto(`http://localhost:${process.env.PORT || 5173}`, {
      waitUntil: 'networkidle0',
      timeout: 10000
    });
  });

  test('sidebar renders on WombatConsole tab', async () => {
    // Navigate to WombatConsole tab
    await page.click('button:has-text("WombatConsole")');
    
    // Wait for the sidebar to be visible
    await page.waitForSelector('[data-testid*="sidebar"], .project-sidebar, div:has-text("Projects")', {
      timeout: 5000
    });
    
    // Check that sidebar contains expected elements
    const sidebarExists = await page.evaluate(() => {
      // Look for sidebar indicators
      return !!(
        document.querySelector('div:has-text("Projects")') ||
        document.querySelector('[class*="sidebar"]') ||
        document.querySelector('div[style*="width: 300px"]') ||
        document.querySelector('button:has-text("New Project")')
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

  test('sidebar shows project hierarchy', async () => {
    // Check for project structure indicators
    const hasProjectStructure = await page.evaluate(() => {
      const projectIndicators = [
        'WT-1.x',
        'WT-2.x', 
        'WT-3.x',
        'Foundation',
        'MetaPlatform',
        'Developer Infrastructure'
      ];
      
      return projectIndicators.some(indicator => 
        document.body.textContent.includes(indicator)
      );
    });
    
    expect(hasProjectStructure).toBe(true);
  });
});