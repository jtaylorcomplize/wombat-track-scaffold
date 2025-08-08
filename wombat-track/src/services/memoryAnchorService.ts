/**
 * Memory Anchor Service
 * Phase 9.0.4 - Memory anchor management for governance
 */

import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

interface MemoryAnchor {
  anchorId: string;
  phaseId: string;
  created: string;
  updated: string;
  data: any;
  entries?: any[];
}

class MemoryAnchorService {
  private memoryPluginPath: string;
  private anchorsPath: string;

  constructor() {
    this.memoryPluginPath = path.join('/home/jtaylor/wombat-track-scaffold/wombat-track/DriveMemory/MemoryPlugin');
    this.anchorsPath = path.join('/home/jtaylor/wombat-track-scaffold/wombat-track/logs/drive-memory/memory-anchors.jsonl');
  }

  /**
   * Create a new memory anchor
   */
  async createAnchor(params: {
    anchorId: string;
    phaseId: string;
    data: any;
  }): Promise<MemoryAnchor> {
    const anchor: MemoryAnchor = {
      anchorId: params.anchorId,
      phaseId: params.phaseId,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      data: params.data,
      entries: []
    };

    // Save to MemoryPlugin
    const anchorFile = path.join(this.memoryPluginPath, `${params.anchorId}.json`);
    await fs.mkdir(this.memoryPluginPath, { recursive: true });
    await fs.writeFile(anchorFile, JSON.stringify(anchor, null, 2), 'utf-8');

    // Log to anchors file
    await this.logAnchor(anchor);

    return anchor;
  }

  /**
   * Append data to existing anchor
   */
  async appendToAnchor(anchorId: string, data: any): Promise<void> {
    const anchorFile = path.join(this.memoryPluginPath, `${anchorId}.json`);
    
    try {
      const existing = await fs.readFile(anchorFile, 'utf-8');
      const anchor: MemoryAnchor = JSON.parse(existing);
      
      if (!anchor.entries) anchor.entries = [];
      anchor.entries.push({
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        data
      });
      
      anchor.updated = new Date().toISOString();
      
      await fs.writeFile(anchorFile, JSON.stringify(anchor, null, 2), 'utf-8');
      await this.logAnchor(anchor);
    } catch (error) {
      // If anchor doesn't exist, create it
      await this.createAnchor({
        anchorId,
        phaseId: 'unknown',
        data: { entries: [data] }
      });
    }
  }

  /**
   * Get anchor by ID
   */
  async getAnchor(anchorId: string): Promise<MemoryAnchor | null> {
    const anchorFile = path.join(this.memoryPluginPath, `${anchorId}.json`);
    
    try {
      const data = await fs.readFile(anchorFile, 'utf-8');
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  /**
   * Log anchor to JSONL file
   */
  private async logAnchor(anchor: MemoryAnchor): Promise<void> {
    const logDir = path.dirname(this.anchorsPath);
    await fs.mkdir(logDir, { recursive: true });
    
    const logEntry = {
      timestamp: new Date().toISOString(),
      anchorId: anchor.anchorId,
      phaseId: anchor.phaseId,
      entriesCount: anchor.entries?.length || 0
    };
    
    await fs.appendFile(this.anchorsPath, JSON.stringify(logEntry) + '\n', 'utf-8');
  }

  /**
   * List all anchors
   */
  async listAnchors(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.memoryPluginPath);
      return files
        .filter(f => f.endsWith('.json'))
        .map(f => f.replace('.json', ''));
    } catch {
      return [];
    }
  }
}

const memoryAnchorService = new MemoryAnchorService();

export { memoryAnchorService, MemoryAnchorService, MemoryAnchor };