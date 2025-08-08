
import { governanceLogsService } from '../src/services/governanceLogsService';
import { GovernanceProjectHooks } from '../src/services/governanceProjectHooks';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

const testProjectId = 'CI-TEST-1754620855961';
const DB_PATH = path.join(process.cwd(), 'databases', 'production.db');

async function ciTestGovernanceCreation() {
  try {
    // Create governance log with explicit project reference
    const testData = {
      entryType: 'Decision' as const,
      summary: `CI Test: Auto-creation verification for ${testProjectId}`,
      gptDraftEntry: 'Continuous integration test for governance-driven project registration',
      classification: 'ci-test',
      related_phase: `${testProjectId}-1.0`,
      created_by: 'ci-test'
    };

    // Create governance log
    const log = await governanceLogsService.createGovernanceLog(testData);
    
    // Manually trigger project creation with explicit project ID
    const hooks = GovernanceProjectHooks.getInstance();
    const projectData = {
      projectId: testProjectId,
      summary: testData.summary,
      phaseId: testData.related_phase,
      actor: testData.created_by,
      status: 'Active',
      objectiveOrDescription: testData.gptDraftEntry
    };
    
    const created = await hooks.processGovernanceEntry(projectData);
    
    // Verify project exists in database
    const db = await open({
      filename: DB_PATH,
      driver: sqlite3.Database
    });
    
    const project = await db.get(
      'SELECT projectId, projectName, keyTasks, aiPromptLog FROM projects WHERE projectId = ?',
      [testProjectId]
    );
    
    await db.close();
    
    if (!project) {
      throw new Error('Project was not created');
    }
    
    console.log(JSON.stringify({
      success: true,
      projectId: project.projectId,
      projectName: project.projectName,
      hasKeyTasks: !!project.keyTasks,
      hasAiPromptLog: !!project.aiPromptLog,
      logId: log.id
    }));
    
  } catch (error) {
    console.error(JSON.stringify({
      success: false,
      error: error.message
    }));
    process.exit(1);
  }
}

ciTestGovernanceCreation();
      