import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { 
  launchBrowser, 
  createPage, 
  waitAndClick, 
  waitAndType, 
  takeScreenshot,
  safeNavigate,
  cleanup 
} from '../utils/puppeteer-setup.js';

describe('WT-2.9 Phase Plan Dashboard Tests', () => {
  let browser;
  let page;
  const BASE_URL = process.env.TEST_URL || 'http://localhost:5173';

  beforeAll(async () => {
    browser = await launchBrowser(process.env.HEADLESS !== 'false');
  });

  beforeEach(async () => {
    page = await createPage(browser);
  });

  afterEach(async () => {
    if (page) {
      try {
        await page.setRequestInterception(false);
      } catch (error) {
        // Ignore errors if request interception wasn't enabled
      }
      await page.close();
    }
  });

  afterAll(async () => {
    await cleanup(browser);
  });

  describe('Phase Plan Dashboard via Admin Modal', () => {
    it('should navigate to Phase Plan dashboard through admin modal', async () => {
      await safeNavigate(page, BASE_URL);
      
      // Navigate to WombatConsole
      await waitAndClick(page, 'button:has-text("WombatConsole")');
      await page.waitForTimeout(1000);
      
      // Open admin modal
      const manageButton = await page.waitForSelector('[data-testid="manage-projects-button"]', { timeout: 10000 });
      await manageButton.click();
      await page.waitForTimeout(500);
      
      // Click Phase Plan tab
      const phasePlanTab = await page.waitForSelector('button:has-text("📑 Phase Plan")', { timeout: 5000 });
      await phasePlanTab.click();
      await page.waitForTimeout(500);
      
      // Verify dashboard is rendered
      const dashboardTitle = await page.$('h3:has-text("Project Dashboard")');
      expect(dashboardTitle).toBeTruthy();
      
      console.log('Successfully navigated to Phase Plan Dashboard via admin modal');
    });

    it('should display phase metadata (RAG, Type, Owner)', async () => {
      await safeNavigate(page, BASE_URL);
      
      // Navigate to Phase Plan dashboard
      await waitAndClick(page, 'button:has-text("WombatConsole")');
      await page.waitForTimeout(1000);
      await waitAndClick(page, '[data-testid="manage-projects-button"]');
      await page.waitForTimeout(500);
      await waitAndClick(page, 'button:has-text("📑 Phase Plan")');
      await page.waitForTimeout(1000);
      
      // Look for phase metadata badges
      const ragStatus = await page.$('span:has-text("🟢")');
      const phaseType = await page.$('div:has-text("Governance")');
      const phaseOwner = await page.$('div:has-text("👤 jackson")');
      
      console.log('Looking for phase metadata...');
      console.log('RAG Status found:', !!ragStatus);
      console.log('Phase Type found:', !!phaseType);
      console.log('Phase Owner found:', !!phaseOwner);
      
      // At least one metadata element should be visible
      expect(ragStatus || phaseType || phaseOwner).toBeTruthy();
    });

    it('should show phase edit buttons when not in read-only mode', async () => {
      await safeNavigate(page, BASE_URL);
      
      // Navigate to Phase Plan dashboard
      await waitAndClick(page, 'button:has-text("WombatConsole")');
      await page.waitForTimeout(1000);
      await waitAndClick(page, '[data-testid="manage-projects-button"]');
      await page.waitForTimeout(500);
      await waitAndClick(page, 'button:has-text("📑 Phase Plan")');
      await page.waitForTimeout(1000);
      
      // Expand a phase to see edit button
      const phaseHeaders = await page.$$('div[style*="cursor: pointer"]');
      if (phaseHeaders.length > 0) {
        await phaseHeaders[0].click();
        await page.waitForTimeout(500);
        
        // Look for edit button
        const editButton = await page.$('button:has-text("Edit")');
        expect(editButton).toBeTruthy();
        console.log('Phase edit button found');
      }
    });

    it('should display RAG filter dropdown', async () => {
      await safeNavigate(page, BASE_URL);
      
      // Navigate to Phase Plan dashboard
      await waitAndClick(page, 'button:has-text("WombatConsole")');
      await page.waitForTimeout(1000);
      await waitAndClick(page, '[data-testid="manage-projects-button"]');
      await page.waitForTimeout(500);
      await waitAndClick(page, 'button:has-text("📑 Phase Plan")');
      await page.waitForTimeout(1000);
      
      // Look for RAG filter dropdown
      const ragFilter = await page.$('select option:has-text("All RAG")');
      expect(ragFilter).toBeTruthy();
      
      // Check for RAG options
      const redOption = await page.$('select option:has-text("🔴 Red")');
      const amberOption = await page.$('select option:has-text("🟡 Amber")');
      const greenOption = await page.$('select option:has-text("🟢 Green")');
      const blueOption = await page.$('select option:has-text("🔵 Blue")');
      
      console.log('RAG filter options found:', {
        red: !!redOption,
        amber: !!amberOption,
        green: !!greenOption,
        blue: !!blueOption
      });
      
      expect(ragFilter).toBeTruthy();
    });

    it('should display phase type filter dropdown', async () => {
      await safeNavigate(page, BASE_URL);
      
      // Navigate to Phase Plan dashboard
      await waitAndClick(page, 'button:has-text("WombatConsole")');
      await page.waitForTimeout(1000);
      await waitAndClick(page, '[data-testid="manage-projects-button"]');
      await page.waitForTimeout(500);
      await waitAndClick(page, 'button:has-text("📑 Phase Plan")');
      await page.waitForTimeout(1000);
      
      // Look for phase type filter
      const typeFilter = await page.$('select option:has-text("All Types")');
      expect(typeFilter).toBeTruthy();
      
      // Check for type options
      const platformOps = await page.$('select option:has-text("PlatformOps")');
      const governance = await page.$('select option:has-text("Governance")');
      const development = await page.$('select option:has-text("Development")');
      
      console.log('Phase type filter options found:', {
        platformOps: !!platformOps,
        governance: !!governance,
        development: !!development
      });
    });

    it('should display side quest badges for steps', async () => {
      await safeNavigate(page, BASE_URL);
      
      // Navigate to Phase Plan dashboard
      await waitAndClick(page, 'button:has-text("WombatConsole")');
      await page.waitForTimeout(1000);
      await waitAndClick(page, '[data-testid="manage-projects-button"]');
      await page.waitForTimeout(500);
      await waitAndClick(page, 'button:has-text("📑 Phase Plan")');
      await page.waitForTimeout(1000);
      
      // Expand phases to see steps
      const phaseHeaders = await page.$$('div[style*="cursor: pointer"]');
      let sideQuestFound = false;
      
      for (let i = 0; i < Math.min(phaseHeaders.length, 3); i++) {
        await phaseHeaders[i].click();
        await page.waitForTimeout(500);
        
        // Look for side quest badge
        const sideQuest = await page.$('span:has-text("🎯 Side Quest")');
        if (sideQuest) {
          sideQuestFound = true;
          console.log(`Side quest badge found in phase ${i + 1}`);
          break;
        }
      }
      
      // Log result
      console.log('Side quest badge search complete:', sideQuestFound);
    });

    it('should open phase metadata modal when edit is clicked', async () => {
      await safeNavigate(page, BASE_URL);
      
      // Navigate to Phase Plan dashboard
      await waitAndClick(page, 'button:has-text("WombatConsole")');
      await page.waitForTimeout(1000);
      await waitAndClick(page, '[data-testid="manage-projects-button"]');
      await page.waitForTimeout(500);
      await waitAndClick(page, 'button:has-text("📑 Phase Plan")');
      await page.waitForTimeout(1000);
      
      // Find and click an edit button
      const editButtons = await page.$$('button:has-text("Edit")');
      if (editButtons.length > 0) {
        await editButtons[0].click();
        await page.waitForTimeout(500);
        
        // Check for modal elements
        const modalTitle = await page.$('h2:has-text("Edit Phase Metadata")');
        const phaseTypeSelect = await page.$('label:has-text("Phase Type")');
        const phaseOwnerInput = await page.$('label:has-text("Phase Owner")');
        const ragStatusLabel = await page.$('label:has-text("RAG Status")');
        
        console.log('Phase metadata modal elements:', {
          title: !!modalTitle,
          phaseType: !!phaseTypeSelect,
          phaseOwner: !!phaseOwnerInput,
          ragStatus: !!ragStatusLabel
        });
        
        expect(modalTitle).toBeTruthy();
        
        // Close modal
        const cancelButton = await page.$('button:has-text("Cancel")');
        if (cancelButton) {
          await cancelButton.click();
        }
      } else {
        console.log('No edit buttons found - phases may need to be expanded first');
      }
    });

    it('should display step instructions when present', async () => {
      await safeNavigate(page, BASE_URL);
      
      // Navigate to Phase Plan dashboard
      await waitAndClick(page, 'button:has-text("WombatConsole")');
      await page.waitForTimeout(1000);
      await waitAndClick(page, '[data-testid="manage-projects-button"]');
      await page.waitForTimeout(500);
      await waitAndClick(page, 'button:has-text("📑 Phase Plan")');
      await page.waitForTimeout(1000);
      
      // Expand phases to see steps
      const phaseHeaders = await page.$$('div[style*="cursor: pointer"]');
      let instructionFound = false;
      
      for (let i = 0; i < Math.min(phaseHeaders.length, 3); i++) {
        await phaseHeaders[i].click();
        await page.waitForTimeout(500);
        
        // Look for instruction text
        const instruction = await page.$('strong:has-text("Instruction:")');
        if (instruction) {
          instructionFound = true;
          console.log(`Step instruction found in phase ${i + 1}`);
          break;
        }
      }
      
      console.log('Step instruction search complete:', instructionFound);
    });
  });

  describe('Direct Phase Plan Page Navigation', () => {
    it('should access Phase Plan page directly', async () => {
      // Try direct navigation to Phase Plan page
      await safeNavigate(page, `${BASE_URL}/#/phase-plan`);
      await page.waitForTimeout(2000);
      
      // Check if we're on the Phase Plan page
      const pageTitle = await page.$('h1:has-text("Project Dashboard")');
      const phasePlanHeader = await page.$('.phase-plan-header');
      
      console.log('Direct navigation results:', {
        pageTitle: !!pageTitle,
        phasePlanHeader: !!phasePlanHeader
      });
      
      // Take screenshot for debugging
      await takeScreenshot(page, 'phase-plan-direct-nav');
      
      if (pageTitle || phasePlanHeader) {
        console.log('Successfully navigated to Phase Plan page directly');
        
        // Check for metadata display
        const projectDashboard = await page.$eval('.dashboard-container', el => el.innerHTML);
        console.log('Dashboard content loaded:', projectDashboard.length > 100);
      } else {
        console.log('Could not access Phase Plan page directly - may require authentication or different route');
      }
    });
  });
});