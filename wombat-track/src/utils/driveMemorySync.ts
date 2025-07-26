import { createNotionClient } from './notionClient';
import type { GovernanceEvent } from '../types/governance';

// Retry utility with exponential backoff for QA robustness
async function withRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  let delay = 500;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i === retries - 1) throw e;
      console.log(`⚠️  Retry ${i + 1}/${retries} after ${delay}ms...`);
      await new Promise(res => setTimeout(res, delay));
      delay *= 2;
    }
  }
  throw new Error('Retry logic failed');
}

export interface SyncMetadata {
  lastSynced: string;
  sourceSystem: 'Notion' | 'DriveMemory' | 'WombatTrack' | 'API';
  recordOrigin: string;
  syncDirection: 'notion-to-drive' | 'drive-to-notion' | 'bidirectional';
}

export interface DriveMemoryRecord {
  id: string;
  type: 'governance' | 'project' | 'phase' | 'step';
  content: any;
  metadata: SyncMetadata;
  tags?: string[];
}

export interface NotionSyncConfig {
  notionToken: string;
  databaseIds: {
    project?: string;
    phase?: string;
    phaseStep?: string;
    governance?: string;
  };
}

export class DriveMemorySync {
  private notionClient;
  private config: NotionSyncConfig;

  constructor(config: NotionSyncConfig) {
    this.notionClient = createNotionClient(config.notionToken);
    this.config = config;
  }

  // Sync from Notion to DriveMemory format
  async exportFromNotion(
    databaseId: string,
    filters?: any
  ): Promise<DriveMemoryRecord[]> {
    try {
      const response = await withRetry(() => 
        this.notionClient.queryDatabase({
          database_id: databaseId,
          filter: filters,
        })
      );

      const records: DriveMemoryRecord[] = [];

      for (const page of response.results) {
        const record: DriveMemoryRecord = {
          id: page.id,
          type: this.inferTypeFromDatabase(databaseId),
          content: this.extractPageContent(page),
          metadata: {
            lastSynced: new Date().toISOString(),
            sourceSystem: 'Notion',
            recordOrigin: `notion:${databaseId}:${page.id}`,
            syncDirection: 'notion-to-drive',
          },
          tags: this.extractTags(page),
        };
        records.push(record);
      }

      return records;
    } catch (error) {
      throw new Error(`Failed to export from Notion: ${error}`);
    }
  }

  // Sync from DriveMemory to Notion
  async importToNotion(
    records: DriveMemoryRecord[],
    databaseId: string
  ): Promise<{ success: number; failed: number; errors: any[] }> {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as any[],
    };

