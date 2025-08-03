import puppeteer, { Browser, Page } from 'puppeteer';
import fs from 'fs';
import path from 'path';

describe('Nested Dashboard Tests', () => {
  let browser: Browser;
  let page: Page;
  const baseUrl = 'http://localhost:5173'; // Vite dev server default
  const screenshotDir = path.join(__dirname, '../qa-artifacts/nested-dashboards');

  beforeAll(async () => {
    // Create screenshot directory if it doesn't exist
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }

    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  });

  beforeEach(async () => {
    page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Enable console logging
    page.on('console', msg => {
      console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`);
    });
    
    // Log any page errors
    page.on('pageerror', error => {
      console.error(`[Page Error]`, error);
    });
  });

  afterEach(async () => {
    await page.close();
  });

  afterAll(async () => {
    await browser.close();
  });

  test('Phase Dashboard renders correctly', async () => {
    console.log('🔍 Testing Phase Dashboard rendering...');
    
    // Navigate to a specific project phase
    const projectId = 'proj-1';
    const phaseId = 'phase-2';
    const url = `${baseUrl}/projects/${projectId}/phases/${phaseId}`;
    
    await page.goto(url, { waitUntil: 'networkidle0' });
    
    // Wait for phase dashboard to load
    await page.waitForSelector('h1', { timeout: 10000 });
    
    // Check if PhaseDashboard loaded message appears in console
    const consoleMessages = await page.evaluate(() => {
      return window.console.log.toString();
    });
    
    // Verify phase dashboard elements
    const phaseTitle = await page.$eval('h1', el => el.textContent);
    expect(phaseTitle).toBeTruthy();
    console.log(`✅ Phase title found: ${phaseTitle}`);
    
    // Check for phase progress bar
    const progressBar = await page.$('.bg-blue-600');
    expect(progressBar).toBeTruthy();
    console.log('✅ Progress bar found');
    
    // Check for phase steps
    const steps = await page.$$('.border.border-gray-200.rounded-lg.p-4');
    expect(steps.length).toBeGreaterThan(0);
    console.log(`✅ Found ${steps.length} phase steps`);
    
    // Take screenshot
    await page.screenshot({ 
      path: path.join(screenshotDir, 'phase-dashboard.png'),
      fullPage: true 
    });
    console.log('📸 Phase dashboard screenshot saved');
  });

  test('Step Dashboard renders correctly', async () => {
    console.log('🔍 Testing Step Dashboard rendering...');
    
    // Navigate to a specific step
    const projectId = 'proj-1';
    const phaseId = 'phase-2';
    const stepId = 'step-2';
    const url = `${baseUrl}/projects/${projectId}/phases/${phaseId}/steps/${stepId}`;
    
    await page.goto(url, { waitUntil: 'networkidle0' });
    
    // Wait for step dashboard to load
    await page.waitForSelector('h1', { timeout: 10000 });
    
    // Verify step dashboard elements
    const stepTitle = await page.$eval('h1', el => el.textContent);
    expect(stepTitle).toBeTruthy();
    console.log(`✅ Step title found: ${stepTitle}`);
    
    // Check for step status
    const statusBadge = await page.$('.rounded-lg.text-sm.font-medium');
    expect(statusBadge).toBeTruthy();
    console.log('✅ Status badge found');
    
    // Check for breadcrumb navigation
    const breadcrumb = await page.$('.flex.items-center.text-sm.text-gray-500');
    expect(breadcrumb).toBeTruthy();
    console.log('✅ Breadcrumb navigation found');
    
    // Take screenshot
    await page.screenshot({ 
      path: path.join(screenshotDir, 'step-dashboard.png'),
      fullPage: true 
    });
    console.log('📸 Step dashboard screenshot saved');
  });

  test('SubApp Main Dashboard renders correctly', async () => {
    console.log('🔍 Testing SubApp Main Dashboard rendering...');
    
    // Navigate to a sub-app dashboard
    const subAppId = 'prog-orbis-001';
    const url = `${baseUrl}/subapps/${subAppId}/dashboard`;
    
    await page.goto(url, { waitUntil: 'networkidle0' });
    
    // Wait for dashboard to load
    await page.waitForSelector('h1', { timeout: 10000 });
    
    // Verify sub-app dashboard elements
    const dashboardTitle = await page.$eval('h1', el => el.textContent);
    expect(dashboardTitle).toContain('Main Dashboard');
    console.log(`✅ Dashboard title found: ${dashboardTitle}`);
    
    // Check for metric cards
    const metricCards = await page.$$('.bg-white.rounded-lg.shadow-sm.border.border-gray-200.p-6');
    expect(metricCards.length).toBeGreaterThanOrEqual(4);
    console.log(`✅ Found ${metricCards.length} metric cards`);
    
    // Check for activity chart placeholder
    const chartPlaceholder = await page.$('.h-64.bg-gray-50.rounded');
    expect(chartPlaceholder).toBeTruthy();
    console.log('✅ Activity chart placeholder found');
    
    // Take screenshot
    await page.screenshot({ 
      path: path.join(screenshotDir, 'subapp-main-dashboard.png'),
      fullPage: true 
    });
    console.log('📸 SubApp main dashboard screenshot saved');
  });

  test('SubApp Analytics Dashboard renders correctly', async () => {
    console.log('🔍 Testing SubApp Analytics Dashboard rendering...');
    
    // Navigate to analytics dashboard
    const subAppId = 'prog-orbis-001';
    const url = `${baseUrl}/subapps/${subAppId}/analytics`;
    
    await page.goto(url, { waitUntil: 'networkidle0' });
    
    // Wait for dashboard to load
    await page.waitForSelector('h1', { timeout: 10000 });
    
    // Verify analytics dashboard elements
    const dashboardTitle = await page.$eval('h1', el => el.textContent);
    expect(dashboardTitle).toContain('Analytics Dashboard');
    console.log(`✅ Dashboard title found: ${dashboardTitle}`);
    
    // Check for analytics overview cards
    const analyticsCards = await page.$$('.bg-white.rounded-lg.shadow-sm.border.border-gray-200.p-6');
    expect(analyticsCards.length).toBeGreaterThan(0);
    console.log(`✅ Found ${analyticsCards.length} analytics cards`);
    
    // Check for data table
    const dataTable = await page.$('table.min-w-full');
    expect(dataTable).toBeTruthy();
    console.log('✅ Analytics data table found');
    
    // Take screenshot
    await page.screenshot({ 
      path: path.join(screenshotDir, 'subapp-analytics-dashboard.png'),
      fullPage: true 
    });
    console.log('📸 SubApp analytics dashboard screenshot saved');
  });

  test('Navigation between nested dashboards works', async () => {
    console.log('🔍 Testing navigation between nested dashboards...');
    
    // Start at projects page
    await page.goto(`${baseUrl}/projects`, { waitUntil: 'networkidle0' });
    
    // Click on a phase to navigate
    await page.waitForSelector('.phases-container');
    const phaseHeader = await page.$('.phases-container > div:first-child > div:first-child');
    if (phaseHeader) {
      await phaseHeader.click();
      await page.waitForTimeout(1000); // Wait for navigation
      
      // Check URL changed to phase dashboard
      const currentUrl = page.url();
      expect(currentUrl).toContain('/phases/');
      console.log(`✅ Navigated to phase: ${currentUrl}`);
    }
    
    // Take final screenshot
    await page.screenshot({ 
      path: path.join(screenshotDir, 'navigation-test.png'),
      fullPage: true 
    });
    console.log('📸 Navigation test screenshot saved');
  });
});

// Export for Jest
export {};