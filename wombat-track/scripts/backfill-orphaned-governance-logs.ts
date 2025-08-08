#!/usr/bin/env tsx

/**
 * Backfill Orphaned Governance Logs Script
 * Scans governance logs for entries that should have created projects but didn't
 * and backfills them using GovernanceProjectHooks
 */

import { governanceLogsService } from '../src/services/governanceLogsService';
import { GovernanceProjectHooks } from '../src/services/governanceProjectHooks';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'databases', 'production.db');

interface OrphanedLogAnalysis {
  totalGovernanceLogs: number;
  logsWithProjectIds: number;
  existingProjects: number;
  orphanedLogs: any[];
  backfillCandidates: any[];
}

async function analyzeOrphanedGovernanceLogs(): Promise<OrphanedLogAnalysis> {
  console.log('🔍 Analyzing governance logs for orphaned entries...');
  
  const db = await open({
    filename: DB_PATH,
    driver: sqlite3.Database
  });

  // Get all governance logs
  const governanceLogs = await db.all(`
    SELECT id, timestamp, entryType, summary, related_phase, related_step, created_by 
    FROM enhanced_governance_logs 
    WHERE classification != 'archived' OR classification IS NULL
    ORDER BY timestamp DESC
  `);

  // Get all existing projects
  const projects = await db.all('SELECT projectId, projectName FROM projects');
  const projectIds = new Set(projects.map(p => p.projectId));

  console.log(`📊 Found ${governanceLogs.length} governance logs and ${projects.length} projects`);

  // Analyze logs for project ID patterns
  const projectIdPattern = /^(OF-|WT-|[A-Z]+-)[A-Z0-9.-]+$/;
  const orphanedLogs = [];
  const backfillCandidates = [];

  for (const log of governanceLogs) {
    // Check if log contains potential project references
    let potentialProjectIds = [];
    
    // Check related_phase for project ID patterns
    if (log.related_phase && projectIdPattern.test(log.related_phase)) {
      potentialProjectIds.push(log.related_phase);
    }
    
    // Check related_step for project ID patterns
    if (log.related_step && projectIdPattern.test(log.related_step.split('.')[0])) {
      potentialProjectIds.push(log.related_step.split('.')[0]);
    }
    
    // Check summary for project ID mentions
    const summaryMatches = log.summary?.match(/\b(OF-|WT-|[A-Z]+-)[A-Z0-9.-]+\b/g) || [];
    potentialProjectIds.push(...summaryMatches);
    
    // Remove duplicates
    potentialProjectIds = [...new Set(potentialProjectIds)];
    
    if (potentialProjectIds.length > 0) {
      // Check if any of these project IDs exist
      const missingProjectIds = potentialProjectIds.filter(pid => !projectIds.has(pid));
      
      if (missingProjectIds.length > 0) {
        orphanedLogs.push({
          ...log,
          potentialProjectIds,
          missingProjectIds
        });
        
        // Determine if this is a good backfill candidate
        const isGoodCandidate = (
          log.entryType === 'Decision' || 
          log.entryType === 'Change' ||
          log.summary?.toLowerCase().includes('project') ||
          log.related_phase?.includes('-')
        );
        
        if (isGoodCandidate) {
          backfillCandidates.push({
            ...log,
            recommendedProjectId: missingProjectIds[0], // Use first missing ID
            reason: 'Has clear project ID pattern and relevant entry type'
          });
        }
      }
    }
  }

  await db.close();

  return {
    totalGovernanceLogs: governanceLogs.length,
    logsWithProjectIds: orphanedLogs.length,
    existingProjects: projects.length,
    orphanedLogs,
    backfillCandidates
  };
}

