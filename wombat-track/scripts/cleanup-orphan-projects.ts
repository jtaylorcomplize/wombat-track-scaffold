#!/usr/bin/env tsx

/**
 * Cleanup workflow to identify and fix orphan records in Projects table
 * Identifies projects with null or unknown subApp_ref and provides admin interface to assign them
 */

import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'databases', 'production.db');

interface OrphanProject {
  projectId: string;
  projectName: string;
  owner?: string;
  status?: string;
  subApp_ref?: string;
  reason: 'null_subapp' | 'invalid_subapp' | 'unknown_project';
}

interface CleanupReport {
  totalProjects: number;
  orphanProjects: OrphanProject[];
  validSubApps: string[];
  suggestedActions: {
    projectId: string;
    suggestedSubApp: string;
    confidence: 'high' | 'medium' | 'low';
    reason: string;
  }[];
}

// Known valid SubApps from production data
const VALID_SUBAPPS = ['MetaPlatform', 'Complize', 'Orbis', 'Roam'];

async function identifyOrphanProjects(): Promise<CleanupReport> {
  let db: any = null;
  
  try {
    console.log('🔍 Analyzing Projects table for orphan records...');
    console.log(`📁 Database path: ${DB_PATH}`);
    
    // Open database connection
    db = await open({
      filename: DB_PATH,
      driver: sqlite3.Database
    });
    
    // Get all projects
    const projects = await db.all(`
      SELECT projectId, projectName, owner, status, subApp_ref 
      FROM Projects 
      ORDER BY projectName
    `);
    
    console.log(`📊 Found ${projects.length} total projects`);
    
    const orphanProjects: OrphanProject[] = [];
    const suggestedActions: CleanupReport['suggestedActions'] = [];
    
    for (const project of projects) {
      let isOrphan = false;
      let reason: OrphanProject['reason'] = 'null_subapp';
      
      // Check for null or empty subApp_ref
      if (!project.subApp_ref || project.subApp_ref.trim() === '') {
        isOrphan = true;
        reason = 'null_subapp';
      }
      // Check for invalid subApp_ref
      else if (!VALID_SUBAPPS.includes(project.subApp_ref)) {
        isOrphan = true;
        reason = 'invalid_subapp';
      }
      // Check for "Unknown Project" pattern
      else if (project.projectName && project.projectName.toLowerCase().includes('unknown')) {
        isOrphan = true;
        reason = 'unknown_project';
      }
      
      if (isOrphan) {
        orphanProjects.push({
          projectId: project.projectId,
          projectName: project.projectName,
          owner: project.owner,
          status: project.status,
          subApp_ref: project.subApp_ref,
          reason
        });
        
        // Generate suggestions based on project name patterns
        const suggestion = generateSubAppSuggestion(project);
        if (suggestion) {
          suggestedActions.push({
            projectId: project.projectId,
            ...suggestion
          });
        }
      }
    }
    
    return {
      totalProjects: projects.length,
      orphanProjects,
      validSubApps: VALID_SUBAPPS,
      suggestedActions
    };
    
  } catch (error) {
    console.error('❌ Error analyzing projects:', error);
    throw error;
  } finally {
    if (db) {
      await db.close();
    }
  }
}

function generateSubAppSuggestion(project: any): { suggestedSubApp: string; confidence: 'high' | 'medium' | 'low'; reason: string } | null {
  const name = project.projectName?.toLowerCase() || '';
  const owner = project.owner?.toLowerCase() || '';
  
  // High confidence suggestions
  if (name.includes('meta') || name.includes('platform') || name.includes('integrate')) {
    return {
      suggestedSubApp: 'MetaPlatform',
      confidence: 'high',
      reason: 'Project name indicates platform integration work'
    };
  }
  
  if (name.includes('immigration') || name.includes('complize') || name.includes('case')) {
    return {
      suggestedSubApp: 'Complize',
      confidence: 'high',
      reason: 'Project name indicates immigration/compliance work'
    };
  }
  
  if (name.includes('orbis') || name.includes('governance') || name.includes('wombat') || name.includes('wt-')) {
    return {
      suggestedSubApp: 'Orbis',
      confidence: 'high',
      reason: 'Project name indicates Orbis/governance work'
    };
  }
  
  if (name.includes('roam') || name.includes('knowledge')) {
    return {
      suggestedSubApp: 'Roam',
      confidence: 'high',
      reason: 'Project name indicates knowledge management work'
    };
  }
  
  // Medium confidence suggestions based on owner
  if (owner.includes('github') || owner.includes('claude')) {
    return {
      suggestedSubApp: 'MetaPlatform',
      confidence: 'medium',
      reason: 'Owner suggests technical/platform work'
    };
  }
  
  // Low confidence - default to Orbis for undefined projects
  return {
    suggestedSubApp: 'Orbis',
    confidence: 'low',
    reason: 'Default assignment - requires manual review'
  };
}

