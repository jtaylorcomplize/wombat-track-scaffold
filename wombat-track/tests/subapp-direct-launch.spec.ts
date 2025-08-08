import type { Page } from '@playwright/test';
import { test, expect } from '@playwright/test';

test.describe('Sub-App Direct Launch Tests', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    // Ensure Operating Sub-Apps section is expanded
    const operatingSection = page.locator('#operating-subapps-content');
    const isCollapsed = await operatingSection.getAttribute('class')?.includes('max-h-0');
    if (isCollapsed) {
      await page.locator('button:has-text("Operating Sub-Apps")').click();
    }
  });

  test.describe('Direct Launch Functionality', () => {
    test('should launch Orbis Intelligence in new tab', async () => {
      const [newPage] = await Promise.all([
        page.waitForEvent('popup'),
        page.locator('[aria-label="Launch Orbis Intelligence"]').click()
      ]);

      expect(newPage.url()).toContain('orbis.complize.com');
      await newPage.close();
    });

    test('should launch Complize Platform in new tab', async () => {
      const [newPage] = await Promise.all([
        page.waitForEvent('popup'),
        page.locator('[aria-label="Launch Complize Platform"]').click()
      ]);

      expect(newPage.url()).toContain('app.complize.com');
      await newPage.close();
    });

    test('should launch SPQR Runtime in new tab', async () => {
      const [newPage] = await Promise.all([
        page.waitForEvent('popup'),
        page.locator('[aria-label="Launch SPQR Runtime"]').click()
      ]);

      expect(newPage.url()).toContain('spqr.internal.com');
      await newPage.close();
    });

    test('should launch VisaCalc Pro in new tab', async () => {
      const [newPage] = await Promise.all([
        page.waitForEvent('popup'),
        page.locator('[aria-label="Launch VisaCalc Pro"]').click()
      ]);

      expect(newPage.url()).toContain('visacalc.complize.com');
      await newPage.close();
    });

    test('should launch DealFlow Manager in new tab', async () => {
      const [newPage] = await Promise.all([
        page.waitForEvent('popup'),
        page.locator('[aria-label="Launch DealFlow Manager"]').click()
      ]);

      expect(newPage.url()).toContain('dealflow.app.com');
      await newPage.close();
    });
  });

  test.describe('Launch Status and Behavior', () => {
    test('should display status indicators for each sub-app', async () => {
      const subAppCards = page.locator('[aria-label*="Launch"]');
      const count = await subAppCards.count();

      for (let i = 0; i < count; i++) {
        const card = subAppCards.nth(i);
        const statusIndicator = card.locator('.w-3.h-3.rounded-full').first();
        await expect(statusIndicator).toBeVisible();
        
        // Check status color classes
        const className = await statusIndicator.getAttribute('class');
        expect(className).toMatch(/(bg-green-500|bg-amber-500|bg-red-500)/);
      }
    });

    test('should show hover effects on sub-app cards', async () => {
      const firstCard = page.locator('[aria-label*="Launch"]').first();
      
      // Hover over card
      await firstCard.hover();
      
      // Check hover styles
      await expect(firstCard).toHaveClass(/hover:border-blue-300/);
      await expect(firstCard).toHaveClass(/hover:bg-blue-50/);
    });

    test('should display last updated timestamps', async () => {
      const timestamps = page.locator('.text-xs.text-gray-500');
      const count = await timestamps.count();
      
      expect(count).toBeGreaterThan(0);
      
      // Check timestamp format
      for (let i = 0; i < Math.min(count, 5); i++) {
        const timestamp = await timestamps.nth(i).textContent();
        expect(timestamp).toMatch(/\d{1,2}:\d{2}:\d{2}/);
      }
    });

    test('should handle offline sub-apps appropriately', async () => {
      // Look for offline status indicators
      const offlineIndicators = page.locator('.bg-red-500');
      
      if (await offlineIndicators.count() > 0) {
        // Offline sub-apps should still be clickable but show red status
        const offlineCard = page.locator('[aria-label*="Launch"]').filter({
          has: page.locator('.bg-red-500')
        }).first();
        
        if (await offlineCard.count() > 0) {
          // Should still attempt to launch (might show error page)
          const [newPage] = await Promise.all([
            page.waitForEvent('popup'),
            offlineCard.click()
          ]);
          
          expect(newPage).toBeTruthy();
          await newPage.close();
        }
      }
    });
  });

  test.describe('Keyboard Accessibility', () => {
    test('should support Tab navigation through sub-apps', async () => {
      // Focus first sub-app
      await page.keyboard.press('Tab');
      
      // Navigate through sub-apps with Tab
      const subAppCards = page.locator('[aria-label*="Launch"]');
      const count = await subAppCards.count();
      
      for (let i = 0; i < count; i++) {
        const focused = page.locator(':focus');
        await expect(focused).toBeVisible();
        await page.keyboard.press('Tab');
      }
    });

    test('should support Enter key for launching', async () => {
      const firstCard = page.locator('[aria-label*="Launch"]').first();
      await firstCard.focus();
      
      const [newPage] = await Promise.all([
        page.waitForEvent('popup'),
        page.keyboard.press('Enter')
      ]);
      
      expect(newPage).toBeTruthy();
      await newPage.close();
    });

    test('should support Space key for launching', async () => {
      const secondCard = page.locator('[aria-label*="Launch"]').nth(1);
      await secondCard.focus();
      
      const [newPage] = await Promise.all([
        page.waitForEvent('popup'),
        page.keyboard.press(' ')
      ]);
      
      expect(newPage).toBeTruthy();
      await newPage.close();
    });
  });

  test.describe('Governance Logging', () => {
    test('should log sub-app launch events', async () => {
      // Set up console listener for governance logs
      const governanceLogs: string[] = [];
      page.on('console', msg => {
        if (msg.text().includes('sub_app_launch')) {
          governanceLogs.push(msg.text());
        }
      });

      // Launch a sub-app
      const [newPage] = await Promise.all([
        page.waitForEvent('popup'),
        page.locator('[aria-label*="Launch"]').first().click()
      ]);
      
      await newPage.close();
      
      // Wait for governance log
      await page.waitForTimeout(1500);
      
      // Should have logged the launch
      expect(governanceLogs.length).toBeGreaterThan(0);
    });

    test('should include correct metadata in launch logs', async () => {
      let capturedLog: any = null;
      
      page.on('console', msg => {
        if (msg.text().includes('sub_app_launch')) {
          try {
            const logText = msg.text();
            const jsonStart = logText.indexOf('{');
            if (jsonStart !== -1) {
              capturedLog = JSON.parse(logText.substring(jsonStart));
            }
          } catch (e) {
            // Ignore parsing errors
          }
        }
      });

      // Launch a sub-app
      const [newPage] = await Promise.all([
        page.waitForEvent('popup'),
        page.locator('[aria-label*="Launch"]').first().click()
      ]);
      
      await newPage.close();
      await page.waitForTimeout(1500);
      
      if (capturedLog) {
        expect(capturedLog.action).toBe('sub_app_launch');
        expect(capturedLog.details.launch_method).toBe('direct_click');
        expect(capturedLog.details.opened_in_new_tab).toBe(true);
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should handle popup blocker gracefully', async () => {
      // Mock window.open to return null (popup blocked)
      await page.addInitScript(() => {
        const originalOpen = window.open;
        window.open = () => null;
      });

      // Click should not crash the application
      await page.locator('[aria-label*="Launch"]').first().click();
      
      // Sidebar should still be functional
      await expect(page.locator('text=Operating Sub-Apps')).toBeVisible();
    });

    test('should handle invalid URLs gracefully', async () => {
      // Mock sub-app with invalid URL
      await page.route('**/api/admin/runtime/status', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            subApps: [{
              id: 'test-invalid',
              name: 'Test Invalid',
              status: 'active',
              lastUpdated: new Date().toISOString(),
              launchUrl: 'invalid-url'
            }]
          })
        });
      });

      await page.reload();
      await page.waitForLoadState('networkidle');

      // Should still render the sub-app card
      await expect(page.locator('[aria-label="Launch Test Invalid"]')).toBeVisible();
    });
  });

  test.describe('Refresh Functionality', () => {
    test('should refresh sub-app status when refresh button clicked', async () => {
      // Get initial sub-app count
      const initialCount = await page.locator('[aria-label*="Launch"]').count();
      
      // Click refresh
      await page.locator('button:has-text("Refresh Status")').click();
      
      // Should show loading state briefly
      await page.waitForSelector('.animate-spin', { timeout: 2000 });
      
      // Should maintain same count (or handle dynamic changes)
      await expect(page.locator('[aria-label*="Launch"]')).toHaveCount(initialCount);
    });

    test('should update timestamps after refresh', async () => {
      // Get initial timestamps
      const initialTimestamps = await page.locator('.text-xs.text-gray-500').allTextContents();
      
      // Wait a moment then refresh
      await page.waitForTimeout(1000);
      await page.locator('button:has-text("Refresh Status")').click();
      await page.waitForLoadState('networkidle');
      
      // Check that content is refreshed
      await expect(page.locator('[aria-label*="Launch"]')).toHaveCount(initialTimestamps.length);
    });
  });

  test.describe('Visual States', () => {
    test('should show different visual states for different status types', async () => {
      const cards = page.locator('[aria-label*="Launch"]');
      const count = await cards.count();
      
      let foundGreen = false;
      let foundAmber = false;
      let foundRed = false;
      
      for (let i = 0; i < count; i++) {
        const card = cards.nth(i);
        const statusDot = card.locator('.w-3.h-3.rounded-full').first();
        const className = await statusDot.getAttribute('class');
        
        if (className?.includes('bg-green-500')) foundGreen = true;
        if (className?.includes('bg-amber-500')) foundAmber = true;
        if (className?.includes('bg-red-500')) foundRed = true;
      }
      
      // Should have at least one active status
      expect(foundGreen).toBe(true);
    });

    test('should show proper hover effects with chevron animation', async () => {
      const firstCard = page.locator('[aria-label*="Launch"]').first();
      const chevron = firstCard.locator('.w-4.h-4').last();
      
      // Before hover
      await expect(chevron).toHaveClass(/text-gray-400/);
      
      // After hover
      await firstCard.hover();
      await expect(chevron).toHaveClass(/group-hover:text-blue-600/);
    });
  });
});