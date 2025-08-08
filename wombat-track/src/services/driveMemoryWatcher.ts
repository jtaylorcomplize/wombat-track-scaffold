/**
 * DriveMemory Governance Logs Watcher (OF-9.3.1)
 * Monitors /DriveMemory/GovernanceLogs/*.jsonl files and syncs to database
 */

import fs from 'fs';
import path from 'path';
import chokidar from 'chokidar';
import { governanceLogsService } from './governanceLogsService';
import { GovernanceProjectHooks } from './governanceProjectHooks';

export interface DriveMemoryWatcherConfig {
  watchPath: string;
  filePattern: string;
  pollInterval?: number;
  enableProjectHooks?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

export interface JsonlGovernanceEntry {
  timestamp?: string;
  entryType?: string;
  summary?: string;
  gptDraftEntry?: string;
  classification?: string;
  related_phase?: string;
  related_step?: string;
  linked_anchor?: string;
  created_by?: string;
  projectId?: string;
  project_id?: string;
  [key: string]: any;
}

export class DriveMemoryWatcher {
  private watcher: chokidar.FSWatcher | null = null;
  private projectHooks: GovernanceProjectHooks;
  private config: Required<DriveMemoryWatcherConfig>;
  private processedFiles = new Set<string>();
  private isRunning = false;

  constructor(config: DriveMemoryWatcherConfig) {
    this.config = {
      pollInterval: 5000,
      enableProjectHooks: true,
      logLevel: 'info',
      ...config
    };
    
    this.projectHooks = GovernanceProjectHooks.getInstance();
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      this.log('warn', 'DriveMemory watcher is already running');
      return;
    }

    const watchPath = path.resolve(this.config.watchPath);
    const pattern = path.join(watchPath, this.config.filePattern);

    this.log('info', `Starting DriveMemory watcher on: ${pattern}`);

    // Ensure directory exists
    if (!fs.existsSync(watchPath)) {
      this.log('warn', `Watch directory does not exist, creating: ${watchPath}`);
      fs.mkdirSync(watchPath, { recursive: true });
    }

    // Process existing files first
    await this.processExistingFiles(watchPath);

    // Set up file watcher
    this.watcher = chokidar.watch(pattern, {
      ignored: /(^|[\/\\])\../, // ignore dotfiles
      persistent: true,
      ignoreInitial: false, // Process initial files too
      usePolling: true,
      interval: this.config.pollInterval,
      awaitWriteFinish: {
        stabilityThreshold: 1000,
        pollInterval: 100
      }
    });

    this.watcher
      .on('add', (filePath) => this.handleFileChange('add', filePath))
      .on('change', (filePath) => this.handleFileChange('change', filePath))
      .on('unlink', (filePath) => this.handleFileChange('unlink', filePath))
      .on('error', (error) => this.log('error', `Watcher error: ${error}`))
      .on('ready', () => {
        this.log('info', 'DriveMemory watcher ready and monitoring for changes');
        this.isRunning = true;
      });
  }

