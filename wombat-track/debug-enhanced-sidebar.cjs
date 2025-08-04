#!/usr/bin/env node

/**
 * Enhanced Sidebar v3.1 Debugging Script
 * Helps identify the "Cannot convert object to primitive value" error
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Enhanced Sidebar v3.1 Debug Analysis\n');

// 1. Check for problematic patterns
const problematicPatterns = [
  {
    pattern: /\$\{[^}]*\}/g,
    description: 'Template literals that might contain objects',
    file: 'Any JSX file'
  },
  {
    pattern: /\.map\([^)]*\)/g,
    description: 'Map operations that might render objects',
    file: 'React components'
  },
  {
    pattern: /console\.(log|warn|error)\([^)]*[{][^}]*[}]/g,
    description: 'Console statements with objects',
    file: 'Any JS/TS file'
  },
  {
    pattern: /String\(/g,
    description: 'Explicit string conversion',
    file: 'Any JS/TS file'
  }
];

// 2. Files to check
const filesToCheck = [
  'src/components/layout/EnhancedSidebarV3.tsx',
  'src/components/operational/SubAppOverview.tsx',
  'src/hooks/useOrbisAPI.ts',
  'src/services/enhancedGovernanceLogger.ts',
  'src/contexts/AdminModeContext.tsx'
];

console.log('📁 Checking files for problematic patterns...\n');

filesToCheck.forEach(filePath => {
  const fullPath = path.join(__dirname, filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`❌ File not found: ${filePath}`);
    return;
  }
  
  const content = fs.readFileSync(fullPath, 'utf8');
  console.log(`\n📄 ${filePath}:`);
  
  problematicPatterns.forEach(({ pattern, description }) => {
    const matches = content.match(pattern);
    if (matches) {
      console.log(`  ⚠️  ${description}: ${matches.length} matches`);
      matches.slice(0, 3).forEach(match => {
        const lines = content.split('\n');
        const lineIndex = lines.findIndex(line => line.includes(match));
        console.log(`    Line ${lineIndex + 1}: ${match.trim()}`);
      });
    }
  });
});

console.log('\n\n🔧 Debugging Steps:\n');
console.log('1. Open browser DevTools Console');
console.log('2. Enable "Pause on exceptions" in Sources tab');
console.log('3. Run: npm run dev:full');
console.log('4. Navigate to the error page');
console.log('5. Check the call stack when it breaks');
console.log('6. Look for the exact object being converted to string');

console.log('\n🎯 Quick Fixes to Try:\n');
console.log('1. Add null checks: obj?.property');
console.log('2. Use JSON.stringify() for objects: JSON.stringify(obj)');
console.log('3. Check .map() returns: array.map(item => item?.name || "fallback")');
console.log('4. Verify JSX children are primitives, not objects');

console.log('\n📊 React Debugging Commands:\n');
console.log('// In browser console:');
console.log('React.version');
console.log('window.React');
console.log('// Check component state');
console.log('$r // Selected React component in DevTools');