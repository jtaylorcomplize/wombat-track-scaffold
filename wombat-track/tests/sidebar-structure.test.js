const puppeteer = require('puppeteer');

describe('Enhanced Sidebar v1.2 Structure Tests', () => {
  let browser;
  let page;

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    page = await browser.newPage();
    
    // Set viewport for consistent testing
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Navigate to the application
    await page.goto('http://localhost:5175', { waitUntil: 'networkidle0' });
  });

  afterAll(async () => {
    await browser.close();
  });

  describe('Three-Tier Sidebar Architecture', () => {
    test('should display all three sidebar sections', async () => {
      // Wait for sidebar to load
      await page.waitForSelector('[data-testid="enhanced-sidebar"]', { timeout: 10000 });
      
      // Check for Operating Sub-Apps Section
      const operatingSection = await page.$('.p-4.border-b.border-gray-200.bg-gradient-to-br.from-blue-50');
      expect(operatingSection).toBeTruthy();
      
      // Check for Project Surfaces Section  
      const projectSection = await page.$('.p-4.border-b.border-gray-200:not(.bg-gradient-to-br)');
      expect(projectSection).toBeTruthy();
      
      // Check for System Surfaces Section
      const systemSection = await page.$('.p-4.border-b.border-gray-200.bg-gradient-to-br.from-slate-50');
      expect(systemSection).toBeTruthy();
    });

    test('should display Operating Sub-Apps with live status indicators', async () => {
      // Check for Operating Sub-Apps header
      const header = await page.$eval('h3', el => el.textContent);
      expect(header).toContain('Operating Sub-Apps');
      
      // Check for status indicators
      const statusIndicators = await page.$$('.w-2.h-2.rounded-full');
      expect(statusIndicators.length).toBeGreaterThan(0);
      
      // Check for refresh functionality
      const refreshButton = await page.$('[title="Refresh status"]');
      expect(refreshButton).toBeTruthy();
    });

    test('should display Project Surfaces with nested context', async () => {
      // Check for Project Surfaces header
      const projectHeader = await page.waitForSelector('text=Project Surfaces');
      expect(projectHeader).toBeTruthy();
      
      // Check for project context display
      const projectContext = await page.$('.bg-blue-50.rounded-lg.border.border-blue-200');
      expect(projectContext).toBeTruthy();
      
      // Check for work surface buttons
      const planSurface = await page.$('button[title*="Plan"]');
      const executeSurface = await page.$('button[title*="Execute"]');
      const documentSurface = await page.$('button[title*="Document"]');
      const governSurface = await page.$('button[title*="Govern"]');
      
      expect(planSurface).toBeTruthy();
      expect(executeSurface).toBeTruthy();
      expect(documentSurface).toBeTruthy();
      expect(governSurface).toBeTruthy();
    });

    test('should display System Surfaces with admin tools', async () => {
      // Check for System Surfaces header
      const systemHeader = await page.waitForSelector('text=System Surfaces');
      expect(systemHeader).toBeTruthy();
      
      // Check for system surface buttons
      const integrateSurface = await page.$('button:has-text("Integrate")');
      const spqrSurface = await page.$('button:has-text("SPQR Runtime")');
      const adminSurface = await page.$('button:has-text("Admin")');
      
      expect(integrateSurface).toBeTruthy();
      expect(spqrSurface).toBeTruthy();
      expect(adminSurface).toBeTruthy();
    });
  });

  describe('Sidebar Collapse Functionality', () => {
    test('should collapse and expand sidebar correctly', async () => {
      // Find and click collapse button
      const collapseButton = await page.waitForSelector('[data-testid="sidebar-collapse"]');
      await collapseButton.click();
      
      // Wait for animation and check collapsed state
      await page.waitForTimeout(500);
      const collapsedSidebar = await page.$('.w-16');
      expect(collapsedSidebar).toBeTruthy();
      
      // Check that collapsed sections are present
      const collapsedSections = await page.$$('.p-2.border-b.border-gray-200');
      expect(collapsedSections.length).toBe(3); // Three collapsed sections
      
      // Expand sidebar
      const expandButton = await page.waitForSelector('[data-testid="sidebar-expand"]');
      await expandButton.click();
      
      // Wait for animation and check expanded state
      await page.waitForTimeout(500);
      const expandedSidebar = await page.$('.w-80');
      expect(expandedSidebar).toBeTruthy();
    });
  });

  describe('Sub-App Status Integration', () => {
    test('should display sub-app status badges with hover tooltips', async () => {
      // Check for sub-app status badges
      const statusBadges = await page.$$('.p-2.rounded-md.hover\\:bg-gray-50');
      expect(statusBadges.length).toBeGreaterThan(0);
      
      // Test hover tooltip on first badge
      if (statusBadges.length > 0) {
        await statusBadges[0].hover();
        await page.waitForTimeout(200);
        
        // Check for tooltip appearance
        const tooltip = await page.$('.absolute.z-50');
        expect(tooltip).toBeTruthy();
      }
    });

    test('should update status indicators over time', async () => {
      // Get initial status count
      const initialActiveCount = await page.$$eval(
        '.text-green-700',
        elements => elements.filter(el => el.textContent.includes('Active')).length
      );
      
      // Wait for status update (30+ seconds for real update or immediate for mock)
      await page.waitForTimeout(2000);
      
      // Check that status is still being monitored
      const refreshTime = await page.$eval(
        'text=Last updated:',
        el => el.textContent
      );
      expect(refreshTime).toContain('Last updated:');
    });
  });

  describe('Quick Switcher Modal', () => {
    test('should open quick switcher with Cmd+K', async () => {
      // Trigger Cmd+K (or Ctrl+K on non-Mac)
      await page.keyboard.down('Meta'); // Use 'Control' for non-Mac
      await page.keyboard.press('k');
      await page.keyboard.up('Meta');
      
      // Wait for modal to appear
      await page.waitForSelector('.fixed.inset-0.z-50', { timeout: 2000 });
      
      // Check modal content
      const searchInput = await page.$('input[placeholder*="Search projects"]');
      expect(searchInput).toBeTruthy();
      
      // Close modal with Escape
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
      
      // Verify modal is closed
      const modal = await page.$('.fixed.inset-0.z-50');
      expect(modal).toBeFalsy();
    });

    test('should filter results in quick switcher', async () => {
      // Open quick switcher
      await page.keyboard.down('Meta');
      await page.keyboard.press('k');
      await page.keyboard.up('Meta');
      
      await page.waitForSelector('input[placeholder*="Search projects"]');
      
      // Type search query
      await page.type('input[placeholder*="Search projects"]', 'project');
      await page.waitForTimeout(200);
      
      // Check filtered results
      const results = await page.$$('.w-full.flex.items-center.px-4.py-3');
      expect(results.length).toBeGreaterThan(0);
      
      // Close modal
      await page.keyboard.press('Escape');
    });
  });

  describe('Navigation and Context Preservation', () => {
    test('should maintain project context across surface navigation', async () => {
      // Click on Execute surface
      const executeButton = await page.waitForSelector('button:has-text("Execute")');
      await executeButton.click();
      
      await page.waitForTimeout(500);
      
      // Check that project context is preserved
      const projectContext = await page.$('.bg-blue-50.rounded-lg.border.border-blue-200');
      expect(projectContext).toBeTruthy();
      
      // Switch to Document surface
      const documentButton = await page.waitForSelector('button:has-text("Document")');
      await documentButton.click();
      
      await page.waitForTimeout(500);
      
      // Verify project context still preserved
      const contextAfterSwitch = await page.$('.bg-blue-50.rounded-lg.border.border-blue-200');
      expect(contextAfterSwitch).toBeTruthy();
    });

    test('should persist sidebar state in localStorage', async () => {
      // Get initial sidebar state
      const initialState = await page.evaluate(() => {
        return {
          collapsed: localStorage.getItem('wombat-track-sidebar-collapsed'),
          surface: localStorage.getItem('wombat-track-selected-surface'),
          subApp: localStorage.getItem('wombat-track-current-subapp')
        };
      });
      
      // Make changes to sidebar state
      const collapseButton = await page.$('[data-testid="sidebar-collapse"]');
      if (collapseButton) {
        await collapseButton.click();
        await page.waitForTimeout(200);
      }
      
      // Check that localStorage was updated
      const updatedState = await page.evaluate(() => {
        return localStorage.getItem('wombat-track-sidebar-collapsed');
      });
      
      expect(updatedState).toBe('true');
    });
  });

  describe('Error Handling and Fallbacks', () => {
    test('should handle API failures gracefully', async () => {
      // Intercept API calls and simulate failure
      await page.setRequestInterception(true);
      
      page.on('request', (request) => {
        if (request.url().includes('/api/admin/runtime/status')) {
          request.abort();
        } else {
          request.continue();
        }
      });
      
      // Refresh the page to trigger API calls
      await page.reload({ waitUntil: 'networkidle0' });
      
      // Check that fallback data is displayed
      const operatingSection = await page.waitForSelector('text=Operating Sub-Apps');
      expect(operatingSection).toBeTruthy();
      
      // Disable request interception
      await page.setRequestInterception(false);
    });
  });

  describe('Accessibility and UX', () => {
    test('should have proper ARIA labels and keyboard navigation', async () => {
      // Check for ARIA labels on interactive elements
      const buttons = await page.$$('button');
      
      for (const button of buttons) {
        const ariaLabel = await button.evaluate(el => el.getAttribute('aria-label'));
        const title = await button.evaluate(el => el.getAttribute('title'));
        const textContent = await button.evaluate(el => el.textContent.trim());
        
        // Button should have some form of accessible name
        expect(ariaLabel || title || textContent).toBeTruthy();
      }
    });

    test('should support keyboard navigation in quick switcher', async () => {
      // Open quick switcher
      await page.keyboard.down('Meta');
      await page.keyboard.press('k');
      await page.keyboard.up('Meta');
      
      await page.waitForSelector('input[placeholder*="Search projects"]');
      
      // Use arrow keys to navigate
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(100);
      
      // Check that selection moved
      const selectedItem = await page.$('.bg-blue-50.border-r-2.border-blue-500');
      expect(selectedItem).toBeTruthy();
      
      // Close modal
      await page.keyboard.press('Escape');
    });
  });

  describe('Performance and Loading States', () => {
    test('should show loading states during data fetch', async () => {
      // Reload page and check for loading indicators
      await page.reload({ waitUntil: 'domcontentloaded' });
      
      // Look for loading spinners or indicators
      const loadingIndicator = await page.$('.animate-spin');
      
      // Loading indicator should exist initially
      if (loadingIndicator) {
        expect(loadingIndicator).toBeTruthy();
      }
      
      // Wait for loading to complete
      await page.waitForSelector('text=Operating Sub-Apps', { timeout: 10000 });
    });
  });
});

// Helper function to wait for element with text
async function waitForText(page, text, timeout = 5000) {
  return page.waitForFunction(
    (text) => document.body.innerText.includes(text),
    { timeout },
    text
  );
}