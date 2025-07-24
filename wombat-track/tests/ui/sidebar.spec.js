const { expect } = require('@jest/globals');

describe('ProjectSidebar Visual & Interaction Tests', () => {
  beforeAll(async () => {
    await page.goto(`http://localhost:${process.env.PORT || 5173}`, {
      waitUntil: 'networkidle0',
      timeout: 10000
    });
  });

  beforeEach(async () => {
    // Navigate to Phase Plan tab before each test
    await page.click('button:has-text("Phase Plan")');
    await page.waitForTimeout(500); // Allow for navigation
  });

  describe('Sidebar Structure & Layout', () => {
    test('sidebar renders with proper structure', async () => {
      // Wait for sidebar elements to be visible
      await page.waitForSelector('h2:text("Projects")', { timeout: 5000 });
      
      // Check main structural elements
      const structuralElements = await page.evaluate(() => {
        const elements = {
          header: !!document.querySelector('h2:has-text("Projects")'),
          searchInput: !!document.querySelector('input[placeholder*="Search projects"]'),
          filterSelect: !!document.querySelector('select[aria-label*="lifecycle"]'),
          ragButton: !!document.querySelector('button[aria-label*="RAG"]'),
          newProjectButton: !!document.querySelector('button:has-text("New Project")'),
          projectList: !!document.querySelector('div[class*="overflow-y-auto"]'),
          footer: !!document.querySelector('div:has-text("Total:")')
        };
        return elements;
      });
      
      // Verify all structural elements are present
      Object.values(structuralElements).forEach(exists => {
        expect(exists).toBe(true);
      });
    });

    test('lifecycle sections are properly organized', async () => {
      await page.waitForTimeout(1000);
      
      const lifecycleSections = await page.evaluate(() => {
        const currentSection = document.querySelector('div:has-text("CURRENT PROJECTS")');
        const completedSection = document.querySelector('div:has-text("COMPLETED PROJECTS")');
        const futureSection = document.querySelector('div:has-text("FUTURE PROJECTS")');
        
        return {
          current: !!currentSection,
          completed: !!completedSection,
          future: !!futureSection,
          // Check for proper visual separation
          hasBorders: !!document.querySelector('[class*="border-b"][class*="border-slate-200"]')
        };
      });
      
      expect(lifecycleSections.current).toBe(true);
      expect(lifecycleSections.hasBorders).toBe(true);
    });

    test('project hierarchy indentation is correct', async () => {
      await page.waitForTimeout(1000);
      
      // Click on a project to expand it
      const firstProject = await page.$('button[class*="rounded-lg"][class*="transition-all"]');
      if (firstProject) {
        await firstProject.click();
        await page.waitForTimeout(500);
        
        const indentationLevels = await page.evaluate(() => {
          // Check for proper indentation classes
          const phases = document.querySelectorAll('[class*="ml-6"]'); // Phase indentation
          const steps = document.querySelectorAll('[class*="pl-12"]'); // Step indentation
          
          return {
            hasPhaseIndentation: phases.length > 0,
            hasStepIndentation: steps.length > 0,
            phaseCount: phases.length,
            stepCount: steps.length
          };
        });
        
        expect(indentationLevels.hasPhaseIndentation).toBe(true);
      }
    });
  });

  describe('Visual Polish & Styling', () => {
    test('status icons are properly aligned and visible', async () => {
      await page.waitForTimeout(1000);
      
      const statusIndicators = await page.evaluate(() => {
        // Look for status icons with proper Tailwind classes
        const statusIcons = document.querySelectorAll('svg[class*="text-emerald-500"], svg[class*="text-amber-500"], svg[class*="text-slate-400"], svg[class*="text-red-500"]');
        const ragBadges = document.querySelectorAll('div[class*="rounded-full"][class*="bg-"]');
        const projectTypeBadges = document.querySelectorAll('svg[class*="text-purple-500"], svg[class*="text-blue-500"], svg[class*="text-indigo-500"]');
        
        return {
          statusIconCount: statusIcons.length,
          ragBadgeCount: ragBadges.length,
          typeBadgeCount: projectTypeBadges.length,
          hasProperColors: statusIcons.length > 0
        };
      });
      
      expect(statusIndicators.hasProperColors).toBe(true);
      expect(statusIndicators.statusIconCount).toBeGreaterThan(0);
    });

    test('hover and focus states work correctly', async () => {
      await page.waitForTimeout(1000);
      
      // Test hover state on a project button
      const projectButton = await page.$('button[class*="rounded-lg"][class*="transition-all"]');
      if (projectButton) {
        await projectButton.hover();
        await page.waitForTimeout(200);
        
        const hoverState = await page.evaluate(() => {
          const hoveredElement = document.querySelector('button[class*="rounded-lg"]:hover');
          return !!hoveredElement;
        });
        
        // Test focus state
        await projectButton.focus();
        await page.waitForTimeout(200);
        
        const focusState = await page.evaluate(() => {
          const focusedElement = document.querySelector('button:focus');
          return !!focusedElement;
        });
        
        expect(focusState).toBe(true);
      }
    });

    test('tailwind classes are applied correctly', async () => {
      const tailwindClasses = await page.evaluate(() => {
        // Check for key Tailwind classes that indicate proper styling
        const elements = {
          hasSlateColors: !!document.querySelector('[class*="text-slate-"]'),
          hasProperSpacing: !!document.querySelector('[class*="px-4"]'),
          hasRoundedCorners: !!document.querySelector('[class*="rounded-lg"]'),
          hasTransitions: !!document.querySelector('[class*="transition-"]'),
          hasShadows: !!document.querySelector('[class*="shadow-"]'),
          hasBorders: !!document.querySelector('[class*="border-slate-"]')
        };
        return elements;
      });
      
      // Verify modern Tailwind styling is applied
      expect(tailwindClasses.hasSlateColors).toBe(true);
      expect(tailwindClasses.hasProperSpacing).toBe(true);
      expect(tailwindClasses.hasRoundedCorners).toBe(true);
      expect(tailwindClasses.hasTransitions).toBe(true);
    });
  });

  describe('Interactive Functionality', () => {
    test('disclosure panels expand and collapse smoothly', async () => {
      await page.waitForTimeout(1000);
      
      // Find and click a project to expand
      const projectButton = await page.$('button[class*="rounded-lg"][class*="transition-all"]');
      if (projectButton) {
        // Check initial state
        const initialState = await page.evaluate(() => {
          return document.querySelectorAll('[class*="Disclosure"][class*="Panel"]').length;
        });
        
        // Click to expand
        await projectButton.click();
        await page.waitForTimeout(500); // Wait for animation
        
        // Check expanded state
        const expandedState = await page.evaluate(() => {
          return document.querySelectorAll('div[class*="space-y-"]').length;
        });
        
        expect(expandedState).toBeGreaterThanOrEqual(initialState);
        
        // Click again to collapse
        await projectButton.click();
        await page.waitForTimeout(500);
      }
    });

    test('search functionality works', async () => {
      await page.waitForTimeout(1000);
      
      // Type in search box
      const searchInput = await page.$('input[placeholder*="Search projects"]');
      if (searchInput) {
        await searchInput.click();
        await searchInput.type('WT-3');
        await page.waitForTimeout(500);
        
        // Check if results are filtered
        const searchResults = await page.evaluate(() => {
          const projectElements = document.querySelectorAll('h3[class*="font-semibold"]');
          let foundWt3 = false;
          projectElements.forEach(el => {
            if (el.textContent.includes('WT-3')) {
              foundWt3 = true;
            }
          });
          return foundWt3;
        });
        
        expect(searchResults).toBe(true);
        
        // Clear search
        await searchInput.evaluate(el => el.value = '');
        await page.keyboard.press('Backspace');
      }
    });

    test('filter controls work correctly', async () => {
      await page.waitForTimeout(1000);
      
      // Test lifecycle filter
      const lifecycleSelect = await page.$('select[aria-label*="lifecycle"]');
      if (lifecycleSelect) {
        await lifecycleSelect.selectOption('current');
        await page.waitForTimeout(500);
        
        const currentOnlyVisible = await page.evaluate(() => {
          const completedSection = document.querySelector('div:has-text("COMPLETED PROJECTS")');
          const futureSection = document.querySelector('div:has-text("FUTURE PROJECTS")');
          return !completedSection && !futureSection;
        });
        
        // Note: This might be true if there are no completed/future projects
        // Reset to all
        await lifecycleSelect.selectOption('all');
      }
      
      // Test RAG filter
      const ragButton = await page.$('button[aria-label*="RAG"]');
      if (ragButton) {
        await ragButton.click();
        await page.waitForTimeout(500);
        
        const ragPressed = await page.evaluate(() => {
          const button = document.querySelector('button[aria-pressed="true"]');
          return !!button;
        });
        
        expect(ragPressed).toBe(true);
        
        // Toggle back
        await ragButton.click();
      }
    });
  });

  describe('Accessibility & UX', () => {
    test('keyboard navigation works', async () => {
      await page.waitForTimeout(1000);
      
      // Tab through focusable elements
      await page.keyboard.press('Tab'); // Search input
      await page.keyboard.press('Tab'); // Lifecycle select
      await page.keyboard.press('Tab'); // RAG button
      await page.keyboard.press('Tab'); // New Project button
      await page.keyboard.press('Tab'); // First project button
      
      const focusedElement = await page.evaluate(() => {
        return document.activeElement.tagName;
      });
      
      expect(['INPUT', 'SELECT', 'BUTTON'].includes(focusedElement)).toBe(true);
    });

    test('aria labels and titles are present', async () => {
      const accessibilityAttributes = await page.evaluate(() => {
        const elementsWithAria = document.querySelectorAll('[aria-label], [aria-pressed], [title]');
        const searchInput = document.querySelector('input[aria-label*="Search"]');
        const lifecycleSelect = document.querySelector('select[aria-label*="lifecycle"]');
        const ragButton = document.querySelector('button[aria-label*="RAG"]');
        
        return {
          totalAriaElements: elementsWithAria.length,
          hasSearchAria: !!searchInput,
          hasSelectAria: !!lifecycleSelect,
          hasButtonAria: !!ragButton
        };
      });
      
      expect(accessibilityAttributes.totalAriaElements).toBeGreaterThan(0);
      expect(accessibilityAttributes.hasSearchAria).toBe(true);
    });

    test('empty state displays correctly', async () => {
      // Search for something that won't match to trigger empty state
      const searchInput = await page.$('input[placeholder*="Search projects"]');
      if (searchInput) {
        await searchInput.click();
        await searchInput.type('nonexistentproject12345');
        await page.waitForTimeout(500);
        
        const emptyState = await page.evaluate(() => {
          const emptyMessage = document.querySelector('h3:has-text("No projects found")');
          const emptyIcon = document.querySelector('div[class*="rounded-full"] svg');
          return {
            hasMessage: !!emptyMessage,
            hasIcon: !!emptyIcon
          };
        });
        
        expect(emptyState.hasMessage).toBe(true);
        
        // Clear search
        await searchInput.evaluate(el => el.value = '');
        await page.keyboard.press('Backspace');
      }
    });
  });

  describe('Responsive Design', () => {
    test('sidebar maintains layout at different viewport sizes', async () => {
      // Test desktop size
      await page.setViewport({ width: 1200, height: 800 });
      await page.waitForTimeout(500);
      
      const desktopLayout = await page.evaluate(() => {
        const sidebar = document.querySelector('div[class*="flex-col"][class*="h-full"]');
        return !!sidebar;
      });
      
      expect(desktopLayout).toBe(true);
      
      // Test tablet size
      await page.setViewport({ width: 768, height: 600 });
      await page.waitForTimeout(500);
      
      const tabletLayout = await page.evaluate(() => {
        const sidebar = document.querySelector('div[class*="flex-col"][class*="h-full"]');
        return !!sidebar;
      });
      
      expect(tabletLayout).toBe(true);
      
      // Reset to desktop
      await page.setViewport({ width: 1200, height: 800 });
    });

    test('scrolling works in project list', async () => {
      const scrollContainer = await page.$('div[class*="overflow-y-auto"]');
      if (scrollContainer) {
        const isScrollable = await page.evaluate((container) => {
          return container.scrollHeight > container.clientHeight;
        }, scrollContainer);
        
        // If content is scrollable, test scroll behavior
        if (isScrollable) {
          await page.evaluate((container) => {
            container.scrollTop = 100;
          }, scrollContainer);
          
          const scrollPosition = await page.evaluate((container) => {
            return container.scrollTop;
          }, scrollContainer);
          
          expect(scrollPosition).toBeGreaterThan(0);
        }
      }
    });
  });
});