async function generateCleanupPlan(report: CleanupReport): Promise<void> {
  console.log('\n🧹 CLEANUP ANALYSIS REPORT');
  console.log('=' .repeat(50));
  
  console.log(`📊 Total Projects: ${report.totalProjects}`);
  console.log(`🚨 Orphan Projects: ${report.orphanProjects.length}`);
  console.log(`✅ Valid SubApps: ${report.validSubApps.join(', ')}`);
  
  if (report.orphanProjects.length === 0) {
    console.log('\n🎉 No orphan projects found! All projects have valid SubApp assignments.');
    return;
  }
  
  console.log('\n🚨 ORPHAN PROJECTS FOUND:');
  console.log('-'.repeat(50));
  
  const groupedByReason = report.orphanProjects.reduce((acc, project) => {
    if (!acc[project.reason]) acc[project.reason] = [];
    acc[project.reason].push(project);
    return acc;
  }, {} as Record<string, OrphanProject[]>);
  
  for (const [reason, projects] of Object.entries(groupedByReason)) {
    console.log(`\n📋 ${reason.toUpperCase().replace('_', ' ')} (${projects.length} projects):`);
    
    projects.forEach((project, index) => {
      console.log(`   ${index + 1}. ${project.projectName} (${project.projectId})`);
      console.log(`      Status: ${project.status || 'Unknown'}`);
      console.log(`      Owner: ${project.owner || 'Unknown'}`);
      console.log(`      Current SubApp: ${project.subApp_ref || 'NULL'}`);
      
      // Show suggestion if available
      const suggestion = report.suggestedActions.find(s => s.projectId === project.projectId);
      if (suggestion) {
        const confidenceEmoji = {
          'high': '🟢',
          'medium': '🟡', 
          'low': '🔴'
        }[suggestion.confidence];
        console.log(`      💡 Suggestion: ${suggestion.suggestedSubApp} ${confidenceEmoji} (${suggestion.reason})`);
      }
      console.log('');
    });
  }
  
  console.log('\n🔧 RECOMMENDED ACTIONS:');
  console.log('-'.repeat(50));
  console.log('1. Review each orphan project manually');
  console.log('2. Use the Admin UI to assign appropriate SubApp references');
  console.log('3. High confidence suggestions can be batch-applied');
  console.log('4. Medium/Low confidence suggestions require manual review');
  console.log('5. Archive or merge invalid projects where necessary');
  
  console.log('\n📋 ADMIN UI ACCESS:');
  console.log('   Navigate to: /admin/data-integrity');
  console.log('   Select: "Editable Tables" → "Projects"');
  console.log('   Filter: "All Sub-Apps" to see unassigned projects');
  
  console.log('\n💾 GOVERNANCE LOGGING:');
  console.log('   All SubApp assignment changes will be logged automatically');
  console.log('   Memory Anchor: project-link-update-20250805');
}

async function exportCleanupReport(report: CleanupReport): Promise<void> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `DriveMemory/OF-8.4/unknown-projects-cleanup-plan-${timestamp}.json`;
  
  try {
    const fs = await import('fs/promises');
    await fs.mkdir(path.dirname(filename), { recursive: true });
    await fs.writeFile(filename, JSON.stringify(report, null, 2));
    console.log(`\n📄 Cleanup report exported: ${filename}`);
  } catch (error) {
    console.warn('⚠️  Could not export cleanup report:', error);
  }
}

// Execute analysis if run directly
async function main() {
  try {
    const report = await identifyOrphanProjects();
    await generateCleanupPlan(report);
    await exportCleanupReport(report);
    
    console.log('\n🎯 CLEANUP WORKFLOW COMPLETE');
    console.log('Next: Use Admin UI to manually assign SubApp references to orphan projects');
    
  } catch (error) {
    console.error('❌ Cleanup workflow failed:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { identifyOrphanProjects, generateCleanupPlan };