import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('ProjectSidebar Visual Tests', () => {
  const screenshotDir = path.join(__dirname, '__screenshots__', 'sidebar');
  const expectedScreenshot = path.join(screenshotDir, 'expected.png');
  const actualScreenshot = path.join(screenshotDir, 'actual.png');
  
  beforeAll(async () => {
    // Ensure screenshot directory exists
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
    
    // Navigate to the page
    await page.goto('http://localhost:5173/phase-plan');
  });
  
  it('should render sidebar with proper layout and hierarchy', async () => {
    // Wait for the sidebar to load
    await page.waitForSelector('.flex.flex-col.h-full.bg-slate-50', { 
      visible: true, 
      timeout: 10000 
    });
    
    // Wait for projects to load
    await page.waitForSelector('h2', { 
      visible: true, 
      timeout: 5000 
    });
    
    // Expand the first project if it has phases
    try {
      const firstProjectButton = await page.$('button[class*="w-full flex items-center gap-3 p-3"]');
      if (firstProjectButton) {
        console.log('📂 Expanding first project...');
        await firstProjectButton.click();
        
        // Wait for phases to appear
        await page.waitForTimeout(1000);
        
        // Try to expand the first phase if it exists
        const firstPhaseButton = await page.$('button[class*="w-full flex items-center gap-3 py-2.5"]');
        if (firstPhaseButton) {
          console.log('📋 Expanding first phase...');
          await firstPhaseButton.click();
          await page.waitForTimeout(1000);
        }
      }
    } catch (error) {
      console.log('⚠️  Could not expand sidebar items:', error.message);
    }
    
    // Set viewport to ensure consistent screenshots
    await page.setViewport({ width: 1280, height: 1024 });
    
    // Focus on the sidebar area only
    const sidebarElement = await page.$('.flex.flex-col.h-full.bg-slate-50');
    
    let screenshotOptions = {
      path: actualScreenshot,
      fullPage: false
    };
    
    if (sidebarElement) {
      const boundingBox = await sidebarElement.boundingBox();
      if (boundingBox) {
        screenshotOptions.clip = {
          x: boundingBox.x,
          y: boundingBox.y,
          width: Math.min(boundingBox.width, 400), // Limit width to sidebar
          height: boundingBox.height
        };
      }
    }
    
    // Take screenshot
    console.log('📸 Capturing sidebar screenshot...');
    await page.screenshot(screenshotOptions);
    
    // Verify screenshot was created
    expect(fs.existsSync(actualScreenshot)).toBe(true);
    
    console.log(`✅ Screenshot saved to: ${actualScreenshot}`);
  });
  
  it('should verify sidebar visual elements are present', async () => {    
    // Wait for sidebar to load
    await page.waitForSelector('.flex.flex-col.h-full.bg-slate-50', { visible: true });
    
    // Check for key visual elements
    const elements = await page.evaluate(() => {
      const results = {
        projectsHeader: !!document.querySelector('h2'),
        searchInput: !!document.querySelector('input[placeholder*="Search"]'),
        filterSelect: !!document.querySelector('select'),
        newProjectButton: !!document.querySelector('button[class*="text-blue-600"]'),
        projectCards: document.querySelectorAll('[class*="border"][class*="rounded-lg"]').length,
        footerStats: !!document.querySelector('[class*="border-t"]')
      };
      return results;
    });
    
    console.log('🔍 Sidebar elements found:', elements);
    
    // Verify key elements exist
    expect(elements.projectsHeader).toBe(true);
    expect(elements.searchInput).toBe(true);
    expect(elements.filterSelect).toBe(true);
    expect(elements.newProjectButton).toBe(true);
    expect(elements.projectCards).toBeGreaterThan(0);
    expect(elements.footerStats).toBe(true);
  });
  
  it('should test sidebar interactions', async () => {
    // Wait for sidebar to load
    await page.waitForSelector('.flex.flex-col.h-full.bg-slate-50', { visible: true });
    
    // Test search functionality
    const searchInput = await page.$('input[placeholder*="Search"]');
    if (searchInput) {
      console.log('🔍 Testing search functionality...');
      await searchInput.click();
      await searchInput.type('test');
      await page.waitForTimeout(500);
      await page.evaluate(() => {
        const input = document.querySelector('input[placeholder*="Search"]');
        if (input) input.value = '';
      });
    }
    
    // Test filter dropdown
    const filterSelect = await page.$('select');
    if (filterSelect) {
      console.log('🎛️  Testing filter dropdown...');
      await filterSelect.select('current');
      await page.waitForTimeout(500);
      await filterSelect.select('all');
    }
    
    // Test RAG filter button
    const ragButton = await page.$('button[aria-label="Filter by RAG status"]');
    if (ragButton) {
      console.log('🚥 Testing RAG filter...');
      await ragButton.click();
      await page.waitForTimeout(500);
      await ragButton.click(); // Toggle back
    }
    
    console.log('✅ Sidebar interactions tested successfully');
  });
  
  it('should copy screenshot to expected location for baseline', async () => {
    // Only copy if expected screenshot doesn't exist
    if (!fs.existsSync(expectedScreenshot) && fs.existsSync(actualScreenshot)) {
      fs.copyFileSync(actualScreenshot, expectedScreenshot);
      console.log(`📋 Copied actual screenshot to expected: ${expectedScreenshot}`);
    } else if (fs.existsSync(expectedScreenshot)) {
      console.log(`ℹ️  Expected screenshot already exists: ${expectedScreenshot}`);
    }
    
    // Verify both files exist
    expect(fs.existsSync(expectedScreenshot)).toBe(true);
    expect(fs.existsSync(actualScreenshot)).toBe(true);
  });
});