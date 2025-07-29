#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read the lint report
const reportPath = path.join(__dirname, '..', 'lint-report.json');
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

// Categorize errors
const categories = {
  'Type Issues': {
    rules: ['@typescript-eslint/no-explicit-any', '@typescript-eslint/no-unused-vars'],
    count: 0,
    files: new Set()
  },
  'React Issues': {
    rules: ['react/prop-types', 'react-hooks/exhaustive-deps', 'react/no-unescaped-entities'],
    count: 0,
    files: new Set()
  },
  'ESLint Rules': {
    rules: ['no-case-declarations', 'no-unused-vars', 'prefer-const'],
    count: 0,
    files: new Set()
  },
  'Async/Await Issues': {
    rules: ['@typescript-eslint/await-thenable', '@typescript-eslint/no-floating-promises'],
    count: 0,
    files: new Set()
  },
  'Other': {
    rules: [],
    count: 0,
    files: new Set()
  }
};

let totalErrors = 0;
const ruleStats = {};

// Process each file's results
report.forEach(fileResult => {
  if (fileResult.messages && fileResult.messages.length > 0) {
    fileResult.messages.forEach(message => {
      totalErrors++;
      const ruleId = message.ruleId || 'unknown';
      
      // Track rule statistics
      if (!ruleStats[ruleId]) {
        ruleStats[ruleId] = 0;
      }
      ruleStats[ruleId]++;
      
      // Categorize the error
      let categorized = false;
      for (const [categoryName, category] of Object.entries(categories)) {
        if (category.rules.includes(ruleId)) {
          category.count++;
          category.files.add(fileResult.filePath);
          categorized = true;
          break;
        }
      }
      
      if (!categorized) {
        categories['Other'].count++;
        categories['Other'].files.add(fileResult.filePath);
        categories['Other'].rules.push(ruleId);
      }
    });
  }
});

// Generate summary report
console.log('🧹 WT-7.4 Lint Compliance Analysis Report');
console.log('=' .repeat(50));
console.log(`\n📊 Total Errors: ${totalErrors}`);
console.log(`📁 Files with Issues: ${report.filter(f => f.messages.length > 0).length}`);

console.log('\n📋 Error Categories:');
console.log('| Category | Count | Files | Percentage |');
console.log('|----------|-------|-------|------------|');

Object.entries(categories).forEach(([name, data]) => {
  const percentage = ((data.count / totalErrors) * 100).toFixed(1);
  console.log(`| ${name.padEnd(12)} | ${data.count.toString().padEnd(5)} | ${data.files.size.toString().padEnd(5)} | ${percentage.padEnd(9)}% |`);
});

console.log('\n🔝 Top 10 Rule Violations:');
const sortedRules = Object.entries(ruleStats)
  .sort(([,a], [,b]) => b - a)
  .slice(0, 10);

sortedRules.forEach(([rule, count], index) => {
  console.log(`${(index + 1).toString().padStart(2)}. ${rule.padEnd(40)} ${count} errors`);
});

console.log('\n📁 Most Problematic Files:');
const fileStats = {};
report.forEach(fileResult => {
  if (fileResult.messages.length > 0) {
    const relativePath = fileResult.filePath.replace(process.cwd(), '').replace('/wombat-track/', '');
    fileStats[relativePath] = fileResult.messages.length;
  }
});

const sortedFiles = Object.entries(fileStats)
  .sort(([,a], [,b]) => b - a)
  .slice(0, 10);

sortedFiles.forEach(([file, count], index) => {
  console.log(`${(index + 1).toString().padStart(2)}. ${file.padEnd(50)} ${count} errors`);
});

console.log('\n🚧 Recommended Fix Strategy:');
console.log('1. Pass 1 - Type Fixes: @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars');
console.log('2. Pass 2 - React Cleanup: React-specific warnings and hooks');
console.log('3. Pass 3 - ESLint Rules: General JS/TS best practices');
console.log('4. Pass 4 - Async Fixes: Promise and async/await issues');

// Generate detailed breakdown file
const detailReport = {
  summary: {
    totalErrors,
    filesWithIssues: report.filter(f => f.messages.length > 0).length,
    categories: Object.fromEntries(
      Object.entries(categories).map(([name, data]) => [
        name, 
        { count: data.count, files: data.files.size, rules: data.rules }
      ])
    )
  },
  ruleStats,
  fileStats,
  recommendations: [
    'Focus on @typescript-eslint/no-explicit-any first (likely highest count)',
    'Remove unused variables and imports systematically',
    'Fix case declarations by adding braces',
    'Review React component prop usage',
    'Ensure proper async/await patterns'
  ]
};

fs.writeFileSync(
  path.join(__dirname, '..', 'lint-analysis-report.json'),
  JSON.stringify(detailReport, null, 2)
);

console.log('\n✅ Detailed report saved to lint-analysis-report.json');