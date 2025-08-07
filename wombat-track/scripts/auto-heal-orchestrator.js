#!/usr/bin/env node
/**
 * Auto-Heal Orchestrator - Phase 9.0.5
 * Automatically recovers OES and governance if tests fail
 * No user confirmation required
 */

import fs from 'fs/promises';
import { spawn, exec } from 'child_process';
import path from 'path';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const execAsync = promisify(exec);

class AutoHealOrchestrator {
  constructor(options = {}) {
    this.options = {
      auto: false,
      noPrompt: false,
      inputFile: '',
      logFile: '',
      dryRun: false,
      ...options
    };
    
    this.healingActions = [];
    this.projectRoot = path.resolve(__dirname, '..');
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}]`;
    
    if (!this.options.auto) {
      const colors = {
        info: '\\x1b[34m',
        success: '\\x1b[32m',
        error: '\\x1b[31m',
        warning: '\\x1b[33m',
        reset: '\\x1b[0m'
      };
      
      const symbols = {
        info: 'ℹ️',
        success: '✅',
        error: '❌',
        warning: '⚠️'
      };
      
      console.log(`${colors[level]}${symbols[level]} ${message}${colors.reset}`);
    } else {
      const logMessage = `${prefix} ${level.toUpperCase()}: ${message}`;
      if (level === 'error') {
        console.error(logMessage);
      } else {
        console.log(logMessage);
      }
    }
    
    if (this.options.logFile) {
      this.writeLogEntry(level, message).catch(() => {}); // Non-blocking
    }
  }

  async writeLogEntry(level, message) {
    try {
      const timestamp = new Date().toISOString();
      const logEntry = {
        timestamp,
        level: level.toUpperCase(),
        message,
        action: 'auto_heal'
      };
      
      await fs.mkdir(path.dirname(this.options.logFile), { recursive: true });
      const existingLog = await this.readLogFile();
      existingLog.entries.push(logEntry);
      
      await fs.writeFile(this.options.logFile, JSON.stringify(existingLog, null, 2));
    } catch (error) {
      // Silent fail - don't interrupt healing process
    }
  }

  async readLogFile() {
    try {
      const content = await fs.readFile(this.options.logFile, 'utf-8');
      return JSON.parse(content);
    } catch {
      return {
        healingSession: new Date().toISOString(),
        phase: 'OF-9.0.5',
        status: 'in_progress',
        entries: []
      };
    }
  }

  /**
   * Check server status and restart if needed
   */
  async healServerStatus() {
    this.log('Checking server status...');
    
    try {
      // Check if server is running on port 3001
      const { stdout } = await execAsync('netstat -tulpn | grep :3001');
      
      if (!stdout.includes('LISTEN')) {
        this.log('Server not running on port 3001, attempting restart...', 'warning');
        return await this.restartServer();
      } else {
        // Test health endpoint
        try {
          const response = await fetch('http://localhost:3001/health');
          if (!response.ok) {
            throw new Error(`Health check failed: ${response.status}`);
          }
          
          this.log('Server is healthy on port 3001', 'success');
          this.healingActions.push({
            action: 'server_status_check',
            status: 'healthy',
            timestamp: new Date().toISOString()
          });
          return true;
        } catch (healthError) {
          this.log(`Health check failed: ${healthError.message}`, 'warning');
          return await this.restartServer();
        }
      }
    } catch (error) {
      this.log(`Server check failed: ${error.message}`, 'error');
      return await this.restartServer();
    }
  }

  async restartServer() {
    this.log('Restarting server...', 'warning');
    
    if (this.options.dryRun) {
      this.log('[DRY RUN] Would restart server with: npm run server', 'info');
      return true;
    }
    
    try {
      // Kill existing server processes
      try {
        await execAsync('pkill -f "node server.js"');
        this.log('Stopped existing server processes');
      } catch {
        // No existing processes to kill
      }
      
      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Start server in background
      const serverProcess = spawn('npm', ['run', 'server'], {
        detached: true,
        stdio: 'ignore',
        cwd: this.projectRoot
      });
      
      serverProcess.unref();
      
      // Wait and verify
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const { stdout } = await execAsync('netstat -tulpn | grep :3001');
      if (stdout.includes('LISTEN')) {
        this.log('Server restarted successfully', 'success');
        this.healingActions.push({
          action: 'server_restart',
          status: 'success',
          pid: serverProcess.pid,
          timestamp: new Date().toISOString()
        });
        return true;
      } else {
        throw new Error('Server failed to start after restart attempt');
      }
    } catch (error) {
      this.log(`Server restart failed: ${error.message}`, 'error');
      this.healingActions.push({
        action: 'server_restart',
        status: 'failed',
        error: error.message,
        timestamp: new Date().toISOString()
      });
      return false;
    }
  }

  /**
   * Heal governance logging issues
   */
  async healGovernanceLogging() {
    this.log('Checking governance logging system...');
    
    const issues = [];
    const fixes = [];
    
    try {
      // Check logs directory
      const logsDir = path.join(this.projectRoot, 'logs');
      try {
        await fs.access(logsDir);
      } catch {
        this.log('Creating logs directory...', 'warning');
        if (!this.options.dryRun) {
          await fs.mkdir(logsDir, { recursive: true });
          fixes.push('created_logs_directory');
        }
      }
      
      // Check governance subdirectory
      const governanceDir = path.join(logsDir, 'governance');
      try {
        await fs.access(governanceDir);
      } catch {
        this.log('Creating governance logs directory...', 'warning');
        if (!this.options.dryRun) {
          await fs.mkdir(governanceDir, { recursive: true });
          fixes.push('created_governance_directory');
        }
      }
      
      // Check main governance log
      const mainGovernanceLog = path.join(logsDir, 'governance.jsonl');
      try {
        await fs.access(mainGovernanceLog);
      } catch {
        this.log('Creating main governance log...', 'warning');
        if (!this.options.dryRun) {
          const initialEntry = {
            timestamp: new Date().toISOString(),
            event_type: 'auto_heal_init',
            user_id: 'auto_heal',
            resource_id: 'governance_system',
            details: 'Governance log file created by auto-healing'
          };
          await fs.writeFile(mainGovernanceLog, JSON.stringify(initialEntry) + '\\n');
          fixes.push('created_main_governance_log');
        }
      }
      
      // Check DriveMemory governance
      const driveMemoryGov = path.join(this.projectRoot, 'DriveMemory', 'OF-9.0');
      try {
        await fs.access(driveMemoryGov);
      } catch {
        this.log('Creating DriveMemory governance directory...', 'warning');
        if (!this.options.dryRun) {
          await fs.mkdir(driveMemoryGov, { recursive: true });
          fixes.push('created_drive_memory_governance');
        }
      }
      
      if (fixes.length > 0) {
        this.log(`Applied ${fixes.length} governance fixes: ${fixes.join(', ')}`, 'success');
        this.healingActions.push({
          action: 'governance_healing',
          status: 'success',
          fixes,
          timestamp: new Date().toISOString()
        });
        return true;
      } else {
        this.log('Governance logging system is healthy', 'success');
        this.healingActions.push({
          action: 'governance_check',
          status: 'healthy',
          timestamp: new Date().toISOString()
        });
        return true;
      }
    } catch (error) {
      this.log(`Governance healing failed: ${error.message}`, 'error');
      this.healingActions.push({
        action: 'governance_healing',
        status: 'failed',
        error: error.message,
        timestamp: new Date().toISOString()
      });
      return false;
    }
  }

  /**
   * Heal memory anchor issues
   */
  async healMemoryAnchors() {
    this.log('Checking memory anchor system...');
    
    try {
      const memoryPluginDir = path.join(this.projectRoot, 'DriveMemory', 'MemoryPlugin');
      const anchorFile = path.join(memoryPluginDir, 'of-9.0-init-20250806.json');
      
      // Check directory exists
      try {
        await fs.access(memoryPluginDir);
      } catch {
        this.log('Creating MemoryPlugin directory...', 'warning');
        if (!this.options.dryRun) {
          await fs.mkdir(memoryPluginDir, { recursive: true });
        }
      }
      
      // Check anchor file exists
      try {
        await fs.access(anchorFile);
        
        // Validate anchor content
        const anchorContent = await fs.readFile(anchorFile, 'utf-8');
        const anchor = JSON.parse(anchorContent);
        
        if (!anchor.anchor_id || !anchor.phase_id) {
          throw new Error('Anchor file missing required fields');
        }
        
        this.log('Memory anchor is healthy', 'success');
        this.healingActions.push({
          action: 'memory_anchor_check',
          status: 'healthy',
          anchor_id: anchor.anchor_id,
          timestamp: new Date().toISOString()
        });
        return true;
        
      } catch {
        this.log('Creating/repairing memory anchor...', 'warning');
        
        if (!this.options.dryRun) {
          const repairAnchor = {
            anchor_id: 'of-9.0-init-20250806',
            phase_id: 'OF-9.0',
            project_id: 'OF-SDLC-IMP3',
            description: 'Phase 9.0 memory anchor (auto-healed)',
            status: 'auto_healed',
            timestamp: new Date().toISOString(),
            healing_note: 'Recreated by auto-healing system'
          };
          
          await fs.writeFile(anchorFile, JSON.stringify(repairAnchor, null, 2));
          this.log('Memory anchor repaired', 'success');
          this.healingActions.push({
            action: 'memory_anchor_repair',
            status: 'success',
            timestamp: new Date().toISOString()
          });
        }
        return true;
      }
    } catch (error) {
      this.log(`Memory anchor healing failed: ${error.message}`, 'error');
      this.healingActions.push({
        action: 'memory_anchor_healing',
        status: 'failed',
        error: error.message,
        timestamp: new Date().toISOString()
      });
      return false;
    }
  }

  /**
   * Run OES tests to verify healing
   */
  async runVerificationTests() {
    this.log('Running verification tests...');
    
    try {
      const testCommand = this.options.dryRun ? 
        'echo "[DRY RUN] Would run OES tests"' :
        `./scripts/oes-testing-protocol.sh --host http://localhost:3001 --auto --no-prompt --json-report ${path.join(this.projectRoot, 'DriveMemory/OF-9.0/auto_heal_verification.json')}`;
      
      const { stdout, stderr } = await execAsync(testCommand, {
        cwd: this.projectRoot,
        timeout: 60000 // 1 minute timeout
      });
      
      if (stderr && !this.options.dryRun) {
        this.log(`Test warnings: ${stderr}`, 'warning');
      }
      
      this.log('Verification tests completed', 'success');
      this.healingActions.push({
        action: 'verification_tests',
        status: 'completed',
        timestamp: new Date().toISOString()
      });
      
      return true;
    } catch (error) {
      this.log(`Verification tests failed: ${error.message}`, 'error');
      this.healingActions.push({
        action: 'verification_tests',
        status: 'failed',
        error: error.message,
        timestamp: new Date().toISOString()
      });
      return false;
    }
  }

  /**
   * Generate healing summary
   */
  async generateSummary() {
    const summary = {
      healingSession: new Date().toISOString(),
      phase: 'OF-9.0.5',
      status: 'completed',
      inputFile: this.options.inputFile,
      executionMode: this.options.auto ? 'automated' : 'manual',
      actions: this.healingActions,
      results: {
        totalActions: this.healingActions.length,
        successful: this.healingActions.filter(a => a.status === 'success' || a.status === 'healthy' || a.status === 'completed').length,
        failed: this.healingActions.filter(a => a.status === 'failed').length
      },
      recommendations: []
    };
    
    const failedActions = summary.results.failed;
    const successfulActions = summary.results.successful;
    
    if (failedActions === 0) {
      summary.status = 'success';
      summary.recommendations.push('Continue with nightly QA automation');
    } else if (failedActions < successfulActions) {
      summary.status = 'partial_success';
      summary.recommendations.push('Review failed healing actions');
      summary.recommendations.push('Manual intervention may be required');
    } else {
      summary.status = 'failed';
      summary.recommendations.push('Critical healing failure - manual review required');
    }
    
    return summary;
  }

  /**
   * Main healing workflow
   */
  async runHealing() {
    this.log('Starting auto-healing workflow - Phase 9.0.5');
    
    if (this.options.inputFile) {
      this.log(`Using input file: ${this.options.inputFile}`);
      // Could read previous test results to inform healing decisions
    }
    
    // Step 1: Heal server status
    const serverHealed = await this.healServerStatus();
    
    // Step 2: Heal governance logging
    const governanceHealed = await this.healGovernanceLogging();
    
    // Step 3: Heal memory anchors
    const memoryHealed = await this.healMemoryAnchors();
    
    // Step 4: Run verification tests
    const testsPassed = await this.runVerificationTests();
    
    // Generate summary
    const summary = await this.generateSummary();
    
    // Save summary to log file
    if (this.options.logFile) {
      try {
        const finalLog = await this.readLogFile();
        finalLog.summary = summary;
        finalLog.status = summary.status;
        await fs.writeFile(this.options.logFile, JSON.stringify(finalLog, null, 2));
        this.log(`Healing summary saved to: ${this.options.logFile}`);
      } catch (error) {
        this.log(`Failed to save healing summary: ${error.message}`, 'error');
      }
    }
    
    // Final status
    if (summary.status === 'success') {
      this.log('🎉 Auto-healing completed successfully', 'success');
      return 0;
    } else if (summary.status === 'partial_success') {
      this.log('⚠️ Auto-healing partially successful', 'warning');
      return 1;
    } else {
      this.log('❌ Auto-healing failed', 'error');
      return 2;
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const options = {};
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--auto':
        options.auto = true;
        break;
      case '--no-prompt':
        options.noPrompt = true;
        break;
      case '--input':
        options.inputFile = args[++i];
        break;
      case '--log':
        options.logFile = args[++i];
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--help':
        console.log(`
Usage: node scripts/auto-heal-orchestrator.js [OPTIONS]

Options:
  --auto              Run in automated mode (no colors, structured logging)
  --no-prompt         No user confirmation required
  --input FILE        Input file with previous test results
  --log FILE          Output healing log to JSON file
  --dry-run           Show what would be done without making changes
  --help              Show this help message
        `);
        process.exit(0);
      default:
        console.error(`Unknown option: ${args[i]}`);
        process.exit(1);
    }
  }
  
  const healer = new AutoHealOrchestrator(options);
  
  try {
    const exitCode = await healer.runHealing();
    process.exit(exitCode);
  } catch (error) {
    console.error(`Auto-healing failed: ${error.message}`);
    process.exit(1);
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { AutoHealOrchestrator };