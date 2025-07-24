// Manual verification script for WT-3.x phases
// Run with: node tests/manual/verify-wt3-phases.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Verifying WT-3.x phases in seedPhaseTracker.ts...\n');

// Read the seed file
const seedFilePath = path.join(__dirname, '../../src/dev/seedPhaseTracker.ts');
const seedContent = fs.readFileSync(seedFilePath, 'utf8');

// Check for each phase
const phases = [
  { id: 'WT-3.1', name: 'Advanced Testing Infrastructure', expectedStatus: 'amber' },
  { id: 'WT-3.2', name: 'CI/CD Pipeline Migration', expectedStatus: 'green' },
  { id: 'WT-3.3', name: 'MetaValidator System', expectedStatus: 'blue' }
];

let allPhasesFound = true;

phases.forEach(phase => {
  const phaseIdFound = seedContent.includes(`'phase-wt-${phase.id.toLowerCase().replace('wt-', '')}'`);
  const phaseNameFound = seedContent.includes(phase.name);
  const ragStatusFound = seedContent.includes(`ragStatus: '${phase.expectedStatus}'`);
  
  console.log(`${phase.id}: ${phase.name}`);
  console.log(`  ✓ Phase ID: ${phaseIdFound ? 'Found' : 'NOT FOUND'}`);
  console.log(`  ✓ Phase Name: ${phaseNameFound ? 'Found' : 'NOT FOUND'}`);
  console.log(`  ✓ RAG Status (${phase.expectedStatus}): ${ragStatusFound ? 'Found' : 'NOT FOUND'}`);
  console.log('');
  
  if (!phaseIdFound || !phaseNameFound || !ragStatusFound) {
    allPhasesFound = false;
  }
});

// Check for metadata fields
console.log('📋 Checking metadata fields:');
const metadataFields = ['phaseType:', 'phaseOwner:', 'ragStatus:', 'stepInstruction:', 'isSideQuest:'];
metadataFields.forEach(field => {
  const count = (seedContent.match(new RegExp(field, 'g')) || []).length;
  console.log(`  ${field} ${count} occurrences`);
});

console.log('\n' + (allPhasesFound ? '✅ All WT-3.x phases verified successfully!' : '❌ Some phases are missing!'));

// Check step counts
console.log('\n📊 Step counts:');
const wt31Steps = (seedContent.match(/step-wt-3\.1-/g) || []).length;
const wt32Steps = (seedContent.match(/step-wt-3\.2-/g) || []).length;
const wt33Steps = (seedContent.match(/step-wt-3\.3-/g) || []).length;

console.log(`  WT-3.1: ${wt31Steps} steps`);
console.log(`  WT-3.2: ${wt32Steps} steps`);
console.log(`  WT-3.3: ${wt33Steps} steps`);

console.log('\n✨ Verification complete!');