async function backfillOrphanedProjects(candidates: any[]): Promise<{ success: number; failed: number; results: any[] }> {
  console.log(`\n🔧 Starting backfill process for ${candidates.length} candidates...`);
  
  const hooks = GovernanceProjectHooks.getInstance();
  await hooks.ensureDatabaseSchema();
  
  let success = 0;
  let failed = 0;
  const results = [];
  
  for (const candidate of candidates) {
    console.log(`\n📝 Processing: ${candidate.recommendedProjectId} (${candidate.summary})`);
    
    try {
      const projectData = {
        projectId: candidate.recommendedProjectId,
        phaseId: candidate.related_phase,
        stepId: candidate.related_step,
        summary: candidate.summary,
        actor: candidate.created_by || 'system',
        status: 'Active',
        objectiveOrDescription: `Backfilled from governance log ${candidate.id}`
      };
      
      const created = await hooks.processGovernanceEntry(projectData);
      
      if (created) {
        success++;
        console.log(`   ✅ Successfully created project: ${candidate.recommendedProjectId}`);
        results.push({
          logId: candidate.id,
          projectId: candidate.recommendedProjectId,
          status: 'success',
          action: 'created'
        });
      } else {
        failed++;
        console.log(`   ⚠️ Project creation returned false: ${candidate.recommendedProjectId}`);
        results.push({
          logId: candidate.id,
          projectId: candidate.recommendedProjectId,
          status: 'failed',
          reason: 'Hook returned false'
        });
      }
      
    } catch (error) {
      failed++;
      console.log(`   ❌ Failed to create project: ${error.message}`);
      results.push({
        logId: candidate.id,
        projectId: candidate.recommendedProjectId,
        status: 'error',
        error: error.message
      });
    }
  }
  
  return { success, failed, results };
}

async function main() {
  console.log('🚀 Governance Logs Orphan Detection and Backfill');
  console.log('='.repeat(60));
  
  try {
    // Step 1: Analyze orphaned logs
    const analysis = await analyzeOrphanedGovernanceLogs();
    
    console.log('\n📈 Analysis Results:');
    console.log(`   • Total governance logs: ${analysis.totalGovernanceLogs}`);
    console.log(`   • Logs with project ID patterns: ${analysis.logsWithProjectIds}`);
    console.log(`   • Existing projects: ${analysis.existingProjects}`);
    console.log(`   • Backfill candidates: ${analysis.backfillCandidates.length}`);
    
    if (analysis.backfillCandidates.length === 0) {
      console.log('\n✅ No orphaned governance logs found - all projects appear to be linked correctly');
      process.exit(0);
    }
    
    // Step 2: Show candidates
    console.log('\n📋 Backfill Candidates:');
    analysis.backfillCandidates.forEach((candidate, i) => {
      console.log(`   ${i + 1}. ${candidate.recommendedProjectId}`);
      console.log(`      Summary: ${candidate.summary}`);
      console.log(`      Type: ${candidate.entryType}`);
      console.log(`      Date: ${candidate.timestamp}`);
      console.log(`      Reason: ${candidate.reason}`);
      console.log('');
    });
    
    // Step 3: Perform backfill
    const backfillResult = await backfillOrphanedProjects(analysis.backfillCandidates);
    
    console.log('\n🎯 Backfill Results:');
    console.log(`   ✅ Successfully created: ${backfillResult.success} projects`);
    console.log(`   ❌ Failed: ${backfillResult.failed} projects`);
    
    if (backfillResult.success > 0) {
      console.log('\n📊 Created Projects:');
      backfillResult.results
        .filter(r => r.status === 'success')
        .forEach(result => {
          console.log(`   • ${result.projectId} (from log ${result.logId})`);
        });
    }
    
    if (backfillResult.failed > 0) {
      console.log('\n⚠️ Failed Backfills:');
      backfillResult.results
        .filter(r => r.status !== 'success')
        .forEach(result => {
          console.log(`   • ${result.projectId}: ${result.reason || result.error}`);
        });
    }
    
    // Step 4: Save results to governance log
    const backfillGovernanceLog = {
      entryType: 'Process' as const,
      summary: `Orphaned governance logs backfill completed: ${backfillResult.success} projects created, ${backfillResult.failed} failed`,
      gptDraftEntry: JSON.stringify({
        analysis: {
          totalLogs: analysis.totalGovernanceLogs,
          candidates: analysis.backfillCandidates.length,
          existingProjects: analysis.existingProjects
        },
        results: backfillResult
      }),
      classification: 'backfill_operation',
      created_by: 'backfill_script'
    };
    
    await governanceLogsService.createGovernanceLog(backfillGovernanceLog);
    console.log('\n📝 Backfill operation logged to governance system');
    
    console.log('\n✅ Orphaned governance logs backfill completed successfully');
    
  } catch (error) {
    console.error('\n❌ Backfill operation failed:', error);
    process.exit(1);
  }
}

// Run the main function
main();

export { analyzeOrphanedGovernanceLogs, backfillOrphanedProjects };