#!/usr/bin/env tsx

/**
 * Generate comprehensive data backfill report for WT-8.0.3
 */

import { performDataReconciliation } from './data-reconciliation-analysis';
import { writeFileSync } from 'fs';
import { join } from 'path';

async function generateBackfillReport() {
  console.log('📄 Generating comprehensive backfill report...');
  
  try {
    const { allIssues, allRecords, report } = await performDataReconciliation();
    
    // Save the main report
    const reportPath = join(process.cwd(), 'data-backfill-report.md');
    writeFileSync(reportPath, report);
    console.log(`✅ Report saved to: ${reportPath}`);
    
    // Generate JSON export for programmatic processing
    const jsonReport = {
      metadata: {
        generatedAt: new Date().toISOString(),
        totalRecords: Object.values(allRecords).reduce((sum, records) => sum + records.length, 0),
        totalIssues: allIssues.length,
        scope: 'WT-8.0.3 Canonical Data Reconciliation'
      },
      issues: allIssues,
      recordCounts: Object.fromEntries(
        Object.entries(allRecords).map(([db, records]) => [db, records.length])
      ),
      summary: {
        byPriority: allIssues.reduce((acc, issue) => {
          acc[issue.priority] = (acc[issue.priority] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        byCategory: allIssues.reduce((acc, issue) => {
          acc[issue.category] = (acc[issue.category] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        byDatabase: allIssues.reduce((acc, issue) => {
          acc[issue.databaseName] = (acc[issue.databaseName] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      }
    };
    
    const jsonPath = join(process.cwd(), 'unlinked-artefact-log.json');
    writeFileSync(jsonPath, JSON.stringify(jsonReport, null, 2));
    console.log(`✅ JSON report saved to: ${jsonPath}`);
    
    // Print summary to console
    console.log('\n📊 Backfill Report Summary:');
    console.log(`   Total Records: ${jsonReport.metadata.totalRecords}`);
    console.log(`   Total Issues: ${jsonReport.metadata.totalIssues}`);
    console.log('\n   Issues by Priority:');
    Object.entries(jsonReport.summary.byPriority).forEach(([priority, count]) => {
      console.log(`   - ${priority}: ${count}`);
    });
    console.log('\n   Issues by Database:');
    Object.entries(jsonReport.summary.byDatabase).forEach(([db, count]) => {
      console.log(`   - ${db}: ${count}`);
    });
    
    return { reportPath, jsonPath, summary: jsonReport.summary };
    
  } catch (error) {
    console.error('❌ Failed to generate backfill report:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateBackfillReport()
    .then(({ reportPath, jsonPath }) => {
      console.log('\n🎯 WT-8.0.3 Backfill Analysis Complete!');
      console.log(`📄 Markdown Report: ${reportPath}`);
      console.log(`📊 JSON Data: ${jsonPath}`);
      console.log('\n✅ Ready for Gizmo review and reconciliation planning');
    })
    .catch(console.error);
}

export { generateBackfillReport };