const { runAIVerification } = require('../tests/admin-ui-qa/ai-screenshot-verifier');

// Run AI verification on generated screenshots
runAIVerification()
  .then(({ analyses, report }) => {
    console.log('\n🎉 AI Verification Complete!');
    console.log(`📊 Analyzed ${analyses.length} screenshots`);
    console.log(`📈 Pass Rate: ${report.passRate}`);
    console.log(`⚠️ Issues: ${report.summary.totalIssues} (${report.summary.highSeverityIssues} high)`);
    
    if (report.summary.highSeverityIssues > 0) {
      console.log('\n🚨 HIGH SEVERITY ISSUES DETECTED:');
      report.detectedIssues
        .filter(issue => issue.severity === 'high')
        .forEach(issue => {
          console.log(`   - ${issue.type}: ${issue.message}`);
        });
    }
    
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ AI Verification Failed:', error.message);
    process.exit(1);
  });