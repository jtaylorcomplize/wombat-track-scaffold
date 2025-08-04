#!/usr/bin/env node

/**
 * Enhanced Sidebar v3.1 Primitive Error Debug Script
 * Systematic investigation of object-to-primitive conversion issues
 */

import fs from 'fs';
import path from 'path';

console.log('🔍 Enhanced Sidebar v3.1 Primitive Error Investigation\n');

// Target files for investigation
const targetFiles = [
  'src/components/layout/EnhancedSidebarV3.tsx',
  'src/components/operational/SubAppOverview.tsx',
  'src/hooks/useOrbisAPI.ts',
  'src/router/OrbisRouter.tsx'
];

// Problematic patterns to search for
const problematicPatterns = [
  {
    pattern: /key=\{[^}]*\}/g,
    description: 'JSX keys that might be objects',
    severity: 'HIGH'
  },
  {
    pattern: /\{[^}]*\.map\([^)]*=>\s*<[^>]*\{[^}]*\}/g,
    description: 'Map operations with object rendering',
    severity: 'HIGH'
  },
  {
    pattern: /console\.(log|warn|error)\([^)]*\{[^}]*\}/g,
    description: 'Console statements with objects',
    severity: 'MEDIUM'
  },
  {
    pattern: /String\([^)]*\)/g,
    description: 'Explicit string conversion',
    severity: 'MEDIUM'
  },
  {
    pattern: /\$\{[^}]*\}/g,
    description: 'Template literals that might contain objects',
    severity: 'MEDIUM'
  },
  {
    pattern: /React\.lazy\([^)]*\)/g,
    description: 'React lazy loading configurations',
    severity: 'HIGH'
  }
];

const debugResults = {
  timestamp: new Date().toISOString(),
  files_analyzed: [],
  issues_found: [],
  recommendations: []
};

// Analyze each target file
targetFiles.forEach(filePath => {
  const fullPath = path.resolve(filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`❌ File not found: ${filePath}`);
    debugResults.files_analyzed.push({
      file: filePath,
      status: 'NOT_FOUND'
    });
    return;
  }
  
  const content = fs.readFileSync(fullPath, 'utf8');
  console.log(`📄 Analyzing: ${filePath}`);
  
  const fileIssues = [];
  
  problematicPatterns.forEach(({ pattern, description, severity }) => {
    const matches = [...content.matchAll(pattern)];
    
    if (matches.length > 0) {
      console.log(`  ⚠️  [${severity}] ${description}: ${matches.length} matches`);
      
      matches.forEach((match, index) => {
        if (index < 3) { // Show first 3 matches
          const lines = content.split('\n');
          const lineIndex = lines.findIndex(line => line.includes(match[0]));
          console.log(`    Line ${lineIndex + 1}: ${match[0].trim().substring(0, 100)}...`);
          
          fileIssues.push({
            pattern: description,
            severity,
            line: lineIndex + 1,
            match: match[0].trim().substring(0, 200),
            context: lines[lineIndex]?.trim() || ''
          });
        }
      });
    }
  });
  
  debugResults.files_analyzed.push({
    file: filePath,
    status: 'ANALYZED',
    issues_count: fileIssues.length,
    issues: fileIssues
  });
});

// Generate recommendations
console.log('\n🎯 Recommendations:\n');

const recommendations = [
  '1. Check all .map() operations for proper key extraction: key={item.id || index}',
  '2. Ensure JSX children are primitives: <div>{item.name}</div> not <div>{item}</div>',
  '3. Use JSON.stringify() for console logging objects',
  '4. Add defensive null checks: item?.property?.method?.()',
  '5. Verify React.lazy() returns valid default exports',
  '6. Check template literals for object interpolation: ${obj} should be ${obj.property}'
];

recommendations.forEach(rec => {
  console.log(rec);
  debugResults.recommendations.push(rec);
});

// Save debug results
const debugPath = '/home/jtaylor/wombat-track-scaffold/wombat-track/DriveMemory/WT-SB3.1-BugFix/debug-analysis.json';
fs.writeFileSync(debugPath, JSON.stringify(debugResults, null, 2));

console.log(`\n📊 Debug results saved to: ${debugPath}`);
console.log(`\n🔍 Total issues found: ${debugResults.files_analyzed.reduce((sum, file) => sum + (file.issues_count || 0), 0)}`);

export default debugResults;