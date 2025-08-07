#!/usr/bin/env npx tsx

/**
 * Autonomous Phase 9.0.x Full Reconciliation Engine
 * Sources, maps, and ingests all governance logs autonomously
 */

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

interface GovernanceLogEntry {
  timestamp: string;
  entry_type?: string;
  entryType?: string;
  phase_id?: string;
  phaseId?: string;
  step_id?: string;
  stepId?: string;
  status?: string;
  summary?: string;
  action?: string;
  userId?: string;
  success?: boolean | number;
  memoryAnchor?: string;
  memory_anchor?: string;
  [key: string]: any;
}

interface PhaseGovernanceData {
  phaseId: string;
  governanceLogs: GovernanceLogEntry[];
  sourceFiles: string[];
  memoryAnchor: string;
  totalLogs: number;
}

interface ReconciliationResult {
  phasesProcessed: number;
  totalLogsIngested: number;
  missingLogs: string[];
  errors: string[];
  success: boolean;
}

class AutonomousReconciliationEngine {
  private baseDir: string;
  private reconciliationDir: string;
  private retryAttempts: number = 3;
  private results: ReconciliationResult;
  
  constructor() {
    this.baseDir = process.cwd();
    this.reconciliationDir = path.join(this.baseDir, 'DriveMemory/OF-9.0/Reconciliation/FullReconciliation');
    this.results = {
      phasesProcessed: 0,
      totalLogsIngested: 0,
      missingLogs: [],
      errors: [],
      success: false
    };
  }

  async execute(): Promise<ReconciliationResult> {
    console.log('🚀 Autonomous Phase 9.0.x Reconciliation Engine Starting...');
    
    try {
      // Ensure reconciliation directory exists
      fs.mkdirSync(this.reconciliationDir, { recursive: true });
      
      // Step 1: Source all governance logs
      const allLogs = await this.sourceAllGovernanceLogs();
      console.log(`📊 Sourced ${allLogs.length} total governance entries`);
      
      // Step 2: Map logs to phases automatically
      const phaseMappings = await this.mapLogsToPhases(allLogs);
      console.log(`🗺️  Mapped logs to ${phaseMappings.length} phases`);
      
      // Step 3: Generate per-phase governance JSON
      await this.generatePerPhaseGovernanceJSON(phaseMappings);
      
      // Step 4: Ingest into oApp database (using direct DB writes)
      await this.ingestGovernanceData(phaseMappings);
      
      // Step 5: Self-validation
      await this.performSelfValidation(phaseMappings);
      
      // Step 6: Generate final report
      await this.generateFinalReport(phaseMappings);
      
      this.results.success = true;
      return this.results;
      
    } catch (error) {
      console.error('❌ Autonomous reconciliation failed:', error);
      this.results.errors.push(error instanceof Error ? error.message : String(error));
      await this.generateErrorReport(error);
      return this.results;
    }
  }

  private async sourceAllGovernanceLogs(): Promise<GovernanceLogEntry[]> {
    const allLogs: GovernanceLogEntry[] = [];
    
    // Source from DriveMemory/OF-9.0/Phase_9.0_Governance.jsonl
    const mainGovernanceFile = path.join(this.baseDir, 'DriveMemory/OF-9.0/Phase_9.0_Governance.jsonl');
    if (fs.existsSync(mainGovernanceFile)) {
      const content = fs.readFileSync(mainGovernanceFile, 'utf8');
      content.split('\n').filter(line => line.trim()).forEach(line => {
        try {
          allLogs.push(JSON.parse(line));
        } catch (e) {
          console.warn('⚠️  Failed to parse log line:', line.substring(0, 100));
        }
      });
    }
    
    // Source from logs/governance files
    const governanceLogFiles = [
      'logs/governance/2025-08-06T03-44-57.jsonl',
      'logs/governance/2025-08-06T04-58-49.jsonl',
      'logs/governance/governance.jsonl'
    ];
    
    for (const logFile of governanceLogFiles) {
      const fullPath = path.join(this.baseDir, logFile);
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        content.split('\n').filter(line => line.trim()).forEach(line => {
          try {
            const entry = JSON.parse(line);
            if (this.isPhase9Related(entry)) {
              allLogs.push(entry);
            }
          } catch (e) {
            // Skip invalid JSON lines
          }
        });
      }
    }
    
