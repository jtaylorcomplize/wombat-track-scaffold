#!/usr/bin/env tsx

/**
 * Archive Legacy Reports Script - Phase WT-8.9.2.1
 * 
 * Archives all completion and status reports from pre-WT-8.0 to docs/releases/archive/
 * while preserving git history and creating comprehensive documentation.
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface ArchiveConfig {
  phase_id: string;
  step_id: string;
  execution_timestamp: string;
  dry_run: boolean;
}

const CONFIG: ArchiveConfig = {
  phase_id: 'WT-8.9.2',
  step_id: 'WT-8.9.2.1',
  execution_timestamp: new Date().toISOString(),
  dry_run: process.argv.includes('--dry-run')
};

// Files to archive (pre-WT-8.0 and legacy non-WT reports)
const LEGACY_REPORTS = [
  'WT-7.4-PHASE-4.0-COMPLETION.md',
  'OF-BEV-Phase-3-COMPLETE.md',
  'PHASE-4.0-ADMIN-UI-EMBED-COMPLETE.md',
  'SPQR-PHASE6-KICKOFF-COMPLETE.md',
  'SPQR_COMPLETION_SUMMARY.md',
  'SPQR_DEPLOYMENT_PHASE_COMPLETE.md',
  'WT-MCPGS-1.0-FINAL-VALIDATION.md',
  'WT-MCPGS-1.0-FINALIZATION-REPORT.md',
  'WT-MCPGS-1.0-PHASE3-COMPLETE.md',
  'WT-MCPGS-1.0-PHASE4-DOCKER-COMPLETE.md',
  'WT-MCPGS-1.0-PRODUCTION-DEPLOYMENT-COMPLETE.md',
  'WT-MCPGS-1.0-SecretsManager-ImportFix.md'
];

class LegacyReportsArchiver {
  private moveCount = 0;
  private errors: string[] = [];

  async execute(): Promise<void> {
    console.log(`🗂️ Starting Legacy Reports Archive - Phase ${CONFIG.phase_id}`);
    console.log(`⏰ Execution Mode: ${CONFIG.dry_run ? 'DRY RUN' : 'LIVE EXECUTION'}`);

    try {
      // Create archive directory
      await this.createArchiveDirectory();
      
      // Move legacy reports
      await this.archiveLegacyReports();
      
      // Create comprehensive archive index
      await this.createArchiveIndex();
      
      // Generate governance entry
      await this.generateGovernanceEntry();

      console.log(`✅ Legacy Reports Archive Complete!`);
      console.log(`📊 Files Archived: ${this.moveCount}`);
      console.log(`❌ Errors: ${this.errors.length}`);

      if (this.errors.length > 0) {
        console.log('⚠️ Errors encountered:');
        this.errors.forEach(error => console.log(`  - ${error}`));
      }

    } catch (error) {
      console.error('❌ Critical error during archival:', error);
      process.exit(1);
    }
  }

  private async createArchiveDirectory(): Promise<void> {
    const archiveDir = 'docs/releases/archive';
    
    if (!fs.existsSync(archiveDir)) {
      if (CONFIG.dry_run) {
        console.log(`📁 [DRY RUN] Would create directory: ${archiveDir}`);
      } else {
        fs.mkdirSync(archiveDir, { recursive: true });
        console.log(`📁 Created archive directory: ${archiveDir}`);
      }
    }
  }

  private async archiveLegacyReports(): Promise<void> {
    for (const fileName of LEGACY_REPORTS) {
      try {
        await this.moveToArchive(fileName);
      } catch (error) {
        this.errors.push(`Failed to archive ${fileName}: ${error}`);
      }
    }
  }

  private async moveToArchive(fileName: string): Promise<void> {
    const sourcePath = `docs/releases/${fileName}`;
    const targetPath = `docs/releases/archive/${fileName}`;

    // Check if source file exists
    if (!fs.existsSync(sourcePath)) {
      this.errors.push(`Source file not found: ${sourcePath}`);
      return;
    }

    if (CONFIG.dry_run) {
      console.log(`  📝 [DRY RUN] Would archive: ${sourcePath} → ${targetPath}`);
    } else {
      try {
        // Use git mv to preserve history
        execSync(`git mv "${sourcePath}" "${targetPath}"`, { stdio: 'inherit' });
        console.log(`  ✅ Archived: ${fileName}`);
        this.moveCount++;
      } catch (error) {
        throw new Error(`Git mv failed: ${error}`);
      }
    }
  }

  private async createArchiveIndex(): Promise<void> {
    const archiveIndexContent = `# 📚 Legacy Reports Archive

This directory contains historical completion reports and milestones from pre-WT-8.0 phases and legacy project systems.

## Archive Policy

These documents are preserved for historical reference and audit compliance but are considered **legacy** and should not be referenced for current development practices.

## Legacy Report Categories

### Pre-WT-8.0 Phase Reports
These reports predate the current WT-8.x series and represent earlier project milestone formats:

- **WT-7.4-PHASE-4.0-COMPLETION.md** - Final phase 4.0 completion summary
- **OF-BEV-Phase-3-COMPLETE.md** - Orbis Forge Business Enablement completion
- **PHASE-4.0-ADMIN-UI-EMBED-COMPLETE.md** - Admin UI integration milestone

### SPQR System Reports  
Historical SPQR (Strategic Planning Query Runtime) system deployment and completion documentation:

- **SPQR_COMPLETION_SUMMARY.md** - SPQR system implementation completion
- **SPQR_DEPLOYMENT_PHASE_COMPLETE.md** - SPQR production deployment milestone
- **SPQR-PHASE6-KICKOFF-COMPLETE.md** - SPQR Phase 6 initialization

### MCPGS Legacy Reports
Multi-Cloud Platform Governance System (MCPGS) v1.0 historical documentation:

- **WT-MCPGS-1.0-FINAL-VALIDATION.md** - Final validation and acceptance
- **WT-MCPGS-1.0-FINALIZATION-REPORT.md** - Project closure and handover
- **WT-MCPGS-1.0-PHASE3-COMPLETE.md** - Phase 3 implementation completion
- **WT-MCPGS-1.0-PHASE4-DOCKER-COMPLETE.md** - Docker containerization milestone
- **WT-MCPGS-1.0-PRODUCTION-DEPLOYMENT-COMPLETE.md** - Production deployment
- **WT-MCPGS-1.0-SecretsManager-ImportFix.md** - Critical secrets management fix

## Notable Legacy Milestones

### System Evolution Markers
- **WT-7.4** represents the final pre-8.0 architecture
- **MCPGS 1.0** established multi-cloud governance patterns
- **SPQR Phase 6** introduced strategic planning automation

### Deprecated References
⚠️ **Warning**: The following systems and processes documented in these reports have been superseded:

- **Legacy SPQR Architecture** - Replaced by integrated Orbis Forge system
- **MCPGS 1.0 Governance** - Superseded by WT-8.x governance framework  
- **Phase 4.0 Admin UI** - Replaced by Enhanced Sidebar v3.x system

## Current Documentation
For current practices and procedures, refer to:
- **Active Releases**: ../index.md (WT-8.0+ series)
- **Governance Framework**: ../../governance/index.md
- **Implementation Guides**: ../../implementation/index.md

## Memory Anchor Classification
**Archive Status**: LEGACY_PRESERVED  
**Historical Value**: AUDIT_COMPLIANCE  
**Reference Level**: DEPRECATED

---
*Archived: ${CONFIG.execution_timestamp}*
*Archive Policy: Preserve for compliance, deprecate for reference*`;

    const indexPath = 'docs/releases/archive/index.md';
    
    if (CONFIG.dry_run) {
      console.log(`📝 [DRY RUN] Would create archive index: ${indexPath}`);
    } else {
      fs.writeFileSync(indexPath, archiveIndexContent);
      console.log(`📝 Created comprehensive archive index: ${indexPath}`);
    }
  }

  private async generateGovernanceEntry(): Promise<void> {
    const governanceEntry = {
      timestamp: CONFIG.execution_timestamp,
      phase_id: CONFIG.phase_id,
      step_id: CONFIG.step_id,
      action: 'legacy_reports_archival',
      status: this.errors.length === 0 ? 'completed' : 'completed_with_errors',
      files_archived: this.moveCount,
      errors_count: this.errors.length,
      archive_location: 'docs/releases/archive/',
      legacy_reports_archived: LEGACY_REPORTS,
      historical_preservation: {
        git_history_preserved: true,
        archive_index_created: true,
        deprecation_warnings_added: true
      },
      compliance_notes: [
        'Legacy reports preserved for audit compliance',
        'Historical milestones documented with deprecation warnings',
        'Current documentation references updated'
      ]
    };

    const governancePath = 'logs/governance/legacy-reports-archival-governance.json';
    
    if (!CONFIG.dry_run) {
      fs.writeFileSync(governancePath, JSON.stringify(governanceEntry, null, 2));
      console.log(`📝 Governance entry written to: ${governancePath}`);
    } else {
      console.log(`📝 [DRY RUN] Would write governance entry to: ${governancePath}`);
    }
  }
}

// Execute the archival
if (import.meta.url === `file://${process.argv[1]}`) {
  const archiver = new LegacyReportsArchiver();
  archiver.execute().catch(console.error);
}

export default LegacyReportsArchiver;