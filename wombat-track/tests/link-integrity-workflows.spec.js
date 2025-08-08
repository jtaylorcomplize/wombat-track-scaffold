/**
 * Puppeteer Tests for Link Integrity Repair Workflows
 * OF-9.5.2: End-to-end testing of link integrity detection and repair UI
 */

const puppeteer = require('puppeteer');

describe('Link Integrity Workflows', () => {
  let browser;
  let page;
  const BASE_URL = process.env.BASE_URL || 'http://localhost:5174';
  const TEST_TIMEOUT = 60000;

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: process.env.CI === 'true',
      slowMo: 50,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  });

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  });

  beforeEach(async () => {
    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    
    // Navigate to governance logs page
    await page.goto(`${BASE_URL}/governance-logs`, { 
      waitUntil: 'networkidle0',
      timeout: TEST_TIMEOUT 
    });
    
    // Wait for page to load
    await page.waitForSelector('[data-testid="governance-logs-container"]', { timeout: TEST_TIMEOUT });
  });

  afterEach(async () => {
    if (page) {
      await page.close();
    }
  });

  describe('Link Integrity Badge Display', () => {
    it('should display integrity badges on governance log cards', async () => {
      // Wait for log cards to load
      await page.waitForSelector('[data-testid="governance-log-card"]', { timeout: TEST_TIMEOUT });
      
      // Check for integrity badges
      const badges = await page.$$('[data-testid="integrity-badge"]');
      
      if (badges.length > 0) {
        // Verify badge structure
        const badgeText = await page.evaluate((badge) => {
          return badge.textContent;
        }, badges[0]);
        
        expect(badgeText).toMatch(/\d+/); // Should contain issue count
        
        // Check badge hover tooltip
        await badges[0].hover();
        await page.waitForSelector('[data-testid="badge-tooltip"]', { timeout: 5000 });
        
        const tooltipText = await page.$eval('[data-testid="badge-tooltip"]', el => el.textContent);
        expect(tooltipText).toContain('link');
      }
    });

    it('should show different severity colors for badges', async () => {
      await page.waitForSelector('[data-testid="governance-log-card"]', { timeout: TEST_TIMEOUT });
      
      const badges = await page.$$('[data-testid="integrity-badge"]');
      
      for (const badge of badges) {
        const classes = await page.evaluate((el) => el.className, badge);
        
        // Should contain one of the severity color classes
        expect(classes).toMatch(/(bg-red-100|bg-yellow-100|bg-blue-100)/);
      }
    });
  });

  describe('GovLog Manager Modal - Link Integrity Tab', () => {
    beforeEach(async () => {
      // Open the governance log manager modal
      await page.click('[data-testid="open-govlog-manager"]');
      await page.waitForSelector('[data-testid="govlog-manager-modal"]', { timeout: TEST_TIMEOUT });
      
      // Switch to Link Integrity tab
      await page.click('[data-testid="link-integrity-tab"]');
      await page.waitForSelector('[data-testid="link-integrity-panel"]', { timeout: TEST_TIMEOUT });
    });

    it('should display link integrity scan results', async () => {
      // Wait for scan button or results to load
      await page.waitForSelector('[data-testid="integrity-scan-button"], [data-testid="integrity-results"]', { 
        timeout: TEST_TIMEOUT 
      });
      
      // Click scan button if present
      const scanButton = await page.$('[data-testid="integrity-scan-button"]');
      if (scanButton) {
        await scanButton.click();
        
        // Wait for scan to complete
        await page.waitForSelector('[data-testid="integrity-results"]', { timeout: 30000 });
      }
      
      // Verify results display
      const results = await page.$('[data-testid="integrity-results"]');
      expect(results).toBeTruthy();
      
      // Check scan summary
      const summary = await page.$eval('[data-testid="scan-summary"]', el => el.textContent);
      expect(summary).toContain('scanned');
    });

    it('should display integrity issues with proper categorization', async () => {
      // Trigger scan if needed
      const scanButton = await page.$('[data-testid="integrity-scan-button"]');
      if (scanButton) {
        await scanButton.click();
        await page.waitForSelector('[data-testid="integrity-results"]', { timeout: 30000 });
      }
      
      // Check for issue categories
      const categories = ['critical', 'warning', 'info'];
      
      for (const category of categories) {
        const categorySection = await page.$(`[data-testid="${category}-issues"]`);
        if (categorySection) {
          const issues = await page.$$(`[data-testid="${category}-issue-item"]`);
          
          for (const issue of issues) {
            // Verify issue structure
            const issueText = await page.evaluate(el => el.textContent, issue);
            expect(issueText.length).toBeGreaterThan(0);
            
            // Check for repair button
            const repairButton = await issue.$('[data-testid="repair-issue-button"]');
            expect(repairButton).toBeTruthy();
          }
        }
      }
    });

    it('should show repair suggestions for issues', async () => {
      // Trigger scan if needed
      const scanButton = await page.$('[data-testid="integrity-scan-button"]');
      if (scanButton) {
        await scanButton.click();
        await page.waitForSelector('[data-testid="integrity-results"]', { timeout: 30000 });
      }
      
      // Find an issue with suggestions
      const issuesWithSuggestions = await page.$$('[data-testid*="-issue-item"]:has([data-testid="suggestions-list"])');
      
      if (issuesWithSuggestions.length > 0) {
        const firstIssue = issuesWithSuggestions[0];
        
        // Check suggestions structure
        const suggestions = await firstIssue.$$('[data-testid="suggestion-item"]');
        expect(suggestions.length).toBeGreaterThan(0);
        
        // Verify suggestion contains confidence and reasoning
        const suggestionText = await page.evaluate(el => el.textContent, suggestions[0]);
        expect(suggestionText).toMatch(/\d+%/); // Confidence percentage
      }
    });

    it('should perform auto-repair workflow', async () => {
      // Trigger scan if needed
      const scanButton = await page.$('[data-testid="integrity-scan-button"]');
      if (scanButton) {
        await scanButton.click();
        await page.waitForSelector('[data-testid="integrity-results"]', { timeout: 30000 });
      }
      
      // Find auto-repairable issues
      const autoRepairButton = await page.$('[data-testid="auto-repair-all-button"]');
      
      if (autoRepairButton) {
        // Click auto-repair
        await autoRepairButton.click();
        
        // Wait for confirmation modal
        await page.waitForSelector('[data-testid="auto-repair-confirm-modal"]', { timeout: 10000 });
        
        // Confirm auto-repair
        await page.click('[data-testid="confirm-auto-repair"]');
        
        // Wait for repair to complete
        await page.waitForSelector('[data-testid="repair-success-message"], [data-testid="repair-error-message"]', { 
          timeout: 20000 
        });
        
        // Verify success message
        const successMessage = await page.$('[data-testid="repair-success-message"]');
        if (successMessage) {
          const messageText = await page.evaluate(el => el.textContent, successMessage);
          expect(messageText).toContain('repaired');
        }
      }
    });

    it('should perform manual repair workflow', async () => {
      // Trigger scan if needed
      const scanButton = await page.$('[data-testid="integrity-scan-button"]');
      if (scanButton) {
        await scanButton.click();
        await page.waitForSelector('[data-testid="integrity-results"]', { timeout: 30000 });
      }
      
      // Find a repairable issue
      const repairButtons = await page.$$('[data-testid="repair-issue-button"]');
      
      if (repairButtons.length > 0) {
        // Click repair button for first issue
        await repairButtons[0].click();
        
        // Wait for repair modal
        await page.waitForSelector('[data-testid="manual-repair-modal"]', { timeout: 10000 });
        
        // Fill in new value
        const newValueInput = await page.$('[data-testid="new-value-input"]');
        await newValueInput.clear();
        await newValueInput.type('OF-9.5');
        
        // Add repair reason
        const reasonInput = await page.$('[data-testid="repair-reason-input"]');
        if (reasonInput) {
          await reasonInput.type('Manual correction for testing');
        }
        
        // Submit repair
        await page.click('[data-testid="submit-manual-repair"]');
        
        // Wait for repair result
        await page.waitForSelector('[data-testid="repair-success-message"], [data-testid="repair-error-message"]', { 
          timeout: 15000 
        });
        
        // Verify result
        const result = await page.$('[data-testid="repair-success-message"], [data-testid="repair-error-message"]');
        const resultText = await page.evaluate(el => el.textContent, result);
        expect(resultText.length).toBeGreaterThan(0);
      }
    });

    it('should apply suggested repair value', async () => {
      // Trigger scan if needed
      const scanButton = await page.$('[data-testid="integrity-scan-button"]');
      if (scanButton) {
        await scanButton.click();
        await page.waitForSelector('[data-testid="integrity-results"]', { timeout: 30000 });
      }
      
      // Find issue with suggestions
      const suggestionButtons = await page.$$('[data-testid="apply-suggestion-button"]');
      
      if (suggestionButtons.length > 0) {
        // Click apply suggestion
        await suggestionButtons[0].click();
        
        // Wait for confirmation
        await page.waitForSelector('[data-testid="suggestion-confirm-modal"]', { timeout: 10000 });
        
        // Confirm suggestion
        await page.click('[data-testid="confirm-suggestion"]');
        
        // Wait for repair result
        await page.waitForSelector('[data-testid="repair-success-message"]', { timeout: 15000 });
        
        const successMessage = await page.$eval('[data-testid="repair-success-message"]', el => el.textContent);
        expect(successMessage).toContain('applied');
      }
    });
  });

  describe('Real-time Updates After Repairs', () => {
    it('should update integrity badges after successful repair', async () => {
      // Get initial badge count
      const initialBadges = await page.$$('[data-testid="integrity-badge"]');
      const initialCount = initialBadges.length;
      
      // Open modal and perform repair
      await page.click('[data-testid="open-govlog-manager"]');
      await page.waitForSelector('[data-testid="govlog-manager-modal"]', { timeout: TEST_TIMEOUT });
      await page.click('[data-testid="link-integrity-tab"]');
      await page.waitForSelector('[data-testid="link-integrity-panel"]', { timeout: TEST_TIMEOUT });
      
      // Trigger scan and repair if issues exist
      const scanButton = await page.$('[data-testid="integrity-scan-button"]');
      if (scanButton) {
        await scanButton.click();
        await page.waitForSelector('[data-testid="integrity-results"]', { timeout: 30000 });
        
        const autoRepairButton = await page.$('[data-testid="auto-repair-all-button"]');
        if (autoRepairButton) {
          await autoRepairButton.click();
          await page.waitForSelector('[data-testid="auto-repair-confirm-modal"]', { timeout: 10000 });
          await page.click('[data-testid="confirm-auto-repair"]');
          await page.waitForSelector('[data-testid="repair-success-message"]', { timeout: 20000 });
        }
      }
      
      // Close modal
      await page.click('[data-testid="close-modal"]');
      await page.waitForSelector('[data-testid="govlog-manager-modal"]', { hidden: true });
      
      // Wait for badge updates
      await page.waitForTimeout(2000);
      
      // Check if badges were updated
      const updatedBadges = await page.$$('[data-testid="integrity-badge"]');
      
      // Either badges should be removed or counts should be updated
      expect(updatedBadges.length).toBeLessThanOrEqual(initialCount);
    });

    it('should refresh integrity scan results after repair', async () => {
      // Open modal and get initial results
      await page.click('[data-testid="open-govlog-manager"]');
      await page.waitForSelector('[data-testid="govlog-manager-modal"]', { timeout: TEST_TIMEOUT });
      await page.click('[data-testid="link-integrity-tab"]');
      
      const scanButton = await page.$('[data-testid="integrity-scan-button"]');
      if (scanButton) {
        await scanButton.click();
        await page.waitForSelector('[data-testid="integrity-results"]', { timeout: 30000 });
      }
      
      // Get initial issue count
      const initialSummary = await page.$eval('[data-testid="scan-summary"]', el => el.textContent);
      const initialIssueMatch = initialSummary.match(/(\d+)\s+total\s+issues/i);
      const initialIssueCount = initialIssueMatch ? parseInt(initialIssueMatch[1]) : 0;
      
      // Perform repair if issues exist
      if (initialIssueCount > 0) {
        const repairButtons = await page.$$('[data-testid="repair-issue-button"]');
        if (repairButtons.length > 0) {
          await repairButtons[0].click();
          await page.waitForSelector('[data-testid="manual-repair-modal"]', { timeout: 10000 });
          
          const newValueInput = await page.$('[data-testid="new-value-input"]');
          await newValueInput.clear();
          await newValueInput.type('OF-9.5');
          
          await page.click('[data-testid="submit-manual-repair"]');
          await page.waitForSelector('[data-testid="repair-success-message"]', { timeout: 15000 });
        }
      }
      
      // Trigger refresh
      const refreshButton = await page.$('[data-testid="refresh-scan-button"]');
      if (refreshButton) {
        await refreshButton.click();
        await page.waitForTimeout(3000);
        
        // Check if results were updated
        const updatedSummary = await page.$eval('[data-testid="scan-summary"]', el => el.textContent);
        const updatedIssueMatch = updatedSummary.match(/(\d+)\s+total\s+issues/i);
        const updatedIssueCount = updatedIssueMatch ? parseInt(updatedIssueMatch[1]) : 0;
        
        // Issue count should be same or reduced
        expect(updatedIssueCount).toBeLessThanOrEqual(initialIssueCount);
      }
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle scan errors gracefully', async () => {
      // Simulate network error by going offline
      await page.setOfflineMode(true);
      
      await page.click('[data-testid="open-govlog-manager"]');
      await page.waitForSelector('[data-testid="govlog-manager-modal"]', { timeout: TEST_TIMEOUT });
      await page.click('[data-testid="link-integrity-tab"]');
      
      const scanButton = await page.$('[data-testid="integrity-scan-button"]');
      if (scanButton) {
        await scanButton.click();
        
        // Should show error message
        await page.waitForSelector('[data-testid="scan-error-message"]', { timeout: 10000 });
        
        const errorMessage = await page.$eval('[data-testid="scan-error-message"]', el => el.textContent);
        expect(errorMessage).toContain('error');
      }
      
      // Restore connection
      await page.setOfflineMode(false);
    });

    it('should handle repair failures gracefully', async () => {
      await page.click('[data-testid="open-govlog-manager"]');
      await page.waitForSelector('[data-testid="govlog-manager-modal"]', { timeout: TEST_TIMEOUT });
      await page.click('[data-testid="link-integrity-tab"]');
      
      const scanButton = await page.$('[data-testid="integrity-scan-button"]');
      if (scanButton) {
        await scanButton.click();
        await page.waitForSelector('[data-testid="integrity-results"]', { timeout: 30000 });
        
        const repairButtons = await page.$$('[data-testid="repair-issue-button"]');
        if (repairButtons.length > 0) {
          // Simulate failure by providing invalid repair value
          await repairButtons[0].click();
          await page.waitForSelector('[data-testid="manual-repair-modal"]', { timeout: 10000 });
          
          const newValueInput = await page.$('[data-testid="new-value-input"]');
          await newValueInput.clear();
          await newValueInput.type(''); // Empty value should fail
          
          await page.click('[data-testid="submit-manual-repair"]');
          
          // Should show error message
          await page.waitForSelector('[data-testid="repair-error-message"], [data-testid="validation-error"]', { 
            timeout: 10000 
          });
          
          const errorElement = await page.$('[data-testid="repair-error-message"], [data-testid="validation-error"]');
          const errorText = await page.evaluate(el => el.textContent, errorElement);
          expect(errorText.length).toBeGreaterThan(0);
        }
      }
    });

    it('should validate repair inputs', async () => {
      await page.click('[data-testid="open-govlog-manager"]');
      await page.waitForSelector('[data-testid="govlog-manager-modal"]', { timeout: TEST_TIMEOUT });
      await page.click('[data-testid="link-integrity-tab"]');
      
      const scanButton = await page.$('[data-testid="integrity-scan-button"]');
      if (scanButton) {
        await scanButton.click();
        await page.waitForSelector('[data-testid="integrity-results"]', { timeout: 30000 });
        
        const repairButtons = await page.$$('[data-testid="repair-issue-button"]');
        if (repairButtons.length > 0) {
          await repairButtons[0].click();
          await page.waitForSelector('[data-testid="manual-repair-modal"]', { timeout: 10000 });
          
          // Try submitting without filling required field
          const submitButton = await page.$('[data-testid="submit-manual-repair"]');
          
          // Button should be disabled or show validation error
          const isDisabled = await page.evaluate(el => el.disabled, submitButton);
          
          if (!isDisabled) {
            await submitButton.click();
            await page.waitForSelector('[data-testid="validation-error"]', { timeout: 5000 });
            
            const validationError = await page.$eval('[data-testid="validation-error"]', el => el.textContent);
            expect(validationError).toContain('required');
          } else {
            expect(isDisabled).toBe(true);
          }
        }
      }
    });
  });

  describe('Accessibility and User Experience', () => {
    it('should be keyboard navigable', async () => {
      await page.click('[data-testid="open-govlog-manager"]');
      await page.waitForSelector('[data-testid="govlog-manager-modal"]', { timeout: TEST_TIMEOUT });
      
      // Tab to Link Integrity tab
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Enter');
      
      await page.waitForSelector('[data-testid="link-integrity-panel"]', { timeout: TEST_TIMEOUT });
      
      // Should be able to navigate to scan button
      await page.keyboard.press('Tab');
      const activeElement = await page.evaluate(() => document.activeElement.getAttribute('data-testid'));
      
      expect(['integrity-scan-button', 'refresh-scan-button']).toContain(activeElement);
    });

    it('should provide appropriate ARIA labels', async () => {
      await page.click('[data-testid="open-govlog-manager"]');
      await page.waitForSelector('[data-testid="govlog-manager-modal"]', { timeout: TEST_TIMEOUT });
      await page.click('[data-testid="link-integrity-tab"]');
      
      // Check ARIA labels on key elements
      const scanButton = await page.$('[data-testid="integrity-scan-button"]');
      if (scanButton) {
        const ariaLabel = await page.evaluate(el => el.getAttribute('aria-label'), scanButton);
        expect(ariaLabel).toBeTruthy();
        expect(ariaLabel.toLowerCase()).toContain('scan');
      }
      
      // Check modal has proper ARIA attributes
      const modal = await page.$('[data-testid="govlog-manager-modal"]');
      const role = await page.evaluate(el => el.getAttribute('role'), modal);
      expect(role).toBe('dialog');
    });

    it('should show loading states during operations', async () => {
      await page.click('[data-testid="open-govlog-manager"]');
      await page.waitForSelector('[data-testid="govlog-manager-modal"]', { timeout: TEST_TIMEOUT });
      await page.click('[data-testid="link-integrity-tab"]');
      
      const scanButton = await page.$('[data-testid="integrity-scan-button"]');
      if (scanButton) {
        // Click scan and immediately check for loading state
        await scanButton.click();
        
        // Should show loading indicator
        const loadingElement = await page.waitForSelector('[data-testid="scanning-loader"], [data-testid="loading-spinner"]', { 
          timeout: 5000 
        });
        expect(loadingElement).toBeTruthy();
        
        // Loading should disappear when scan completes
        await page.waitForSelector('[data-testid="integrity-results"]', { timeout: 30000 });
        
        const loadingStillVisible = await page.$('[data-testid="scanning-loader"], [data-testid="loading-spinner"]');
        expect(loadingStillVisible).toBeFalsy();
      }
    });
  });
}, TEST_TIMEOUT);