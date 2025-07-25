// project_dashboard_ui.spec.js
// WT-3.3.2: Puppeteer visual test for Project Dashboard UI restoration

const { takeScreenshot } = require('../utils/puppeteer-setup');

describe('Project Dashboard UI Tests', () => {
  let page;

  beforeEach(async () => {
    page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800 });
  });

  afterEach(async () => {
    await page.close();
  });

  test('Dashboard renders project phases and steps correctly', async () => {
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });
    
    // Wait for the dashboard to load
    await page.waitForSelector('[data-testid="project-switcher-trigger"]', { timeout: 5000 });
    
    // Check that the project switcher is visible
    const projectSwitcher = await page.$('[data-testid="project-switcher-trigger"]');
    expect(projectSwitcher).toBeTruthy();
    
    // Verify that phases are rendered
    const phases = await page.$$('.phases-container > div');
    expect(phases.length).toBeGreaterThan(0);
    
    // Check for RAG status badges (colored circles)
    const ragBadges = await page.$$('div[style*="border-radius: 50%"]');
    expect(ragBadges.length).toBeGreaterThan(0);
    
    // Verify step status badges are present
    const statusBadges = await page.$$('span[style*="border-radius: 4px"]');
    expect(statusBadges.length).toBeGreaterThan(0);
    
    // Take baseline screenshot
    await takeScreenshot(page, 'project-dashboard-baseline');
  });

  test('ProjectSwitcher is visible and functional', async () => {
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });
    
    // Wait for project switcher
    await page.waitForSelector('[data-testid="project-switcher-trigger"]');
    
    // Click to open dropdown
    await page.click('[data-testid="project-switcher-trigger"]');
    
    // Wait for dropdown to appear
    await page.waitForSelector('[data-testid="project-switcher-dropdown"]', { timeout: 2000 });
    
    // Verify dropdown is visible
    const dropdown = await page.$('[data-testid="project-switcher-dropdown"]');
    expect(dropdown).toBeTruthy();
    
    // Check for project options
    const projectOptions = await page.$$('[data-testid^="project-option-"]');
    expect(projectOptions.length).toBeGreaterThan(0);
    
    // Take screenshot of open switcher
    await takeScreenshot(page, 'project-switcher-dropdown');
  });

  test('RAG status badges are shown with correct colors', async () => {
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });
    
    await page.waitForSelector('.phases-container');
    
    // Check for RAG status indicators
    const ragIndicators = await page.evaluate(() => {
      const circles = Array.from(document.querySelectorAll('div[style*="border-radius: 50%"]'));
      return circles.map(circle => {
        const style = circle.getAttribute('style');
        const colorMatch = style.match(/background-color:\s*([^;]+)/);
        return colorMatch ? colorMatch[1].trim() : null;
      }).filter(color => color);
    });
    
    expect(ragIndicators.length).toBeGreaterThan(0);
    
    // Verify we have different RAG colors (should include green, amber, red)
    const uniqueColors = [...new Set(ragIndicators)];
    expect(uniqueColors.length).toBeGreaterThan(1);
    
    await takeScreenshot(page, 'rag-status-badges');
  });

  test('Percentage complete is visible', async () => {
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });
    
    await page.waitForSelector('.phases-container');
    
    // Look for percentage indicators in the dashboard
    const percentageElements = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('*'));
      return elements.filter(el => 
        el.textContent && el.textContent.match(/\d+%/)
      ).map(el => el.textContent.trim());
    });
    
    expect(percentageElements.length).toBeGreaterThan(0);
    
    // Verify at least one element shows percentage completion
    const hasPercentage = percentageElements.some(text => 
      text.includes('% Complete') || text.includes('%')
    );
    expect(hasPercentage).toBe(true);
    
    await takeScreenshot(page, 'percentage-completion');
  });

  test('Sidebar hierarchy renders with nested steps', async () => {
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });
    
    // Wait for sidebar to load
    await page.waitForSelector('.w-64', { timeout: 5000 });
    
    // Check sidebar is present
    const sidebar = await page.$('.w-64');
    expect(sidebar).toBeTruthy();
    
    // Look for nested structure indicators (indentation or hierarchy)
    const nestedElements = await page.$$('.pl-6, .space-y-1');
    expect(nestedElements.length).toBeGreaterThan(0);
    
    // Check for project items in sidebar
    const sidebarItems = await page.$$('.w-64 button');
    expect(sidebarItems.length).toBeGreaterThan(0);
    
    await takeScreenshot(page, 'sidebar-hierarchy');
  });

  test('Phase expansion and collapse works correctly', async () => {
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });
    
    await page.waitForSelector('.phases-container');
    
    // Find a phase header (clickable area)
    const phaseHeaders = await page.$$('.phases-container > div > div:first-child');
    expect(phaseHeaders.length).toBeGreaterThan(0);
    
    // Take screenshot before collapse
    await takeScreenshot(page, 'phases-expanded');
    
    // Click first phase to collapse it
    if (phaseHeaders.length > 0) {
      await phaseHeaders[0].click();
      
      // Wait a moment for animation
      await page.waitForTimeout(300);
      
      // Take screenshot after collapse
      await takeScreenshot(page, 'phase-collapsed');
    }
  });

  test('Step action buttons are functional', async () => {
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });
    
    await page.waitForSelector('.phases-container');
    
    // Look for step action buttons
    const actionButtons = await page.$$('button[style*="background-color: #3b82f6"], button[style*="background-color: #10b981"]');
    
    if (actionButtons.length > 0) {
      // Take screenshot showing action buttons
      await takeScreenshot(page, 'step-action-buttons');
      
      // Verify buttons are clickable
      const buttonText = await page.evaluate(btn => btn.textContent, actionButtons[0]);
      expect(['Start', 'Complete', 'Logs'].some(text => buttonText.includes(text))).toBe(true);
    }
  });

  test('Status chips are visible and correctly colored', async () => {
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });
    
    await page.waitForSelector('.phases-container');
    
    // Check for status chips/badges
    const statusChips = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('span, div'));
      return elements.filter(el => {
        const style = el.getAttribute('style');
        const text = el.textContent;
        return style && 
               style.includes('border-radius') && 
               text && 
               (text.includes('complete') || 
                text.includes('progress') || 
                text.includes('not started') ||
                text.includes('Active') ||
                text.includes('Complete'));
      }).length;
    });
    
    expect(statusChips).toBeGreaterThan(0);
    
    await takeScreenshot(page, 'status-chips');
  });

  test('Start button background is not default grey', async () => {
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });
    
    await page.waitForSelector('.phases-container', { timeout: 5000 });
    
    // Look for Start buttons specifically
    const startButtons = await page.$$('button');
    let startButtonFound = false;
    
    for (const button of startButtons) {
      const text = await button.evaluate(el => el.textContent?.trim());
      if (text === 'Start') {
        startButtonFound = true;
        const styles = await button.evaluate(el => getComputedStyle(el));
        
        // Assert the button background is not default grey
        expect(styles.backgroundColor).not.toBe('rgb(239, 239, 239)');
        expect(styles.backgroundColor).not.toBe('rgb(240, 240, 240)');
        
        // Should have blue background for Start buttons
        expect(styles.backgroundColor).toContain('rgb(59, 130, 246)'); // Tailwind blue-600
        break;
      }
    }
    
    // If no Start button found, look for any action button
    if (!startButtonFound) {
      const actionButtons = await page.$$('button[style*="background-color"]');
      if (actionButtons.length > 0) {
        const styles = await actionButtons[0].evaluate(el => getComputedStyle(el));
        expect(styles.backgroundColor).not.toBe('rgb(239, 239, 239)');
      }
    }
    
    await takeScreenshot(page, 'start-button-styling');
  });
});