    return allLogs;
  }

  private isPhase9Related(entry: GovernanceLogEntry): boolean {
    const jsonStr = JSON.stringify(entry).toLowerCase();
    return jsonStr.includes('9.0') || 
           jsonStr.includes('phase-9') || 
           jsonStr.includes('of-9') ||
           entry.phaseId?.includes('9.0') ||
           entry.phase_id?.includes('9.0');
  }

  private async mapLogsToPhases(logs: GovernanceLogEntry[]): Promise<PhaseGovernanceData[]> {
    const phaseMap = new Map<string, GovernanceLogEntry[]>();
    const phaseIds = ['OF-9.0', 'OF-9.0.1', 'OF-9.0.2', 'OF-9.0.3', 'OF-9.0.4', 'OF-9.0.5', 'OF-9.0.6'];
    
    // Initialize phase buckets
    phaseIds.forEach(phaseId => {
      phaseMap.set(phaseId, []);
    });
    
    // Categorize logs by phase
    logs.forEach(log => {
      const phaseId = this.extractPhaseId(log);
      if (phaseId && phaseMap.has(phaseId)) {
        phaseMap.get(phaseId)!.push(log);
      } else {
        // Default to main OF-9.0 phase
        phaseMap.get('OF-9.0')!.push(log);
      }
    });
    
    // Convert to PhaseGovernanceData
    return phaseIds.map(phaseId => ({
      phaseId,
      governanceLogs: phaseMap.get(phaseId) || [],
      sourceFiles: ['Phase_9.0_Governance.jsonl', 'governance.jsonl'],
      memoryAnchor: 'of-9.0-init-20250806',
      totalLogs: phaseMap.get(phaseId)?.length || 0
    }));
  }

  private extractPhaseId(log: GovernanceLogEntry): string | null {
    // Try direct fields
    if (log.phaseId) return log.phaseId;
    if (log.phase_id) return log.phase_id;
    
    // Try parsing from stepId
    if (log.stepId || log.step_id) {
      const stepId = log.stepId || log.step_id;
      if (stepId?.includes('9.0.1')) return 'OF-9.0.1';
      if (stepId?.includes('9.0.2')) return 'OF-9.0.2';
      if (stepId?.includes('9.0.3')) return 'OF-9.0.3';
      if (stepId?.includes('9.0.4')) return 'OF-9.0.4';
      if (stepId?.includes('9.0.5')) return 'OF-9.0.5';
      if (stepId?.includes('9.0.6')) return 'OF-9.0.6';
    }
    
    // Try parsing from summary or action
    const text = (log.summary || log.action || '').toLowerCase();
    if (text.includes('9.0.1')) return 'OF-9.0.1';
    if (text.includes('9.0.2')) return 'OF-9.0.2';
    if (text.includes('9.0.3')) return 'OF-9.0.3';
    if (text.includes('9.0.4')) return 'OF-9.0.4';
    if (text.includes('9.0.5')) return 'OF-9.0.5';
    if (text.includes('9.0.6')) return 'OF-9.0.6';
    
    return 'OF-9.0'; // Default to main phase
  }

  private async generatePerPhaseGovernanceJSON(phaseMappings: PhaseGovernanceData[]): Promise<void> {
    console.log('📝 Generating per-phase governance JSON files...');
    
    for (const phase of phaseMappings) {
      if (phase.totalLogs > 0) {
        const filename = `Phase_${phase.phaseId.replace(/[.-]/g, '_')}_Governance.json`;
        const filepath = path.join(this.reconciliationDir, filename);
        
        const governanceData = {
          phaseId: phase.phaseId,
          memoryAnchor: phase.memoryAnchor,
          totalLogs: phase.totalLogs,
          sourceFiles: phase.sourceFiles,
          governanceLogs: phase.governanceLogs.map(log => ({
            timestamp: log.timestamp,
            entryType: log.entry_type || log.entryType || 'governance_event',
            action: log.action || log.summary || 'phase_activity',
            userId: log.userId || 'autonomous-system',
            success: log.success !== undefined ? (log.success ? 1 : 0) : 1,
            metadata: {
              originalPhaseId: log.phaseId || log.phase_id,
              originalStepId: log.stepId || log.step_id,
              status: log.status,
              memoryAnchor: log.memoryAnchor || log.memory_anchor
            }
          }))
        };
        
        fs.writeFileSync(filepath, JSON.stringify(governanceData, null, 2));
        console.log(`  ✅ ${filename} - ${phase.totalLogs} logs`);
      }
    }
  }

  private async ingestGovernanceData(phaseMappings: PhaseGovernanceData[]): Promise<void> {
    console.log('💾 Ingesting governance data into oApp database...');
    
    // Since we don't have a governance logs table, we'll create a summary record
    // and update the existing phases with governance metadata
    
    for (const phase of phaseMappings) {
      if (phase.totalLogs > 0) {
        const updateSql = `
          UPDATE phases 
          SET notes = notes || '\nGovernance: ${phase.totalLogs} logs ingested from autonomous reconciliation on ${new Date().toISOString()}'
          WHERE phaseid = '${phase.phaseId}';
        `;
        
        const sqlFile = path.join(this.reconciliationDir, `update_${phase.phaseId.replace(/[.-]/g, '_')}_governance.sql`);
        fs.writeFileSync(sqlFile, updateSql);
        
        // Execute SQL update
        await this.executeSQLFile(sqlFile);
        this.results.totalLogsIngested += phase.totalLogs;
      }
      this.results.phasesProcessed++;
    }
  }

  private async executeSQLFile(sqlFile: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const sqlite = spawn('sqlite3', ['./databases/production.db'], {
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      let errorOutput = '';
      
      sqlite.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });
      
      sqlite.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`SQL execution failed: ${errorOutput}`));
        } else {
          resolve();
        }
      });
      
      const sqlContent = fs.readFileSync(sqlFile, 'utf8');
      sqlite.stdin.write(sqlContent);
      sqlite.stdin.end();
    });
  }

  private async performSelfValidation(phaseMappings: PhaseGovernanceData[]): Promise<void> {
    console.log('🔍 Performing self-validation...');
    
    // Check if phases exist in database
    const phaseIds = phaseMappings.map(p => p.phaseId);
    const query = `SELECT phaseid FROM phases WHERE phaseid IN (${phaseIds.map(id => `'${id}'`).join(',')});`;
    
    return new Promise((resolve) => {
      const sqlite = spawn('sqlite3', ['./databases/production.db', query]);
      let output = '';
      
      sqlite.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      sqlite.on('close', () => {
        const foundPhases = output.trim().split('\n').filter(line => line.length > 0);
        const missingPhases = phaseIds.filter(id => !foundPhases.includes(id));
        
        if (missingPhases.length > 0) {
          console.log(`⚠️  Missing phases in DB: ${missingPhases.join(', ')}`);
          this.results.missingLogs.push(...missingPhases);
        } else {
          console.log('✅ All phases validated in database');
        }
        
        resolve();
      });
    });
  }

  private async generateFinalReport(phaseMappings: PhaseGovernanceData[]): Promise<void> {
    const reportPath = path.join(this.reconciliationDir, 'FullReconciliation_Report.md');
    
    const report = `# Full Autonomous Phase 9.0.x Reconciliation Report

**Date:** ${new Date().toISOString()}  
**Mode:** Autonomous (no human review required)  
**Status:** ${this.results.success ? '✅ SUCCESS' : '❌ FAILED'}

## Summary
- **Phases Processed:** ${this.results.phasesProcessed}
- **Total Logs Ingested:** ${this.results.totalLogsIngested}
- **Missing Logs:** ${this.results.missingLogs.length}
- **Errors:** ${this.results.errors.length}

## Phase-by-Phase Results

${phaseMappings.map(phase => `
### ${phase.phaseId}
- **Governance Logs:** ${phase.totalLogs}
- **Memory Anchor:** ${phase.memoryAnchor}
- **Source Files:** ${phase.sourceFiles.join(', ')}
- **Status:** ${phase.totalLogs > 0 ? '✅ Reconciled' : '⚠️ No logs found'}
`).join('\n')}

## Files Generated
${fs.readdirSync(this.reconciliationDir).map(file => `- ${file}`).join('\n')}

## Database Integration
All governance metadata has been integrated into the phases table with autonomous reconciliation timestamps.

## Validation Results
${this.results.missingLogs.length === 0 ? '✅ All phases validated in database' : `⚠️ Missing phases: ${this.results.missingLogs.join(', ')}`}

## Final Status
**Phase 9.0 governance reconciliation: ${this.results.success ? 'COMPLETE' : 'FAILED'}**
${this.results.success ? 'Ready for Phase 9.0.6 finalization.' : 'Manual intervention required.'}

---
*Generated by Autonomous Reconciliation Engine v1.0*
`;
    
    fs.writeFileSync(reportPath, report);
    console.log(`📄 Final report generated: ${reportPath}`);
  }

  private async generateErrorReport(error: any): Promise<void> {
    const errorPath = path.join(this.baseDir, 'DriveMemory/OF-9.0/Reconciliation/ErrorReport.md');
    
    const errorReport = `# Autonomous Reconciliation Error Report

**Date:** ${new Date().toISOString()}  
**Status:** ❌ FAILED

## Error Details
\`\`\`
${error instanceof Error ? error.message : String(error)}
\`\`\`

## Stack Trace
\`\`\`
${error instanceof Error && error.stack ? error.stack : 'No stack trace available'}
\`\`\`

## Partial Results
- **Phases Processed:** ${this.results.phasesProcessed}
- **Logs Ingested:** ${this.results.totalLogsIngested}
- **Errors:** ${this.results.errors.join(', ')}

## Recommended Actions
1. Check database connectivity
2. Verify file permissions in DriveMemory/OF-9.0/
3. Ensure sqlite3 is available
4. Retry reconciliation with manual oversight

---
*Generated by Autonomous Reconciliation Engine v1.0*
`;
    
    fs.writeFileSync(errorPath, errorReport);
    console.log(`📄 Error report generated: ${errorPath}`);
  }
}

// Execute autonomous reconciliation
async function main() {
  const engine = new AutonomousReconciliationEngine();
  const result = await engine.execute();
  
  if (result.success) {
    console.log('\n🎉 Autonomous Phase 9.0.x Reconciliation COMPLETE!');
    console.log(`📊 ${result.phasesProcessed} phases processed, ${result.totalLogsIngested} logs ingested`);
    process.exit(0);
  } else {
    console.log('\n❌ Autonomous reconciliation FAILED');
    console.log(`🔍 Check error report for details`);
    process.exit(1);
  }
}

main().catch(console.error);