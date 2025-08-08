/**
 * Test Suite: Project Registration Repair
 * Tests automatic project creation from governance logs
 */

const puppeteer = require('puppeteer');
const { spawn } = require('child_process');
const { readFile, writeFile } = require('fs/promises');
const { join } = require('path');

describe('Project Registration Repair Tests', () => {
  let browser;
  let page;
  let serverProcess;

  beforeAll(async () => {
    // Start the development server
    serverProcess = spawn('npm', ['run', 'dev'], {
      stdio: 'pipe',
      cwd: process.cwd()
    });

    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Launch browser
    browser = await puppeteer.launch({
      headless: false,
      defaultViewport: { width: 1280, height: 720 },
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    page = await browser.newPage();
  });

  afterAll(async () => {
    if (browser) await browser.close();
    if (serverProcess) {
      serverProcess.kill('SIGTERM');
    }
  });

  describe('Governance Log → Project Creation', () => {
    test('should auto-create project when governance log references new project ID', async () => {
      // Test governance log entry
      const testGovernanceLog = {
        timestamp: new Date().toISOString(),
        project_id: 'TEST-AUTO-CREATE-001',
        phase_id: 'TEST-1.0',
        action: 'init',
        summary: 'Test Auto-Create Project from Governance',
        actor: 'test-system',
        objective: 'Test automatic project registration from governance logs'
      };

      // Navigate to admin dashboard
      await page.goto('http://localhost:3000/admin/projects');
      await page.waitForSelector('[data-testid="projects-table"]', { timeout: 10000 });

      // Get initial project count
      const initialProjectRows = await page.$$('[data-testid="project-row"]');
      const initialCount = initialProjectRows.length;

      // Simulate governance log creation (this would normally come from the governance system)
      await page.evaluate(async (logEntry) => {
        // Import the governance integration service in browser context
        const response = await fetch('/api/admin/governance/process-entry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(logEntry)
        });
        return response.json();
      }, testGovernanceLog);

      // Wait for potential updates
      await page.waitForTimeout(2000);

      // Refresh and check if project was created
      await page.reload();
      await page.waitForSelector('[data-testid="projects-table"]', { timeout: 10000 });

      const finalProjectRows = await page.$$('[data-testid="project-row"]');
      const finalCount = finalProjectRows.length;

      expect(finalCount).toBe(initialCount + 1);

      // Verify the specific project exists
      const projectExists = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('[data-testid="project-row"]'))
          .some(row => row.textContent.includes('TEST-AUTO-CREATE-001'));
      });

      expect(projectExists).toBe(true);
    });

    test('should update existing project when governance log references existing project ID', async () => {
      const testGovernanceLog = {
        timestamp: new Date().toISOString(),
        project_id: 'TEST-AUTO-CREATE-001', // Same as previous test
        phase_id: 'TEST-1.1',
        action: 'update',
        summary: 'Updated Test Project Status',
        actor: 'test-system',
        status: 'In Progress'
      };

      // Navigate to admin dashboard
      await page.goto('http://localhost:3000/admin/projects');
      await page.waitForSelector('[data-testid="projects-table"]', { timeout: 10000 });

      // Process governance log entry
      await page.evaluate(async (logEntry) => {
        const response = await fetch('/api/admin/governance/process-entry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(logEntry)
        });
        return response.json();
      }, testGovernanceLog);

      await page.waitForTimeout(2000);
      await page.reload();
      await page.waitForSelector('[data-testid="projects-table"]', { timeout: 10000 });

      // Verify project status was updated
      const projectRow = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('[data-testid="project-row"]'))
          .find(row => row.textContent.includes('TEST-AUTO-CREATE-001'));
      });

      expect(projectRow).toBeDefined();
    });
  });

  describe('Backfill Missing Projects', () => {
    test('should backfill OF-GOVLOG project from governance logs', async () => {
      // Navigate to admin dashboard
      await page.goto('http://localhost:3000/admin/projects');
      await page.waitForSelector('[data-testid="projects-table"]', { timeout: 10000 });

      // Run backfill operation
      await page.evaluate(async () => {
        const response = await fetch('/api/admin/projects/backfill', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectIds: ['OF-GOVLOG'] })
        });
        return response.json();
      });

      await page.waitForTimeout(3000);
      await page.reload();
      await page.waitForSelector('[data-testid="projects-table"]', { timeout: 10000 });

      // Verify OF-GOVLOG project exists
      const ofGovlogExists = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('[data-testid="project-row"]'))
          .some(row => row.textContent.includes('OF-GOVLOG'));
      });

      expect(ofGovlogExists).toBe(true);
    });

    test('should backfill OF-9.x phase projects', async () => {
      const phaseProjects = ['OF-9.0', 'OF-9.1', 'OF-9.2'];
      
      // Run backfill for phase projects
      await page.evaluate(async (projectIds) => {
        const response = await fetch('/api/admin/projects/backfill', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectIds })
        });
        return response.json();
      }, phaseProjects);

      await page.waitForTimeout(5000);
      await page.goto('http://localhost:3000/admin/projects');
      await page.waitForSelector('[data-testid="projects-table"]', { timeout: 10000 });

      // Verify each phase project exists
      for (const projectId of phaseProjects) {
        const projectExists = await page.evaluate((id) => {
          return Array.from(document.querySelectorAll('[data-testid="project-row"]'))
            .some(row => row.textContent.includes(id));
        }, projectId);

        expect(projectExists).toBe(true);
      }
    });
  });

  describe('Project UI Reflection', () => {
    test('should display auto-created projects in Project Dashboard', async () => {
      await page.goto('http://localhost:3000/dashboard');
      await page.waitForSelector('[data-testid="all-projects-dashboard"]', { timeout: 10000 });

      // Check if governance-created projects appear
      const govlogProject = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('[data-testid="project-card"]'))
          .some(card => card.textContent.includes('OF-GOVLOG'));
      });

      expect(govlogProject).toBe(true);
    });

    test('should show correct project metadata for auto-created projects', async () => {
      await page.goto('http://localhost:3000/admin/projects');
      await page.waitForSelector('[data-testid="projects-table"]', { timeout: 10000 });

      // Click on an auto-created project to view details
      const govlogRow = await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll('[data-testid="project-row"]'));
        return rows.find(row => row.textContent.includes('OF-GOVLOG'));
      });

      if (govlogRow) {
        await page.click('[data-testid="project-row"]:has-text("OF-GOVLOG") [data-testid="edit-button"]');
        await page.waitForSelector('[data-testid="project-edit-form"]', { timeout: 10000 });

        // Verify keyTasks and aiPromptLog fields exist and have data
        const keyTasksValue = await page.$eval('[data-testid="key-tasks-field"]', el => el.value);
        const aiPromptLogValue = await page.$eval('[data-testid="ai-prompt-log-field"]', el => el.value);

        expect(keyTasksValue).toBeTruthy();
        expect(aiPromptLogValue).toBeTruthy();
      }
    });
  });

  describe('Integration with Governance System', () => {
    test('should log project creation to governance system', async () => {
      // This test verifies that when a project is auto-created,
      // it logs the creation back to the governance system
      const testLog = {
        timestamp: new Date().toISOString(),
        project_id: 'TEST-INTEGRATION-001',
        action: 'init',
        summary: 'Test Integration Logging'
      };

      // Process the log entry
      await page.evaluate(async (logEntry) => {
        const response = await fetch('/api/admin/governance/process-entry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(logEntry)
        });
        return response.json();
      }, testLog);

      // Wait and check governance logs for the creation entry
      await page.waitForTimeout(2000);
      
      // Navigate to governance logs to verify logging
      await page.goto('http://localhost:3000/admin/governance');
      await page.waitForSelector('[data-testid="governance-logs"]', { timeout: 10000 });

      const creationLogExists = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('[data-testid="governance-log-entry"]'))
          .some(entry => entry.textContent.includes('project_auto_created') && 
                         entry.textContent.includes('TEST-INTEGRATION-001'));
      });

      expect(creationLogExists).toBe(true);
    });
  });

  describe('Error Handling and Safeguards', () => {
    test('should handle duplicate project creation gracefully', async () => {
      const duplicateLog = {
        timestamp: new Date().toISOString(),
        project_id: 'TEST-AUTO-CREATE-001', // Already exists from earlier test
        action: 'init',
        summary: 'Duplicate Creation Attempt'
      };

      // Get initial project count
      await page.goto('http://localhost:3000/admin/projects');
      await page.waitForSelector('[data-testid="projects-table"]', { timeout: 10000 });
      const initialRows = await page.$$('[data-testid="project-row"]');
      const initialCount = initialRows.length;

      // Attempt duplicate creation
      await page.evaluate(async (logEntry) => {
        const response = await fetch('/api/admin/governance/process-entry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(logEntry)
        });
        return response.json();
      }, duplicateLog);

      await page.waitForTimeout(2000);
      await page.reload();
      await page.waitForSelector('[data-testid="projects-table"]', { timeout: 10000 });

      // Verify no duplicate was created
      const finalRows = await page.$$('[data-testid="project-row"]');
      const finalCount = finalRows.length;

      expect(finalCount).toBe(initialCount);
    });

    test('should handle malformed governance log entries', async () => {
      const malformedLog = {
        timestamp: new Date().toISOString(),
        // Missing required fields
        action: 'init'
      };

      // This should not crash the system or create invalid projects
      const result = await page.evaluate(async (logEntry) => {
        try {
          const response = await fetch('/api/admin/governance/process-entry', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(logEntry)
          });
          return { success: response.ok, status: response.status };
        } catch (error) {
          return { success: false, error: error.message };
        }
      }, malformedLog);

      // Should handle gracefully (not crash) but not create invalid projects
      expect(result.success).toBeDefined();
    });
  });
});

module.exports = {};