    for (const record of records) {
      try {
        const properties = this.mapToNotionProperties(record, databaseId);
        
        await withRetry(() => 
          this.notionClient.writePage({
            parent: { database_id: databaseId },
            properties,
          })
        );

        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          recordId: record.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  }

  // Bidirectional sync with conflict resolution
  async bidirectionalSync(
    databaseId: string,
    driveMemoryRecords: DriveMemoryRecord[]
  ): Promise<{
    imported: number;
    exported: number;
    conflicts: any[];
  }> {
    const results = {
      imported: 0,
      exported: 0,
      conflicts: [] as any[],
    };

    // Get all Notion records
    const notionRecords = await this.exportFromNotion(databaseId);

    // Create maps for comparison
    const notionMap = new Map(notionRecords.map(r => [r.id, r]));
    const driveMap = new Map(driveMemoryRecords.map(r => [r.id, r]));

    // Find records to import (in Drive but not in Notion)
    for (const [id, driveRecord] of driveMap) {
      if (!notionMap.has(id)) {
        const importResult = await this.importToNotion([driveRecord], databaseId);
        if (importResult.success > 0) {
          results.imported++;
        }
      } else {
        // Check for conflicts based on lastSynced
        const notionRecord = notionMap.get(id)!;
        if (this.hasConflict(driveRecord, notionRecord)) {
          results.conflicts.push({
            id,
            driveLastSynced: driveRecord.metadata.lastSynced,
            notionLastSynced: notionRecord.metadata.lastSynced,
          });
        }
      }
    }

    // Export new Notion records
    for (const [id, notionRecord] of notionMap) {
      if (!driveMap.has(id)) {
        results.exported++;
      }
    }

    return results;
  }

  private inferTypeFromDatabase(databaseId: string): DriveMemoryRecord['type'] {
    const { databaseIds } = this.config;
    
    if (databaseId === databaseIds.project) return 'project';
    if (databaseId === databaseIds.phase) return 'phase';
    if (databaseId === databaseIds.phaseStep) return 'step';
    if (databaseId === databaseIds.governance) return 'governance';
    
    return 'governance'; // default
  }

  private extractPageContent(page: any): any {
    const content: any = {};
    
    for (const [key, value] of Object.entries(page.properties)) {
      content[key] = this.extractPropertyValue(value);
    }
    
    return content;
  }

  private extractPropertyValue(property: any): any {
    if (property.title) {
      return property.title.map((t: any) => t.plain_text).join('');
    }
    if (property.rich_text) {
      return property.rich_text.map((t: any) => t.plain_text).join('');
    }
    if (property.select) {
      return property.select.name;
    }
    if (property.multi_select) {
      return property.multi_select.map((s: any) => s.name);
    }
    if (property.date) {
      return property.date.start;
    }
    if (property.checkbox) {
      return property.checkbox;
    }
    if (property.number) {
      return property.number;
    }
    if (property.url) {
      return property.url;
    }
    return null;
  }

  private extractTags(page: any): string[] {
    const tags: string[] = [];
    
    // Extract from multi_select properties
    for (const [key, value] of Object.entries(page.properties)) {
      if (value.multi_select) {
        tags.push(...value.multi_select.map((s: any) => s.name));
      }
    }
    
    return tags;
  }

  private mapToNotionProperties(record: DriveMemoryRecord, databaseId: string): any {
    const properties: any = {};
    
    // Map based on record type
    switch (record.type) {
      case 'governance':
        return this.mapGovernanceProperties(record);
      case 'project':
        return this.mapProjectProperties(record);
      case 'phase':
        return this.mapPhaseProperties(record);
      case 'step':
        return this.mapStepProperties(record);
      default:
        return this.mapGenericProperties(record);
    }
  }

  private mapGovernanceProperties(record: DriveMemoryRecord): any {
    const content = record.content;
    return {
      'Event ID': {
        title: [{ text: { content: record.id } }],
      },
      'Summary': {
        rich_text: [{ text: { content: content.summary || '' } }],
      },
      'Source System': {
        select: { name: record.metadata.sourceSystem },
      },
      'Last Synced': {
        date: { start: record.metadata.lastSynced },
      },
      'MemoryPlugin Tags': {
        multi_select: (record.tags || []).map(tag => ({ name: tag })),
      },
    };
  }

  private mapProjectProperties(record: DriveMemoryRecord): any {
    const content = record.content;
    return {
      projectId: {
        title: [{ text: { content: record.id } }],
      },
      title: {
        rich_text: [{ text: { content: content.title || '' } }],
      },
      description: {
        rich_text: [{ text: { content: content.description || '' } }],
      },
      status: content.status ? {
        select: { name: content.status },
      } : undefined,
    };
  }

  private mapPhaseProperties(record: DriveMemoryRecord): any {
    const content = record.content;
    return {
      phaseId: {
        title: [{ text: { content: record.id } }],
      },
      title: {
        rich_text: [{ text: { content: content.title || '' } }],
      },
      description: {
        rich_text: [{ text: { content: content.description || '' } }],
      },
      status: content.status ? {
        select: { name: content.status },
      } : undefined,
    };
  }

  private mapStepProperties(record: DriveMemoryRecord): any {
    const content = record.content;
    return {
      phaseStepId: {
        title: [{ text: { content: record.id } }],
      },
      stepInstruction: {
        rich_text: [{ text: { content: content.instruction || '' } }],
      },
      stepNumber: content.stepNumber ? {
        number: content.stepNumber,
      } : undefined,
    };
  }

  private mapGenericProperties(record: DriveMemoryRecord): any {
    return {
      id: {
        title: [{ text: { content: record.id } }],
      },
      content: {
        rich_text: [{ text: { content: JSON.stringify(record.content) } }],
      },
    };
  }

  private hasConflict(record1: DriveMemoryRecord, record2: DriveMemoryRecord): boolean {
    const date1 = new Date(record1.metadata.lastSynced);
    const date2 = new Date(record2.metadata.lastSynced);
    
    // If synced within 1 minute of each other, consider it a conflict
    const timeDiff = Math.abs(date1.getTime() - date2.getTime());
    return timeDiff < 60000; // 1 minute
  }
}

// Export format for notion data
export interface NotionExportFormat {
  version: '1.0';
  exportDate: string;
  databases: {
    [databaseId: string]: {
      name: string;
      records: DriveMemoryRecord[];
    };
  };
}

export async function exportNotionToJSON(
  config: NotionSyncConfig
): Promise<NotionExportFormat> {
  const sync = new DriveMemorySync(config);
  const exportData: NotionExportFormat = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    databases: {},
  };

  for (const [name, databaseId] of Object.entries(config.databaseIds)) {
    if (databaseId) {
      try {
        const records = await sync.exportFromNotion(databaseId);
        exportData.databases[databaseId] = {
          name,
          records,
        };
      } catch (error) {
        console.error(`Failed to export ${name} database:`, error);
      }
    }
  }

  return exportData;
}