#!/usr/bin/env node

/**
 * Wombat Track Sidebar Regression Watchdog
 * Detects if key UI components render correctly
 */

const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

class SidebarWatchdog {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '../../');
    this.srcPath = path.join(this.projectRoot, 'src');
    this.componentChecks = [];
    this.errors = [];
    this.warnings = [];
  }

  log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  logError(message) {
    this.errors.push(message);
    this.log(`❌ ${message}`, 'red');
  }

  logWarning(message) {
    this.warnings.push(message);
    this.log(`⚠️  ${message}`, 'yellow');
  }

  logSuccess(message) {
    this.log(`✅ ${message}`, 'green');
  }

  logInfo(message) {
    this.log(`ℹ️  ${message}`, 'blue');
  }

  async checkComponentExists(componentPath, componentName) {
    const fullPath = path.join(this.srcPath, componentPath);
    
    if (!fs.existsSync(fullPath)) {
      this.logError(`${componentName} not found at ${componentPath}`);
      return false;
    }
    
    this.logSuccess(`${componentName} exists`);
    return true;
  }

  async checkComponentContent(componentPath, componentName, requiredPatterns = []) {
    const fullPath = path.join(this.srcPath, componentPath);
    
    if (!fs.existsSync(fullPath)) {
      return false;
    }
    
    try {
      const content = fs.readFileSync(fullPath, 'utf8');
      
      let patternFailures = 0;
      for (const pattern of requiredPatterns) {
        if (!content.includes(pattern.text)) {
          this.logError(`${componentName}: Missing required pattern "${pattern.text}" (${pattern.description})`);
          patternFailures++;
        } else {
          this.logSuccess(`${componentName}: Found "${pattern.description}"`);
        }
      }
      
      return patternFailures === 0;
    } catch (error) {
      this.logError(`Failed to read ${componentName}: ${error.message}`);
      return false;
    }
  }

  async checkSidebar() {
    this.log('\n🔍 Checking Sidebar Components...', 'cyan');
    
    const sidebarComponents = [
      {
        path: 'components/layout/ProjectSidebar.tsx',
        name: 'ProjectSidebar',
        patterns: [
          { text: 'interface ProjectSidebarProps', description: 'TypeScript interface' },
          { text: 'ProjectSidebar', description: 'Component export' },
          { text: 'className', description: 'Styling prop' }
        ]
      },
      {
        path: 'components/ProjectSidebarSimple.tsx',
        name: 'ProjectSidebarSimple',
        patterns: [
          { text: 'ProjectSidebarSimple', description: 'Component export' },
          { text: 'useState', description: 'React hooks' }
        ]
      }
    ];
    
    for (const component of sidebarComponents) {
      await this.checkComponentExists(component.path, component.name);
      await this.checkComponentContent(component.path, component.name, component.patterns);
    }
  }

  async checkBreadcrumb() {
    this.log('\n🧩 Checking Breadcrumb Components...', 'cyan');
    
    const breadcrumbComponents = [
      {
        path: 'components/common/PhaseBreadcrumb.tsx',
        name: 'PhaseBreadcrumb',
        patterns: [
          { text: 'PhaseBreadcrumb', description: 'Component export' },
          { text: 'ChevronRight', description: 'Navigation icon' },
          { text: 'phase', description: 'Phase prop' }
        ]
      },
      {
        path: 'components/layout/BreadcrumbHeader.tsx',
        name: 'BreadcrumbHeader',
        patterns: [
          { text: 'BreadcrumbHeader', description: 'Component export' },
          { text: 'breadcrumb', description: 'Breadcrumb functionality' }
        ]
      }
    ];
    
    for (const component of breadcrumbComponents) {
      await this.checkComponentExists(component.path, component.name);
      await this.checkComponentContent(component.path, component.name, component.patterns);
    }
  }

  async checkDispatchers() {
    this.log('\n🤖 Checking AI Dispatcher System...', 'cyan');
    
    const dispatcherComponents = [
      {
        path: 'lib/aiDispatchers.ts',
        name: 'AI Dispatchers',
        patterns: [
          { text: 'dispatchToClaude', description: 'Claude dispatcher function' },
          { text: 'dispatchToGizmo', description: 'Gizmo dispatcher function' },
          { text: 'handleAIPrompt', description: 'Main prompt handler' },
          { text: 'testDispatchers', description: 'Diagnostic test function' }
        ]
      },
      {
        path: 'components/GizmoConsole.tsx',
        name: 'GizmoConsole',
        patterns: [
          { text: 'GizmoConsole', description: 'Console component' },
          { text: 'isLive', description: 'Live status tracking' },
          { text: 'responseTime', description: 'Performance tracking' },
          { text: 'handleAIPrompt', description: 'AI integration' }
        ]
      }
    ];
    
    for (const component of dispatcherComponents) {
      await this.checkComponentExists(component.path, component.name);
      await this.checkComponentContent(component.path, component.name, component.patterns);
    }
  }

  async checkGovernance() {
    this.log('\n📊 Checking Governance System...', 'cyan');
    
    const governanceComponents = [
      {
        path: 'utils/governanceLogger.ts',
        name: 'Governance Logger',
        patterns: [
          { text: 'logAIConsoleInteraction', description: 'AI interaction logging' },
          { text: 'isLive', description: 'Live status metadata' },
          { text: 'responseTime', description: 'Performance metadata' },
          { text: 'dispatchMode', description: 'Dispatch mode tracking' }
        ]
      },
      {
        path: 'components/GovernanceLogViewer.tsx',
        name: 'GovernanceLogViewer',
        patterns: [
          { text: 'GovernanceLogViewer', description: 'Log viewer component' },
          { text: 'AIConsoleInteraction', description: 'AI interaction events' },
          { text: 'filter', description: 'Filtering functionality' }
        ]
      }
    ];
    
    for (const component of governanceComponents) {
      await this.checkComponentExists(component.path, component.name);
      await this.checkComponentContent(component.path, component.name, component.patterns);
    }
  }

  async checkAgentMesh() {
    this.log('\n🕸️  Checking AgentMesh Components...', 'cyan');
    
    if (await this.checkComponentExists('components/mesh/AgentMesh.tsx', 'AgentMesh')) {
      await this.checkComponentContent('components/mesh/AgentMesh.tsx', 'AgentMesh', [
        { text: 'AgentMesh', description: 'Component export' },
        { text: 'CRUD', description: 'CRUD operations' },
        { text: 'localStorage', description: 'Persistence' },
        { text: 'modal', description: 'Modal dialogs' }
      ]);
    }
  }

  async checkPackageIntegrity() {
    this.log('\n📦 Checking Package Integrity...', 'cyan');
    
    const packagePath = path.join(this.projectRoot, 'package.json');
    if (!fs.existsSync(packagePath)) {
      this.logError('package.json not found');
      return;
    }
    
    try {
      const packageContent = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      
      // Check for required dependencies
      const requiredDeps = ['react', 'react-dom', 'lucide-react'];
      const requiredDevDeps = ['typescript', 'vite', '@vitejs/plugin-react'];
      
      for (const dep of requiredDeps) {
        if (!packageContent.dependencies || !packageContent.dependencies[dep]) {
          this.logError(`Missing required dependency: ${dep}`);
        } else {
          this.logSuccess(`Found dependency: ${dep}`);
        }
      }
      
      for (const devDep of requiredDevDeps) {
        if (!packageContent.devDependencies || !packageContent.devDependencies[devDep]) {
          this.logError(`Missing required dev dependency: ${devDep}`);
        } else {
          this.logSuccess(`Found dev dependency: ${devDep}`);
        }
      }
      
      // Check for required scripts
      const requiredScripts = ['dev', 'build', 'lint', 'test'];
      for (const script of requiredScripts) {
        if (!packageContent.scripts || !packageContent.scripts[script]) {
          this.logError(`Missing required script: ${script}`);
        } else {
          this.logSuccess(`Found script: ${script}`);
        }
      }
    } catch (error) {
      this.logError(`Failed to parse package.json: ${error.message}`);
    }
  }

  async generateReport() {
    this.log('\n📋 Generating Watchdog Report...', 'magenta');
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        errors: this.errors.length,
        warnings: this.warnings.length,
        status: this.errors.length === 0 ? 'PASS' : 'FAIL'
      },
      details: {
        errors: this.errors,
        warnings: this.warnings
      }
    };
    
    // Write report to file
    const reportPath = path.join(this.projectRoot, 'watchdog-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    this.log(`\n📊 Watchdog Summary`, 'magenta');
    this.log(`================`, 'magenta');
    this.log(`Status: ${report.summary.status}`, report.summary.status === 'PASS' ? 'green' : 'red');
    this.log(`Errors: ${report.summary.errors}`, report.summary.errors > 0 ? 'red' : 'green');
    this.log(`Warnings: ${report.summary.warnings}`, report.summary.warnings > 0 ? 'yellow' : 'green');
    this.log(`Report saved: watchdog-report.json`, 'blue');
    
    if (report.summary.status === 'FAIL') {
      this.log(`\n❌ Watchdog detected regressions!`, 'red');
      process.exit(1);
    } else {
      this.log(`\n✅ All components healthy!`, 'green');
      process.exit(0);
    }
  }

  async run() {
    this.log('🛡️  Wombat Track Sidebar Watchdog', 'cyan');
    this.log('================================', 'cyan');
    
    await this.checkSidebar();
    await this.checkBreadcrumb();
    await this.checkDispatchers();
    await this.checkGovernance();
    await this.checkAgentMesh();
    await this.checkPackageIntegrity();
    
    await this.generateReport();
  }
}

// Run the watchdog if called directly
if (require.main === module) {
  const watchdog = new SidebarWatchdog();
  watchdog.run().catch(error => {
    console.error('Watchdog failed:', error.message);
    process.exit(1);
  });
}

module.exports = SidebarWatchdog;