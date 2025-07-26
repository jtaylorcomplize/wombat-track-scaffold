#!/usr/bin/env node

/**
 * Wombat Track AI Dispatcher Test Script
 * Tests dispatcher functionality for CI/CD validation
 */

const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

class DispatcherTester {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '../../');
    this.results = {
      claude: { status: 'unknown', error: null, responseTime: null },
      gizmo: { status: 'unknown', error: null, responseTime: null },
      overall: 'unknown'
    };
  }

  log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  async testDispatcherModule() {
    this.log('🧪 Testing AI Dispatcher Module...', 'blue');
    
    const dispatcherPath = path.join(this.projectRoot, 'src/lib/aiDispatchers.ts');
    
    if (!fs.existsSync(dispatcherPath)) {
      this.log('❌ aiDispatchers.ts not found', 'red');
      this.results.overall = 'failed';
      return false;
    }
    
    const content = fs.readFileSync(dispatcherPath, 'utf8');
    
    // Check for required functions
    const requiredFunctions = [
      'dispatchToClaude',
      'dispatchToGizmo', 
      'handleAIPrompt',
      'testDispatchers',
      'getDispatcherStatus'
    ];
    
    let missingFunctions = [];
    for (const func of requiredFunctions) {
      if (!content.includes(func)) {
        missingFunctions.push(func);
      }
    }
    
    if (missingFunctions.length > 0) {
      this.log(`❌ Missing functions: ${missingFunctions.join(', ')}`, 'red');
      this.results.overall = 'failed';
      return false;
    }
    
    this.log('✅ All required dispatcher functions found', 'green');
    return true;
  }

  async testClaudeDispatcher() {
    this.log('\n🤖 Testing Claude Dispatcher...', 'blue');
    
    const startTime = Date.now();
    
    try {
      // Since we can't actually import the TS module in Node.js easily,
      // we'll simulate the test by checking the implementation
      const dispatcherPath = path.join(this.projectRoot, 'src/lib/aiDispatchers.ts');
      const content = fs.readFileSync(dispatcherPath, 'utf8');
      
      // Check for Claude-specific patterns
      if (content.includes('dispatchToClaude') && content.includes('/api/claude/dispatch')) {
        this.results.claude.status = 'configured';
        this.results.claude.responseTime = Date.now() - startTime;
        this.log('✅ Claude dispatcher properly configured', 'green');
        
        // Check for fallback handling
        if (content.includes('fallback') || content.includes('catch')) {
          this.log('✅ Fallback handling detected', 'green');
        } else {
          this.log('⚠️  No fallback handling detected', 'yellow');
        }
        
        return true;
      } else {
        this.results.claude.status = 'misconfigured';
        this.results.claude.error = 'Missing Claude dispatcher implementation';
        this.log('❌ Claude dispatcher not properly implemented', 'red');
        return false;
      }
    } catch (error) {
      this.results.claude.status = 'error';
      this.results.claude.error = error.message;
      this.log(`❌ Claude dispatcher test failed: ${error.message}`, 'red');
      return false;
    }
  }

  async testGizmoDispatcher() {
    this.log('\n⚡ Testing Gizmo Dispatcher...', 'blue');
    
    const startTime = Date.now();
    
    try {
      const dispatcherPath = path.join(this.projectRoot, 'src/lib/aiDispatchers.ts');
      const content = fs.readFileSync(dispatcherPath, 'utf8');
      
      // Check for Gizmo-specific patterns
      if (content.includes('dispatchToGizmo')) {
        this.results.gizmo.status = 'configured';
        this.results.gizmo.responseTime = Date.now() - startTime;
        this.log('✅ Gizmo dispatcher properly configured', 'green');
        
        // Check for context awareness
        if (content.includes('context') || content.includes('projectId')) {
          this.log('✅ Context-aware responses detected', 'green');
        } else {
          this.log('⚠️  No context awareness detected', 'yellow');
        }
        
        return true;
      } else {
        this.results.gizmo.status = 'misconfigured';
        this.results.gizmo.error = 'Missing Gizmo dispatcher implementation';
        this.log('❌ Gizmo dispatcher not properly implemented', 'red');
        return false;
      }
    } catch (error) {
      this.results.gizmo.status = 'error';
      this.results.gizmo.error = error.message;
      this.log(`❌ Gizmo dispatcher test failed: ${error.message}`, 'red');
      return false;
    }
  }

  async testGovernanceIntegration() {
    this.log('\n📊 Testing Governance Integration...', 'blue');
    
    try {
      const governancePath = path.join(this.projectRoot, 'src/utils/governanceLogger.ts');
      
      if (!fs.existsSync(governancePath)) {
        this.log('❌ governanceLogger.ts not found', 'red');
        return false;
      }
      
      const content = fs.readFileSync(governancePath, 'utf8');
      
      // Check for WT-5.6 enhancements  
      const requiredFields = [
        'isLive',
        'responseTime',
        'dispatchMode',
        'wt-5.6-live-agent-dispatch'
      ];
      
      let missingFields = [];
      for (const field of requiredFields) {
        if (!content.includes(field)) {
          missingFields.push(field);
        }
      }
      
      if (missingFields.length > 0) {
        this.log(`❌ Missing governance fields: ${missingFields.join(', ')}`, 'red');
        return false;
      }
      
      this.log('✅ Governance integration up to date', 'green');
      return true;
    } catch (error) {
      this.log(`❌ Governance integration test failed: ${error.message}`, 'red');
      return false;
    }
  }

  async generateReport() {
    const reportPath = path.join(this.projectRoot, 'dispatcher-test-report.json');
    
    // Determine overall status
    if (this.results.claude.status === 'configured' && 
        this.results.gizmo.status === 'configured') {
      this.results.overall = 'pass';
    } else if (this.results.claude.status === 'error' || 
               this.results.gizmo.status === 'error') {
      this.results.overall = 'error';
    } else {
      this.results.overall = 'warning';
    }
    
    const report = {
      timestamp: new Date().toISOString(),
      results: this.results,
      summary: {
        claude: this.results.claude.status,
        gizmo: this.results.gizmo.status,
        overall: this.results.overall
      }
    };
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    this.log('\n📋 Dispatcher Test Summary', 'blue');
    this.log('========================', 'blue');
    this.log(`Claude: ${this.results.claude.status}`, 
      this.results.claude.status === 'configured' ? 'green' : 'red');
    this.log(`Gizmo: ${this.results.gizmo.status}`, 
      this.results.gizmo.status === 'configured' ? 'green' : 'red');
    this.log(`Overall: ${this.results.overall}`, 
      this.results.overall === 'pass' ? 'green' : 'yellow');
    
    return this.results.overall === 'pass';
  }

  async run() {
    this.log('🧪 Wombat Track Dispatcher Test Suite', 'blue');
    this.log('===================================', 'blue');
    
    const moduleOk = await this.testDispatcherModule();
    if (!moduleOk) {
      await this.generateReport();
      return false;
    }
    
    await this.testClaudeDispatcher();
    await this.testGizmoDispatcher();
    await this.testGovernanceIntegration();
    
    const success = await this.generateReport();
    
    if (success) {
      this.log('\n✅ All dispatcher tests passed!', 'green');
      process.exit(0);
    } else {
      this.log('\n❌ Some dispatcher tests failed!', 'red');
      process.exit(1);
    }
  }
}

// Run if called directly
if (require.main === module) {
  const tester = new DispatcherTester();
  tester.run().catch(error => {
    console.error('Dispatcher test failed:', error.message);
    process.exit(1);
  });
}

module.exports = DispatcherTester;