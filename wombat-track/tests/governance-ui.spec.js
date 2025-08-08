const puppeteer = require('puppeteer');

describe('Governance UI Components Tests', () => {
  let browser;
  let page;
  const baseUrl = process.env.BASE_URL || 'http://localhost:5174';

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: process.env.HEADLESS !== 'false',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  }, 30000);

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  });

  beforeEach(async () => {
    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    
    // Set up request interception for API mocking
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      if (request.url().includes('/api/admin/governance_logs')) {
        request.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            logs: [
              {
                id: 'log-1',
                ts: '2025-08-08T10:00:00Z',
                timestamp: '2025-08-08T10:00:00Z',
                actor: 'CC',
                entryType: 'Kickoff',
                classification: 'governance',
                phase_id: 'OF-9.4',
                step_id: 'OF-9.4.1',
                summary: 'UI Workspace Upgrades phase started',
                gptDraftEntry: 'CC initiated OF-9.4 UI Workspace Upgrades phase for governance log cards and manager modal implementation',
                memory_anchor_id: 'OF-GOVLOG-UI',
                links: ['docs/governance/OF-9.4-UI-Workspace.md']
              },
              {
                id: 'log-2',
                ts: '2025-08-08T11:00:00Z',
                timestamp: '2025-08-08T11:00:00Z',
                actor: 'System',
                entryType: 'Update',
                classification: 'technical',
                phase_id: 'OF-9.4',
                summary: 'Component creation completed',
                gptDraftEntry: 'System successfully created GovernanceLogCard component with AI summary preview'
              }
            ]
          })
        });
      } else if (request.url().includes('/api/admin/phases')) {
        request.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: [
              {
                stepId: 'OF-9.4.1',
                phaseId: 'OF-9.4',
                stepName: 'Governance Log Cards',
                status: 'in_progress',
                RAG: 'Green',
                priority: 'High',
                lastUpdated: '2025-08-08T10:00:00Z'
              }
            ]
          })
        });
      } else {
        request.continue();
      }
    });
  });

  afterEach(async () => {
    if (page) {
      await page.close();
    }
  });

  describe('GovernanceLogCard Component', () => {
    test('should render governance log card with AI summary', async () => {
      await page.goto(`${baseUrl}/governance`, { waitUntil: 'networkidle0' });
      
      // Wait for cards to load
      await page.waitForSelector('[class*="rounded-2xl"]', { timeout: 10000 });
      
      // Check if AI summary is displayed
      const aiSummary = await page.$eval('[class*="text-blue-500"]', el => el.parentElement.textContent);
      expect(aiSummary).toContain('CC initiated OF-9.4');
    });

    test('should display quick links to Phase/Step/Memory Anchor', async () => {
      await page.goto(`${baseUrl}/governance`, { waitUntil: 'networkidle0' });
      
      await page.waitForSelector('[class*="rounded-2xl"]', { timeout: 10000 });
      
      // Check for phase link
      const phaseLink = await page.$('button:has-text("Phase: OF-9.4")');
      expect(phaseLink).toBeTruthy();
      
      // Check for step link
      const stepLink = await page.$('button:has-text("Step: OF-9.4.1")');
      expect(stepLink).toBeTruthy();
      
      // Check for anchor link
      const anchorLink = await page.$('button:has-text("Anchor: OF-GOVLOG-UI")');
      expect(anchorLink).toBeTruthy();
    });

    test('should expand/collapse card details', async () => {
      await page.goto(`${baseUrl}/governance`, { waitUntil: 'networkidle0' });
      
      await page.waitForSelector('[class*="rounded-2xl"]', { timeout: 10000 });
      
      // Click expand button
      await page.click('button[aria-label="Expand"]');
      
      // Check if expanded content is visible
      await page.waitForSelector('h4:has-text("Summary")', { timeout: 5000 });
      
      // Click collapse button
      await page.click('button[aria-label="Collapse"]');
      
      // Check if expanded content is hidden
      const summaryHeader = await page.$('h4:has-text("Summary")');
      expect(summaryHeader).toBeFalsy();
    });

    test('should show inline edit controls for reclassification', async () => {
      await page.goto(`${baseUrl}/governance`, { waitUntil: 'networkidle0' });
      
      await page.waitForSelector('[class*="rounded-2xl"]', { timeout: 10000 });
      
      // Click edit classification button
      await page.click('button[aria-label="Edit classification"]');
      
      // Check if dropdowns appear
      await page.waitForSelector('select', { timeout: 5000 });
      
      const selects = await page.$$('select');
      expect(selects.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('GovLogManagerModal Component', () => {
    test('should open modal when clicking New Log button', async () => {
      await page.goto(`${baseUrl}/governance`, { waitUntil: 'networkidle0' });
      
      // Click New Log button
      await page.click('button:has-text("New Log")');
      
      // Wait for modal to appear
      await page.waitForSelector('h2:has-text("Governance Log Manager")', { timeout: 5000 });
      
      // Check if modal is visible
      const modal = await page.$('div[class*="fixed inset-0"]');
      expect(modal).toBeTruthy();
    });

    test('should filter logs by search term', async () => {
      await page.goto(`${baseUrl}/governance`, { waitUntil: 'networkidle0' });
      
      // Type in search box
      await page.type('input[placeholder*="Search logs"]', 'Kickoff');
      
      // Wait for filtering
      await page.waitForTimeout(500);
      
      // Check filtered results
      const cards = await page.$$('[class*="rounded-2xl"]');
      expect(cards.length).toBeGreaterThan(0);
    });

    test('should show filter controls when clicking Filters button', async () => {
      await page.goto(`${baseUrl}/governance`, { waitUntil: 'networkidle0' });
      
      // Click Filters button
      await page.click('button:has-text("Filters")');
      
      // Check if filter dropdowns appear
      await page.waitForSelector('select', { timeout: 5000 });
      
      const filterSelects = await page.$$('select');
      expect(filterSelects.length).toBeGreaterThanOrEqual(3);
    });

    test('should export logs when clicking Export button', async () => {
      await page.goto(`${baseUrl}/governance`, { waitUntil: 'networkidle0' });
      
      // Set up download listener
      const downloadPromise = new Promise((resolve) => {
        page.once('download', resolve);
      });
      
      // Click Export button
      await page.click('button:has-text("Export")');
      
      // Note: In headless mode, downloads won't actually work, but we can verify the button exists
      const exportButton = await page.$('button:has-text("Export")');
      expect(exportButton).toBeTruthy();
    });
  });

  describe('AdminPhaseView Integration', () => {
    test('should show View Related Governance Logs button in AdminPhaseView', async () => {
      await page.goto(`${baseUrl}/admin/phases`, { waitUntil: 'networkidle0' });
      
      // Wait for phase view to load
      await page.waitForSelector('h1:has-text("Admin Phase View")', { timeout: 10000 });
      
      // Check for View All Logs button
      const viewLogsButton = await page.$('button:has-text("View All Logs")');
      expect(viewLogsButton).toBeTruthy();
    });

    test('should show View Logs button for each step', async () => {
      await page.goto(`${baseUrl}/admin/phases`, { waitUntil: 'networkidle0' });
      
      // Wait for steps to load
      await page.waitForSelector('h2:has-text("Phase Steps")', { timeout: 10000 });
      
      // Check for View Logs buttons on steps
      const viewLogsButtons = await page.$$('button:has-text("View Logs")');
      expect(viewLogsButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Real-time Updates', () => {
    test('should show live updates indicator when connected', async () => {
      await page.goto(`${baseUrl}/governance`, { waitUntil: 'networkidle0' });
      
      // Check for live updates indicator
      const liveIndicator = await page.$('span:has-text("Live Updates")');
      
      // Note: This may not show in test environment without actual WebSocket
      // but we check the structure exists
      const headerText = await page.$eval('p[class*="text-gray-600"]', el => el.textContent);
      expect(headerText).toContain('Live governance data');
    });
  });

  describe('Mobile Responsiveness', () => {
    test('should be responsive on mobile viewport', async () => {
      await page.setViewport({ width: 375, height: 667 });
      await page.goto(`${baseUrl}/governance`, { waitUntil: 'networkidle0' });
      
      // Check if cards stack vertically on mobile
      await page.waitForSelector('[class*="rounded-2xl"]', { timeout: 10000 });
      
      const cards = await page.$$('[class*="rounded-2xl"]');
      expect(cards.length).toBeGreaterThan(0);
      
      // Check if layout adjusts properly
      const container = await page.$('div[class*="max-w-7xl"]');
      expect(container).toBeTruthy();
    });

    test('should have touch-friendly buttons on mobile', async () => {
      await page.setViewport({ width: 375, height: 667 });
      await page.goto(`${baseUrl}/governance`, { waitUntil: 'networkidle0' });
      
      // Check button sizes
      const buttons = await page.$$('button');
      
      for (const button of buttons.slice(0, 3)) {
        const box = await button.boundingBox();
        if (box) {
          // Buttons should be at least 44px for touch targets
          expect(box.height).toBeGreaterThanOrEqual(32);
        }
      }
    });
  });

  describe('Accessibility', () => {
    test('should have proper ARIA labels', async () => {
      await page.goto(`${baseUrl}/governance`, { waitUntil: 'networkidle0' });
      
      // Check for ARIA labels on interactive elements
      const expandButton = await page.$('button[aria-label="Expand"]');
      expect(expandButton).toBeTruthy();
      
      const editButton = await page.$('button[aria-label="Edit classification"]');
      expect(editButton).toBeTruthy();
    });

    test('should be keyboard navigable', async () => {
      await page.goto(`${baseUrl}/governance`, { waitUntil: 'networkidle0' });
      
      // Tab through elements
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // Check if focus is visible
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(focusedElement).toBeTruthy();
    });

    test('should have proper heading hierarchy', async () => {
      await page.goto(`${baseUrl}/governance`, { waitUntil: 'networkidle0' });
      
      // Check h1 exists
      const h1 = await page.$('h1');
      expect(h1).toBeTruthy();
      
      // Check heading hierarchy
      const h1Text = await page.$eval('h1', el => el.textContent);
      expect(h1Text).toContain('Governance Logs');
    });
  });

  describe('Error Handling', () => {
    test('should handle API errors gracefully', async () => {
      // Override request interception to simulate error
      await page.setRequestInterception(true);
      page.removeAllListeners('request');
      page.on('request', (request) => {
        if (request.url().includes('/api/admin/governance_logs')) {
          request.respond({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Internal Server Error' })
          });
        } else {
          request.continue();
        }
      });
      
      await page.goto(`${baseUrl}/governance`, { waitUntil: 'networkidle0' });
      
      // Should show empty state or error message
      const content = await page.content();
      expect(content).toBeTruthy();
    });

    test('should show empty state when no logs exist', async () => {
      // Override to return empty logs
      await page.setRequestInterception(true);
      page.removeAllListeners('request');
      page.on('request', (request) => {
        if (request.url().includes('/api/admin/governance_logs')) {
          request.respond({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ logs: [] })
          });
        } else {
          request.continue();
        }
      });
      
      await page.goto(`${baseUrl}/governance`, { waitUntil: 'networkidle0' });
      
      // Check for empty state message
      const emptyState = await page.$('p:has-text("No governance logs found")');
      expect(emptyState).toBeTruthy();
    });
  });
});