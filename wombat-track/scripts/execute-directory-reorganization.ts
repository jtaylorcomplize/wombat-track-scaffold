#!/usr/bin/env tsx

/**
 * Repository Directory Reorganization Script
 * Phase: WT-8.9 - File Cleanup + Reorg
 * 
 * Executes the systematic reorganization of 98 non-essential documentation files
 * from repository root into structured directories while maintaining git history.
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface FileMoveMapping {
  [targetDirectory: string]: string[];
}

const PHASE_CONFIG = {
  phase_id: 'WT-8.9',
  step_id: 'WT-8.9.1',
  execution_timestamp: new Date().toISOString(),
  dry_run: process.argv.includes('--dry-run')
};

const FILE_MOVE_MAPPING: FileMoveMapping = {
  'docs/releases/': [
    'WT-8.0.2-COMPLETION-SUMMARY.md',
    'WT-8.0.3-COMPLETION-SUMMARY.md', 
    'WT-8.0.4-COMPLETION-SUMMARY.md',
    'WT-8.0.5-COMPLETE.md',
    'WT-8.0.6-PRODUCTION-MIGRATION-COMPLETE.md',
    'WT-8.0.7-FINAL-OAPP-UNIFICATION-COMPLETE.md',
    'WT-8.0.8-DEDUP-ORPHAN-LINKING-COMPLETE.md',
    'WT-8.0.9-MEMORY-GOVERNANCE-PUSH-COMPLETE.md',
    'WT-8.0.9-UNIFIED-MEMORY-CICD-ORCHESTRATION-COMPLETE.md',
    'SPQR_COMPLETION_SUMMARY.md',
    'SPQR_DEPLOYMENT_PHASE_COMPLETE.md',
    'SPQR-PHASE6-KICKOFF-COMPLETE.md',
    'OF-BEV-Phase-3-COMPLETE.md',
    'PHASE-4.0-ADMIN-UI-EMBED-COMPLETE.md',
    'WT-7.4-PHASE-4.0-COMPLETION.md',
    'WT-MCPGS-1.0-FINAL-VALIDATION.md',
    'WT-MCPGS-1.0-FINALIZATION-REPORT.md',
    'WT-MCPGS-1.0-PHASE3-COMPLETE.md',
    'WT-MCPGS-1.0-PHASE4-DOCKER-COMPLETE.md',
    'WT-MCPGS-1.0-PRODUCTION-DEPLOYMENT-COMPLETE.md',
    'WT-MCPGS-1.0-SecretsManager-ImportFix.md',
    'WT-8.0-snapshot-baseline.md',
    'WT-8.0.4-MANUAL-REVIEW-GUIDE.md',
    'WT-8.0.4-HIGH-CONFIDENCE-COMPLETE.md',
    'WT-8.0.4-FILL-SAFE-MODE.md'
  ],
  'docs/implementation/': [
    'WOMBAT_TRACK_IMPLEMENTATION_SUMMARY.md',
    'TECHNICAL_DESIGN_PROPOSAL.md',
    'QA-FRAMEWORK-IMPLEMENTATION-SUMMARY.md',
    'ADMIN-UI-INTEGRATION-FINAL.md',
    'ENHANCED-SIDEBAR-V3.1-VERIFICATION.md',
    'OF-PRE-GH1-IMPLEMENTATION-SUMMARY.md',
    'OF-PRE-GH1-EDITABLE-TABLES-SUMMARY.md',
    'HIERARCHICAL_PARSE_WORKFLOW_V1.3_REPORT.md',
    'NOTION_SEMANTIC_CORRECTIONS_SUMMARY.md'
  ],
  'docs/troubleshooting/': [
    'DEBUG-RESOLUTION-SUMMARY.md',
    'DEV-SERVER-DIAGNOSTIC-REPORT.md',
    'API-ERROR-DIAGNOSTIC-REPORT.md',
    'CRITICAL-HOOK-RECURSION-FIXES.md',
    'REACT-VITE-HOOK-RECURSION-DEBUG.md',
    'URGENT-DEBUG-FIX.md',
    'GIZMO-NOTIFICATION-HOOK-FIXES.md',
    'DEV-SERVER-FIX-QA-COMPLETE.md'
  ],
  'docs/database/': [
    'WT-DATABASE-AUDIT-REPORT.md',
    'WT-DATABASE-AUDIT-EXECUTIVE-SUMMARY.md',
    'data-backfill-report.md',
    'sync-report.md',
    'unsorted-content-databases-report.md',
    'TEMPORARY_HOLDING_TABLE_STATUS_REPORT.md'
  ],
  'docs/quality/': [
    'LINT_STATUS_REPORT.md',
    'GIT_HYGIENE_QA_CHECKLIST.md',
    'lint-analysis-report.json',
    'lint-pass-3.json',
    'lint-pass-4.json', 
    'lint-report.json',
    'remaining-lint-errors.json'
  ],
  'docs/design/': [
    'corrected-sidebar-wireframe.md',
    'enhanced-sidebar-wireframe.md',
    '2025-07-29-Orbis Forge Design Framework.txt',
    'github-copilot-debug-prompt.md',
    'governance-phase6-completion.md'
  ],
  'docs/deployment/': [
    'UAT-TEST-PLAN.md',
    'UAT-DEPLOYMENT-GUIDE.md',
    'DEV-SETUP.md'
  ]
};

const DATA_MOVE_MAPPING: FileMoveMapping = {
  'data/exports/': [
    'Phases_canonical.csv',
    'Projects_canonical.csv',
    'cleaned-phases-snapshot.csv',
    'cleaned-projects-snapshot.csv',
    'Sub-Apps 23ee1901e36e81deba63ce1abf2ed31e_all.csv',
    'Sub-Apps 23ee1901e36e81deba63ce1abf2ed31e_all (1).csv',
    'WT Projects 23ce1901e36e811b946bc3e7d764c335_all.csv',
    'WT Projects 23ce1901e36e811b946bc3e7d764c335_all (1).csv',
    'WT Phase Database 23ce1901e36e81beb6b8e576174024e5_all.csv',
    'WT Phase Database 23ce1901e36e81beb6b8e576174024e5_all (1).csv',
    'WT-MCPGS-1.0-Phase3-Remediation-Tracker.csv',
    'wt-phase-1.1a-memory-classification.csv',
    'wt-tech-debt-register 23fe1901e36e815b890ed32337b3ca8b_all.csv',
    'wt-schema-sync-report 23fe1901e36e819a8dc3dd45deaae36e_all.csv',
    'notion_databases_erd.csv',
    'notion_pages_comprehensive.csv'
  ],
  'data/backups/': [
    'notion-export-1753515936005.json',
    'notion-export-1753516410780.json',
    'canonical-db-model.json',
    'oApp_Phases_Export_20250802.json',
    'oApp_AgentLogs_20250802.json',
    'oApp_Projects_Local_Schema_20250802.json',
    'wt-audit-results.json',
    'wt-8.2-closure-memoryplugin.json',
    'watchdog-report.json',
    'dispatcher-test-report.json',
    'WT-MCPGS-1.0-MULTI-AGENT-TEST-REPORT.json',
    'governance-hook-recursion-fix.json',
    'sidebar-v3.1-activation-governance.json',
    'sidebar_v3.1_assessment.json',
    'sidebar_v3.1_activation_complete.json',
    'unlinked-artefact-log.json',
    'wt-8.0.4-safe-mode-report.json',
    'wt-8.0.4-high-confidence-report.json',
    'wt-8.0.4-execution-log.json'
  ]
};

class DirectoryReorganizer {
  private moveCount = 0;
  private errors: string[] = [];
  private validationResults: { [key: string]: boolean } = {};

  async execute(): Promise<void> {
    console.log(`🚀 Starting Directory Reorganization - Phase ${PHASE_CONFIG.phase_id}`);
    console.log(`⏰ Execution Mode: ${PHASE_CONFIG.dry_run ? 'DRY RUN' : 'LIVE EXECUTION'}`);

    try {
      // Execute file moves for both docs and data directories
      await this.executeFileMoves(FILE_MOVE_MAPPING);
      await this.executeFileMoves(DATA_MOVE_MAPPING);
      
      // Validate the reorganization
      await this.validateReorganization();
      
      // Generate governance log entry
      await this.generateGovernanceEntry();

      console.log(`✅ Directory Reorganization Complete!`);
      console.log(`📊 Files Moved: ${this.moveCount}`);
      console.log(`❌ Errors: ${this.errors.length}`);

      if (this.errors.length > 0) {
        console.log('⚠️ Errors encountered:');
        this.errors.forEach(error => console.log(`  - ${error}`));
      }

    } catch (error) {
      console.error('❌ Critical error during reorganization:', error);
      process.exit(1);
    }
  }

  private async executeFileMoves(mapping: FileMoveMapping): Promise<void> {
    for (const [targetDir, files] of Object.entries(mapping)) {
      console.log(`📁 Processing directory: ${targetDir}`);
      
      for (const fileName of files) {
        try {
          await this.moveFile(fileName, targetDir);
        } catch (error) {
          this.errors.push(`Failed to move ${fileName} to ${targetDir}: ${error}`);
        }
      }
    }
  }

  private async moveFile(fileName: string, targetDir: string): Promise<void> {
    const sourcePath = fileName;
    const targetPath = path.join(targetDir, fileName);

    // Check if source file exists
    if (!fs.existsSync(sourcePath)) {
      this.errors.push(`Source file not found: ${sourcePath}`);
      return;
    }

    if (PHASE_CONFIG.dry_run) {
      console.log(`  📝 [DRY RUN] Would move: ${sourcePath} → ${targetPath}`);
    } else {
      // Use git mv to preserve history
      try {
        execSync(`git mv "${sourcePath}" "${targetPath}"`, { stdio: 'inherit' });
        console.log(`  ✅ Moved: ${sourcePath} → ${targetPath}`);
        this.moveCount++;
      } catch (error) {
        // Fallback to regular move if git mv fails
        try {
          execSync(`mv "${sourcePath}" "${targetPath}"`, { stdio: 'inherit' });
          console.log(`  ⚠️ Moved (no git history): ${sourcePath} → ${targetPath}`);
          this.moveCount++;
        } catch (fallbackError) {
          throw new Error(`Both git mv and mv failed: ${error} | ${fallbackError}`);
        }
      }
    }
  }

  private async validateReorganization(): Promise<void> {
    console.log('🔍 Validating reorganization...');
    
    const allMappings = { ...FILE_MOVE_MAPPING, ...DATA_MOVE_MAPPING };
    
    for (const [targetDir, files] of Object.entries(allMappings)) {
      for (const fileName of files) {
        const targetPath = path.join(targetDir, fileName);
        const exists = fs.existsSync(targetPath);
        this.validationResults[targetPath] = exists;
        
        if (!exists && !PHASE_CONFIG.dry_run) {
          this.errors.push(`Validation failed: ${targetPath} not found after move`);
        }
      }
    }

    const successCount = Object.values(this.validationResults).filter(Boolean).length;
    const totalFiles = Object.values(this.validationResults).length;
    
    console.log(`📊 Validation Results: ${successCount}/${totalFiles} files validated`);
  }

  private async generateGovernanceEntry(): Promise<void> {
    const governanceEntry = {
      timestamp: PHASE_CONFIG.execution_timestamp,
      phase_id: PHASE_CONFIG.phase_id,
      step_id: PHASE_CONFIG.step_id,
      action: 'directory_reorganization',
      status: this.errors.length === 0 ? 'completed' : 'completed_with_errors',
      files_moved: this.moveCount,
      errors_count: this.errors.length,
      validation_results: this.validationResults,
      memory_anchors_created: [
        'WT-ANCHOR-GOVERNANCE',
        'WT-ANCHOR-DEPLOYMENT', 
        'WT-ANCHOR-QUALITY',
        'WT-DIRECTORY-REORGANIZATION-COMPLETE'
      ],
      next_actions: [
        'Update internal documentation links',
        'Archive historical reports to archive folders',
        'Initialize governance documentation templates'
      ]
    };

    const governancePath = 'logs/governance/directory-reorganization-governance.json';
    
    if (!PHASE_CONFIG.dry_run) {
      fs.writeFileSync(governancePath, JSON.stringify(governanceEntry, null, 2));
      console.log(`📝 Governance entry written to: ${governancePath}`);
    } else {
      console.log(`📝 [DRY RUN] Would write governance entry to: ${governancePath}`);
    }
  }
}

// Execute the reorganization
if (import.meta.url === `file://${process.argv[1]}`) {
  const reorganizer = new DirectoryReorganizer();
  reorganizer.execute().catch(console.error);
}

export default DirectoryReorganizer;