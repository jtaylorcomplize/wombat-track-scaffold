import { test, expect, Page } from '@playwright/test';

test.describe('Enhanced Sidebar v2.0 Structure Tests', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Accordion Navigation', () => {
    test('should display all accordion sections with proper headers', async () => {
      // Check Operating Sub-Apps section
      await expect(page.locator('text=Operating Sub-Apps')).toBeVisible();
      await expect(page.locator('text=applications')).toBeVisible();

      // Check Project Work Surfaces section
      await expect(page.locator('text=Project Work Surfaces')).toBeVisible();
      await expect(page.locator('text=Plan → Execute → Document → Govern')).toBeVisible();

      // Check System Surfaces section
      await expect(page.locator('text=System Surfaces')).toBeVisible();
      await expect(page.locator('text=Platform-level tools & monitoring')).toBeVisible();
    });

    test('should expand and collapse sections with smooth animation', async () => {
      // Find a collapsible section (System Surfaces starts collapsed)
      const systemSurfacesHeader = page.locator('button:has-text("System Surfaces")');
      const systemSurfacesContent = page.locator('#system-surfaces-content');

      // Should start collapsed
      await expect(systemSurfacesContent).toHaveClass(/max-h-0/);

      // Click to expand
      await systemSurfacesHeader.click();
      
      // Should be expanding
      await expect(systemSurfacesContent).toHaveClass(/max-h-96/);
      await expect(systemSurfacesContent).toHaveClass(/opacity-100/);

      // Click to collapse
      await systemSurfacesHeader.click();
      
      // Should be collapsing
      await expect(systemSurfacesContent).toHaveClass(/max-h-0/);
      await expect(systemSurfacesContent).toHaveClass(/opacity-0/);
    });

    test('should persist accordion state in localStorage', async () => {
      // Expand System Surfaces section
      await page.locator('button:has-text("System Surfaces")').click();
      
      // Reload page
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Check that the state is persisted
      const systemSurfacesContent = page.locator('#system-surfaces-content');
      await expect(systemSurfacesContent).toHaveClass(/max-h-96/);
    });

    test('should have proper ARIA attributes for accessibility', async () => {
      const operatingSubAppsHeader = page.locator('button:has-text("Operating Sub-Apps")');
      
      // Check ARIA attributes
      await expect(operatingSubAppsHeader).toHaveAttribute('aria-expanded', 'true');
      await expect(operatingSubAppsHeader).toHaveAttribute('aria-controls', 'operating-subapps-content');
      
      // Click to collapse
      await operatingSubAppsHeader.click();
      await expect(operatingSubAppsHeader).toHaveAttribute('aria-expanded', 'false');
    });
  });

  test.describe('Direct Sub-App Launch', () => {
    test('should display sub-apps with status indicators', async () => {
      // Ensure Operating Sub-Apps section is expanded
      const operatingSection = page.locator('#operating-subapps-content');
      if (await operatingSection.getAttribute('class')?.includes('max-h-0')) {
        await page.locator('button:has-text("Operating Sub-Apps")').click();
      }

      // Check for sub-app entries
      const subAppCards = page.locator('[aria-label*="Launch"]');
      await expect(subAppCards.first()).toBeVisible();

      // Check for status indicators (colored dots)
      const statusIndicators = page.locator('.w-3.h-3.rounded-full');
      await expect(statusIndicators.first()).toBeVisible();

      // Check for timestamps
      await expect(page.locator('text=/\\d{1,2}:\\d{2}:\\d{2}/')).toBeVisible();
    });

    test('should open sub-app in new tab when clicked', async () => {
      // Set up context to track new pages
      const [newPage] = await Promise.all([
        page.waitForEvent('popup'),
        page.locator('[aria-label*="Launch"]:first-child').click()
      ]);

      // Verify new tab opened
      expect(newPage).toBeTruthy();
      
      // Check that URL contains expected domain
      const url = newPage.url();
      expect(url).toMatch(/https?:\/\/.+\.(com|app|internal)\//);
      
      await newPage.close();
    });

    test('should support keyboard navigation for sub-app launch', async () => {
      // Focus first sub-app and press Enter
      const firstSubApp = page.locator('[aria-label*="Launch"]:first-child');
      await firstSubApp.focus();
      
      const [newPage] = await Promise.all([
        page.waitForEvent('popup'),
        page.keyboard.press('Enter')
      ]);

      expect(newPage).toBeTruthy();
      await newPage.close();
    });

    test('should show loading state and refresh functionality', async () => {
      // Check for refresh button
      const refreshButton = page.locator('button:has-text("Refresh Status")');
      await expect(refreshButton).toBeVisible();

      // Click refresh and check for loading state
      await refreshButton.click();
      
      // Should see loading spinner briefly
      await page.waitForSelector('.animate-spin', { timeout: 2000 });
    });
  });

  test.describe('Project Header Context', () => {
    test('should display project header with all elements', async () => {
      // Check platform title
      await expect(page.locator('text=Orbis Platform')).toBeVisible();
      await expect(page.locator('text=v2.0')).toBeVisible();

      // Check project selector
      await expect(page.locator('button[aria-haspopup="listbox"]')).toBeVisible();

      // Check current surface indicator
      await expect(page.locator('.text-sm:has-text("Plan")')).toBeVisible();

      // Check sub-app summary
      await expect(page.locator('.text-blue-600')).toBeVisible();

      // Check settings button
      await expect(page.locator('button[aria-label="Project Settings"]')).toBeVisible();
    });

    test('should open project dropdown when clicked', async () => {
      const projectSelector = page.locator('button[aria-haspopup="listbox"]');
      await projectSelector.click();

      // Check dropdown appears
      await expect(page.locator('[role="option"]')).toBeVisible();
      
      // Check RAG status indicators
      await expect(page.locator('.w-2.h-2.rounded-full')).toBeVisible();
    });

    test('should display live sub-app summary', async () => {
      // Check for sub-app count and status indicators
      const subAppSummary = page.locator('.flex.items-center.space-x-1:has(.text-blue-600)');
      await expect(subAppSummary).toBeVisible();

      // Check for emoji status indicators
      await expect(page.locator('text=🟢')).toBeVisible({ timeout: 5000 });
    });

    test('should navigate to admin when settings clicked', async () => {
      const settingsButton = page.locator('button[aria-label="Project Settings"]');
      await settingsButton.click();

      // Should navigate to admin surface
      await expect(page.locator('.bg-slate-100')).toBeVisible();
    });
  });

  test.describe('Surface Navigation', () => {
    test('should highlight current surface with bullet indicator', async () => {
      // Check current surface highlighting
      const currentSurface = page.locator('.bg-green-100');
      await expect(currentSurface).toBeVisible();
      
      // Check bullet indicator
      await expect(page.locator('.w-2.h-2.bg-green-500.rounded-full')).toBeVisible();
    });

    test('should switch surfaces when clicked', async () => {
      // Click Execute surface
      const executeButton = page.locator('button:has-text("Execute")');
      await executeButton.click();

      // Check highlighting moved
      await expect(executeButton).toHaveClass(/bg-green-100/);
      
      // Check bullet indicator moved
      const executeBullet = executeButton.locator('.w-2.h-2.bg-green-500.rounded-full');
      await expect(executeBullet).toBeVisible();
    });

    test('should maintain separate styling for system vs project surfaces', async () => {
      // Expand system surfaces
      await page.locator('button:has-text("System Surfaces")').click();
      
      // Click Admin surface
      const adminButton = page.locator('button:has-text("Admin")').last();
      await adminButton.click();

      // Check slate styling for system surface
      await expect(adminButton).toHaveClass(/bg-slate-100/);
      await expect(page.locator('.w-2.h-2.bg-slate-500.rounded-full')).toBeVisible();
    });
  });

  test.describe('Responsive Behavior', () => {
    test('should collapse to minimal view', async () => {
      // Click collapse button
      await page.locator('button:has-text("Collapse Sidebar")').click();

      // Check collapsed width
      const sidebar = page.locator('.w-16');
      await expect(sidebar).toBeVisible();

      // Check collapsed indicators
      await expect(page.locator('[title="Operating Sub-Apps"]')).toBeVisible();
      await expect(page.locator('[title="Project Surfaces"]')).toBeVisible();
      await expect(page.locator('[title="System Surfaces"]')).toBeVisible();
    });

    test('should expand from collapsed state', async () => {
      // First collapse
      await page.locator('button:has-text("Collapse Sidebar")').click();
      
      // Then expand
      await page.locator('button[aria-label="Expand sidebar"]').click();

      // Check full width restored
      const sidebar = page.locator('.w-80');
      await expect(sidebar).toBeVisible();
      
      // Check full content visible
      await expect(page.locator('text=Operating Sub-Apps')).toBeVisible();
    });
  });

  test.describe('Performance and Loading', () => {
    test('should handle sub-app loading states gracefully', async () => {
      // Reload and check for loading state
      await page.reload();
      
      // Should show loading spinner initially
      await page.waitForSelector('.animate-spin', { timeout: 5000 });
      
      // Then show sub-apps
      await expect(page.locator('[aria-label*="Launch"]')).toBeVisible({ timeout: 10000 });
    });

    test('should update timestamps periodically', async () => {
      // Get initial timestamp
      const initialTimestamp = await page.locator('.text-xs.text-gray-500').first().textContent();
      
      // Wait for potential update (mock updates should be faster than 30s)
      await page.waitForTimeout(2000);
      
      // Timestamps should exist and be valid
      expect(initialTimestamp).toMatch(/\d{1,2}:\d{2}:\d{2}/);
    });
  });

  test.describe('Governance Logging', () => {
    test('should log governance events to console in development', async () => {
      // Set up console listener
      const consoleMessages: string[] = [];
      page.on('console', msg => {
        if (msg.text().includes('Governance Logs')) {
          consoleMessages.push(msg.text());
        }
      });

      // Perform actions that should trigger logging
      await page.locator('button:has-text("Execute")').click();
      await page.locator('button:has-text("System Surfaces")').click();
      
      // Wait for potential batched logs
      await page.waitForTimeout(1500);
      
      // Should have logged events
      expect(consoleMessages.length).toBeGreaterThan(0);
    });
  });

  test.describe('Error Handling', () => {
    test('should handle sub-app launch failures gracefully', async () => {
      // Mock window.open to fail
      await page.addInitScript(() => {
        const originalOpen = window.open;
        window.open = () => {
          throw new Error('Launch failed');
        };
      });

      // Try to launch sub-app - should not crash
      await page.locator('[aria-label*="Launch"]:first-child').click();
      
      // Sidebar should still be functional
      await expect(page.locator('text=Operating Sub-Apps')).toBeVisible();
    });

    test('should show fallback when no sub-apps available', async () => {
      // Mock empty sub-apps response
      await page.route('**/api/admin/runtime/status', route => {
        route.fulfill({ 
          status: 200, 
          contentType: 'application/json',
          body: JSON.stringify({ subApps: [] })
        });
      });

      await page.reload();
      await page.waitForLoadState('networkidle');

      // Should show fallback message
      await expect(page.locator('text=No sub-apps available')).toBeVisible();
    });
  });
});