/**
 * DriveMemory Watcher Service
 * Manages the DriveMemory governance logs file watcher
 */

import path from 'path';
import type { DriveMemoryWatcher } from '../../services/driveMemoryWatcher';
import { createDriveMemoryWatcher, getDriveMemoryWatcher } from '../../services/driveMemoryWatcher';

const DRIVE_MEMORY_PATH = path.join(process.cwd(), 'DriveMemory', 'GovernanceLogs');
const GOVERNANCE_FILE_PATTERN = '*.jsonl';

export class DriveMemoryWatcherService {
  private static instance: DriveMemoryWatcherService | null = null;
  private watcher: DriveMemoryWatcher | null = null;

  private constructor() {}

  public static getInstance(): DriveMemoryWatcherService {
    if (!DriveMemoryWatcherService.instance) {
      DriveMemoryWatcherService.instance = new DriveMemoryWatcherService();
    }
    return DriveMemoryWatcherService.instance;
  }

  async initialize(): Promise<void> {
    if (this.watcher) {
      console.log('📁 DriveMemory watcher already initialized');
      return;
    }

    try {
      console.log('🚀 Initializing DriveMemory governance logs watcher...');
      
      this.watcher = createDriveMemoryWatcher({
        watchPath: DRIVE_MEMORY_PATH,
        filePattern: GOVERNANCE_FILE_PATTERN,
        pollInterval: 5000, // Check every 5 seconds
        enableProjectHooks: true,
        logLevel: process.env.NODE_ENV === 'development' ? 'debug' : 'info'
      });

      await this.watcher.start();
      
      const status = this.watcher.getStatus();
      console.log('✅ DriveMemory watcher initialized:', {
        watchPath: status.watchPath,
        filePattern: status.filePattern,
        isRunning: status.isRunning
      });

    } catch (error) {
      console.error('❌ Failed to initialize DriveMemory watcher:', error);
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    if (this.watcher) {
      await this.watcher.stop();
      this.watcher = null;
      console.log('🔄 DriveMemory watcher shutdown complete');
    }
  }

  getStatus() {
    return this.watcher?.getStatus() || { isRunning: false };
  }

  getWatcher(): DriveMemoryWatcher | null {
    return this.watcher;
  }

  // API endpoint data
  getWatcherInfo() {
    const watcher = getDriveMemoryWatcher();
    if (!watcher) {
      return {
        status: 'not_initialized',
        watchPath: DRIVE_MEMORY_PATH,
        filePattern: GOVERNANCE_FILE_PATTERN
      };
    }

    const status = watcher.getStatus();
    return {
      status: status.isRunning ? 'running' : 'stopped',
      ...status,
      processedFiles: watcher.getProcessedFiles()
    };
  }
}

export default DriveMemoryWatcherService;