#!/usr/bin/env npx tsx

/**
 * Phase 9.0 DB Reconciliation Script
 * Pushes missing Phase 9.0.x entries to oApp database via import API
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

interface PhaseImportPayload {
  phaseId: string;
  name: string;
  status: string;
  startedAt?: string | null;
  completedAt?: string | null;
}

async function main() {
  const reconciliationPath = path.join(process.cwd(), 'DriveMemory/OF-9.0/Reconciliation/Phase_9.0_DB_Rebuild.json');
  
  console.log('🚀 Phase 9.0 DB Reconciliation Starting...');
  console.log(`📁 Reading: ${reconciliationPath}`);

  // Read reconciliation JSON
  const rawData = fs.readFileSync(reconciliationPath, 'utf8');
  const phases: PhaseData[] = JSON.parse(rawData);
  
  console.log(`📦 Found ${phases.length} phases to reconcile`);

  // Transform to API format
  const apiPayload = {
    projectId: 'OF-SDLC-IMP2', // Use existing project from DB
    phases: phases.map((phase): PhaseImportPayload => ({
      phaseId: phase.phaseId,
      name: phase.phaseName,
      status: phase.status,
      startedAt: phase.startDate,
      completedAt: phase.endDate
    })),
    submittedBy: 'phase-9.0-reconciliation-script'
  };

  console.log('🔄 Transformed payload:');
  console.log(JSON.stringify(apiPayload, null, 2));

  // Check if server is running
  try {
    const healthCheck = await fetch('http://localhost:3002/health', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!healthCheck.ok) {
      throw new Error(`Health check failed: ${healthCheck.status}`);
    }
    
    console.log('✅ Server is running');
  } catch (error) {
    console.error('❌ Server not accessible:', error);
    console.log('💡 Start the server with: npm run admin-server');
    return;
  }

  // Push to API
  try {
    const response = await fetch('http://localhost:3002/api/admin/phases/import', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(apiPayload)
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`API call failed: ${response.status} - ${errorData}`);
    }

    const result = await response.json();
    console.log('✅ Phase import successful:');
    console.log(JSON.stringify(result, null, 2));

    // Verify imports
    console.log('\n🔍 Verifying Phase 9.0.x entries in database...');
    await verifyPhaseImports(phases.map(p => p.phaseId));

  } catch (error) {
    console.error('❌ Phase import failed:', error);
    process.exit(1);
  }
}

async function verifyPhaseImports(phaseIds: string[]) {
  // Use command line sqlite3 instead of node module
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
      }
      
      resolve();
    });
  });
}

// Run script
main().catch(console.error);