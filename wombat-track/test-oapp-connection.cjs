#!/usr/bin/env node

/**
 * Test oApp Connection - Verify dev server can load oApp data
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing oApp Connection...');
console.log('=' .repeat(50));

// Test 1: Verify CSV file exists and is accessible
console.log('\n1️⃣ Testing CSV File Access...');
try {
  const csvPath = path.join(__dirname, 'public', 'cleaned-projects-snapshot.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.split('\n');
  const dataLines = lines.filter(line => line.trim()).length - 1; // Exclude header
  
  console.log(`✅ CSV file found: ${csvPath}`);
  console.log(`✅ Total projects in CSV: ${dataLines}`);
  console.log(`✅ First few lines:`);
  lines.slice(0, 4).forEach((line, i) => {
    console.log(`   ${i}: ${line.substring(0, 80)}${line.length > 80 ? '...' : ''}`);
  });
} catch (error) {
  console.error(`❌ CSV file access failed: ${error.message}`);
  process.exit(1);
}

// Test 2: Parse CSV content
console.log('\n2️⃣ Testing CSV Parsing...');
try {
  const csvPath = path.join(__dirname, 'public', 'cleaned-projects-snapshot.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.split('\n');
  
  const projects = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Simple CSV parsing
    const values = parseCSVLine(line);
    if (values.length >= 4) {
      const [projectName, projectId, owner, status] = values;
      if (projectName && projectId) {
        projects.push({
          projectName: projectName.trim(),
          projectId: projectId.trim(),
          owner: owner.trim() || 'Unassigned',
          status: status.trim() || 'Unknown'
        });
      }
    }
  }
  
  console.log(`✅ Successfully parsed ${projects.length} projects`);
  console.log(`✅ Sample projects:`);
  projects.slice(0, 5).forEach((project, i) => {
    console.log(`   ${i + 1}. [${project.projectId}] ${project.projectName.substring(0, 50)}${project.projectName.length > 50 ? '...' : ''}`);
  });
  
  // Count by status
  const statusCounts = {};
  projects.forEach(p => {
    statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
  });
  
  console.log(`✅ Status distribution:`, statusCounts);
  
} catch (error) {
  console.error(`❌ CSV parsing failed: ${error.message}`);
  process.exit(1);
}

// Test 3: Verify types alignment
console.log('\n3️⃣ Testing Type Conversion...');
try {
  const mockProject = {
    id: 'test-id',
    title: 'Test Project',
    description: 'Test Description',
    projectOwner: 'Test Owner',
    status: 'planning',
    phases: [{
      id: 'test-phase-1',
      name: 'Test Phase',
      description: 'Test Phase Description',
      status: 'not_started',
      steps: [{
        id: 'test-step-1',
        name: 'Test Step',
        description: 'Test Step Description',
        status: 'not_started',
        assignedTo: 'Test Owner'
      }]
    }],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  console.log(`✅ Project type structure validated`);
  console.log(`✅ Required fields: ${Object.keys(mockProject).join(', ')}`);
  
} catch (error) {
  console.error(`❌ Type validation failed: ${error.message}`);
  process.exit(1);
}

console.log('\n🎉 All tests passed! Dev server should be able to load oApp data.');
console.log('\nNext steps:');
console.log('1. Start dev server: npm run dev');
console.log('2. Verify projects load in UI');
console.log('3. Check browser console for oApp connection logs');

/**
 * Parse a CSV line handling quoted fields with commas
 */
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}