  async stop(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
    }
    this.isRunning = false;
    this.log('info', 'DriveMemory watcher stopped');
  }

  private async processExistingFiles(watchPath: string): Promise<void> {
    try {
      const files = fs.readdirSync(watchPath).filter(f => f.endsWith('.jsonl'));
      this.log('info', `Processing ${files.length} existing JSONL files`);

      for (const file of files) {
        const filePath = path.join(watchPath, file);
        await this.processFile(filePath, 'existing');
      }
    } catch (error) {
      this.log('error', `Error processing existing files: ${error}`);
    }
  }

  private async handleFileChange(event: 'add' | 'change' | 'unlink', filePath: string): Promise<void> {
    this.log('info', `File ${event}: ${filePath}`);

    try {
      switch (event) {
        case 'add':
        case 'change':
          await this.processFile(filePath, event);
          break;
        case 'unlink':
          await this.handleFileDelete(filePath);
          break;
      }
    } catch (error) {
      this.log('error', `Error handling file ${event} for ${filePath}: ${error}`);
    }
  }

  private async processFile(filePath: string, event: 'add' | 'change' | 'existing'): Promise<void> {
    const fileKey = `${filePath}-${fs.statSync(filePath).mtime.getTime()}`;
    
    if (this.processedFiles.has(fileKey)) {
      this.log('debug', `File already processed: ${filePath}`);
      return;
    }

    this.log('info', `Processing ${event} file: ${path.basename(filePath)}`);

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n').filter(line => line.trim());
      
      let processedEntries = 0;
      let createdProjects = 0;

      for (const line of lines) {
        try {
          const entry = JSON.parse(line) as JsonlGovernanceEntry;
          const result = await this.processGovernanceEntry(entry, filePath);
          
          if (result.processed) {
            processedEntries++;
          }
          if (result.projectCreated) {
            createdProjects++;
          }
        } catch (parseError) {
          this.log('warn', `Invalid JSON line in ${filePath}: ${parseError}`);
        }
      }

      this.processedFiles.add(fileKey);
      this.log('info', `Processed ${processedEntries} entries from ${path.basename(filePath)}${createdProjects > 0 ? `, created ${createdProjects} projects` : ''}`);

    } catch (error) {
      this.log('error', `Error processing file ${filePath}: ${error}`);
    }
  }

  private async processGovernanceEntry(
    entry: JsonlGovernanceEntry, 
    sourceFile: string
  ): Promise<{ processed: boolean; projectCreated: boolean }> {
    
    try {
      // Convert JSONL entry to governance log format
      const governanceLogData = {
        entryType: this.mapEntryType(entry.entryType),
        summary: entry.summary || `DriveMemory entry from ${path.basename(sourceFile)}`,
        gptDraftEntry: entry.gptDraftEntry || JSON.stringify(entry, null, 2),
        classification: entry.classification || 'drive_memory_import',
        related_phase: entry.related_phase,
        related_step: entry.related_step,
        linked_anchor: entry.linked_anchor,
        created_by: entry.created_by || 'drive_memory_watcher'
      };

      // Create governance log in database
      const createdLog = await governanceLogsService.createGovernanceLog(governanceLogData);
      this.log('debug', `Created governance log: ${createdLog.id}`);

      // Check if project should be auto-created
      let projectCreated = false;
      if (this.config.enableProjectHooks) {
        try {
          // Enhance entry with explicit project IDs if found
          const enhancedEntry = {
            ...entry,
            projectId: entry.projectId || entry.project_id,
            summary: entry.summary,
            actor: entry.created_by || 'drive_memory'
          };

          const created = await this.projectHooks.processGovernanceEntry(enhancedEntry);
          if (created) {
            projectCreated = true;
            this.log('info', `Auto-created project from DriveMemory entry: ${entry.projectId || entry.project_id}`);
          }
        } catch (hookError) {
          this.log('warn', `Project hook failed for entry: ${hookError}`);
        }
      }

      return { processed: true, projectCreated };

    } catch (error) {
      this.log('error', `Error processing governance entry: ${error}`);
      return { processed: false, projectCreated: false };
    }
  }

  private async handleFileDelete(filePath: string): Promise<void> {
    this.log('info', `File deleted: ${path.basename(filePath)}`);
    // Note: We don't remove governance logs when files are deleted
    // as they may contain historical information
  }

  private mapEntryType(entryType?: string): 'Decision' | 'Change' | 'Review' | 'Architecture' | 'Process' | 'Risk' | 'Compliance' | 'Quality' | 'Security' | 'Performance' {
    const typeMap: { [key: string]: any } = {
      'decision': 'Decision',
      'change': 'Change',
      'review': 'Review',
      'architecture': 'Architecture',
      'process': 'Process',
      'risk': 'Risk',
      'compliance': 'Compliance',
      'quality': 'Quality',
      'security': 'Security',
      'performance': 'Performance',
      'unknown': 'Process'
    };

    return typeMap[entryType?.toLowerCase() || 'unknown'] || 'Process';
  }

  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string): void {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    const configLevel = levels[this.config.logLevel];
    const messageLevel = levels[level];

    if (messageLevel >= configLevel) {
      const timestamp = new Date().toISOString();
      const prefix = `[${timestamp}] [DriveMemoryWatcher] [${level.toUpperCase()}]`;
      console.log(`${prefix} ${message}`);
    }
  }

  // Status and monitoring methods
  getStatus() {
    return {
      isRunning: this.isRunning,
      watchPath: this.config.watchPath,
      filePattern: this.config.filePattern,
      processedFilesCount: this.processedFiles.size,
      config: this.config
    };
  }

  getProcessedFiles(): string[] {
    return Array.from(this.processedFiles);
  }
}

// Singleton instance for application-wide use
let watcherInstance: DriveMemoryWatcher | null = null;

export function createDriveMemoryWatcher(config: DriveMemoryWatcherConfig): DriveMemoryWatcher {
  if (watcherInstance) {
    throw new Error('DriveMemory watcher already exists. Use getDriveMemoryWatcher() to get existing instance.');
  }
  
  watcherInstance = new DriveMemoryWatcher(config);
  return watcherInstance;
}

export function getDriveMemoryWatcher(): DriveMemoryWatcher | null {
  return watcherInstance;
}

export function destroyDriveMemoryWatcher(): void {
  if (watcherInstance) {
    watcherInstance.stop();
    watcherInstance = null;
  }
}