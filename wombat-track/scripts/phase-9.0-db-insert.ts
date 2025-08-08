#!/usr/bin/env npx tsx

/**
 * Phase 9.0 Direct DB Insert Script
 * Inserts missing Phase 9.0.x entries directly into SQLite database
 */

import fs from 'fs';
import path from 'path';

interface PhaseData {
  projectId: string;
  phaseId: string;
  phaseName: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  RAG: string;
  notes: string;
  isDraft: number;
  linkedMemoryAnchor: string;
  project_ref: string;
}

async function main() {
  const reconciliationPath = path.join(process.cwd(), 'DriveMemory/OF-9.0/Reconciliation/Phase_9.0_DB_Rebuild.json');
  
  console.log('🚀 Phase 9.0 Direct DB Insert Starting...');
  console.log(`📁 Reading: ${reconciliationPath}`);

  // Read reconciliation JSON
  const rawData = fs.readFileSync(reconciliationPath, 'utf8');
  const phases: PhaseData[] = JSON.parse(rawData);
  
  console.log(`📦 Found ${phases.length} phases to insert`);

  // Generate SQL insert statements
  const sqlStatements = phases.map(phase => {
    const values = [
      `'${phase.phaseId}'`,
      `'${phase.phaseName.replace(/'/g, "''")}'`, // Escape single quotes
      `'${phase.project_ref}'`,
      `'${phase.status}'`,
      phase.startDate ? `'${phase.startDate}'` : 'NULL',
      phase.endDate ? `'${phase.endDate}'` : 'NULL',
      `'${phase.RAG}'`,
      `'${phase.notes.replace(/'/g, "''")}'`, // Escape single quotes
      `'${new Date().toISOString()}'`, // createdAt
      `'${new Date().toISOString()}'`, // updatedAt
      phase.isDraft
    ].join(', ');
    
    return `INSERT OR REPLACE INTO phases (phaseid, phasename, project_ref, status, startDate, endDate, RAG, notes, createdAt, updatedAt, isDraft) VALUES (${values});`;
  });

  // Write SQL to file
  const sqlPath = path.join(process.cwd(), 'DriveMemory/OF-9.0/Reconciliation/phase-9.0-inserts.sql');
  fs.writeFileSync(sqlPath, sqlStatements.join('\n') + '\n');
  console.log(`📄 SQL file written: ${sqlPath}`);

  // Execute SQL
  console.log('🔄 Executing SQL inserts...');
  const { spawn } = await import('child_process');
  
  return new Promise<void>((resolve, reject) => {
    const sqlite = spawn('sqlite3', ['./databases/production.db'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let output = '';
    let errorOutput = '';
    
    sqlite.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    sqlite.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    sqlite.on('close', (code) => {
      if (code !== 0) {
        console.error(`❌ SQLite execution failed: ${errorOutput}`);
        reject(new Error(`sqlite3 failed with code ${code}: ${errorOutput}`));
        return;
      }
      
      console.log('✅ SQL execution completed');
      if (output.trim()) {
        console.log('Output:', output);
      }
      
      // Verify the inserts
      verifyInserts(phases.map(p => p.phaseId)).then(() => {
        resolve();
      }).catch(reject);
    });
    
    // Write SQL commands to stdin
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    sqlite.stdin.write(sqlContent);
    sqlite.stdin.end();
  });
}

async function verifyInserts(phaseIds: string[]) {
  console.log('\n🔍 Verifying Phase 9.0.x entries in database...');
  const { spawn } = await import('child_process');
  
  const placeholders = phaseIds.map(id => `'${id}'`).join(',');
  const query = `SELECT phaseid, phasename, status FROM phases WHERE phaseid IN (${placeholders});`;
  
  return new Promise<void>((resolve, reject) => {
    const sqlite = spawn('sqlite3', ['./databases/production.db', query]);
    let output = '';
    let errorOutput = '';
    
    sqlite.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    sqlite.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    sqlite.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`sqlite3 failed: ${errorOutput}`));
        return;
      }
      
      const rows = output.trim().split('\n').filter(line => line.length > 0);
      console.log(`✅ Found ${rows.length} Phase 9.0.x entries in database:`);
      rows.forEach(row => {
        const [phaseid, phasename, status] = row.split('|');
        console.log(`  - ${phaseid}: ${phasename} (${status})`);
      });
      
      const foundIds = rows.map(row => row.split('|')[0]);
      const missing = phaseIds.filter(id => !foundIds.includes(id));
      if (missing.length > 0) {
        console.log(`⚠️  Still missing: ${missing.join(', ')}`);
      } else {
        console.log('🎉 All Phase 9.0.x entries successfully reconciled!');
        console.log('\n📊 Phase 9.0 is now visible in oApp DB, ready for Phase 9.0.6 finalization.');
      }
      
      resolve();
    });
  });
}

// Run script
main().catch(console.error);